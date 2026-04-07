import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { MutationFeedback } from '@/components/shared/MutationFeedback';
import { SubmitButton } from '@/components/shared/SubmitButton';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { Location } from '@/types/domain';
import type { ExpenseFormState } from '@/features/treasury/lib/treasury-page.helpers';

const EXPENSE_PRESETS = [
  'إيجار',
  'كهرباء',
  'مياه',
  'إنترنت',
  'صيانة محل',
  'صيانة أجهزة',
  'أدوات نظافة',
  'ضيافة',
  'نقل وشحن',
  'مرتبات',
  'سلفة عامل',
  'عمولة فني',
  'مستلزمات تشغيل',
  'رسوم حكومية',
  'مصروف بنكي',
];

const CUSTOM_EXPENSE_VALUE = '__custom__';

export function TreasuryExpenseEntryCard({ expenseForm, setExpenseForm, branches, locations, availableLocations, expenseValidationErrors, expenseMutation, onReset }: {
  expenseForm: ExpenseFormState;
  setExpenseForm: React.Dispatch<React.SetStateAction<ExpenseFormState>>;
  branches: Array<{ id: string; name: string }>;
  locations: Location[];
  availableLocations: Location[];
  expenseValidationErrors: string[];
  expenseMutation: { isError: boolean; isSuccess: boolean; error: unknown; isPending: boolean; mutate: (values: ExpenseFormState) => void };
  onReset: () => void;
}) {
  const selectedExpensePreset = EXPENSE_PRESETS.includes(expenseForm.title) ? expenseForm.title : (expenseForm.title ? CUSTOM_EXPENSE_VALUE : '');

  return (
    <Card title="تسجيل مصروف" actions={<span className="nav-pill">مصروف</span>}>
      <div className="form-grid">
        <Field label="نوع المصروف">
          <select
            value={selectedExpensePreset}
            onChange={(e) => {
              const nextValue = e.target.value;
              setExpenseForm((current) => ({
                ...current,
                title: nextValue === CUSTOM_EXPENSE_VALUE ? '' : nextValue,
              }));
            }}
          >
            <option value="">اختر نوع المصروف</option>
            {EXPENSE_PRESETS.map((preset) => (
              <option key={preset} value={preset}>{preset}</option>
            ))}
            <option value={CUSTOM_EXPENSE_VALUE}>أخرى</option>
          </select>
        </Field>

        <Field label="اسم المصروف">
          <input
            value={expenseForm.title}
            onChange={(e) => setExpenseForm((current) => ({ ...current, title: e.target.value }))}
            placeholder="مثال: إيجار محل أو مصروف خاص"
          />
        </Field>

        <Field label="المبلغ">
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={expenseForm.amount}
            onChange={(e) => setExpenseForm((current) => ({ ...current, amount: e.target.value }))}
          />
        </Field>

        {!SINGLE_STORE_MODE ? (
          <Field label="الفرع">
            <select
              value={expenseForm.branchId}
              onChange={(e) => {
                const nextBranchId = e.target.value;
                setExpenseForm((current) => {
                  const currentLocation = locations.find((location) => location.id === current.locationId);
                  const shouldClearLocation = Boolean(currentLocation && nextBranchId && currentLocation.branchId && String(currentLocation.branchId) !== String(nextBranchId));
                  return {
                    ...current,
                    branchId: nextBranchId,
                    locationId: shouldClearLocation ? '' : current.locationId,
                  };
                });
              }}
            >
              <option value="">بدون فرع</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </Field>
        ) : null}

        {SINGLE_STORE_MODE ? (
          <Field label="المخزن الحالي">
            <input value={locations[0]?.name || 'سيتم الربط تلقائيًا بالمخزن الأساسي'} disabled readOnly />
          </Field>
        ) : (
          <Field label="الموقع">
            <select
              value={expenseForm.locationId}
              onChange={(e) => setExpenseForm((current) => ({ ...current, locationId: e.target.value }))}
            >
              <option value="">بدون موقع</option>
              {availableLocations.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="التاريخ">
          <input
            type="datetime-local"
            value={expenseForm.date}
            onChange={(e) => setExpenseForm((current) => ({ ...current, date: e.target.value }))}
          />
        </Field>

        <Field label="ملاحظات">
          <textarea
            rows={3}
            value={expenseForm.note}
            onChange={(e) => setExpenseForm((current) => ({ ...current, note: e.target.value }))}
          />
        </Field>

        {expenseValidationErrors.length ? (
          <div className="warning-box">
            {expenseValidationErrors.map((message) => <div key={message}>{message}</div>)}
          </div>
        ) : null}

        <MutationFeedback
          isError={expenseMutation.isError}
          isSuccess={expenseMutation.isSuccess}
          error={expenseMutation.error}
          errorFallback="تعذر تسجيل المصروف"
          successText="تم تسجيل المصروف وتحديث الخزينة بنجاح."
        />

        <div className="actions section-actions">
          <Button type="button" variant="secondary" onClick={onReset}>تفريغ</Button>
          <SubmitButton
            type="button"
            onClick={() => expenseMutation.mutate(expenseForm)}
            disabled={expenseMutation.isPending || expenseValidationErrors.length > 0}
            idleText="حفظ المصروف"
            pendingText="جارٍ الحفظ..."
          />
        </div>
      </div>
    </Card>
  );
}
