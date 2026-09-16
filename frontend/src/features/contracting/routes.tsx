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
    { key: 'contracting-projects', label: 'سجل المشاريع', to: '/contracting/projects' },
    { key: 'contracting-tender', label: 'التسعير والعطاءات', to: '/contracting/tender' },
    { key: 'contracting-boq', label: 'المقايسة والميزانية', to: '/contracting/boq' },
    { key: 'contracting-planning', label: 'التجهيز والجدول الزمني', to: '/contracting/planning' },
    { key: 'contracting-procurement', label: 'المشتريات ومقاولو الباطن', to: '/contracting/procurement' },
    { key: 'contracting-field', label: 'الميدان وضبط الجودة', to: '/contracting/field' },
    { key: 'contracting-financials', label: 'المستخلصات والمالية', to: '/contracting/financials' },
    { key: 'contracting-closeout', label: 'التسليم والإغلاق', to: '/contracting/closeout' },
    { key: 'contracting-master-boq', label: 'بنك بنود المقاولات', to: '/contracting/master-boq' },
  ],
};
