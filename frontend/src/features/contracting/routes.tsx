import { useTranslation } from 'react-i18next';
import React from 'react';
import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';
import { FeatureGate } from '@/shared/components/feature-gate';

function ContractingIndependentGated({ Component }: { Component: React.ComponentType }) {
  const { t } = useTranslation();
  return (
    <FeatureGate feature="contracting" featureName={t('contracting.routes.s0', "المقاولات وإدارة المشاريع الإنشائية")}>
      <Component />
    </FeatureGate>
  );
}

const ContractingWorkspaceLazy = createLazyRoute(() =>
  import('./pages/ContractingLayout').then((m) => ({
    default: function ContractingWorkspaceGated() {
      const { t } = useTranslation();
      return (
        <FeatureGate feature="contracting" featureName={t('contracting.routes.s0', "المقاولات وإدارة المشاريع الإنشائية")}>
          <m.ContractingLayout />
        </FeatureGate>
      );
    },
  })),
);

export const contractingRouteModule: FeatureRouteModule = {
  routes: [
    {
      path: 'contracting/master-boq',
      element: createLazyRoute(() =>
        import('./pages/ContractingMasterBoqPage').then((m) => ({
          default: () => <ContractingIndependentGated Component={m.ContractingMasterBoqPage} />,
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
