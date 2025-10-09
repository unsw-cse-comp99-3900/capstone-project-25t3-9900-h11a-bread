"""
Speechmatics API数据模型
定义与Speechmatics API交互的数据结构
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union


class AudioFormat(BaseModel):
    """音频格式配置"""
    type: str = Field("raw", description="音频类型")
    encoding: str = Field("pcm_f32le", description="编码格式")
    sample_rate: int = Field(16000, description="采样率")


class TranscriptionConfig(BaseModel):
    """转录配置"""
    language: Optional[str] = Field(None, description="语言代码")
    enable_partials: bool = Field(True, description="是否启用部分转录")
    max_delay: float = Field(2.0, description="最大延迟(秒，最小0.7)")
    diarization: Optional[str] = Field("speaker", description="说话人分离模式 (默认启用)")


class StartRecognitionRequest(BaseModel):
    """开始识别请求"""
    message: str = Field("StartRecognition", description="消息类型")
    audio_format: AudioFormat = Field(default_factory=AudioFormat, description="音频格式")
    transcription_config: TranscriptionConfig = Field(default_factory=TranscriptionConfig, description="转录配置")


class AddAudioMessage(BaseModel):
    """添加音频消息"""
    message: str = Field("AddAudio", description="消息类型")
    seq_no: int = Field(..., description="序列号")


class EndOfStreamMessage(BaseModel):
    """流结束消息"""
    message: str = Field("EndOfStream", description="消息类型")
    last_seq_no: int = Field(..., description="最后序列号")


class TranscriptResult(BaseModel):
    """转录结果"""
    alternatives: List[Dict[str, Any]] = Field(default_factory=list, description="备选转录")
    is_final: bool = Field(False, description="是否为最终结果")
    language: Optional[str] = Field(None, description="检测到的语言")


class AddTranscriptMessage(BaseModel):
    """添加转录消息"""
    message: str = Field("AddTranscript", description="消息类型")
    format: str = Field("2.1", description="格式版本")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="元数据")
    results: List[TranscriptResult] = Field(default_factory=list, description="转录结果")
    channel: Optional[str] = Field(None, description="频道标识符")


class AddPartialTranscriptMessage(BaseModel):
    """添加部分转录消息"""
    message: str = Field("AddPartialTranscript", description="消息类型")
    format: str = Field("2.1", description="格式版本")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="元数据")
    results: List[TranscriptResult] = Field(default_factory=list, description="部分转录结果")
    channel: Optional[str] = Field(None, description="频道标识符")


class RecognitionStartedMessage(BaseModel):
    """识别开始消息"""
    message: str = Field("RecognitionStarted", description="消息类型")
    orchestrator_version: str = Field(..., description="编排器版本")
    id: str = Field(..., description="会话ID")
    language_pack_info: Dict[str, Any] = Field(default_factory=dict, description="语言包信息")


class AudioAddedMessage(BaseModel):
    """音频添加确认消息"""
    message: str = Field("AudioAdded", description="消息类型")
    seq_no: int = Field(..., description="序列号")


class EndOfTranscriptMessage(BaseModel):
    """转录结束消息"""
    message: str = Field("EndOfTranscript", description="消息类型")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="元数据")
    channel: Optional[str] = Field(None, description="频道标识符")


class ErrorMessage(BaseModel):
    """错误消息"""
    message: str = Field("Error", description="消息类型")
    type: str = Field(..., description="错误类型")
    reason: Optional[str] = Field(None, description="错误原因")
    code: Optional[int] = Field(None, description="错误代码")
    seq_no: Optional[int] = Field(None, description="序列号")


class WarningMessage(BaseModel):
    """警告消息"""
    message: str = Field("Warning", description="消息类型")
    type: str = Field(..., description="警告类型")
    reason: Optional[str] = Field(None, description="警告原因")
    code: Optional[int] = Field(None, description="警告代码")
    seq_no: Optional[int] = Field(None, description="序列号")
