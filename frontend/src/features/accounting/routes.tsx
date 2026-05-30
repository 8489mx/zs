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
  ],
  navigation: [
    { key: 'accounting-accounts', label: 'شجرة الحسابات', to: '/accounting/accounts' },
    { key: 'accounting-journal-entries', label: 'القيود اليومية', to: '/accounting/journal-entries' },
    { key: 'accounting-settings', label: 'إعدادات الحسابات', to: '/accounting/settings' },
  ],
};
