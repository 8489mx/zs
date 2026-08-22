import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const pharmacyRouteModule: FeatureRouteModule = {
  routes: [
    {
      path: 'pharmacy',
      element: createLazyRoute(() =>
        import('./pages/PharmacyDashboardPage').then((m) => ({ default: m.default })),
      ),
    },
    {
      path: 'pharmacy/drugs',
      element: createLazyRoute(() =>
        import('./pages/PharmacyDrugsDirectoryPage').then((m) => ({ default: m.default })),
      ),
    },
    {
      path: 'pharmacy/batches',
      element: createLazyRoute(() =>
        import('./pages/PharmacyBatchesExpiryPage').then((m) => ({ default: m.default })),
      ),
    },
    {
      path: 'pharmacy/prescriptions',
      element: createLazyRoute(() =>
        import('./pages/PharmacyPrescriptionsPage').then((m) => ({ default: m.default })),
      ),
    },
    {
      path: 'pharmacy/shortages',
      element: createLazyRoute(() =>
        import('./pages/PharmacyShortagesPage').then((m) => ({ default: m.default })),
      ),
    },
    {
      path: 'pharmacy/clinical-services',
      element: createLazyRoute(() =>
        import('./pages/PharmacyClinicalServicesPage').then((m) => ({ default: m.default })),
      ),
    },
  ],
  navigation: [
    { key: 'pharmacy-dashboard', label: 'لوحة تحكم الصيدلية', to: '/pharmacy', end: true },
    { key: 'pharmacy-drugs', label: 'دليل الأدوية والبدائل', to: '/pharmacy/drugs' },
    { key: 'pharmacy-prescriptions', label: 'الروشتات والتأمين', to: '/pharmacy/prescriptions' },
    { key: 'pharmacy-shortages', label: 'كشكول النواقص', to: '/pharmacy/shortages' },
    { key: 'pharmacy-batches', label: 'الصلاحيات والمرتجعات', to: '/pharmacy/batches' },
    { key: 'pharmacy-clinical', label: 'الفحوصات والخدمات', to: '/pharmacy/clinical-services' },
  ],
};
