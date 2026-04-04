# Backend Migration — Phase 4E (Sales / POS)

## Scope
Phase 4E migrates **Sales / POS** behavior into `backend-new` only:
- sales invoices
- sale items
- sale payments
- held/suspended sale drafts
- checkout totals (discount/tax/total)
- sale-related stock deduction/cancel restore
- customer linkage in sale flow
- direct sale-dependent ledger/treasury touchpoints

Out of scope in this phase:
- purchases and supplier flows
- reports/admin extras
- frontend changes
- data migration

## New module
- `backend-new/src/sales/sales.module.ts`
- `backend-new/src/sales/sales.controller.ts`
- `backend-new/src/sales/sales.service.ts`
- `backend-new/src/sales/dto/upsert-sale.dto.ts`
- `backend-new/src/sales/dto/held-sale.dto.ts`

`SalesModule` is registered in `AppModule`.

## API surface migrated
All routes are under `/api` and use `SessionAuthGuard` + `PermissionsGuard`.

### Sales
- `GET /api/sales`
- `GET /api/sales/:id`
- `POST /api/sales`
- `POST /api/sales/:id/cancel`

### Held sales (drafts)
- `GET /api/held-sales`
- `POST /api/held-sales`
- `DELETE /api/held-sales/:id`
- `DELETE /api/held-sales`

## Preserved business behavior (old backend parity)
- Sale must include at least one item.
- Product stock is validated and deducted on sale post.
- Sale cancel restores stock and records inverse stock movements.
- Discount/store-credit limits are validated.
- Credit sale requires a valid active customer.
- Credit-limit checks are applied for credit sales.
- Cash sale requires open cashier shift for non-admin users.
- Cash payment writes sale treasury transactions.
- Credit payment writes customer ledger entries.
- Store-credit usage decreases customer store-credit balance; cancellation restores it.
- Held drafts are persisted with line items and payment split metadata.
- Sales and held-sale mutations are transaction-safe via `TransactionHelper`.

## Data model typing updates
`backend-new/src/database/database.types.ts` was expanded to include:
- `sales`
- `sale_items`
- `sale_payments`
- `held_sales`
- `held_sale_items`
- `treasury_transactions`
- `cashier_shifts`
- richer `customer_ledger` row shape used by sales flow

## Contract notes
- `GET /api/sales` now returns:
  - `sales`
  - `pagination`
  - `summary`
  similar to old list behavior.
- Mutation responses currently return `ok` plus refreshed `sales` and key payload object (`sale` when relevant).
- `POST /api/customer-payments` was intentionally not migrated in Phase 4E to keep this slice limited to direct sales/POS flow; customer payment workflows belong with the payments/ledger-focused Phase 4F.

