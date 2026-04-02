# Frontend Heavy Files Cleanup - Phase 4

## Scope
- Dashboard cleanup
- Shared/consistency cleanup for spotlight guidance cards

## What changed

### Dashboard
- Split `frontend/src/features/dashboard/pages/DashboardPage.tsx` into focused modules:
  - `features/dashboard/components/DashboardMetricCard.tsx`
  - `features/dashboard/components/DashboardHeroSection.tsx`
  - `features/dashboard/components/DashboardMetricsSection.tsx`
  - `features/dashboard/components/DashboardSummaryGrid.tsx`
  - `features/dashboard/components/DashboardOperationalGrid.tsx`
  - `features/dashboard/components/DashboardRelationshipGrid.tsx`
  - `features/dashboard/components/DashboardTrendsGrid.tsx`
  - `features/dashboard/lib/dashboard-page.utils.ts`
- Kept page logic as an orchestrator only.
- Moved CSV/print helpers, quick links, date formatting, and alert building into a dedicated utility module.

### Shared consistency pass
- Added reusable component:
  - `components/shared/SpotlightCardStrip.tsx`
- Replaced duplicated spotlight/guidance markup in:
  - `features/reports/components/ReportsGuidanceStrip.tsx`
  - `features/settings/components/SettingsPageShell.tsx`
  - `features/accounts/components/AccountsOverviewPanel.tsx`
  - `features/customers/pages/CustomersPage.tsx`
  - `features/suppliers/pages/SuppliersPage.tsx`
  - `features/purchases/components/PurchasesWorkspace.tsx`

## Result
- `DashboardPage.tsx` reduced from roughly `21.7 KB` to `5.2 KB`.
- Dashboard responsibilities are now split by section instead of being stacked into one page file.
- Spotlight guidance cards now follow one shared pattern across multiple screens.
- Frontend consistency improved without changing feature behavior.

## Validation
- `npm run frontend:build` ✅
- `npm --prefix frontend run qa:features` ✅
- `npm --prefix frontend run qa:composition` ✅
- `npm test` ✅
