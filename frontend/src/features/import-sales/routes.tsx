import type { FeatureRouteModule } from '@/app/router/types';
import { lazy } from 'react';

const ShipmentsManager = lazy(() => import('./ShipmentsManager'));
const ShipmentDetailsPage = lazy(() => import('./ShipmentDetailsPage'));
const SupplierCredit = lazy(() => import('./SupplierCredit'));
const ProfitPool = lazy(() => import('./ProfitPool'));

export const importSalesRouteModule: FeatureRouteModule = {
  routes: [
    { path: '/import-sales/shipments', element: <ShipmentsManager /> },
    { path: '/import-sales/shipments/:id', element: <ShipmentDetailsPage /> },
    { path: '/import-sales/supplier-credit', element: <SupplierCredit /> },
    { path: '/import-sales/profit-pool', element: <ProfitPool /> },
  ],
  navigation: [
    { key: 'import-shipments', to: '/import-sales/shipments', label: 'إدارة الحاويات والشحن' },
    { key: 'import-supplier-credit', to: '/import-sales/supplier-credit', label: 'مديونية الصين (المورد)' },
    { key: 'import-profit-pool', to: '/import-sales/profit-pool', label: 'أرباح الشركاء (نهاية المدة)' },
  ],
};
