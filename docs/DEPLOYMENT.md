# Deployment (Free Hosting)

This guide deploys the backend to Render (free tier) and the frontend to Vercel (free tier).

## Prerequisites

- A Render account
- A Vercel account
- A PostgreSQL database (Render Postgres or Supabase)

## Backend on Render (free tier)

### 1) Create the service

1. In Render, choose **New** -> **Blueprint** and connect this repo.
2. Render will detect `render.yaml` at the repo root.
3. Create the service when prompted.

### 2) Set environment variables

In the Render service settings, add:

- `DATABASE_URL` (required)
- `REDIS_URL` (optional)
- `AISSTREAM_API_KEY` (required for AIS stream)
- `CORS_ORIGIN` (required, set to your Vercel app URL)

Example `CORS_ORIGIN` value:

- `https://your-app.vercel.app`

### 3) Deploy

- Render will run `npm install && npm run build` in `backend/` and start with `npm run start`.
- Once deployed, note the Render service URL (for example: `https://your-backend.onrender.com`).

## Frontend on Vercel (free tier)

### 1) Import the project

1. In Vercel, choose **Add New Project**.
2. Select this repo.
3. Set the **Root Directory** to `frontend`.

### 2) Set environment variables

In the Vercel project settings, add:

- `VITE_API_URL` (required)
- `VITE_WS_URL` (optional but recommended)

Example values:

- `VITE_API_URL=https://your-backend.onrender.com`
- `VITE_WS_URL=wss://your-backend.onrender.com/api/ws`

### 3) Deploy

- Vercel uses `frontend/vercel.json` for build settings.
- The output directory is `frontend/dist`.

## Database (free options)

### Option A: Render Postgres

1. In Render, create a new **PostgreSQL** database.
2. Copy the **External Database URL** and use it as `DATABASE_URL` in Render.
3. Run migrations locally and point to that database:

```bash
npm run db:migrate
```

### Option B: Supabase Postgres

1. Create a new Supabase project.
2. Copy the **Connection String** (URI format) and use it as `DATABASE_URL` in Render.
3. Run migrations locally against the Supabase database.

## Environment variable summary

Backend (Render):

- `DATABASE_URL` (required)
- `REDIS_URL` (optional)
- `AISSTREAM_API_KEY` (required)
- `CORS_ORIGIN` (required)

Frontend (Vercel):

- `VITE_API_URL` (required)
- `VITE_WS_URL` (optional, but recommended for WebSocket updates)

## Troubleshooting

- **CORS errors in browser**: Ensure `CORS_ORIGIN` in Render exactly matches your Vercel URL, including `https://`.
- **WebSocket connection fails**: Verify `VITE_WS_URL` uses `wss://` and points to `/api/ws`.
- **Backend fails to boot**: Check `DATABASE_URL` is set and reachable; Render logs usually show the connection error.
- **Migrations not applied**: Run `npm run db:migrate` locally with `DATABASE_URL` set for the target database.
- **Vercel shows a blank page**: Make sure the Vercel project root is `frontend` and the build output is `dist`.
