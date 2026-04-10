import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

const inventoryPage = createLazyRoute(() => import('@/features/inventory/pages/InventoryPage').then((module) => ({ default: module.InventoryPage })));

export const inventoryRouteModule: FeatureRouteModule = {
  routes: [
    { path: 'inventory', element: inventoryPage },
    { path: 'inventory/:section', element: inventoryPage }
  ],
  navigation: [{ key: 'inventory', label: 'المخزون', to: '/inventory' }]
};
