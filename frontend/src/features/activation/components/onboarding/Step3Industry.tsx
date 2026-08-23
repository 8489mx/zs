import {
  ShoppingCartIcon,
  FactoryIcon,
  BriefcaseIcon,
  GraduationCapIcon,
  BuildingIcon,
  LaptopIcon,
  TruckIcon,
  ConstructionIcon,
  GlobeIcon,
} from '@/shared/components/icons/AppIcons';

interface Step3Props {
  extraData: any;
  updateExtra: (key: any, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step3Industry({ extraData, updateExtra, onNext, onBack }: Step3Props) {
  const industries = [
    { id: 'retail', name: 'تجزئة وتجارة إلكترونية', icon: <ShoppingCartIcon size={24} color="#2563eb" /> },
    { id: 'manufacturing', name: 'تصنيع وإنتاج', icon: <FactoryIcon size={24} color="#0891b2" /> },
    { id: 'services', name: 'خدمات مهنية', icon: <BriefcaseIcon size={24} color="#7c3aed" /> },
    { id: 'education', name: 'تعليم وتدريب', icon: <GraduationCapIcon size={24} color="#ea580c" /> },
    { id: 'realestate', name: 'عقارات', icon: <BuildingIcon size={24} color="#059669" /> },
    { id: 'tech', name: 'تكنولوجيا وبرمجيات', icon: <LaptopIcon size={24} color="#4f46e5" /> },
    { id: 'logistics', name: 'نقل وخدمات لوجستية', icon: <TruckIcon size={24} color="#d97706" /> },
    { id: 'construction', name: 'مقاولات وبناء', icon: <ConstructionIcon size={24} color="#dc2626" /> },
    { id: 'other', name: 'أخرى', icon: <GlobeIcon size={24} color="#64748b" /> },
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
            <div className="industry-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ind.icon}</div>
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
