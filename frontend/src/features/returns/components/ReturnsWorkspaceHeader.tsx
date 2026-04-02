import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/format';

type Props = {
  totalItems: number;
  salesReturns: number;
  purchaseReturns: number;
  totalAmount: number;
  copyFeedback: { kind: 'success' | 'error'; text: string } | null;
  onReset: () => void;
  onCopySummary: () => void | Promise<void>;
  onExportCsv: () => void | Promise<void>;
  onPrint: () => void | Promise<void>;
};

export function ReturnsWorkspaceHeader({
  totalItems,
  salesReturns,
  purchaseReturns,
  totalAmount,
  copyFeedback,
  onReset,
  onCopySummary,
  onExportCsv,
  onPrint,
}: Props) {
  return (
    <>
      <PageHeader title="المرتجعات" description="سجل المرتجع من نفس الصفحة وراجع التفاصيل فورًا بدون خطوات كثيرة." badge={<span className="nav-pill">إدارة المرتجعات</span>} actions={<div className="actions compact-actions"><Button variant="secondary" onClick={onReset}>إعادة الضبط</Button><Button variant="secondary" onClick={() => void onCopySummary()}>نسخ الملخص</Button><Button variant="secondary" onClick={() => void onExportCsv()} disabled={!totalItems}>تصدير CSV</Button><Button variant="secondary" onClick={() => void onPrint()} disabled={!totalItems}>طباعة السجل</Button></div>} />
      <div className="stats-grid compact-grid workspace-stats-grid">
        <div className="stat-card"><span>إجمالي المرتجعات</span><strong>{totalItems}</strong></div>
        <div className="stat-card"><span>مرتجع بيع</span><strong>{salesReturns}</strong></div>
        <div className="stat-card"><span>مرتجع شراء</span><strong>{purchaseReturns}</strong></div>
        <div className="stat-card"><span>الإجمالي</span><strong>{formatCurrency(totalAmount)}</strong></div>
      </div>
      {copyFeedback ? <div className={copyFeedback.kind === 'error' ? 'warning-box' : 'success-box'}>{copyFeedback.text}</div> : null}
    </>
  );
}
