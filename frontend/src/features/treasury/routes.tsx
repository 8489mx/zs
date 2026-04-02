import type { FeatureRouteModule } from '@/app/router/types';
import { TreasuryPage } from '@/features/treasury/pages/TreasuryPage';

export const treasuryRouteModule: FeatureRouteModule = {
  routes: [{ path: 'treasury', element: <TreasuryPage /> }],
  navigation: [{ key: 'treasury', label: 'الخزينة', to: '/treasury' }]
};
