import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';

type Props = {
  totalItems: number;
  salesReturns: number;
  purchaseReturns: number;
  copyFeedback: { kind: 'success' | 'error'; text: string } | null;
  onReset: () => void;
  onCopySummary: () => void | Promise<void>;
  onExportCsv: () => void | Promise<void>;
  onPrint: () => void | Promise<void>;
  onOpenCreate?: () => void;
};

export function ReturnsWorkspaceHeader({
  totalItems,
  salesReturns,
  purchaseReturns,
  copyFeedback,
  onReset,
  onCopySummary,
  onExportCsv,
  onPrint,
  onOpenCreate,
}: Props) {
  return (
    <>
      <PageHeader
        title="المرتجعات"
        description="إدارة ومتابعة مرتجعات المبيعات والمشتريات وتسجيل المرتجعات الجديدة."
        badge={<span className="nav-pill">بيع {salesReturns} / شراء {purchaseReturns}</span>}
        actions={(
          <div className="actions compact-actions">
            {onOpenCreate && <Button variant="primary" onClick={onOpenCreate}>+ مرتجع جديد</Button>}
            <Button variant="secondary" onClick={onReset}>إعادة ضبط</Button>
            <Button variant="secondary" onClick={() => void onCopySummary()} disabled={!totalItems}>نسخ</Button>
            <Button variant="secondary" onClick={() => void onExportCsv()} disabled={!totalItems}>تصدير</Button>
            <Button variant="secondary" onClick={() => void onPrint()} disabled={!totalItems}>طباعة</Button>
          </div>
        )}
      />
      {copyFeedback ? <div className={copyFeedback.kind === 'error' ? 'warning-box' : 'success-box'}>{copyFeedback.text}</div> : null}
    </>
  );
}
