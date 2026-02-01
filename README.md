# Maritime Situational Awareness MVP

Real-time maritime vessel tracking with AIS/GNSS spoofing detection.

## Quick Start

### With Docker Compose (Recommended)
```bash
docker-compose up
```

Frontend: http://localhost:5173
Backend API: http://localhost:3000

### Manual Setup
```bash
# Install dependencies
npm install

# Setup environment
cp backend/.env.example backend/.env
cp fusion-engine/.env.example fusion-engine/.env

# Start services
npm run dev:frontend &
npm run dev:backend &
npm run dev:fusion
```

## Architecture

- **Frontend:** React 18+ with TypeScript, Vite, Tailwind CSS, MapLibre GL JS
- **Backend:** Node.js, Express, TypeScript, WebSocket, BetterAuth
- **Fusion Engine:** Python 3.11+ with FilterPy for Kalman filter sensor fusion
- **Database:** PostgreSQL 15+ with TimescaleDB
- **Cache:** Redis

## Documentation

- **[AGENTS.md](./AGENTS.md)** - Instructions for AI agents
- **[HOWTOAI.md](./HOWTOAI.md)** - Guide for developers using AI tools
- **[PRD](../01_PRD_MVP_Core_Tracking_and_Integrity.md)** - Product requirements

## Development

Read AGENTS.md before making changes.

### Build
```bash
npm run build
```

### Tests
```bash
npm test
```

### Database Migrations
```bash
npm run db:migrate
```

### Production Builds
```bash
docker-compose build
```

## Technologies

- Node.js 20+, Express, TypeScript
- React 18+, Vite, Tailwind CSS
- Python 3.11+, FilterPy, asyncio
- PostgreSQL 15+, TimescaleDB, Redis
- Docker, Docker Compose

## Status

MVP v0.1 - In Development

## License

Private - Defense Industry Application
