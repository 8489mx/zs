import { ReactNode, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { PaginationControls } from '@/components/shared/PaginationControls';

interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTablePagination {
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  totalItems?: number;
}

interface DataTableSelection<T> {
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
  checkboxLabel?: (row: T, rowIndex: number) => string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  empty?: ReactNode;
  rowKey?: (row: T, rowIndex: number) => string;
  rowClassName?: (row: T, rowIndex: number) => string | undefined;
  onRowClick?: (row: T, rowIndex: number) => void;
  rowTitle?: (row: T, rowIndex: number) => string | undefined;
  caption?: ReactNode;
  ariaLabel?: string;
  density?: 'regular' | 'compact';
  stickyHeader?: boolean;
  maxHeight?: number | string;
  pagination?: DataTablePagination;
  selection?: DataTableSelection<T>;
}

function shouldIgnoreKeyboardSelection(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest('button, a, input, select, textarea, [role="button"]'));
}

export function DataTable<T>({
  columns,
  rows,
  empty,
  rowKey,
  rowClassName,
  onRowClick,
  rowTitle,
  caption,
  ariaLabel,
  density = 'regular',
  stickyHeader = true,
  maxHeight,
  pagination,
  selection,
}: DataTableProps<T>) {
  if (!rows.length) {
    return <>{empty || null}</>;
  }

  const computedRowKey = rowKey || ((_: T, rowIndex: number) => String(rowIndex));
  const totalItems = pagination?.totalItems ?? rows.length;
  const pageSize = pagination?.pageSize || totalItems;
  const totalPages = pagination ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1;
  const currentPage = pagination ? Math.min(Math.max(1, pagination.page), totalPages) : 1;
  const rangeStart = pagination ? ((currentPage - 1) * pageSize) + 1 : (totalItems ? 1 : 0);
  const rangeEnd = pagination ? Math.min(currentPage * pageSize, totalItems) : totalItems;
  const visibleRows = pagination && pagination.totalItems == null ? rows.slice(rangeStart - 1, rangeEnd) : rows;
  const visibleKeys = visibleRows.map((row, rowIndex) => computedRowKey(row, pagination ? (rangeStart - 1) + rowIndex : rowIndex));
  const allVisibleSelected = Boolean(selection && visibleKeys.length && visibleKeys.every((key) => selection.selectedKeys.includes(key)));
  const someVisibleSelected = Boolean(selection && !allVisibleSelected && visibleKeys.some((key) => selection.selectedKeys.includes(key)));

  const tableWrapClassName = [
    'table-wrap',
    stickyHeader ? 'table-wrap-sticky' : '',
    density === 'compact' ? 'table-wrap-compact' : '',
  ].filter(Boolean).join(' ');

  const tableWrapStyle = maxHeight
    ? { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }
    : undefined;

  return (
    <>
      <div className={tableWrapClassName} style={tableWrapStyle}>
        <table aria-label={ariaLabel}>
          {caption ? <caption className="table-caption">{caption}</caption> : null}
          <thead>
            <tr>
              {selection ? (
                <th className="table-selection-cell">
                  <input
                    type="checkbox"
                    aria-label="تحديد كل الصفوف الظاهرة"
                    checked={allVisibleSelected}
                    ref={(node) => {
                      if (node) node.indeterminate = someVisibleSelected;
                    }}
                    onChange={(event) => {
                      const nextSelected = new Set(selection.selectedKeys);
                      if (event.target.checked) {
                        visibleKeys.forEach((key) => nextSelected.add(key));
                      } else {
                        visibleKeys.forEach((key) => nextSelected.delete(key));
                      }
                      selection.onChange(Array.from(nextSelected));
                    }}
                  />
                </th>
              ) : null}
              {columns.map((column) => (
                <th key={column.key} className={column.className}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, visibleRowIndex) => {
              const absoluteRowIndex = pagination ? (rangeStart - 1) + visibleRowIndex : visibleRowIndex;
              const interactive = typeof onRowClick === 'function';
              const key = computedRowKey(row, absoluteRowIndex);
              const computedClassName = [
                interactive ? 'table-row-clickable' : '',
                selection?.selectedKeys.includes(key) ? 'table-row-selected' : '',
                rowClassName?.(row, absoluteRowIndex) || ''
              ].filter(Boolean).join(' ');

              const handleKeyDown = interactive
                ? (event: ReactKeyboardEvent<HTMLTableRowElement>) => {
                    if (shouldIgnoreKeyboardSelection(event.target)) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onRowClick(row, absoluteRowIndex);
                    }
                  }
                : undefined;

              return (
                <tr
                  key={key}
                  className={computedClassName || undefined}
                  onClick={interactive ? () => onRowClick(row, absoluteRowIndex) : undefined}
                  onKeyDown={handleKeyDown}
                  title={rowTitle?.(row, absoluteRowIndex)}
                  tabIndex={interactive ? 0 : undefined}
                >
                  {selection ? (
                    <td className="table-selection-cell" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={selection.checkboxLabel?.(row, absoluteRowIndex) || 'تحديد الصف'}
                        checked={selection.selectedKeys.includes(key)}
                        onChange={(event) => {
                          const nextSelected = new Set(selection.selectedKeys);
                          if (event.target.checked) nextSelected.add(key);
                          else nextSelected.delete(key);
                          selection.onChange(Array.from(nextSelected));
                        }}
                      />
                    </td>
                  ) : null}
                  {columns.map((column) => (
                    <td key={column.key} className={column.className}>{column.cell(row)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pagination ? (
        <PaginationControls
          page={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={pagination.pageSizeOptions || [10, 20, 50, 100]}
          totalItems={totalItems}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          itemLabel={pagination.itemLabel}
        />
      ) : null}
    </>
  );
}
