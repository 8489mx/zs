import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [isSmartRestockOpen, setIsSmartRestockOpen] = useState(false);

  const primaryAction = currentSection === 'transfers'
    ? { to: '/inventory/issue-order/new', label: 'إذن صرف جديد' }
    : null;

  return (
    <>
      <PageHeader
        title={t('inventory.inventory_workspace_header.s0', "المخزون")}
        description={description}
        badge={<span className="nav-pill">{t('inventory.inventory_workspace_header.s1', "تشغيل المخزون")}</span>}
        actions={(
          <div className="actions compact-actions">
            {primaryAction ? (
              <Link to={primaryAction.to}><Button>{primaryAction.label}</Button></Link>
            ) : null}
            <Link to="/inventory/reordering">
              <Button
                variant="secondary"
                title={t('inventory.inventory_workspace_header.s2', "قواعد إعادة الطلب التلقائي وتوليد أوامر الشراء (Min/Max Rules)")}
                style={{
                  fontWeight: 700,
                  color: '#1e40af',
                  backgroundColor: '#eff6ff',
                  borderColor: '#bfdbfe',
                }}
              >
                {t('inventory.inventory_workspace_header.s3', "قواعد إعادة الطلب")}
              </Button>
            </Link>
            <Button
              variant="secondary"
              onClick={() => setIsSmartRestockOpen(true)}
              title={t('inventory.inventory_workspace_header.s4', "إمداد الأرفف الذكي وتعويض مبيعات 48 ساعة")}
              style={{
                fontWeight: 700,
                color: '#047857',
                backgroundColor: '#ecfdf5',
                borderColor: '#a7f3d0',
              }}
            >
              {t('inventory.inventory_workspace_header.s5', "إمداد الأرفف الذكي")}
            </Button>
            <Button variant="secondary" onClick={onReset}>{t('inventory.inventory_workspace_header.s6', "إعادة ضبط")}</Button>
            <Button variant="secondary" onClick={onCopySummary}>{t('inventory.inventory_workspace_header.s7', "نسخ")}</Button>
            <Button variant="secondary" onClick={onExportExcel} disabled={!hasRows}>{t('inventory.inventory_workspace_header.s8', "تصدير")}</Button>
            <Button variant="secondary" onClick={onPrintList} disabled={!hasRows || !canPrint} title={t('inventory.inventory_workspace_header.s9', "طباعة تقرير المخزون")}>{t('inventory.inventory_workspace_header.s10', "طباعة")}</Button>
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
