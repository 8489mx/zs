import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { ReturnsInvoiceItemsTable } from '@/features/returns/components/ReturnsInvoiceItemsTable';
import { formatCurrency } from '@/lib/format';
import type { ReturnFormState } from '@/features/returns/lib/returns-workspace.helpers';
import type { Purchase, PurchaseItem, Sale, SaleItem } from '@/types/domain';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  form: ReturnFormState;
  invoiceRows: Array<Sale | Purchase>;
  selectedInvoice?: Sale | Purchase;
  invoiceItems: Array<SaleItem | PurchaseItem>;
  selectedItems: Record<string, string>;
  selectedItemsCount: number;
  selectedQtyTotal: number;
  expectedReturnValue: number;
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

export function ReturnsCreateModal(props: Props) {
  const {
    isOpen,
    onClose,
    form,
    invoiceRows,
    selectedInvoice,
    invoiceItems,
    selectedItems,
    selectedItemsCount,
    selectedQtyTotal,
    expectedReturnValue,
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

  if (!isOpen) return null;

  return (
    <DialogShell
      open={isOpen}
      onClose={onClose}
      width="min(1060px, calc(100vw - 32px))"
      showCloseButton={true}
      ariaLabel="تسجيل مرتجع جديد"
    >
      <div
        style={{
          padding: '24px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxHeight: '88vh',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '12px',
            paddingInlineEnd: '36px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.4rem' }}>🔄</span>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                تسجيل مرتجع جديد
                {selectedInvoice ? (
                  <span style={{ marginInlineStart: '10px', color: 'var(--primary-color, #0284c7)', fontFamily: 'monospace' }}>
                    ({selectedInvoice.docNo || selectedInvoice.id})
                  </span>
                ) : null}
              </h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
              حدد الفاتورة والأصناف والكميات المراد إرجاعها واسترداد قيمتها للعميل.
            </p>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.75fr) minmax(280px, 1fr)',
            gap: '18px',
            alignItems: 'start',
          }}
        >
          {/* Right Column: Options + Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
            {/* Options Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px',
                background: '#f8fafc',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <Field label="نوع المرتجع">
                  <CustomSelect
                    value={form.type}
                    onChange={(val) =>
                      onFormChange((current) => ({
                        ...current,
                        type: val as 'sale' | 'purchase',
                        invoiceId: '',
                        settlementMode: 'refund',
                        refundMethod: 'cash',
                      }))
                    }
                    options={[
                      { value: 'sale', label: 'مرتجع بيع' },
                      { value: 'purchase', label: 'مرتجع شراء' },
                    ]}
                  />
                </Field>
              </div>

              <div>
                <Field label="الفاتورة">
                  <CustomSelect
                    value={form.invoiceId}
                    onChange={(val) => onFormChange((current) => ({ ...current, invoiceId: val }))}
                    options={[
                      { value: '', label: 'اختر الفاتورة' },
                      ...invoiceRows.map((inv) => ({ value: inv.id, label: inv.docNo || inv.id })),
                    ]}
                  />
                </Field>
              </div>

              <div>
                <Field label="آلية التسوية">
                  <CustomSelect
                    value={form.settlementMode}
                    onChange={(val) =>
                      onFormChange((current) => ({
                        ...current,
                        settlementMode: val as 'refund' | 'store_credit',
                        refundMethod: val === 'refund' ? current.refundMethod : 'cash',
                      }))
                    }
                    options={[
                      { value: 'refund', label: 'استرجاع المبلغ' },
                      ...(canUseCreditSettlement ? [{ value: 'store_credit', label: 'رصيد متجر' }] : []),
                    ]}
                  />
                </Field>
              </div>

              <div>
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
              </div>
            </div>

            {/* Items Table */}
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 14px',
                background: '#fff',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                📦 الأصناف المتاحة للإرجاع في هذه الفاتورة:
              </div>
              <ReturnsInvoiceItemsTable
                invoiceItems={invoiceItems}
                selectedItems={selectedItems}
                onToggleItem={onToggleItem}
                onSetItemQty={onSetItemQty}
                returnedQtyByProduct={returnedQtyByProduct}
              />
            </div>

            {/* Note Field */}
            <div>
              <Field label="ملاحظة إضافية (اختياري)">
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => onFormChange((current) => ({ ...current, note: e.target.value }))}
                  placeholder="اكتب أي ملاحظة تظهر في سجل المرتجع..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                  }}
                />
              </Field>
            </div>

            <MutationFeedback isError={isError} isSuccess={isSuccess} error={error} successText="تم تسجيل المرتجع بنجاح." />
          </div>

          {/* Left Column: Summary Card & Actions */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              position: 'sticky',
              top: 0,
            }}
          >
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              📊 ملخص الحساب والتسوية
            </div>

            {selectedInvoice ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>الفاتورة الأصلية:</span>
                  <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{selectedInvoice.docNo || selectedInvoice.id}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>الطرف:</span>
                  <strong style={{ color: '#0f172a' }}>
                    {('customerName' in selectedInvoice ? selectedInvoice.customerName : selectedInvoice.supplierName) || 'عميل نقدي'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>إجمالي الفاتورة:</span>
                  <strong style={{ color: '#0f172a' }}>{formatCurrency(Number(selectedInvoice.total || 0))}</strong>
                </div>

                <div style={{ borderTop: '1px dashed #cbd5e1', margin: '4px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>البنود المحددة للإرجاع:</span>
                  <strong style={{ color: '#0284c7' }}>{selectedItemsCount} بند</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>إجمالي القطع المسترجعة:</span>
                  <strong style={{ color: '#0284c7' }}>{selectedQtyTotal} قطعة</strong>
                </div>

                {/* Hero Total Refund Box */}
                <div
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '10px',
                    padding: '14px',
                    textAlign: 'center',
                    marginTop: '6px',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e40af' }}>
                    {form.type === 'sale' ? 'إجمالي المبلغ المسترد للعميل' : 'إجمالي المبلغ المسترد من المورد'}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1d4ed8', marginTop: '4px' }}>
                    {selectedItemsCount ? formatCurrency(expectedReturnValue) : '0.00 ج.م'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                اختر فاتورة لعرض ملخص الحساب
              </div>
            )}

            {/* Actions in Summary Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
              <Button
                type="button"
                variant="primary"
                onClick={onOpenConfirm}
                disabled={!selectedInvoice || selectedItemsCount === 0 || isBusy}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontWeight: 700,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>💾</span>
                <span>{form.type === 'sale' ? 'تسجيل وتأكيد مرتجع البيع' : 'تسجيل وتأكيد مرتجع الشراء'}</span>
              </Button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onResetForm}
                  disabled={isBusy}
                  style={{ flex: 1, padding: '8px', fontSize: '12.5px' }}
                >
                  تفريغ
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  disabled={isBusy}
                  style={{ flex: 1, padding: '8px', fontSize: '12.5px' }}
                >
                  إغلاق (Esc)
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
