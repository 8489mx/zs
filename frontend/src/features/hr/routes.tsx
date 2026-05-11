import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const hrRouteModule: FeatureRouteModule = {
  routes: [
    { path: 'hr', element: createLazyRoute(() => import('@/features/hr/pages/HrComingSoonPage').then((module) => ({ default: module.HrComingSoonPage }))) },
  ],
  navigation: [{ key: 'hr', label: '??????? ???????', to: '/hr' }],
};
