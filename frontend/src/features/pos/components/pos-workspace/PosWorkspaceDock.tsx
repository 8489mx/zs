import { formatCurrency } from '@/lib/format';
import { Button } from '@/shared/ui/button';

interface PosWorkspaceDockProps {
  selectedCustomerName: string;
  paymentModeLabel: string;
  cartCount: number;
  total: number;
  amountDue: number;
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
  amountDue,
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
    { key: 'total', label: 'الإجمالي', value: formatCurrency(total) },
    { key: 'payment', label: 'الدفع', value: paymentModeLabel },
  ];

  return (
    <section className="pos-workspace-dock" aria-label="شريط الكاشير السريع">
      <div className="pos-workspace-dock-summary">
        {summaryItems.map((item) => (
          <div key={item.key} className="pos-workspace-dock-chip">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="pos-workspace-dock-main">
        <div className="pos-workspace-dock-copy">
          <div className="pos-workspace-dock-total">المطلوب الآن: <strong>{formatCurrency(amountDue)}</strong></div>
          <div className={`pos-workspace-dock-hint ${canSubmitSale ? 'is-ready' : 'is-warning'}`.trim()}>
            {canSubmitSale ? 'جاهز للإتمام الآن.' : (canSubmitHint || 'أكمل البيانات المطلوبة قبل إتمام البيع.')}
          </div>
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
