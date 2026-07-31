# Setup Guide — Nan-Ngai-CCTV

AI accident-detection CCTV system. Three moving parts:

| Part | Stack | Purpose |
| --- | --- | --- |
| **`/frontend`** | Next.js 16, Prisma, NextAuth | Dashboard, API, database access, LINE alerts |
| **`/backend`** | FastAPI, YOLO (ultralytics), OpenCV | AI accident detection on camera streams |
| **Database** | Supabase (Postgres) | All data |
| **Media** | Cloudinary | Accident photos + camera clips |

> The frontend + database are enough for everything **except live detection**. The Python backend is only needed to detect accidents.

---

## 1. Prerequisites

- **Node.js 18+** and npm
- **Python 3.10+** (3.12 works)
- Accounts: **Supabase** (database), **Cloudinary** (media), optional **LINE** Official Account (alerts), optional **Google Cloud** (OAuth login)

---

## 2. Installation

### Frontend
```bash
cd frontend
npm install
npx prisma generate
```

### Backend
```bash
cd backend
python -m venv venv

# Windows (PowerShell)
.\venv\Scripts\Activate.ps1
# macOS/Linux
# source venv/bin/activate

pip install -r requirements.txt
```

> **PyTorch is not in `requirements.txt`.** `ultralytics` needs it. If you hit `No module named torch`:
> ```bash
> pip install torch torchvision
> # GPU (CUDA) instead:
> # pip install torch torchvision --index-url https://download.pytorch.org/whl/cu126
> ```

The YOLO model must exist at **`backend/model/best.pt`** (~40 MB).

---

## 3. Environment

### ⚠️ Read this first — the `.env` vs `.env.local` trap
- **Next.js runtime** loads `.env.local` **over** `.env` (same key → `.env.local` wins).
- **Prisma CLI** (`migrate`, `seed`, `studio`) reads **`.env` only** — it ignores `.env.local`.

👉 **Keep `DATABASE_URL` / `DIRECT_URL` in `.env` ONLY.** If a DB URL is also in `.env.local`, the app and Prisma CLI will silently talk to **different databases**.

👉 **Never wrap values in quotes** unless the value needs them. A stray `""` becomes the literal string `""` and breaks things (this bit us on `NEXT_PUBLIC_BACKEND_WS_URL` and `LINE_TARGET_ID`).

### `frontend/.env`
Copy from [`frontend/.env.example`](frontend/.env.example).

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Supabase **Transaction pooler**, port **6543**, append `?pgbouncer=true` |
| `DIRECT_URL` | Supabase **Session pooler**, port **5432** |
| `NEXT_PUBLIC_BACKEND_WS_URL` | `ws://localhost:8000/ws/detect` locally. Baked in at **build time**. |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers → Messaging API channel |
| `LINE_TARGET_ID` | Optional. Blank = broadcast to all OA followers |
| `APP_BASE_URL` | Public HTTPS URL. Needed for LINE photos when images aren't on Cloudinary |

> **Supabase gotcha:** use the **pooler** host for *both* URLs. The legacy `db.<ref>.supabase.co` direct host is **IPv6-only** and fails with `P1001: Can't reach database server` on most networks.

### `frontend/.env.local`
```
AUTH_SECRET=<any 32+ char random string, or: npx auth secret>
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
```
(Google vars are only needed if you use Google login.)

### `backend/.env`
```
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
FRONTEND_API_URL=http://localhost:3000
```
- `CLOUDINARY_URL` — from the Cloudinary dashboard. Enables uploading accident snapshots so they're publicly viewable (needed for LINE photos + the deployed site).
- `FRONTEND_API_URL` — **where the backend POSTs detected incidents.** Point it at whichever frontend owns the DB:
  - local frontend → `http://localhost:3000`
  - deployed site → `https://<your-app>.vercel.app`

  If this is wrong, detection fires a toast but **no incident is saved** (no red alert / pending alert / Engage View).

---

## 4. Database setup

Run from `frontend/` (Prisma CLI reads `.env`):
```bash
npx prisma migrate deploy   # create tables
npx prisma db seed          # cameras, aid posts, sample incidents, users
npx prisma studio           # optional: browse data
```

**Seeded logins:**

| Email | Password | Role |
| --- | --- | --- |
| `admin@example.com` | `admin123` | ADMIN |
| `user01@example.com` | `user01` | USER |
| `user02@example.com` | `user02` | USER |

> ⚠️ `db seed` **wipes and rebuilds** cameras, aid posts, incidents, history, and notification logs (users are upserted, not deleted).

---

## 5. Running locally

**Frontend** (terminal 1):
```bash
cd frontend
npm run dev          # http://localhost:3000
```

**Backend** (terminal 2) — only needed for live detection:
```bash
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```
Check **http://localhost:8000/health** → `{"status":"ok", ...}`

> **Run uvicorn from inside `backend/`** — it resolves paths like `../frontend/public/...` relative to that folder.

### What needs what

| Task | Frontend | Backend | Supabase |
| --- | :---: | :---: | :---: |
| Browse / confirm / delete logs | ✅ | — | ✅ |
| LINE alert on Confirm | ✅ | — | ✅ |
| **Live accident detection** | ✅ | ✅ | ✅ |

### Testing detection
1. Live Grid → toggle **AI Detection: ON**, pick an **AI Target** camera.
2. On detection: toast + sound → incident saved → red alert, Pending Alert, Engage View, and the camera **auto-pauses** (so the looping clip can't re-alert). Press **▶** to re-arm.

---

## 6. Media (Cloudinary)

Media is served from **Cloudinary**, not the repo — Vercel's filesystem is read-only, and large committed `.mp4`s don't serve reliably.

- **Accident snapshots**: the backend auto-uploads them when `CLOUDINARY_URL` is set, storing the public URL on the incident.
- **Camera demo clips**: `CCTV.accidentVideoUrl` holds a Cloudinary URL.

Swap in your own clip:
```bash
cd frontend
npx tsx scripts/set-camera-video.ts <video.mp4> "<camera name>"   # or --all
```
Uploads to Cloudinary and repoints that camera. Reload the app — no redeploy needed.

> Detection only fires on footage with a **real vehicle collision** — that's what the model was trained on.

---

## 7. Deployment

### Frontend → Vercel
1. Import the repo at [vercel.com](https://vercel.com) → **Add New → Project**.
2. **⚠️ Set Root Directory to `frontend`** (the repo has `frontend/` and `backend/` side by side).
3. Add **all** the `frontend/.env` + `.env.local` variables (Production scope).
4. Deploy. Build command is `prisma generate && next build` (from `frontend/vercel.json`).

**After the first deploy:**
- Add `https://<your-app>.vercel.app/api/auth/callback/google` to Google OAuth **Authorized redirect URIs**.
- Set `APP_BASE_URL` to your Vercel URL, then **redeploy**.

> `NEXT_PUBLIC_*` vars are **baked in at build time** — changing one requires a **redeploy**, not just a restart.

### Database → Supabase
Already hosted. Just run `migrate deploy` + `db seed` against it once (see §4).

### Backend → Render / Railway (optional)
The backend **cannot** run on Vercel (long-lived WebSockets + a model file + OpenCV). It ships a `Dockerfile`:
1. New **Web Service** → Root Directory `backend`, build from `Dockerfile`, expose port `8000`.
2. Set `CLOUDINARY_URL` and `FRONTEND_API_URL=https://<your-app>.vercel.app`.
3. Point the frontend's `NEXT_PUBLIC_BACKEND_WS_URL` at `wss://<backend-host>/ws/detect` (**`wss`**, not `ws` — an HTTPS page can't open an insecure socket) and **redeploy**.

**Without a hosted backend, the deployed site works for everything except live detection.** You can also run the backend **locally** against the deployed site: set `FRONTEND_API_URL` to the Vercel URL — browsers allow `ws://localhost` even from an HTTPS page.

---

## 8. Troubleshooting

| Symptom | Cause / Fix |
| --- | --- |
| `P1001: Can't reach database server` | Using the IPv6-only direct host. Use the **pooler** host for both URLs (§3). |
| `Environment variable not found: DATABASE_URL` | Not in `.env` (Prisma ignores `.env.local`), or the line is malformed (e.g. a stray `///` prefix — comments use `#`). |
| App writes to the wrong DB | A `DATABASE_URL` in `.env.local` is overriding `.env`. Remove it. |
| 500 on Confirm | Stale session pointing at a user from an old DB. **Log out and back in.** |
| Detection alert but nothing saved | `FRONTEND_API_URL` wrong / backend not restarted. Look for `Persisted incident …` in the uvicorn log. |
| Video/image 404 locally after adding files | Turbopack only serves `public/` files present at startup. **Restart `npm run dev`.** |
| Media broken on Vercel | The file isn't in the build. Use **Cloudinary** (§6). |
| WS connects then instantly drops | Stale build with `NEXT_PUBLIC_BACKEND_WS_URL=""`. Fix the var and **redeploy**. |
| `No module named torch` | `pip install torch torchvision` (§2). |

See [DEPLOY.md](DEPLOY.md) for additional deployment notes.
