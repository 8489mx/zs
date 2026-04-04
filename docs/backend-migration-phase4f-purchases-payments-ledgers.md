# Backend Migration — Phase 4F (Purchases, Payments, Ledgers)

## Scope
Phase 4F migrates financial purchasing flows into `backend-new`:
- purchases
- purchase items
- supplier payments
- supplier ledger updates
- customer ledger updates for customer payments
- treasury transactions tied to purchases/payments

Out of scope:
- sales (already migrated in Phase 4E)
- reports and analytics
- admin extras
- frontend changes
- data migration

## Module introduced
- `backend-new/src/purchases/purchases.module.ts`
- `backend-new/src/purchases/purchases.controller.ts`
- `backend-new/src/purchases/purchases.service.ts`
- `backend-new/src/purchases/dto/upsert-purchase.dto.ts`
- `backend-new/src/purchases/dto/create-party-payment.dto.ts`

`PurchasesModule` is registered in `AppModule`.

## API surface migrated
All endpoints use `SessionAuthGuard` + `PermissionsGuard`.

### Purchases
- `GET /api/purchases`
- `POST /api/purchases`
- `PUT /api/purchases/:id`
- `POST /api/purchases/:id/cancel`

### Payments
- `GET /api/supplier-payments`
- `POST /api/supplier-payments`
- `POST /api/customer-payments`

## Behavior preserved from old backend
- Purchase creation increments stock and writes stock movements.
- Credit purchases increase supplier balance through `supplier_ledger`.
- Cash purchases write outgoing treasury transactions.
- Purchase cancellation rolls back stock and reverses financial side-effects.
- Purchase update restores previous stock/financial effects then applies new ones transactionally.
- Supplier payment validation prevents overpaying outstanding supplier balance.
- Customer payment validation prevents collecting above customer outstanding balance.
- Supplier and customer payments both write ledger and treasury records.
- All mutations are transaction-safe via `TransactionHelper`.

## Data typing updates
`backend-new/src/database/database.types.ts` now includes richer table typings for:
- `purchases`
- `purchase_items`
- `supplier_payments`
- `supplier_ledger`
- `customer_payments`

## Contract notes
- `GET /api/purchases` returns `purchases`, `pagination`, and `summary`.
- Purchase mutation responses currently return refreshed `purchases` data.
- Payment mutation responses return `ok` and refreshed payment list where relevant.
