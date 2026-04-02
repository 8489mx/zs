# Frontend heavy files cleanup — phase 3

## Scope
This pass targeted the remaining high-impact frontend hotspots in inventory and POS.

## Inventory
- Extracted a dedicated controller hook:
  - `frontend/src/features/inventory/hooks/useInventoryWorkspaceController.ts`
- Reduced `InventoryWorkspace.tsx` to a rendering-focused shell.
- Split the former monitor mega-file into focused section files:
  - `TransferMonitorCard.tsx`
  - `StockCountMonitorCard.tsx`
  - `DamagedStockCard.tsx`
  - shared helper in `InventoryMonitorCards.shared.tsx`
- Kept the public section export surface stable through:
  - `InventoryMonitorCards.tsx`

### Result
- `InventoryWorkspace.tsx`: ~26.2 KB -> ~11.6 KB
- `InventoryMonitorCards.tsx`: ~26.4 KB -> ~0.3 KB barrel

## POS
- Split `usePosWorkspace.ts` into clearer layers:
  - `usePosWorkspaceDerived.ts`
  - `usePosWorkspaceActions.ts`
- Kept external behavior stable for the POS page and cart/products panels.

### Result
- `usePosWorkspace.ts`: ~23.5 KB -> ~10.5 KB

## Validation
- `npm run frontend:build` ✅
- `npm --prefix frontend run qa:features` ✅
- `npm --prefix frontend run qa:composition` ✅
- `npm test` ✅

## Remaining heavier frontend files worth revisiting later
- `DashboardPage.tsx`
- some settings admin/reference sections
- `PosCartPanel.tsx` if we want an extra polish pass
