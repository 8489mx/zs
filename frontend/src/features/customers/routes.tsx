import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const customersRouteModule: FeatureRouteModule = {
  routes: [{ path: 'customers', element: createLazyRoute(() => import('@/features/customers/pages/CustomersPage').then((module) => ({ default: module.CustomersPage }))) }],
  navigation: [{ key: 'customers', label: 'العملاء', to: '/customers' }]
};
