import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const dashboardRouteModule: FeatureRouteModule = {
  routes: [
    { path: '', index: true, element: createLazyRoute(() => import('@/features/dashboard/pages/DashboardPage').then((module) => ({ default: module.DashboardPage }))) },
    { path: 'owner-companion', element: createLazyRoute(() => import('@/features/dashboard/pages/OwnerCompanionPage').then((module) => ({ default: module.OwnerCompanionPage }))) },
  ],
  navigation: [
    { key: 'dashboard', label: 'الرئيسية', to: '/' },
    { key: 'owner-companion', label: 'متابعة المالك', to: '/owner-companion' },
  ]
};
