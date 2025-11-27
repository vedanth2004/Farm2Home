# Step 3 – ML Service on Render

This guide covers deploying `backend/ml_service/app.py` as a standalone FastAPI service.

## 1. Prepare the repo & requirements

1. Ensure `backend/ml_service/requirements.txt` is up to date locally:
   ```bash
   cd backend/ml_service
   pip install -r requirements.txt
   ```
2. Commit any dependency changes before proceeding so Render can install them from Git.

## 2. Create the Render web service

1. Sign in at https://dashboard.render.com/
2. Click **New → Web Service**.
3. Connect your GitHub account and select the `Farm2Home` repo.
4. In the “Root Directory” field, enter `backend/ml_service`.
5. Fill in the build/start commands:
   - **Build**: `pip install -r backend/ml_service/requirements.txt`
   - **Start**: `cd backend/ml_service && uvicorn app:app --host 0.0.0.0 --port $PORT`

## 3. Attach persistent storage

1. In the “Advanced” section, add a disk:
   - Name: `ml-data`
   - Size: 1–2 GB (depends on how many SQLite files you expect).
   - Mount path: `/var/data/ml`
2. Set the env variable `ML_STORAGE_DIR=/var/data/ml` (Render automatically mounts before app start).

## 4. Configure environment variables

From `backend/ml_service/env.example`:

| Key             | Value / Notes                                  |
|-----------------|------------------------------------------------|
| `HOST`          | `0.0.0.0`                                      |
| `ALLOWED_ORIGINS` | `https://<your-vercel-domain>` (comma-separated list allowed) |
| `ML_STORAGE_DIR` | `/var/data/ml` (matches the disk mount)       |
| `NEXTJS_API_URL` | `https://<your-vercel-domain>`                |
| `GEMINI_API_KEY` | Only required if this service triggers Gemini directly |

Render injects `PORT` automatically—no need to set it manually.

## 5. Deploy & verify

1. Click **Create Web Service**.
2. Watch the logs. First build may take a few minutes while dependencies install.
3. Once live, note the public URL (e.g., `https://farm2home-ml.onrender.com`).
4. Test the health:
   ```bash
   curl https://farm2home-ml.onrender.com/health
   ```
5. Update Vercel env vars `ML_SERVICE_URL` and `NEXT_PUBLIC_ML_SERVICE_URL` with this URL and redeploy the frontend.

## 6. Lock down CORS & HTTP

If you later add custom domains or staging environments, extend `ALLOWED_ORIGINS` with additional comma-separated URLs. The FastAPI app already blocks credentials for wildcard origins.

**Next:** If you need the chatbot API, continue to [Step 4](./04-render-chatbot.md). Otherwise, skip to the verification checklist in `docs/deployment/README.md`.

