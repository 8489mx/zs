import { Card } from '@/shared/ui/card';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { ReturnsInvoiceItemsTable } from '@/features/returns/components/ReturnsInvoiceItemsTable';
import type { ReturnFormState } from '@/features/returns/lib/returns-workspace.helpers';
import type { Purchase, PurchaseItem, Sale, SaleItem } from '@/types/domain';

type Props = {
  form: ReturnFormState;
  invoiceRows: Array<Sale | Purchase>;
  selectedInvoice?: Sale | Purchase;
  invoiceItems: Array<SaleItem | PurchaseItem>;
  selectedItems: Record<string, string>;
  selectedItemsCount: number;
  canUseCreditSettlement: boolean;
  settlementNeedsRefundMethod: boolean;
  isBusy: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: unknown;
  onFormChange: (updater: (current: ReturnFormState) => ReturnFormState) => void;
  onResetForm: () => void;
  onToggleItem: (productId: string, checked: boolean) => void;
  onSetItemQty: (productId: string, value: string) => void;
  onOpenConfirm: () => void;
};

export function ReturnsCreateCard(props: Props) {
  const {
    form,
    invoiceRows,
    selectedInvoice,
    invoiceItems,
    selectedItems,
    selectedItemsCount,
    canUseCreditSettlement,
    settlementNeedsRefundMethod,
    isBusy,
    isError,
    isSuccess,
    error,
    onFormChange,
    onResetForm,
    onToggleItem,
    onSetItemQty,
    onOpenConfirm,
  } = props;

  return (
    <Card title="إنشاء مرتجع جديد" actions={<span className="nav-pill">إنشاء</span>} className="workspace-panel returns-create-card">
      <div className="form-grid">
        <Field label="نوع المرتجع">
          <select value={form.type} onChange={(e) => onFormChange((current) => ({ ...current, type: e.target.value as 'sale' | 'purchase', invoiceId: '', settlementMode: 'refund', refundMethod: 'cash' }))}>
            <option value="sale">مرتجع بيع</option>
            <option value="purchase">مرتجع شراء</option>
          </select>
        </Field>
        <Field label="الفاتورة">
          <select value={form.invoiceId} onChange={(e) => onFormChange((current) => ({ ...current, invoiceId: e.target.value }))}>
            <option value="">اختر الفاتورة</option>
            {invoiceRows.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.docNo || invoice.id}</option>)}
          </select>
        </Field>
        <Field label="آلية التسوية">
          <select value={form.settlementMode} onChange={(e) => onFormChange((current) => ({ ...current, settlementMode: e.target.value as 'refund' | 'store_credit', refundMethod: e.target.value === 'refund' ? current.refundMethod : 'cash' }))}>
            <option value="refund">استرجاع المبلغ</option>
            {canUseCreditSettlement ? <option value="store_credit">رصيد متجر</option> : null}
          </select>
        </Field>
        <Field label="طريقة الرد">
          <select value={form.refundMethod} disabled={!settlementNeedsRefundMethod} onChange={(e) => onFormChange((current) => ({ ...current, refundMethod: e.target.value as 'cash' | 'card' }))}>
            <option value="cash">نقدي</option>
            <option value="card">بطاقة</option>
          </select>
        </Field>
        <Field label="ملاحظة إضافية (اختياري)">
          <textarea rows={3} value={form.note} onChange={(e) => onFormChange((current) => ({ ...current, note: e.target.value }))} placeholder="أي ملاحظة تظهر في سجل المرتجع" />
        </Field>
        <div className="surface-note">
          {form.type === 'purchase'
            ? 'اختر الفاتورة ثم حدّد البنود والكميات المراد إرجاعها.'
            : canUseCreditSettlement
              ? 'اختر الفاتورة ثم حدّد البنود وطريقة التسوية المناسبة.'
              : 'اختر الفاتورة ثم حدّد البنود المراد إرجاعها.'}
        </div>
        <ReturnsInvoiceItemsTable
          invoiceItems={selectedInvoice ? invoiceItems : []}
          selectedItems={selectedItems}
          onToggleItem={onToggleItem}
          onSetItemQty={onSetItemQty}
        />
        <MutationFeedback isError={isError} isSuccess={isSuccess} error={error} errorFallback="تعذر حفظ المرتجع" successText="تم حفظ المرتجع بنجاح." />
        <div className="actions">
          <Button type="button" variant="secondary" onClick={onResetForm}>تفريغ</Button>
          <SubmitButton type="button" onClick={onOpenConfirm} disabled={isBusy || !form.invoiceId || !selectedItemsCount} idleText={form.type === 'sale' ? 'تسجيل مرتجع البيع' : 'تسجيل مرتجع الشراء'} pendingText="جارٍ الحفظ..." />
        </div>
      </div>
    </Card>
  );
}
