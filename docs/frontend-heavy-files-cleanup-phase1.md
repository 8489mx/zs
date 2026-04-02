# Frontend heavy files cleanup - phase 1

## What changed

Focused cleanup on the heaviest operational frontend files without changing feature behavior.

### Refactored files
- `frontend/src/features/sales/components/SalesWorkspace.tsx`
- `frontend/src/features/purchases/components/PurchasesWorkspace.tsx`
- `frontend/src/features/returns/components/ReturnsWorkspace.tsx`
- `frontend/src/features/inventory/components/InventoryWorkspace.tsx`
- `frontend/src/features/pos/hooks/usePosWorkspace.ts`

### New extracted modules
- `frontend/src/features/sales/lib/sales-workspace.helpers.ts`
- `frontend/src/features/sales/components/QuickCustomerCard.tsx`
- `frontend/src/features/sales/hooks/useSalesWorkspaceActions.ts`
- `frontend/src/features/purchases/lib/purchases-workspace.helpers.ts`
- `frontend/src/features/purchases/components/QuickSupplierCard.tsx`
- `frontend/src/features/purchases/hooks/usePurchasesWorkspaceActions.ts`
- `frontend/src/features/returns/lib/returns-workspace.helpers.ts`
- `frontend/src/features/returns/components/ReturnsInvoiceItemsTable.tsx`
- `frontend/src/features/returns/components/ReturnsSelectedInvoiceCard.tsx`
- `frontend/src/features/returns/components/ReturnsSelectedReturnCard.tsx`
- `frontend/src/features/inventory/lib/inventory-workspace.helpers.ts`
- `frontend/src/features/pos/lib/pos-workspace.helpers.ts`

## Result

### File size reduction (approx)
- `SalesWorkspace.tsx`: ~26.7 KB -> ~15.7 KB
- `PurchasesWorkspace.tsx`: ~24.5 KB -> ~15.2 KB
- `ReturnsWorkspace.tsx`: ~26.4 KB -> ~18.4 KB
- `InventoryWorkspace.tsx`: ~29.6 KB -> ~25.6 KB
- `usePosWorkspace.ts`: ~25.0 KB -> ~23.0 KB

### Architectural gain
- extracted pure formatting/printing/view-model helpers
- separated quick-create cards from workspace containers
- separated workspace actions from page composition
- reduced cognitive load in the main workspace files
- improved reuse and lowered risk for the next cleanup pass

## Verification
- `npm test` ✅
- `npm run frontend:build` ✅
- `npm --prefix frontend run qa:features` ✅
- `npm --prefix frontend run qa:composition` ✅

## Remaining large files for next pass
- `frontend/src/features/inventory/components/sections/InventoryMonitorCards.tsx`
- `frontend/src/features/settings/pages/SettingsPage.tsx`
- `frontend/src/features/settings/components/SettingsForms.tsx`
- `frontend/src/features/settings/components/UserManagementPanels.tsx`
- `frontend/src/features/products/components/ProductsWorkspace.tsx`
- `frontend/src/features/cash-drawer/pages/CashDrawerPage.tsx`
