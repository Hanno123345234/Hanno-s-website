# Deploy auf Render + GitHub

Diese Repo kann gleichzeitig auf **Render** (Node Backend + API) und **GitHub Pages** (statisches Frontend aus `public/`) laufen.

## 1) Render (Backend + vollständige App)

In diesem Repo ist Render bereits vorbereitet:

- `render.yaml`
- `package.json` mit `npm start` → `node server.js`

### Render Setup

1. Render → **New Web Service**
2. GitHub Repo verbinden
3. Branch: `main`
4. Build Command: `npm install`
5. Start Command: `npm start`

Danach deployed Render automatisch bei jedem Push auf `main`.

### Wichtige ENV Variablen (optional)

- `ADMIN_OWNER_KEY` (empfohlen setzen)
- `ADMIN_ACCESS_CODES` (optional)

Wenn `ADMIN_OWNER_KEY` nicht gesetzt ist, nutzt der Server den internen Fallback.

## 2) GitHub Pages (statisches Frontend)

Workflow ist vorhanden:

- `.github/workflows/web-pages.yml`

Der Workflow deployed bei Push auf `main` oder `flutter-web` automatisch den Inhalt von `public/` auf GitHub Pages.

### Einmalig in GitHub aktivieren

1. Repo → **Settings** → **Pages**
2. Source: **GitHub Actions**

Danach reicht ein Push auf `main`.

## 3) Typischer Ablauf

1. Lokal Änderungen machen
2. Commit + Push auf `main`
3. GitHub Actions deployed Pages
4. Render deployed den Web Service

So sind beide Ziele immer gleichzeitig aktuell.
