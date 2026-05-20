import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const profileRouteModule: FeatureRouteModule = {
  routes: [
    { path: 'profile', element: createLazyRoute(() => import('@/features/profile/pages/ProfilePage').then((module) => ({ default: module.ProfilePage }))) },
  ],
};
