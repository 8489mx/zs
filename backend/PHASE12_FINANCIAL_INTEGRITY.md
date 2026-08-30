# Phase 12: Financial Integrity + Critical Flow Guards

What changed:
- Added shared financial guard helpers for duplicate items, payment coverage, return quantity limits, and non-negative stock.
- Applied these guards in sales, purchases, returns, and inventory flows.
- Added critical-flow backend tests for:
  - sale payment validation
  - duplicate item prevention
  - return payload normalization
  - return quantity limits

Commands:
- `npm run build`
- `npm run test:infra`
- `npm run test:critical`
