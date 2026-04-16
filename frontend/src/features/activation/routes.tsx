import type { FeatureRouteModule } from '@/app/router/types';
import { createLazyRoute } from '@/app/router/lazy-route';

export const activationRouteModule: FeatureRouteModule = {
  routes: [
    {
      path: 'activate',
      element: createLazyRoute(() => import('@/features/activation/pages/ActivationPage').then((module) => ({ default: module.ActivationPage }))),
    },
    {
      path: 'setup',
      element: createLazyRoute(() => import('@/features/activation/pages/FirstRunSetupPage').then((module) => ({ default: module.FirstRunSetupPage }))),
    },
  ],
  navigation: [],
};
