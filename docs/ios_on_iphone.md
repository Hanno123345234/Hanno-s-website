# iOS auf deinem iPhone testen (zwei Wege)

## Weg A (sofort, ohne Mac): iPhone öffnet die App als Web-Version
Damit kannst du **das UI sofort** auf dem iPhone sehen. (Nicht App Store, aber perfekt fürs Preview.)

1) Stelle sicher, dass dein iPhone und dein PC im **gleichen WLAN** sind.
2) Starte die Web-Version am PC:

```powershell
cd C:\Users\HANNO\OneDrive\App\habit_challenge
\# falls Flutter noch nicht installiert ist (oder nicht in PATH):
.\tool\install_flutter.ps1
.\tool\run_web.ps1 -Mode server

\# wenn das iPhone "Verbindung abgelehnt" sagt (Windows Firewall):
\# PowerShell als Administrator öffnen und dann:
\# .\tool\run_web.ps1 -Mode server -OpenFirewall
```

Wenn du es nur am PC sehen willst, reicht:
```powershell
.\tool\run_web.ps1 -Mode chrome
```

3) Öffne **NICHT** `http://127.0.0.1:8080` am iPhone.

`127.0.0.1` bedeutet **"dieses Gerät"**. Auf dem iPhone zeigt das also auf das iPhone selbst.

Öffne am iPhone die **LAN-IP deines PCs**, die `run_web.ps1` im Terminal ausgibt (oder via `ipconfig`), z.B.:
- `http://192.168.0.23:8080`

Wenn Safari sagt *"Verbindung abgelehnt"* oder *"Seite nicht erreichbar"*:
- PC & iPhone müssen im **gleichen WLAN** sein
- Manche Router haben **Client Isolation / AP-Isolation** aktiviert → dann geht es nicht
- Windows Firewall blockiert oft Port 8080 → `run_web.ps1` versucht eine Regel zu setzen (ggf. PowerShell als Admin starten)

Optional: Safari → Share → "Add to Home Screen" (wie eine App).

Einschränkungen:
- Push/Notifications sind im Web anders
- Kamera/Foto (Proof) kann je nach iOS/Safari Einstellungen eingeschränkt sein

---

## Weg B (echte iOS-App auf iPhone installieren): braucht macOS/Xcode oder Cloud-Mac
Eine **echte iOS-App** (auf dem Homescreen, TestFlight, App Store) brauchst du zum Bauen/Signieren:
- macOS + Xcode **oder** einen Cloud-Build (z.B. Codemagic)
- Apple Developer Account (für TestFlight/App Store)

Schnellster ohne eigenen Mac: **Codemagic**
- Siehe `codemagic.yaml` im Projekt
- Du bekommst am Ende ein `.ipa` (TestFlight) oder einen Build für direktes Installieren (Device/Ad Hoc)

Was du dafür brauchst:
- Apple Developer Program Mitgliedschaft
- App Store Connect Zugriff
- Signing: Zertifikate/Profiles (Codemagic kann das verwalten)
