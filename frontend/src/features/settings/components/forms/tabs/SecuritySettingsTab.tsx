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
  return (
        <div style={{ display: activeTab === 'security' ? 'block' : 'none' }}>
        {/* ===== الأمان والنسخ الاحتياطي ===== */}
        <FormSection title="الأمان والنسخ الاحتياطي">
          <div className="document-prototype-grid compact-grid-2">
            <div className="field">
              <label>رمز اعتماد المدير</label>
              <input className="purchase-prototype-field-input" inputMode="numeric" {...form.register('managerPin')} disabled={disabled} placeholder={settings?.hasManagerPin ? 'اتركه فارغًا للإبقاء على الرمز الحالي' : 'مثال: 1234'} />
              <div className="muted small" style={{ marginTop: 4 }}>{settings?.hasManagerPin ? 'يوجد رمز مدير محفوظ. اكتب رمزًا جديدًا فقط عند الحاجة للتغيير.' : 'يمكن ضبط رمز المدير لاعتماد التعديلات الحساسة.'}</div>
            </div>
            <div className="field">
              <label>النسخ الاحتياطي التلقائي</label>
              <select className="purchase-prototype-field-input" {...form.register('autoBackup')} disabled={disabled}>
                <option value="on">مفعل</option>
                <option value="off">متوقف</option>
              </select>
            </div>
          </div>
        </FormSection>
        </div>

  );
}
