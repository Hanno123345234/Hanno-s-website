# Hanno Website (Music Studio)

## Lokal starten
1. Abhängigkeiten installieren:
   - `npm install`
2. User erstellen:
   - normal: `npm run create-user -- hanno DeinPasswort`
   - admin: `npm run create-user -- admin DeinPasswort admin`
3. Server starten:
   - `npm start`
4. Website öffnen:
   - `http://localhost:3000`

Wichtig: Nicht `index.html` doppelklicken, sonst funktioniert Login/Upload nicht (NetworkError).

## Demo-Musik (für Tests)
- `npm run seed-demo`

## Online stellen (kurz)
Wenn du Login/Uploads online nutzen willst, brauchst du **Node.js Hosting** (z.B. eigener VPS/Server oder ein Anbieter, der Node-Apps unterstützt).

Für Produktion: setze `SESSION_SECRET` als Environment Variable.

## GitHub (Update hochladen)
Wenn du Änderungen online bringen willst:
1. Änderungen committen:
   - `git add -A`
   - `git commit -m "Update Music Studio"`
2. Push:
   - `git push`

## Render Deployment (Website updaten)
Am einfachsten über GitHub Deploy:
1. Repo auf GitHub pushen (siehe oben)
2. Auf Render:
   - **New +** → **Web Service**
   - Repo auswählen
   - Build Command: `npm ci`
   - Start Command: `npm start`
   - Environment Variables setzen:
     - `SESSION_SECRET` (irgendein langer zufälliger String)
     - optional `NODE_ENV=production`

Hinweis (wichtig):
- `uploads/` ist auf Render ohne **Persistent Disk** nicht dauerhaft. Nach einem Redeploy können Uploads weg sein.
- Gleiches gilt für `data/*.json` wenn du es nicht persistierst.
- Für wirklich „dauerhaft“ brauchst du Persistent Storage (oder externen Storage wie S3).
