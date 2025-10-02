## 🚀 Quick Start

### Development (with hot reloading):
```bash
cd systemx  # or wherever you placed the project
docker-compose up systemx-dev
```
Access at: `http://localhost:3000`

### Production:
```bash
cd systemx
docker-compose --profile production up systemx-prod
```
Access at: `http://localhost:8080`

## Detailed Setup

### Local Development (without Docker)

```bash
npm install
npm run dev
```

### Docker Development

For development with hot reloading:

```bash
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