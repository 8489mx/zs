import { lazy } from 'react';
import type { FeatureRouteModule } from '@/app/router/types';

const DeliveryRepsPage = lazy(() => import('./pages/DeliveryRepsPage'));
const DeliveryDriverMobilePage = lazy(() =>
  import('./pages/DeliveryDriverMobilePage').then((m) => ({ default: m.DeliveryDriverMobilePage }))
);
const VanSalesAdminManagementPage = lazy(() => import('./pages/VanSalesAdminManagementPage'));

export const deliveryRepsRoutes: FeatureRouteModule = {
  routes: [
    {
      path: 'delivery-reps',
      element: <DeliveryRepsPage />,
    },
    {
      path: 'driver-mobile',
      element: <DeliveryDriverMobilePage />,
    },
    {
      path: 'van-sales/admin',
      element: <VanSalesAdminManagementPage />,
    },
    {
      path: 'inventory/van-sales',
      element: <VanSalesAdminManagementPage />,
    },
  ],
  navigation: [
    { key: 'delivery-reps', label: 'إدارة المناديب', to: '/delivery-reps' },
    { key: 'driver-mobile', label: 'شاشة المندوب', to: '/driver-mobile' },
    { key: 'van-sales-admin', label: 'سيارات التوزيع (الفان)', to: '/inventory/van-sales' },
  ]
};

