import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const accountsRouteModule: FeatureRouteModule = {
  routes: [{ path: 'accounts', element: createLazyRoute(() => import('@/features/accounts/pages/AccountsPage').then((module) => ({ default: module.AccountsPage }))) }],
  navigation: [{ key: 'accounts', label: 'الحسابات', to: '/accounts' }]
};
