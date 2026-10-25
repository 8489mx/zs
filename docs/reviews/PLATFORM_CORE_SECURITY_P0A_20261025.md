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

## Paths inspected

- `config/app-mode.ts`, `config/env.schema.ts`, core auth session/permission/platform guards, session caching, MFA and reset entrypoints.
- Subscription checkout controller → gateway initiation / direct grant / webhook manager → tenant subscription DB operations.
- Backup controller/service export & restore → tenant package table classifier / FK reconciliation → transaction.
- Tenant-transfer core package import flow and exclusions (read-only, no changes).
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

These cases cover narrowly scoped guards/policies and a mocked login transaction; they **do not** prove database behavior or production readiness. Existing regression suites were not run. No migration was created or applied. Review status stays `unverified_current_head` for affected modules, per `docs/reviews/README.md`.

## Explicitly preserved

- No change to the owner-authorized `infoadmin` Desktop acceptance path.
- No change to `main`, deployment, live customer data, or production schema.
- SaaS `zs` tenant guard and local-mode separation remain required, not waived.

**Conclusion:** The P0-A initiative has documented code fixes for the confirmed paths above; the full Platform Core audit **is not finished**. The unreviewed scope remains a release-acceptance limitation, even after these commits.
