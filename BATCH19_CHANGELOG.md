# Batch 19 changelog

## Scope
- Continue reducing `ReportsService` orchestration complexity.
- Extract dashboard date-scope and aggregate shaping into the dashboard helper.
- Tighten architecture guardrails so the dashboard refactor cannot silently regress.

## Added
- `backend/src/modules/reports/helpers/reports-dashboard.helper.ts`
  - `buildDashboardScope`
  - `buildDashboardComputedState`
- Extended coverage in `backend/test/infra/reports-dashboard.helper.spec.ts`

## Updated
- `backend/src/modules/reports/reports.service.ts`
- `backend/scripts/check-architecture-guardrails.cjs`

## Result
- `ReportsService` reduced to 596 lines.
- Dashboard date window and in-memory aggregate shaping are delegated to helper functions instead of remaining embedded in the service.
