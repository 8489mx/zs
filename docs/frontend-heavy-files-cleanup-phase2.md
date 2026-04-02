# Frontend Heavy Files Cleanup - Phase 2

## Scope
This phase focused on the next high-impact frontend files after phase 1:
- `src/features/settings/pages/SettingsPage.tsx`
- `src/features/products/components/ProductsWorkspace.tsx`
- `src/features/cash-drawer/pages/CashDrawerPage.tsx`

## What changed

### Settings
- Extracted page-shell rendering into `SettingsPageShell`
- Moved branch/location filter state into `useSettingsReferenceFilters`
- Moved guidance, template download, and confirm-dialog metadata into `settings-page.helpers.tsx`
- Reduced `SettingsPage.tsx` to orchestration only

### Products
- Extracted view/controller logic into `useProductsWorkspaceController`
- Extracted stats grid into `ProductsStatsGrid`
- Extracted products table/search/filter/pagination card into `ProductsTableCard`
- Kept `ProductsWorkspace.tsx` focused on composition and dialog wiring

### Cash Drawer
- Extracted page/controller logic into `useCashDrawerPageController`
- Extracted stats into `CashDrawerStatsGrid`
- Extracted form area into `CashDrawerFormsPanel`
- Extracted shifts table/search/filter card into `CashDrawerShiftsCard`
- Kept `CashDrawerPage.tsx` focused on composition and confirmation flow

## Result
- Better page composition
- Smaller top-level page/workspace files
- Clearer boundaries between controller logic and rendering
- Lower risk for future feature work and PostgreSQL migration prep

## Validation
- `npm run frontend:build` ✅
- `npm --prefix frontend run qa:features` ✅
- `npm --prefix frontend run qa:composition` ✅
- `npm test` ✅
