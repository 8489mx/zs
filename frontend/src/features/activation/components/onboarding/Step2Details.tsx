import { Field } from '@/shared/ui/field';

interface Step2Props {
  extraData: any;
  updateExtra: (key: any, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step2Details({ extraData, updateExtra, onNext, onBack }: Step2Props) {
  return (
    <div className="wizard-step-content">
      <div className="wizard-header">
        <h2>تفاصيل الشركة</h2>
        <p>أضف معلومات شركتك للمستندات والفواتير الرسمية.</p>
      </div>

      <div className="wizard-form-grid single-col">
        <Field label="شعار الشركة (اختياري)">
          <div className="wizard-upload-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            رفع الشعار
          </div>
        </Field>
      </div>

      <div className="wizard-form-grid single-col">
        <Field label="الرقم الضريبي">
          <input 
            value={extraData.taxId} 
            onChange={(e) => updateExtra('taxId', e.target.value)} 
            placeholder="اختياري" 
          />
        </Field>
        <Field label="العنوان الأول">
          <input 
            value={extraData.address} 
            onChange={(e) => updateExtra('address', e.target.value)} 
            placeholder="عنوان الشارع" 
          />
        </Field>
      </div>

      <div className="wizard-form-grid">
        <Field label="المنطقة / المحافظة">
          <input 
            value={extraData.region} 
            onChange={(e) => updateExtra('region', e.target.value)} 
            placeholder="المنطقة" 
          />
        </Field>
        <Field label="المدينة">
          <input 
            value={extraData.city} 
            onChange={(e) => updateExtra('city', e.target.value)} 
            placeholder="المدينة" 
          />
        </Field>
      </div>

      <div className="wizard-footer">
        <button className="btn-wizard-back" onClick={onBack}>&lt; رجوع</button>
        <button className="btn-wizard-next" onClick={onNext} style={{ width: 'auto', flex: 1, marginLeft: 16 }}>
          متابعة &gt;
        </button>
      </div>
    </div>
  );
}
