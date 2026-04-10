import { Selectable, sql } from 'kysely';
import { CustomerTable, SupplierTable } from '../../../database/database.types';

type CustomerRow = Selectable<CustomerTable>;
type SupplierRow = Selectable<SupplierTable>;

export type PartnersListQuery = {
  page: number;
  pageSize: number;
  q: string;
  filter: string;
  isUnpagedDefault: boolean;
};

export function parsePartnersListQuery(query: Record<string, unknown>): PartnersListQuery {
  const page = Math.max(1, Number(query.page || 1));
  const pageSize = Math.min(100, Math.max(5, Number(query.pageSize || 20)));
  const q = String(query.q || '').trim().toLowerCase();
  const filter = String(query.filter || 'all').trim();
  const isUnpagedDefault = !('page' in query) && !('pageSize' in query) && !q && filter === 'all';
  return { page, pageSize, q, filter, isUnpagedDefault };
}

export function mapCustomerRow(row: CustomerRow): Record<string, unknown> {
  return {
    id: String(row.id),
    name: row.name || '',
    phone: row.phone || '',
    address: row.address || '',
    balance: Number(row.balance || 0),
    type: row.customer_type || 'cash',
    creditLimit: Number(row.credit_limit || 0),
    storeCreditBalance: Number(row.store_credit_balance || 0),
    companyName: row.company_name || '',
    taxNumber: row.tax_number || '',
  };
}

export function mapSupplierRow(row: SupplierRow): Record<string, unknown> {
  return {
    id: String(row.id),
    name: row.name || '',
    phone: row.phone || '',
    address: row.address || '',
    balance: Number(row.balance || 0),
    notes: row.notes || '',
  };
}

export function buildCustomerSearchPredicate(q: string) {
  if (!q) return null;
  const term = `%${q}%`;
  return sql<boolean>`(
    lower(name) like ${term}
    or lower(phone) like ${term}
    or lower(address) like ${term}
    or lower(customer_type) like ${term}
    or lower(company_name) like ${term}
    or lower(tax_number) like ${term}
  )`;
}

export function buildSupplierSearchPredicate(q: string) {
  if (!q) return null;
  const term = `%${q}%`;
  return sql<boolean>`(
    lower(name) like ${term}
    or lower(phone) like ${term}
    or lower(address) like ${term}
    or lower(notes) like ${term}
  )`;
}

export function calculatePagination(page: number, pageSize: number, totalItems: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return { page: Math.min(page, totalPages), pageSize, totalItems, totalPages };
}
