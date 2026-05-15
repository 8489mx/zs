import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import type { PosCartPanelProps } from './posCartPanel.types';

export function PosCartFooter(props: Pick<PosCartPanelProps,
  'paymentType' | 'submitMessage' | 'isError' | 'canShowLastSaleActions' | 'lastSaleDocNo' | 'preferredPrintPageSize' |
  'cart' | 'heldDrafts' | 'isPending' |
  'onReprintLastSale' | 'onPrintReceiptNow' | 'onPrintA4Now' |
  'onExportHeldDrafts' | 'onClearHeldDrafts' | 'onRecallDraft' | 'onDeleteDraft' | 'onResetDraft'
  | 'showHeldDraftsInline'
>) {
  const shouldShowSubmitMessage = Boolean(props.submitMessage) && (props.isError || !props.canShowLastSaleActions);

  return (
    <>
      {shouldShowSubmitMessage ? (
        <div className={props.isError ? 'error-box pos-compact-message' : 'success-box pos-compact-message'}>
          <div>{props.submitMessage}</div>
        </div>
      ) : null}

      {props.showHeldDraftsInline === false ? null : props.heldDrafts.length ? (
        <>
          <div className="divider" />
          <div className="list-stack">
            <div className="actions compact-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>الفواتير المعلقة</strong>
              <div className="actions compact-actions">
                <Button variant="secondary" onClick={props.onExportHeldDrafts}>تصدير</Button>
                <Button variant="danger" onClick={props.onClearHeldDrafts}>حذف الكل</Button>
              </div>
            </div>
            {props.heldDrafts.map((draft) => (
              <div className="list-row pos-held-row" key={draft.id}>
                <div><strong>{draft.label}</strong><div className="muted small">{draft.itemsCount} بنود · {formatCurrency(draft.total)}</div></div>
                <div className="actions compact-actions">
                  <Button variant="secondary" onClick={() => props.onRecallDraft(draft.id)}>استرجاع</Button>
                  <Button variant="danger" onClick={() => props.onDeleteDraft(draft.id)}>حذف</Button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
