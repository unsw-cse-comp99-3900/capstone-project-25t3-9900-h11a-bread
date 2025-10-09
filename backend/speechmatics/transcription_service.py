"""
Speechmatics转录服务
使用实时WebSocket API调用Speechmatics转录服务
"""
import asyncio
import logging
import time
from typing import Optional, Dict, Any, List
import numpy as np
from speechmatics.websocket_client import SpeechmaticsWebSocketClient
from shared.exceptions import SpeechmaticsAPIException, TranscriptionException

logger = logging.getLogger(__name__)


class SpeechmaticsTranscriptionService:
    """Speechmatics转录服务"""
    
    def __init__(self, api_key: str = None):
        self.client = SpeechmaticsWebSocketClient(api_key)
        self.is_running = False
        self.transcript_results: List[Dict[str, Any]] = []
        self.partial_transcript_results: List[Dict[str, Any]] = []
        
        # 设置回调函数
        self.client.set_transcript_callback(self._on_transcript)
        self.client.set_partial_transcript_callback(self._on_partial_transcript)
        self.client.set_error_callback(self._on_error)
        self.client.set_warning_callback(self._on_warning)
    
    def _on_transcript(self, data: Dict[str, Any]):
        """处理最终转录结果"""
        logger.info(f"收到最终转录: {data}")
        
        # 解析转录结果
        transcript_text = self._extract_transcript_text(data)
        if transcript_text:
            result = {
                "text": transcript_text,
                "is_final": True,
                "language": data.get("metadata", {}).get("language"),
                "confidence": self._extract_confidence(data),
                "timestamp": self._extract_timestamp(data),
                "speaker": self._extract_speaker_info(data),  # 添加说话人信息
                "raw_data": data
            }
            
            self.transcript_results.append(result)
            logger.info(f"最终转录文本: {transcript_text} (说话人: {result.get('speaker', 'N/A')})")
    
    def _on_partial_transcript(self, data: Dict[str, Any]):
        """处理部分转录结果"""
        logger.debug(f"收到部分转录: {data}")
        
        # 解析部分转录结果
        transcript_text = self._extract_transcript_text(data)
        if transcript_text:
            result = {
                "text": transcript_text,
                "is_final": False,
                "language": data.get("metadata", {}).get("language"),
                "confidence": self._extract_confidence(data),
                "timestamp": self._extract_timestamp(data),
                "raw_data": data
            }
            
            self.partial_transcript_results.append(result)
            logger.debug(f"部分转录文本: {transcript_text}")
    
    def _on_error(self, data: Dict[str, Any]):
        """处理错误"""
        error_type = data.get("type", "unknown")
        error_reason = data.get("reason", "未知错误")
        
        logger.error(f"Speechmatics错误 [{error_type}]: {error_reason}")
        raise SpeechmaticsAPIException(f"转录错误 [{error_type}]: {error_reason}")
    
    def _on_warning(self, data: Dict[str, Any]):
        """处理警告"""
        warning_type = data.get("type", "unknown")
        warning_reason = data.get("reason", "未知警告")
        
        logger.warning(f"Speechmatics警告 [{warning_type}]: {warning_reason}")
    
    def _extract_transcript_text(self, data: Dict[str, Any]) -> str:
        """从响应数据中提取转录文本"""
        try:
            results = data.get("results", [])
            if results:
                alternatives = results[0].get("alternatives", [])
                if alternatives:
                    return alternatives[0].get("content", "")
            return ""
        except Exception as e:
            logger.error(f"提取转录文本失败: {e}")
            return ""
    
    def _extract_confidence(self, data: Dict[str, Any]) -> Optional[float]:
        """从响应数据中提取置信度"""
        try:
            results = data.get("results", [])
            if results:
                alternatives = results[0].get("alternatives", [])
                if alternatives:
                    return alternatives[0].get("confidence")
            return None
        except Exception as e:
            logger.error(f"提取置信度失败: {e}")
            return None
    
    def _extract_timestamp(self, data: Dict[str, Any]) -> Optional[Dict[str, float]]:
        """从响应数据中提取时间戳"""
        try:
            results = data.get("results", [])
            if results:
                return {
                    "start_time": results[0].get("start_time"),
                    "end_time": results[0].get("end_time")
                }
            return None
        except Exception as e:
            logger.error(f"提取时间戳失败: {e}")
            return None
    
    def _extract_speaker_info(self, data: Dict[str, Any]) -> Optional[str]:
        """从响应数据中提取说话人信息"""
        try:
            results = data.get("results", [])
            if results:
                # 尝试多种可能的说话人字段
                speaker = results[0].get("speaker")
                if speaker is not None:
                    return f"Speaker {speaker}"
                
                # 尝试从alternatives中提取
                alternatives = results[0].get("alternatives", [])
                if alternatives:
                    speaker = alternatives[0].get("speaker")
                    if speaker is not None:
                        return f"Speaker {speaker}"
            
            return None
        except Exception as e:
            logger.error(f"提取说话人信息失败: {e}")
            return None
    
    async def start_transcription(self, 
                                language: str = None, 
                                enable_partials: bool = True,
                                sample_rate: int = 16000,
                                diarization: str = "speaker") -> bool:
        """开始转录会话（默认启用多说话人分离）"""
        try:
            # 连接WebSocket
            await self.client.connect()
            
            # 开始识别
            success = await self.client.start_recognition(
                language=language,
                enable_partials=enable_partials,
                sample_rate=sample_rate,
                diarization=diarization
            )
            
            if success:
                self.is_running = True
                # 启动消息监听任务
                asyncio.create_task(self.client.listen_for_messages())
                logger.info("转录服务已启动")
                return True
            else:
                await self.client.disconnect()
                return False
                
        except Exception as e:
            logger.error(f"启动转录服务失败: {e}")
            raise TranscriptionException(f"启动转录服务失败: {e}")
    
    async def send_audio_frame(self, audio_frame: np.ndarray) -> bool:
        """发送音频帧"""
        if not self.is_running:
            logger.warning("转录服务未运行")
            return False
        
        try:
            # 确保音频数据是float32格式
            if audio_frame.dtype != np.float32:
                audio_frame = audio_frame.astype(np.float32)
            
            # 转换为字节
            audio_bytes = audio_frame.tobytes()
            
            # 发送音频数据
            return await self.client.send_audio(audio_bytes)
            
        except Exception as e:
            logger.error(f"发送音频帧失败: {e}")
            return False
    
    async def stop_transcription(self) -> Dict[str, Any]:
        """停止转录会话"""
        try:
            if self.is_running:
                # 结束音频流
                await self.client.end_stream()
                
                # 等待转录结束
                await asyncio.sleep(2)  # 给服务器时间处理
        
            # 断开连接
            await self.client.disconnect()
            
            # 返回所有结果
            results = {
                "final_transcripts": self.transcript_results.copy(),
                "partial_transcripts": self.partial_transcript_results.copy(),
                "total_final": len(self.transcript_results),
                "total_partial": len(self.partial_transcript_results)
            }
            
            # 清空结果
            self.transcript_results.clear()
            self.partial_transcript_results.clear()
            
            logger.info("转录服务已停止")
            return results
            
        except Exception as e:
            logger.error(f"停止转录服务失败: {e}")
            raise TranscriptionException(f"停止转录服务失败: {e}")
    
    def get_latest_transcript(self) -> Optional[str]:
        """获取最新的转录文本"""
        if self.transcript_results:
            return self.transcript_results[-1]["text"]
        return None
    
    def get_latest_partial_transcript(self) -> Optional[str]:
        """获取最新的部分转录文本"""
        if self.partial_transcript_results:
            return self.partial_transcript_results[-1]["text"]
        return None
    
    def get_all_transcripts(self) -> List[Dict[str, Any]]:
        """获取所有转录结果"""
        return self.transcript_results.copy()
    
    def get_all_partial_transcripts(self) -> List[Dict[str, Any]]:
        """获取所有部分转录结果"""
        return self.partial_transcript_results.copy()