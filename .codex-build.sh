#!/bin/bash
# .codex-build.sh - Maritime Situational Awareness MVP Build Script
# Run this with: bash .codex-build.sh

set -e

echo "🚀 Maritime Situational Awareness MVP — Build Starting"
echo "==========================================================="

# Step 1: Initialize git & project structure
echo "📁 Creating project structure..."
mkdir -p frontend backend fusion-engine database/{migrations,seeds}
mkdir -p database/.

# Step 2: Create root files
echo "📝 Creating root configuration files..."

cat > package.json << 'EOF'
{
  "name": "maritime-situational-awareness-mvp",
  "version": "0.1.0",
  "description": "Real-time maritime vessel tracking with AIS/GNSS integrity monitoring",
  "private": true,
  "workspaces": [
    "frontend",
    "backend",
    "fusion-engine"
  ],
  "scripts": {
    "dev": "npm run dev:frontend & npm run dev:backend & npm run dev:fusion",
    "dev:frontend": "npm -w frontend run dev",
    "dev:backend": "npm -w backend run dev",
    "dev:fusion": "npm -w fusion-engine run dev",
    "build": "npm -w frontend run build && npm -w backend run build",
    "test": "npm -w frontend run test && npm -w backend run test",
    "db:migrate": "npm -w backend run db:migrate",
    "docker:build": "docker-compose build",
    "docker:up": "docker-compose up",
    "docker:down": "docker-compose down"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=9.0.0"
  }
}
EOF

cat > .gitignore << 'EOF'
# Dependencies
node_modules/
venv/
__pycache__/
*.pyc
.env
.env.local
.env.*.local

# Build outputs
dist/
build/
.next/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*

# Database
*.db
*.sqlite
postgres_data/

# Docker
.docker/
EOF

cat > README.md << 'EOF'
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
if [ "${SKIP_INSTALL}" != "true" ]; then
  npm install
fi

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
EOF

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: timescale/timescaledb:latest-pg15
    environment:
      POSTGRES_USER: maritime
      POSTGRES_PASSWORD: maritime_dev_password
      POSTGRES_DB: maritime_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://maritime:maritime_dev_password@postgres:5432/maritime_db
      REDIS_URL: redis://redis:6379
      AISSTREAM_API_KEY: ${AISSTREAM_API_KEY}
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app/backend
      - /app/backend/node_modules

  fusion_engine:
    build:
      context: .
      dockerfile: Dockerfile.fusion
    environment:
      REDIS_URL: redis://redis:6379
      AISSTREAM_API_KEY: ${AISSTREAM_API_KEY}
    depends_on:
      - redis
    volumes:
      - ./fusion-engine:/app/fusion-engine

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:3000
    volumes:
      - ./frontend:/app/frontend
      - /app/frontend/node_modules

volumes:
  postgres_data:
EOF

# Step 3: Frontend setup
echo "🎨 Setting up frontend..."
cd frontend

cat > package.json << 'EOF'
{
  "name": "maritime-frontend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "maplibre-gl": "^3.6.0",
    "socket.io-client": "^4.7.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
EOF

cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "strict": true,
    "esModuleInterop": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0'
  }
})
EOF

cat > tailwind.config.js << 'EOF'
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

mkdir -p src/{components,pages,services,types,utils}

cat > src/main.tsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

cat > src/App.tsx << 'EOF'
export default function App() {
  return (
    <div className="w-full h-screen bg-slate-900 text-white">
      <div className="p-8">
        <h1 className="text-3xl font-bold">Maritime Situational Awareness</h1>
        <p className="text-slate-400 mt-2">MVP - Loading...</p>
      </div>
    </div>
  )
}
EOF

cat > index.html << 'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Maritime Situational Awareness</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

if [ "${SKIP_INSTALL}" != "true" ]; then
  npm install
fi

cd ..

# Step 4: Backend setup
echo "🔧 Setting up backend..."
cd backend

cat > package.json << 'EOF'
{
  "name": "maritime-backend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:migrate": "tsx src/db/migrate.ts",
    "test": "vitest"
  },
  "dependencies": {
    "express": "^4.18.0",
    "ws": "^8.15.0",
    "better-auth": "^0.14.0",
    "pg": "^8.11.0",
    "redis": "^4.6.0",
    "dotenv": "^16.3.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "@types/better-auth": "^0.14.0",
    "typescript": "^5.3.0",
    "tsx": "^4.6.0",
    "vitest": "^0.34.0"
  }
}
EOF

cat > .env.example << 'EOF'
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://maritime:maritime_dev_password@localhost:5432/maritime_db
REDIS_URL=redis://localhost:6379
AISSTREAM_API_KEY=your_api_key_here
JWT_SECRET=your_jwt_secret_here
EOF

cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
EOF

mkdir -p src/{routes,controllers,services,models,middleware,websocket,types,db}

cat > src/server.ts << 'EOF'
import express from 'express'
import cors from 'cors'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server })

app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// WebSocket
wss.on('connection', (ws) => {
  console.log('WebSocket client connected')
  ws.on('close', () => {
    console.log('WebSocket client disconnected')
  })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`✅ Backend listening on port ${PORT}`)
})
EOF

mkdir -p src/db
cat > src/db/migrate.ts << 'EOF'
// Database migration runner
console.log('Migrations placeholder')
EOF

npm install

cd ..

# Step 5: Fusion engine setup
echo "🔬 Setting up fusion engine..."
cd fusion-engine

cat > requirements.txt << 'EOF'
aiohttp==3.9.0
websockets==12.0
redis==5.0.0
numpy==1.24.0
scipy==1.11.0
filterpy==1.4.2
python-dotenv==1.0.0
pydantic==2.5.0
EOF

cat > app.py << 'EOF'
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    print("🚀 Fusion Engine Starting...")
    aisstream_key = os.getenv("AISSTREAM_API_KEY")
    print(f"✅ AISStream API key loaded: {aisstream_key[:10]}...")
    
    # Placeholder for AISStream connection and fusion logic
    while True:
        await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(main())
EOF

cat > .env.example << 'EOF'
AISSTREAM_API_KEY=your_api_key_here
REDIS_URL=redis://localhost:6379
EOF

cd ..

# Step 6: Database schema
echo "📊 Creating database schema..."
cat > database/schema.sql << 'EOF'
-- Create TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) DEFAULT 'operator',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vessels table
CREATE TABLE IF NOT EXISTS vessels (
  mmsi BIGINT PRIMARY KEY,
  imo INTEGER,
  name VARCHAR(255),
  flag VARCHAR(2),
  type VARCHAR(50),
  destination VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Vessel positions (time-series)
CREATE TABLE IF NOT EXISTS positions (
  id SERIAL,
  mmsi BIGINT REFERENCES vessels(mmsi),
  timestamp TIMESTAMP NOT NULL,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  speed FLOAT,
  heading FLOAT,
  source VARCHAR(50), -- 'AIS', 'RADAR', 'FUSED'
  confidence FLOAT DEFAULT 1.0
);

-- Convert positions to hypertable for TimescaleDB
SELECT create_hypertable('positions', 'timestamp', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_positions_mmsi_time ON positions (mmsi, timestamp DESC);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  mmsi BIGINT REFERENCES vessels(mmsi),
  type VARCHAR(50), -- 'POSITION_DISCREPANCY', 'SIGNAL_LOSS', etc.
  severity VARCHAR(20), -- 'LOW', 'MEDIUM', 'HIGH'
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  acknowledged_at TIMESTAMP,
  acknowledged_by INTEGER REFERENCES users(id)
);

-- Data sources table
CREATE TABLE IF NOT EXISTS data_sources (
  id VARCHAR(50) PRIMARY KEY,
  type VARCHAR(50), -- 'AIS', 'RADAR', 'WEATHER'
  status VARCHAR(20), -- 'ONLINE', 'DEGRADED', 'OFFLINE'
  last_seen TIMESTAMP
);
EOF

echo "✅ Initialization Complete!"
echo ""
echo "🎯 Next Steps:"
echo "1. npm install (in root)"
echo "2. Create .env files from .env.example"
echo "3. docker-compose up"
echo ""
echo "Frontend: http://localhost:5173"
echo "Backend: http://localhost:3000"
