import { ReportRangeQueryDto } from '../dto/report-query.dto';

export type Range = {
  from: string;
  to: string;
  branchId?: string;
  locationId?: string;
};

export type TrendPoint = {
  key: string;
  value: number;
};

export function parseRange(query: ReportRangeQueryDto): Range {
  const now = new Date();
  const defaultTo = now.toISOString();
  const defaultFromDate = new Date(now);
  defaultFromDate.setDate(defaultFromDate.getDate() - 30);
  const defaultFrom = defaultFromDate.toISOString();

  return {
    from: query.from || defaultFrom,
    to: query.to || defaultTo,
    branchId: query.branchId ? String(query.branchId) : undefined,
    locationId: query.locationId ? String(query.locationId) : undefined,
  };
}

export function dateKey(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function paginate<T>(rows: T[], query: ReportRangeQueryDto, defaultSize = 25): { rows: T[]; pagination: Record<string, number> } {
  const page = Math.max(1, Number(query.page || 1));
  const pageSize = Math.min(200, Math.max(1, Number(query.pageSize || defaultSize)));
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    pagination: { page: safePage, pageSize, totalItems, totalPages },
  };
}

export function filterScope<T extends { branch_id?: number | null; location_id?: number | null }>(rows: T[], query: ReportRangeQueryDto): T[] {
  return rows.filter((row) => {
    if (query.branchId && Number(row.branch_id || 0) !== Number(query.branchId)) return false;
    if (query.locationId && Number(row.location_id || 0) !== Number(query.locationId)) return false;
    return true;
  });
}

export function buildLastNDays(days: number): string[] {
  return Array.from({ length: days }).map((_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (days - index - 1));
    return dateKey(date);
  });
}

export function normalizeProduct(row: {
  id: number;
  name: string | null;
  category_id: number | null;
  supplier_id: number | null;
  retail_price: number | string | null;
  stock_qty: number | string | null;
  min_stock_qty: number | string | null;
}): Record<string, unknown> {
  return {
    id: String(row.id),
    name: row.name || '',
    barcode: '',
    categoryId: row.category_id ? String(row.category_id) : '',
    supplierId: row.supplier_id ? String(row.supplier_id) : '',
    retailPrice: Number(row.retail_price || 0),
    wholesalePrice: 0,
    stock: Number(row.stock_qty || 0),
    minStock: Number(row.min_stock_qty || 0),
    notes: '',
    units: [],
    offers: [],
    customerPrices: [],
  };
}
