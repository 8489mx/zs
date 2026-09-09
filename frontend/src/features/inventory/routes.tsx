import { Navigate } from 'react-router-dom';
import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

const inventoryPage = createLazyRoute(() => import('@/features/inventory/pages/InventoryPage').then((module) => ({ default: module.InventoryPage })));
const newIssueOrderPage = createLazyRoute(() => import('@/features/inventory/pages/NewIssueOrderPage').then((module) => ({ default: module.NewIssueOrderPage })));
const warehousesGridPage = createLazyRoute(() => import('@/features/inventory/pages/WarehousesGridPage').then((module) => ({ default: module.WarehousesGridPage })));
const warehouseDetailsPage = createLazyRoute(() => import('@/features/inventory/pages/WarehouseDetailsPage').then((module) => ({ default: module.WarehouseDetailsPage })));
const inventoryTreePage = createLazyRoute(() => import('@/features/inventory/pages/InventoryTreePage').then((module) => ({ default: module.InventoryTreePage })));
const inventoryBatchesPage = createLazyRoute(() => import('@/features/inventory/pages/InventoryBatchesPage').then((module) => ({ default: module.InventoryBatchesPage })));
const warehouseBinsPage = createLazyRoute(() => import('@/features/inventory/pages/WarehouseBinsPage').then((module) => ({ default: module.WarehouseBinsPage })));

export const inventoryRouteModule: FeatureRouteModule = {
  routes: [
    { path: 'inventory', element: inventoryPage },
    { path: 'inventory/bins', element: warehouseBinsPage },
    { path: 'inventory/warehouses', element: warehousesGridPage },
    { path: 'inventory/warehouses-management', element: <Navigate to="/inventory/warehouses" replace /> },
    { path: 'inventory/warehouses/:id', element: warehouseDetailsPage },
    { path: 'inventory/batches', element: inventoryBatchesPage },
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
    { key: 'inventory-batches', label: 'التشغيلات والصلاحيات', to: '/inventory/batches' },
    { key: 'inventory-warehouses', label: 'أماكن المخزون', to: '/inventory/warehouses' },
    { key: 'inventory-bins', label: 'أماكن التخزين والأرفف', to: '/inventory/bins' },
    { key: 'inventory-tree', label: 'شجرة المخازن', to: '/inventory/tree' },
    { key: 'inventory-issue-orders', label: 'سجل أذونات الصرف', to: '/inventory/transfers' },
    { key: 'inventory-issue-order-new', label: 'إذن صرف جديد', to: '/inventory/issue-order/new' }
  ]
};
