import { Link } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';

export function InventoryWorkspaceHeader({
  canPrint,
  hasRows,
  description,
  currentSection,
  onReset,
  onCopySummary,
  onExportExcel,
  onPrintList,
  onPrintByCategory: _onPrintByCategory,
  onPrintByHighestValue: _onPrintByHighestValue,
}: {
  canPrint: boolean;
  hasRows: boolean;
  description?: string;
  currentSection: string;
  onReset: () => void;
  onCopySummary: () => void;
  onExportExcel: () => void;
  onPrintList: () => void;
  onPrintByCategory?: () => void;
  onPrintByHighestValue?: () => void;
}) {
  const primaryAction = currentSection === 'transfers'
    ? { to: '/inventory/transfers', label: 'تحويل جديد' }
    : currentSection === 'counts'
      ? { to: '/inventory/counts', label: 'جلسة جرد' }
      : currentSection === 'damaged'
        ? { to: '/inventory/damaged', label: 'سجل التالف' }
        : currentSection === 'movements'
          ? { to: '/inventory/movements', label: 'سجل الحركات' }
          : { to: '/inventory/overview', label: 'حالة المخزون' };

  return (
    <PageHeader
      title="المخزون"
      description={description}
      badge={<span className="nav-pill">تشغيل المخزون</span>}
      actions={(
        <div className="actions compact-actions">
          <Link to={primaryAction.to}><Button>{primaryAction.label}</Button></Link>
          <Button variant="secondary" onClick={onReset}>إعادة ضبط</Button>
          <Button variant="secondary" onClick={onCopySummary}>نسخ</Button>
          <Button variant="secondary" onClick={onExportExcel} disabled={!hasRows}>تصدير</Button>
          <Button variant="secondary" onClick={onPrintList} disabled={!hasRows || !canPrint} title="طباعة تقرير المخزون">طباعة</Button>
        </div>
      )}
    />
  );
}
