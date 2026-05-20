import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const purchasesRouteModule: FeatureRouteModule = {
  routes: [
    { path: 'purchases', element: createLazyRoute(() => import('@/features/purchases/pages/PurchasesPage').then((module) => ({ default: module.PurchasesPage }))) },
    { path: 'purchases/new-prototype', element: createLazyRoute(() => import('@/features/purchases/pages/PurchaseOdooPrototypePage').then((module) => ({ default: module.PurchaseOdooPrototypePage }))) }
  ],
  navigation: [{ key: 'purchases', label: 'المشتريات', to: '/purchases' }]
};
