import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const suppliersRouteModule: FeatureRouteModule = {
  routes: [{ path: 'suppliers', element: createLazyRoute(() => import('@/features/suppliers/pages/SuppliersPage').then((module) => ({ default: module.SuppliersPage }))) }],
  navigation: [{ key: 'suppliers', label: 'الموردون', to: '/suppliers' }]
};
