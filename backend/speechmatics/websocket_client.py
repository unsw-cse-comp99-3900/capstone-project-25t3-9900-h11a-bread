"""
Speechmatics WebSocket客户端
处理与Speechmatics API的实时WebSocket连接和消息交换
"""
import asyncio
import json
import logging
from typing import Optional, Callable, Dict, Any, List
import websockets
from websockets.exceptions import WebSocketException as WSException
from shared.config import settings
from shared.exceptions import (
    WebSocketException, SpeechmaticsAPIException, AuthenticationException,
    QuotaExceededException, ProtocolErrorException, InvalidModelException,
    InvalidConfigException, InternalServerException, IdleTimeoutException,
    SessionTimeoutException, BufferErrorException, DataErrorException
)
from speechmatics.models import (
    StartRecognitionRequest, AddAudioMessage, EndOfStreamMessage,
    RecognitionStartedMessage, AudioAddedMessage, AddTranscriptMessage,
    AddPartialTranscriptMessage, EndOfTranscriptMessage, ErrorMessage, WarningMessage
)

logger = logging.getLogger(__name__)

# 错误类型映射表
ERROR_TYPE_MAPPING = {
    "not_authorised": AuthenticationException,
    "quota_exceeded": QuotaExceededException,
    "protocol_error": ProtocolErrorException,
    "invalid_model": InvalidModelException,
    "invalid_config": InvalidConfigException,
    "invalid_audio_type": InvalidConfigException,
    "invalid_output_format": InvalidConfigException,
    "internal_error": InternalServerException,
    "buffer_error": BufferErrorException,
    "data_error": DataErrorException,
}

# 警告类型映射
WARNING_TYPE_MAPPING = {
    "idle_timeout": IdleTimeoutException,
    "session_timeout": SessionTimeoutException,
}


class SpeechmaticsWebSocketClient:
    """Speechmatics WebSocket客户端"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.SPEECHMATICS_API_KEY
        self.base_url = settings.SPEECHMATICS_BASE_URL
        self.websocket = None
        self.is_connected = False
        self.is_recognition_started = False
        self.seq_no = 0
        self.session_id = None
        
        # 回调函数
        self.on_transcript: Optional[Callable[[Dict[str, Any]], None]] = None
        self.on_partial_transcript: Optional[Callable[[Dict[str, Any]], None]] = None
        self.on_error: Optional[Callable[[Dict[str, Any]], None]] = None
        self.on_warning: Optional[Callable[[Dict[str, Any]], None]] = None
        self.on_recognition_started: Optional[Callable[[Dict[str, Any]], None]] = None
        self.on_end_of_transcript: Optional[Callable[[Dict[str, Any]], None]] = None
        
    def _prepare_headers(self) -> Dict[str, str]:
        """准备WebSocket连接头"""
        if not self.api_key:
            raise AuthenticationException("Speechmatics API密钥未配置")
        
        return {
            "Authorization": f"Bearer {self.api_key}"
        }
    
    async def connect(self) -> bool:
        """建立WebSocket连接"""
        try:
            logger.info("正在连接到Speechmatics API...")
            
            headers = self._prepare_headers()
            
            self.websocket = await websockets.connect(
                self.base_url,
                extra_headers=headers,
                timeout=settings.REQUEST_TIMEOUT
            )
            
            self.is_connected = True
            logger.info("成功连接到Speechmatics API")
            return True
            
        except WSException as e:
            logger.error(f"WebSocket连接失败: {e}")
            raise WebSocketException(f"WebSocket连接失败: {e}")
        except Exception as e:
            logger.error(f"连接异常: {e}")
            raise SpeechmaticsAPIException(f"连接异常: {e}")
    
    async def disconnect(self):
        """断开WebSocket连接"""
        if self.websocket:
            await self.websocket.close()
            self.is_connected = False
            self.is_recognition_started = False
            logger.info("已断开Speechmatics API连接")
    
    async def start_recognition(self, 
                              language: str = None, 
                              enable_partials: bool = True,
                              sample_rate: int = 16000,
                              diarization: str = "speaker") -> bool:
        """开始识别会话（默认启用多说话人分离）"""
        if not self.is_connected:
            raise WebSocketException("WebSocket未连接")
        
        try:
            # 构建开始识别请求
            transcription_config = {
                "language": language,
                "enable_partials": enable_partials,
                "max_delay": 2.0,  # Speechmatics要求至少0.7，使用2秒（平衡速度和准确度）
                "diarization": diarization  # 默认启用说话人分离
            }
            
            request = StartRecognitionRequest(
                audio_format={
                    "type": "raw",
                    "encoding": "pcm_f32le",
                    "sample_rate": sample_rate
                },
                transcription_config=transcription_config
            )
            
            # 发送请求
            await self.websocket.send(json.dumps(request.dict()))
            logger.info("已发送开始识别请求")
            
            # 等待识别开始确认
            # 可能会先收到Info消息（配额信息），然后才是RecognitionStarted
            max_attempts = 3
            for attempt in range(max_attempts):
                response = await self.websocket.recv()
                response_data = json.loads(response)
                message_type = response_data.get("message")
                
                if message_type == "RecognitionStarted":
                    self.is_recognition_started = True
                    self.session_id = response_data.get("id")
                    logger.info(f"识别会话已开始，会话ID: {self.session_id}")
                    
                    # 触发回调
                    if self.on_recognition_started:
                        self.on_recognition_started(response_data)
                    
                    return True
                    
                elif message_type == "Info":
                    # 跳过Info消息，继续等待RecognitionStarted
                    logger.info(f"收到Info消息: {response_data.get('reason')}")
                    continue
                    
                elif message_type == "Error":
                    logger.error(f"识别开始失败: {response_data}")
                    return False
                else:
                    logger.warning(f"未预期的消息类型: {message_type}")
                    continue
            
            # 超过最大尝试次数
            logger.error(f"未收到RecognitionStarted消息")
            return False
                
        except Exception as e:
            logger.error(f"开始识别失败: {e}")
            raise SpeechmaticsAPIException(f"开始识别失败: {e}")
    
    async def send_audio(self, audio_data: bytes) -> bool:
        """发送音频数据"""
        if not self.is_connected or not self.is_recognition_started:
            raise WebSocketException("WebSocket未连接或识别未开始")
        
        try:
            # 发送音频数据（二进制）
            await self.websocket.send(audio_data)
            
            # 等待确认
            response = await self.websocket.recv()
            if isinstance(response, str):
                response_data = json.loads(response)
                if response_data.get("message") == "AudioAdded":
                    self.seq_no = response_data.get("seq_no", self.seq_no + 1)
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"发送音频失败: {e}")
            raise SpeechmaticsAPIException(f"发送音频失败: {e}")
    
    async def end_stream(self) -> bool:
        """结束音频流"""
        if not self.is_connected or not self.is_recognition_started:
            return False
        
        try:
            # 发送流结束消息
            end_message = EndOfStreamMessage(last_seq_no=self.seq_no)
            await self.websocket.send(json.dumps(end_message.dict()))
            logger.info("已发送流结束消息")
            
            return True
            
        except Exception as e:
            logger.error(f"结束流失败: {e}")
            return False
    
    async def listen_for_messages(self):
        """监听服务器消息"""
        try:
            while self.is_connected:
                try:
                    message = await self.websocket.recv()
                    
                    if isinstance(message, str):
                        await self._handle_text_message(message)
                    else:
                        logger.debug(f"收到二进制消息: {len(message)} bytes")
                        
                except websockets.exceptions.ConnectionClosed:
                    logger.info("WebSocket连接已关闭")
                    break
                except Exception as e:
                    logger.error(f"处理消息时出错: {e}")
                    break
                    
        except Exception as e:
            logger.error(f"监听消息失败: {e}")
    
    async def _handle_text_message(self, message: str):
        """处理文本消息"""
        try:
            data = json.loads(message)
            message_type = data.get("message")
            
            logger.debug(f"收到消息: {message_type}")
            
            if message_type == "AddTranscript":
                if self.on_transcript:
                    self.on_transcript(data)
            elif message_type == "AddPartialTranscript":
                if self.on_partial_transcript:
                    self.on_partial_transcript(data)
            elif message_type == "EndOfTranscript":
                if self.on_end_of_transcript:
                    self.on_end_of_transcript(data)
            elif message_type == "Error":
                await self._handle_error(data)
            elif message_type == "Warning":
                await self._handle_warning(data)
            else:
                logger.debug(f"未处理的消息类型: {message_type}")
                
        except json.JSONDecodeError as e:
            logger.error(f"JSON解析失败: {e}")
        except Exception as e:
            logger.error(f"处理文本消息失败: {e}")
    
    async def _handle_error(self, error_data: Dict[str, Any]):
        """处理错误消息"""
        error_type = error_data.get("type", "unknown")
        reason = error_data.get("reason", "未知错误")
        
        logger.error(f"🚨 Speechmatics错误 [{error_type}]: {reason}")
        logger.error(f"完整错误信息: {json.dumps(error_data, ensure_ascii=False)}")
        
        # 根据错误类型抛出对应的异常
        exception_class = ERROR_TYPE_MAPPING.get(error_type, SpeechmaticsAPIException)
        
        # 特殊处理：配额超限时记录详细信息
        if error_type == "quota_exceeded":
            logger.error("⚠️ 配额超限！请等待现有会话结束或联系Speechmatics增加配额")
        
        # 特殊处理：认证失败
        elif error_type == "not_authorised":
            logger.error("⚠️ API密钥无效或未授权！请检查SPEECHMATICS_API_KEY配置")
        
        # 特殊处理：协议错误
        elif error_type == "protocol_error":
            logger.error("⚠️ 协议错误！可能是消息格式或参数配置有误")
        
        # 调用错误回调
        if self.on_error:
            self.on_error(error_data)
        
        # 抛出异常（可选，根据需求决定是否抛出）
        # raise exception_class(reason, details=error_data)
    
    async def _handle_warning(self, warning_data: Dict[str, Any]):
        """处理警告消息"""
        warning_type = warning_data.get("type", "unknown")
        reason = warning_data.get("reason", "未知警告")
        
        logger.warning(f"⚠️ Speechmatics警告 [{warning_type}]: {reason}")
        
        # 特殊处理：空闲超时警告
        if warning_type == "idle_timeout":
            logger.warning("⏰ 会话即将因空闲超时而关闭，请发送音频数据")
        
        # 特殊处理：会话超时警告
        elif warning_type == "session_timeout":
            logger.warning("⏰ 会话即将达到最大时长限制（48小时）")
        
        # 调用警告回调
        if self.on_warning:
            self.on_warning(warning_data)
    
    def set_transcript_callback(self, callback: Callable[[Dict[str, Any]], None]):
        """设置转录结果回调"""
        self.on_transcript = callback
    
    def set_partial_transcript_callback(self, callback: Callable[[Dict[str, Any]], None]):
        """设置部分转录结果回调"""
        self.on_partial_transcript = callback
    
    def set_error_callback(self, callback: Callable[[Dict[str, Any]], None]):
        """设置错误回调"""
        self.on_error = callback
    
    def set_warning_callback(self, callback: Callable[[Dict[str, Any]], None]):
        """设置警告回调"""
        self.on_warning = callback
    
    def set_recognition_started_callback(self, callback: Callable[[Dict[str, Any]], None]):
        """设置识别开始回调"""
        self.on_recognition_started = callback
    
    def set_end_of_transcript_callback(self, callback: Callable[[Dict[str, Any]], None]):
        """设置转录结束回调"""
        self.on_end_of_transcript = callback
