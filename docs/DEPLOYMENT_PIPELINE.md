# Z Systems Deployment Pipeline

This document defines the production deployment direction for Z Systems.

## Source of truth

Production must use one code source only:

```text
GitHub branch: main
```

Do not deploy production from older working branches such as `sale-readiness-work` or `public-trial-signup`.

## Backend deployment

The Hostinger Node.js application for `api.karimzakaria.com` must be connected to GitHub branch `main`.

Current problem to fix in Hostinger UI:

```text
Backend is connected to sale-readiness-work.
```

Required change:

```text
Hostinger Website/App settings -> Git deployment -> branch = main
```

After backend deployment, run the backend production steps according to Hostinger setup:

```bash
cd backend
npm install
npm run build
npm run migration:run:normal
```

Then restart the backend runtime.

## Frontend deployment

The frontend for `app.karimzakaria.com` must no longer be uploaded manually through Hostinger File Manager.

Required direction:

```text
GitHub main -> build frontend -> upload frontend/dist to app.karimzakaria.com public_html
```

Manual upload is allowed only as an emergency fallback, and only the contents of `frontend/dist` should be uploaded.

## GitHub Actions configuration

Create the required FTP deployment secrets under:

```text
GitHub repo -> Settings -> Secrets and variables -> Actions
```

Required secret names:

```text
HOSTINGER_FTP_SERVER
HOSTINGER_FTP_USERNAME
HOSTINGER_FTP_PORT
HOSTINGER_FTP_DIR
HOSTINGER_FTP_PASSWORD
```

Never commit real production credentials to GitHub.

## Frontend production build env

The production frontend build must use:

```env
VITE_API_BASE_URL=https://api.karimzakaria.com
VITE_PLATFORM_TENANT_ID=karimzakaria-demo
```

## Backend production env highlights

The backend SaaS production environment must include:

```env
NODE_ENV=production
APP_MODE=CLOUD_SAAS
PLATFORM_TENANT_ID=karimzakaria-demo
APP_LOGIN_URL=https://app.karimzakaria.com/login
MAIL_DELIVERY_MODE=smtp
PUBLIC_TRIAL_DEBUG_CREDENTIALS=false
```

Email delivery must use the configured Hostinger mailbox SMTP settings. Never commit real `.env` files or real SMTP credentials.

## Health checks after deployment

After every production deploy, verify:

```text
https://api.karimzakaria.com/api/health
https://app.karimzakaria.com/login
https://app.karimzakaria.com/trial
```

Manual checks:

1. Log in as the platform admin.
2. Open `/saas-admin/tenants`.
3. Create a trial tenant from the SaaS admin page.
4. Create a trial tenant from `/trial`.
5. Confirm the trial email arrives.
6. Confirm the trial owner can log in and must change password.
7. Confirm trial owners cannot open `/saas-admin/tenants`.

## Emergency fallback

If GitHub Actions deployment is unavailable:

1. Build locally from `main`.
2. Run `npm run build` inside `frontend`.
3. Upload only the contents of `frontend/dist` to the Hostinger `public_html` directory for `app.karimzakaria.com`.
4. Do not upload source files manually as the normal deployment process.
