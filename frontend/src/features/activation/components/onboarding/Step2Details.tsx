import { Field } from '@/shared/ui/field';

interface Step2Props {
  form: any;
  updateField: (key: any, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step2Details({ form, updateField, onNext, onBack }: Step2Props) {
  return (
    <div className="wizard-step-content">
      <div className="wizard-header">
        <h2>حساب المسؤول</h2>
        <p>قم بإنشاء حساب المدير الأساسي للنظام.</p>
      </div>

      <div className="wizard-form-grid single-col">
        <Field label="الاسم الكامل للمدير">
          <input 
            value={form.adminDisplayName} 
            onChange={(e) => updateField('adminDisplayName', e.target.value)} 
            placeholder="مثال: محمود زكريا" 
          />
        </Field>
      </div>

      <div className="wizard-form-grid">
        <Field label="اسم المستخدم (Username)">
          <input 
            value={form.adminUsername} 
            onChange={(e) => updateField('adminUsername', e.target.value)} 
            placeholder="مثال: admin" 
            dir="ltr"
            style={{ textAlign: 'left' }}
          />
        </Field>
        <Field label="كلمة المرور (Password)">
          <input 
            type="text"
            className="input secure-password-field"
            value={form.adminPassword} 
            onChange={(e) => updateField('adminPassword', e.target.value)} 
            placeholder="••••••••" 
            dir="ltr"
            style={{ textAlign: 'left' }}
          />
        </Field>
      </div>

      <div className="wizard-footer">
        <button className="btn-wizard-back" onClick={onBack}>&lt; رجوع</button>
        <button 
          className="btn-wizard-next" 
          onClick={onNext} 
          style={{ width: 'auto', flex: 1, marginLeft: 16 }}
          disabled={!form.adminDisplayName || !form.adminUsername || !form.adminPassword || form.adminPassword.length < 6}
        >
          متابعة &gt;
        </button>
      </div>
    </div>
  );
}
