import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const treasuryRouteModule: FeatureRouteModule = {
  routes: [
    { path: 'treasury', element: createLazyRoute(() => import('@/features/treasury/pages/TreasuryPage').then((module) => ({ default: module.TreasuryPage }))) },
    { path: 'expenses', element: createLazyRoute(() => import('@/features/treasury/pages/ExpensesPage').then((module) => ({ default: module.ExpensesPage }))) }
  ],
  navigation: [
    { key: 'treasury', label: 'الخزينة', to: '/treasury' },
    { key: 'expenses', label: 'المصروفات', to: '/expenses' }
  ]
};
