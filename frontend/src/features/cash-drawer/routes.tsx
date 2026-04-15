import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const cashDrawerRouteModule: FeatureRouteModule = {
  routes: [{ path: 'cash-drawer', element: createLazyRoute(() => import('@/features/cash-drawer/pages/CashDrawerPage').then((module) => ({ default: module.CashDrawerPage }))) }],
  navigation: [{ key: 'cash-drawer', label: 'الورديات والدرج النقدي', to: '/cash-drawer' }]
};
