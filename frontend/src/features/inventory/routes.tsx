import { Navigate } from 'react-router-dom';
import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

const inventoryPage = createLazyRoute(() => import('@/features/inventory/pages/InventoryPage').then((module) => ({ default: module.InventoryPage })));
const newIssueOrderPage = createLazyRoute(() => import('@/features/inventory/pages/NewIssueOrderPage').then((module) => ({ default: module.NewIssueOrderPage })));
const warehousesGridPage = createLazyRoute(() => import('@/features/inventory/pages/WarehousesGridPage').then((module) => ({ default: module.WarehousesGridPage })));
const warehouseDetailsPage = createLazyRoute(() => import('@/features/inventory/pages/WarehouseDetailsPage').then((module) => ({ default: module.WarehouseDetailsPage })));
const inventoryTreePage = createLazyRoute(() => import('@/features/inventory/pages/InventoryTreePage').then((module) => ({ default: module.InventoryTreePage })));

export const inventoryRouteModule: FeatureRouteModule = {
  routes: [
    { path: 'inventory', element: inventoryPage },
    { path: 'inventory/warehouses', element: warehousesGridPage },
    { path: 'inventory/warehouses-management', element: <Navigate to="/inventory/warehouses" replace /> },
    { path: 'inventory/warehouses/:id', element: warehouseDetailsPage },
    { path: 'inventory/issue-order/new', element: newIssueOrderPage },
    { path: 'inventory/tree', element: inventoryTreePage },
    { path: 'inventory/:section', element: inventoryPage }
  ],
  navigation: [
    { 
      key: 'inventory', 
      label: 'المخزون والأصناف', 
      to: '/inventory', 
      end: true,
      activePaths: [
        '/inventory/overview',
        '/inventory/counts',
        '/inventory/damaged',
        '/inventory/movements'
      ]
    },
    { key: 'inventory-warehouses', label: 'أماكن المخزون', to: '/inventory/warehouses' },
    { key: 'inventory-tree', label: 'شجرة المخازن', to: '/inventory/tree' },
    { key: 'inventory-issue-order-new', label: 'إذن صرف جديد', to: '/inventory/issue-order/new' },
    { key: 'inventory-issue-orders', label: 'سجل أذونات الصرف', to: '/inventory/transfers' }
  ]
};
