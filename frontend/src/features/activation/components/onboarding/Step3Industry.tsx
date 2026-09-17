import { useState, useEffect } from 'react';
import {
  BuildingIcon,
  ShipIcon,
  ShoppingBagIcon,
  PackageIcon,
  ShieldCheckIcon,
  ReceiptIcon,
  LayersIcon,
  ToolIcon,
  TagIcon,
  TruckIcon,
  GlobeIcon,
  CheckCircleIcon,
} from '@/shared/components/icons/AppIcons';

interface Step3Props {
  extraData: any;
  updateExtra: (key: any, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

type PillarKey = 'contracting' | 'maritime_freight' | 'manufacturing' | 'commerce';
type CommerceSubVertical =
  | 'retail_general'
  | 'pharmacy'
  | 'restaurant'
  | 'clothing'
  | 'auto_parts'
  | 'maintenance'
  | 'manufacturing'
  | 'import_export';

interface PillarConfig {
  key: PillarKey;
  labelAr: string;
  badge: string;
  descriptionAr: string;
  icon: typeof BuildingIcon;
  color: string;
  accentBg: string;
}

const PILLARS: PillarConfig[] = [
  {
    key: 'contracting',
    labelAr: 'المقاولات وإدارة المشاريع',
    badge: 'جناح هندسي متكامل',
    descriptionAr: 'المقايسات BOQ، المستخلصات، مقاولو الباطن، ومخازن ومشتريات الموقع.',
    icon: BuildingIcon,
    color: '#0284c7',
    accentBg: '#f0f9ff',
  },
  {
    key: 'maritime_freight',
    labelAr: 'الشحن البحري واللوجستيات',
    badge: 'وكلاء وخطوط ملاحية',
    descriptionAr: 'الخطوط الملاحية، عروض النولون، أوامر التشغيل، وتتبع الحاويات وفترات السماح.',
    icon: ShipIcon,
    color: '#0d9488',
    accentBg: '#f0fdfa',
  },
  {
    key: 'manufacturing',
    labelAr: 'التصنيع والإنتاج الصناعي',
    badge: 'مصانع وخطوط إنتاج',
    descriptionAr: 'أوامر الشغل، شجرة المنتج BOM، تكاليف الإنتاج، ومخازن الخامات والتام.',
    icon: LayersIcon,
    color: '#4338ca',
    accentBg: '#e0e7ff',
  },
  {
    key: 'commerce',
    labelAr: 'التجارة والأنشطة العامة',
    badge: 'نقاط بيع ومستودعات',
    descriptionAr: 'كاشير سريع، مستودعات وباركود، مشتريات وفواتير، مع تخصيصات فرعية لنشاطك.',
    icon: ShoppingBagIcon,
    color: '#170e5e',
    accentBg: '#eef2ff',
  },
];

interface SubVerticalConfig {
  key: CommerceSubVertical;
  labelAr: string;
  tag: string;
  descriptionAr: string;
  icon: typeof PackageIcon;
}

const COMMERCE_SUB_VERTICALS: SubVerticalConfig[] = [
  {
    key: 'retail_general',
    labelAr: 'التجزئة والتجارة العامة والسوبرماركت',
    tag: 'كاشير ومخازن قياسية',
    descriptionAr: 'محلات التجزئة، الجملة، والسوبرماركت بمخزون وباركود وجرد فوري.',
    icon: PackageIcon,
  },
  {
    key: 'pharmacy',
    labelAr: 'الصيدليات والمستلزمات الطبية',
    tag: 'FEFO وتواريخ الصلاحية',
    descriptionAr: 'محرك أرقام التشغيلات، تواريخ الصلاحية، بدائل الأدوية، والروشتات.',
    icon: ShieldCheckIcon,
  },
  {
    key: 'restaurant',
    labelAr: 'المطاعم والكافيهات والأغذية',
    tag: 'KDS وشاشات المطبخ',
    descriptionAr: 'شاشات المطبخ الذكية، الصالات والطاولات، وإضافات الوجبات السريعة.',
    icon: ReceiptIcon,
  },
  {
    key: 'clothing',
    labelAr: 'الملابس والأزياء والأحذية',
    tag: 'الألوان والمقاسات Variants',
    descriptionAr: 'مصفوفة المقاسات والألوان، باركود الأزياء، وتصنيفات الموديلات.',
    icon: TagIcon,
  },
  {
    key: 'auto_parts',
    labelAr: 'قطع غيار السيارات والآليات',
    tag: 'أرقام القطع الأصلية OEM',
    descriptionAr: 'دليل أرقام القطع OEM، توافق الموديلات والماركات، وسنوات الصنع.',
    icon: TruckIcon,
  },
  {
    key: 'maintenance',
    labelAr: 'مراكز الصيانة وخدمة الأجهزة',
    tag: 'سيريال IMEI والضمان',
    descriptionAr: 'كروت استلام وفحص الأجهزة، تتبع السيريال IMEI، وفحص المستعمل.',
    icon: ToolIcon,
  },
  {
    key: 'manufacturing',
    labelAr: 'التصنيع الخفيف والورش والمعامل',
    tag: 'شجرة المنتج BOM',
    descriptionAr: 'قوائم المكونات BOM، خطوط التشغيل، واستهلاك المواد الخام والتكلفة.',
    icon: LayersIcon,
  },
  {
    key: 'import_export',
    labelAr: 'الاستيراد والتجارة الدولية والتوزيع',
    tag: 'شحنات وحاويات جمركية',
    descriptionAr: 'متابعة الشحنات الجمركية، حسابات الموردين الدوليين، وتكاليف الرسائل.',
    icon: GlobeIcon,
  },
];

export function Step3Industry({ extraData, updateExtra, onNext, onBack }: Step3Props) {
  const currentVal = String(extraData.industry || 'retail_general').trim().toLowerCase();

  const initialPillar: PillarKey =
    currentVal === 'contracting' || currentVal === 'construction'
      ? 'contracting'
      : currentVal === 'maritime_freight' || currentVal === 'maritime'
      ? 'maritime_freight'
      : currentVal === 'manufacturing' || currentVal === 'production'
      ? 'manufacturing'
      : 'commerce';

  const [selectedPillar, setSelectedPillar] = useState<PillarKey>(initialPillar);

  const initialSubVertical: CommerceSubVertical =
    currentVal === 'pharmacy'
      ? 'pharmacy'
      : currentVal === 'restaurant'
      ? 'restaurant'
      : currentVal === 'clothing' || currentVal === 'fashion'
      ? 'clothing'
      : currentVal === 'auto_parts'
      ? 'auto_parts'
      : currentVal === 'import_export' || currentVal === 'import'
      ? 'import_export'
      : currentVal === 'manufacturing'
      ? 'manufacturing'
      : currentVal === 'maintenance' || currentVal === 'electronics'
      ? 'maintenance'
      : 'retail_general';

  const [selectedSubVertical, setSelectedSubVertical] = useState<CommerceSubVertical>(initialSubVertical);

  useEffect(() => {
    if (!extraData.industry || extraData.industry === 'retail') {
      updateExtra('industry', 'retail_general');
    }
  }, []);

  const handlePillarChange = (pillar: PillarKey) => {
    setSelectedPillar(pillar);
    if (pillar === 'contracting') {
      updateExtra('industry', 'contracting');
    } else if (pillar === 'maritime_freight') {
      updateExtra('industry', 'maritime_freight');
    } else if (pillar === 'manufacturing') {
      updateExtra('industry', 'manufacturing');
    } else {
      updateExtra('industry', selectedSubVertical);
    }
  };

  const handleSubVerticalChange = (subKey: CommerceSubVertical) => {
    setSelectedSubVertical(subKey);
    setSelectedPillar('commerce');
    updateExtra('industry', subKey);
  };

  return (
    <div className="wizard-step-content" dir="rtl">
      <div className="wizard-header" style={{ marginBottom: '14px', textAlign: 'right' }}>
        <h2 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
          اختر قطاع وطبيعة نشاط المنشأة
        </h2>
        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
          يتم تجهيز المنظومة بكامل الموديولات والمحركات المحاسبية الملائمة لنشاطك فورياً.
        </p>
      </div>

      {/* 4 Core Pillars Selection */}
      <style>{`
        .onboarding-pillars-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 12px;
        }
        .onboarding-sub-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        @media (max-width: 960px) {
          .onboarding-pillars-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 640px) {
          .onboarding-pillars-grid {
            grid-template-columns: 1fr;
          }
          .onboarding-sub-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="onboarding-pillars-grid">
        {PILLARS.map((pillar) => {
          const isPillarActive = selectedPillar === pillar.key;
          const Icon = pillar.icon;

          return (
            <div
              key={pillar.key}
              onClick={() => handlePillarChange(pillar.key)}
              style={{
                border: isPillarActive ? `2px solid ${pillar.color}` : '1.5px solid #e2e8f0',
                background: isPillarActive ? pillar.accentBg : '#ffffff',
                borderRadius: '10px',
                padding: '12px 14px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                position: 'relative',
                boxShadow: isPillarActive ? `0 4px 12px ${pillar.color}20` : '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      background: isPillarActive ? pillar.color : '#f1f5f9',
                      color: isPillarActive ? '#ffffff' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <strong
                      style={{
                        fontSize: '0.84rem',
                        color: '#0f172a',
                        fontWeight: 800,
                        display: 'block',
                        lineHeight: 1.25,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={pillar.labelAr}
                    >
                      {pillar.labelAr}
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                      {pillar.badge}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: isPillarActive ? `5px solid ${pillar.color}` : '2px solid #cbd5e1',
                    background: '#ffffff',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                />
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: '0.72rem',
                  color: '#475569',
                  lineHeight: '1.4',
                  margin: 0,
                  textAlign: 'right',
                  wordBreak: 'normal',
                }}
              >
                {pillar.descriptionAr}
              </p>
            </div>
          );
        })}
      </div>

      {/* Sub-verticals selection for Commerce Pillar */}
      {selectedPillar === 'commerce' && (
        <div
          style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <strong style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 800 }}>
                تخصص نشاط التجارة والمخازن (8 قطاعات مدعومة):
              </strong>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                تفعيل المحركات والخصائص التخصصية لنوعية بضاعتك
              </span>
            </div>
          </div>

          <div className="onboarding-sub-grid">
            {COMMERCE_SUB_VERTICALS.map((sub) => {
              const isSubActive = selectedSubVertical === sub.key;
              const SubIcon = sub.icon;

              return (
                <div
                  key={sub.key}
                  onClick={() => handleSubVerticalChange(sub.key)}
                  style={{
                    border: isSubActive ? '1.5px solid #170e5e' : '1px solid #e2e8f0',
                    background: isSubActive ? '#f0f4ff' : '#f8fafc',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '6px',
                      background: isSubActive ? '#170e5e' : '#ffffff',
                      color: isSubActive ? '#ffffff' : '#64748b',
                      border: isSubActive ? 'none' : '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <SubIcon size={16} />
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <strong
                        style={{
                          fontSize: '0.78rem',
                          color: isSubActive ? '#170e5e' : '#0f172a',
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {sub.labelAr}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: isSubActive ? '#170e5e' : '#e2e8f0',
                          color: isSubActive ? '#ffffff' : '#475569',
                          flexShrink: 0,
                        }}
                      >
                        {sub.tag}
                      </span>
                    </div>

                    <p
                      style={{
                        fontSize: '0.7rem',
                        color: '#64748b',
                        margin: '2px 0 0',
                        lineHeight: 1.3,
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={sub.descriptionAr}
                    >
                      {sub.descriptionAr}
                    </p>
                  </div>

                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      border: isSubActive ? '4.5px solid #170e5e' : '1.5px solid #cbd5e1',
                      background: '#ffffff',
                      flexShrink: 0,
                      transition: 'all 0.12s ease',
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Navigation Buttons */}
      <div
        className="wizard-footer"
        style={{
          marginTop: '8px',
          paddingTop: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <button
          type="button"
          className="btn-wizard-back"
          onClick={onBack}
          style={{
            padding: '9px 20px',
            borderRadius: '8px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#475569',
            fontSize: '0.84rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <span>&rarr;</span>
          <span>رجوع</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          style={{
            padding: '10px 28px',
            borderRadius: '8px',
            background: '#170e5e',
            color: '#ffffff',
            fontSize: '0.88rem',
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(23, 14, 94, 0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <span>تأكيد واكتمال التهيئة</span>
          <CheckCircleIcon size={16} color="#ffffff" />
        </button>
      </div>
    </div>
  );
}
