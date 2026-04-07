import { useEffect, useMemo, useState } from 'react';

interface UseClientPaginationOptions {
  initialPageSize?: number;
  pageSizeOptions?: number[];
}

export function useClientPagination<T>(rows: T[], options: UseClientPaginationOptions = {}) {
  const pageSizeOptions = options.pageSizeOptions && options.pageSizeOptions.length
    ? options.pageSizeOptions
    : [15, 30, 50, 100];
  const initialPageSize = pageSizeOptions.includes(options.initialPageSize || 0)
    ? Number(options.initialPageSize)
    : pageSizeOptions[0];

  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const pagedRows = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return rows.slice(startIndex, startIndex + pageSize);
  }, [page, pageSize, rows]);

  const rangeStart = totalItems ? ((page - 1) * pageSize) + 1 : 0;
  const rangeEnd = totalItems ? Math.min(page * pageSize, totalItems) : 0;

  function goToPage(nextPage: number) {
    if (!Number.isFinite(nextPage)) return;
    setPage(Math.min(Math.max(1, Math.trunc(nextPage)), totalPages));
  }

  function setPageSize(nextPageSize: number) {
    if (!pageSizeOptions.includes(nextPageSize)) return;
    setPageSizeState(nextPageSize);
    setPage(1);
  }

  function resetPagination() {
    setPage(1);
  }

  return {
    page,
    pageSize,
    pageSizeOptions,
    totalItems,
    totalPages,
    rangeStart,
    rangeEnd,
    rows: pagedRows,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
    goToPage,
    setPageSize,
    resetPagination,
  };
}
