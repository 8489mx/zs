import { Navigate } from 'react-router-dom';
import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

const reportsPage = createLazyRoute(() => import('@/features/reports/pages/ReportsPage').then((module) => ({ default: module.ReportsPage })));

export const reportsRouteModule: FeatureRouteModule = {
  routes: [
    { path: 'reports', element: <Navigate to="/reports/overview" replace /> },
    { path: 'reports/:section', element: reportsPage }
  ],
  navigation: [{ key: 'reports', label: 'التقارير', to: '/reports' }]
};
