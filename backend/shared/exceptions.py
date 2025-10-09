"""
自定义异常类
定义各种 Speechmatics API 和 WebSocket 相关的异常
"""
from typing import Optional


class APIException(Exception):
    """API调用异常基类"""
    
    def __init__(self, message: str, status_code: Optional[int] = None, details: Optional[dict] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class SpeechmaticsAPIException(APIException):
    """Speechmatics API调用异常"""
    pass


class WebSocketException(APIException):
    """WebSocket连接异常"""
    pass


class AuthenticationException(APIException):
    """认证异常 - API密钥无效或未授权"""
    pass


class TranscriptionException(APIException):
    """转录异常"""
    pass


# ========== Speechmatics 特定错误 ==========

class QuotaExceededException(SpeechmaticsAPIException):
    """配额超限异常 - 并发会话数或使用配额超限"""
    pass


class ProtocolErrorException(SpeechmaticsAPIException):
    """协议错误 - 消息格式错误或顺序错误"""
    pass


class InvalidModelException(SpeechmaticsAPIException):
    """无效模型 - 语言或模型不支持"""
    pass


class InvalidConfigException(SpeechmaticsAPIException):
    """无效配置 - 参数错误或不支持"""
    pass


class InternalServerException(SpeechmaticsAPIException):
    """服务器内部错误"""
    pass


class IdleTimeoutException(SpeechmaticsAPIException):
    """空闲超时 - 长时间未发送音频数据"""
    pass


class SessionTimeoutException(SpeechmaticsAPIException):
    """会话超时 - 超过最大会话时长（48小时）"""
    pass


class BufferErrorException(SpeechmaticsAPIException):
    """缓冲区错误 - 音频发送速度过快"""
    pass


class DataErrorException(SpeechmaticsAPIException):
    """数据错误 - 音频数据格式错误"""
    pass
