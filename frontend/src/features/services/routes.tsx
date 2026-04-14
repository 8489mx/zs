import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const servicesRouteModule: FeatureRouteModule = {
  routes: [{ path: 'services', element: createLazyRoute(() => import('@/features/services/pages/ServicesPage').then((module) => ({ default: module.ServicesPage }))) }],
  navigation: [{ key: 'services', label: 'الخدمات', to: '/services' }]
};
