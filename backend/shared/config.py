"""
配置管理模块
管理Speechmatics API密钥、服务端点等配置信息
"""
import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置"""
    
   
    SPEECHMATICS_API_KEY: Optional[str] = "7lLJUFdbyFvzNODMyb1MLr49amx6CyYy"
    SPEECHMATICS_BASE_URL: str = "wss://eu2.rt.speechmatics.com/v2/"
    DEFAULT_SAMPLE_RATE: int = 16000
    DEFAULT_FRAME_SAMPLES: int = 480
    REQUEST_TIMEOUT: int = 30
    MAX_FILE_SIZE: int = 25 * 1024 * 1024  # 25MB
    WS_RECONNECT_INTERVAL: int = 5
    WS_MAX_RECONNECT_ATTEMPTS: int = 3
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
