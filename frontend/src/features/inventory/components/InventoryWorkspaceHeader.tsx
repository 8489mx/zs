import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';

export function InventoryWorkspaceHeader({
  canPrint,
  hasRows,
  description,
  onReset,
  onCopySummary,
  onExportCsv,
  onPrintList
}: {
  canPrint: boolean;
  hasRows: boolean;
  description?: string;
  onReset: () => void;
  onCopySummary: () => void;
  onExportCsv: () => void;
  onPrintList: () => void;
}) {
  return (
    <PageHeader
      title="المخزون"
      description={description}
      badge={<span className="nav-pill">تشغيل المخزون</span>}
      actions={<div className="actions compact-actions"><Button variant="secondary" onClick={onReset}>إعادة الضبط</Button><Button variant="secondary" onClick={onCopySummary}>نسخ الملخص</Button><Button variant="secondary" onClick={onExportCsv} disabled={!hasRows}>تصدير CSV</Button><Button variant="secondary" onClick={onPrintList} disabled={!hasRows || !canPrint}>طباعة القائمة</Button></div>}
    />
  );
}
