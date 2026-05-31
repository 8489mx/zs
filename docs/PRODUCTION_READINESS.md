# Production Readiness (SaaS + Tenant Lifecycle)

This guide covers safe environment setup and pre-sale checks after tenant isolation and SaaS tenant lifecycle admin were merged.

## Do Not Commit Secrets

- Do not commit real `.env` files.
- Do not commit database credentials, platform admin credentials, or private keys.
- Keep production secrets in secure secret management.

## Required Backend Environment Variables

Use the example files:
- `backend/.env.example`
- `backend/.env.development.example`
- `backend/.env.production.example`

Required variables:
- `NODE_ENV`
- `APP_MODE`
- `PORT`
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_SSL`
- `DATABASE_SSL_REJECT_UNAUTHORIZED`
- `PLATFORM_TENANT_ID`
- `TENANT_ID`
- `ACCOUNT_ID`
- `CORS_ORIGINS`
- `SESSION_COOKIE_NAME`
- `SESSION_COOKIE_DOMAIN`
- `SESSION_COOKIE_SECURE`
- `SESSION_COOKIE_SAME_SITE`

## Required Frontend Environment Variables

Use the example files:
- `frontend/.env.example`
- `frontend/.env.development.example`
- `frontend/.env.production.example`

Required variables:
- `VITE_API_BASE_URL`
- `VITE_PLATFORM_TENANT_ID`

## Local Development Setup Notes

Use local/dev values:
- Backend: `PLATFORM_TENANT_ID=dev-tenant`
- Frontend: `VITE_PLATFORM_TENANT_ID=dev-tenant`

Recommended local targets:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3101`

## Production Setup Notes

Use placeholders in templates, then set real values securely in deployment:
- `PLATFORM_TENANT_ID=<real-platform-tenant-id>`
- `VITE_PLATFORM_TENANT_ID=<real-platform-tenant-id>`

Enable secure cookies in production:
- `SESSION_COOKIE_SECURE=true`
- `SESSION_COOKIE_SAME_SITE=strict`
- `SESSION_COOKIE_DOMAIN=.<your-domain>`

## SaaS Platform Tenant Setup

`PLATFORM_TENANT_ID` (backend) and `VITE_PLATFORM_TENANT_ID` (frontend) must match.

Why this matters:
- Backend uses `PLATFORM_TENANT_ID` to enforce platform-only SaaS admin access.
- Frontend uses `VITE_PLATFORM_TENANT_ID` to show/hide platform-only navigation.
- If they do not match, access behavior becomes inconsistent.

## Build Commands

Backend build:
```bat
cd C:\zn\backend
npm.cmd run build
```

Frontend build:
```bat
cd C:\zn\frontend
npm.cmd run build
```

## Migration Commands

Local development migration:
```bat
cd C:\zn\backend
npm.cmd run migration:run:dev
```

Production migration:
- Run the project migration command in the production backend environment.
- Use production DB credentials from secure secret storage.
- Do not hardcode or commit secrets.
- Always take a database backup before migration.

## Pre-Sale Manual Checklist

1. Login with platform admin.
2. Open `/saas-admin/tenants`.
3. Create a trial tenant.
4. Login as trial owner.
5. Verify trial banner appears.
6. Verify tenant owner cannot open SaaS admin.
7. Create product and sale in trial tenant.
8. Verify platform tenant does not see trial tenant data.
9. Suspend tenant and verify login block.
10. Activate tenant and verify access returns.
11. Expire tenant and verify login block.
12. Verify platform tenant row cannot be lifecycle-modified.

## Emergency Notes

- Keep platform admin credentials outside Git.
- Do not expose generated temporary passwords in logs.
- Backup database before running production migrations.
