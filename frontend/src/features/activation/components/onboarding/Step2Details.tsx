import { useTranslation } from 'react-i18next';
import { Field } from '@/shared/ui/field';

interface Step2Props {
  form: any;
  updateField: (key: any, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step2Details({ form, updateField, onNext, onBack }: Step2Props) {
  const { t } = useTranslation();
  return (
    <div className="wizard-step-content">
      <div className="wizard-header">
        <h2>{t('activation.onboarding.step2_details.s0', "حساب المسؤول")}</h2>
        <p>{t('activation.onboarding.step2_details.s1', "قم بإنشاء حساب المدير الأساسي للنظام.")}</p>
      </div>

      <div className="wizard-form-grid single-col">
        <Field label={t('activation.onboarding.step2_details.s2', "الاسم الكامل للمدير")}>
          <input 
            value={form.adminDisplayName} 
            onChange={(e) => updateField('adminDisplayName', e.target.value)} 
            placeholder={t('activation.onboarding.step2_details.s3', "مثال: محمد أحمد")} 
          />
        </Field>
      </div>

      <div className="wizard-form-grid">
        <Field label={t('activation.onboarding.step2_details.s4', "اسم المستخدم (Username)")}>
          <input 
            value={form.adminUsername} 
            onChange={(e) => updateField('adminUsername', e.target.value)} 
            placeholder={t('activation.onboarding.step2_details.s5', "مثال: admin")} 
            dir="ltr"
            style={{ textAlign: 'left' }}
          />
        </Field>
        <Field label={t('activation.onboarding.step2_details.s6', "كلمة المرور (Password)")}>
          <input 
            type="password"
            className="input secure-password-field"
            value={form.adminPassword} 
            onChange={(e) => updateField('adminPassword', e.target.value)} 
            placeholder="••••••••" 
            dir="ltr"
            style={{ textAlign: 'left' }}
            autoComplete="new-password"
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </Field>
      </div>

      <div className="wizard-footer">
        <button className="btn-wizard-back" onClick={onBack}>{t('activation.onboarding.step2_details.s7', "< رجوع")}</button>
        <button 
          className="btn-wizard-next" 
          onClick={onNext} 
          style={{
            background: '#170e5e',
            color: '#ffffff',
            padding: '12px 32px',
            borderRadius: '8px',
            fontWeight: 800,
            fontSize: '15px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(23, 14, 94, 0.25)',
            transition: 'all 0.15s ease',
            width: 'auto',
            flex: 1,
            marginLeft: 16
          }}
          disabled={!form.adminDisplayName || !form.adminUsername || !form.adminPassword || form.adminPassword.length < 6}
        >
          {t('activation.onboarding.step2_details.s8', "متابعة >")}
        </button>
      </div>
    </div>
  );
}
