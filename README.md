# SystemX - Full Stack Application

SystemX is a Fast Accent Translator full-stack application with React frontend and backend API, fully containerized with Docker.

## Project Structure

```
systemx/
├── frontend/          # React + TypeScript + Vite frontend
│   ├── src/          # React components and logic
│   ├── public/       # Static assets
│   ├── Dockerfile    # Production Docker image
│   └── docker-compose.yml # Docker orchestration
├── backend/          # Backend API (to be implemented)
└── README.md         # This file
```

## Quick Start

### Frontend Development (with hot reloading):

```bash
cd frontend
docker-compose up systemx-dev
```

Access at: `http://localhost:3000`

### Frontend Production:

```bash
cd frontend
docker-compose --profile production up systemx-prod
```

Access at: `http://localhost:8080`

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

## Docker Commands

_All commands should be run from the `frontend/` directory_

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

## Available Scripts

_Run these commands from the `frontend/` directory_

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Configuration

### Vite Configuration

The `vite.config.ts` is configured to work with Docker:

- Host set to `0.0.0.0` for container accessibility
- Polling enabled for file watching in containers

### Docker Configuration

- **Development**: Uses Node.js 22 with volume mounting for hot reloading
- **Production**: Multi-stage build with Nginx for serving static files
- **Nginx**: Configured with proper MIME types and caching headers
