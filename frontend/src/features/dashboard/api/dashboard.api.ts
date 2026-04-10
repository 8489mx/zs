import { http } from '@/lib/http';
import { unwrapArray } from '@/lib/api/contracts';
import type { Customer, Product, Purchase, ReportSummary, Sale, Supplier } from '@/types/domain';
import type { DashboardOverviewPayload } from '@/features/dashboard/api/dashboard.types';

export const dashboardApi = {
  products: async () => unwrapArray<Product>(await http<Product[] | { products: Product[] }>('/api/products'), 'products'),
  sales: async () => unwrapArray<Sale>(await http<Sale[] | { sales: Sale[] }>('/api/sales'), 'sales'),
  purchases: async () => unwrapArray<Purchase>(await http<Purchase[] | { purchases: Purchase[] }>('/api/purchases'), 'purchases'),
  customers: async () => unwrapArray<Customer>(await http<Customer[] | { customers: Customer[] }>('/api/customers'), 'customers'),
  suppliers: async () => unwrapArray<Supplier>(await http<Supplier[] | { suppliers: Supplier[] }>('/api/suppliers'), 'suppliers'),
  summary: (from: string, to: string) => http<ReportSummary>(`/api/reports/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  overview: (from: string, to: string) => http<DashboardOverviewPayload>(`/api/dashboard/overview?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
};
