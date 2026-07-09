import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const saasAdminRouteModule: FeatureRouteModule = {
  routes: [
    {
      path: 'saas-admin/tenants',
      element: createLazyRoute(() => import('@/features/saas-admin/pages/SaasTenantsPage').then((module) => ({ default: module.SaasTenantsPage }))),
    },
    {
      path: 'saas-admin/offline-releases',
      element: createLazyRoute(() => import('@/features/settings/pages/OfflineReleasesPage').then((module) => ({ default: module.OfflineReleasesPage }))),
    },
    {
      path: 'saas-admin/plans',
      element: createLazyRoute(() => import('@/features/saas-admin/pages/SaasPlansPage').then((module) => ({ default: module.SaasPlansPage }))),
    },
  ],
  navigation: [
    {
      key: 'saas-admin-tenants',
      label: 'إدارة النسخ',
      to: '/saas-admin/tenants',
      platformOnly: true,
    },
    {
      key: 'saas-admin-plans',
      label: 'باقات الاشتراك',
      to: '/saas-admin/plans',
      platformOnly: true,
    },
    {
      key: 'saas-admin-offline-releases',
      label: 'إدارة الإصدارات',
      to: '/saas-admin/offline-releases',
      platformOnly: true,
    },
  ],
};
