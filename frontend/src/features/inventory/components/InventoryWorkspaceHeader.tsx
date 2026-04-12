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
  onExportCsv,
  onPrintList
}: {
  canPrint: boolean;
  hasRows: boolean;
  description?: string;
  currentSection: string;
  onReset: () => void;
  onCopySummary: () => void;
  onExportCsv: () => void;
  onPrintList: () => void;
}) {
  const primaryAction = currentSection === 'transfers'
    ? { to: '/inventory/transfers', label: 'إنشاء تحويل جديد' }
    : currentSection === 'counts'
      ? { to: '/inventory/counts', label: 'بدء جلسة جرد' }
      : currentSection === 'damaged'
        ? { to: '/inventory/damaged', label: 'مراجعة التالف' }
        : currentSection === 'movements'
          ? { to: '/inventory/movements', label: 'فتح سجل الحركات' }
          : { to: '/inventory/overview', label: 'متابعة حالة المخزون' };

  return (
    <PageHeader
      title="المخزون"
      description={description}
      badge={<span className="nav-pill">تشغيل المخزون</span>}
      actions={(
        <div className="actions compact-actions">
          <Link to={primaryAction.to}><Button>{primaryAction.label}</Button></Link>
          <Button variant="secondary" onClick={onReset}>إعادة الضبط</Button>
          <Button variant="secondary" onClick={onCopySummary}>نسخ الملخص</Button>
          <Button variant="secondary" onClick={onExportCsv} disabled={!hasRows}>تصدير CSV</Button>
          <Button variant="secondary" onClick={onPrintList} disabled={!hasRows || !canPrint}>طباعة القائمة</Button>
        </div>
      )}
    />
  );
}
