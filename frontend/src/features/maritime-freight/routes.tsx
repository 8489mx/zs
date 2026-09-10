import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';
import { FeatureGate } from '@/shared/components/feature-gate';

export const maritimeFreightRouteModule: FeatureRouteModule = {
  routes: [
    {
      path: 'maritime',
      element: createLazyRoute(() =>
        import('./pages/MaritimeWorkspacePage').then((m) => ({
          default: () => (
            <FeatureGate feature="maritime_freight" featureName="الشحن البحري واللوجستيات">
              <m.MaritimeWorkspacePage />
            </FeatureGate>
          ),
        })),
      ),
    },
  ],
  navigation: [
    { key: 'maritime-rfqs', label: 'طلبات التسعير (RFQs)', to: '/maritime?tab=rfqs' },
    { key: 'maritime-matrix', label: 'مصفوفة مقارنة العروض', to: '/maritime?tab=matrix' },
    { key: 'maritime-quotations', label: 'عروض أسعار العملاء', to: '/maritime?tab=quotations' },
    { key: 'maritime-jobs', label: 'أوامر التشغيل والعمليات', to: '/maritime?tab=jobs' },
    { key: 'maritime-containers', label: 'الحاويات وفترة السماح', to: '/maritime?tab=containers' },
    { key: 'maritime-lines', label: 'دليل الخطوط والموانئ', to: '/maritime?tab=master' },
  ],
};

