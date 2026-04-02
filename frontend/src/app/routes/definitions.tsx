import type { ReactNode } from 'react';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { ProductsPage } from '@/features/products/pages/ProductsPage';
import { SalesPage } from '@/features/sales/pages/SalesPage';
import { PosPage } from '@/features/pos/pages/PosPage';
import { PurchasesPage } from '@/features/purchases/pages/PurchasesPage';
import { InventoryPage } from '@/features/inventory/pages/InventoryPage';
import { CustomersPage } from '@/features/customers/pages/CustomersPage';
import { SuppliersPage } from '@/features/suppliers/pages/SuppliersPage';
import { AccountsPage } from '@/features/accounts/pages/AccountsPage';
import { ReportsPage } from '@/features/reports/pages/ReportsPage';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';

export interface AppRouteDefinition {
  index?: boolean;
  path?: string;
  label: string;
  element: ReactNode;
  navigation?: boolean;
}

export const appRoutes: AppRouteDefinition[] = [
  { index: true, label: 'لوحة التحكم', element: <DashboardPage />, navigation: true },
  { path: 'products', label: 'الأصناف', element: <ProductsPage />, navigation: true },
  { path: 'sales', label: 'المبيعات', element: <SalesPage />, navigation: true },
  { path: 'pos', label: 'نقطة البيع', element: <PosPage />, navigation: true },
  { path: 'purchases', label: 'المشتريات', element: <PurchasesPage />, navigation: true },
  { path: 'inventory', label: 'المخزون', element: <InventoryPage />, navigation: true },
  { path: 'customers', label: 'العملاء', element: <CustomersPage />, navigation: true },
  { path: 'suppliers', label: 'الموردون', element: <SuppliersPage />, navigation: true },
  { path: 'accounts', label: 'الحسابات', element: <AccountsPage />, navigation: true },
  { path: 'reports', label: 'التقارير', element: <ReportsPage />, navigation: true },
  { path: 'settings', label: 'الإعدادات', element: <SettingsPage />, navigation: true }
];

export const navigationRoutes = appRoutes.filter((route) => route.navigation);
