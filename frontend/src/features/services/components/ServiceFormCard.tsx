import { useTranslation } from 'react-i18next';
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

function toLocalDatetimeString(dateStr?: string | null): string {
  const date = dateStr ? new Date(dateStr) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function buildDefaultValues(service?: ServiceRecord): ServiceFormValues {
  return {
    name: service?.name || '',
    amount: Number(service?.amount || 0),
    notes: service?.notes || '',
    date: toLocalDatetimeString(service?.serviceDate),
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
  const { t } = useTranslation();
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
    <form className="form-grid service-form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <DraftStateNotice
        visible={form.formState.isDirty && !mutation.isPending}
        title={service ? t('services.service_form_card.s0', "تعديلات الخدمة الحالية غير محفوظة") : t('services.service_form_card.s1', "بيانات الخدمة الجديدة لم تُحفظ بعد")}
        hint={service ? t('services.service_form_card.s2', "يمكنك حفظ التعديل أو إعادة القيم الأصلية قبل تغيير التحديد.") : t('services.service_form_card.s3', "يمكنك تفريغ النموذج سريعًا قبل إدخال خدمة جديدة أخرى.")}
      />

      <Field label={t('services.service_form_card.s4', "اسم الخدمة")} className="field-full-span">
        <div ref={wrapperRef} style={{ position: 'relative' }}>
          <input
            {...form.register('name', { required: true })}
            disabled={mutation.isPending}
            placeholder={t('services.service_form_card.s5', "اكتب اسم الخدمة")}
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

      <Field label={t('services.service_form_card.s6', "القيمة")}>
        <input type="number" step="0.01" {...form.register('amount', { valueAsNumber: true })} disabled={mutation.isPending} />
      </Field>

      <Field label={t('services.service_form_card.s7', "طريقة التحصيل")}>
        <select {...form.register('paymentChannel')} disabled={mutation.isPending}>
          <option value="cash">{t('services.service_form_card.s8', "نقدي - يدخل الخزينة والدرج")}</option>
          <option value="card">{t('services.service_form_card.s9', "فيزا - يظهر في التقارير ولا يدخل درج النقدية")}</option>
        </select>
      </Field>

      <Field label={t('services.service_form_card.s10', "التاريخ")} className="field-full-span">
        <input type="datetime-local" {...form.register('date')} disabled={mutation.isPending} />
      </Field>

      <Field label={t('services.service_form_card.s11', "ملاحظات")} className="field-full-span">
        <textarea rows={3} {...form.register('notes')} disabled={mutation.isPending} />
      </Field>

      <MutationFeedback
        isError={mutation.isError}
        isSuccess={mutation.isSuccess}
        error={mutation.error}
        errorFallback={service ? t('services.service_form_card.s12', "تعذر تحديث الخدمة") : t('services.service_form_card.s13', "تعذر حفظ الخدمة")}
        successText={service ? t('services.service_form_card.s14', "تم تحديث الخدمة بنجاح.") : t('services.service_form_card.s15', "تم حفظ الخدمة بنجاح.")}
      />

      <div className="actions sticky-form-actions">
        <FormResetButton onReset={handleReset} disabled={mutation.isPending || !form.formState.isDirty}>{service ? t('services.service_form_card.s16', "إعادة القيم") : t('services.service_form_card.s17', "تفريغ النموذج")}</FormResetButton>
        {service ? (
          <Button type="button" variant="secondary" onClick={() => onSaved?.()} disabled={mutation.isPending}>
            {t('services.service_form_card.s18', "إلغاء التحديد")}
          </Button>
        ) : null}
        <SubmitButton
          type="submit"
          isPending={mutation.isPending}
          idleText={service ? t('services.service_form_card.s19', "حفظ التعديل") : t('services.service_form_card.s20', "إضافة الخدمة")}
          pendingText={t('services.service_form_card.s21', "جاري الحفظ...")}
        />
      </div>
    </form>
  );
}
