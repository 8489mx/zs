import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const hrRouteModule: FeatureRouteModule = {
  routes: [
    { path: 'hr', element: createLazyRoute(() => import('@/features/hr/pages/HrDashboardPage').then((module) => ({ default: module.HrDashboardPage }))) },
    { path: 'hr/employees', element: createLazyRoute(() => import('@/features/hr/pages/EmployeesPage').then((module) => ({ default: module.EmployeesPage }))) },
    { path: 'hr/employees/new', element: createLazyRoute(() => import('@/features/hr/pages/EmployeeCreatePage').then((module) => ({ default: module.EmployeeCreatePage }))) },
    { path: 'hr/employees/:id', element: createLazyRoute(() => import('@/features/hr/pages/EmployeeProfilePage').then((module) => ({ default: module.EmployeeProfilePage }))) },
    { path: 'hr/payroll', element: createLazyRoute(() => import('@/features/hr/pages/PayrollPage').then((module) => ({ default: module.PayrollPage }))) },
    { path: 'hr/payroll/runs/:id', element: createLazyRoute(() => import('@/features/hr/pages/PayrollRunPage').then((module) => ({ default: module.PayrollRunPage }))) },
    { path: 'hr/loans', element: createLazyRoute(() => import('@/features/hr/pages/LoansPage').then((module) => ({ default: module.LoansPage }))) },
    { path: 'hr/documents', element: createLazyRoute(() => import('@/features/hr/pages/DocumentsPage').then((module) => ({ default: module.DocumentsPage }))) },
    { path: 'hr/settings', element: createLazyRoute(() => import('@/features/hr/pages/HrSettingsPage').then((module) => ({ default: module.HrSettingsPage }))) },
  ],
  navigation: [{ key: 'hr', label: 'الموارد البشرية', to: '/hr' }],
};
