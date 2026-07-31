# Deployment Guide

The app has three pieces that deploy differently:

| Piece | Host | Notes |
| --- | --- | --- |
| **Next.js frontend** (`/frontend`) | Vercel | one-click, free tier |
| **Postgres database** | Supabase | already hosted — nothing to deploy |
| **Python FastAPI + YOLO** (`/backend`) | Render / Railway / VM | long-running websockets + model file; **cannot** run on Vercel |

---

## 1. Frontend → Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → import this repo.
2. **Set Root Directory to `frontend`.** (Required — the repo has `frontend` and `backend` side by side. Vercel can't infer this; `vercel.json` only pins the build command.)
3. Framework auto-detects as **Next.js**. Build command is `prisma generate && next build` (from `frontend/vercel.json`).
4. Add **Environment Variables** (see list below).
5. Deploy. To deploy a feature branch first, pick it as the production/preview branch.

### Required environment variables (Vercel → Settings → Environment Variables)

| Variable | Source |
| --- | --- |
| `DATABASE_URL` | Supabase → Database → **Transaction pooler** (port 6543, add `?pgbouncer=true`) |
| `DIRECT_URL` | Supabase → Database → **Session pooler** (port 5432) |
| `AUTH_SECRET` | `npx auth secret` (or any 32+ char random string) |
| `AUTH_GOOGLE_ID` | Google Cloud OAuth client |
| `AUTH_GOOGLE_SECRET` | Google Cloud OAuth client |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers Console → Messaging API channel |
| `LINE_TARGET_ID` | optional — user/group id to push to; blank = broadcast to all OA followers |
| `NEXT_PUBLIC_BACKEND_WS_URL` | `wss://<your-backend-host>/ws/detect` (see step 3 below) |

### After the first deploy
- Add the Vercel URL to your Google OAuth **Authorized redirect URIs**:
  `https://<your-app>.vercel.app/api/auth/callback/google` — otherwise Google login fails.

---

## 2. Database → Supabase (one-time setup per environment)

Run against the production database (locally, with prod `DATABASE_URL`/`DIRECT_URL` in `frontend/.env`):

```bash
cd frontend
npx prisma migrate deploy   # apply schema
npx prisma db seed          # admin@example.com / admin123 + sample data
```

---

## 3. Backend → Render / Railway

The backend ships a `Dockerfile`, so any container host works.

1. New **Web Service** → point at this repo, **Root Directory `backend`**, build from `Dockerfile`.
2. Expose the port the container runs uvicorn on (8000).
3. Set env var `FRONTEND_API_URL=https://<your-app>.vercel.app` so detected accidents persist to the deployed DB.
4. Once it has a public URL, set the frontend's `NEXT_PUBLIC_BACKEND_WS_URL` to `wss://<backend-host>/ws/detect`
   (**`wss`**, not `ws` — an HTTPS page can't open an insecure websocket).

> The YOLO model + OpenCV need real CPU/RAM (ideally GPU). Free tiers may be too small/slow for live video processing.

---

## Deploy order

Deploy the **frontend first** — it's self-sufficient with Supabase (login, incidents, dashboard, maps all work). The live-detection camera page only works once the **backend** is hosted and `NEXT_PUBLIC_BACKEND_WS_URL` points at it.
