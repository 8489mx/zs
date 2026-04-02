import type { FeatureRouteModule } from '@/app/router/types';
import { dashboardRouteModule } from '@/features/dashboard';
import { productsRouteModule } from '@/features/products';
import { salesRouteModule } from '@/features/sales';
import { posRouteModule } from '@/features/pos';
import { cashDrawerRouteModule } from '@/features/cash-drawer';
import { purchasesRouteModule } from '@/features/purchases';
import { inventoryRouteModule } from '@/features/inventory';
import { suppliersRouteModule } from '@/features/suppliers';
import { customersRouteModule } from '@/features/customers';
import { accountsRouteModule } from '@/features/accounts';
import { returnsRouteModule } from '@/features/returns';
import { reportsRouteModule } from '@/features/reports';
import { auditRouteModule } from '@/features/audit';
import { treasuryRouteModule } from '@/features/treasury';
import { servicesRouteModule } from '@/features/services';
import { settingsRouteModule } from '@/features/settings';

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
  settingsRouteModule
];

export const appRoutes = featureRouteModules.flatMap((module) => module.routes);
export const navigationItems = featureRouteModules.flatMap((module) => module.navigation ?? []);
