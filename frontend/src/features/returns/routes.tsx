import type { FeatureRouteModule } from '@/app/router/types';
import { ReturnsPage } from '@/features/returns/pages/ReturnsPage';

export const returnsRouteModule: FeatureRouteModule = {
  routes: [{ path: 'returns', element: <ReturnsPage /> }],
  navigation: [{ key: 'returns', label: 'المرتجعات', to: '/returns' }]
};
