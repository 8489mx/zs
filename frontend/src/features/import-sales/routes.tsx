import type { FeatureRouteModule } from '@/app/router/types';
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

const ImportCommandCenter = lazy(() => import('./ImportCommandCenter'));
const ImportProjectsManager = lazy(() => import('./ImportProjectsManager'));
const ChinaSourcingPage = lazy(() => import('./ChinaSourcingPage'));
const CustomsTariffCalculator = lazy(() => import('./CustomsTariffCalculator'));
const ShipmentsManager = lazy(() => import('./ShipmentsManager'));
const ShipmentDetailsPage = lazy(() => import('./ShipmentDetailsPage'));
const SupplierCredit = lazy(() => import('./SupplierCredit'));
const ProfitPool = lazy(() => import('./ProfitPool'));

export const importSalesRouteModule: FeatureRouteModule = {
  routes: [
    { path: '/import-sales', element: <Navigate to="/import-sales/command-center" replace /> },
    { path: '/import/shipments', element: <Navigate to="/import-sales/command-center" replace /> },
    { path: '/import-sales/command-center', element: <ImportCommandCenter /> },
    { path: '/import-sales/projects', element: <ImportProjectsManager /> },
    { path: '/import-sales/china-sourcing', element: <ChinaSourcingPage /> },
    { path: '/import-sales/shipments', element: <ShipmentsManager /> },
    { path: '/import-sales/shipments/:id', element: <ShipmentDetailsPage /> },
    { path: '/import-sales/compliance', element: <CustomsTariffCalculator /> },
    { path: '/import-sales/supplier-credit', element: <SupplierCredit /> },
    { path: '/import-sales/profit-pool', element: <ProfitPool /> },
  ],
  navigation: [
    { key: 'import-command-center', to: '/import-sales/command-center', label: 'مركز القيادة والعمليات' },
    { key: 'import-projects', to: '/import-sales/projects', label: 'المشاريع والجدوى' },
    { key: 'import-china-sourcing', to: '/import-sales/china-sourcing', label: 'سورسينج ومصانع الصين' },
    { key: 'import-shipments', to: '/import-sales/shipments', label: 'الشحنات والحاويات' },
    { key: 'import-compliance', to: '/import-sales/compliance', label: 'الجمارك ومنظومة ACI' },
    { key: 'import-supplier-credit', to: '/import-sales/supplier-credit', label: 'مديونية الصين (المورد)' },
    { key: 'import-profit-pool', to: '/import-sales/profit-pool', label: 'أرباح الشركاء والإقفال' },
  ],
};
