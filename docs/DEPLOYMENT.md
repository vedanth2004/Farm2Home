## Deployment Overview

> Looking for a click-by-click checklist? See `docs/deployment/README.md` for the full navigation guide.

The project now supports the following hosting layout:

- **Frontend**: Next.js app deployed on Vercel.
- **Database**: Supabase (Postgres). Prisma talks to the pooled connection for runtime traffic and to the non-pooled connection when running migrations.
- **ML / Chatbot services**: FastAPI apps deployed on Render (one service for `app.py`, another optional one for `chatbot_api.py`).

The new `frontend/env.example` and `backend/ml_service/env.example` files contain the exact variables that must be configured for each target.

---

## 1. Prepare Supabase

1. Create a Supabase project and note the **pooled** and **non-pooled** connection strings.
2. Copy the strings into a local `.env` (based on `frontend/env.example`):
   - `DATABASE_URL` → Supabase pooled connection (`...pgbouncer=true&connection_limit=1&sslmode=require`)
   - `DIRECT_URL` and `SHADOW_DATABASE_URL` → Supabase *non-pooled* connection strings (append `?sslmode=require`).
3. Push the Prisma schema:

   ```bash
   cd frontend
   npm install
   npx prisma migrate deploy   # or prisma db push for initial sync
   ```

4. Seed data if required: `npm run db:seed`.

---

## 2. Frontend on Vercel

| Setting          | Value                         |
| ---------------- | ----------------------------- |
| Install Command  | `npm install`                 |
| Build Command    | `npm run build`               |
| Output Directory | `.next` (default for Next.js) |

### Required Environment Variables

Copy `frontend/env.example` into Vercel and fill the secrets:

- **App URLs**: `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_SECRET`.
- **Database**: `DATABASE_URL`, `DIRECT_URL`, `SHADOW_DATABASE_URL`.
- **Payments**: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
- **Email**: `RESEND_API_KEY`.
- **Location APIs**: `NOMINATIM_BASE_URL`, `OPENCAGE_KEY`/`OPENCAGE_API_KEY`, `NEXT_PUBLIC_MAP_TILES_URL`.
- **ML/Chatbot services**: `ML_SERVICE_URL`, `NEXT_PUBLIC_ML_SERVICE_URL`, `CHATBOT_API_URL` (use the Render URLs once the backend is up).

> Tip: `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` should both point to the Vercel domain (e.g., `https://farm2home.vercel.app`). `NEXT_PUBLIC_ML_SERVICE_URL` must match the Render ML endpoint so client components can fetch metrics directly.

Deploy after the Render services are live (or update the variables later).

---

## 3. ML Service on Render

1. Create a **Web Service** in Render pointing to this repository. Set the root directory to `backend/ml_service`.
2. Configure the build & start commands:

   ```
   Build Command:  pip install -r backend/ml_service/requirements.txt
   Start Command:  cd backend/ml_service && uvicorn app:app --host 0.0.0.0 --port $PORT
   ```

3. Add a persistent disk (e.g., `/var/data/ml`) and set `ML_STORAGE_DIR` to that path so the SQLite databases survive restarts.
4. Environment variables (from `backend/ml_service/env.example`):
   - `PORT` (Render provides this automatically).
   - `HOST=0.0.0.0`.
   - `ALLOWED_ORIGINS=https://your-frontend.vercel.app` (comma-separated for multiple domains).
   - `ML_STORAGE_DIR=/var/data/ml`.
   - `NEXTJS_API_URL=https://your-frontend.vercel.app`.
   - `GEMINI_API_KEY` (only required if you also run `chatbot_api` here).
5. After deployment, copy the Render URL (e.g., `https://farm2home-ml.onrender.com`) and paste it into:
   - Vercel `ML_SERVICE_URL`
   - Vercel `NEXT_PUBLIC_ML_SERVICE_URL`
   - Backend `CHATBOT_API_URL` (if the chatbot calls back into the ML service)

### Optional: Chatbot API

If you plan to expose `chatbot_api.py`, spin up a second Render Web Service:

```
Build Command:  pip install -r backend/ml_service/requirements_chatbot.txt
Start Command:  cd backend/ml_service && uvicorn chatbot_api:app --host 0.0.0.0 --port $PORT
```

Reuse the same environment variables (`ALLOWED_ORIGINS`, `ML_STORAGE_DIR`, `NEXTJS_API_URL`, `GEMINI_API_KEY`). Point Vercel’s `CHATBOT_API_URL` to the resulting Render URL.

---

## 4. Final Checklist

- ✅ Supabase database migrated and reachable.
- ✅ Render ML service running with persistent storage and correct CORS origins.
- ✅ (Optional) Chatbot service deployed with a valid `GEMINI_API_KEY`.
- ✅ Vercel environment variables populated from `frontend/env.example`.
- ✅ `npm run build` succeeds locally before pushing.

Once everything is configured, push the repo to GitHub, connect Vercel and Render to the repository, and trigger deployments. Update any environment variable whenever service URLs change—no code changes are needed thanks to the new configuration files. 

