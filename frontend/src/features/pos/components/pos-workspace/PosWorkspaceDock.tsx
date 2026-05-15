import { formatCurrency } from '@/lib/format';
import { Button } from '@/shared/ui/button';

interface PosWorkspaceDockProps {
  piecesCount: number;
  itemsCount: number;
  total: number;
  canSubmitSale: boolean;
  isPending: boolean;
  heldDraftsCount: number;
  onFocusSearch: () => void;
  onPrintPreview: () => void;
  onResetDraft: () => void;
  onHoldDraft: () => void;
  onOpenHeldDrafts: () => void;
  onSubmit: () => void;
}

export function PosWorkspaceDock({
  piecesCount,
  itemsCount,
  total,
  canSubmitSale,
  isPending,
  heldDraftsCount,
  onFocusSearch,
  onPrintPreview,
  onResetDraft,
  onHoldDraft,
  onOpenHeldDrafts,
  onSubmit,
}: PosWorkspaceDockProps) {
  const summaryItems = [
    { key: 'pieces', label: 'عدد القطع', value: String(piecesCount), tone: 'surface' },
    { key: 'items', label: 'عدد العناصر', value: String(itemsCount), tone: 'surface' },
    { key: 'total', label: 'المطلوب دفعه', value: formatCurrency(total), tone: 'primary' },
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

        <div className="pos-workspace-dock-actions pos-workspace-dock-actions-inline">
          <Button type="button" variant="secondary" onClick={onFocusSearch}>البحث F3</Button>
          <Button type="button" variant="secondary" onClick={onPrintPreview} disabled={!piecesCount}>معاينة</Button>
          <Button type="button" variant="secondary" onClick={onResetDraft} disabled={isPending}>تفريغ</Button>
          <Button type="button" variant="secondary" onClick={onHoldDraft} disabled={!piecesCount || isPending}>تعليق F4</Button>
          <Button type="button" variant="secondary" onClick={onOpenHeldDrafts}>الفواتير المعلقة ({heldDraftsCount})</Button>
          <Button type="button" variant="success" onClick={onSubmit} disabled={isPending || !canSubmitSale}>
            {isPending ? 'جارٍ الحفظ...' : 'إتمام البيع F2'}
          </Button>
        </div>
      </div>
    </section>
  );
}
