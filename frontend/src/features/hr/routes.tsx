import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';
import { FeatureGate } from '@/shared/components/feature-gate';

function withHrGate<P = any>(Component: React.ComponentType<P>): React.ComponentType<any> {
  return function HrGated(props: any) {
    return (
      <FeatureGate feature="hr" featureName="الموارد البشرية وشؤون الموظفين">
        <Component {...props} />
      </FeatureGate>
    );
  };
}


export const hrRouteModule: FeatureRouteModule = {
  routes: [
    { path: 'hr', element: createLazyRoute(() => import('@/features/hr/pages/HrOverviewPage').then((module) => ({ default: withHrGate(module.HrOverviewPage) }))) },
    { path: 'hr/employees', element: createLazyRoute(() => import('@/features/hr/pages/EmployeesPage').then((module) => ({ default: withHrGate(module.EmployeesPage) }))) },
    { path: 'hr/employees/new', element: createLazyRoute(() => import('@/features/hr/pages/EmployeeCreatePage').then((module) => ({ default: withHrGate(module.EmployeeCreatePage) }))) },
    { path: 'hr/employees/:id/edit', element: createLazyRoute(() => import('@/features/hr/pages/EmployeeEditPage').then((module) => ({ default: withHrGate(module.EmployeeEditPage) }))) },
    { path: 'hr/employees/:id', element: createLazyRoute(() => import('@/features/hr/pages/EmployeeProfilePage').then((module) => ({ default: withHrGate(module.EmployeeProfilePage) }))) },
    { path: 'hr/employees/:id/print-contract', element: createLazyRoute(() => import('@/features/hr/pages/EmployeeContractPrintPage').then((module) => ({ default: withHrGate(module.EmployeeContractPrintPage) }))) },
    { path: 'hr/settings', element: createLazyRoute(() => import('@/features/hr/pages/HrSettingsPage').then((module) => ({ default: withHrGate(module.HrSettingsPage) }))) },
    { path: 'hr/documents', element: createLazyRoute(() => import('@/features/hr/pages/HrDocumentsPage').then((module) => ({ default: withHrGate(module.HrDocumentsPage) }))) },
    { path: 'hr/loans', element: createLazyRoute(() => import('@/features/hr/pages/HrLoansPage').then((module) => ({ default: withHrGate(module.HrLoansPage) }))) },
    { path: 'hr/payroll', element: createLazyRoute(() => import('@/features/hr/pages/HrPayrollPage').then((module) => ({ default: withHrGate(module.HrPayrollPage) }))) },
    { path: 'hr/attendance', element: createLazyRoute(() => import('@/features/hr/pages/HrAttendancePage').then((module) => ({ default: withHrGate(module.HrAttendancePage) }))) },
    { path: 'hr/leaves', element: createLazyRoute(() => import('@/features/hr/pages/HrLeavesPage').then((module) => ({ default: withHrGate(module.HrLeavesPage) }))) },
    { path: 'hr/assets', element: createLazyRoute(() => import('@/features/hr/pages/HrAssetsPage').then((module) => ({ default: withHrGate(module.HrAssetsPage) }))) },
    { path: 'hr/reports', element: createLazyRoute(() => import('@/features/hr/pages/HrReportsPage').then((module) => ({ default: withHrGate(module.HrReportsPage) }))) },
  ],
  navigation: [{ key: 'hr', label: 'الموارد البشرية', to: '/hr' }],
};
