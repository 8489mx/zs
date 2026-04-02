# Frontend heavy files cleanup - phase 5

## Scope
Final cleanup for the remaining heavy frontend files in Settings and Treasury.

## What changed

### Settings
- Split `SettingsForms.tsx` into dedicated files:
  - `forms/SettingsMainForm.tsx`
  - `forms/BranchForm.tsx`
  - `forms/LocationForm.tsx`
  - `forms/settings-forms.shared.tsx`
- Moved user-management orchestration into:
  - `hooks/useUserManagementController.ts`
- Split user-management UI helpers into:
  - `components/user-management/UserManagementListControls.tsx`
  - `components/user-management/UserManagementPermissionGroups.tsx`
- Split reference-section helpers into:
  - `workspace-sections/reference-section.shared.tsx`
- Reduced main section shells:
  - `UserManagementSection.tsx`
  - `SettingsReferenceSection.tsx`

### Treasury
- Split `TreasuryPage.tsx` into:
  - `components/TreasuryExpenseEntryCard.tsx`
  - `components/TreasuryExpenseSummaryCard.tsx`
  - `components/TreasuryTransactionsCard.tsx`
  - `components/TreasuryExpensesRegisterCard.tsx`
  - `lib/treasury-page.helpers.ts`

## Size impact
- `SettingsReferenceSection.tsx`: 24.1 KB -> 10.2 KB
- `SettingsForms.tsx`: 19.0 KB -> 0.6 KB facade
- `UserManagementSection.tsx`: 18.6 KB -> 6.0 KB
- `UserManagementPanels.tsx`: 18.8 KB -> 14.3 KB
- `TreasuryPage.tsx`: 17.2 KB -> 6.4 KB

## Validation
- `npm test` ✅
- `npm run frontend:build` ✅
- `npm --prefix frontend run qa:features` ✅
- `npm --prefix frontend run qa:composition` ✅
