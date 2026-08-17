# Batch 12 changelog

## Scope
- Continued backend reports hardening on top of `zs-main-batch11-cumulative.zip`
- Extracted dashboard overview shaping from `ReportsService`
- Added dashboard helper guardrails and helper-focused infra test coverage

## Files added
- `backend/test/infra/reports-dashboard.helper.spec.ts`

## Files updated
- `backend/src/modules/reports/helpers/reports-dashboard.helper.ts`
- `backend/src/modules/reports/reports.service.ts`
- `backend/scripts/check-architecture-guardrails.cjs`
- `backend/package.json`

## Notes
- `ReportsService` was reduced from 797 lines to 775 lines in this batch.
- Architecture guardrails now require explicit dashboard helper exports and delegation.
