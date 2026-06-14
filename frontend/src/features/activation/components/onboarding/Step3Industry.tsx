interface Step3Props {
  extraData: any;
  updateExtra: (key: any, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step3Industry({ extraData, updateExtra, onNext, onBack }: Step3Props) {
  const industries = [
    { id: 'retail', name: 'تجزئة وتجارة إلكترونية', icon: '🛒' },
    { id: 'manufacturing', name: 'تصنيع وإنتاج', icon: '🏭' },
    { id: 'services', name: 'خدمات مهنية', icon: '💼' },
    { id: 'education', name: 'تعليم وتدريب', icon: '🎓' },
    { id: 'realestate', name: 'عقارات', icon: '🏢' },
    { id: 'tech', name: 'تكنولوجيا وبرمجيات', icon: '💻' },
    { id: 'logistics', name: 'نقل وخدمات لوجستية', icon: '🚚' },
    { id: 'construction', name: 'مقاولات وبناء', icon: '🏗️' },
    { id: 'other', name: 'أخرى', icon: '✨' },
  ];

  return (
    <div className="wizard-step-content">
      <div className="wizard-header">
        <h2>اختر مجال عملك</h2>
        <p>هذا يساعدنا في تخصيص ملفك الشخصي وتحسين التطبيقات.</p>
      </div>

      <div className="industry-grid">
        {industries.map((ind) => (
          <div 
            key={ind.id} 
            className={`industry-card ${extraData.industry === ind.id ? 'selected' : ''}`}
            onClick={() => updateExtra('industry', ind.id)}
          >
            <div className="industry-icon">{ind.icon}</div>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{ind.name}</span>
          </div>
        ))}
      </div>

      <div className="wizard-footer">
        <button className="btn-wizard-back" onClick={onBack}>&lt; رجوع</button>
        <button className="btn-wizard-next" onClick={onNext} style={{ width: 'auto', flex: 1, marginLeft: 16 }}>
          إكمال الإعداد
        </button>
      </div>
    </div>
  );
}
