# P0-A — Platform Core & Security | 2026-10-25

**Base:** `main@3b7e4619c4e66817c79036f70c2fde7f2795206f`  
**Working branch:** `fix/platform-core-security-audit-20261025`  
**Evidence:** source inspection and authored regressions only. **No tests, build, typecheck, guard suites, migrations, UAT, or operational security tests were executed.** No deployment or main merge.

## Confirmed defects corrected in code

| ID | Priority | Confirmed root cause and fix |
|---|---|---|
| P0A-01 | P0 | A SaaS tenant administrator could invoke a sandbox checkout and grant a paid subscription whenever live gateway keys were absent. Simulations are now local-mode-only at controller, gateway and `processDirectPayment` service boundaries. |
| P0A-02 | P0 | Tenant backup import accepted arbitrary platform-owned `tenant_subscriptions` / payment rows from a user-built ZIP with a self-computed checksum. Restore normalization and table enumeration now exclude platform billing, session state, tenant ID leases and trial records using `PLATFORM_TENANT_TABLES` from tenant transfer. Protected records already stored remain intact. |
| P0A-03 | P1 | XPay/Paymob fell back to fake checkout after failed live initiation; Stripe returned a fabricated URL. Live failures now fail closed; simulated fallbacks require explicitly local mode and no real credentials. |
| P0A-04 | P1 | Cloud session/CSRF cookie security attributes could be downgraded by a request's spoofed `X-Forwarded-Host: localhost`. Loopback exceptions now require a supported desktop runtime. |
| P0A-05 | P1 | `PermissionsGuard` could pass `@AllowAuthenticated` with no auth context or trust a `super_admin` role without independently checking platform-tenant status. It now fails closed on missing identity and applies the canonical platform-tenant test. |
| P0A-06 | P1 | DB session resolution verified tenant but not `account_id` against the user row. Both dimensions now must match. |
| P0A-07 | P1 | Password rehash, user state update, and session insertion were parallel/non-atomic. Session creation now uses one DB transaction with a locked recheck of active/lock state before the session write. |
| P0A-08 | P1 | Multi-table tenant backup export read tables across different database snapshots, making inconsistent invoices/journals possible during concurrent writes. Export now uses one read-only REPEATABLE READ transaction. |
| P0A-09 | P1 | Backup restore silently swallowed failures of child/tenant/session deletion while FK checks were disabled. Those errors now abort the encompassing transaction. |
| P0A-10 | P2 | Malformed percent-encoded authentication cookies could throw during parsing rather than result in unauthenticated handling. Parsing now safely rejects malformed cookie values. |
| P0A-11 | P1 | After successful destructive backup restore, the cached session permissions and tenant settings remained usable until TTL even though sessions/users were replaced. Invalidate tenant auth/settings/branch/plan caches after commit. |
| P0A-12 | P1 | Tenant-package import silently swallowed SQL failure when revoking pre-import sessions, allowing a completed import to retain live old sessions. Session revocation is now mandatory in the same transaction. |
| P0A-13 | P1 | Local scheduled backup and backup-folder API relied on `PORTABLE_MODE` even for unsupported environment combinations. Both now require canonical explicit `isDesktopRuntimeMode(APP_MODE)`. |
| P0A-14 | P1 | Second-factor login endpoint `POST /api/auth/login/mfa` was absent from the login rate-limit middleware route registration, leaving repeated MFA guesses at unbounded middleware rate. It now uses the login limit. |
| P0A-15 | P1 | Login rate limiter treated raw `IS_ELECTRON` / `PORTABLE_MODE` flags as bypass flags even for Cloud SaaS. Only explicitly supported desktop modes now bypass local login throttling. |

## Paths inspected

- `config/app-mode.ts`, `config/env.schema.ts`, core auth session/permission/platform guards, session caching, MFA and reset entrypoints.
- Subscription checkout controller → gateway initiation / direct grant / webhook manager → tenant subscription DB operations.
- Backup controller/service export & restore → tenant package table classifier / FK reconciliation → transaction.
- Tenant-transfer core package import flow and exclusions; session deletion error propagation hardened.
- Architecture maps and required review protocol documents.

## Paths NOT comprehensively verified

- Every API endpoint and join across all 37 business modules; especially tenant propagation across every raw SQL statement.
- All MFA/employee/driver/public portal routes through live callers and full rate-limiting coverage.
- All migrations, composite foreign keys, indexes, database constraints and concurrency scenarios on real PostgreSQL.
- Complete offline Desktop/Electron installation, activation, license and update testing, plus local pilot.
- All backup/restore and transfer schema versions, interrupted restores, encrypted historical archives, and full accounting/inventory integrity after recovery.
- Live gateway callbacks, financial settlement reconciliation and production environment configuration.

## Tests authored (not executed)

- `backend/test/critical/subscription-sandbox-boundary.spec.ts`
- `backend/test/critical/platform-auth-boundaries-p0a.spec.ts`
- `backend/test/critical/backup-platform-boundary-p0a.spec.ts`
- `backend/test/critical/session-login-atomic-p0a.spec.ts`
- `backend/test/critical/backup-mode-boundary-p0a.spec.ts`
- `backend/test/critical/login-mode-boundary-p0a.spec.ts`
- Existing `backend/test/infra/settings-backup-safety.spec.ts` fixture updated for backup constructor dependencies.

These cases cover narrowly scoped guards/policies and a mocked login transaction; they **do not** prove database behavior or production readiness. Existing regression suites were not run. No migration was created or applied. Review status stays `unverified_current_head` for affected modules, per `docs/reviews/README.md`.

## Explicitly preserved

- No change to the owner-authorized `infoadmin` Desktop acceptance path.
- No change to `main`, deployment, live customer data, or production schema.
- SaaS `zs` tenant guard and local-mode separation remain required, not waived.

**Initial batch tally (before follow-up):** **P0: 2, P1: 12, P2: 1 (15 total)**. This counts independently reproduced-by-source risk paths; no runtime proof.  

**Conclusion:** The P0-A initiative has documented code fixes for the confirmed paths above; the full Platform Core audit **is not finished**. The unreviewed scope remains a release-acceptance limitation, even after these commits.

---

## P0-A follow-up code audit — 2026-10-25 (same branch; additional work)

**Starting source SHA:** `bb91095fc96085eff91b545c8cab2ab2a3b3443a`  
**New commits (separate pushes):** `4984d347`, `d91764aa`, `0c36ebaa`, `cef62d01`, `e2d4ad34`, `174ded81`, `bed6d341`, `8a493b9c`, `1ff3420e`.  
**Status:** source-level code inspection, new migration, and authored regressions only. No test suite, build, typecheck, static guards, database migration, or UAT was executed. `main` is untouched.

### Additional confirmed code defects corrected

| ID | Priority | Confirmed code evidence / remediation |
| --- | --- | --- |
| P0A-16 | P1 | `MfaService.beginSetup` conflict-upsert could overwrite an already-confirmed factor during a concurrent confirmation. Upsert is now conditional on unconfirmed state; confirmation additionally checks the pending encrypted secret before update. |
| P0A-17 | P1 | Authenticated cashiers could directly call AI API-key/model configuration routes without settings permission. Controller config reads/writes/test/models and shared `AiCopilotService.saveConfig` now enforce management role/permission. |
| P0A-18 | P1 | `SessionAuthGuard` accepted x-session-id without CSRF in Cloud when `ALLOW_SESSION_ID_HEADER=true` (even in development). Fallback is now restricted to explicitly supported local runtime modes, preserving local clients. |
| P0A-19 | P1 | Paymob webhook HMAC from callback query was not forwarded to the signature verifier, rejecting properly signed callbacks where no equivalent header existed. Controller forwards it only for Paymob; gateway still verifies cryptographically. |
| P0A-20 | P1 | Manual backup restore sequence repair swallowed `pg_get_serial_sequence` and `setval` errors; broken sequences could be committed. Errors now fail the restore transaction. |
| P0A-21 | P1 | A successful password check or pending signed MFA challenge could create a session after a concurrent password reset. Session creation checks the locked user's current password hash, and MFA challenges bind to a hash fingerprint. |
| P0A-22 | P1 | Concurrent failed logins could overwrite one another's `failed_login_count` and evade lockout. Updates now serialize on the user row in a tenant-scoped transaction. |
| P0A-23 | P0 | A manually constructed or old incomplete backup could silently clear missing live tenant tables during restore, and absent tenant metadata was accepted. Normalization fails closed, restore requires matching tenant identity, and preflights all discovered live tenant/child tables before deletion. **Older archives lacking tenant identity or unscoped child table support are now rejected; this is a documented compatibility/recovery limitation, not an implemented full migration pathway.** |
| P0A-24 | P1 | A set of ID-only joins in accounting, reconciliation, partner/customer reports, maritime journals, returns and contracting could follow cross-tenant legacy references. Joins now require both IDs and matching `tenant_id`; contracting post-update read is tenant-scoped. |
| P0A-25 | P1 | MFA encryption key derivation could fall back to a globally known local key on missing/unrecognized mode if `IS_ELECTRON` or `PORTABLE_MODE` was set. Canonical explicit desktop runtime mode is now mandatory for local fallback. |
| P0A-26 | P1 | Public maritime RFQ bid could reference a `shipping_lines.id` belonging to another tenant. The carrier lookup now requires RFQ tenant ownership; journal joins also include tenant ID. |
| P0A-27 | P1 | Tenant-aware writes were not consistently enforced by DB FKs for `user_mfa` and key maritime children. New additive migration `2040000000255_platform_tenant_fk_hardening.ts` creates supporting unique keys and tenant-composite `NOT VALID` constraints. **Not executed; existing invalid records remain and need explicit reconciliation.** |

**Follow-up additions by severity:** P0 **1**, P1 **11**, P2 **0**.  
**Combined source-confirmed corrections:** P0 **3**, P1 **23**, P2 **1**, **27 total**. These are independently described source defects; **not** a penetration-test result or proof of operational closure.

### Code surface examined this follow-up (different levels of depth)

- Enumerated actual repository tree: **83 backend controllers** in **37 modules**, **148 module service files**, and **349 migration `.ts` files**. Counts are inventory, **not** assertions that every file was fully inspected.
- Read class-level guard and route declarations for representative sets across accounting, catalog, sales, purchases, treasury, returns, HR, reports, inventory, customers/partners, contracting, maritime, manufacturing, pharmacy, APIs for portals/webhooks, settings, SaaS/admin, activation and developers. Public endpoints were differentiated from normal authenticated controllers. A name/decorator check does not prove service authorization.
- Traced actual implementations for session and MFA/crypto/rate limits, AI key-management APIs, Paymob callback/controller, authorization guard, backup ZIP normalization/export/restore, tenant transfer FK and session invalidation, maritime bid magic-link, accounting reconciliation, partners customer profile, reporting dashboard, contracting document revisions, selected settings operations, bridge terminal authentication.
- Examined migration definitions `2040000000080`, `2040000000085`, `2040000000142`, `2040000000252`, `2040000000253`, `2040000000254`, migration runner, and authored `2040000000255`. **The other migrations are not individually audited.**
- Prior 15 fixes received targeted re-inspection, notably auth guard modes, login transactions/test doubles, backup deletion/sequence logic, gateway HMAC handling, platform-tables exclusion, desktop key derivation, and tenant-aware joins. No test execution or full old-fix regression proof.

### New regression files (written, NEVER run)

- `backend/test/critical/p0a-mfa-ai-settings-boundaries.spec.ts`
- `backend/test/critical/p0a-cloud-header-paymob-webhook.spec.ts`
- `backend/test/critical/p0a-password-change-login-race.spec.ts`
- `backend/test/critical/p0a-login-lockout-concurrency.spec.ts`
- `backend/test/critical/p0a-backup-destructive-preflight.spec.ts`
- `backend/test/critical/p0a-tenant-join-invariants.spec.ts` (source-contract test, not live SQL integration)
- `backend/test/critical/p0a-mfa-encryption-mode.spec.ts`
- `backend/test/critical/p0a-tenant-referential-constraints.spec.ts` (migration metadata check, not applied DB test)

Adjusted older test fixtures `backend/test/critical/session-auth.guard.spec.ts` and `backend/test/critical/session-auth.spec.ts`. None executed. Real parallel PostgreSQL transactions, exact historical data, Electron packaging and Cloud gateways remain untested.

### Outstanding, NOT cleared by this follow-up

1. Every query/endpoint/guard in all 37 modules has **not** been traced through Frontend → API → Guard → Service → SQL. The enumerated route and service inventory is not endpoint-level evidence. Some role/permission checks and branch authorization may remain incorrect.
2. Review of **all 349 migrations** and full historical composite FKs, `NOT VALID` legacy anomalies, constraints and migrations execution order is incomplete; latest 255 not applied.
3. **Real PostgreSQL**, idempotency, parallel sessions, multi-tenant adversarial scenarios, restore interruption and event/GL/stock integrity tests not run.
4. **Manual Backup Restore remains restricted** for legacy/incomplete archives or data stored in child tables lacking `tenant_id`; complete backward-compatible safe restore requires schema-aware child export/remapping or tenant package transfer. This is deliberately fail-closed and **not completed**.
5. Electron SELF_CONTAINED / LOCAL_PILOT boot/activation/licensing, desktop updater, complete packaging, live cloud environment, enterprise CSP, vendor payment signatures and end-to-end real gateway settlement are unverified.
6. All employee, driver, storefront, freight portal and other public token flows were **sampled**, not all deeply verified, including all frontend callers and load/rate-limit behavior.

**Release acceptance:** all touched modules remain `unverified_current_head` (existing HR `release_blocked` unchanged). No claim that Platform Core is fully audited or ready for final release testing. The next approval must explicitly permit tests before the branch can be evaluated for merge.
