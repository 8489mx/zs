import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import type { SettingsFormInput, SettingsFormOutput } from '@/features/settings/schemas/settings.schema';
import type { AppSettings } from '@/types/domain';
import { FormSection } from '@/shared/components/form-section';

interface SecurityTabProps {
  form: UseFormReturn<SettingsFormInput, undefined, SettingsFormOutput>;
  disabled: boolean;
  activeTab: string;
  settings?: AppSettings;
}

export function SecuritySettingsTab({ form, disabled, activeTab, settings }: SecurityTabProps) {
  const { t } = useTranslation();
  return (
        <div style={{ display: activeTab === 'security' ? 'block' : 'none' }}>
        {/* ===== الأمان والنسخ الاحتياطي ===== */}
        <FormSection title={t('settings.forms.tabs.security_settings_tab.s0', "الأمان والنسخ الاحتياطي")}>
          <div className="document-prototype-grid compact-grid-2">
            <div className="field">
              <label>{t('settings.forms.tabs.security_settings_tab.s1', "رمز اعتماد المدير")}</label>
              <input className="purchase-prototype-field-input" inputMode="numeric" {...form.register('managerPin')} disabled={disabled} placeholder={settings?.hasManagerPin ? t('settings.forms.tabs.security_settings_tab.s2', "اتركه فارغًا للإبقاء على الرمز الحالي") : t('settings.forms.tabs.security_settings_tab.s3', "مثال: 1234")} />
              <div className="muted small" style={{ marginTop: 4 }}>{settings?.hasManagerPin ? t('settings.forms.tabs.security_settings_tab.s4', "يوجد رمز مدير محفوظ. اكتب رمزًا جديدًا فقط عند الحاجة للتغيير.") : t('settings.forms.tabs.security_settings_tab.s5', "يمكن ضبط رمز المدير لاعتماد التعديلات الحساسة.")}</div>
            </div>
            <div className="field">
              <label>{t('settings.forms.tabs.security_settings_tab.s6', "النسخ الاحتياطي التلقائي")}</label>
              <select className="purchase-prototype-field-input" {...form.register('autoBackup')} disabled={disabled}>
                <option value="on">{t('settings.forms.tabs.security_settings_tab.s7', "مفعل")}</option>
                <option value="off">{t('settings.forms.tabs.security_settings_tab.s8', "متوقف")}</option>
              </select>
            </div>
          </div>
        </FormSection>
        </div>

  );
}
