from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import numpy as np
import base64
import asyncio
import logging
import json

# 导入Speechmatics服务
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from speechmatics.transcription_service import SpeechmaticsTranscriptionService
from shared.exceptions import (
    SpeechmaticsAPIException, TranscriptionException, AuthenticationException,
    QuotaExceededException, ProtocolErrorException, InvalidModelException,
    InvalidConfigException, InternalServerException, IdleTimeoutException,
    SessionTimeoutException, BufferErrorException, DataErrorException
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Realtime Denoise & Transcription API",
    description=(
        "实时语音降噪服务：\n"
        "- **/ws/denoise**：WebSocket 实时帧流（生产用）\n"
        "- **/denoise/frame**：HTTP 单帧调试（Swagger 可直接试）\n"
        "- 约定：单声道 Float32 PCM，值域[-1,1]；帧长 10–50ms\n"
    ),
    version="2.0.0",
)

# ========== 全局异常处理器 ==========

@app.exception_handler(AuthenticationException)
async def authentication_exception_handler(request, exc: AuthenticationException):
    """认证异常处理"""
    logger.error(f"🔐 认证失败: {exc.message}")
    return JSONResponse(
        status_code=401,
        content={
            "error": "authentication_failed",
            "message": exc.message,
            "details": exc.details
        }
    )

@app.exception_handler(QuotaExceededException)
async def quota_exceeded_exception_handler(request, exc: QuotaExceededException):
    """配额超限异常处理"""
    logger.error(f"⚠️ 配额超限: {exc.message}")
    return JSONResponse(
        status_code=429,
        content={
            "error": "quota_exceeded",
            "message": "并发会话配额已满，请稍后重试",
            "details": exc.details,
            "retry_after": 5
        }
    )

@app.exception_handler(ProtocolErrorException)
async def protocol_error_exception_handler(request, exc: ProtocolErrorException):
    """协议错误异常处理"""
    logger.error(f"📋 协议错误: {exc.message}")
    return JSONResponse(
        status_code=400,
        content={
            "error": "protocol_error",
            "message": exc.message,
            "details": exc.details
        }
    )

@app.exception_handler(SpeechmaticsAPIException)
async def speechmatics_api_exception_handler(request, exc: SpeechmaticsAPIException):
    """Speechmatics API 异常处理"""
    logger.error(f"🚨 Speechmatics API 错误: {exc.message}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "speechmatics_api_error",
            "message": exc.message,
            "details": exc.details
        }
    )

# ========== 健康检查 ==========

@app.get("/health", tags=["system"])
def health():
    """系统健康检查"""
    return JSONResponse({
        "status": "ok",
        "service": "Realtime Denoise & Transcription API",
        "version": "2.0.0"
    })

# ------------------ 简易实时谱减器（与先前一致） ------------------
class StreamingSpectralSubtractor:
    def __init__(
        self,
        sr: int,
        frame_samples: int,
        fft_size: Optional[int] = None,
        noise_ema_decay: float = 0.95,
        noise_floor: float = 1e-4,
        subtract_scale: float = 1.0,
        vad_energy_ratio: float = 1.5
    ):
        self.sr = sr
        self.N = frame_samples
        self.fft_size = int(2 ** int(np.ceil(np.log2(frame_samples)))) if fft_size is None else int(fft_size)
        self.win = np.hanning(self.N).astype(np.float32)
        self.noise_mag = None
        self.noise_ema_decay = float(noise_ema_decay)
        self.noise_floor = float(noise_floor)
        self.subtract_scale = float(subtract_scale)
        self.vad_energy_ratio = float(vad_energy_ratio)
        self.eps = 1e-12
        self.init_energy = None

    def _estimate_noise(self, mag: np.ndarray, is_noise_like: bool):
        if self.noise_mag is None:
            self.noise_mag = mag.copy()
        elif is_noise_like:
            d = self.noise_ema_decay
            self.noise_mag = d * self.noise_mag + (1.0 - d) * mag

    def process_frame(self, frame: np.ndarray) -> np.ndarray:
        x = frame.astype(np.float32)
        x = x - np.mean(x)
        xw = x * self.win

        spec = np.fft.rfft(xw, n=self.fft_size)
        mag = np.abs(spec)
        phase = np.angle(spec)

        frame_energy = float(np.mean(x * x) + self.eps)
        if self.init_energy is None:
            self.init_energy = frame_energy

        noise_ref = float(np.mean(self.noise_mag**2)) if self.noise_mag is not None else self.init_energy
        vad_threshold = max(noise_ref * self.vad_energy_ratio, self.init_energy * 0.3)
        is_noise_like = frame_energy <= vad_threshold

        self._estimate_noise(mag, is_noise_like)

        if self.noise_mag is None:
            clean_mag = mag
        else:
            clean_mag = np.maximum(mag - self.subtract_scale * self.noise_mag, self.noise_floor)

        clean_spec = clean_mag * np.exp(1j * phase)
        y = np.fft.irfft(clean_spec, n=self.fft_size).real[: self.N]
        y = np.clip(y.astype(np.float32), -1.0, 1.0)
        return y

# ------------------ WebSocket：实时模式 ------------------
@app.websocket("/ws/denoise")
async def ws_denoise(websocket: WebSocket):
    """
    协议：
      1) 客户端先发送文本 JSON 配置：
         {"sr":16000,"frame_samples":480,"subtract_scale":1.0}
      2) 随后循环发送**二进制**帧：float32 PCM，长度 = frame_samples
      3) 服务器逐帧返回**二进制**降噪后 float32 PCM（同长度）
    """
    await websocket.accept()
    try:
        cfg = await websocket.receive_json()
        sr = int(cfg.get("sr", 16000))
        frame_samples = int(cfg.get("frame_samples", 480))
        subtract_scale = float(cfg.get("subtract_scale", 1.0))

        denoiser = StreamingSpectralSubtractor(sr, frame_samples, subtract_scale=subtract_scale)
        await websocket.send_text("OK: ready")

        expected_nbytes = frame_samples * 4  # float32
        while True:
            msg = await websocket.receive()
            if "bytes" not in msg:
                continue
            data: bytes = msg["bytes"]
            if len(data) != expected_nbytes:
                await websocket.send_text(f"ERR: bad frame size {len(data)} != {expected_nbytes}")
                continue
            frame = np.frombuffer(data, dtype=np.float32)
            clean = denoiser.process_frame(frame)
            await websocket.send_bytes(clean.tobytes())
    except WebSocketDisconnect:
        return
    except Exception as e:
        try:
            await websocket.send_text(f"ERR: {repr(e)}")
        finally:
            return

# ------------------ HTTP：Swagger 可调试的单帧端点 ------------------
class DenoiseFrameIn(BaseModel):
    sr: int = Field(16000, description="采样率")
    frame_samples: int = Field(480, description="每帧采样点数（10–50ms）")
    subtract_scale: float = Field(1.0, ge=0, le=3, description="谱减强度（越大越干净也越易失真）")
    frame_base64: str = Field(..., description="单帧 Float32 PCM 的 base64（小端字节序、长度=frame_samples）")

class DenoiseFrameOut(BaseModel):
    sr: int
    frame_samples: int
    frame_base64: str

@app.post("/denoise/frame", response_model=DenoiseFrameOut, tags=["denoise"])
def denoise_single_frame(payload: DenoiseFrameIn):
    """
    用于 Swagger 调试的**单帧**降噪接口：把 Float32 PCM（base64）传进来，返回降噪后的 Float32 PCM（base64）。
    - 方便你在 `/docs` 里直观测试参数，不必写 WebSocket 客户端。
    - 生产实时请用 `/ws/denoise`。
    """
    raw = base64.b64decode(payload.frame_base64)
    expected_nbytes = payload.frame_samples * 4
    if len(raw) != expected_nbytes:
        raise ValueError(f"bad frame size {len(raw)} != {expected_nbytes}")

    frame = np.frombuffer(raw, dtype=np.float32)
    denoiser = StreamingSpectralSubtractor(
        sr=payload.sr,
        frame_samples=payload.frame_samples,
        subtract_scale=payload.subtract_scale,
    )
    clean = denoiser.process_frame(frame)
    out_b64 = base64.b64encode(clean.tobytes()).decode("utf-8")
    return DenoiseFrameOut(
        sr=payload.sr,
        frame_samples=payload.frame_samples,
        frame_base64=out_b64
    )


# ------------------ Speechmatics集成：实时转录 ------------------

class TranscriptionStartRequest(BaseModel):
    """开始转录请求"""
    language: Optional[str] = Field(None, description="语言代码(可选，自动检测)")
    enable_partials: bool = Field(True, description="是否启用部分转录")
    sample_rate: int = Field(16000, description="采样率")
    diarization: Optional[str] = Field("speaker", description="说话人分离模式 (默认启用)")

class TranscriptionResponse(BaseModel):
    """转录响应"""
    session_id: str = Field(..., description="会话ID")
    status: str = Field(..., description="状态")
    message: str = Field(..., description="消息")

# 全局转录服务实例
transcription_service = SpeechmaticsTranscriptionService()

@app.post("/transcription/start", response_model=TranscriptionResponse, tags=["transcription"])
async def start_transcription(request: TranscriptionStartRequest):
    """
    开始实时转录会话
    
    启动Speechmatics实时WebSocket转录服务
    """
    try:
        logger.info(f" 开始转录会话 [language={request.language}, diarization={request.diarization}]")
        
        # 启动转录服务
        success = await transcription_service.start_transcription(
            language=request.language,
            enable_partials=request.enable_partials,
            sample_rate=request.sample_rate,
            diarization=request.diarization
        )
        
        if success:
            logger.info(" 转录会话启动成功")
            return TranscriptionResponse(
                session_id="active",
                status="started",
                message="转录会话已启动"
            )
        else:
            raise HTTPException(status_code=500, detail="转录会话启动失败")
    
    # 认证错误：API密钥无效
    except AuthenticationException as e:
        logger.error(f" 认证失败: {e.message}")
        return JSONResponse(
            status_code=401,
            content={
                "error": "authentication_failed",
                "message": "API密钥无效或未授权，请检查SPEECHMATICS_API_KEY配置",
                "details": e.details
            }
        )
    
    # 配额超限：并发会话数已满
    except QuotaExceededException as e:
        logger.error(f" 配额超限: {e.message}")
        return JSONResponse(
            status_code=429,
            content={
                "error": "quota_exceeded",
                "message": "并发会话配额已满，请稍后重试或等待现有会话结束",
                "details": e.details,
                "retry_after": 5  # 建议5秒后重试
            }
        )
    
    # 协议错误：参数格式错误
    except ProtocolErrorException as e:
        logger.error(f" 协议错误: {e.message}")
        return JSONResponse(
            status_code=400,
            content={
                "error": "protocol_error",
                "message": f"参数配置错误：{e.message}",
                "details": e.details,
                "hint": "请检查 diarization、max_delay 等参数是否正确"
            }
        )
    
    # 无效模型：语言不支持
    except InvalidModelException as e:
        logger.error(f" 语言模型错误: {e.message}")
        return JSONResponse(
            status_code=400,
            content={
                "error": "invalid_model",
                "message": f"语言不支持或模型无效：{e.message}",
                "details": e.details,
                "hint": "请使用有效的语言代码（如 'en', 'zh', 'es'）或设为 null 自动检测"
            }
        )
    
    # 无效配置：其他参数错误
    except InvalidConfigException as e:
        logger.error(f" 配置错误: {e.message}")
        return JSONResponse(
            status_code=400,
            content={
                "error": "invalid_config",
                "message": f"配置参数错误：{e.message}",
                "details": e.details,
                "hint": "请检查所有参数是否符合要求（如 max_delay >= 0.7）"
            }
        )
    
    # 服务器内部错误
    except InternalServerException as e:
        logger.error(f" 服务器内部错误: {e.message}")
        return JSONResponse(
            status_code=503,
            content={
                "error": "internal_server_error",
                "message": "Speechmatics服务器内部错误，请稍后重试",
                "details": e.details
            }
        )
    
    # 通用 Speechmatics API 错误
    except SpeechmaticsAPIException as e:
        logger.error(f" Speechmatics API错误: {e.message}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "speechmatics_api_error",
                "message": f"Speechmatics API错误: {e.message}",
                "details": e.details
            }
        )
    
    # 其他未知错误
    except Exception as e:
        logger.error(f"未知错误: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "internal_error",
                "message": f"启动转录失败: {str(e)}"
            }
        )

@app.post("/transcription/stop", tags=["transcription"])
async def stop_transcription():
    """
    停止实时转录会话
    
    停止转录服务并返回所有转录结果
    """
    try:
        logger.info(" 停止转录会话")
        
        # 停止转录服务
        results = await transcription_service.stop_transcription()
        
        logger.info(f" 转录会话已停止，共 {len(results)} 条结果")
        
        return {
            "status": "stopped",
            "message": "转录会话已停止",
            "results": results,
            "total_transcripts": len(results)
        }
    
    except TranscriptionException as e:
        logger.error(f" 停止转录失败: {e.message}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "stop_failed",
                "message": f"停止转录失败: {e.message}",
                "details": e.details
            }
        )
    
    except Exception as e:
        logger.error(f" 停止转录失败: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "internal_error",
                "message": f"停止转录失败: {str(e)}"
            }
        )

@app.post("/transcription/transcribe_numpy", tags=["transcription"])
async def transcribe_numpy_audio(
    audio_base64: str,
    language: str = "en",
    sample_rate: int = 16000
):
    """
    转录音频数据(base64编码的NumPy数组)
    
    将base64编码的音频数据转换为NumPy数组并进行转录
    """
    try:
        logger.info("开始转录音频数据")
        
        # 解码base64数据
        audio_bytes = base64.b64decode(audio_base64)
        
        # 转换为NumPy数组
        audio_array = np.frombuffer(audio_bytes, dtype=np.float32)
        
        # 调用转录服务
        result = await transcription_service.transcribe_audio_from_numpy_async(
            audio_array=audio_array,
            sample_rate=sample_rate,
            language=language
        )
        
        return {
            "transcript": result["text"],
            "language": result["language"],
            "job_id": result["job_id"],
            "status": result["status"]
        }
        
    except Exception as e:
        logger.error(f"NumPy音频转录失败: {e}")
        raise HTTPException(status_code=500, detail=f"NumPy音频转录失败: {str(e)}")

@app.get("/transcription/status", tags=["transcription"])
async def get_transcription_status():
    """
    获取转录服务状态
    """
    return {
        "is_running": transcription_service.is_running,
        "latest_transcript": transcription_service.get_latest_transcript(),
        "latest_partial_transcript": transcription_service.get_latest_partial_transcript(),
        "total_transcripts": len(transcription_service.get_all_transcripts()),
        "total_partial_transcripts": len(transcription_service.get_all_partial_transcripts())
    }

@app.get("/transcription/results", tags=["transcription"])
async def get_transcription_results():
    """
    获取所有转录结果
    """
    return {
        "final_transcripts": transcription_service.get_all_transcripts(),
        "partial_transcripts": transcription_service.get_all_partial_transcripts()
    }


# ------------------ 集成WebSocket：VAD + Speechmatics实时转录 ------------------

@app.websocket("/ws/integrated")
async def ws_integrated_processing(websocket: WebSocket):
    """
    集成处理WebSocket：VAD降噪 + Speechmatics实时转录
    
    协议：
      1) 客户端发送配置JSON：
         {"sr":16000,"frame_samples":480,"subtract_scale":1.0,"enable_transcription":true,"language":"en"}
      2) 服务器启动转录服务（如果启用）
      3) 客户端循环发送音频帧
      4) 服务器返回降噪后音频帧 + 转录结果（如果启用）
    """
    await websocket.accept()
    
    # 初始化VAD降噪器
    denoiser = None
    transcription_enabled = False
    
    try:
        # 接收配置
        cfg = await websocket.receive_json()
        sr = int(cfg.get("sr", 16000))
        frame_samples = int(cfg.get("frame_samples", 480))
        subtract_scale = float(cfg.get("subtract_scale", 1.0))
        transcription_enabled = cfg.get("enable_transcription", True)  # 默认启用转录
        language = cfg.get("language", None)
        
        # 创建降噪器
        denoiser = StreamingSpectralSubtractor(sr, frame_samples, subtract_scale=subtract_scale)
        
        # 启动转录服务（如果启用）
        if transcription_enabled:
            await transcription_service.start_transcription(
                language=language,
                enable_partials=True,
                sample_rate=sr
            )
        
        await websocket.send_text("OK: ready")
        
        expected_nbytes = frame_samples * 4  # float32
        frame_count = 0
        
        while True:
            msg = await websocket.receive()
            if "bytes" not in msg:
                continue
                
            data: bytes = msg["bytes"]
            if len(data) != expected_nbytes:
                await websocket.send_text(f"ERR: bad frame size {len(data)} != {expected_nbytes}")
                continue
            
            # 处理音频帧
            frame = np.frombuffer(data, dtype=np.float32)
            clean_frame = denoiser.process_frame(frame)
            
            # 发送转录（如果启用）
            if transcription_enabled:
                await transcription_service.send_audio_frame(clean_frame)
                
                # 获取最新转录结果
                latest_transcript = transcription_service.get_latest_transcript()
                latest_partial = transcription_service.get_latest_partial_transcript()
                
                # 发送降噪后音频帧 + 转录结果
                response = {
                    "type": "audio_and_transcript",
                    "audio_frame": base64.b64encode(clean_frame.tobytes()).decode("utf-8"),
                    "transcript": latest_transcript,
                    "partial_transcript": latest_partial,
                    "frame_count": frame_count
                }
                await websocket.send_text(f"DATA: {json.dumps(response)}")
            else:
                # 只发送降噪后音频帧
                await websocket.send_bytes(clean_frame.tobytes())
            
            frame_count += 1
            
    except WebSocketDisconnect:
        logger.info("WebSocket连接断开")
    except Exception as e:
        logger.error(f"集成处理错误: {e}")
        try:
            await websocket.send_text(f"ERR: {repr(e)}")
        finally:
            pass
    finally:
        # 清理资源
        if transcription_enabled:
            try:
                await transcription_service.stop_transcription()
            except:
                pass
