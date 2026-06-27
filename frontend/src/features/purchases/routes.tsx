import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const purchasesRouteModule: FeatureRouteModule = {
  routes: [
    { path: 'purchases', element: createLazyRoute(() => import('@/features/purchases/pages/PurchasesPage').then((module) => ({ default: module.PurchasesPage }))) },
    { path: 'purchases/new', element: createLazyRoute(() => import('@/features/purchases/pages/NewPurchaseOrderPage').then((module) => ({ default: module.NewPurchaseOrderPage }))) }
  ],
  navigation: [
    { key: 'purchases-new', label: 'إنشاء فاتورة شراء', to: '/purchases/new' },
    { key: 'purchases', label: 'سجل فواتير المشتريات', to: '/purchases', end: true },
  ]
};
