import { FormSection } from '@/shared/components/form-section';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
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
  returnedQtyByProduct?: Record<string, number>;
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
    returnedQtyByProduct = {},
  } = props;

  return (
    <FormSection title="إنشاء مرتجع جديد" actions={<span className="nav-pill">إنشاء</span>} className="workspace-panel returns-create-card">
      <div className="form-grid">
        <Field label="نوع المرتجع">
          <CustomSelect
            value={form.type}
            onChange={(val) => onFormChange((current) => ({ ...current, type: val as 'sale' | 'purchase', invoiceId: '', settlementMode: 'refund', refundMethod: 'cash' }))}
            options={[
              { value: 'sale', label: 'مرتجع بيع' },
              { value: 'purchase', label: 'مرتجع شراء' },
            ]}
          />
        </Field>
        <Field label="الفاتورة">
          <CustomSelect
            value={form.invoiceId}
            onChange={(val) => onFormChange((current) => ({ ...current, invoiceId: val }))}
            options={[
              { value: '', label: 'اختر الفاتورة' },
              ...invoiceRows.map((invoice) => ({ value: invoice.id, label: invoice.docNo || invoice.id })),
            ]}
          />
        </Field>
        <Field label="آلية التسوية">
          <CustomSelect
            value={form.settlementMode}
            onChange={(val) => onFormChange((current) => ({ ...current, settlementMode: val as 'refund' | 'store_credit', refundMethod: val === 'refund' ? current.refundMethod : 'cash' }))}
            options={[
              { value: 'refund', label: 'استرجاع المبلغ' },
              ...(canUseCreditSettlement ? [{ value: 'store_credit', label: 'رصيد متجر' }] : []),
            ]}
          />
        </Field>
        <Field label="طريقة الرد">
          <CustomSelect
            value={form.refundMethod}
            disabled={!settlementNeedsRefundMethod}
            onChange={(val) => onFormChange((current) => ({ ...current, refundMethod: val as 'cash' | 'card' }))}
            options={[
              { value: 'cash', label: 'نقدي' },
              { value: 'card', label: 'بطاقة' },
            ]}
          />
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
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <ReturnsInvoiceItemsTable
            invoiceItems={selectedInvoice ? invoiceItems : []}
            selectedItems={selectedItems}
            onToggleItem={onToggleItem}
            onSetItemQty={onSetItemQty}
            returnedQtyByProduct={returnedQtyByProduct}
          />
        </div>
        <MutationFeedback isError={isError} isSuccess={isSuccess} error={error} errorFallback="تعذر حفظ المرتجع" successText="تم حفظ المرتجع بنجاح." />
        <div className="actions">
          <Button type="button" variant="secondary" onClick={onResetForm}>تفريغ</Button>
          <SubmitButton type="button" onClick={onOpenConfirm} isPending={isBusy} disabled={!form.invoiceId || !selectedItemsCount} idleText={form.type === 'sale' ? 'تسجيل مرتجع البيع' : 'تسجيل مرتجع الشراء'} pendingText="جارٍ الحفظ..." />
        </div>
      </div>
    </FormSection>
  );
}
