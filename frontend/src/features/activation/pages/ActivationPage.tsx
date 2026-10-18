import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { FormSection } from '@/shared/components/form-section';
import { Field } from '@/shared/ui/field';
import { ErrorState } from '@/shared/ui/error-state';
import { useActivationPageController } from '@/features/activation/hooks/useActivationPageController';

export function ActivationPage() {
  const { t } = useTranslation();
  const { activationCode, setActivationCode, copyLabel, error, handleActivate, handleCopyMachineId, machineId, submitting } = useActivationPageController();

  return (
    <div className="screen-center auth-screen-shell">
      <FormSection title={t('activation.activation_page.s0', "تفعيل البرنامج")} description={t('activation.activation_page.s1', "أرسل معرف الجهاز إلى الإدارة ثم الصق كود التفعيل هنا مرة واحدة فقط.")} className="activation-card">
        <div className="stack gap-16">
          <div className="activation-machine-box">
            <div>
              <strong>{t('activation.activation_page.s2', "معرف هذا الجهاز")}</strong>
              <div className="mono activation-machine-id">{machineId || t('activation.activation_page.s3', "جارٍ تجهيز المعرف...")}</div>
            </div>
            <Button type="button" variant="secondary" disabled={!machineId} onClick={() => void handleCopyMachineId()}>
              {copyLabel}
            </Button>
          </div>
          <Field label={t('activation.activation_page.s4', "كود التفعيل")}>
            <textarea
              rows={5}
              value={activationCode}
              onChange={(event) => setActivationCode(event.target.value)}
              placeholder={t('activation.activation_page.s5', "الصق كود التفعيل هنا")}
            />
          </Field>
          {error ? <ErrorState title={t('activation.activation_page.s6', "فشل التفعيل")} hint={error} /> : null}
          <div className="inline-actions inline-actions-end">
            <Button type="button" onClick={() => void handleActivate()} disabled={submitting || !activationCode.trim()}>
              {submitting ? t('activation.activation_page.s7', "جارٍ التفعيل...") : t('activation.activation_page.s8', "تفعيل البرنامج")}
            </Button>
          </div>
        </div>
      </FormSection>
    </div>
  );
}
