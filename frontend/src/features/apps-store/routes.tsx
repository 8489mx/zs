import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const appsStoreRouteModule: FeatureRouteModule = {
  routes: [
    {
      path: 'apps',
      element: createLazyRoute(() =>
        import('@/features/apps-store/pages/AppsStorePage').then((module) => ({ default: module.AppsStorePage })),
      ),
    },
    {
      path: 'apps-store',
      element: createLazyRoute(() =>
        import('@/features/apps-store/pages/AppsStorePage').then((module) => ({ default: module.AppsStorePage })),
      ),
    },
  ],
  navigation: [{ key: 'apps', label: 'متجر التطبيقات', to: '/apps' }],
};
