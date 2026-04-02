import { http } from '@/lib/http';
import { unwrapArray, unwrapByKey } from '@/lib/api/contracts';
import type { AppSettings, Branch, Category, Customer, CustomerLedger, InventoryReport, Location, Product, Purchase, ReportSummary, Sale, Supplier, SupplierLedger } from '@/types/domain';

export const catalogApi = {
  settings: async () => unwrapByKey<AppSettings>(await http<AppSettings | { settings: AppSettings }>('/api/settings'), 'settings', {} as AppSettings),
  settingsUpdate: (payload: unknown) => http<AppSettings>('/api/settings', { method: 'PUT', body: JSON.stringify(payload) }),

  listCustomers: async () => unwrapArray<Customer>(await http<Customer[] | { customers: Customer[] }>('/api/customers'), 'customers'),
  createCustomer: (payload: unknown) => http<Customer>('/api/customers', { method: 'POST', body: JSON.stringify(payload) }),
  listSuppliers: async () => unwrapArray<Supplier>(await http<Supplier[] | { suppliers: Supplier[] }>('/api/suppliers'), 'suppliers'),
  createSupplier: (payload: unknown) => http<Supplier>('/api/suppliers', { method: 'POST', body: JSON.stringify(payload) }),
  listProducts: async () => unwrapArray<Product>(await http<Product[] | { products: Product[] }>('/api/products'), 'products'),
  createProduct: (payload: unknown) => http<Product>('/api/products', { method: 'POST', body: JSON.stringify(payload) }),
  listCategories: async () => unwrapArray<Category>(await http<Category[] | { categories: Category[] }>('/api/categories'), 'categories'),
  listSales: async () => unwrapArray<Sale>(await http<Sale[] | { sales: Sale[] }>('/api/sales'), 'sales'),
  createSale: (payload: unknown) => http('/api/sales', { method: 'POST', body: JSON.stringify(payload) }),
  listPurchases: async () => unwrapArray<Purchase>(await http<Purchase[] | { purchases: Purchase[] }>('/api/purchases'), 'purchases'),
  createPurchase: (payload: unknown) => http('/api/purchases', { method: 'POST', body: JSON.stringify(payload) }),

  createCustomerPayment: (payload: unknown) => http('/api/customer-payments', { method: 'POST', body: JSON.stringify(payload) }),
  createSupplierPayment: (payload: unknown) => http('/api/supplier-payments', { method: 'POST', body: JSON.stringify(payload) }),

  reportSummary: (from: string, to: string) => http<ReportSummary>(`/api/reports/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  inventoryReport: async () => unwrapByKey<InventoryReport>(await http<InventoryReport | { inventory: InventoryReport }>('/api/reports/inventory'), 'inventory', {} as InventoryReport),
  customerBalances: async () => unwrapArray<Customer>(await http<Customer[] | { customers: Customer[] }>('/api/reports/customer-balances'), 'customers'),
  customerLedger: (id: string) => http<CustomerLedger>(`/api/reports/customers/${id}/ledger`),
  supplierLedger: (id: string) => http<SupplierLedger>(`/api/reports/suppliers/${id}/ledger`),

  branches: async () => unwrapArray<Branch>(await http<Branch[] | { branches: Branch[] }>('/api/branches'), 'branches'),
  branchCreate: (payload: unknown) => http('/api/branches', { method: 'POST', body: JSON.stringify(payload) }),
  locations: async () => unwrapArray<Location>(await http<Location[] | { locations: Location[] }>('/api/locations'), 'locations'),
  locationCreate: (payload: unknown) => http('/api/locations', { method: 'POST', body: JSON.stringify(payload) }),

  // Backward-compatible aliases for older feature modules.
  customers: async () => catalogApi.listCustomers(),
  suppliers: async () => catalogApi.listSuppliers(),
  products: async () => catalogApi.listProducts(),
  categories: async () => catalogApi.listCategories(),
  sales: async () => catalogApi.listSales(),
  purchases: async () => catalogApi.listPurchases(),
  productCreate: (payload: unknown) => catalogApi.createProduct(payload),
  saleCreate: (payload: unknown) => catalogApi.createSale(payload),
  purchaseCreate: (payload: unknown) => catalogApi.createPurchase(payload),
  customerCreate: (payload: unknown) => catalogApi.createCustomer(payload),
  supplierCreate: (payload: unknown) => catalogApi.createSupplier(payload)
};
