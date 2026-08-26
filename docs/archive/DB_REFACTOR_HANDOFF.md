# Database Refactor Handoff

## Scope completed

This DB refactor focuses on the highest-risk structural debt that blocks future scaling:

1. **Products source of truth**
2. **User ↔ Branch relational scope**
3. **Return documents normalization**
4. **Indexes and integrity hardening**

## New canonical rules

### Products
Canonical columns:
- `cost_price`
- `retail_price`
- `wholesale_price`
- `stock_qty`
- `min_stock_qty`

Removed legacy columns:
- `price`
- `cost`
- `stock`

### User branch access
Deprecated:
- `users.branch_ids_json`

Canonical relation:
- `user_branches(user_id, branch_id)`

### Returns
Deprecated flat table:
- `returns`

Canonical model:
- `return_documents`
- `return_items`

A return request now creates one document and one or more items.

### Ledger / treasury linkage
Added:
- `customer_ledger.return_document_id`
- `supplier_ledger.return_document_id`
- `treasury_transactions.return_document_id`

These columns allow direct FK linkage to return documents.

## Why this matters

This version is easier to maintain because it removes duplicated business truth and replaces weak JSON / flat structures with explicit relations.

It also improves future readiness for:
- multi-branch permissions
- cleaner reporting
- auditable returns
- safer refactors later

## Still future work (not part of this DB pack)

- Tenant / organization-level isolation for true multi-tenant SaaS
- Location-level inventory balances instead of global `products.stock_qty`
- Broader reference normalization across all finance flows, not only returns
