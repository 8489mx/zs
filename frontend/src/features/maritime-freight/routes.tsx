import React from 'react';
import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';
import { FeatureGate } from '@/shared/components/feature-gate';
import { MaritimeLayout } from './pages/MaritimeLayout';

const wrapMaritime = (Component: React.ComponentType) => (
  <FeatureGate feature="maritime_freight" featureName="الشحن البحري واللوجستيات">
    <MaritimeLayout>
      <Component />
    </MaritimeLayout>
  </FeatureGate>
);

export const maritimeFreightRouteModule: FeatureRouteModule = {
  routes: [
    {
      path: 'maritime',
      element: createLazyRoute(() =>
        import('./pages/MaritimeInquiriesPage').then((m) => ({
          default: () => wrapMaritime(m.MaritimeInquiriesPage),
        })),
      ),
    },
    {
      path: 'maritime/inquiries',
      element: createLazyRoute(() =>
        import('./pages/MaritimeInquiriesPage').then((m) => ({
          default: () => wrapMaritime(m.MaritimeInquiriesPage),
        })),
      ),
    },
    {
      path: 'maritime/rfqs',
      element: createLazyRoute(() =>
        import('./pages/MaritimeRfqsPage').then((m) => ({
          default: () => wrapMaritime(m.MaritimeRfqsPage),
        })),
      ),
    },
    {
      path: 'maritime/matrix',
      element: createLazyRoute(() =>
        import('./pages/MaritimeMatrixPage').then((m) => ({
          default: () => wrapMaritime(m.MaritimeMatrixPage),
        })),
      ),
    },
    {
      path: 'maritime/quotations',
      element: createLazyRoute(() =>
        import('./pages/MaritimeQuotationsPage').then((m) => ({
          default: () => wrapMaritime(m.MaritimeQuotationsPage),
        })),
      ),
    },
    {
      path: 'maritime/jobs',
      element: createLazyRoute(() =>
        import('./pages/MaritimeJobsPage').then((m) => ({
          default: () => wrapMaritime(m.MaritimeJobsPage),
        })),
      ),
    },
    {
      path: 'maritime/containers',
      element: createLazyRoute(() =>
        import('./pages/MaritimeContainersPage').then((m) => ({
          default: () => wrapMaritime(m.MaritimeContainersPage),
        })),
      ),
    },
    {
      path: 'maritime/lines',
      element: createLazyRoute(() =>
        import('./pages/MaritimeLinesPage').then((m) => ({
          default: () => wrapMaritime(m.MaritimeLinesPage),
        })),
      ),
    },
    {
      path: 'maritime/master',
      element: createLazyRoute(() =>
        import('./pages/MaritimeLinesPage').then((m) => ({
          default: () => wrapMaritime(m.MaritimeLinesPage),
        })),
      ),
    },
    {
      path: 'maritime/settings',
      element: createLazyRoute(() =>
        import('./pages/MaritimeSettingsPage').then((m) => ({
          default: () => wrapMaritime(m.MaritimeSettingsPage),
        })),
      ),
    },
  ],
  navigation: [
    { key: 'maritime-inquiries', label: 'طلبات الشحن (Inquiries)', to: '/maritime/inquiries' },
    { key: 'maritime-rfqs', label: 'طلبات التسعير (RFQs)', to: '/maritime/rfqs' },
    { key: 'maritime-matrix', label: 'مصفوفة مقارنة العروض', to: '/maritime/matrix' },
    { key: 'maritime-quotations', label: 'عروض أسعار العملاء', to: '/maritime/quotations' },
    { key: 'maritime-jobs', label: 'أوامر التشغيل والعمليات', to: '/maritime/jobs' },
    { key: 'maritime-containers', label: 'الحاويات وفترة السماح', to: '/maritime/containers' },
    { key: 'maritime-lines', label: 'دليل الخطوط والموانئ', to: '/maritime/lines' },
    { key: 'maritime-settings', label: 'إعدادات البريد والأتمتة', to: '/maritime/settings' },
  ],
};
