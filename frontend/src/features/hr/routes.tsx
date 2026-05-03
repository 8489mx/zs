import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const hrRouteModule: FeatureRouteModule = {
  routes: [{ path: 'hr', element: createLazyRoute(() => import('@/features/hr/pages/HrPage').then((module) => ({ default: module.HrPage }))) }],
  navigation: [{ key: 'hr', label: 'الموارد البشرية', to: '/hr' }]
};
