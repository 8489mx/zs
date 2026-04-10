# Phase 11 — Pre-Sale Hardening

## What changed
- Fixed broken backend infra tests after the auth/module refactor.
- Expanded `test:infra` to include DTO validation coverage for sales, purchases, and reports.
- Hardened bootstrap admin behavior:
  - disabled by default in production
  - removed hard-coded secondary admin bootstrap user
  - forced password rotation for bootstrap admin
- Hardened session security:
  - configurable secure cookies
  - configurable same-site policy
  - configurable login lockout policy
  - failed-login counter now increments correctly and locks the account temporarily
- Sanitized `.env.example` so it no longer contains real database credentials.
- Cleaned the frontend lint baseline to zero errors.

## New environment variables
- `ENABLE_BOOTSTRAP_ADMIN`
- `SESSION_COOKIE_SECURE`
- `SESSION_COOKIE_SAME_SITE`
- `LOGIN_MAX_ATTEMPTS`
- `LOGIN_LOCKOUT_MINUTES`

## Recommended production values
```env
NODE_ENV=production
ENABLE_BOOTSTRAP_ADMIN=false
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAME_SITE=strict
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15
```
