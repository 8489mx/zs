import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const approvalsRouteModule: FeatureRouteModule = {
  routes: [
    {
      path: 'approvals',
      element: createLazyRoute(() =>
        import('@/features/approvals/pages/ApprovalsWorkspacePage').then((module) => ({
          default: module.ApprovalsWorkspacePage,
        }))
      ),
    },
  ],
  navigation: [
    { key: 'approvals', label: 'مركز الموافقات والاعتماد', to: '/approvals' },
  ],
};
