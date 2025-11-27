# Step 2 – Frontend on Vercel

This guide assumes the Supabase database and local `.env` are already configured.

## 1. Push the repository to GitHub

```bash
git add .
git commit -m "Prepare deployment"
git push origin main
```

> Vercel pulls directly from GitHub. Make sure `.env` files remain excluded via `.gitignore`.

## 2. Create the Vercel project

1. Sign in at https://vercel.com/ (GitHub login recommended).
2. Click **Add New → Project**.
3. Import the `Farm2Home` repository.
4. Keep the default framework (Vercel auto-detects Next.js).

## 3. Configure build settings

| Setting          | Value                |
| ---------------- | -------------------- |
| Root Directory   | `frontend`           |
| Install Command  | `npm install`        |
| Build Command    | `npm run build`      |
| Output Directory | `.next` (default)    |

> When prompted, disable the “Monorepo detection” toggle only if Vercel selects the wrong folder.

## 4. Enter environment variables

Copy everything from your local `frontend/.env`. Minimum required values:

### URLs
- `NEXTAUTH_URL=https://<your-vercel-domain>`
- `NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>`
- `NEXTAUTH_SECRET=<32+ char random string>`

### Database (Supabase)
- `DATABASE_URL`
- `DIRECT_URL`
- `SHADOW_DATABASE_URL`

### Payments & Emails
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RESEND_API_KEY`

### Location / Maps
- `NOMINATIM_BASE_URL`
- `OPENCAGE_KEY`
- `OPENCAGE_API_KEY`
- `NEXT_PUBLIC_MAP_TILES_URL`

### ML & Chatbot
- `ML_SERVICE_URL` (Render ML URL – update after backend goes live)
- `NEXT_PUBLIC_ML_SERVICE_URL` (same as above)
- `CHATBOT_API_URL` (Render chatbot URL, optional)

Add any other secrets you use locally (Upstash, analytics, etc.).

## 5. Deploy

1. Click **Deploy** in Vercel.
2. Wait for the build log to finish (≈5–6 minutes).
3. Verify the production domain loads and you can sign in/out.

## 6. Enable automatic redeploys

By default, pushing to `main` triggers a new Vercel build. Confirm this in **Project Settings → Git → Production Branch**.

**Next:** [Deploy the ML service on Render](./03-render-ml.md)

