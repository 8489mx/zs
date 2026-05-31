import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const saasAdminRouteModule: FeatureRouteModule = {
  routes: [
    {
      path: 'saas-admin/tenants',
      element: createLazyRoute(() => import('@/features/saas-admin/pages/SaasTenantsPage').then((module) => ({ default: module.SaasTenantsPage }))),
    },
  ],
  navigation: [
    {
      key: 'saas-admin-tenants',
      label: 'إدارة النسخ',
      to: '/saas-admin/tenants',
      platformOnly: true,
    },
  ],
};
