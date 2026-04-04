# Backend Migration — Phase 4G (Reports / Admin Extras)

## Scope
Phase 4G adds read-only reporting/admin endpoints in `backend-new`:
- dashboard overview
- summary reporting
- inventory summary
- customer balances
- customer/supplier ledgers
- treasury transactions view
- audit logs view

The implementation is read-only and uses existing phase 4A–4F tables.

## New module
- `backend-new/src/reports/reports.module.ts`
- `backend-new/src/reports/reports.controller.ts`
- `backend-new/src/reports/reports.service.ts`
- `backend-new/src/reports/dto/report-query.dto.ts`

`ReportsModule` is registered in `AppModule`.

## Endpoints
- `GET /api/dashboard/overview` (`dashboard` permission)
- `GET /api/reports/summary` (`reports` permission)
- `GET /api/reports/inventory` (`reports` permission)
- `GET /api/reports/customer-balances` (`reports` permission)
- `GET /api/reports/customers/:id/ledger` (`reports` permission)
- `GET /api/reports/suppliers/:id/ledger` (`reports` permission)
- `GET /api/treasury-transactions` (`treasury` permission)
- `GET /api/audit-logs` (`audit` permission)

## Behavior
- Supports date range filters (`from`, `to`) for summary/dashboard/treasury.
- Supports optional branch/location filtering where fields are available.
- Supports search/filter/pagination for list-like report outputs.
- Reuses existing auth guard and permission guard foundations.

## Notes
- No sales/purchases mutation behavior was changed.
- No frontend code was touched.
- No data migration/cutover logic was introduced.
