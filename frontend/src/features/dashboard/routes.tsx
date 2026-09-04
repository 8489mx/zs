import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const dashboardRouteModule: FeatureRouteModule = {
  routes: [
    { path: '', index: true, element: createLazyRoute(() => import('@/features/dashboard/pages/DashboardPage').then((module) => ({ default: module.DashboardPage }))) },
    { path: 'owner-companion', element: createLazyRoute(() => import('@/features/dashboard/pages/OwnerCompanionPage').then((module) => ({ default: module.OwnerCompanionPage }))) },
    { path: 'owner-mobile', element: createLazyRoute(() => import('@/features/dashboard/pages/OwnerMobileDashboardPage').then((module) => ({ default: module.OwnerMobileDashboardPage }))) },
    { path: 'mobile/owner', element: createLazyRoute(() => import('@/features/dashboard/pages/OwnerMobileDashboardPage').then((module) => ({ default: module.OwnerMobileDashboardPage }))) },
  ],
  navigation: [
    { key: 'dashboard', label: 'الرئيسية', to: '/' },
    { key: 'owner-companion', label: 'متابعة المالك', to: '/owner-companion' },
    { key: 'owner-mobile', label: 'لوحة المالك (موبايل) 📱', to: '/owner-mobile' },
  ]
};
