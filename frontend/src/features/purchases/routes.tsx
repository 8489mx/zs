import { Navigate } from 'react-router-dom';
import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const purchasesRouteModule: FeatureRouteModule = {
  routes: [
    { path: 'purchases', element: createLazyRoute(() => import('@/features/purchases/pages/PurchasesPage').then((module) => ({ default: module.PurchasesPage }))) },
    { path: 'purchases/orders', element: createLazyRoute(() => import('@/features/purchases/pages/PurchaseOrdersPage').then((module) => ({ default: module.PurchaseOrdersPage }))) },
    { path: 'purchases-orders', element: <Navigate to="/purchases/orders" replace /> },
    { path: 'purchases/rfqs', element: createLazyRoute(() => import('@/features/purchases/pages/PurchaseRfqsPage').then((module) => ({ default: module.PurchaseRfqsPage }))) },
    { path: 'purchases-rfqs', element: <Navigate to="/purchases/rfqs" replace /> },
    { path: 'purchases/new', element: createLazyRoute(() => import('@/features/purchases/pages/NewPurchaseOrderPage').then((module) => ({ default: module.NewPurchaseOrderPage }))) },
    { path: 'purchases-new', element: <Navigate to="/purchases/new" replace /> },
    { path: 'purchases/reorder', element: createLazyRoute(() => import('@/features/purchases/pages/SmartReorderPage').then((module) => ({ default: module.SmartReorderPage }))) },
    { path: 'purchases-reorder', element: <Navigate to="/purchases/reorder" replace /> },
  ],
  navigation: [
    { key: 'purchases-orders', label: 'أوامر الشراء (PO)', to: '/purchases/orders' },
    { key: 'purchases-rfqs', label: 'طلبات عروض الأسعار (RFQ)', to: '/purchases/rfqs' },
    { key: 'purchases-new', label: 'إنشاء فاتورة شراء', to: '/purchases/new' },
    { key: 'purchases', label: 'سجل فواتير المشتريات', to: '/purchases', end: true },
    { key: 'purchases-reorder', label: 'مقترح إعادة الطلب الذكي', to: '/purchases/reorder' },
  ]
};
