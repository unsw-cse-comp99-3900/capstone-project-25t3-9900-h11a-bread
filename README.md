# SystemX - Real-time Fact Accent Translation Application

SystemX is a full-stack fast accent translation application with a React frontend and FastAPI backend, fully containerized with Docker. The application provides real-time accent translation capabilities through WebSocket connections and HTTP endpoints.

## Project Structure

```
systemx/
├── frontend/                    # React + TypeScript + Vite frontend
│   ├── src/                    # React components and logic
│   ├── public/                 # Static assets
│   ├── Dockerfile              # Production Docker image
│   ├── Dockerfile.dev          # Development Docker image
│   ├── docker-compose.yml      # Frontend Docker orchestration
│   └── package.json            # Node.js dependencies
├── backend/                     # FastAPI backend for audio processing
│   ├── VAD/                    # Voice Activity Detection module
│   │   ├── app.py             # Main FastAPI application
│   │   ├── client.py          # Client utilities
│   │   └── getTestData.py     # Test data utilities
│   ├── Dockerfile              # Production Docker image
│   ├── Dockerfile.dev          # Development Docker image
│   ├── docker-compose.yml      # Backend Docker orchestration
│   └── requirements.txt        # Python dependencies
└── README.md                    # This file
```

## Quick Start

### Full Stack Development

To run both frontend and backend in development mode:

```bash
# Terminal 1 - Start backend
cd backend
docker-compose up backend-dev

# Terminal 2 - Start frontend
cd frontend
docker-compose up systemx-dev
```

- Backend API: `http://localhost:8000`
- Frontend App: `http://localhost:3000`
- API Documentation: `http://localhost:8000/docs`

### Full Stack Production

```bash
# Terminal 1 - Start backend
cd backend
docker-compose --profile production up backend-prod

# Terminal 2 - Start frontend
cd frontend
docker-compose --profile production up systemx-prod
```

- Backend API: `http://localhost:8000`
- Frontend App: `http://localhost:8080`

## Backend Development

### Local Development (without Docker)

```bash
cd backend
pip install -r requirements.txt
uvicorn VAD.app:app --reload --host 0.0.0.0 --port 8000
```

Access API at: `http://localhost:8000`
API Documentation: `http://localhost:8000/docs`

### Docker Development

For development with hot reloading:

```bash
cd backend
docker-compose up backend-dev
```

### Docker Production

```bash
cd backend
docker-compose --profile production up backend-prod
```

## Frontend Development

### Local Development (without Docker)

```bash
cd frontend
npm install
npm run dev
```

### Docker Development

For development with hot reloading:

```bash
cd frontend
# Start development server with Docker
docker-compose up systemx-dev

# Or build and run manually
docker build -f Dockerfile.dev -t systemx-dev .
docker run -p 3000:3000 -v $(pwd):/app -v /app/node_modules systemx-dev
```

The development server will be available at `http://localhost:3000`

### Docker Production

For production build:

```bash
# Start production server
docker-compose --profile production up systemx-prod

# Or build and run manually
docker build -t systemx-prod .
docker run -p 8080:80 systemx-prod
```

The production server will be available at `http://localhost:8080`

## Docker Commands Reference

### Backend Commands

_Run from `backend/` directory_

- `docker-compose up backend-dev` - Start development server
- `docker-compose --profile production up backend-prod` - Start production server
- `docker-compose down` - Stop all services

### Frontend Commands

_Run from `frontend/` directory_

- `docker-compose up systemx-dev` - Start development server with hot reloading
- `docker-compose --profile production up systemx-prod` - Start production server
- `docker-compose down` - Stop all services

### Manual Docker Commands

```bash
# Development
docker build -f Dockerfile.dev -t systemx:dev .
docker run -p 3000:3000 systemx:dev

# Production
docker build -t systemx:prod .
docker run -p 8080:80 systemx:prod
```

## Available Scripts

### Backend Scripts

_Run from `backend/` directory_

- `uvicorn VAD.app:app --reload` - Start development server
- `python VAD/client.py` - Run test client
- `python VAD/getTestData.py` - Generate test data

### Frontend Scripts

_Run from `frontend/` directory_

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Configuration

### Backend Configuration

The FastAPI backend uses:

- **Python 3.11** runtime
- **FastAPI** for async web framework
- **Uvicorn** as ASGI server
- **NumPy** for audio processing
- **Pydantic** for data validation

### Frontend Configuration

The React frontend uses:

- **Node.js 22** runtime
- **React 19** with TypeScript
- **Vite** as build tool and dev server
- **ESLint** for code linting

### Vite Configuration

The `vite.config.ts` is configured to work with Docker:

- Host set to `0.0.0.0` for container accessibility
- Polling enabled for file watching in containers
