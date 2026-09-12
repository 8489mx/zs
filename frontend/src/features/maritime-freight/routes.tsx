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
      path: 'maritime',
      element: MaritimeWorkspaceLazy,
    },
    {
      path: 'maritime/*',
      element: MaritimeWorkspaceLazy,
    },
  ],
  navigation: [
    { key: 'maritime-inquiries', label: 'استفسارات شحن العملاء', to: '/maritime/inquiries' },
    { key: 'maritime-rfqs', label: 'استقصاء أسعار الخطوط (RFQ)', to: '/maritime/rfqs' },
    { key: 'maritime-matrix', label: 'مقارنة عروض الخطوط', to: '/maritime/matrix' },
    { key: 'maritime-quotations', label: 'عروض أسعار العملاء', to: '/maritime/quotations' },
    { key: 'maritime-jobs', label: 'أوامر تشغيل الشحنات', to: '/maritime/jobs' },
    { key: 'maritime-containers', label: 'تتبع الحاويات وفترات السماح', to: '/maritime/containers' },
    { key: 'maritime-lines', label: 'دليل الخطوط والموانئ', to: '/maritime/lines' },
    { key: 'maritime-settings', label: 'أتمتة المراسلات والبريد', to: '/maritime/settings' },
  ],
};
