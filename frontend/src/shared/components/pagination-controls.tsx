import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions?: number[];
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
  pageSizeOptions = [10, 20, 50, 100],
  totalItems,
  rangeStart,
  rangeEnd,
  onPageChange,
  onPageSizeChange,
  itemLabel,
}: PaginationControlsProps) {
  const { t } = useTranslation();
  if (!totalItems) return null;

  const resolvedItemLabel = itemLabel || t('pagination.default_item', 'سجل');

  return (
    <div className="pagination-bar" role="navigation" aria-label={t('pagination.navigation', 'تنقل الصفحات')}>
      <div className="pagination-meta">
        <span className="pagination-count">
          {t('pagination.range', 'عرض {{rangeStart}}-{{rangeEnd}} من أصل {{totalItems}} {{itemLabel}}', {
            rangeStart,
            rangeEnd,
            totalItems,
            itemLabel: resolvedItemLabel,
          })}
        </span>
        <label className="pagination-page-size">
          <span>{t('pagination.per_page', 'لكل صفحة')}</span>
          <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="pagination-actions">
        <Button variant="secondary" type="button" onClick={() => onPageChange(1)} disabled={page <= 1}>
          {t('pagination.first', 'الأولى')}
        </Button>
        <Button variant="secondary" type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          {t('pagination.prev', 'السابق')}
        </Button>
        <span className="pagination-page-indicator">
          {t('pagination.page_of', 'صفحة {{page}} من {{totalPages}}', { page, totalPages })}
        </span>
        <Button variant="secondary" type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          {t('pagination.next', 'التالي')}
        </Button>
        <Button variant="secondary" type="button" onClick={() => onPageChange(totalPages)} disabled={page >= totalPages}>
          {t('pagination.last', 'الأخيرة')}
        </Button>
      </div>
    </div>
  );
}
