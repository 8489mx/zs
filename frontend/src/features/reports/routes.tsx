import { Navigate } from 'react-router-dom';
import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

const reportsPage = createLazyRoute(() => import('@/features/reports/pages/ReportsPage').then((module) => ({ default: module.ReportsPage })));
const pivotBuilderPage = createLazyRoute(() => import('@/features/reports/pages/PivotBuilderPage').then((module) => ({ default: module.PivotBuilderPage })));

export const reportsRouteModule: FeatureRouteModule = {
  routes: [
    { path: 'reports', element: <Navigate to="/reports/overview" replace /> },
    { path: 'reports/overview', element: reportsPage },
    { path: 'reports/pivot-builder', element: pivotBuilderPage },
    { path: 'reports/:section', element: reportsPage }
  ],
  navigation: [
    { key: 'reports-overview', label: 'ملخص الأرباح والأداء', to: '/reports/overview' },
    { key: 'reports-pivot-builder', label: 'التقارير المحورية المرنة (BI Pivot)', to: '/reports/pivot-builder' },
    { key: 'reports-sales', label: 'تقارير المبيعات', to: '/reports/sales' },
    { key: 'reports-treasury', label: 'الخزينة والمصروفات', to: '/reports/treasury' },
    { key: 'reports-inventory', label: 'تقارير المخزون', to: '/reports/inventory' },
    { key: 'reports-purchases', label: 'تقارير المشتريات', to: '/reports/purchases' },
    { key: 'reports-balances', label: 'أرصدة وذمم الحسابات', to: '/reports/balances' },
    { key: 'reports-employees', label: 'تقارير الموظفين', to: '/reports/employees' },
  ]
};

