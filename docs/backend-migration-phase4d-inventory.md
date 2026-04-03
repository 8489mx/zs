# Backend Migration — Phase 4D (Inventory)

## Scope

Phase 4D migrates inventory-only backend functionality:

- stock locations listing
- stock movements listing
- stock transfers + transfer items
- stock count sessions + count items
- damaged stock records
- inventory adjustments

Excluded in this phase:

- sales/POS checkout
- purchases
- reports
- treasury

## Implemented

- Added `InventoryModule`, `InventoryController`, and `InventoryService`.
- Added inventory DTOs for adjustments, transfers, stock count sessions, and damaged stock.
- Added transaction-safe mutations using `TransactionHelper` for:
  - transfer creation/receive/cancel
  - stock count create/post
  - damaged stock creation
  - inventory adjustments
- Added scoped read behaviors for listings and query filters (`search`, `q`, `filter`, `view`, `type`, pagination).
- Preserved legacy response envelope patterns with stringified IDs.
- Updated `database.types.ts` to include inventory entities used by the new module.

## Contract Notes

- No intentional API contract changes.
- Inventory routes now live in `backend-new` and reuse existing auth/permission foundations.
