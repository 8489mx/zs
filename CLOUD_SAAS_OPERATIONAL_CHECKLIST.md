# CLOUD_SAAS Operational Checklist

Date: 2026-04-19

## Pre-deploy

- [ ] `.env.saas` created from `.env.saas.example`.
- [ ] `APP_MODE=CLOUD_SAAS` confirmed.
- [ ] Hosted DB credentials configured (`DATABASE_HOST`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`).
- [ ] TLS flags verified (`DATABASE_SSL=true`, `DATABASE_SSL_REJECT_UNAUTHORIZED=true`).
- [ ] `SESSION_CSRF_SECRET` replaced with a strong secret.

## Automated checks

- [ ] `npm run audit:cloud-readiness`
- [ ] `npm run audit:migration-parity`
- [ ] `npm run audit:data-access-seams`
- [ ] `npm --prefix backend run typecheck`
- [ ] `npm --prefix backend run test:critical`

## Deploy

- [ ] `npm run compose:saas:config`
- [ ] `npm run compose:saas:up`
- [ ] `/health`, `/health/live`, `/health/ready` are green through gateway.

## Post-deploy

- [ ] Confirm login, critical read/write flows, and reports endpoints.
- [ ] Confirm migration table state and app startup logs.
- [ ] Confirm alerting/log shipping is active.

## Rollback readiness

- [ ] Previous release image/tag available.
- [ ] DB backup/snapshot available before migration window.
- [ ] `compose:saas:down` + previous release redeploy path tested in staging.
