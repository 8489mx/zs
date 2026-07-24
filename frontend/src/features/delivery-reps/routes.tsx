import { lazy } from 'react';
import type { FeatureRouteModule } from '@/app/router/types';

const DeliveryRepsPage = lazy(() => import('./pages/DeliveryRepsPage'));

export const deliveryRepsRoutes: FeatureRouteModule = {
  routes: [
    {
      path: 'delivery-reps',
      element: <DeliveryRepsPage />,
    },
  ],
  navigation: [{ key: 'delivery-reps', label: 'إدارة المناديب', to: '/delivery-reps' }]
};
