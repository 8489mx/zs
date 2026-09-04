import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';
import { FeatureGate } from '@/shared/components/feature-gate';

export const maintenanceRouteModule: FeatureRouteModule = {
  routes: [
    {
      path: 'maintenance',
      element: createLazyRoute(() =>
        import('./pages/MaintenanceTicketsPage').then((m) => ({
          default: () => (
            <FeatureGate feature="maintenance" featureName="الصيانة والدعم الفني">
              <m.MaintenanceTicketsPage />
            </FeatureGate>
          ),
        })),
      ),
    },
  ],
  navigation: [{ key: 'maintenance', label: 'قسم الصيانة', to: '/maintenance' }],
};
