import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

const inventoryPage = createLazyRoute(() => import('@/features/inventory/pages/InventoryPage').then((module) => ({ default: module.InventoryPage })));
const newIssueOrderPage = createLazyRoute(() => import('@/features/inventory/pages/NewIssueOrderPage').then((module) => ({ default: module.NewIssueOrderPage })));
const warehousesGridPage = createLazyRoute(() => import('@/features/inventory/pages/WarehousesGridPage').then((module) => ({ default: module.WarehousesGridPage })));
const warehouseDetailsPage = createLazyRoute(() => import('@/features/inventory/pages/WarehouseDetailsPage').then((module) => ({ default: module.WarehouseDetailsPage })));

export const inventoryRouteModule: FeatureRouteModule = {
  routes: [
    { path: 'inventory', element: inventoryPage },
    { path: 'inventory/warehouses', element: warehousesGridPage },
    { path: 'inventory/warehouses/:id', element: warehouseDetailsPage },
    { path: 'inventory/issue-order/new', element: newIssueOrderPage },
    { path: 'inventory/:section', element: inventoryPage }
  ],
  navigation: [
    { key: 'inventory', label: 'المخزون', to: '/inventory', end: true },
    { key: 'inventory-warehouses', label: 'المخازن', to: '/inventory/warehouses' },
    { key: 'inventory-issue-order-new', label: 'إذن صرف جديد', to: '/inventory/issue-order/new' },
    { key: 'inventory-issue-orders', label: 'سجل أذونات الصرف', to: '/inventory/transfers' }
  ]
};
