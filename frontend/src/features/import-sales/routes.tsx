import type { FeatureRouteModule } from '@/app/router/types';
import { lazy } from 'react';

const ShipmentsManager = lazy(() => import('./ShipmentsManager'));
const SupplierCredit = lazy(() => import('./SupplierCredit'));

const MerchantDebts = () => <div style={{padding: '2rem'}}>ديون التجار والدفعات (جاري العمل عليها)</div>;
const ProfitPool = () => <div style={{padding: '2rem'}}>مجمع الأرباح المحاسبي (جاري العمل عليها)</div>;

export const importSalesRouteModule: FeatureRouteModule = {
  routes: [
    { path: '/import-sales/shipments', element: <ShipmentsManager /> },
    { path: '/import-sales/supplier-credit', element: <SupplierCredit /> },
    { path: '/import-sales/merchant-debts', element: <MerchantDebts /> },
    { path: '/import-sales/profit-pool', element: <ProfitPool /> },
  ],
  navigation: [
    { key: 'import-shipments', to: '/import-sales/shipments', label: 'إدارة الحاويات والشحن' },
    { key: 'import-supplier-credit', to: '/import-sales/supplier-credit', label: 'مديونية الصين (المورد)' },
    { key: 'import-merchant-debts', to: '/import-sales/merchant-debts', label: 'ديون التجار والدفعات' },
    { key: 'import-profit-pool', to: '/import-sales/profit-pool', label: 'أرباح الشركاء (نهاية المدة)' },
  ],
};
