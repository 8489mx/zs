# OpenAI Patch Notes - Phase A

## What was fixed in this tranche

### 1) Settings / admin backend gaps closed
Added backend endpoints for:
- `GET /api/locations`
- `PUT /api/branches/:id`
- `DELETE /api/branches/:id`
- `PUT /api/locations/:id`
- `DELETE /api/locations/:id`
- `GET /api/admin/diagnostics`
- `GET /api/admin/maintenance-report`
- `GET /api/admin/launch-readiness`
- `GET /api/admin/operational-readiness`
- `GET /api/admin/support-snapshot`
- `GET /api/admin/uat-readiness`
- `POST /api/admin/maintenance/cleanup-expired-sessions`
- `POST /api/admin/maintenance/reconcile-balances`
- `POST /api/admin/maintenance/reconcile-customers`
- `POST /api/admin/maintenance/reconcile-suppliers`
- `GET /api/backup`
- `GET /api/backup-snapshots`
- `POST /api/backup/verify`
- `POST /api/backup/restore`
- `POST /api/import/products`
- `POST /api/import/customers`
- `POST /api/import/suppliers`
- `POST /api/import/opening-stock`

### 2) Financial integrity hardened for partners
- Customer and supplier balances are no longer freely editable from regular edit forms.
- Opening balances are now recorded through explicit opening-balance ledger insertion on create/import.
- Update attempts that try to tamper with live balances are rejected.

### 3) Customer / supplier listing performance improved
- Search/filter/pagination moved to SQL for customers and suppliers instead of loading full tables into memory first.

### 4) QA tooling fixed
- Frontend `qa:api` scripts were broken because they scanned the wrong backend path.
- Scripts were updated to read NestJS controller sources and now pass.

### 5) Production env handoff improved
- Added `backend/.env.production.example` with safer production defaults.

## Validation completed
- Backend build: passed
- Frontend build: passed
- Frontend lint: passed with existing warnings only
- Frontend `qa:api`: passed
- Backend readiness check: passed
- Backend env safety check: passed
- Backend infra + critical test chain: started and passed through visible executed specs during this tranche

## Not fully closed yet
These still need another tranche before I would call the product commercially ready:
- stricter branch/location authorization enforcement across all write flows
- deeper backup/restore drill on a realistic seeded database
- first-run setup flow hardening end-to-end
- richer monitoring/structured logging exposure for support operations
- broader E2E coverage
- deeper accounting/domain upgrade if targeting higher commercial maturity
