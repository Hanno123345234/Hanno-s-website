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

### Clip Upload (Render + GitHub Workflow)

Der Clip-Upload laeuft serverseitig auf Render und ist fuer oeffentliche Share-Links gedacht.

Neu konfiguriert:

- `CLIPS_STORAGE_DIR=/var/data/clips`
- `CLIPS_RETENTION_DAYS=10`
- `CLIPS_MAX_SIZE_MB=200`
- `CLIPS_PUBLIC_LOCKDOWN=true`

Wichtig:

- In `render.yaml` ist eine Persistent Disk unter `/var/data` eingetragen.
- Dadurch bleiben hochgeladene Videos und Index-Daten auch nach Redeploys erhalten.
- Alte Clips werden automatisch geloescht (Auto-Delete nach 10 Tagen).
- Bei aktiviertem Lockdown sind nur Clip-Seiten und Clip-APIs erreichbar.

Clip-Endpunkte:

- Upload: `POST /api/clips/upload`
- Galerie (neueste Clips): `GET /api/clips/latest?limit=12`
- Share-Link: `GET /clip/:id`

Modmail-Endpunkte:

- Public submit: `POST /api/modmail/create`
- Admin inbox: `GET /api/admin/modmail`
- Admin update: `POST /api/admin/modmail`

### KI aktivieren (Render) - GitHub kostenlos (empfohlen)

Der Server unterstuetzt zwei Provider: `github` (Standard) und `openai`.

Fuer die kostenlose GitHub-Variante:

- `AI_PROVIDER=github`
- `GITHUB_TOKEN=<dein GitHub Token mit Models-Zugriff>`
- `GITHUB_MODEL=microsoft/Phi-3.5-mini-instruct` (kostenfreundlicher Standard)
- `GITHUB_MODELS_ENDPOINT=https://models.inference.ai.azure.com/chat/completions`

Optional weiter nutzbar:

- `OPENAI_API_KEY` (nur noetig, wenn `AI_PROVIDER=openai`)
- `QUIZ_AI_MODEL` (OpenAI-Modellname)
- `SOCKET_IO_CORS_ORIGIN` (optional, z. B. deine GitHub Pages URL)

In Render:

1. Service oeffnen
2. **Environment**
3. Variablen eintragen
4. **Save Changes** -> Render startet automatisch einen neuen Deploy

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

## 4) GitHub -> Render + Pages (konkret)

1. Lokale Aenderungen committen und auf `main` pushen.
2. Render deployed automatisch den Node-Service (Backend + KI-API + Socket.IO).
3. GitHub Actions deployed automatisch `public/` nach GitHub Pages.
4. Frontend nutzt `public/config.js` und verbindet sich mit deiner Render-URL.

Schnelltest danach:

1. `https://<dein-user>.github.io/<repo>/quiz.html` oeffnen
2. Frage starten
3. `KI-Tipp` klicken
4. Wenn kein Key gesetzt ist, siehst du eine klare Fehlermeldung; mit Key kommt die KI-Antwort
