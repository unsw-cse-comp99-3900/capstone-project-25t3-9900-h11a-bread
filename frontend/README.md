# SystemX Frontend

React application built with Vite and TypeScript for real-time accent translation, fully containerized with Docker.

## Features

- **Vite** for fast development and building
- **TypeScript** for type safety
- **Real-time STT/TTS** via Speechmatics and Azure Speech SDK
- **Speaker diarization** with automatic voice assignment
- **AI-powered summaries** using DeepSeek V3
- **Docker** support for development and production
- **Hot Module Replacement** in development
- **Nginx** for production serving
- **ESLint** for code quality

## Quick Start

### Development (with hot reloading):

```bash
docker-compose up systemx-dev
```

Access at: `http://localhost:3000`

### Production:

```bash
docker-compose --profile production up systemx-prod
```

Access at: `http://localhost:8080`

### Local Development (without Docker)

```bash
npm install
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Docker Commands

### Development

- `docker-compose up systemx-dev` - Start development server with hot reloading
- `docker-compose down` - Stop all services

### Production

- `docker-compose --profile production up systemx-prod` - Start production server
- `docker-compose --profile production down` - Stop production services

### Manual Docker Commands

```bash
# Development
docker build -f Dockerfile.dev -t systemx:dev .
docker run -p 3000:3000 systemx:dev

# Production
docker build -t systemx:prod .
docker run -p 8080:80 systemx:prod
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Firebase (authentication and transcript storage)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Speechmatics (speech-to-text)
VITE_SPEECHMATICS_API_KEY=your_speechmatics_key

# Azure Cognitive Services (text-to-speech)
VITE_AZURE_SPEECH_API_KEY=your_azure_key
VITE_AZURE_REGION=eastus

# DeepSeek AI (optional, for transcript summaries)
VITE_DEEPSEEK_API_KEY=your_deepseek_key
```

### Vite Configuration

The `vite.config.ts` is configured to work with Docker:

- Host set to `0.0.0.0` for container accessibility
- Polling enabled for file watching in containers

### Docker Configuration

- **Development**: Uses Node.js 22 with volume mounting for hot reloading
- **Production**: Multi-stage build with Nginx for serving static files
- **Nginx**: Configured with proper MIME types and caching headers
