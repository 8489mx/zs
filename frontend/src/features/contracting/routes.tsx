import React from 'react';
import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';
import { FeatureGate } from '@/shared/components/feature-gate';
const wrapContractingIndependent = (Component: React.ComponentType) => (
  <FeatureGate feature="contracting" featureName="المقاولات وإدارة المشاريع الإنشائية">
    <Component />
  </FeatureGate>
);

const ContractingWorkspaceLazy = createLazyRoute(() =>
  import('./pages/ContractingLayout').then((m) => ({
    default: () => (
      <FeatureGate feature="contracting" featureName="المقاولات وإدارة المشاريع الإنشائية">
        <m.ContractingLayout />
      </FeatureGate>
    ),
  })),
);

export const contractingRouteModule: FeatureRouteModule = {
  routes: [
    {
      path: 'contracting/master-boq',
      element: createLazyRoute(() =>
        import('./pages/ContractingMasterBoqPage').then((m) => ({
          default: () => wrapContractingIndependent(m.ContractingMasterBoqPage),
        })),
      ),
    },
    {
      path: 'contracting',
      element: ContractingWorkspaceLazy,
    },
    {
      path: 'contracting/*',
      element: ContractingWorkspaceLazy,
    },
  ],
  navigation: [
    { key: 'contracting-projects', label: 'سجل المشاريع الإنشائية', to: '/contracting/projects' },
    { key: 'contracting-boq', label: 'جدول الكميات والمقايسات (SOV)', to: '/contracting/boq' },
    { key: 'contracting-financials', label: 'المالية والمستخلصات (IPC)', to: '/contracting/financials' },
    { key: 'contracting-procurement', label: 'مقاولو الباطن والتوريدات', to: '/contracting/procurement' },
    { key: 'contracting-field', label: 'الميدان والجدول الزمني', to: '/contracting/field' },
    { key: 'contracting-master-boq', label: 'إعدادات وبنك بنود المقاولات', to: '/contracting/master-boq' },
  ],
};
