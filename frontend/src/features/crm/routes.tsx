import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const crmRouteModule: FeatureRouteModule = {
  routes: [
    {
      path: 'crm',
      element: createLazyRoute(() =>
        import('@/features/crm/pages/CrmPipelinePage').then((module) => ({
          default: module.CrmPipelinePage,
        }))
      ),
    },
  ],
  navigation: [
    { key: 'crm', label: 'إدارة علاقات العملاء (CRM)', to: '/crm' },
  ],
};
