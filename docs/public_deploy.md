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

### Socket.IO (für Online-Quiz von GitHub Pages)

Wenn du das Frontend auf **GitHub Pages** hostest, aber der Online-Modus (Lobby/Ready) trotzdem funktionieren soll,
läuft Socket.IO auf Render und die Webseite verbindet sich cross-origin.

- Client: setze in `public/config.js` die Render-URL (siehe Abschnitt GitHub Pages)
- Server: CORS ist standardmäßig offen genug (Origin wird reflektiert). Optional kannst du einschränken:

`SOCKET_IO_CORS_ORIGIN` (optional)
- leer lassen → Origin wird reflektiert (praktisch für Schule/Tests)
- `*` → alle Origins
- oder Komma-Liste, z.B. `https://<user>.github.io,https://<user>.github.io/<repo>`

### Wichtige ENV Variablen (optional)

- `ADMIN_OWNER_KEY` (empfohlen setzen)
- `ADMIN_ACCESS_CODES` (optional)

Wenn `ADMIN_OWNER_KEY` nicht gesetzt ist, nutzt der Server den internen Fallback.

## 2) GitHub Pages (statisches Frontend)

Workflow ist vorhanden:

- `.github/workflows/web-pages.yml`

Der Workflow deployed bei Push auf `main` oder `flutter-web` automatisch den Inhalt von `public/` auf GitHub Pages.

### Online-Modus auf Pages aktivieren (empfohlen)

Setze in `public/config.js` einmalig deine Render-URL:

```js
window.QUIZ_ONLINE_ORIGIN = "https://DEIN-SERVICE.onrender.com";
```

Danach lädt `quiz.html` Socket.IO von Render und verbindet sich dorthin.

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
