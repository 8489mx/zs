import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const auditRouteModule: FeatureRouteModule = {
  routes: [{ path: 'audit', element: createLazyRoute(() => import('@/features/audit/pages/AuditPage').then((module) => ({ default: module.AuditPage }))) }],
  navigation: [{ key: 'audit', label: 'سجل النشاط', to: '/audit' }]
};
