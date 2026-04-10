import type { UseFormReturn } from 'react-hook-form';
import { Card } from '@/shared/ui/card';
import { Field } from '@/shared/ui/field';
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
  onMovementSubmit: () => void;
  onCloseSubmit: () => void;
}

export function CashDrawerFormsPanel(props: CashDrawerFormsPanelProps) {
  return (
    <div className="three-column-grid panel-grid cash-drawer-forms-grid">
      <Card title="فتح وردية جديدة" actions={<span className="nav-pill">فتح الوردية</span>} className="cash-drawer-form-card">
        <form className="form-grid" onSubmit={props.openForm.handleSubmit((values) => props.openMutation.mutate(values))}>
          <Field label="رصيد الفتح"><input type="number" step="0.01" {...props.openForm.register('openingCash', { valueAsNumber: true })} disabled={props.openMutation.isPending} /></Field>
          {!SINGLE_STORE_MODE ? <Field label="الفرع">
            <select {...props.openForm.register('branchId')} disabled={props.openMutation.isPending}>
              <option value="">بدون فرع</option>
              {props.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </Field> : null}
          {SINGLE_STORE_MODE ? <Field label="المخزن الأساسي"><input value={props.locations[0]?.name || 'سيتم الربط تلقائيًا بالمخزن الأساسي'} disabled readOnly /></Field> : <Field label="الموقع">
            <select {...props.openForm.register('locationId')} disabled={props.openMutation.isPending}>
              <option value="">بدون موقع</option>
              {props.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </Field>}
          <Field label="ملاحظة الافتتاح"><textarea rows={2} {...props.openForm.register('note')} disabled={props.openMutation.isPending} /></Field>
          <MutationFeedback isError={props.openMutation.isError} isSuccess={props.openMutation.isSuccess} error={props.openMutation.error} errorFallback="تعذر فتح الوردية" successText="تم فتح الوردية بنجاح." />
          <SubmitButton type="submit" disabled={props.openMutation.isPending} idleText="فتح الوردية" pendingText="جارٍ الفتح..." />
        </form>
      </Card>

      <Card title="تسجيل حركة درج" actions={<span className="nav-pill">حركة نقدية</span>} className="cash-drawer-form-card">
        <form className="form-grid" onSubmit={props.onMovementSubmit}>
          <Field label="الوردية المفتوحة">
            <select {...props.movementForm.register('shiftId')} disabled={props.movementMutation.isPending}>
              <option value="">اختر وردية</option>
              {props.openOptions.map((shift) => <option key={shift.id} value={shift.id}>{shift.docNo || shift.id}</option>)}
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
          <MutationFeedback isError={props.movementMutation.isError} isSuccess={props.movementMutation.isSuccess} error={props.movementMutation.error} errorFallback="تعذر تسجيل الحركة" successText="تم تسجيل حركة الدرج بنجاح." />
          <SubmitButton type="submit" disabled={props.movementMutation.isPending} idleText="حفظ الحركة" pendingText="جارٍ الحفظ..." />
        </form>
      </Card>

      <Card title="إغلاق وردية" actions={<span className="nav-pill">إغلاق</span>} className="cash-drawer-form-card">
        <form className="form-grid" onSubmit={props.onCloseSubmit}>
          <Field label="الوردية المفتوحة">
            <select {...props.closeForm.register('shiftId')} disabled={props.closeMutation.isPending}>
              <option value="">اختر وردية</option>
              {props.openOptions.map((shift) => <option key={shift.id} value={shift.id}>{shift.docNo || shift.id}</option>)}
            </select>
          </Field>
          <Field label="المبلغ المتوقع"><input value={formatCurrency(props.closeExpectedCash)} disabled readOnly /></Field>
          <Field label="المبلغ المعدود"><input type="number" min="0" step="0.01" {...props.closeForm.register('countedCash', { valueAsNumber: true })} disabled={props.closeMutation.isPending} /></Field>
          <Field label="ملاحظة الإغلاق"><textarea rows={2} placeholder={Math.abs(props.closeVariancePreview) >= 0.01 ? 'اشرح سبب الفرق قبل الإغلاق' : 'اختياري عند عدم وجود فرق'} {...props.closeForm.register('note')} disabled={props.closeMutation.isPending} /></Field>
          <div className={Math.abs(props.closeVariancePreview) >= 0.01 ? 'warning-box' : 'muted small'} style={{ gridColumn: '1 / -1' }}>
            الفرق المتوقع بعد الإغلاق: <strong>{formatCurrency(props.closeVariancePreview)}</strong>
            {Math.abs(props.closeVariancePreview) >= 0.01 ? ' — يلزم كتابة ملاحظة قبل إغلاق الوردية مع وجود فرق.' : ''}
          </div>
          <MutationFeedback isError={props.closeMutation.isError} isSuccess={props.closeMutation.isSuccess} error={props.closeMutation.error} errorFallback="تعذر إغلاق الوردية" successText="تم إغلاق الوردية بنجاح." />
          <SubmitButton type="submit" disabled={props.closeMutation.isPending || !props.closeForm.watch('shiftId') || (Math.abs(props.closeVariancePreview) >= 0.01 && !props.closeNoteValue)} idleText="إغلاق الوردية" pendingText="جارٍ الإغلاق..." />
        </form>
      </Card>
    </div>
  );
}
