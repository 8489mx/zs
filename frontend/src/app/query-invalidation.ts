import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';

export async function invalidateDashboardOverview(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
}

export async function invalidateCatalogDomain(
  queryClient: QueryClient,
  options?: {
    includeProducts?: boolean;
    includeCustomers?: boolean;
    includeSuppliers?: boolean;
    includeCategories?: boolean;
    includeCustomerBalances?: boolean;
  }
) {
  const {
    includeProducts = false,
    includeCustomers = false,
    includeSuppliers = false,
    includeCategories = false,
    includeCustomerBalances = false,
  } = options || {};
  const tasks = [];
  if (includeProducts) tasks.push(queryClient.invalidateQueries({ queryKey: queryKeys.products }));
  if (includeCustomers) tasks.push(queryClient.invalidateQueries({ queryKey: queryKeys.customers }));
  if (includeSuppliers) tasks.push(queryClient.invalidateQueries({ queryKey: queryKeys.suppliers }));
  if (includeCategories) tasks.push(queryClient.invalidateQueries({ queryKey: queryKeys.categories }));
  if (includeCustomerBalances) tasks.push(queryClient.invalidateQueries({ queryKey: queryKeys.customerBalances }));
  await Promise.all(tasks);
}

export async function invalidateInventoryDomain(
  queryClient: QueryClient,
  options?: { includeProducts?: boolean; includeDashboard?: boolean }
) {
  const { includeProducts = true, includeDashboard = false } = options || {};
  const tasks = [
    queryClient.invalidateQueries({ queryKey: queryKeys.inventoryReport }),
    queryClient.invalidateQueries({ queryKey: queryKeys.stockTransfers }),
    queryClient.invalidateQueries({ queryKey: queryKeys.stockCountSessions }),
    queryClient.invalidateQueries({ queryKey: queryKeys.damagedStock }),
    queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements }),
  ];
  if (includeProducts) tasks.push(queryClient.invalidateQueries({ queryKey: queryKeys.products }));
  if (includeDashboard) tasks.push(queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] }));
  await Promise.all(tasks);
}

export async function invalidateSalesDomain(
  queryClient: QueryClient,
  options?: { saleId?: string; includeDashboard?: boolean }
) {
  const { saleId, includeDashboard = false } = options || {};
  const tasks = [
    queryClient.invalidateQueries({ queryKey: queryKeys.sales }),
    queryClient.invalidateQueries({ queryKey: queryKeys.customerBalances }),
  ];
  if (saleId) tasks.push(queryClient.invalidateQueries({ queryKey: queryKeys.saleDetail(saleId) }));
  if (includeDashboard) tasks.push(queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] }));
  await Promise.all(tasks);
  await Promise.all([
    invalidateCatalogDomain(queryClient, { includeProducts: true, includeCustomers: true, includeCustomerBalances: true }),
    invalidateInventoryDomain(queryClient, { includeProducts: true, includeDashboard }),
  ]);
}

export async function invalidatePurchasesDomain(
  queryClient: QueryClient,
  options?: { purchaseId?: string; includeDashboard?: boolean }
) {
  const { purchaseId, includeDashboard = false } = options || {};
  const tasks = [queryClient.invalidateQueries({ queryKey: queryKeys.purchases })];
  if (purchaseId) tasks.push(queryClient.invalidateQueries({ queryKey: queryKeys.purchaseDetail(purchaseId) }));
  if (includeDashboard) tasks.push(queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] }));
  await Promise.all(tasks);
  await Promise.all([
    invalidateCatalogDomain(queryClient, { includeProducts: true, includeSuppliers: true }),
    invalidateInventoryDomain(queryClient, { includeProducts: true, includeDashboard }),
  ]);
}

export async function invalidateReturnsDomain(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.returns }),
    invalidateSalesDomain(queryClient),
    invalidatePurchasesDomain(queryClient),
    invalidateTreasuryDomain(queryClient),
    invalidateCatalogDomain(queryClient, { includeProducts: true, includeCustomers: true, includeSuppliers: true, includeCustomerBalances: true }),
  ]);
}

export async function invalidateTreasuryDomain(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.treasury }),
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses }),
    queryClient.invalidateQueries({ queryKey: queryKeys.cashierShifts }),
  ]);
}

export async function invalidateAccountsDomain(queryClient: QueryClient, activeCustomerId?: string, activeSupplierId?: string) {
  const tasks = [
    queryClient.invalidateQueries({ queryKey: queryKeys.customers }),
    queryClient.invalidateQueries({ queryKey: queryKeys.suppliers }),
    queryClient.invalidateQueries({ queryKey: queryKeys.customerBalances }),
  ];
  if (activeCustomerId) tasks.push(queryClient.invalidateQueries({ queryKey: queryKeys.customerLedger(activeCustomerId) }));
  if (activeSupplierId) tasks.push(queryClient.invalidateQueries({ queryKey: queryKeys.supplierLedger(activeSupplierId) }));
  await Promise.all(tasks);
}

export async function invalidateAdminWorkspaceQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.adminDiagnostics }),
    queryClient.invalidateQueries({ queryKey: queryKeys.adminMaintenance }),
    queryClient.invalidateQueries({ queryKey: queryKeys.adminLaunch }),
    queryClient.invalidateQueries({ queryKey: queryKeys.adminUat }),
    queryClient.invalidateQueries({ queryKey: queryKeys.adminOperational }),
    queryClient.invalidateQueries({ queryKey: queryKeys.adminSupport }),
    queryClient.invalidateQueries({ queryKey: queryKeys.backupSnapshots }),
  ]);
}

export async function invalidateSettingsReferenceDomain(
  queryClient: QueryClient,
  options?: { includeSettings?: boolean; includeBranches?: boolean; includeLocations?: boolean }
) {
  const { includeSettings = true, includeBranches = true, includeLocations = true } = options || {};
  const tasks = [];
  if (includeSettings) tasks.push(queryClient.invalidateQueries({ queryKey: queryKeys.settings }));
  if (includeBranches) tasks.push(queryClient.invalidateQueries({ queryKey: queryKeys.branches }));
  if (includeLocations) tasks.push(queryClient.invalidateQueries({ queryKey: queryKeys.locations }));
  await Promise.all(tasks);
}

export async function invalidateImportedReferenceData(queryClient: QueryClient) {
  await Promise.all([
    invalidateCatalogDomain(queryClient, { includeCustomers: true, includeSuppliers: true, includeProducts: true }),
    invalidateSettingsReferenceDomain(queryClient),
    queryClient.invalidateQueries({ queryKey: queryKeys.inventoryReport }),
    queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements }),
  ]);
}
