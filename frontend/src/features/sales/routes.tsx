import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';

export const salesRouteModule: FeatureRouteModule = {
  routes: [
    { path: 'sales', element: createLazyRoute(() => import('@/features/sales/pages/SalesPage').then((module) => ({ default: module.SalesPage }))) },
    { path: 'sales/orders', element: createLazyRoute(() => import('@/features/sales/pages/SalesOrdersPage').then((module) => ({ default: module.SalesOrdersPage }))) },
    { path: 'sales/price-lists', element: createLazyRoute(() => import('@/features/sales/pages/PriceListsPage').then((module) => ({ default: module.PriceListsPage }))) },
    { path: 'quotations', element: createLazyRoute(() => import('@/features/sales/pages/QuotationsPage').then((module) => ({ default: module.QuotationsPage }))) },
    { path: 'online-orders', element: createLazyRoute(() => import('@/features/storefront/pages/MerchantOnlineOrdersPage').then((module) => ({ default: module.MerchantOnlineOrdersPage }))) },
    { path: 'tax-dispatcher', element: createLazyRoute(() => import('@/features/sales/pages/TaxDispatcherPage').then((module) => ({ default: module.TaxDispatcherPage }))) },
    { path: 'installments', element: createLazyRoute(() => import('@/features/sales/pages/InstallmentsPage').then((module) => ({ default: module.InstallmentsPage }))) },
    { path: 'vat-declaration', element: createLazyRoute(() => import('@/features/sales/pages/VatDeclarationPage').then((module) => ({ default: module.VatDeclarationPage }))) },
    { path: 'displays', element: createLazyRoute(() => import('@/features/pos/pages/DisplaysPortalPage').then((module) => ({ default: module.DisplaysPortalPage }))) }
  ],
  navigation: [
    { key: 'sales', label: 'المبيعات', to: '/sales', end: true },
    { key: 'sales-orders', label: 'أوامر البيع وحجز المخزون', to: '/sales/orders' },
    { key: 'price-lists', label: 'قوائم الأسعار والشرائح', to: '/sales/price-lists' },
    { key: 'quotations', label: 'عروض الأسعار', to: '/quotations' },
    { key: 'installments', label: 'مبيعات التقسيط', to: '/installments' },
    { key: 'online-orders', label: 'طلبات الأونلاين', to: '/online-orders' },
    { key: 'tax-dispatcher', label: 'الضرائب (ETA)', to: '/tax-dispatcher' },
    { key: 'vat-declaration', label: 'الإقرار الضريبي (ن10 و ZATCA)', to: '/vat-declaration' },
    { key: 'displays', label: 'شاشات العرض', to: '/displays' },
    { key: 'kds', label: 'شاشة المطبخ (KDS)', to: '/kds' },
    { key: 'signage', label: 'شاشات العروض والأسعار', to: '/signage' },
  ]
};
