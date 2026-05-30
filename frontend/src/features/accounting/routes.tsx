import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const accountingRouteModule: FeatureRouteModule = {
  routes: [
    {
      path: 'accounting/accounts',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingAccountsPage').then((module) => ({ default: module.AccountingAccountsPage }))),
    },
    {
      path: 'accounting/journal-entries',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingJournalEntriesPage').then((module) => ({ default: module.AccountingJournalEntriesPage }))),
    },
    {
      path: 'accounting/settings',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingSettingsPage').then((module) => ({ default: module.AccountingSettingsPage }))),
    },
    {
      path: 'accounting/financial-summary',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingFinancialSummaryPage').then((module) => ({ default: module.AccountingFinancialSummaryPage }))),
    },
    {
      path: 'accounting/receivables-payables',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingReceivablesPayablesPage').then((module) => ({ default: module.AccountingReceivablesPayablesPage }))),
    },
    {
      path: 'accounting/cash-movement',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingCashMovementPage').then((module) => ({ default: module.AccountingCashMovementPage }))),
    },
  ],
  navigation: [
    { key: 'accounting-accounts', label: 'شجرة الحسابات', to: '/accounting/accounts' },
    { key: 'accounting-journal-entries', label: 'القيود اليومية', to: '/accounting/journal-entries' },
    { key: 'accounting-settings', label: 'إعدادات الحسابات', to: '/accounting/settings' },
    { key: 'accounting-financial-summary', label: 'الملخص المالي', to: '/accounting/financial-summary' },
    { key: 'accounting-receivables-payables', label: 'الذمم والمستحقات', to: '/accounting/receivables-payables' },
    { key: 'accounting-cash-movement', label: 'حركة الخزنة والبنك', to: '/accounting/cash-movement' },
  ],
};
