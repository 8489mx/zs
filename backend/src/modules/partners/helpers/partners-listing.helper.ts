import { Selectable, sql } from '../../../database/kysely';
import { CustomerTable, SupplierTable } from '../../../database/database.types';
import { normalizeArabicSearch } from '../../../common/utils/arabic-search.util';

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
  const pageSize = Math.max(1, Math.min(100, Number(query.pageSize || 10)));
  const q = String(query.q || '').trim();
  const filter = String(query.filter || 'all').trim();
  const isUnpagedDefault = query.pageSize === undefined && query.page === undefined;
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
    metadata: row.metadata || {},
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
    metadata: row.metadata || {},
  };
}

export function buildCustomerSearchPredicate(q: string) {
  if (!q) return null;
  const term = `%${normalizeArabicSearch(q)}%`;
  return sql<boolean>`(
    TRANSLATE(LOWER(COALESCE(name, '')), 'أإآٱٲٳؤئىة', 'ااااااويهه') LIKE ${term}
    OR lower(phone) like ${term}
    OR TRANSLATE(LOWER(COALESCE(address, '')), 'أإآٱٲٳؤئىة', 'ااااااويهه') LIKE ${term}
    OR lower(customer_type) like ${term}
    OR TRANSLATE(LOWER(COALESCE(company_name, '')), 'أإآٱٲٳؤئىة', 'ااااااويهه') LIKE ${term}
    OR lower(tax_number) like ${term}
  )`;
}

export function buildSupplierSearchPredicate(q: string) {
  if (!q) return null;
  const term = `%${normalizeArabicSearch(q)}%`;
  return sql<boolean>`(
    TRANSLATE(LOWER(COALESCE(name, '')), 'أإآٱٲٳؤئىة', 'ااااااويهه') LIKE ${term}
    OR lower(phone) like ${term}
    OR TRANSLATE(LOWER(COALESCE(address, '')), 'أإآٱٲٳؤئىة', 'ااااااويهه') LIKE ${term}
    OR TRANSLATE(LOWER(COALESCE(notes, '')), 'أإآٱٲٳؤئىة', 'ااااااويهه') LIKE ${term}
  )`;
}

export function calculatePagination(page: number, pageSize: number, totalItems: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return { page: Math.min(page, totalPages), pageSize, totalItems, totalPages };
}
