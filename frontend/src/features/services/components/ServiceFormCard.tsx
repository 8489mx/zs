import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { DraftStateNotice } from '@/shared/components/draft-state-notice';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import type { ServiceRecord } from '@/types/domain';
import { useSaveServiceMutation, type ServiceFormValues } from '@/features/services/hooks/useServiceMutations';

const SERVICE_PRESETS = [
  'صيانه',
  'ويندوز',
  'طباعه',
  'كتابه',
  'سكانر',
  'تصوير',
  'فورمات',
  'تعريفات',
];

function buildDefaultValues(service?: ServiceRecord): ServiceFormValues {
  return {
    name: service?.name || '',
    amount: Number(service?.amount || 0),
    notes: service?.notes || '',
    date: (service?.serviceDate || new Date().toISOString()).slice(0, 16)
  };
}

export function ServiceFormCard({ service, onSaved }: { service?: ServiceRecord; onSaved?: () => void }) {
  const form = useForm<ServiceFormValues>({ defaultValues: buildDefaultValues() });
  const mutation = useSaveServiceMutation(service?.id, () => {
    form.reset(buildDefaultValues());
    setIsMenuOpen(false);
    onSaved?.();
  });
  useUnsavedChangesGuard(form.formState.isDirty && !mutation.isPending);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const serviceName = form.watch('name') || '';

  const filteredPresets = useMemo(() => {
    const search = serviceName.trim();
    if (!search) return SERVICE_PRESETS;
    return SERVICE_PRESETS.filter((item) => item.includes(search));
  }, [serviceName]);

  useEffect(() => {
    form.reset(buildDefaultValues(service));
    setIsMenuOpen(false);
  }, [service, form]);

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

  return (
    <form className="form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <DraftStateNotice visible={form.formState.isDirty && !mutation.isPending} title={service ? 'تعديلات الخدمه الحاليه غير محفوظة' : 'بيانات الخدمه الجديدة لم تحفظ بعد'} />

      <Field label="اسم الخدمه">
        <div ref={wrapperRef} style={{ position: 'relative' }}>
          <input
            {...form.register('name', { required: true })}
            disabled={mutation.isPending}
            placeholder="اكتب اسم الخدمه"
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
                borderRadius: '14px',
                boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
                padding: '6px',
                zIndex: 30,
                maxHeight: '220px',
                overflowY: 'auto',
              }}
            >
              {filteredPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    form.setValue('name', preset, { shouldDirty: true, shouldValidate: true });
                    setIsMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'right',
                    border: 'none',
                    background: 'transparent',
                    padding: '10px 12px',
                    borderRadius: '10px',
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
                  {preset}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </Field>

      <Field label="القيمه">
        <input type="number" step="0.01" {...form.register('amount', { valueAsNumber: true })} disabled={mutation.isPending} />
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
        errorFallback={service ? 'تعذر تحديث الخدمه' : 'تعذر حفظ الخدمه'}
        successText={service ? 'تم تحديث الخدمه بنجاح.' : 'تم حفظ الخدمه بنجاح.'}
      />

      <div className="actions sticky-form-actions">
        {service ? (
          <Button type="button" variant="secondary" onClick={() => onSaved?.()} disabled={mutation.isPending}>
            الغاء التحديد
          </Button>
        ) : null}
        <SubmitButton
          type="submit"
          disabled={mutation.isPending}
          idleText={service ? 'حفظ التعديل' : 'اضافه الخدمه'}
          pendingText="جاري الحفظ..."
        />
      </div>
    </form>
  );
}
