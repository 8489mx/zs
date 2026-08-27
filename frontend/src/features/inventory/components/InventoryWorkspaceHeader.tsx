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
  onPrintByCategory,
  onPrintByHighestValue,
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
          <Button variant="secondary" onClick={onExportExcel} disabled={!hasRows}>تصدير Excel</Button>
          <Button variant="secondary" onClick={onPrintList} disabled={!hasRows || !canPrint} title="طباعة تقرير المخزون مرتباً من الأقل مخزوناً للأعلى">طباعة القائمة</Button>
          {currentSection === 'overview' && onPrintByCategory && onPrintByHighestValue && (
            <>
              <Button variant="secondary" onClick={onPrintByCategory} disabled={!hasRows || !canPrint} title="طباعة الأصناف مرتبة حسب الأقسام لتسهيل الجرد على الرفوف">جرد بالأقسام</Button>
              <Button variant="secondary" onClick={onPrintByHighestValue} disabled={!hasRows || !canPrint} title="طباعة الأصناف مرتبة من الأعلى قيمة إجمالية للأقل">الأعلى قيمة</Button>
            </>
          )}
        </div>
      )}
    />
  );
}
