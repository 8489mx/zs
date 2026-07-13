import { formatCurrency } from '@/lib/format';
import { Button } from '@/shared/ui/button';
interface PosWorkspaceDockProps {
  qtySummaries: string[];
  itemsCount: number;
  total: number;
  canOpenCheckout: boolean;
  checkoutDisabledReason: string;
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
  qtySummaries,
  itemsCount,
  total,
  canOpenCheckout,
  checkoutDisabledReason,
  isPending,
  heldDraftsCount,
  onHoldDraft,
  onOpenHeldDrafts,
  onSubmit,
}: PosWorkspaceDockProps) {
  return (
    <section className="pos-workspace-dock" aria-label="شريط الكاشير السريع" style={{ padding: '0', margin: '0' }}>
      <div className="pos-workspace-dock-ribbon-track" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'nowrap', width: '100%', gap: '16px', padding: '4px 8px', minHeight: 'unset' }}>
        
        <div className="pos-workspace-dock-summary pos-workspace-dock-summary-extended" style={{ display: 'flex', alignItems: 'stretch', gap: '0', flexShrink: 0, padding: '0' }}>
          <div className="pos-workspace-dock-chip pos-workspace-dock-chip--surface" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 20px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold' }}>إجمالي الكميات</span>
            {qtySummaries.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
                {qtySummaries.map((s, i) => (
                  <strong key={i} style={{ fontSize: qtySummaries.length > 1 ? '16px' : '20px', lineHeight: '1' }}>{s}</strong>
                ))}
              </div>
            ) : (
              <strong style={{ fontSize: '20px', lineHeight: '1', marginTop: '2px' }}>0</strong>
            )}
          </div>
          <div className="pos-workspace-dock-chip pos-workspace-dock-chip--surface" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 20px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold' }}>عدد العناصر</span>
            <strong style={{ fontSize: '20px', lineHeight: '1' }}>{itemsCount.toLocaleString('ar-EG')}</strong>
          </div>
          <div className="pos-workspace-dock-chip" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 24px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>المطلوب دفعه</span>
            <strong style={{ fontSize: '28px', lineHeight: '1', color: '#0f172a' }}>{formatCurrency(total)}</strong>
          </div>
        </div>

        <div className="pos-workspace-dock-actions pos-workspace-dock-actions-inline" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, padding: '0' }}>
          <Button type="button" variant="secondary" onClick={onHoldDraft} disabled={itemsCount === 0 || isPending}>تعليق F4</Button>
          <Button type="button" variant="secondary" onClick={onOpenHeldDrafts}>الفواتير المعلقة ({heldDraftsCount})</Button>
          <Button
            type="button"
            variant="success"
            onClick={onSubmit}
            disabled={isPending || !canOpenCheckout}
            aria-disabled={isPending || !canOpenCheckout}
            title={isPending ? 'جاري تنفيذ البيع' : (checkoutDisabledReason || undefined)}
            style={{ fontSize: '18px', padding: '12px 32px', fontWeight: 'bold', height: 'auto', borderRadius: '8px', minWidth: '150px' }}
          >
            {isPending ? 'جارٍ الحفظ...' : 'إتمام البيع F2'}
          </Button>
        </div>

      </div>
    </section>
  );
}
