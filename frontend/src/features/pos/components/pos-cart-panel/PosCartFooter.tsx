import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import type { PosCartPanelProps } from './posCartPanel.types';

export function PosCartFooter(props: Pick<PosCartPanelProps,
  'totals' | 'paymentType' | 'amountDue' | 'submitMessage' | 'isError' | 'canShowLastSaleActions' | 'lastSaleDocNo' |
  'canSubmitSale' | 'canSubmitHint' | 'cart' | 'heldDrafts' | 'isPending' |
  'onPrintPreview' | 'onHoldDraft' | 'onResetDraft' | 'onSubmit' | 'onReprintLastSale' | 'onPrintReceiptNow' | 'onPrintA4Now' | 'onExportPdfNow' |
  'onExportHeldDrafts' | 'onClearHeldDrafts' | 'onRecallDraft' | 'onDeleteDraft' | 'selectedLineKey'
>) {
  return (
    <>
      <div className="metric-list pos-totals-list pos-totals-list-premium">
        <div className="metric-row"><span>الإجمالي قبل الضريبة</span><strong>{formatCurrency(props.totals.subTotal)}</strong></div>
        <div className="metric-row"><span>الضريبة</span><strong>{formatCurrency(props.totals.taxAmount)}</strong></div>
        <div className="metric-row"><span>الإجمالي النهائي</span><strong>{formatCurrency(props.totals.total)}</strong></div>
        <div className="metric-row"><span>{props.paymentType === 'credit' ? 'المتبقي على العميل' : 'المتبقي الآن'}</span><strong>{formatCurrency(props.paymentType === 'credit' ? props.totals.total : props.amountDue)}</strong></div>
      </div>

      {props.submitMessage ? (
        <div className={props.isError ? 'error-box pos-compact-message' : 'success-box pos-compact-message'}>
          <div>{props.submitMessage}</div>
          {!props.isError && props.canShowLastSaleActions ? (
            <div className="pos-post-sale-inline-note">
              <span className="muted small pos-post-sale-hint">بعد الحفظ: F9 ريسيت / طباعة ريسيت، F12 لطباعة A4، ويمكنك بدء عميل جديد مباشرة.</span>
              {props.lastSaleDocNo ? <span className="status-badge">{props.lastSaleDocNo}</span> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {!props.canSubmitSale && props.canSubmitHint ? <div className="warning-box pos-compact-message">{props.canSubmitHint}</div> : null}

      {props.selectedLineKey ? <div className="muted small pos-cart-shortcut-hint">اختصارات السطر المحدد: + زيادة · - تقليل · Delete حذف · F2 تعديل الكمية</div> : null}

      {props.canShowLastSaleActions ? (
        <div className="actions pos-primary-actions pos-primary-actions-sticky section-actions-clean pos-post-sale-bar">
          <div className="pos-post-sale-bar-copy">
            <span className="pos-post-sale-bar-kicker">تمت العملية بنجاح</span>
            <strong>{props.lastSaleDocNo ? `فاتورة ${props.lastSaleDocNo}` : 'آخر فاتورة جاهزة للطباعة'}</strong>
            <span className="muted small">اطبع مباشرة أو ابدأ عملية جديدة. اختصارات الكيبورد ما زالت فعالة.</span>
          </div>
          <div className="actions compact-actions pos-post-sale-bar-actions">
            <Button variant="secondary" onClick={props.onPrintReceiptNow}>ريسيت (F9)</Button>
            <Button variant="secondary" onClick={props.onPrintA4Now}>A4 (F12)</Button>
            <Button variant="secondary" onClick={props.onExportPdfNow}>PDF</Button>
            <Button variant="secondary" onClick={props.onReprintLastSale}>إعادة الطباعة</Button>
            <Button variant="success" onClick={props.onResetDraft}>عميل جديد</Button>
          </div>
        </div>
      ) : (
        <div className="actions pos-primary-actions pos-primary-actions-sticky section-actions-clean">
          <Button variant="secondary" onClick={props.onPrintPreview} disabled={!props.cart.length}>معاينة</Button>
          <Button variant="secondary" onClick={props.onHoldDraft} disabled={!props.cart.length || props.isPending}>تعليق</Button>
          <Button variant="secondary" onClick={props.onResetDraft} disabled={props.isPending}>تفريغ</Button>
          <Button variant="success" onClick={props.onSubmit} disabled={props.isPending || !props.canSubmitSale}>{props.isPending ? 'جارٍ الحفظ...' : 'إتمام البيع'}</Button>
        </div>
      )}

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
                <div><strong>{draft.label}</strong><div className="muted small">{draft.itemsCount} عناصر · {formatCurrency(draft.total)}</div></div>
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
