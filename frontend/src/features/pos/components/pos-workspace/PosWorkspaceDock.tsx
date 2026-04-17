import { formatCurrency } from '@/lib/format';
import { Button } from '@/shared/ui/button';

interface PosWorkspaceDockProps {
  selectedCustomerName: string;
  paymentModeLabel: string;
  cartCount: number;
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
  cartCount,
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
    { key: 'customer', label: 'العميل', value: selectedCustomerName || 'عميل نقدي' },
    { key: 'items', label: 'العناصر', value: String(cartCount) },
    { key: 'payment', label: 'الدفع', value: paymentModeLabel },
    { key: 'total', label: 'المطلوب دفعه', value: formatCurrency(total) },
    { key: 'paid', label: 'المدفوع', value: formatCurrency(isCredit ? 0 : paidAmount) },
    { key: 'change', label: isCredit ? 'المتبقي على العميل' : 'الباقي للعميل', value: formatCurrency(isCredit ? amountDue : changeAmount) },
  ];

  return (
    <section className="pos-workspace-dock" aria-label="شريط الكاشير السريع">
      <div className="pos-workspace-dock-summary pos-workspace-dock-summary-extended">
        {summaryItems.map((item) => (
          <div key={item.key} className="pos-workspace-dock-chip">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="pos-workspace-dock-main">
        <div className={`pos-workspace-dock-hint ${canSubmitSale ? 'is-ready' : 'is-warning'}`.trim()}>
          {canSubmitSale ? 'جاهز للإتمام الآن.' : (canSubmitHint || 'أكمل البيانات المطلوبة قبل إتمام البيع.')}
        </div>

        <div className="pos-workspace-dock-actions">
          <Button type="button" variant="secondary" onClick={onFocusSearch}>تركيز البحث (F3)</Button>
          <Button type="button" variant="secondary" onClick={onPrintPreview} disabled={!cartCount}>معاينة</Button>
          <Button type="button" variant="secondary" onClick={onResetDraft} disabled={isPending}>تفريغ</Button>
          <Button type="button" variant="secondary" onClick={onHoldDraft} disabled={!cartCount || isPending}>تعليق (F4)</Button>
          <Button type="button" variant="success" onClick={onSubmit} disabled={isPending || !canSubmitSale}>
            {isPending ? 'جارٍ الحفظ...' : 'إتمام البيع (F9)'}
          </Button>
        </div>
      </div>
    </section>
  );
}
