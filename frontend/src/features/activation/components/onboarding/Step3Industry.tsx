import {
  INDUSTRY_PRESETS,
  PLAN_TIERS,
  type IndustryPresetId,
} from '@/features/settings/components/modular-configurator/modular-presets';

interface Step3Props {
  extraData: any;
  updateExtra: (key: any, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

// Clean Enterprise SVG Line Icons (Ultra-expressive, 0 emojis)
function PresetVectorIcon({ id, size = 20 }: { id: IndustryPresetId; size?: number }) {
  // 1. تجارة التجزئة والسوبرماركت - عربة تسوق سوبرماركت
  if (id === 'retail') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
      </svg>
    );
  }
  // 2. مبيعات الجملة والتوزيع - شاحنة توزيع ولوجستيات
  if (id === 'wholesale') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
        <path d="M15 18H9" />
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14v10Z" />
        <circle cx="17" cy="18.5" r="2.5" />
        <circle cx="7" cy="18.5" r="2.5" />
      </svg>
    );
  }
  // 3. المطاعم والكافيهات والأغذية - شوكة وسكين ضيافة
  if (id === 'restaurant') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
        <path d="M15 2v20" />
        <path d="M5 2v20" />
        <path d="M5 2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H5" />
      </svg>
    );
  }
  // 4. الملابس والأزياء والأحذية - قميص وأزياء
  if (id === 'fashion') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
      </svg>
    );
  }
  // 5. الإلكترونيات والموبايل والصيانة - هاتف ذكي وأجهزة
  if (id === 'electronics') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect width="13" height="19" x="5.5" y="2.5" rx="2.5" />
        <path d="M10.5 5.5h3" />
        <circle cx="12" cy="17.5" r="0.75" />
      </svg>
    );
  }
  // 6. الصيدليات والمستلزمات الطبية - كبسولة دواء علاجية
  if (id === 'pharmacy') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
        <path d="m8.5 8.5 7 7" />
      </svg>
    );
  }
  // 7. التصنيع الخفيف، المعامل والورش - مصنع وخطوط إنتاج
  if (id === 'manufacturing') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        <path d="M17 18h1" />
        <path d="M12 18h1" />
        <path d="M7 18h1" />
      </svg>
    );
  }
  // 8. الشركات الخدمية والمقاولات والصيانة - مفتاح صيانة وأدوات
  if (id === 'services') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    );
  }
  // 9. المتاجر الإلكترونية والتجارة الرقمية - حقيبة تسوق رقمية أونلاين
  if (id === 'ecommerce') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    );
  }
  // 10. أنشطة أخرى / تخصيص حر متقدم - لوحة منزلقات تحكم وموديلات
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="4" y1="21" y2="14" />
      <line x1="4" x2="4" y1="10" y2="3" />
      <line x1="12" x2="12" y1="21" y2="12" />
      <line x1="12" x2="12" y1="8" y2="3" />
      <line x1="20" x2="20" y1="21" y2="16" />
      <line x1="20" x2="20" y1="12" y2="3" />
      <line x1="1" x2="7" y1="14" y2="14" />
      <line x1="9" x2="15" y1="8" y2="8" />
      <line x1="17" x2="23" y1="16" y2="16" />
    </svg>
  );
}

export function Step3Industry({ extraData, updateExtra, onNext, onBack }: Step3Props) {
  const selectedId = (extraData.industry as IndustryPresetId) || 'retail';

  return (
    <div className="wizard-step-content" dir="rtl">
      <div className="wizard-header" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>
          اختر طبيعة نشاطك التجاري
        </h2>
        <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
          يساعدنا ذلك في تهيئة وتخصيص موديولات وشاشات النظام لتناسب عملك وتجهيز تجربة سريعة وخفيفة من البداية.
        </p>
      </div>

      <div
        className="wizard-industry-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          maxHeight: '430px',
          overflowY: 'auto',
          padding: '6px 8px',
        }}
      >
        {(Object.keys(INDUSTRY_PRESETS) as IndustryPresetId[]).map((indKey) => {
          const item = INDUSTRY_PRESETS[indKey];
          const isSelected = selectedId === indKey;

          return (
            <div
              key={indKey}
              onClick={() => updateExtra('industry', indKey)}
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                background: isSelected ? '#f8fafc' : '#ffffff',
                border: isSelected ? '2px solid #170e5e' : '1px solid #e2e8f0',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 3px 12px rgba(23, 14, 94, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: isSelected ? '#170e5e' : '#f1f5f9',
                    color: isSelected ? '#ffffff' : '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <PresetVectorIcon id={indKey} size={18} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {isSelected && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: '#170e5e',
                        color: '#ffffff',
                      }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                  <span style={{ fontSize: '0.72rem', color: isSelected ? '#170e5e' : '#64748b', background: isSelected ? '#ede9fe' : '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                    {item.badge}
                  </span>
                </div>
              </div>

              <div>
                <strong style={{ display: 'block', fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>
                  {item.name}
                </strong>
                <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginTop: '3px', lineHeight: 1.35 }}>
                  {item.subtitle}
                </span>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', fontSize: '0.72rem', color: '#170e5e', fontWeight: 800 }}>
                {PLAN_TIERS[item.recommendedPlan].name}
              </div>
            </div>
          );
        })}
      </div>

      <div className="wizard-footer" style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <button
          type="button"
          className="btn-wizard-back"
          onClick={onBack}
          style={{
            padding: '11px 24px',
            borderRadius: '8px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#475569',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background 0.15s ease',
          }}
        >
          <span>&rarr;</span>
          <span>رجوع</span>
        </button>
        <button
          type="button"
          onClick={onNext}
          style={{
            padding: '12px 32px',
            borderRadius: '8px',
            background: '#170e5e',
            color: '#ffffff',
            fontSize: '0.92rem',
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(23, 14, 94, 0.28)',
            transition: 'opacity 0.15s ease',
          }}
        >
          تأكيد الإعداد وبدء العمل
        </button>
      </div>
    </div>
  );
}
