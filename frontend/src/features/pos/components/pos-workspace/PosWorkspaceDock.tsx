import { formatCurrency } from '@/lib/format';
import { Button } from '@/shared/ui/button';

interface PosWorkspaceDockProps {
  selectedCustomerName: string;
  paymentModeLabel: string;
  piecesCount: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  amountDue: number;
  isCredit: boolean;
  canSubmitSale: boolean;
  canSubmitHint: string;
  isPending: boolean;
  onFocusSearch: () => void;
  onPrintPreview: () => void;
  onResetDraft: () => void;
  onHoldDraft: () => void;
  onSubmit: () => void;
}

export function PosWorkspaceDock({
  selectedCustomerName,
  paymentModeLabel,
  piecesCount,
  total,
  paidAmount,
  changeAmount,
  amountDue,
  isCredit,
  canSubmitSale,
  canSubmitHint,
  isPending,
  onFocusSearch,
  onPrintPreview,
  onResetDraft,
  onHoldDraft,
  onSubmit,
}: PosWorkspaceDockProps) {
  const summaryItems = [
    { key: 'customer', label: 'العميل', value: selectedCustomerName || 'عميل نقدي', tone: 'surface' },
    { key: 'pieces', label: 'عدد القطع', value: String(piecesCount), tone: 'surface' },
    { key: 'payment', label: 'الدفع', value: paymentModeLabel, tone: 'surface' },
    { key: 'total', label: 'المطلوب دفعه', value: formatCurrency(total), tone: 'danger' },
    { key: 'paid', label: 'المدفوع', value: formatCurrency(isCredit ? 0 : paidAmount), tone: 'success' },
    {
      key: 'change',
      label: isCredit ? 'المتبقي على العميل' : 'الباقي للعميل',
      value: formatCurrency(isCredit ? amountDue : changeAmount),
      tone: 'warning',
    },
  ];

  return (
    <section className="pos-workspace-dock" aria-label="شريط الكاشير السريع">
      <div className="pos-workspace-dock-ribbon-track">
        <div className="pos-workspace-dock-summary pos-workspace-dock-summary-extended">
          {summaryItems.map((item) => (
            <div key={item.key} className={`pos-workspace-dock-chip pos-workspace-dock-chip--${item.tone}`.trim()}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <div className={`pos-workspace-dock-hint pos-workspace-dock-hint-inline ${canSubmitSale ? 'is-ready' : 'is-warning'}`.trim()}>
          {canSubmitSale ? 'جاهز للإتمام الآن.' : (canSubmitHint || 'أكمل البيانات المطلوبة قبل إتمام البيع.')}
        </div>

        <div className="pos-workspace-dock-actions pos-workspace-dock-actions-inline">
          <Button type="button" variant="secondary" onClick={onFocusSearch}>البحث F3</Button>
          <Button type="button" variant="secondary" onClick={onPrintPreview} disabled={!piecesCount}>معاينة</Button>
          <Button type="button" variant="secondary" onClick={onResetDraft} disabled={isPending}>تفريغ</Button>
          <Button type="button" variant="secondary" onClick={onHoldDraft} disabled={!piecesCount || isPending}>تعليق F4</Button>
          <Button type="button" variant="success" onClick={onSubmit} disabled={isPending || !canSubmitSale}>
            {isPending ? 'جارٍ الحفظ...' : 'إتمام البيع F2'}
          </Button>
        </div>
      </div>
    </section>
  );
}
