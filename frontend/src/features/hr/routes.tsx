import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const hrRouteModule: FeatureRouteModule = {
  routes: [
    { path: 'hr', element: createLazyRoute(() => import('@/features/hr/pages/HrComingSoonPage').then((module) => ({ default: module.HrComingSoonPage }))) },
    { path: 'hr/employees', element: createLazyRoute(() => import('@/features/hr/pages/EmployeesPage').then((module) => ({ default: module.EmployeesPage }))) },
    { path: 'hr/employees/new', element: createLazyRoute(() => import('@/features/hr/pages/EmployeeCreatePage').then((module) => ({ default: module.EmployeeCreatePage }))) },
    { path: 'hr/employees/:id', element: createLazyRoute(() => import('@/features/hr/pages/EmployeeProfilePage').then((module) => ({ default: module.EmployeeProfilePage }))) },
    { path: 'hr/settings', element: createLazyRoute(() => import('@/features/hr/pages/HrSettingsPage').then((module) => ({ default: module.HrSettingsPage }))) },
    { path: 'hr/documents', element: createLazyRoute(() => import('@/features/hr/pages/HrDocumentsPage').then((module) => ({ default: module.HrDocumentsPage }))) },
    { path: 'hr/loans', element: createLazyRoute(() => import('@/features/hr/pages/HrLoansPage').then((module) => ({ default: module.HrLoansPage }))) },
    { path: 'hr/payroll', element: createLazyRoute(() => import('@/features/hr/pages/HrPayrollPage').then((module) => ({ default: module.HrPayrollPage }))) },
    { path: 'hr/attendance', element: createLazyRoute(() => import('@/features/hr/pages/HrAttendancePage').then((module) => ({ default: module.HrAttendancePage }))) },
    { path: 'hr/leaves', element: createLazyRoute(() => import('@/features/hr/pages/HrLeavesPage').then((module) => ({ default: module.HrLeavesPage }))) },
  ],
  navigation: [{ key: 'hr', label: 'الموارد البشرية', to: '/hr' }],
};




