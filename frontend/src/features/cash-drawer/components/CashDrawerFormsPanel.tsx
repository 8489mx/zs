import { useEffect, useMemo, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { formatCurrency } from '@/lib/format';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { Branch, CashierShift, Location } from '@/types/domain';
import type { CloseShiftValues, MovementValues, OpenShiftValues } from '@/features/cash-drawer/hooks/useCashDrawerPageController';

interface MutationLike {
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: unknown;
}

interface CashDrawerFormsPanelProps {
  activeForm: 'open' | 'movement' | 'close' | null;
  onCloseForm: () => void;
  branches: Branch[];
  locations: Location[];
  openOptions: CashierShift[];
  openForm: UseFormReturn<OpenShiftValues>;
  movementForm: UseFormReturn<MovementValues>;
  closeForm: UseFormReturn<CloseShiftValues>;
  openMutation: MutationLike & { mutate: (values: OpenShiftValues) => void };
  movementMutation: MutationLike;
  closeMutation: MutationLike;
  closeExpectedCash: number;
  closeVariancePreview: number;
  closeNoteValue: string;
  isBlindCloseMode?: boolean;
  onMovementSubmit: () => void;
  onCloseSubmit: () => void;
}

type DetailChannel = 'cardDetails' | 'walletDetails' | 'instapayDetails';
const EMPTY_DETAIL_ROWS: Array<{ amount?: number }> = [];

function normalizeCount(value: unknown): number {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function summarizeDetails(rows: Array<{ amount?: number }>): number {
  return Number(rows.reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2));
}

export function CashDrawerFormsPanel(props: CashDrawerFormsPanelProps) {
  const locationList = Array.isArray(props.locations) ? props.locations : [];
  const isBlindCloseMode = props.isBlindCloseMode === true;

  const selectedCloseShift = props.openOptions.find((shift) => String(shift.id) === String(props.closeForm.watch('shiftId'))) || null;
  const closeCashSalesTotal = Number(selectedCloseShift?.cashSalesTotal || 0);
  const closeCardSalesTotal = Number(selectedCloseShift?.cardSalesTotal || 0);
  const closeCreditSalesTotal = Number(selectedCloseShift?.creditSalesTotal || 0);
  const closeShiftSalesTotal = Number(selectedCloseShift?.shiftSalesTotal || 0);
  const closeServiceCashTotal = Number(selectedCloseShift?.serviceCashTotal || 0);
  const closeServiceCardTotal = Number(selectedCloseShift?.serviceCardTotal || 0);
  const closeCashDrawerMovementTotal = Number(selectedCloseShift?.cashDrawerMovementTotal || 0);
  const rawCloseSaleReturnCashRefundTotal = Number(selectedCloseShift?.saleReturnCashRefundTotal || 0);
  const inferredCloseSaleReturnCashRefundTotal = selectedCloseShift
    ? Math.max(0, Number((Number(selectedCloseShift.openingCash || 0) + closeCashSalesTotal + closeServiceCashTotal + closeCashDrawerMovementTotal - Number(selectedCloseShift.expectedCash || 0)).toFixed(2)))
    : 0;
  const closeSaleReturnCashRefundTotal = rawCloseSaleReturnCashRefundTotal > 0 ? rawCloseSaleReturnCashRefundTotal : inferredCloseSaleReturnCashRefundTotal;
  const closeSaleReturnCardRefundTotal = Number(selectedCloseShift?.saleReturnCardRefundTotal || 0);

  const cardOperationCount = normalizeCount(props.closeForm.watch('cardOperationCount'));
  const walletOperationCount = normalizeCount(props.closeForm.watch('walletOperationCount'));
  const instapayOperationCount = normalizeCount(props.closeForm.watch('instapayOperationCount'));

  const [showCardDetails, setShowCardDetails] = useState(false);
  const [showWalletDetails, setShowWalletDetails] = useState(false);
  const [showInstapayDetails, setShowInstapayDetails] = useState(false);

  const ensureDetailsLength = (field: DetailChannel, size: number) => {
    const current = props.closeForm.getValues(field) || [];
    const next = [...current];
    if (next.length > size) next.length = size;
    while (next.length < size) {
      next.push({ amount: 0, reference: '' });
    }
    props.closeForm.setValue(field, next, { shouldDirty: false });
  };

  useEffect(() => {
    ensureDetailsLength('cardDetails', cardOperationCount);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardOperationCount]);

  useEffect(() => {
    ensureDetailsLength('walletDetails', walletOperationCount);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletOperationCount]);

  useEffect(() => {
    ensureDetailsLength('instapayDetails', instapayOperationCount);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instapayOperationCount]);

  useEffect(() => {
    if (props.openMutation.isSuccess || props.movementMutation.isSuccess || props.closeMutation.isSuccess) {
      const timeout = setTimeout(() => {
        if (props.openMutation.isSuccess || props.movementMutation.isSuccess || props.closeMutation.isSuccess) {
           props.onCloseForm();
        }
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [props.openMutation.isSuccess, props.movementMutation.isSuccess, props.closeMutation.isSuccess, props.onCloseForm]);

  const cardDeclaredTotal = Number(props.closeForm.watch('cardDeclaredTotal') || 0);
  const walletDeclaredTotal = Number(props.closeForm.watch('walletDeclaredTotal') || 0);
  const instapayDeclaredTotal = Number(props.closeForm.watch('instapayDeclaredTotal') || 0);

  const cardDetailsRows = props.closeForm.watch('cardDetails') ?? EMPTY_DETAIL_ROWS;
  const walletDetailsRows = props.closeForm.watch('walletDetails') ?? EMPTY_DETAIL_ROWS;
  const instapayDetailsRows = props.closeForm.watch('instapayDetails') ?? EMPTY_DETAIL_ROWS;

  const cardDetailsTotal = useMemo(() => summarizeDetails(cardDetailsRows), [cardDetailsRows]);
  const walletDetailsTotal = useMemo(() => summarizeDetails(walletDetailsRows), [walletDetailsRows]);
  const instapayDetailsTotal = useMemo(() => summarizeDetails(instapayDetailsRows), [instapayDetailsRows]);

  const cardDetailsDiff = Number((cardDetailsTotal - cardDeclaredTotal).toFixed(2));
  const walletDetailsDiff = Number((walletDetailsTotal - walletDeclaredTotal).toFixed(2));
  const instapayDetailsDiff = Number((instapayDetailsTotal - instapayDeclaredTotal).toFixed(2));

  return (
    <DialogShell open={!!props.activeForm} onClose={props.onCloseForm} width="min(600px, 100%)">
      {props.activeForm === 'open' && (
        <div style={{ background: '#fff', padding: '24px', borderRadius: '8px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '24px' }}>فتح وردية نقطة بيع</h2>
        <form className="form-grid" onSubmit={props.openForm.handleSubmit((values) => props.openMutation.mutate(values))}>
          <Field label="رصيد الفتح"><input type="number" step="0.01" {...props.openForm.register('openingCash', { valueAsNumber: true })} disabled={props.openMutation.isPending} /></Field>
          {!SINGLE_STORE_MODE ? <Field label="الفرع">
            <select {...props.openForm.register('branchId')} disabled={props.openMutation.isPending}>
              <option value="">بدون فرع</option>
              {props.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </Field> : null}
          {SINGLE_STORE_MODE ? <Field label="المخزن الأساسي"><input value={locationList[0]?.name || 'سيتم الربط تلقائيًا بالمخزن الأساسي'} disabled readOnly /></Field> : <Field label="المخزن">
            <select {...props.openForm.register('locationId')} disabled={props.openMutation.isPending}>
              <option value="">بدون مخزن</option>
              {locationList.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </Field>}
          <Field label="ملاحظة الافتتاح"><textarea rows={2} {...props.openForm.register('note')} disabled={props.openMutation.isPending} /></Field>
          <MutationFeedback isError={props.openMutation.isError} isSuccess={props.openMutation.isSuccess} error={props.openMutation.error} errorFallback="تعذر فتح وردية نقطة البيع" successText="تم فتح وردية نقطة البيع بنجاح." />
          <SubmitButton type="submit" disabled={props.openMutation.isPending} idleText="فتح وردية نقطة البيع" pendingText="جارٍ الفتح..." />
        </form>
        </div>
      )}

      {props.activeForm === 'movement' && (
        <div style={{ background: '#fff', padding: '24px', borderRadius: '8px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '24px' }}>تسجيل حركة درج النقدية</h2>
        <form className="form-grid" onSubmit={props.onMovementSubmit}>
          <Field label="وردية نقطة البيع المفتوحة">
            <select {...props.movementForm.register('shiftId')} disabled={props.movementMutation.isPending}>
              <option value="">اختر وردية نقطة البيع</option>
              {props.openOptions.map((shift) => <option key={shift.id} value={shift.id}>{shift.openedByName || 'وردية نقطة بيع'}{shift.docNo ? ` — ${shift.docNo}` : ''}</option>)}
            </select>
          </Field>
          <Field label="النوع">
            <select {...props.movementForm.register('type')} disabled={props.movementMutation.isPending}>
              <option value="cash_in">إيداع</option>
              <option value="cash_out">صرف</option>
            </select>
          </Field>
          <Field label="المبلغ"><input type="number" step="0.01" {...props.movementForm.register('amount', { valueAsNumber: true })} disabled={props.movementMutation.isPending} /></Field>
          <Field label="سبب الحركة"><textarea rows={2} placeholder="اكتب السبب بوضوح" {...props.movementForm.register('note')} disabled={props.movementMutation.isPending} /></Field>
          <MutationFeedback isError={props.movementMutation.isError} isSuccess={props.movementMutation.isSuccess} error={props.movementMutation.error} errorFallback="تعذر تسجيل الحركة" successText="تم تسجيل حركة درج النقدية بنجاح." />
          <SubmitButton type="submit" disabled={props.movementMutation.isPending} idleText="حفظ الحركة" pendingText="جارٍ الحفظ..." />
        </form>
        </div>
      )}

      {props.activeForm === 'close' && (
        <div style={{ background: '#fff', padding: '24px', borderRadius: '8px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '24px' }}>إغلاق وردية نقطة البيع</h2>
        <form className="form-grid" onSubmit={props.onCloseSubmit}>
          <Field label="وردية نقطة البيع المفتوحة">
            <select {...props.closeForm.register('shiftId')} disabled={props.closeMutation.isPending}>
              <option value="">اختر وردية نقطة البيع</option>
              {props.openOptions.map((shift) => <option key={shift.id} value={shift.id}>{shift.openedByName || 'وردية نقطة بيع'}{shift.docNo ? ` — ${shift.docNo}` : ''}</option>)}
            </select>
          </Field>

          {isBlindCloseMode ? (
            <>
              <Field label="النقدية المعدودة في درج النقدية">
                <input type="number" min="0" step="0.01" {...props.closeForm.register('countedCash', { valueAsNumber: true })} disabled={props.closeMutation.isPending} />
              </Field>

              <Field label="إجمالي الفيزا حسب ماكينة الدفع">
                <input type="number" min="0" step="0.01" {...props.closeForm.register('cardDeclaredTotal', { valueAsNumber: true })} disabled={props.closeMutation.isPending} />
              </Field>
              <Field label="عدد عمليات الفيزا">
                <input type="number" min="0" step="1" {...props.closeForm.register('cardOperationCount', { valueAsNumber: true })} disabled={props.closeMutation.isPending} />
              </Field>

              <Field label="إجمالي محفظة إلكترونية">
                <input type="number" min="0" step="0.01" {...props.closeForm.register('walletDeclaredTotal', { valueAsNumber: true })} disabled={props.closeMutation.isPending} />
              </Field>
              <Field label="عدد عمليات محفظة إلكترونية">
                <input type="number" min="0" step="1" {...props.closeForm.register('walletOperationCount', { valueAsNumber: true })} disabled={props.closeMutation.isPending} />
              </Field>

              <Field label="إجمالي InstaPay">
                <input type="number" min="0" step="0.01" {...props.closeForm.register('instapayDeclaredTotal', { valueAsNumber: true })} disabled={props.closeMutation.isPending} />
              </Field>
              <Field label="عدد عمليات InstaPay">
                <input type="number" min="0" step="1" {...props.closeForm.register('instapayOperationCount', { valueAsNumber: true })} disabled={props.closeMutation.isPending} />
              </Field>

              <div className="actions compact-actions" style={{ gridColumn: '1 / -1' }}>
                <Button type="button" variant="secondary" onClick={() => setShowCardDetails((value) => !value)} disabled={props.closeMutation.isPending}>تفاصيل الفيزا</Button>
                <Button type="button" variant="secondary" onClick={() => setShowWalletDetails((value) => !value)} disabled={props.closeMutation.isPending}>تفاصيل المحافظ</Button>
                <Button type="button" variant="secondary" onClick={() => setShowInstapayDetails((value) => !value)} disabled={props.closeMutation.isPending}>تفاصيل InstaPay</Button>
              </div>

              {showCardDetails ? (
                <div className="card" style={{ gridColumn: '1 / -1', padding: 10 }}>
                  <strong style={{ display: 'block', marginBottom: 8 }}>تفاصيل الفيزا</strong>
                  {cardOperationCount ? cardDetailsRows.map((_, index) => (
                    <div key={`card-detail-${index}`} className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <Field label={`عملية ${index + 1} - مبلغ`}><input type="number" min="0" step="0.01" {...props.closeForm.register(`cardDetails.${index}.amount` as const, { valueAsNumber: true })} disabled={props.closeMutation.isPending} /></Field>
                      <Field label={`عملية ${index + 1} - رقم العملية`}><input {...props.closeForm.register(`cardDetails.${index}.reference` as const)} disabled={props.closeMutation.isPending} /></Field>
                    </div>
                  )) : <div className="muted small">أدخل عدد عمليات الفيزا أولًا لعرض التفاصيل.</div>}
                  <div className="muted small">
                    إجمالي التفاصيل: <strong>{formatCurrency(cardDetailsTotal)}</strong> — الإجمالي المعلن: <strong>{formatCurrency(cardDeclaredTotal)}</strong> — فرق التفاصيل: <strong>{formatCurrency(cardDetailsDiff)}</strong>
                  </div>
                </div>
              ) : null}

              {showWalletDetails ? (
                <div className="card" style={{ gridColumn: '1 / -1', padding: 10 }}>
                  <strong style={{ display: 'block', marginBottom: 8 }}>تفاصيل المحافظ</strong>
                  {walletOperationCount ? walletDetailsRows.map((_, index) => (
                    <div key={`wallet-detail-${index}`} className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <Field label={`عملية ${index + 1} - مبلغ`}><input type="number" min="0" step="0.01" {...props.closeForm.register(`walletDetails.${index}.amount` as const, { valueAsNumber: true })} disabled={props.closeMutation.isPending} /></Field>
                      <Field label={`عملية ${index + 1} - رقم العملية`}><input {...props.closeForm.register(`walletDetails.${index}.reference` as const)} disabled={props.closeMutation.isPending} /></Field>
                    </div>
                  )) : <div className="muted small">أدخل عدد عمليات المحافظ أولًا لعرض التفاصيل.</div>}
                  <div className="muted small">
                    إجمالي التفاصيل: <strong>{formatCurrency(walletDetailsTotal)}</strong> — الإجمالي المعلن: <strong>{formatCurrency(walletDeclaredTotal)}</strong> — فرق التفاصيل: <strong>{formatCurrency(walletDetailsDiff)}</strong>
                  </div>
                </div>
              ) : null}

              {showInstapayDetails ? (
                <div className="card" style={{ gridColumn: '1 / -1', padding: 10 }}>
                  <strong style={{ display: 'block', marginBottom: 8 }}>تفاصيل InstaPay</strong>
                  {instapayOperationCount ? instapayDetailsRows.map((_, index) => (
                    <div key={`instapay-detail-${index}`} className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <Field label={`عملية ${index + 1} - مبلغ`}><input type="number" min="0" step="0.01" {...props.closeForm.register(`instapayDetails.${index}.amount` as const, { valueAsNumber: true })} disabled={props.closeMutation.isPending} /></Field>
                      <Field label={`عملية ${index + 1} - رقم العملية`}><input {...props.closeForm.register(`instapayDetails.${index}.reference` as const)} disabled={props.closeMutation.isPending} /></Field>
                    </div>
                  )) : <div className="muted small">أدخل عدد عمليات InstaPay أولًا لعرض التفاصيل.</div>}
                  <div className="muted small">
                    إجمالي التفاصيل: <strong>{formatCurrency(instapayDetailsTotal)}</strong> — الإجمالي المعلن: <strong>{formatCurrency(instapayDeclaredTotal)}</strong> — فرق التفاصيل: <strong>{formatCurrency(instapayDetailsDiff)}</strong>
                  </div>
                </div>
              ) : null}

              <Field label="ملاحظات الإغلاق">
                <textarea rows={2} placeholder="اختياري" {...props.closeForm.register('note')} disabled={props.closeMutation.isPending} />
              </Field>

              <div className="muted small" style={{ gridColumn: '1 / -1' }}>
                سيتم تسجيل الإقرار وإرسال وردية نقطة البيع في انتظار مراجعة المدير.
              </div>
            </>
          ) : (
            <>
              <Field label="النقدية المتوقعة"><input value={formatCurrency(props.closeExpectedCash)} disabled readOnly /></Field>
              {selectedCloseShift ? (
                <div className="muted small" style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
                  <span>مبيعات نقدي: <strong>{formatCurrency(closeCashSalesTotal)}</strong></span>
                  <span>مبيعات فيزا: <strong>{formatCurrency(closeCardSalesTotal)}</strong></span>
                  {closeServiceCashTotal > 0 ? <span>خدمات نقدي: <strong>{formatCurrency(closeServiceCashTotal)}</strong></span> : null}
                  {closeServiceCardTotal > 0 ? <span>خدمات فيزا: <strong>{formatCurrency(closeServiceCardTotal)}</strong></span> : null}
                  {closeCreditSalesTotal > 0 ? <span>مبيعات آجل: <strong>{formatCurrency(closeCreditSalesTotal)}</strong></span> : null}
                  <span>مرتجعات نقدي: <strong>{formatCurrency(closeSaleReturnCashRefundTotal)}</strong></span>
                  {closeSaleReturnCardRefundTotal > 0 ? <span>مرتجعات فيزا: <strong>{formatCurrency(closeSaleReturnCardRefundTotal)}</strong></span> : null}
                  <span>حركات درج النقدية: <strong>{formatCurrency(closeCashDrawerMovementTotal)}</strong></span>
                  <span>إجمالي مبيعات وردية نقطة البيع: <strong>{formatCurrency(closeShiftSalesTotal)}</strong></span>
                  <span style={{ gridColumn: '1 / -1' }}>النقدية المتوقعة = رصيد الفتح + مبيعات النقدي + خدمات النقدي - مرتجعات النقدي + حركات درج النقدية فقط.</span>
                </div>
              ) : null}
              <Field label="المبلغ المعدود"><input type="number" min="0" step="0.01" {...props.closeForm.register('countedCash', { valueAsNumber: true })} disabled={props.closeMutation.isPending} /></Field>
              <Field label="ملاحظة الإغلاق"><textarea rows={2} placeholder={Math.abs(props.closeVariancePreview) >= 0.01 ? 'اشرح سبب الفرق قبل إغلاق وردية نقطة البيع' : 'اختياري عند عدم وجود فرق'} {...props.closeForm.register('note')} disabled={props.closeMutation.isPending} /></Field>
              <div className={Math.abs(props.closeVariancePreview) >= 0.01 ? 'warning-box' : 'muted small'} style={{ gridColumn: '1 / -1' }}>
                الفرق المتوقع بعد الإغلاق: <strong>{formatCurrency(props.closeVariancePreview)}</strong>
                {Math.abs(props.closeVariancePreview) >= 0.01 ? ' — يلزم كتابة ملاحظة قبل إغلاق وردية نقطة البيع مع وجود فرق.' : ''}
              </div>
            </>
          )}

          <MutationFeedback isError={props.closeMutation.isError} isSuccess={props.closeMutation.isSuccess} error={props.closeMutation.error} errorFallback="تعذر إغلاق وردية نقطة البيع" successText="تم إغلاق وردية نقطة البيع بنجاح." />
          <SubmitButton
            type="submit"
            disabled={props.closeMutation.isPending || !props.closeForm.watch('shiftId') || (!isBlindCloseMode && Math.abs(props.closeVariancePreview) >= 0.01 && !props.closeNoteValue)}
            idleText={isBlindCloseMode ? 'إرسال إقرار الإغلاق' : 'إغلاق وردية نقطة البيع'}
            pendingText="جارٍ الإغلاق..."
          />
        </form>
        </div>
      )}
    </DialogShell>
  );
}
