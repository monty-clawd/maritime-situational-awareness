# AGENTS.md — Maritime Situational Awareness MVP

**This file is for AI agents working on this codebase.**

## Project Overview

Building a real-time maritime vessel tracking and AIS/GNSS integrity monitoring system.

- **Frontend:** React 18+ with TypeScript, Vite, Tailwind CSS, MapLibre GL JS
- **Backend:** Node.js 20+, Express, TypeScript, WebSocket server
- **Analytics:** Python 3.11+ with FilterPy for Kalman filter-based sensor fusion
- **Database:** PostgreSQL 15+ with TimescaleDB extension
- **Cache/Pub-Sub:** Redis
- **Auth:** BetterAuth (email/password, role-based: operator/admin)
- **Deployment:** Docker Compose for local dev, containerized services

## Build & Development Commands

```bash
# Install dependencies
npm install

# Frontend dev (Vite, HMR on :5173)
npm run dev:frontend

# Backend dev (Express on :3000, TypeScript watch)
npm run dev:backend

# Python fusion engine
cd fusion-engine && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt && python app.py

# Run all services with Docker Compose
docker-compose up

# Database migrations
npm run db:migrate

# Tests
npm test

# Build for production
npm run build
```

## Code Style & Conventions

- **TypeScript:** Strict mode enabled, no `any` types without justification
- **React:** Functional components, hooks, Tailwind for styling
- **Python:** Black formatter, type hints, docstrings
- **Naming:** camelCase for JS, snake_case for Python
- **Git:** Descriptive commit messages, small focused commits
- **Imports:** Absolute imports from project root

## Architecture

```
maritime-situational-awareness/
├── frontend/               # React app, Vite, Tailwind
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page layouts
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API clients (AISStream, backend)
│   │   ├── types/          # TypeScript types & interfaces
│   │   ├── utils/          # Utility functions
│   │   └── App.tsx
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
├── backend/                # Express API server
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── controllers/    # Route handlers
│   │   ├── services/       # Business logic
│   │   ├── models/         # Mongoose/Prisma models
│   │   ├── middleware/     # Auth, logging, etc.
│   │   ├── types/          # TypeScript interfaces
│   │   ├── websocket/      # WebSocket handlers
│   │   └── server.ts
│   ├── .env.example
│   └── package.json
├── fusion-engine/          # Python service
│   ├── app.py              # Main entry point
│   ├── kalman_fusion.py    # FilterPy integration
│   ├── anomaly_detector.py # AIS/GNSS integrity checking
│   ├── requirements.txt
│   └── venv/
├── database/               # SQL migrations, schema
│   ├── migrations/
│   ├── schema.sql
│   └── seed.sql
├── docker-compose.yml      # Local dev environment
├── Dockerfile.frontend
├── Dockerfile.backend
├── Dockerfile.fusion
├── AGENTS.md               # This file
├── HOWTOAI.md
├── README.md
└── .gitignore

```

## Key Files & Patterns

### Database (PostgreSQL + TimescaleDB)
- Tables: `vessels`, `positions` (hypertable), `alerts`, `users`, `data_sources`
- Use TimescaleDB for time-series position data (efficient compression, fast queries)
- Migrations: SQL files in `database/migrations/` numbered by timestamp

### Frontend
- `src/components/MapDisplay.tsx` — MapLibre GL map with vessel markers
- `src/components/VesselPanel.tsx` — Vessel details sidebar
- `src/components/AlertFeed.tsx` — Real-time alert stream
- `src/services/api.ts` — HTTP client for backend REST API
- `src/services/websocket.ts` — WebSocket client for real-time updates

### Backend
- `POST /api/auth/login` — Email/password login via BetterAuth
- `GET /api/vessels` — List current vessels with positions
- `GET /api/vessels/:mmsi` — Get single vessel details
- `GET /api/alerts` — List recent alerts
- `POST /api/alerts/:alertId/acknowledge` — Acknowledge an alert
- `WS /api/ws` — WebSocket for real-time vessel updates and alerts

### Fusion Engine (Python)
- Subscribes to AISStream.io via WebSocket
- Listens for simulated radar tracks (JSON API)
- Runs Kalman filter fusion every N seconds
- Detects position discrepancies (500m threshold)
- Publishes alerts back to backend via Redis pub-sub

## Development Workflow

1. **Setup:** `npm install`, `docker-compose up` (spins up postgres, redis, etc.)
2. **Feature branch:** `git checkout -b feature/name`
3. **Code:** Make changes, commit frequently
4. **Test:** `npm test` for unit tests, manual browser testing for UI
5. **Push:** `git push origin feature/name`, create PR
6. **Merge:** Code review, squash & merge to main

## Important Notes

- **No hardcoded secrets:** Use `.env` files, load via process.env
- **AISStream.io API key:** Store in `AISSTREAM_API_KEY` env var
- **WebSocket messages:** Keep payloads < 1KB for performance
- **Timestamps:** Always use ISO 8601 format (UTC)
- **Error handling:** Meaningful error messages, log stack traces

## When Stuck

- Check `README.md` for setup instructions
- Review PRD at `/home/clawd/documents/prd-prototype/01_PRD_MVP_Core_Tracking_and_Integrity.md`
- Check existing code patterns before creating new abstractions
- Ask clarifying questions rather than guessing
