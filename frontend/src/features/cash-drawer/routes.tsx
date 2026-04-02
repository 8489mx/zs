import type { FeatureRouteModule } from '@/app/router/types';
import { CashDrawerPage } from '@/features/cash-drawer/pages/CashDrawerPage';

export const cashDrawerRouteModule: FeatureRouteModule = {
  routes: [{ path: 'cash-drawer', element: <CashDrawerPage /> }],
  navigation: [{ key: 'cash-drawer', label: 'الورديات والدرج النقدي', to: '/cash-drawer' }]
};
