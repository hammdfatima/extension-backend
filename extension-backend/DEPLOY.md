# Deploy backend to Render

## 1. Push this repo to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/text-extension.git
git push -u origin main
```

## 2. Create Render Web Service

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Root Directory:** `extension-backend`
   - **Runtime:** Bun
   - **Build Command:** `bun install && bunx prisma generate && bunx prisma migrate deploy`
   - **Start Command:** `bun run src/index.ts`
   - **Health Check Path:** `/health`

## 3. Environment variables (Render dashboard)

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Your Neon connection string |
| `OPENAI_API_KEY` | Your OpenAI key |
| `BETTER_AUTH_SECRET` | Long random string (32+ chars) |
| `BETTER_AUTH_URL` | `https://YOUR-SERVICE.onrender.com` |
| `UPLOAD_DIR` | `./uploads` |

Render sets `PORT` automatically — no need to set `PORT_NO`.

## 4. After deploy

Copy your Render URL (e.g. `https://text-extension-api.onrender.com`) and update:

- `extension/config.js` → `API_BASE_URL`
- `extension/manifest.json` → `host_permissions`

Then reload the Chrome extension.
