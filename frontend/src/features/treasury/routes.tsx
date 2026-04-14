import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const treasuryRouteModule: FeatureRouteModule = {
  routes: [{ path: 'treasury', element: createLazyRoute(() => import('@/features/treasury/pages/TreasuryPage').then((module) => ({ default: module.TreasuryPage }))) }],
  navigation: [{ key: 'treasury', label: 'الخزينة', to: '/treasury' }]
};
