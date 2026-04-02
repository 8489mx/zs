# Production startup check guide

Run this check immediately before the production boot window.

## Command
- `npm run verify:production:startup`

Optional custom env file:
- `node scripts/production-startup-check.js --env-file .env.production`

## What it validates
- Production-only runtime flags
- HTTPS-only `ALLOWED_ORIGINS`
- Strong non-placeholder `SESSION_SECRET`
- Safe cookie and same-origin write settings
- Dangerous recovery flags remain disabled

## Generated outputs
- `production-startup-check-report.json`
- `docs/production-startup-check-report.md`

Treat any non-zero exit code as a launch blocker.
