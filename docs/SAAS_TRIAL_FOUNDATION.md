# Z Systems SaaS Trial + Tenant Lifecycle Foundation

This document records the current SaaS trial, tenant isolation, and tenant lifecycle admin foundation for Z Systems.

The current public deployment domain is temporary. Do not hardcode it in code. When the real system domain is purchased, only environment/config values should need to change.

## What this foundation adds

- A `tenants` table for `trial`, `active`, `expired`, and `suspended` SaaS tenants.
- A `trial_signups` table for source/campaign tracking.
- `tenant_id` and `account_id` columns on users and operational data.
- Login-time tenant access enforcement:
  - `suspended` tenants cannot log in.
  - `expired` tenants cannot log in.
  - `trial` tenants whose `trial_ends_at` is in the past are marked expired and blocked.
  - Existing/local platform users are scoped to the configured platform tenant.
- A support-only script for manual trial tenant creation.
- A platform-only SaaS tenant admin UI at `/saas-admin/tenants`.
- Tenant-scoped accounting foundation:
  - `accounting_accounts`
  - `accounting_settings`
  - `hr_hr_settings`
- Idempotent accounting chart/settings creation for new tenants.

## Important deployment rule

Do not commit real `.env` files or secrets.

Use examples such as:

- `backend/.env.cloud-saas.example`
- `.env.example` files when adding future documented environment variables

Keep real values in private local files, Hostinger environment variables, or a password manager.

## Required platform admin environment variables

The SaaS admin page is not for tenant owners. Tenant owners may be `super_admin` inside their own tenant, but they must not manage other tenants.

The platform tenant must be configured in both backend and frontend environments.

Local development example:

```env
# backend/.env.development
PLATFORM_TENANT_ID=dev-tenant
```

```env
# frontend/.env.development
VITE_PLATFORM_TENANT_ID=dev-tenant
```

Production example:

```env
# backend production environment
PLATFORM_TENANT_ID=<real-platform-tenant-id>
```

```env
# frontend production environment
VITE_PLATFORM_TENANT_ID=<real-platform-tenant-id>
```

Rules:

- The backend remains authoritative.
- The frontend only hides/shows platform-only routes/navigation.
- A tenant owner with `role = super_admin` is not a platform admin unless their tenant id matches the configured platform tenant id.
- If the platform tenant changes, update environment values and restart backend/frontend.

## Platform tenant protection

The platform tenant itself may be listed in the SaaS admin UI, but lifecycle actions must not be allowed against it.

Blocked actions for the platform tenant:

- Activate
- Suspend
- Expire
- Extend trial

The UI should show a passive label such as `ظ†ط³ط®ط© ط§ظ„ظ…ظ†طµط©` for the platform tenant row instead of lifecycle buttons.

## SaaS Tenant Lifecycle Admin UI

Route:

```text
/saas-admin/tenants
```

Sidebar label:

```text
ط¥ط¯ط§ط±ط© ط§ظ„ظ†ط³ط®
```

Access:

- Allowed only for platform admin.
- Hidden from tenant owners and ordinary users.
- Backend endpoints must return forbidden for non-platform tenants even if the route is manually opened.

Main capabilities:

- List tenants.
- Search by business/owner/slug/phone.
- Filter by status.
- Create a trial tenant.
- Activate a tenant.
- Suspend a tenant.
- Expire a tenant.
- Extend trial by a number of days.

## Create a trial tenant from UI

Recommended fields:

- `slug` / `ظ…ط¹ط±ظ‘ظپ ط§ظ„ظ†ط³ط®ط©`
- `businessName` / ط§ط³ظ… ط§ظ„ظ†ط´ط§ط·
- `ownerName` / ط§ط³ظ… ط§ظ„ظ…ط§ظ„ظƒ
- `ownerPhone` / ظ‡ط§طھظپ ط§ظ„ظ…ط§ظ„ظƒ
- `ownerEmail` optional
- `activityType` optional
- `username`
- `password` optional
- `days`, default `14`
- `source`, `campaign`, `notes` optional

`slug` is the internal unique tenant identifier. Use English lowercase letters, numbers, and dashes.

Examples:

```text
trial-shop-04
ahmed-market
client-ksa-01
```

Do not use Arabic text, spaces, or special symbols in the slug.

When the password field is left empty, the system generates a temporary strong password. The password is shown once after creation and must be copied immediately. The owner user is created with `must_change_password = true`.

## Create a trial tenant manually

Manual support script:

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

Prefer the SaaS admin UI for normal internal operations. Keep the script for support/emergency usage.

## Tenant isolation expectations

Each tenant must only see its own operational data.

Manually verified areas:

- Users and permissions
- Products
- Sales
- Accounting chart/settings
- Accounting journal/reporting data where tenant scoped
- Trial banner and trial days
- Expired/suspended login blocking

Important behavior:

- A cashier/admin inside a tenant sees the same tenant data, subject to permissions.
- A tenant owner does not see platform tenant data.
- The platform tenant does not see customer tenant products/sales as normal operational records.
- Trial/active/expired/suspended lifecycle status is enforced by backend login/session checks.

## Accounting tenant foundation

Accounting data has two parts:

1. Tenant-scoped chart of accounts.
2. Tenant-scoped accounting settings.

For a new tenant, the accounting foundation service is idempotent:

- If the tenant has no chart, copy the platform/default chart as a template.
- Rebuild parent-child relationships inside the target tenant by account code.
- If the tenant has no accounting settings, copy source settings by account code mapping, not by raw account ids.
- Calling the helper multiple times must not duplicate accounts/settings.

A healthy local check after creating/opening accounting for a trial tenant should show at least two scopes:

```text
accounting_accounts:
<platform-tenant-id> | <platform-account-id> | 50
<trial-tenant-id>   | <trial-account-id>    | 50

accounting_settings:
<platform-tenant-id> | <platform-account-id> | 1
<trial-tenant-id>   | <trial-account-id>    | 1
```

## Local development checklist

1. Make sure database env points to the local dev database.
2. Run migrations.
3. Configure platform tenant env in backend and frontend.
4. Restart backend and frontend after env changes.
5. Log in as platform admin.
6. Open `/saas-admin/tenants`.
7. Create a trial tenant.
8. Log in with the generated trial owner.
9. Change temporary password.
10. Confirm the trial banner appears.
11. Confirm the trial owner cannot open `/saas-admin/tenants`.
12. Create product/sale inside the trial tenant.
13. Log back into the platform tenant and confirm trial data is isolated.
14. Test suspend/active/expire/extend on a customer tenant.
15. Confirm the platform tenant row cannot be suspended/expired from the UI.

## Useful local commands

Run migrations:

```bat
cd C:\zn\backend
npm.cmd run migration:run:dev
npm.cmd run migration:list:dev
```

Build backend:

```bat
cd C:\zn\backend
npm.cmd run build
```

Build frontend:

```bat
cd C:\zn\frontend
npm.cmd run build
```

Check Git status:

```bat
cd C:\zn
git status
```

## Domain changes later

When the real domain is purchased, update environment/config values only:

```env
CORS_ORIGINS=https://app.YOUR_REAL_DOMAIN.com
SESSION_COOKIE_DOMAIN=.YOUR_REAL_DOMAIN.com
VITE_API_BASE_URL=https://api.YOUR_REAL_DOMAIN.com
```

Do not hardcode the current temporary `karimzakaria.com` domain into source code.

## Why no automatic subdomains yet

This foundation intentionally does not create wildcard subdomains or separate databases for every trial. It keeps all trials in the current SaaS database and prepares the tenant/trial model first.

Recommended roadmap:

1. Backend/database trial foundation. Done.
2. Tenant data isolation. Done for core operational/accounting scope covered by current migrations.
3. Platform-only tenant lifecycle admin. Done as MVP.
4. Public trial signup page.
5. Trial conversion to paid account / billing model.
6. Optional wildcard subdomain routing later.
7. Optional schema/database isolation for larger paid customers later.

## Safety notes

- Do not run tenant creation or lifecycle actions against the wrong database.
- Confirm `DATABASE_HOST` and `DATABASE_NAME` before creating or editing tenants.
- Do not commit `backend/.env`, `frontend/.env.production`, `frontend/.env.development`, or Hostinger production env files.
- Keep emergency super admin credentials outside GitHub.
- Do not audit-log generated temporary passwords.
- Never allow tenant owners to access SaaS tenant lifecycle admin.
- Never allow lifecycle mutation actions against the platform tenant itself.

## Related documentation

- Production readiness guide: docs/PRODUCTION_READINESS.md


