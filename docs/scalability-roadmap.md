# Scalability Roadmap

## Current State
The current system is a modular monolith backed by SQLite with a React frontend. This is acceptable for MVP, local deployment, and small multi-user installations, but it is not the long-term target architecture for a broader ERP deployment.

## Current Strengths
- Clear feature boundaries on the frontend are improving
- Reusable `DataTable` foundation now supports pagination and selection
- Operational flows are increasingly guarded with explicit confirmations
- Source handoff can now exclude runtime artifacts consistently

## Current Limits
1. **SQLite as primary operational store**
   - Good for simplicity and local install
   - Weak for higher write concurrency, branch-heavy usage, and larger audit/report workloads
2. **Client-side pagination in several screens**
   - Suitable for current dataset sizes
   - Not sufficient for larger customer, product, inventory, and audit tables
3. **List-heavy read patterns**
   - Many screens still fetch broad datasets then filter in memory
4. **Single-node assumptions**
   - Backup/restore and runtime discipline are improving, but the app still assumes one primary node and one database file

## Recommended Migration Path

### Phase A — Query Discipline
- Add explicit list contracts for large screens:
  - `page`
  - `pageSize`
  - `search`
  - `sort`
  - `filters`
- Standardize response envelope:
  - `items`
  - `page`
  - `pageSize`
  - `totalItems`
  - `totalPages`
- Start with:
  - products
  - customers
  - suppliers
  - inventory movement register
  - audit logs

### Phase B — Server-side Pagination
- Move filtering and pagination to backend endpoints for large datasets
- Keep client-side pagination only for small/derived datasets
- Add indexed query paths for:
  - barcode
  - product name
  - customer name / phone
  - supplier name / phone
  - inventory movement timestamps
  - audit actor/entity/date

### Phase C — Database Evolution
- Introduce a database adapter boundary for:
  - products
  - customers
  - suppliers
  - inventory
  - audit logs
- Preserve current modular monolith app shape while making persistence swappable
- Prepare PostgreSQL migration path without forcing an immediate rewrite

### Phase D — Operational Hardening
- Add long-running export strategy for large reports
- Add backup verification jobs and restore drill scripts per deployment profile
- Add admin diagnostics around table growth and slow query hotspots

## Priority Order
1. Server-side pagination contracts
2. Search/index strategy for large tables
3. Persistence adapter boundary
4. PostgreSQL migration path
5. Deployment/runtime hardening for larger installations

## Practical Rule
For now, keep SQLite for:
- demos
- local installs
- small branch counts
- limited concurrent operators

Move toward PostgreSQL when you need:
- larger branch counts
- heavier inventory movement volume
- larger audit workloads
- stronger concurrency guarantees
- more demanding reporting windows
