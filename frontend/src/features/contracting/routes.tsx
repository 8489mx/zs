import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';
import { FeatureGate } from '@/shared/components/feature-gate';

export const contractingRouteModule: FeatureRouteModule = {
  routes: [
    {
      path: 'contracting',
      element: createLazyRoute(() =>
        import('./pages/ContractingWorkspacePage').then((m) => ({
          default: () => (
            <FeatureGate feature="contracting" featureName="المقاولات وإدارة المشاريع الإنشائية">
              <m.ContractingWorkspacePage />
            </FeatureGate>
          ),
        })),
      ),
    },
  ],
  navigation: [
    { key: 'contracting-projects', label: 'سجل المشاريع الإنشائية', to: '/contracting?tab=projects' },
    { key: 'contracting-boq', label: 'جدول الكميات (SOV/BOQ)', to: '/contracting?tab=boq' },
    { key: 'contracting-change-orders', label: 'الأوامر التغييرية والمطالبات', to: '/contracting?tab=change-orders' },
    { key: 'contracting-invoices', label: 'المستخلصات وشهادات الدفع (IPC)', to: '/contracting?tab=invoices' },
    { key: 'contracting-subcontracts', label: 'مقاولو الباطن والالتزامات', to: '/contracting?tab=subcontracts' },
    { key: 'contracting-daily-logs', label: 'يوميات الموقع الميدانية', to: '/contracting?tab=daily-logs' },
    { key: 'contracting-rfis', label: 'الاستفسارات الفنية (RFIs)', to: '/contracting?tab=rfis' },
  ],
};
