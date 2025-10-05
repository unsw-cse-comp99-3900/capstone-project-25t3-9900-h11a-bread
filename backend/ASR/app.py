from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional
import numpy as np
import base64

app = FastAPI(
    title="Realtime Denoise API",
    description=(
        "实时语音降噪服务：\n"
        "- **/ws/denoise**：WebSocket 实时帧流（生产用）\n"
        "- **/denoise/frame**：HTTP 单帧调试（Swagger 可直接试）\n"
        "- 约定：单声道 Float32 PCM，值域[-1,1]；帧长 10–50ms\n"
    ),
    version="1.0.0",
)

@app.get("/health", tags=["system"])
def health():
    return JSONResponse({"status": "ok"})

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
