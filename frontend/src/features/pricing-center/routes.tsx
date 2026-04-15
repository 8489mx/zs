import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const pricingCenterRouteModule: FeatureRouteModule = {
  routes: [{ path: 'pricing-center', element: createLazyRoute(() => import('@/features/pricing-center/pages/PricingCenterPage').then((module) => ({ default: module.PricingCenterPage }))) }],
  navigation: [{ key: 'pricing-center', label: 'مركز التسعير', to: '/pricing-center' }],
};
