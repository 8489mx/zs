import type { FeatureRouteModule } from '@/app/router/types';
import { dashboardRouteModule } from '@/features/dashboard/routes';
import { productsRouteModule } from '@/features/products/routes';
import { salesRouteModule } from '@/features/sales/routes';
import { posRouteModule } from '@/features/pos/routes';
import { cashDrawerRouteModule } from '@/features/cash-drawer/routes';
import { purchasesRouteModule } from '@/features/purchases/routes';
import { inventoryRouteModule } from '@/features/inventory/routes';
import { suppliersRouteModule } from '@/features/suppliers/routes';
import { customersRouteModule } from '@/features/customers/routes';
import { accountsRouteModule } from '@/features/accounts/routes';
import { returnsRouteModule } from '@/features/returns/routes';
import { reportsRouteModule } from '@/features/reports/routes';
import { auditRouteModule } from '@/features/audit/routes';
import { treasuryRouteModule } from '@/features/treasury/routes';
import { servicesRouteModule } from '@/features/services/routes';
import { settingsRouteModule } from '@/features/settings/routes';

export const featureRouteModules: FeatureRouteModule[] = [
  dashboardRouteModule,
  productsRouteModule,
  salesRouteModule,
  posRouteModule,
  cashDrawerRouteModule,
  purchasesRouteModule,
  inventoryRouteModule,
  suppliersRouteModule,
  customersRouteModule,
  accountsRouteModule,
  returnsRouteModule,
  reportsRouteModule,
  auditRouteModule,
  treasuryRouteModule,
  servicesRouteModule,
  settingsRouteModule,
];

export const appRoutes = featureRouteModules.flatMap((module) => module.routes);
export const navigationItems = featureRouteModules.flatMap((module) => module.navigation ?? []);
