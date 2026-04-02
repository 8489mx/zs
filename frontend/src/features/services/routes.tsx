import type { FeatureRouteModule } from '@/app/router/types';
import { ServicesPage } from '@/features/services/pages/ServicesPage';

export const servicesRouteModule: FeatureRouteModule = {
  routes: [{ path: 'services', element: <ServicesPage /> }],
  navigation: [{ key: 'services', label: 'الخدمات', to: '/services' }]
};
