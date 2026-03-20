# Deploy on Render + GitHub

This repository can run on both **Render** (Node backend + API) and **GitHub Pages** (static frontend from `public/`).

## 1) Render (Backend + full app)

Render is already configured in this repository:

- `render.yaml`
- `package.json` with `npm start` -> `node server.js`

### Render setup

1. Render -> **New Web Service**
2. Connect the GitHub repository
3. Branch: `main`
4. Build command: `npm install`
5. Start command: `npm start`

Render will auto-deploy on every push to `main`.

### Socket.IO (for online quiz from GitHub Pages)

If the frontend is hosted on **GitHub Pages** and online mode should still work,
Socket.IO runs on Render and the website connects cross-origin.

- Client: set the Render URL in `public/config.js` (see GitHub Pages section)
- Server: CORS can be restricted with `SOCKET_IO_CORS_ORIGIN`

`SOCKET_IO_CORS_ORIGIN` examples:
- Empty: reflect request origin
- `*`: allow all origins
- Comma-separated allowlist, for example: `https://<user>.github.io,https://<user>.github.io/<repo>`

### Important environment variables

- `ADMIN_OWNER_KEY` (recommended)
- `ADMIN_ACCESS_CODES` (optional)
- `CLIPS_OWNER_SECRET` (strongly recommended, long random secret)
- `GLOBAL_API_RATE_LIMIT_MAX` (for example `240`)
- `DISCORD_COMMANDS_ALLOW_PUBLIC_READ=false` (secure default)

### Clip upload (Render + GitHub workflow)

Clip upload runs on Render and is hardened with owner-based private sessions.

Configured values:

- `CLIPS_STORAGE_DIR=/var/data/clips`
- `CLIPS_RETENTION_DAYS=10`
- `CLIPS_MAX_SIZE_MB=200`
- `CLIPS_PUBLIC_LOCKDOWN=true`

Important notes:

- `render.yaml` includes a persistent disk mounted at `/var/data`.
- Uploaded videos and clip index data survive redeploys.
- Clips are auto-deleted by retention policy (10 days by default).
- With lockdown enabled, only clip pages and clip APIs are accessible.
- Only owner clips are visible (signed owner cookie scope).
- Users can delete their own clips via `/api/clips/delete`.
- Upload/delete mutations are protected by rate limits and origin/referer checks.

Clip endpoints:

- Upload: `POST /api/clips/upload`
- Gallery: `GET /api/clips/latest?limit=12`
- Self-delete: `POST /api/clips/delete`
- Share page: `GET /clip/:id`

### AI provider setup (Render)

The server supports two providers: `github` (default) and `openai`.

Recommended GitHub setup:

- `AI_PROVIDER=github`
- `GITHUB_TOKEN=<token with GitHub Models access>`
- `GITHUB_MODEL=microsoft/Phi-3.5-mini-instruct`
- `GITHUB_MODELS_ENDPOINT=https://models.inference.ai.azure.com/chat/completions`

Optional variables:

- `OPENAI_API_KEY` (required only when `AI_PROVIDER=openai`)
- `QUIZ_AI_MODEL` (OpenAI model name)
- `SOCKET_IO_CORS_ORIGIN` (optional allowlist)

In Render:

1. Open your service
2. Open **Environment**
3. Add/update variables
4. Click **Save Changes** to trigger a deploy

## 2) GitHub Pages (static frontend)

Workflow file:

- `.github/workflows/web-pages.yml`

On push to `main` or `flutter-web`, the workflow deploys `public/` to GitHub Pages.

### Enable online mode on Pages

Set your Render origin in `public/config.js`:

```js
window.QUIZ_ONLINE_ORIGIN = "https://YOUR-SERVICE.onrender.com";
```

Then `quiz.html` loads Socket.IO from Render and connects there.

### One-time GitHub setup

1. Repository -> **Settings** -> **Pages**
2. Source: **GitHub Actions**

After this, pushing to `main` is enough.

## 3) Typical release flow

1. Make local changes
2. Commit and push to `main`
3. GitHub Actions deploys Pages
4. Render deploys backend service

## 4) GitHub security automation

Workflow:

- `.github/workflows/security-checks.yml`

It runs:

- CodeQL (JavaScript)
- `npm audit --omit=dev --audit-level=high`

This gives early warnings for code and dependency security issues on push/PR.

## 5) Quick post-deploy test

1. Open `https://<your-user>.github.io/<repo>/quiz.html`
2. Start a question
3. Click AI help
4. Without keys you should get a clear config error; with valid keys the AI response should work
