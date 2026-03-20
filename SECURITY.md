# Security Baseline

## Production Defaults

This project is hardened for Render + GitHub with:

- `helmet` security headers
- Global API rate limiting (`express-rate-limit`)
- Strict clip ownership model (owner-only listing, access, and delete)
- Signed owner cookies for clip session isolation
- Mutation abuse protection (origin/referer checks + endpoint limits)
- Private-by-default Discord command API reads

## Required Environment Variables (Render)

Set these values in Render Environment:

- `NODE_ENV=production`
- `ADMIN_OWNER_KEY=<strong-secret>`
- `ADMIN_EDITOR_KEY=<strong-secret>`
- `CLIPS_OWNER_SECRET=<long-random-secret>`
- `DISCORD_COMMANDS_ALLOW_PUBLIC_READ=false`
- `CLIPS_PUBLIC_LOCKDOWN=true`

Recommended:

- `SOCKET_IO_CORS_ORIGIN=<comma-separated allowed origins>`
- `GLOBAL_API_RATE_LIMIT_MAX=240`

## Secret Rotation

Rotate these regularly:

- `ADMIN_OWNER_KEY`
- `ADMIN_EDITOR_KEY`
- `CLIPS_OWNER_SECRET`
- `DISCORD_COMMANDS_GITHUB_TOKEN`
- `GITHUB_TOKEN`

After rotation, trigger a fresh deploy on Render.

## GitHub Security Automation

Workflow: `.github/workflows/security-checks.yml`

- CodeQL scan on push/PR and weekly schedule
- npm audit (high severity and above)

## Reporting

If you find a security issue, open a private report and avoid posting exploit details in public issues.
