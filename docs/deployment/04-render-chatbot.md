# Step 4 – Chatbot API on Render (Optional)

Deploy this only if you plan to expose `backend/ml_service/chatbot_api.py` as a separate service.

## 1. Prerequisites

- ML service (Step 3) is already live.
- You have a valid `GEMINI_API_KEY`.
- The repository is up to date on GitHub.

## 2. Create the Render service

1. In Render, click **New → Web Service**.
2. Choose the same repository, but set **Root Directory** to `backend/ml_service`.
3. Build/Start commands:
   - **Build**: `pip install -r backend/ml_service/requirements_chatbot.txt`
   - **Start**: `cd backend/ml_service && uvicorn chatbot_api:app --host 0.0.0.0 --port $PORT`

## 3. Reuse or add a disk

You can either:

- Mount the same `ml-data` disk as the ML service (recommended), or
- Create a new one if you want chatbot conversations logged separately.

Mount path can stay `/var/data/ml`. The chatbot stores its SQLite DB in whatever `ML_STORAGE_DIR` points to.

## 4. Environment variables

| Key             | Value / Notes                                    |
|-----------------|--------------------------------------------------|
| `HOST`          | `0.0.0.0`                                        |
| `ALLOWED_ORIGINS` | `https://<your-vercel-domain>`                  |
| `ML_STORAGE_DIR` | `/var/data/ml`                                  |
| `NEXTJS_API_URL` | Frontend URL (used for notifications/webhooks)  |
| `ML_SERVICE_URL` | URL of the ML Render service (Step 3)           |
| `GEMINI_API_KEY` | Required – paste your Google Gemini key         |

## 5. Deploy & connect to Vercel

1. Click **Create Web Service** and wait for the build to succeed.
2. Copy the public URL (e.g., `https://farm2home-chatbot.onrender.com`).
3. In Vercel, set `CHATBOT_API_URL` to this URL and redeploy the frontend.

## 6. Quick smoke test

```bash
curl -X POST https://farm2home-chatbot.onrender.com/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"message\":\"Hello\"}"
```

You should receive a JSON response with a `response` field. If it errors, check the Render logs for missing env vars or unmet Gemini quotas.

**Done:** return to [the main checklist](./README.md#final-checklist) to wrap up.

