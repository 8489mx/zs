import type { FeatureRouteModule } from '@/app/router/types';
import { AuditPage } from '@/features/audit/pages/AuditPage';

export const auditRouteModule: FeatureRouteModule = {
  routes: [{ path: 'audit', element: <AuditPage /> }],
  navigation: [{ key: 'audit', label: 'سجل النشاط', to: '/audit' }]
};
