import type { ReactNode } from 'react';

export type DataTableSortDirection = 'asc' | 'desc';

export type DataTableSortState = {
  columnId: string;
  direction: DataTableSortDirection;
};

export type DataTableColumnModern<T> = {
  id: string;
  header: ReactNode;
  render: (row: T, rowIndex: number) => ReactNode;
  align?: 'start' | 'center' | 'end';
  width?: number | string;
  hideOnMobile?: boolean;
  sortable?: boolean;
  sortValue?: (row: T) => unknown;
  className?: string;
  headerClassName?: string;
};

export type DataTableColumnLegacy<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
};

export type DataTableColumn<T> = DataTableColumnModern<T> | DataTableColumnLegacy<T>;

export type DataTablePagination = {
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  totalItems?: number;
};

export type SharedDataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T, rowIndex: number) => string;
  loading?: boolean;
  loadingMessage?: string;
  emptyMessage?: ReactNode;
  errorMessage?: ReactNode;
  className?: string;
  compact?: boolean;
  density?: 'regular' | 'compact';
  stickyHeader?: boolean;
  maxHeight?: number | string;
  caption?: ReactNode;
  ariaLabel?: string;
  rowClassName?: (row: T, rowIndex: number) => string | undefined;
  onRowClick?: (row: T, rowIndex: number) => void;
  rowTitle?: (row: T, rowIndex: number) => string | undefined;
  defaultSort?: DataTableSortState;
  sortState?: DataTableSortState | null;
  onSortChange?: (next: DataTableSortState | null) => void;
  pagination?: DataTablePagination;
  // Legacy compatibility props for gradual migration from shared/ui/data-table.
  rows?: T[];
  rowKey?: (row: T, rowIndex: number) => string;
  empty?: ReactNode;
  selection?: {
    selectedKeys: string[];
    onChange: (keys: string[]) => void;
    checkboxLabel?: (row: T, rowIndex: number) => string;
  };
};
