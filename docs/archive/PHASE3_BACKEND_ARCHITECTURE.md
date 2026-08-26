# Phase 3 Backend Architecture Map

## Goal
Turn oversized feature services into small collaborators with clear boundaries while keeping the public module contract stable.

## Pattern used
Each feature keeps a top-level facade service that the controller already knows.
That facade now delegates to focused internal services.

## Modules changed

### Reports
- `reports.service.ts` -> facade
- `services/reports-summary.service.ts`
- `services/reports-ledger.service.ts`
- `services/reports-admin.service.ts`

### Catalog
- `catalog.service.ts` -> facade
- `services/catalog-category.service.ts`
- `services/catalog-product.service.ts`

### Inventory
- `inventory.service.ts` -> facade
- `services/inventory-scope.service.ts`
- `services/inventory-transfer.service.ts`
- `services/inventory-count.service.ts`
- `services/inventory-adjustment.service.ts`

### Purchases
- `purchases.service.ts` -> facade
- `services/purchases-finance.service.ts`
- `services/purchases-query.service.ts`
- `services/purchases-write.service.ts`

### Sales
- `sales.service.ts` -> facade
- `services/sales-authorization.service.ts`
- `services/sales-finance.service.ts`
- `services/sales-query.service.ts`
- `services/sales-write.service.ts`

## Rules for future work
1. Keep controllers thin.
2. Keep facades stable unless API contracts truly change.
3. Put reads and writes in separate collaborators when the flow is large.
4. Put money / ledger logic in finance-focused collaborators.
5. Do not move unrelated responsibilities back into the facade.

## Minimum regression checks
```bash
npm run build
npm run test:critical
```
