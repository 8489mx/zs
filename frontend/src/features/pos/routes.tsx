import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';
import { FeatureGate } from '@/shared/components/feature-gate';

export const posRouteModule: FeatureRouteModule = {
  routes: [
    {
      path: 'pos',
      element: createLazyRoute(() =>
        import('@/features/pos/pages/PosPage').then((module) => ({
          default: () => (
            <FeatureGate feature="sales" featureName="نقطة البيع والكاشير">
              <module.PosPage />
            </FeatureGate>
          ),
        })),
      ),
    },
  ],
  navigation: [{ key: 'pos', label: 'الكاشير', to: '/pos' }],
};

