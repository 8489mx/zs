import { catalogApi as sharedCatalogApi } from '@/lib/api/catalog';
import { settingsApi } from '@/features/settings/api/settings.api';

const unsupportedCreateProduct = async (_payload: unknown) => {
  throw new Error('Use feature-level product mutations instead of services/api/catalog.productCreate');
};

// Compatibility facade: keep older imports stable while routing shared catalog reads
// through the single source of truth in lib/api/catalog.
export const catalogApi = {
  settings: settingsApi.settings,
  settingsUpdate: settingsApi.update,
  products: sharedCatalogApi.listProducts,
  productCreate: unsupportedCreateProduct,
  categories: sharedCatalogApi.listCategories,
  suppliers: sharedCatalogApi.listSuppliers,
  supplierCreate: sharedCatalogApi.createSupplier,
  customers: sharedCatalogApi.listCustomers,
  customerCreate: sharedCatalogApi.createCustomer,
  sales: sharedCatalogApi.listSales,
  purchases: sharedCatalogApi.listPurchases,
  customerPaymentCreate: sharedCatalogApi.createCustomerPayment,
  supplierPaymentCreate: sharedCatalogApi.createSupplierPayment,
  reportSummary: sharedCatalogApi.reportSummary,
  inventoryReport: sharedCatalogApi.inventoryReport,
  customerBalances: sharedCatalogApi.customerBalances,
  customerLedger: sharedCatalogApi.customerLedger,
  supplierLedger: sharedCatalogApi.supplierLedger,
  branches: settingsApi.branches,
  branchCreate: settingsApi.createBranch,
  locations: settingsApi.locations,
  locationCreate: settingsApi.createLocation
};
