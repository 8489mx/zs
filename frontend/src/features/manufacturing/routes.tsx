import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const manufacturingRouteModule: FeatureRouteModule = {
  routes: [
    { path: 'manufacturing/boms', element: createLazyRoute(() => import('./pages/BomsListPage').then((m) => ({ default: m.default }))) },
    { path: 'manufacturing/boms/new', element: createLazyRoute(() => import('./pages/NewBomPage').then((m) => ({ default: m.default }))) },
    { path: 'manufacturing/work-orders', element: createLazyRoute(() => import('./pages/WorkOrdersListPage').then((m) => ({ default: m.default }))) },
    { path: 'manufacturing/work-orders/new', element: createLazyRoute(() => import('./pages/NewWorkOrderPage').then((m) => ({ default: m.default }))) },
    { path: 'manufacturing/settings', element: createLazyRoute(() => import('./pages/ManufacturingSettingsPage').then((m) => ({ default: m.default }))) }
  ],
  navigation: [
    { key: 'manufacturing-boms', label: 'قائمة المكونات (BOM)', to: '/manufacturing/boms' },
    { key: 'manufacturing-work-orders', label: 'أوامر الإنتاج', to: '/manufacturing/work-orders' },
    { key: 'manufacturing-settings', label: 'إعدادات التصنيع', to: '/manufacturing/settings' },
  ]
};
