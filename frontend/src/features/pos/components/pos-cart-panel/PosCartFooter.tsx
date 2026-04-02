import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/format';
import type { PosCartPanelProps } from './posCartPanel.types';

export function PosCartFooter(props: Pick<PosCartPanelProps,
  'totals' | 'paymentType' | 'amountDue' | 'submitMessage' | 'isError' | 'canShowLastSaleActions' | 'lastSaleDocNo' |
  'canSubmitSale' | 'canSubmitHint' | 'cart' | 'heldDrafts' | 'isPending' |
  'onPrintPreview' | 'onHoldDraft' | 'onResetDraft' | 'onSubmit' | 'onReprintLastSale' | 'onCopyLastSaleSummary' |
  'onExportHeldDrafts' | 'onClearHeldDrafts' | 'onRecallDraft' | 'onDeleteDraft'
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
        <div className={props.isError ? 'error-box' : 'success-box'}>
          <div>{props.submitMessage}</div>
          {!props.isError && props.canShowLastSaleActions ? (
            <div className="actions compact-actions" style={{ marginTop: 10 }}>
              <Button type="button" variant="secondary" onClick={props.onReprintLastSale}>طباعة الفاتورة الآن</Button>
              <Button type="button" variant="secondary" onClick={props.onCopyLastSaleSummary}>نسخ ملخص الفاتورة</Button>
              {props.lastSaleDocNo ? <span className="status-badge">{props.lastSaleDocNo}</span> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {!props.canSubmitSale && props.canSubmitHint ? <div className="warning-box">{props.canSubmitHint}</div> : null}

      <div className="actions pos-primary-actions pos-primary-actions-sticky section-actions-clean">
        <Button variant="secondary" onClick={props.onPrintPreview} disabled={!props.cart.length}>طباعة معاينة</Button>
        <Button variant="secondary" onClick={props.onHoldDraft} disabled={!props.cart.length || props.isPending}>تعليق الفاتورة</Button>
        <Button variant="secondary" onClick={props.onResetDraft} disabled={props.isPending}>تفريغ السلة</Button>
        <Button variant="success" onClick={props.onSubmit} disabled={props.isPending || !props.canSubmitSale}>{props.isPending ? 'جارٍ الحفظ...' : 'إتمام البيع'}</Button>
      </div>

      <div className="divider" />
      <div className="list-stack">
        <div className="actions compact-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>الفواتير المعلقة</strong>
          <div className="actions compact-actions">
            <Button variant="secondary" onClick={props.onExportHeldDrafts} disabled={!props.heldDrafts.length}>تصدير المعلقات</Button>
            <Button variant="danger" onClick={props.onClearHeldDrafts} disabled={!props.heldDrafts.length}>حذف الكل</Button>
          </div>
        </div>
        {props.heldDrafts.length ? props.heldDrafts.map((draft) => (
          <div className="list-row pos-held-row" key={draft.id}>
            <div><strong>{draft.label}</strong><div className="muted small">{draft.itemsCount} عناصر · {formatCurrency(draft.total)}</div></div>
            <div className="actions compact-actions">
              <Button variant="secondary" onClick={() => props.onRecallDraft(draft.id)}>استرجاع</Button>
              <Button variant="danger" onClick={() => props.onDeleteDraft(draft.id)}>حذف</Button>
            </div>
          </div>
        )) : <EmptyState title="لا توجد فواتير معلقة" hint="يمكنك تعليق السلة الحالية عند الحاجة." />}
      </div>
    </>
  );
}
