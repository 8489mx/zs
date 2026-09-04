import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';
import { FeatureGate } from '@/shared/components/feature-gate';

function withAccountingGate<P extends object>(Component: React.ComponentType<P>) {
  return function AccountingGated(props: P) {
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
  ],
  navigation: [
    { key: 'accounting-accounts', label: 'شجرة الحسابات', to: '/accounting/accounts' },
    { key: 'accounting-journal-entries', label: 'القيود اليومية', to: '/accounting/journal-entries' },
    { key: 'accounting-settings', label: 'إعدادات الحسابات', to: '/accounting/settings' },
  ],
};
