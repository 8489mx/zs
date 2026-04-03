# Backend Migration — Phase 4C (Customers & Suppliers)

## Scope

Phase 4C migrates only:

- `/api/customers`
- `/api/suppliers`
- Basic CRUD, list filtering, search, pagination, and summary behavior.

Out of scope:

- Inventory, sales, purchases, treasury, reports, and any frontend work.

## Implemented

- Added `PartnersModule` and wired it in `AppModule`.
- Added `PartnersController` with guarded routes for customers and suppliers.
- Added `PartnersService` implementing:
  - Customer and supplier list endpoints with legacy-compatible query behavior.
  - Create/update duplicate-name checks and normalization.
  - Delete safeguards mirroring legacy financial-history constraints.
  - Cleanup of related `product_customer_prices` rows on customer delete.
- Added DTO validation classes:
  - `UpsertCustomerDto`
  - `UpsertSupplierDto`
- Extended `database.types.ts` for customer/supplier fields and referenced accounting tables needed for deletion checks.

## Contract Notes

- Contract preserved for response envelope shape (`{ customers }`, `{ suppliers }`, optional `pagination` + `summary`, and `{ ok: true, ... }` on mutations).
- No intentional API contract changes.
