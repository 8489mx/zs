# Z Systems

## التشغيل
- `npm install`
- انسخ `.env.example` إلى `.env` وعدل القيم الحساسة
- `npm start`

## مهم قبل أول تشغيل
- غيّر `SESSION_SECRET`
- بيانات الدخول الافتراضية لأول تثبيت محلي/ديمو: `ZS / infoadmin`
- بعد التثبيت أنشئ مستخدم Admin بصلاحيات محددة للاستخدام اليومي، واحتفظ بالـ super admin للإدارة فقط
- في أي بيئة فعلية، غيّر كلمة مرور `ZS` مباشرة بعد أول دخول

## ملاحظات أمان
- `ALLOW_RESET_USERS=false` افتراضيًا، ويفضل تركه مغلقًا
- `ALLOW_RESTORE_USERS=false` افتراضيًا، ويفضل تركه مغلقًا

## النسخ الاحتياطي
- من داخل النظام: زر `نسخ احتياطي`
- الاستعادة: اختر ملف النسخة من زر `استعادة نسخة`


## Phase 5 additions
- `GET /api/reports/summary?from&to` التشغيل والربحية المجمعة
- `GET /api/reports/inventory` حالة المخزون الحرجة
- `GET /api/reports/customer-balances` العملاء والمديونيات
- `npm test` يشغل smoke tests خفيفة للـ validators والمنطق التشغيلي


## Security hardening (Phase 7)
- Temporary lockout after repeated failed logins
- Session listing and revoke endpoints
- Change-password endpoint that clears other sessions
- Temporary bootstrap admin passwords require password change


## Phase 8 additions

- Added `DB_FILE` support so tests and staging can run against isolated SQLite files.
- Added startup validation to block insecure production boot with the default session secret.
- Added smoke tests that start the server, log in, verify session-protected routes, reports, logout, and session invalidation.
- Added `npm run smoke-test` and `npm run test:all`.
- Added a release checklist for safer commercial deployments.


## Phase 9 security additions
- Configurable same-origin write protection for POST/PUT/DELETE requests.
- Stricter session cookie handling and no-store auth responses.
- Startup validation for admin bootstrap password length and production session secret length.
- Safer default-user bootstrap that does not overwrite an existing active admin on every startup.

## Phase 10 integration additions
- Added `tests/http-test-helpers.js` to share HTTP test utilities across smoke and integration suites.
- Added `npm run test:integration` for end-to-end operational verification.
- Added an integration flow that covers user creation, server-side permission enforcement, purchases, sales, edits, returns, payments, cancellation, treasury totals, and summary reports.
- Tightened create/edit validation for negative prices, invalid multipliers, excessive discounts, and non-privileged discount use.


## Phase 12
- Frontend internal refactor with UI preserved
- no intentional visual redesign


## Phase 13
- Added admin diagnostics endpoints.
- Added maintenance report and expired-session cleanup.
- Added backup verification endpoint before restore.
- Added support snapshot export for faster ops/debug work.


## Phase 14
- Reports UI polished into a more executive dashboard layout while preserving the current visual identity.
- Customer, supplier, and stock ledgers upgraded with clearer summary cards and cleaner transaction rows.
- Inventory and operational insights presented in a more professional internal reporting format.


## Phase 15
- Added launch-readiness scoring endpoint for final audit.
- Added admin-facing launch-readiness card inside reports.
- Support snapshot now includes launch readiness.


## Phase 16
- Added CSV export endpoints for summary, inventory, customer balances, and customer/supplier ledgers.
- Added admin maintenance actions for cleaning expired sessions and reconciling master balances from ledgers.
- Added data-quality and maintenance widgets inside the reports page.


## Phase 22
- Added accounting invariant helpers in `src/accounting-invariants.js` for ledger, stock, and treasury consistency checks.
- Added `tests/phase22-tests.js` to cover backup-restore failure paths and invariant helpers.
- `npm test` now runs both baseline regression checks and Phase 22 hardening tests.


## Phase 23
- Began centralizing escape/render behavior so future frontend extraction can proceed without changing UI identity.


## Phase 23B
- Reduced the size and coupling of the main HTML script while preserving the current visual identity


## Phase 23C


## Phase 24
- Added structured logger support via `src/logger.js`
- Added startup hardening for production (`COOKIE_SECURE=true`, `ENFORCE_SAME_ORIGIN_WRITES=true`)
- Added `/api/admin/operational-readiness`
- Added configurable `LOG_LEVEL`, `LOG_FORMAT`, and `HEALTH_EXPOSE_DETAILS`


## Phase 25
- Extracted reporting routes into `src/report-routes.js`.
- Extracted admin + health routes into `src/admin-routes.js`.
- Reduced `src/server.js` route clutter for safer future refactors.


## Phase 26
- Extracted transaction creation flows into `src/transaction-service.js` to reduce `server.js` coupling.


## Phase 27
- Extracted transaction mutation flows (sale/purchase update + cancel) into `src/transaction-mutation-service.js`.



## Phase 28
- Added `src/launch-gate.js` and `scripts/launch-gate.js` for a final pre-launch configuration gate.
- Added `tests/phase28-tests.js` and wired it into `npm test`.
- `HEALTH_EXPOSE_DETAILS` now defaults to `false` for safer production posture.
- Run `npm run launch:gate` before any launch-candidate signoff.


## Phase 29
- Added stronger backup semantic verification before restore.
- Hardened more frontend rendering paths against HTML injection.
- Added `npm run verify:runtime` to run the final prelaunch command sequence in one step.


## Phase 30
- Restored backward-compatible inventory report summary fields so older consumers and smoke tests continue to work while preserving the nested `summary` object.


## Reset existing admin password
في التثبيت الجديد محليًا/ديمو، إذا لم تحدد `DEFAULT_ADMIN_PASSWORD` فسيتم استخدام بيانات الدخول الافتراضية `ZS / infoadmin` لأول bootstrap فقط. إذا كانت قاعدة البيانات الحالية تحتوي بالفعل على `super_admin`، فإن bootstrap credentials لا تغير كلمة المرور لاحقًا. لإعادة ضبط كلمة المرور بدون مسح البيانات:

```bash
node scripts/reset-admin-password.js ZS infoadmin
```

هذا الأمر يقوم بـ:
- تحديث `password_hash` و `password_salt`
- تصفير `failed_login_count`
- إزالة `locked_until`
- إبقاء البيانات التشغيلية كما هي

## Phase 31
- Cash drawer register now uses paginated tables for better large-list usability.
- Added explicit confirmation dialogs for cash-out movements and shift closing.
- Added `docs/scalability-roadmap.md` to document the path from client-side pagination and SQLite toward stronger long-term scaling.



## Recent hardening highlights

- cash drawer shifts now support server-side pagination and filter-aware full-result export/print.
- paged master-data query keys now share stable domain prefixes so mutations invalidate both base lists and paged variants consistently.


- report inventory and customer balance tabs now use server-side pagination and full-result exports for operational scalability.


## Current release scope

This repository currently targets a **single-store pilot deployment**. This release is intentionally scoped to a single store with one primary branch and one primary stock location. Keep branch/location records only for operator scoping and future migration planning. Do not market this build as multi-branch inventory control.


## React launch path

The supported launch path for this repository is the compiled React frontend under `frontend/dist` served by `src/server.js`. The legacy vanilla frontend has been removed from this repository.
