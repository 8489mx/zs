import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import type { PosCartPanelProps } from './posCartPanel.types';

export function PosCartFooter(props: Pick<PosCartPanelProps,
  'paymentType' | 'submitMessage' | 'isError' | 'canShowLastSaleActions' | 'lastSaleDocNo' | 'preferredPrintPageSize' |
  'cart' | 'heldDrafts' | 'isPending' |
  'onReprintLastSale' | 'onPrintReceiptNow' | 'onPrintA4Now' |
  'onExportHeldDrafts' | 'onClearHeldDrafts' | 'onRecallDraft' | 'onDeleteDraft' | 'onResetDraft'
>) {
  const shouldShowReceiptAction = props.preferredPrintPageSize === 'receipt';
  const shouldShowA4Action = props.preferredPrintPageSize !== 'receipt';

  return (
    <>
      {props.submitMessage ? (
        <div className={props.isError ? 'error-box pos-compact-message' : 'success-box pos-compact-message'}>
          <div>{props.submitMessage}</div>
          {!props.isError && props.canShowLastSaleActions && props.lastSaleDocNo ? (
            <div className="pos-post-sale-inline-note">
              <span className="status-badge">{props.lastSaleDocNo}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {props.canShowLastSaleActions ? (
        <div className="actions pos-primary-actions pos-primary-actions-sticky section-actions-clean pos-post-sale-bar">
          <div className="pos-post-sale-bar-copy">
            <span className="pos-post-sale-bar-kicker">تم الحفظ بنجاح</span>
            <strong>{props.lastSaleDocNo ? `فاتورة ${props.lastSaleDocNo}` : 'آخر فاتورة جاهزة الآن'}</strong>
            <span className="muted small">اطبع آخر فاتورة أو ابدأ عميلًا جديدًا مباشرة.</span>
          </div>
          <div className="actions compact-actions pos-post-sale-bar-actions">
            {shouldShowReceiptAction ? <Button variant="secondary" onClick={props.onPrintReceiptNow}>ريسيت (F2)</Button> : null}
            {shouldShowA4Action ? <Button variant="secondary" onClick={props.onPrintA4Now}>A4 (F12)</Button> : null}
            <Button variant="secondary" onClick={props.onReprintLastSale}>إعادة الطباعة</Button>
            <Button variant="success" onClick={props.onResetDraft}>عميل جديد</Button>
          </div>
        </div>
      ) : null}

      {props.heldDrafts.length ? (
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
