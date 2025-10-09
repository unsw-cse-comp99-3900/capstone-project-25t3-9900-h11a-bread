# Speech Processing Backend

FastAPI-based backend providing real-time speech processing APIs, including denoising and future VAD/ASR/TTS extensions.  
Fully containerized for both development and production environments.

## 1. Features

- **FastAPI** for high-performance backend framework
- **WebSocket** support for real-time audio streaming
- **Docker** support for consistent deployment
- **Hot Reloading** in development
- **Uvicorn** ASGI server for production
- **Swagger UI** for API documentation
- Modular pipeline design (ASR implemented, VAD/TTS pending)

## 2. Roadmap

| Module                                 | Description                   | Status      |
| -------------------------------------- | ----------------------------- |-------------|
| **VAD (Voice Activity Detection)**     | Detect speech/silence regions | Implemented |
| **ASR (Automatic Speech Recognition)** | Speech-to-text pipeline       | Implemented |
| **TTS (Text-to-Speech)**               | Convert text to voice output  | Pending     |

## 3. Quick Start

### 3.1 Docker Commands

```bash
# Development

docker compose up backend-dev - Start backend with hot reloading

docker compose down - Stop all backend services

# Production

docker compose --profile production up backend-prod - Start backend in production mode

docker compose --profile production down - Stop production backend
```

### 3.2 Swagger detail

| Type | Method | #Endpoint              | Description                              |
|------|--------|------------------------|------------------------------------------|
| SYS  | GET    | /health                | Check service status                     |
| VAD  | POST   | /denoise/frame         | Denoise a single Float32 PCM frame       |
| VAD  | WS     | /ws/denoise            | Real-time bidirectional denoising stream |
| ASR  | POST   | /transcription/start   | Start real-time transcription session    |
| ASR  | POST   | /transcription/stop    | Stop transcription and get results       |
| ASR  | GET    | /transcription/status  | Query transcription session status       |
| ASR  | GET    | /transcription/results | Retrieve transcription results           |
| ASR  | WS     | /ws/integrated         | Integrated denoising + transcription     |

## 4. Project Structure

```bash
backend/
│
├── VAD/                            # Voice Activity Detection 
│   ├── app.py                      # FastAPI main entry with denoising + transcription
│   ├── client.py                   # WebSocket test client for real-time audio stream
│   └── getTestData.py              # Synthetic test data generator for unit testing
│
├── speechmatics/                   # Speechmatics API Integration (ASR)
│   ├── models.py                   # Pydantic models for API requests/responses
│   ├── websocket_client.py         # WebSocket client for Speechmatics real-time API
│   └── transcription_service.py    # High-level transcription service wrapper
│
├── shared/                         # Shared utilities
│   ├── config.py                   # Configuration management (API keys, settings)
│   └── exceptions.py               # Custom exception classes for error handling
│
├── TTS/                            # Text-to-Speech module 
│   └── (placeholder)               # Future integration: speech synthesis, voice cloning
│
├── docker-compose.yml              # Defines dev/prod services, ports, and environment mapping
├── Dockerfile                      # Production build (optimized image)
├── Dockerfile.dev                  # Development build (hot reload + mounted volume)
├── requirements.txt                # Python dependencies list
└── README.md                       # Documentation for setup, APIs, and module overview
```

## 5. Configuration

### 5.1 Docker Configuration

Development: Uses python:3.11-slim with volume mounting and live reload (uvicorn --reload)

Production: Multi-stage build for a lightweight image

Port: Exposes port 8000 for API access

Environment: Configured via docker-compose.yml with reload and restart policies

### 5.2. Dependencies

```bash
fastapi==0.115.*
uvicorn==0.30.*
numpy==1.26.*
pydantic==2.*
pydantic-settings==2.*
websockets==12.0.*
aiohttp==3.9.*
```

### 5.3. API Configuration

Set Speechmatics API key in environment or config file:

```bash
# Option 1: Environment variable
export SPEECHMATICS_API_KEY=your_api_key_here

# Option 2: Configure in shared/config.py
SPEECHMATICS_API_KEY: str = "your_api_key_here"
```

## 6. ASR Implementation Details

### 6.1 Speechmatics Integration

- **Real-time transcription**: WebSocket-based streaming ASR
- **Multi-speaker diarization**: Automatic speaker separation
- **Language auto-detection**: Supports multiple languages
- **Error handling**: Comprehensive exception handling with retry logic

### 6.2 Usage Example

```python
import requests

# Start transcription session with speaker diarization
response = requests.post("http://localhost:8000/transcription/start", 
    json={"language": None, "diarization": "speaker"})

# Stop and retrieve results
results = requests.post("http://localhost:8000/transcription/stop").json()
for item in results['results']:
    print(f"{item['speaker']}: {item['text']}")
```

### 6.3 Audio Format Requirements

- Encoding: `pcm_f32le` (Float32 PCM, little-endian)
- Sample rate: `16000 Hz`
- Channels: `1 (mono)`
- Frame size: `480 samples (30ms @ 16kHz)`

