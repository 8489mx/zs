export type PaginationMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  rangeStart?: number;
  rangeEnd?: number;
};

export type PaginationOptions = {
  defaultSize?: number;
  maxSize?: number;
  includeRange?: boolean;
  minSize?: number;
};

export function paginateRows<T>(
  rows: T[],
  query: Record<string, unknown>,
  options: PaginationOptions = {},
): { rows: T[]; pagination: PaginationMeta } {
  const defaultSize = options.defaultSize ?? 20;
  const maxSize = options.maxSize ?? 100;
  const minSize = options.minSize ?? 1;

  const page = Math.max(1, Number(query.page || 1));
  const pageSize = Math.min(maxSize, Math.max(minSize, Number(query.pageSize || defaultSize)));
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  const pagination: PaginationMeta = {
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
  };

  if (options.includeRange) {
    pagination.rangeStart = totalItems ? start + 1 : 0;
    pagination.rangeEnd = Math.min(totalItems, start + pageSize);
  }

  return {
    rows: rows.slice(start, start + pageSize),
    pagination,
  };
}
