import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const dashboardRouteModule: FeatureRouteModule = {
  routes: [{ path: '', index: true, element: createLazyRoute(() => import('@/features/dashboard/pages/DashboardPage').then((module) => ({ default: module.DashboardPage }))) }],
  navigation: [{ key: 'dashboard', label: 'الرئيسية', to: '/' }]
};
