# Deployment Navigation

Use this index to move through the entire release flow. Each step links to a focused guide.

1. [Supabase database setup](./01-supabase.md)
2. [Local workspace prep & `.env` files](./01-supabase.md#5-sync-env-files-locally)
3. [Vercel frontend deployment](./02-vercel.md)
4. [Render ML service deployment](./03-render-ml.md)
5. [Render chatbot service (optional)](./04-render-chatbot.md)
6. [Verification & rollout checklist](#final-checklist)

> Tip: keep this file open in a second tab while you follow the linked guides.

## Final checklist

- [ ] Supabase project created, migrations applied, seed data inserted.
- [ ] Local `.env` mirrors `frontend/env.example` and `.gitignore` keeps secrets out of Git.
- [ ] Vercel project connected to the GitHub repo, `npm run build` succeeds.
- [ ] Render ML service online with persistent disk and `ALLOWED_ORIGINS` pointing to Vercel.
- [ ] Optional chatbot Render service online (skip if you only need the ML API).
- [ ] Frontend `.env` values updated with the live Render URLs and redeployed.
- [ ] Smoke tests run on production URLs (auth, ML predictions, payments sandbox).

