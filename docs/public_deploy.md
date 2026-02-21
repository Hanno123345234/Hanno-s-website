# Public deploy (so everyone can open it)

Your current `run_web.ps1` is a *local* web server (works only on your Wi‑Fi).
To make it available for everyone on the internet, you must upload the static web build to a host.

## Fastest (recommended): Netlify (Drag & Drop)

1) Build a release web bundle (HTML renderer + no PWA cache):

```powershell
cd C:\Users\HANNO\OneDrive\App\habit_challenge
.\tool\build_web_release.ps1 -Renderer html -NoPwa
```

2) Package it as a zip:

```powershell
.\tool\package_web.ps1 -OutFile web_build.zip
```

3) Go to https://app.netlify.com/drop

4) Drag & drop `web_build.zip` (or the folder `build/web`) into the page.

5) Netlify gives you a public URL like `https://something.netlify.app`.

## GitHub Pages (via GitHub Actions)

If your code is on GitHub already, you can host the static Flutter Web build on GitHub Pages.

1) Ensure the workflow file exists:

- `.github/workflows/web-pages.yml`

2) In your GitHub repo settings:

- **Settings → Pages → Build and deployment → Source: GitHub Actions**

3) Push to `main`.

The workflow builds the site and publishes it to Pages. It automatically sets `--base-href` to `/<repo-name>/`, which is required for GitHub Pages project sites.

Notes:
- Hash routing (`/#/...`) works on Pages without any rewrite rules.
- If you rename the repo, just re-run the workflow (base-href updates automatically).

Local build (same base-href as Pages):

```powershell
cd C:\Users\HANNO\OneDrive\App\habit_challenge
.\tool\build_github_pages.ps1 -RepoName <your-repo-name> -Renderer html -NoPwa
```

## Render (Static Site)

Render works best for this project as a **Static Site** (not a Node web service).

This repo includes:

- `render.yaml`
- `tool/render_build.sh`

Steps (dashboard):

1) Render → **New → Static Site**
2) Connect GitHub repo and select branch `flutter-web`
3) Build Command: `bash tool/render_build.sh`
4) Publish Directory: `build/web`

If you already created a Node “Web Service” for this repo, create a new Static Site instead (or change the service type in settings if available).

## Alternative: Firebase Hosting

Firebase is great if you want a stable domain + CI later, but it’s more setup.
See: https://firebase.google.com/docs/hosting

## Notes

- If you later want a custom domain (yourname.com), Netlify/Firebase can both do it.
- If you want the app to sync data across phones, hosting alone is not enough — you’ll need a backend (e.g. Firebase/Firestore).
