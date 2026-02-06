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

## Domain wie www.hanno.de (kurz erklärt)
Du brauchst Hosting für Node.js (weil Login/Upload ein Backend braucht). Beispiel-Optionen:
- Render.com
- Fly.io
- Railway
- Hetzner VPS (mit Nginx)

Danach:
1. Domain kaufen (z.B. bei IONOS/Strato/Cloudflare Registrar).
2. Im Hosting „Custom Domain“ hinzufügen.
3. DNS setzen:
   - `www` als **CNAME** auf die Ziel-URL vom Host (z.B. `xyz.onrender.com`).
   - optional Root `hanno.de` als A/ALIAS (je nach Provider).
4. HTTPS aktivieren (meist automatisch).

Für Produktion: setze `SESSION_SECRET` als Environment Variable (siehe `.env.example`).
