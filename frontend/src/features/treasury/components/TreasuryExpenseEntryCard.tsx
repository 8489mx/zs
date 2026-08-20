import { useState, useEffect } from 'react';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { normalizeArabicSearchKey } from '@/lib/arabic-normalization';
import type { Location } from '@/types/domain';
import type { ExpenseFormState } from '@/features/treasury/lib/treasury-page.helpers';

const EXPENSE_PRESETS = [
  'إيجار',
  'كهرباء',
  'مياه',
  'إنترنت',
  'صيانة نشاط',
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

export function TreasuryExpenseEntryCard({ expenseForm, setExpenseForm, branches, warehouses, locations, availableLocations, expenseValidationErrors, expenseMutation, onReset }: {
  expenseForm: ExpenseFormState;
  setExpenseForm: React.Dispatch<React.SetStateAction<ExpenseFormState>>;
  branches: Array<{ id: string; name: string }>;
  warehouses?: Location[];
  locations?: Location[];
  availableLocations: Location[];
  expenseValidationErrors: string[];
  expenseMutation: { isError: boolean; isSuccess: boolean; error: unknown; isPending: boolean; mutate: (values: ExpenseFormState) => void };
  onReset: () => void;
}) {
  const warehouseList = warehouses || locations || [];
  const [customPresets, setCustomPresets] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('zsystems_custom_expense_presets');
      if (stored) {
        setCustomPresets(JSON.parse(stored));
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, []);

  const handleSave = () => {
    const currentTitle = expenseForm.title.trim();
    if (currentTitle && !EXPENSE_PRESETS.includes(currentTitle) && !customPresets.includes(currentTitle)) {
      const nextPresets = [...customPresets, currentTitle];
      setCustomPresets(nextPresets);
      localStorage.setItem('zsystems_custom_expense_presets', JSON.stringify(nextPresets));
    }
    expenseMutation.mutate(expenseForm);
  };

  const allPresets = [...EXPENSE_PRESETS, ...customPresets];

  const presetOptions = allPresets.map(preset => ({ id: preset, label: preset }));

  return (
    <FormSection title="تسجيل مصروف جديد">
      <div className="form-grid">
        <SearchableCombobox
          label="نوع / اسم المصروف"
          placeholder="اختر من القائمة أو اكتب مصروف جديد..."
          value={expenseForm.title}
          onChange={(val) => setExpenseForm(current => ({ ...current, title: val }))}
          options={presetOptions}
          search={(option, query) => normalizeArabicSearchKey(option.label).includes(normalizeArabicSearchKey(query))}
          getLabel={(option) => option.label}
          onSelect={(option) => setExpenseForm(current => ({ ...current, title: option.label }))}
          onCreate={(query) => setExpenseForm(current => ({ ...current, title: query }))}
          createLabel={(query) => `إضافة وتسجيل "${query}"`}
          emptyLabel="لا يوجد مصروف بهذا الاسم"
          showDropdownOnEmpty={true}
        />

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
                  const currentLocation = warehouseList.find((location) => location.id === current.locationId);
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
            <input value={warehouseList[0]?.name || 'سيتم الربط تلقائيًا بالمخزن الأساسي'} disabled readOnly />
          </Field>
        ) : (
          <Field label="المخزن">
            <select
              value={expenseForm.locationId}
              onChange={(e) => setExpenseForm((current) => ({ ...current, locationId: e.target.value }))}
            >
              <option value="">بدون مخزن</option>
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
            onClick={handleSave}
            isPending={expenseMutation.isPending}
            disabled={expenseValidationErrors.length > 0}
            idleText="حفظ المصروف"
            pendingText="جارٍ الحفظ..."
          />
        </div>
      </div>
    </FormSection>
  );
}
