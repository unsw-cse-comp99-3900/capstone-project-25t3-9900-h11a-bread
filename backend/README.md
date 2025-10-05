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
| **ASR (Automatic Speech Recognition)** | Speech-to-text pipeline       | Pending     |
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

| Type | Method | #Endpoint      | Description                              |
|------|--------|----------------|------------------------------------------|
| VAD  | GET    | /health        | Check service status                     |
| VAD  | POST   | /denoise/frame | Denoise a single Float32 PCM frame       |
| VAD  | WS     | /ws/denoise    | Real-time bidirectional denoising stream |

## 4. Project Structure

```bash
backend/
│
├── ASR/                            # Automatic Speech Recognition 
│   └── (placeholder)               # Future integration: silence detection, speech segmentation
│
├── TTS/                            # Text-to-Speech module 
│   └── (placeholder)               # Future integration: speech synthesis, voice cloning
│
├── VAD/                            # Voice Activity Detection 
│   ├── app.py                      # FastAPI main entry for real-time denoise/ASR service
│   ├── client.py                   # WebSocket test client for real-time audio stream
│   └── getTestData.py              # Synthetic test data generator for unit testing
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
```

