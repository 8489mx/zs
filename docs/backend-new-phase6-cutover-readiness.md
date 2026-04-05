# Backend-New Phase 6: Verification & Cutover Readiness

## Scope and constraints
This document is the Phase 6 verification artifact for `backend-new` cutover readiness.

- No new product features were added.
- No frontend changes were made.
- Focus is verification status, cutover checklist, rollback, and operational readiness.

## Verification baseline (executed)
Run from `backend-new/`.

1. `npm install` ✅
2. `npm run build` ✅
3. `npm run test:smoke` ⚠️ (fails without required DB environment variables; passes once required vars are provided)

### Smoke test prerequisite
`test:smoke` now explicitly checks required variables and prints actionable guidance:

- `DATABASE_HOST`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`

Before running smoke:

```bash
cp .env.example .env
# OR export variables in shell
```

## Domain readiness coverage review
Coverage is based on currently wired modules/controllers in `backend-new/src`.

| Domain | Status | Evidence |
|---|---|---|
| auth/session | Partial-ready | Session guard + permission guard + session APIs exist; no dedicated login endpoint in `backend-new` API surface. |
| users/settings/sessions | Ready | `UsersModule`, `SettingsModule`, `SessionsModule` active and routed. |
| catalog/products/categories/offers/customer prices | Partial-ready | Catalog categories/products endpoints exist; explicit offers/customer-price dedicated endpoints not present in current API. |
| customers/suppliers | Ready | `PartnersModule` provides customer/supplier CRUD endpoints. |
| inventory | Ready | Locations, stock movements/transfers/count sessions/damaged/adjustments implemented. |
| sales/POS | Ready | Sales CRUD/cancel + held sales APIs implemented. |
| purchases/payments | Ready | Purchases CRUD/cancel + supplier/customer payments implemented. |
| reports/admin | Gap | No dedicated reports/admin controller module currently wired in `AppModule`. |
| migration layer | Ready-with-prereqs | Phase 5 migration runner exists with documented order and env needs. |

## Environment and config readiness checklist

### Required runtime configuration
- [ ] `NODE_ENV` set (`development`/`test`/`production`)
- [ ] `APP_HOST`, `APP_PORT`, `LOG_LEVEL`
- [ ] `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`
- [ ] `DATABASE_SCHEMA`, `DATABASE_SSL`, `DATABASE_LOGGING`
- [ ] Secrets management method confirmed for production env injection

### Infrastructure prerequisites
- [ ] PostgreSQL reachable from backend runtime network
- [ ] DB user has DDL + DML needed for migrations and runtime workload
- [ ] Backup/restore workflow tested against target PostgreSQL
- [ ] Service manager config finalized (systemd/container orchestrator)
- [ ] Reverse proxy config finalized (health and API routing)

## Phase 5 migration dependency check
Before cutover, verify:

1. Legacy SQLite source file exists and is readable (`OLD_DB_FILE` or default path).
2. PostgreSQL target is initialized and accessible with runtime credentials.
3. Migration commands complete in order:
   - `npm run migration:list`
   - `npm run migration:run`
   - `npm run migration:phase5`
4. Post-migration row-count sanity checks are documented and executed.
5. Delta/freeze policy between legacy and cutover window is approved.

## Pre-cutover checklist
- [ ] Build green (`npm run build`)
- [ ] Smoke green in cutover-like env (`npm run test:smoke`)
- [ ] DB migrations applied to target PostgreSQL
- [ ] Phase 5 migration completed with zero fatal step errors
- [ ] Critical API route smoke calls validated (health, auth session me, core CRUD reads)
- [ ] Monitoring/log pipeline connected
- [ ] On-call/ownership confirmed for cutover window
- [ ] Rollback operator and credentials confirmed

## Cutover steps (runbook)
1. Announce maintenance window and freeze legacy writes.
2. Take final backup/snapshot of legacy DB and target Postgres.
3. Run schema migrations on target Postgres (`migration:run`).
4. Run Phase 5 migration (`migration:phase5`).
5. Start `backend-new` in production profile.
6. Run smoke checks (health + authenticated core routes).
7. Release traffic to `backend-new`.
8. Monitor error rates, p95 latency, and DB pressure for first hour.

## Rollback notes
Rollback trigger examples:

- Persistent auth/session failures
- Data integrity mismatch in critical finance/inventory paths
- Sustained elevated 5xx with no quick remediation

Rollback steps:

1. Disable traffic to `backend-new`.
2. Re-route traffic to legacy backend.
3. Restore pre-cutover target DB snapshot if partial writes occurred and data parity is required.
4. Publish incident note with timeline and impacted domains.
5. Open blocker tickets before scheduling next cutover.

## Post-cutover verification
Within first 24 hours:

- [ ] Auth/session flow validated for admin + cashier roles
- [ ] Users/settings mutations audited
- [ ] Catalog reads/writes and pricing checks validated
- [ ] Customer/supplier balance-impacting operations validated
- [ ] Inventory transfer/count posting validated
- [ ] Sales + purchase + payment posting validated
- [ ] Migration parity checks sampled and signed off
- [ ] No unresolved P1/P2 defects from cutover

## Current blockers and risks summary

### Blockers (must resolve before production cutover)
1. Missing required env vars cause smoke failure in fresh shells unless `.env`/secret injection is prepared.
2. No explicit reports/admin domain module in `backend-new` app wiring, despite cutover target domain list requiring it.
3. Auth domain appears session-centric only; absence of explicit login endpoint in current `backend-new` surface should be validated against deployment architecture.

### Risks (monitor/manage)
1. Migration correctness depends on strict source freeze and verified final migration run.
2. Vulnerability warnings from npm audit should be triaged before go-live.
3. Unknown env config warnings (`http-proxy`) indicate CI/runtime npm config drift.

## Pass/fail gate recommendation
- **Recommended gate:** **NOT READY** until blockers above are explicitly accepted or remediated.
- Re-evaluate after blockers closure with a fresh smoke/build/migration dry run in production-like environment.
