import { Button } from '@/components/ui/Button';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions: number[];
  totalItems: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  itemLabel?: string;
}

export function PaginationControls({
  page,
  totalPages,
  pageSize,
  pageSizeOptions,
  totalItems,
  rangeStart,
  rangeEnd,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'سجل',
}: PaginationControlsProps) {
  if (!totalItems) return null;

  return (
    <div className="pagination-bar" role="navigation" aria-label="تنقل الصفحات">
      <div className="pagination-meta">
        <span className="pagination-count">عرض {rangeStart}-{rangeEnd} من أصل {totalItems} {itemLabel}</span>
        <label className="pagination-page-size">
          <span>لكل صفحة</span>
          <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="pagination-actions">
        <Button variant="secondary" type="button" onClick={() => onPageChange(1)} disabled={page <= 1}>الأولى</Button>
        <Button variant="secondary" type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>السابق</Button>
        <span className="pagination-page-indicator">صفحة {page} من {totalPages}</span>
        <Button variant="secondary" type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>التالي</Button>
        <Button variant="secondary" type="button" onClick={() => onPageChange(totalPages)} disabled={page >= totalPages}>الأخيرة</Button>
      </div>
    </div>
  );
}
