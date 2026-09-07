import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';
import { FeatureGate } from '@/shared/components/feature-gate';

function withAccountingGate<P = any>(Component: React.ComponentType<P>): React.ComponentType<any> {
  return function AccountingGated(props: any) {
    return (
      <FeatureGate feature="accounting" featureName="الحسابات العامة وشجرة الحسابات">
        <Component {...props} />
      </FeatureGate>
    );
  };
}


export const accountingRouteModule: FeatureRouteModule = {
  routes: [
    {
      path: 'accounting/accounts',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingAccountsPage').then((module) => ({ default: withAccountingGate(module.AccountingAccountsPage) }))),
    },
    {
      path: 'accounting/journal-entries',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingJournalEntriesPage').then((module) => ({ default: withAccountingGate(module.AccountingJournalEntriesPage) }))),
    },
    {
      path: 'accounting/cost-centers',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingCostCentersPage').then((module) => ({ default: withAccountingGate(module.AccountingCostCentersPage) }))),
    },
    {
      path: 'accounting/settings',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingSettingsPage').then((module) => ({ default: withAccountingGate(module.AccountingSettingsPage) }))),
    },
    {
      path: 'accounting/financial-summary',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingFinancialSummaryPage').then((module) => ({ default: withAccountingGate(module.AccountingFinancialSummaryPage) }))),
    },
    {
      path: 'accounting/receivables-payables',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingReceivablesPayablesPage').then((module) => ({ default: withAccountingGate(module.AccountingReceivablesPayablesPage) }))),
    },
    {
      path: 'accounting/cash-movement',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingCashMovementPage').then((module) => ({ default: withAccountingGate(module.AccountingCashMovementPage) }))),
    },
    {
      path: 'accounting/inventory-value',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingInventoryValuePage').then((module) => ({ default: withAccountingGate(module.AccountingInventoryValuePage) }))),
    },
    {
      path: 'accounting/fixed-assets',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingFixedAssetsPage').then((module) => ({ default: withAccountingGate(module.AccountingFixedAssetsPage) }))),
    },
    {
      path: 'accounting/bank-reconciliation',
      element: createLazyRoute(() => import('@/features/accounting/pages/BankReconciliationPage').then((module) => ({ default: withAccountingGate(module.BankReconciliationPage) }))),
    },
  ],
  navigation: [
    { key: 'accounting-accounts', label: 'شجرة الحسابات', to: '/accounting/accounts' },
    { key: 'accounting-cost-centers', label: 'مراكز التكلفة', to: '/accounting/cost-centers' },
    { key: 'accounting-journal-entries', label: 'القيود اليومية', to: '/accounting/journal-entries' },
    { key: 'accounting-bank-reconciliation', label: 'التسويات البنكية', to: '/accounting/bank-reconciliation' },
    { key: 'accounting-fixed-assets', label: 'الأصول الثابتة والإهلاك', to: '/accounting/fixed-assets' },
    { key: 'accounting-settings', label: 'إعدادات الحسابات', to: '/accounting/settings' },
  ],
};

