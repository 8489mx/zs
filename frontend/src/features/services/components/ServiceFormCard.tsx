import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { DraftStateNotice } from '@/shared/components/draft-state-notice';
import { FormResetButton } from '@/shared/components/form-reset-button';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { useMutationFeedbackReset } from '@/shared/hooks/use-mutation-feedback-reset';
import type { ServiceRecord } from '@/types/domain';
import { useSaveServiceMutation, type ServiceFormValues } from '@/features/services/hooks/useServiceMutations';

const DEFAULT_SERVICE_PRESETS = [
  'صيانة',
  'ويندوز',
  'طباعة',
  'كتابة',
  'سكانر',
  'تصوير',
  'فورمات',
  'تعريفات',
];

export interface ServiceSuggestionOption {
  name: string;
  defaultAmount?: number | null;
}

function buildDefaultValues(service?: ServiceRecord): ServiceFormValues {
  return {
    name: service?.name || '',
    amount: Number(service?.amount || 0),
    notes: service?.notes || '',
    date: (service?.serviceDate || new Date().toISOString()).slice(0, 16),
    paymentChannel: service?.paymentChannel === 'card' ? 'card' : 'cash',
  };
}

export function ServiceFormCard({
  service,
  onSaved,
  suggestions = [],
}: {
  service?: ServiceRecord;
  onSaved?: () => void;
  suggestions?: ServiceSuggestionOption[];
}) {
  const form = useForm<ServiceFormValues>({ defaultValues: buildDefaultValues() });
  const mutation = useSaveServiceMutation(service?.id, () => {
    form.reset(buildDefaultValues());
    setIsMenuOpen(false);
    onSaved?.();
  });
  useUnsavedChangesGuard(form.formState.isDirty && !mutation.isPending);
  const watchedValues = useWatch({ control: form.control });
  const resetMutationFeedback = mutation.reset;

  const feedbackResetKey = JSON.stringify([watchedValues, service?.id ?? null]);

  useMutationFeedbackReset(
    mutation.isSuccess || mutation.isError,
    resetMutationFeedback,
    feedbackResetKey,
  );

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const serviceName = form.watch('name') || '';

  const suggestionOptions = useMemo<ServiceSuggestionOption[]>(() => {
    if (suggestions.length) return suggestions;
    return DEFAULT_SERVICE_PRESETS.map((name) => ({ name }));
  }, [suggestions]);

  const filteredPresets = useMemo(() => {
    const search = serviceName.trim();
    if (!search) return suggestionOptions;
    return suggestionOptions.filter((item) => item.name.includes(search));
  }, [serviceName, suggestionOptions]);

  useEffect(() => {
    form.reset(buildDefaultValues(service));
    resetMutationFeedback();
    setIsMenuOpen(false);
  }, [service, form, resetMutationFeedback]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleReset() {
    resetMutationFeedback();
    form.reset(buildDefaultValues(service));
    setIsMenuOpen(false);
  }

  return (
    <form className="form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <DraftStateNotice
        visible={form.formState.isDirty && !mutation.isPending}
        title={service ? 'تعديلات الخدمة الحالية غير محفوظة' : 'بيانات الخدمة الجديدة لم تُحفظ بعد'}
        hint={service ? 'يمكنك حفظ التعديل أو إعادة القيم الأصلية قبل تغيير التحديد.' : 'يمكنك تفريغ النموذج سريعًا قبل إدخال خدمة جديدة أخرى.'}
      />

      <Field label="اسم الخدمة">
        <div ref={wrapperRef} style={{ position: 'relative' }}>
          <input
            {...form.register('name', { required: true })}
            disabled={mutation.isPending}
            placeholder="اكتب اسم الخدمة"
            autoComplete="off"
            onFocus={() => setIsMenuOpen(true)}
            onChange={(event) => {
              form.setValue('name', event.target.value, { shouldDirty: true, shouldValidate: true });
              setIsMenuOpen(true);
            }}
          />

          {isMenuOpen && filteredPresets.length ? (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                left: 0,
                background: '#ffffff',
                border: '1px solid #dbe4f0',
                borderRadius: '8px',
                boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
                padding: '6px',
                zIndex: 30,
                maxHeight: '220px',
                overflowY: 'auto',
              }}
            >
              {filteredPresets.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    form.setValue('name', preset.name, { shouldDirty: true, shouldValidate: true });
                    if (typeof preset.defaultAmount === 'number' && Number.isFinite(preset.defaultAmount)) {
                      form.setValue('amount', preset.defaultAmount, { shouldDirty: true, shouldValidate: true });
                    }
                    setIsMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'right',
                    border: 'none',
                    background: 'transparent',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f8fbff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </Field>

      <Field label="القيمة">
        <input type="number" step="0.01" {...form.register('amount', { valueAsNumber: true })} disabled={mutation.isPending} />
      </Field>

      <Field label="طريقة التحصيل">
        <select {...form.register('paymentChannel')} disabled={mutation.isPending}>
          <option value="cash">نقدي - يدخل الخزينة والدرج</option>
          <option value="card">فيزا - يظهر في التقارير ولا يدخل درج النقدية</option>
        </select>
      </Field>

      <Field label="التاريخ">
        <input type="datetime-local" {...form.register('date')} disabled={mutation.isPending} />
      </Field>

      <Field label="ملاحظات">
        <textarea rows={4} {...form.register('notes')} disabled={mutation.isPending} />
      </Field>

      <MutationFeedback
        isError={mutation.isError}
        isSuccess={mutation.isSuccess}
        error={mutation.error}
        errorFallback={service ? 'تعذر تحديث الخدمة' : 'تعذر حفظ الخدمة'}
        successText={service ? 'تم تحديث الخدمة بنجاح.' : 'تم حفظ الخدمة بنجاح.'}
      />

      <div className="actions sticky-form-actions">
        <FormResetButton onReset={handleReset} disabled={mutation.isPending || !form.formState.isDirty}>{service ? 'إعادة القيم' : 'تفريغ النموذج'}</FormResetButton>
        {service ? (
          <Button type="button" variant="secondary" onClick={() => onSaved?.()} disabled={mutation.isPending}>
            إلغاء التحديد
          </Button>
        ) : null}
        <SubmitButton
          type="submit"
          isPending={mutation.isPending}
          idleText={service ? 'حفظ التعديل' : 'إضافة الخدمة'}
          pendingText="جاري الحفظ..."
        />
      </div>
    </form>
  );
}
