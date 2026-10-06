import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';
import { FeatureGate } from '@/shared/components/feature-gate';

const MaritimeWorkspaceLazy = createLazyRoute(() =>
  import('./pages/MaritimeLayout').then((m) => ({
    default: () => (
      <FeatureGate feature="maritime_freight" featureName="الشحن واللوجستيات">
        <m.MaritimeLayout />
      </FeatureGate>
    ),
  })),
);

export const maritimeFreightRouteModule: FeatureRouteModule = {
  routes: [
    {
      path: 'maritime/dashboard',
      element: MaritimeWorkspaceLazy,
    },
    {
      path: 'maritime/inquiries',
      element: MaritimeWorkspaceLazy,
    },
    {
      path: 'maritime/rfqs',
      element: MaritimeWorkspaceLazy,
    },
    {
      path: 'maritime/matrix',
      element: MaritimeWorkspaceLazy,
    },
    {
      path: 'maritime/quotations',
      element: MaritimeWorkspaceLazy,
    },
    {
      path: 'maritime/jobs',
      element: MaritimeWorkspaceLazy,
    },
    {
      path: 'maritime/radar',
      element: MaritimeWorkspaceLazy,
    },
    {
      path: 'maritime/audit',
      element: MaritimeWorkspaceLazy,
    },
    {
      path: 'maritime/containers',
      element: MaritimeWorkspaceLazy,
    },
    {
      path: 'maritime/lines',
      element: MaritimeWorkspaceLazy,
    },
    {
      path: 'maritime/settings',
      element: MaritimeWorkspaceLazy,
    },
    {
      path: 'maritime',
      element: MaritimeWorkspaceLazy,
    },
    {
      path: 'maritime/*',
      element: MaritimeWorkspaceLazy,
    },
    {
      path: 'maritime-freight',
      element: MaritimeWorkspaceLazy,
    },
    {
      path: 'maritime-freight/*',
      element: MaritimeWorkspaceLazy,
    },
  ],
  navigation: [
    { key: 'maritime-dashboard', label: 'لوحة المؤشرات والتحليلات', to: '/maritime/dashboard' },
    { key: 'maritime-inquiries', label: 'استفسارات شحن العملاء', to: '/maritime/inquiries' },
    { key: 'maritime-rfqs', label: 'عروض تسعير الخطوط (RFQ)', to: '/maritime/rfqs' },
    { key: 'maritime-matrix', label: 'مقارنة عروض الخطوط', to: '/maritime/matrix' },
    { key: 'maritime-quotations', label: 'عروض أسعار العملاء', to: '/maritime/quotations' },
    { key: 'maritime-jobs', label: 'أوامر تشغيل الشحنات', to: '/maritime/jobs' },
    { key: 'maritime-radar', label: 'رادار الغرامات وفترات السماح', to: '/maritime/radar' },
    { key: 'maritime-audit', label: 'تدقيق فواتير النواقل', to: '/maritime/audit' },
    { key: 'maritime-containers', label: 'تتبع الحاويات والطرود', to: '/maritime/containers' },
    { key: 'maritime-lines', label: 'دليل النواقل والموانئ والمطارات', to: '/maritime/lines' },
    { key: 'maritime-settings', label: 'إعدادات وسياسات الشحن', to: '/maritime/settings' },
  ],
};
