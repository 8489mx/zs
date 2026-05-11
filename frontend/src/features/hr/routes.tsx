import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const hrRouteModule: FeatureRouteModule = {
  routes: [
    { path: 'hr', element: createLazyRoute(() => import('@/features/hr/pages/HrComingSoonPage').then((module) => ({ default: module.HrComingSoonPage }))) },
    { path: 'hr/employees', element: createLazyRoute(() => import('@/features/hr/pages/EmployeesPage').then((module) => ({ default: module.EmployeesPage }))) },
    { path: 'hr/employees/new', element: createLazyRoute(() => import('@/features/hr/pages/EmployeeCreatePage').then((module) => ({ default: module.EmployeeCreatePage }))) },
  ],
  navigation: [{ key: 'hr', label: 'الموارد البشرية', to: '/hr' }],
};
