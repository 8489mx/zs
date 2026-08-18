import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const maintenanceRouteModule: FeatureRouteModule = {
  routes: [
    {
      path: 'maintenance',
      element: createLazyRoute(() =>
        import('./pages/MaintenanceTicketsPage').then((m) => ({ default: m.MaintenanceTicketsPage })),
      ),
    },
  ],
  navigation: [{ key: 'maintenance', label: 'قسم الصيانة', to: '/maintenance' }],
};
