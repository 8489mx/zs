import { useTranslation } from 'react-i18next';
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
  settings?: any;
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
  settings,
}: PosWorkspaceDockProps) {
  const { t } = useTranslation();
  return (
    <section className="pos-workspace-dock" aria-label={t('pos.pos_workspace.pos_workspace_dock.s0', "شريط الكاشير السريع")} style={{ padding: '0', margin: '0' }}>
      <div className="pos-workspace-dock-ribbon-track" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'nowrap', width: '100%', gap: '16px', padding: '4px 8px', minHeight: 'unset' }}>
        
        <div className="pos-workspace-dock-summary pos-workspace-dock-summary-extended" style={{ display: 'flex', alignItems: 'stretch', gap: '0', flexShrink: 0, padding: '0' }}>
          <div className="pos-workspace-dock-chip pos-workspace-dock-chip--surface" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 20px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{t('pos.pos_workspace.pos_workspace_dock.s1', "إجمالي الكميات")}</span>
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
            <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{t('pos.pos_workspace.pos_workspace_dock.s2', "عدد العناصر")}</span>
            <strong style={{ fontSize: '20px', lineHeight: '1' }}>{itemsCount}</strong>
          </div>
          <div className="pos-workspace-dock-chip" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 24px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{t('pos.pos_workspace.pos_workspace_dock.s3', "المطلوب دفعه")}</span>
            <strong style={{ fontSize: '28px', lineHeight: '1', color: '#0f172a' }}>{formatCurrency(total)}</strong>
          </div>
        </div>

        <div className="pos-workspace-dock-actions pos-workspace-dock-actions-inline" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, padding: '0' }}>
          <Button type="button" variant="secondary" className="pos-dock-btn-hold" onClick={onHoldDraft} disabled={itemsCount === 0 || isPending}>
            <span className="pos-dock-btn-desktop-text">{settings?.restaurantModuleEnabled ? t('pos.pos_workspace.pos_workspace_dock.s4', "إرسال للمطبخ F4") : t('pos.pos_workspace.pos_workspace_dock.s5', "تعليق F4")}</span>
            <span className="pos-dock-btn-mobile-text">{settings?.restaurantModuleEnabled ? t('pos.pos_workspace.pos_workspace_dock.s6', "المطبخ") : t('pos.pos_workspace.pos_workspace_dock.s7', "تعليق")}</span>
          </Button>
          <Button type="button" variant="secondary" className="pos-dock-btn-drafts" onClick={onOpenHeldDrafts}>
            <span className="pos-dock-btn-desktop-text">{settings?.restaurantModuleEnabled ? `طاولات مفتوحة (${heldDraftsCount}) F3` : `معلقة (${heldDraftsCount}) F3`}</span>
            <span className="pos-dock-btn-mobile-text">{settings?.restaurantModuleEnabled ? `طاولات (${heldDraftsCount})` : `معلقة (${heldDraftsCount})`}</span>
          </Button>
          <Button
            type="button"
            variant="success"
            className="pos-dock-btn-submit"
            onClick={onSubmit}
            disabled={isPending || !canOpenCheckout}
            aria-disabled={isPending || !canOpenCheckout}
            title={isPending ? t('pos.pos_workspace.pos_workspace_dock.s8', "جاري تنفيذ البيع") : (checkoutDisabledReason || undefined)}
            style={{ fontSize: '18px', padding: '12px 32px', fontWeight: 'bold', height: 'auto', borderRadius: '8px', minWidth: '150px' }}
          >
            {isPending ? t('pos.pos_workspace.pos_workspace_dock.s9', "جارٍ الحفظ...") : (
              <>
                <span className="pos-dock-btn-desktop-text">{t('pos.pos_workspace.pos_workspace_dock.s10', "إتمام البيع F2")}</span>
                <span className="pos-dock-btn-mobile-text">{t('pos.pos_workspace.pos_workspace_dock.s11', "إتمام البيع")}</span>
              </>
            )}
          </Button>
        </div>

      </div>
    </section>
  );
}
