import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const returnsRouteModule: FeatureRouteModule = {
  routes: [
    { path: 'returns', element: createLazyRoute(() => import('@/features/returns/pages/ReturnsPage').then((module) => ({ default: module.ReturnsPage }))) },
    { path: 'purchase-returns', element: createLazyRoute(() => import('@/features/returns/pages/ReturnsPage').then((module) => ({ default: module.ReturnsPage }))) }
  ],
  navigation: [
    { key: 'returns', label: 'مرتجعات المبيعات', to: '/returns' },
    { key: 'purchase-returns', label: 'مرتجعات المشتريات', to: '/purchase-returns' }
  ]
};
