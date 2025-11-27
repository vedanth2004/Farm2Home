# Step 1 – Supabase & Local Environment

This guide walks you through creating the Postgres database, wiring Prisma, and syncing env files locally.

## 1. Create the Supabase project

1. Sign in at https://app.supabase.com/
2. Click **New project**.
3. Choose the organization, give the project a name (e.g., `farm2home-prod`), and pick the closest region.
4. Set a **strong database password** and keep it handy—you will need it twice below.
5. Wait ~2 minutes for Supabase to provision the database.

## 2. Capture the connection strings

1. In your Supabase project, open **Settings → Database → Connection string**.
2. Copy two variants:
   - **Pooled (pgBouncer) connection** – choose `Node.js`. This string uses the `?pgbouncer=true&connection_limit=1&sslmode=require` suffix. Use it for `DATABASE_URL`.
   - **Non-pooled connection** – switch the dropdown to “Connection pooling disabled”. Use this for `DIRECT_URL` and `SHADOW_DATABASE_URL`. Append `?sslmode=require` if not already present.

Store the values in a temporary note—you will paste them into `.env` files shortly.

## 3. Install dependencies locally (one time)

```bash
cd frontend
npm install
```

## 4. Apply Prisma schema to Supabase

Choose one of the following:

```bash
# preferred for production because it runs migrations
npx prisma migrate deploy

# alternative if you just want to sync the schema once (non-prod)
# npx prisma db push
```

If you need seed data:

```bash
npm run db:seed
```

## 5. Sync env files locally

1. Duplicate `frontend/env.example` → `frontend/.env`.
2. Fill in the Supabase strings:
   - `DATABASE_URL=<pooled string>`
   - `DIRECT_URL=<non-pooled string>`
   - `SHADOW_DATABASE_URL=<non-pooled string>`
3. Add any other secrets you already have (Razorpay, Resend, etc.). Leave the rest blank for now.
4. Duplicate `backend/ml_service/env.example` → `backend/ml_service/.env` and enter placeholders (you will update them again when deploying to Render).

## 6. Verify Prisma/x supabase connectivity

```bash
cd frontend
npx prisma studio   # optional – ensure it connects
npx prisma generate
```

If either command fails, double-check the credentials in `.env`.

**Next:** [Deploy the frontend to Vercel](./02-vercel.md)

