# Phase 5 Data Migration (legacy backend -> backend-new PostgreSQL)

## Scope
This migration layer moves legacy data from SQLite to PostgreSQL for:

1. users
2. categories
3. products
4. customers/suppliers
5. inventory (branches, locations, stock movements)
6. sales/purchases
7. payments (customer/supplier)
8. ledgers (customer/supplier)
9. treasury transactions

## Mapping strategy

### ID strategy
- Primary strategy: preserve legacy numeric IDs (`old.id -> new.id`) for all migrated entities.
- Idempotency strategy: each insert uses `ON CONFLICT (id) DO NOTHING`.
- Relationship strategy: in-memory `idMap` is used before inserting dependent entities.

### Field mapping highlights
- **users**: maps core auth fields; new-only columns use safe defaults (`permissions_json='[]'`, `branch_ids_json='[]'`, etc.).
- **customers**: maps all shared columns; fills new columns (`company_name`, `tax_number`) with empty string.
- **sales/purchases**: legacy schema has no tax model; new tax columns default to `0` and `prices_include_tax=false`.
- **sale_items**: legacy has no unit/cost metadata; defaults to `unit_name='قطعة'`, `unit_multiplier=1`, `cost_price=0`, `price_type='retail'`.

## Migration order
Implemented in the runner (`src/migration/index.ts`) in this order:

1. users
2. categories
3. customers
4. suppliers
5. products
6. inventory (branches/locations, then stock movements)
7. sales
8. purchases
9. payments
10. ledger
11. treasury

## Commands
From `backend-new/`:

```bash
npm install
npm run build
npm run migration:phase5
```

Optional environment variables:

- `OLD_DB_FILE`: path to legacy SQLite file (default: `../data/zstore.db` relative to `backend-new/`).
- New PostgreSQL connection vars are read from existing backend-new env (`DATABASE_HOST`, `DATABASE_PORT`, ...).

## Logging
The runner prints:
- per-step progress
- per-step counters (`scanned`, `inserted`, `skipped`, `errors`)
- detailed per-record errors for troubleshooting
