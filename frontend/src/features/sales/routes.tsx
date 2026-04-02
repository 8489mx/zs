import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const salesRouteModule: FeatureRouteModule = {
  routes: [{ path: 'sales', element: createLazyRoute(() => import('@/features/sales/pages/SalesPage').then((module) => ({ default: module.SalesPage }))) }],
  navigation: [{ key: 'sales', label: 'المبيعات', to: '/sales' }]
};
