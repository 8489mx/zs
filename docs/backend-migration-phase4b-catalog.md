# Backend Migration — Phase 4B (Catalog Slice)

## Scope

Phase 4B migrates only catalog endpoints in `backend-new`:

- Product categories (`/api/categories`)
- Products (`/api/products`)
- Product units (nested under product payload)
- Product offers (nested under product payload)
- Product customer prices (nested under product payload)

Out of scope for this phase:

- users/settings/sessions changes
- inventory adjustments and stock operations
- sales, purchases, reports, treasury

## Implemented Components

- `CatalogModule` registered in `AppModule`.
- `CatalogController` implements category + product routes.
- `CatalogService` implements:
  - category CRUD with duplicate checks and soft delete safeguards
  - product list/create/update/delete
  - unit/offer/customer-price validation and relational persistence
  - pricing permission enforcement (`canViewCost`, `canEditPrice`)
- `database.types.ts` extended with catalog table typings used by Kysely.

## Contract Notes

- Product stock mutation through product master update is blocked with explicit error; inventory flow remains separate and intentionally excluded from 4B.
- Product list response includes `summary` and pagination fields compatible with current route behavior.
- IDs in API payloads remain stringified in responses for compatibility with existing client expectations.
