import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const tradeInRouteModule: FeatureRouteModule = {
  routes: [
    {
      path: 'trade-in',
      element: createLazyRoute(() =>
        import('./pages/TradeInPage').then((m) => ({ default: m.TradeInPage })),
      ),
    },
  ],
  navigation: [{ key: 'trade-in', label: 'شراء المستعمل', to: '/trade-in' }],
};
