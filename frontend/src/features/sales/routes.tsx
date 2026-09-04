import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const salesRouteModule: FeatureRouteModule = {
  routes: [
    { path: 'sales', element: createLazyRoute(() => import('@/features/sales/pages/SalesPage').then((module) => ({ default: module.SalesPage }))) },
    { path: 'quotations', element: createLazyRoute(() => import('@/features/sales/pages/QuotationsPage').then((module) => ({ default: module.QuotationsPage }))) },
    { path: 'online-orders', element: createLazyRoute(() => import('@/features/storefront/pages/MerchantOnlineOrdersPage').then((module) => ({ default: module.MerchantOnlineOrdersPage }))) },
    { path: 'tax-dispatcher', element: createLazyRoute(() => import('@/features/sales/pages/TaxDispatcherPage').then((module) => ({ default: module.TaxDispatcherPage }))) },
    { path: 'installments', element: createLazyRoute(() => import('@/features/sales/pages/InstallmentsPage').then((module) => ({ default: module.InstallmentsPage }))) },
    { path: 'vat-declaration', element: createLazyRoute(() => import('@/features/sales/pages/VatDeclarationPage').then((module) => ({ default: module.VatDeclarationPage }))) }
  ],
  navigation: [
    { key: 'sales', label: 'المبيعات', to: '/sales' },
    { key: 'quotations', label: 'عروض الأسعار', to: '/quotations' },
    { key: 'installments', label: 'مبيعات التقسيط', to: '/installments' },
    { key: 'online-orders', label: 'طلبات الأونلاين', to: '/online-orders' },
    { key: 'tax-dispatcher', label: 'الضرائب (ETA)', to: '/tax-dispatcher' },
    { key: 'vat-declaration', label: 'الإقرار الضريبي (ن10 و ZATCA)', to: '/vat-declaration' }
  ]
};
