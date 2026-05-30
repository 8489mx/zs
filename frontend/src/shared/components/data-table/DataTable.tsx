import { useMemo, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { PaginationControls } from '@/shared/components/pagination-controls';
import type { DataTableColumn, DataTableSortState, SharedDataTableProps } from './DataTable.types';

function shouldIgnoreKeyboardSelection(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest('button, a, input, select, textarea, [role="button"]'));
}

function alignStyle(align?: 'start' | 'center' | 'end'): CSSProperties {
  if (align === 'center') return { textAlign: 'center' };
  if (align === 'end') return { textAlign: 'end' };
  return { textAlign: 'start' };
}

function normalizeSortValue(value: unknown): string | number {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  const text = String(value).trim();
  const parsedDate = Date.parse(text);
  if (!Number.isNaN(parsedDate) && /[-/T:]/.test(text)) return parsedDate;
  const parsedNumber = Number(text.replace(/,/g, ''));
  if (!Number.isNaN(parsedNumber) && text !== '') return parsedNumber;
  return text;
}

function readSortValue<T>(column: DataTableColumn<T>, row: T): unknown {
  if ('sortValue' in column && typeof column.sortValue === 'function') return column.sortValue(row);
  const key = 'id' in column ? column.id : column.key;
  return (row as Record<string, unknown>)[key];
}

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  loading = false,
  loadingMessage = 'جاري التحميل...',
  emptyMessage = 'لا توجد بيانات.',
  errorMessage,
  className,
  compact = false,
  density,
  stickyHeader = true,
  maxHeight,
  caption,
  ariaLabel,
  rowClassName,
  onRowClick,
  rowTitle,
  defaultSort,
  sortState,
  onSortChange,
  pagination,
  rows,
  rowKey,
  empty,
  selection,
}: SharedDataTableProps<T>) {
  const [internalSort, setInternalSort] = useState<DataTableSortState | null>(defaultSort || null);
  const currentSort = sortState === undefined ? internalSort : sortState;
  const collator = useMemo(() => new Intl.Collator(['ar', 'en'], { numeric: true, sensitivity: 'base' }), []);

  function updateSort(next: DataTableSortState | null) {
    if (sortState === undefined) setInternalSort(next);
    onSortChange?.(next);
  }

  const normalizedColumns = useMemo(() => columns.map((column) => {
    if ('id' in column) return column;
    return {
      id: column.key,
      header: column.header,
      render: (row: T) => column.cell(row),
      className: column.className,
    };
  }), [columns]);
  const sourceRows = data ?? rows ?? [];
  const rowKeyReader = getRowKey ?? rowKey ?? ((_: T, rowIndex: number) => String(rowIndex));

  const sortedRows = useMemo(() => {
    if (!currentSort) return sourceRows;
    const column = normalizedColumns.find((entry) => entry.id === currentSort.columnId);
    if (!column || !column.sortable) return sourceRows;
    const direction = currentSort.direction === 'asc' ? 1 : -1;
    return [...sourceRows].sort((a, b) => {
      const left = normalizeSortValue(readSortValue(column, a));
      const right = normalizeSortValue(readSortValue(column, b));
      if (typeof left === 'number' && typeof right === 'number') {
        if (left === right) return 0;
        return left > right ? direction : -direction;
      }
      return collator.compare(String(left), String(right)) * direction;
    });
  }, [normalizedColumns, currentSort, sourceRows, collator]);

  const totalItems = pagination?.totalItems ?? sortedRows.length;
  const pageSize = pagination?.pageSize || totalItems || 1;
  const totalPages = pagination ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1;
  const currentPage = pagination ? Math.min(Math.max(1, pagination.page), totalPages) : 1;
  const rangeStart = pagination ? ((currentPage - 1) * pageSize) + 1 : (totalItems ? 1 : 0);
  const rangeEnd = pagination ? Math.min(currentPage * pageSize, totalItems) : totalItems;
  const visibleRows = pagination && pagination.totalItems == null ? sortedRows.slice(rangeStart - 1, rangeEnd) : sortedRows;

  const tableWrapClassName = [
    'table-wrap',
    stickyHeader ? 'table-wrap-sticky' : '',
    (compact || density === 'compact') ? 'table-wrap-compact' : '',
    className || '',
  ].filter(Boolean).join(' ');
  const tableWrapStyle = maxHeight
    ? { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }
    : undefined;

  const interactive = typeof onRowClick === 'function';

  return (
    <>
      <div className={tableWrapClassName} style={tableWrapStyle}>
        <table aria-label={ariaLabel}>
          {caption ? <caption className="table-caption">{caption}</caption> : null}
          <thead>
            <tr>
              {selection ? (
                <th>
                  <input
                    type="checkbox"
                    aria-label="تحديد كل الصفوف الظاهرة"
                    checked={Boolean(visibleRows.length) && visibleRows.every((row, i) => selection.selectedKeys.includes(rowKeyReader(row, pagination ? (rangeStart - 1) + i : i)))}
                    ref={(node) => {
                      if (!node) return;
                      const keys = visibleRows.map((row, i) => rowKeyReader(row, pagination ? (rangeStart - 1) + i : i));
                      const all = keys.length > 0 && keys.every((key) => selection.selectedKeys.includes(key));
                      const some = !all && keys.some((key) => selection.selectedKeys.includes(key));
                      node.indeterminate = some;
                    }}
                    onChange={(event) => {
                      const nextSelected = new Set(selection.selectedKeys);
                      const keys = visibleRows.map((row, i) => rowKeyReader(row, pagination ? (rangeStart - 1) + i : i));
                      if (event.target.checked) keys.forEach((key) => nextSelected.add(key));
                      else keys.forEach((key) => nextSelected.delete(key));
                      selection.onChange(Array.from(nextSelected));
                    }}
                  />
                </th>
              ) : null}
              {normalizedColumns.map((column) => {
                const isActiveSort = currentSort?.columnId === column.id;
                const sortMark = !column.sortable
                  ? null
                  : isActiveSort
                    ? (currentSort?.direction === 'asc' ? '↑' : '↓')
                    : '↕';
                return (
                  <th
                  key={column.id}
                    className={[
                      column.headerClassName || '',
                      column.hideOnMobile ? 'hide-on-mobile' : '',
                      column.sortable ? 'table-sortable-header' : '',
                    ].filter(Boolean).join(' ')}
                    style={{
                      ...alignStyle(column.align),
                      ...(('width' in column && column.width != null) ? { width: typeof column.width === 'number' ? `${column.width}px` : column.width } : {}),
                    }}
                  >
                    {'sortable' in column && column.sortable ? (
                      <button
                        type="button"
                        className="table-sort-button"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          padding: 0,
                          margin: 0,
                          width: '100%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: column.align === 'end' ? 'flex-end' : column.align === 'center' ? 'center' : 'flex-start',
                          textAlign: column.align === 'end' ? 'end' : column.align === 'center' ? 'center' : 'start',
                          gap: 6,
                          font: 'inherit',
                          color: 'inherit',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          const next = currentSort?.columnId === column.id
                            ? { columnId: column.id, direction: currentSort.direction === 'asc' ? 'desc' as const : 'asc' as const }
                            : { columnId: column.id, direction: 'asc' as const };
                          updateSort(next);
                        }}
                        aria-label={`ترتيب حسب ${typeof column.header === 'string' ? column.header : 'العمود'}`}
                      >
                        <span>{column.header}</span>
                        <span
                          className="muted"
                          aria-hidden
                          style={{
                            fontSize: 13,
                            opacity: isActiveSort ? 0.9 : 0.6,
                            lineHeight: 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          {sortMark}
                        </span>
                      </button>
                    ) : column.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {errorMessage ? (
              <tr>
                <td colSpan={normalizedColumns.length + (selection ? 1 : 0)}>{errorMessage}</td>
              </tr>
            ) : loading ? (
              <tr>
                <td colSpan={normalizedColumns.length + (selection ? 1 : 0)}>{loadingMessage}</td>
              </tr>
            ) : !visibleRows.length ? (
              <tr>
                <td colSpan={normalizedColumns.length + (selection ? 1 : 0)}>{empty ?? emptyMessage}</td>
              </tr>
            ) : visibleRows.map((row, visibleRowIndex) => {
              const absoluteRowIndex = pagination ? (rangeStart - 1) + visibleRowIndex : visibleRowIndex;
              const key = rowKeyReader(row, absoluteRowIndex);
              const computedClassName = [
                interactive ? 'table-row-clickable' : '',
                rowClassName?.(row, absoluteRowIndex) || '',
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
                    <td onClick={(event) => event.stopPropagation()}>
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
                  {normalizedColumns.map((column) => (
                    <td key={column.id} className={[column.className || '', column.hideOnMobile ? 'hide-on-mobile' : ''].filter(Boolean).join(' ')} style={alignStyle(column.align)}>
                      {column.render(row, absoluteRowIndex)}
                    </td>
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
