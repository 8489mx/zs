import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { SmartReplenishmentModal } from './SmartReplenishmentModal';

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
  const [isSmartRestockOpen, setIsSmartRestockOpen] = useState(false);

  const primaryAction = currentSection === 'transfers'
    ? { to: '/inventory/issue-order/new', label: 'إذن صرف جديد' }
    : currentSection === 'counts'
      ? { to: '/inventory/counts', label: 'جلسة جرد' }
      : currentSection === 'damaged'
        ? { to: '/inventory/damaged', label: 'سجل التالف' }
        : currentSection === 'movements'
          ? { to: '/inventory/movements', label: 'سجل الحركات' }
          : { to: '/inventory/overview', label: 'حالة المخزون' };

  return (
    <>
      <PageHeader
        title="المخزون"
        description={description}
        badge={<span className="nav-pill">تشغيل المخزون</span>}
        actions={(
          <div className="actions compact-actions">
            <Link to={primaryAction.to}><Button>{primaryAction.label}</Button></Link>
            <Button
              variant="secondary"
              onClick={() => setIsSmartRestockOpen(true)}
              title="إمداد الأرفف الذكي وتعويض مبيعات 48 ساعة"
              style={{
                fontWeight: 700,
                color: '#047857',
                backgroundColor: '#ecfdf5',
                borderColor: '#a7f3d0',
              }}
            >
              إمداد الأرفف الذكي
            </Button>
            <Button variant="secondary" onClick={onReset}>إعادة ضبط</Button>
            <Button variant="secondary" onClick={onCopySummary}>نسخ</Button>
            <Button variant="secondary" onClick={onExportExcel} disabled={!hasRows}>تصدير</Button>
            <Button variant="secondary" onClick={onPrintList} disabled={!hasRows || !canPrint} title="طباعة تقرير المخزون">طباعة</Button>
          </div>
        )}
      />
      <SmartReplenishmentModal
        isOpen={isSmartRestockOpen}
        onClose={() => setIsSmartRestockOpen(false)}
      />
    </>
  );
}
