# Habit Challenge (MVP)

MVP for daily habit/workout challenges with friends.

## What’s included
- Create → Join → Confirm → Compare → Repeat loop
- Streaks + “streak at risk” state
- Optional proof on check-in (timer/photo)
- Invite code + share/copy
- Local persistence (offline-first) via SharedPreferences
- Reminder plumbing (local notifications; push/FCM is a later step)

## Important MVP limitation
This build is local-only (single device). Invite codes work for UI/testing, but real friend sync across phones needs Firebase (see docs).

## Prereqs
- Flutter SDK installed
- For Android: Android Studio + Android SDK (or at least platform-tools)

## First run (after Flutter install)
From this folder:

```powershell
# Creates platform folders if they don’t exist yet
.\tool\bootstrap.ps1

flutter pub get
flutter run
```

## Handy jetzt sofort testen (ohne Android Studio)
Du kannst die App sofort auf dem Handy im Browser testen (Web-Preview), solange PC und Handy im gleichen WLAN sind:

```powershell
cd C:\Users\HANNO\OneDrive\App\habit_challenge
.\tool\install_flutter.ps1
.\tool\run_web.ps1 -Mode server -Port 8080 -OpenFirewall
```

Dann die angezeigte URL (z.B. `http://<PC-IP>:8080`) am Handy öffnen.

## Android (native) auf Handy starten
Für "richtig" auf Android installieren/ausführen brauchst du das Android SDK (Android Studio).

1) Android Studio installieren und beim ersten Start SDK + Platform-Tools installieren
2) Lizenzen akzeptieren:

```powershell
..\tools\flutter\bin\flutter.bat doctor --android-licenses
```

3) Handy: Entwickleroptionen + USB-Debugging aktivieren, per USB verbinden
4) Gerät prüfen + App starten:

```powershell
.\tool\run_android.ps1 -ListDevices
.\tool\run_android.ps1
```

APK bauen (zum Installieren / Teilen):

```powershell
.\tool\build_android_apk.ps1 -BuildMode release
```

## iPhone preview / iOS
See docs/ios_on_iphone.md

Quick start (web preview):
```powershell
cd C:\Users\HANNO\OneDrive\App\habit_challenge
.\tool\install_flutter.ps1
.\tool\run_web.ps1
```

## Firebase (later)
This MVP uses a local store. To go production:
- Replace `LocalStore` with Firestore + Cloud Functions
- Use Firebase Auth (Apple/Google)
- Use FCM/APNs for “friends already checked in” nudges

## Public link (so everyone can access)
The local web preview (`.\\tool\\run_web.ps1`) works only on your Wi‑Fi.
To get a public URL anyone can open, deploy the static web build to a host.

Quick start (Netlify drag & drop):

```powershell
cd C:\\Users\\HANNO\\OneDrive\\App\\habit_challenge
.\\tool\\build_web_release.ps1 -Renderer html -NoPwa
.\\tool\\package_web.ps1 -OutFile web_build.zip
```

Then upload `web_build.zip` at https://app.netlify.com/drop

More details: `docs/public_deploy.md`

GitHub Pages (CI deploy):

- Add/keep `.github/workflows/web-pages.yml`
- In GitHub: Settings → Pages → Source: GitHub Actions
- Push to `main`

Docs:
- docs/app_flow.md
- docs/firebase_plan.md

Firestore entities suggestion:
- `users/{uid}`
- `challenges/{challengeId}`
- `challenges/{challengeId}/members/{uid}`
- `challenges/{challengeId}/checkins/{uid_YYYYMMDD}`

## Deploy (Render + GitHub)

Für dieses Repo ist Deploy auf beide Plattformen vorbereitet:

- **Render**: Node Web Service über `render.yaml` (`npm install` + `npm start`)
- **GitHub Pages**: statisches Frontend aus `public/` via `.github/workflows/web-pages.yml`

Setup und Schritte stehen in:

- `docs/public_deploy.md`
