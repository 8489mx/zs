import type { FeatureRouteModule } from '@/app/router/types';
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

const ImportCommandCenter = lazy(() => import('./ImportCommandCenter'));
const ImportProjectsManager = lazy(() => import('./ImportProjectsManager'));
const ChinaSourcingPage = lazy(() => import('./ChinaSourcingPage'));
const CustomsTariffCalculator = lazy(() => import('./CustomsTariffCalculator'));
const ShipmentsManager = lazy(() => import('./ShipmentsManager'));
const ShipmentDetailsPage = lazy(() => import('./ShipmentDetailsPage'));
const CustomsBrokerManager = lazy(() => import('./CustomsBrokerManager').then(m => ({ default: m.CustomsBrokerManager })));
const ContainerDepositsManager = lazy(() => import('./ContainerDepositsManager').then(m => ({ default: m.ContainerDepositsManager })));
const SupplierCredit = lazy(() => import('./SupplierCredit'));
const ImportFxTreasuryManager = lazy(() => import('./ImportFxTreasuryManager'));
const ImportApprovalsManager = lazy(() => import('./ImportApprovalsManager'));
const ImportReconciliationManager = lazy(() => import('./ImportReconciliationManager'));
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
    { path: '/import-sales/customs-brokers', element: <CustomsBrokerManager /> },
    { path: '/import-sales/container-deposits', element: <ContainerDepositsManager /> },
    { path: '/import-sales/supplier-credit', element: <SupplierCredit /> },
    { path: '/import-sales/fx-treasury', element: <ImportFxTreasuryManager /> },
    { path: '/import-sales/approvals', element: <ImportApprovalsManager /> },
    { path: '/import-sales/reconciliation', element: <ImportReconciliationManager /> },
    { path: '/import-sales/profit-pool', element: <ProfitPool /> },
  ],
  navigation: [
    { key: 'import-command-center', to: '/import-sales/command-center', label: 'مركز القيادة والعمليات' },
    { key: 'import-projects', to: '/import-sales/projects', label: 'المشاريع ودراسة الجدوى' },
    { key: 'import-china-sourcing', to: '/import-sales/china-sourcing', label: 'سورسينج ومصانع الصين' },
    { key: 'import-shipments', to: '/import-sales/shipments', label: 'الشحنات والحاويات' },
    { key: 'import-compliance', to: '/import-sales/compliance', label: 'الجمارك ومنظومة ACI' },
    { key: 'import-customs-brokers', to: '/import-sales/customs-brokers', label: 'المخلصين الجمركيين والعهد' },
    { key: 'import-container-deposits', to: '/import-sales/container-deposits', label: 'تأمينات الحاويات للخطوط' },
    { key: 'import-supplier-credit', to: '/import-sales/supplier-credit', label: 'مديونية الموردين والحوالات' },
    { key: 'import-fx-treasury', to: '/import-sales/fx-treasury', label: 'محفظة النقد الأجنبي (FX)' },
    { key: 'import-approvals', to: '/import-sales/approvals', label: 'مركز الرقابة والموافقات' },
    { key: 'import-reconciliation', to: '/import-sales/reconciliation', label: 'مطابقة الاستيراد وتسوية الفروقات' },
    { key: 'import-profit-pool', to: '/import-sales/profit-pool', label: 'أرباح الشركاء والإقفال' },
  ],
};
