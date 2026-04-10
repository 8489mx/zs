import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const posRouteModule: FeatureRouteModule = {
  routes: [{ path: 'pos', element: createLazyRoute(() => import('@/features/pos/pages/PosPage').then((module) => ({ default: module.PosPage }))) }],
  navigation: [{ key: 'pos', label: 'الكاشير', to: '/pos' }]
};
