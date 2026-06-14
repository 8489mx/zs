import { Field } from '@/shared/ui/field';

interface Step1Props {
  form: any;
  updateField: (key: any, value: string) => void;
  extraData: any;
  updateExtra: (key: any, value: string) => void;
  onNext: () => void;
}

export function Step1Welcome({ form, updateField, extraData, updateExtra, onNext }: Step1Props) {
  const sizes = ['1-10', '11-50', '51-200', '201-500', '500+'];

  const isValid = form.storeName && extraData.role && form.adminUsername && form.adminPassword && form.adminPassword.length >= 8;

  return (
    <div className="wizard-step-content">
      <div className="wizard-header">
        <h2>مرحباً بك في منظومة!</h2>
        <p>دعنا نخصص مساحة العمل الخاصة بك، أخبرنا قليلاً عنك.</p>
      </div>

      <div className="wizard-form-grid">
        <Field label="اسم الشركة *">
          <input 
            value={form.storeName} 
            onChange={(e) => updateField('storeName', e.target.value)} 
            placeholder="مثال: شركة التميز" 
          />
        </Field>
        <Field label="ما هو دورك الوظيفي؟">
          <input 
            value={extraData.role} 
            onChange={(e) => updateExtra('role', e.target.value)} 
            placeholder="مثال: owner" 
          />
        </Field>
      </div>

      <div className="wizard-form-grid single-col" style={{ marginBottom: 12 }}>
        <Field label="حجم الشركة">
          <div className="size-pills">
            {sizes.map((s) => (
              <div 
                key={s} 
                className={`size-pill ${extraData.companySize === s ? 'selected' : ''}`}
                onClick={() => updateExtra('companySize', s)}
              >
                {s}
              </div>
            ))}
          </div>
        </Field>
      </div>

      <div className="wizard-form-grid" style={{ marginTop: 24, padding: '24px 0', borderTop: '1px dashed #e2e8f0' }}>
        <Field label="اسم المستخدم (للدخول) *">
          <input 
            value={form.adminUsername} 
            onChange={(e) => updateField('adminUsername', e.target.value)} 
            dir="ltr"
            placeholder="admin" 
          />
        </Field>
        <Field label="كلمة المرور *">
          <input 
            type="password"
            value={form.adminPassword} 
            onChange={(e) => updateField('adminPassword', e.target.value)} 
            dir="ltr"
            placeholder="********" 
          />
        </Field>
        <div style={{ gridColumn: 'span 2', fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>
          * سيتم استخدام هذه البيانات لتسجيل الدخول كمدير للنظام لاحقاً.
        </div>
      </div>

      <div className="wizard-footer">
        <div style={{ flex: 1, textAlign: 'center' }}>
          <button 
            className="btn-wizard-next" 
            onClick={onNext}
            disabled={!isValid}
            style={{ opacity: isValid ? 1 : 0.5 }}
          >
            متابعة &gt;
          </button>
        </div>
      </div>
    </div>
  );
}
