# Z Systems SaaS Trial Foundation

This document records the first backend/database foundation step for SaaS trials.

The current public deployment domain is temporary. Do not hardcode it in code. When the real system domain is purchased, only environment/config values should need to change.

## What this step adds

- A `tenants` table for trial/active/expired/suspended SaaS tenants.
- A `trial_signups` table for campaign/source tracking.
- `tenant_id` and `account_id` columns on `users`.
- Login-time trial access enforcement:
  - `suspended` tenants cannot log in.
  - `expired` tenants cannot log in.
  - `trial` tenants whose `trial_ends_at` is in the past are marked expired and blocked.
  - Existing users without a formal tenant row keep the current single-tenant/demo behavior.
- A support-only script for creating a trial tenant and owner user.

## Important deployment rule

Do not commit real `.env` files or secrets.

Use examples such as:

- `backend/.env.cloud-saas.example`

Keep real values in private local files, Hostinger environment variables, or a password manager.

## Create a trial tenant manually

Before running the script, make sure `backend/.env` points to the intended database.

For the current online demo, `backend/.env` must point to the Supabase/Postgres database used by the online Hostinger API.

Example:

```bat
cd C:\zn
node backend\scripts\create-trial-tenant.js --support-only=true --slug=test-shop --business-name="Test Shop" --owner-name="Test Owner" --owner-phone="01000000000" --username=testowner --password="StrongTrial@2026" --days=14
```

The script prints:

- `tenantId`
- `accountId`
- `slug`
- `username`
- `temporaryPassword`
- `trialStartsAt`
- `trialEndsAt`
- a placeholder login URL

The owner user is created as `super_admin`, is active, and must change password on first use.

## Domain changes later

When the real domain is purchased, update environment/config values only:

```env
CORS_ORIGINS=https://app.YOUR_REAL_DOMAIN.com
SESSION_COOKIE_DOMAIN=.YOUR_REAL_DOMAIN.com
VITE_API_BASE_URL=https://api.YOUR_REAL_DOMAIN.com
```

Do not hardcode the current temporary `karimzakaria.com` domain into source code.

## Why no automatic subdomains yet

This first step intentionally does not create wildcard subdomains or separate databases for every trial. It keeps all trials in the current SaaS database and prepares the tenant/trial model first.

Recommended roadmap:

1. Backend/database trial foundation. Done in this step.
2. Admin trials dashboard.
3. Public trial signup page.
4. Trial conversion to paid account.
5. Optional wildcard subdomain routing later.
6. Optional schema/database isolation for larger paid customers later.

## Safety notes

- Do not run this against the wrong database.
- Confirm `DATABASE_HOST` before creating trial tenants.
- Do not commit `backend/.env`, `frontend/.env.production`, or Hostinger production env files.
- Keep emergency super admin credentials outside GitHub.
