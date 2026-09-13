import { useState } from 'react';
import {
  BuildingIcon,
  ShipIcon,
  ShoppingBagIcon,
  PackageIcon,
  ShieldCheckIcon,
  ReceiptIcon,
  LayersIcon,
  ToolIcon,
  CheckCircleIcon,
} from '@/shared/components/icons/AppIcons';

interface Step3Props {
  extraData: any;
  updateExtra: (key: any, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

type PillarKey = 'contracting' | 'maritime_freight' | 'manufacturing' | 'commerce';
type CommerceSubVertical = 'retail_general' | 'pharmacy' | 'restaurant' | 'manufacturing' | 'maintenance';

interface PillarConfig {
  key: PillarKey;
  labelAr: string;
  badge: string;
  descriptionAr: string;
  icon: typeof BuildingIcon;
  color: string;
  accentBg: string;
  featuresSummary: string;
}

const PILLARS: PillarConfig[] = [
  {
    key: 'contracting',
    labelAr: 'قطاع المقاولات وإدارة المشاريع',
    badge: 'جناح مؤسسي شامل',
    descriptionAr: 'إدارة متكاملة للمشاريع والمقايسات (BOQ)، الأوامر التغييرية، المستخلصات (IPC)، عقود مقاولي الباطن، المشتريات ومخازن الموقع.',
    icon: BuildingIcon,
    color: '#0284c7',
    accentBg: '#f0f9ff',
    featuresSummary: 'المشاريع • المقايسات • المستخلصات • مقاولو الباطن • المشتريات • الحسابات والأصول',
  },
  {
    key: 'maritime_freight',
    labelAr: 'قطاع الشحن البحري واللوجستيات',
    badge: 'جناح مؤسسي شامل',
    descriptionAr: 'منظومة الخطوط الملاحية، الموانئ، مقارنة أسعار النولون (RFQ)، عروض العملاء، أوامر التشغيل، وتتبع الحاويات وفترات السماح.',
    icon: ShipIcon,
    color: '#0d9488',
    accentBg: '#f0fdfa',
    featuresSummary: 'الخطوط والموانئ • تسعير النولون • أوامر التشغيل • الحاويات والغرامات • الشجرة المحاسبية',
  },
  {
    key: 'manufacturing',
    labelAr: 'قطاع التصنيع والإنتاج الصناعي',
    badge: 'جناح مؤسسي شامل',
    descriptionAr: 'منظومة المصانع وإدارة خطوط الإنتاج، أوامر الشغل، قوائم المكونات (BOM)، تكاليف الإنتاج ومخازن المواد الخام والمنتج التام.',
    icon: LayersIcon,
    color: '#4338ca',
    accentBg: '#e0e7ff',
    featuresSummary: 'أوامر الإنتاج • قوائم المكونات BOM • مخازن المواد الخام • مراكز التكلفة • مشتريات التوريد • CRM',
  },
  {
    key: 'commerce',
    labelAr: 'قطاع التجارة وإدارة الأعمال',
    badge: 'نقاط البيع والمخازن',
    descriptionAr: 'منظومة التجارة المتكاملة لنقاط البيع السريعة، المخازن والمستودعات، المشتريات والموردين، مع تخصيصات فرعية دقيقة للنشاط.',
    icon: ShoppingBagIcon,
    color: '#170e5e',
    accentBg: '#eef2ff',
    featuresSummary: 'نقاط البيع • المخازن والباركود • المشتريات • الحسابات • الفاتورة الإلكترونية',
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
    tag: 'عام وافتراضي',
    descriptionAr: 'محلات التجزئة، الجملة، السوبرماركت، والأنشطة التجارية المتنوعة بمخزون وباركود قياسي.',
    icon: PackageIcon,
  },
  {
    key: 'pharmacy',
    labelAr: 'الصيدليات والمستلزمات الطبية',
    tag: 'FEFO الرقابي',
    descriptionAr: 'تتبع التشغيلات وتواريخ انتهاء الصلاحية، دليل الأدوية والبدائل، الروشتات، وكشكول النواقص.',
    icon: ShieldCheckIcon,
  },
  {
    key: 'restaurant',
    labelAr: 'المطاعم والكافيهات والأغذية',
    tag: 'KDS والمطبخ',
    descriptionAr: 'شاشة المطبخ KDS، الطاولات والصالات، خيارات وإضافات الأصناف، والطلبات السريعة.',
    icon: ReceiptIcon,
  },
  {
    key: 'manufacturing',
    labelAr: 'التصنيع وخطوط الإنتاج الخفيف والورش',
    tag: 'BOM وشجرة المنتج',
    descriptionAr: 'قوائم مكونات الإنتاج (BOM)، أوامر التشغيل، استهلاك المواد الخام، وحساب التكلفة الصناعية.',
    icon: LayersIcon,
  },
  {
    key: 'maintenance',
    labelAr: 'مراكز الصيانة وخدمة الأجهزة',
    tag: 'كروت الصيانة و IMEI',
    descriptionAr: 'استلام الأجهزة، كروت الصيانة والضمان، تتبع أرقام السيريال IMEI، وفحص واستبدال المستعمل.',
    icon: ToolIcon,
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
      : currentVal === 'manufacturing'
      ? 'manufacturing'
      : currentVal === 'maintenance' || currentVal === 'electronics'
      ? 'maintenance'
      : 'retail_general';

  const [selectedSubVertical, setSelectedSubVertical] = useState<CommerceSubVertical>(initialSubVertical);

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
      <div className="wizard-header" style={{ marginBottom: '18px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>
          اختر قطاع وطبيعة نشاط المنشأة
        </h2>
        <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
          يتم تجهيز المنظومة بكامل موديولاتها وشاشاتها الملائمة لنشاطك فورياً لضمان سلامة العمليات المحاسبية.
        </p>
      </div>

      {/* 4 Core Pillars Selection */}
      <style>{`
        .onboarding-pillars-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }
        @media (max-width: 960px) {
          .onboarding-pillars-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 540px) {
          .onboarding-pillars-grid {
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
                border: isPillarActive ? `2px solid ${pillar.color}` : '1px solid #e2e8f0',
                background: isPillarActive ? pillar.accentBg : '#ffffff',
                borderRadius: '12px',
                padding: '16px 18px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                position: 'relative',
                boxShadow: isPillarActive ? `0 4px 14px ${pillar.color}18` : '0 1px 3px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: isPillarActive ? pillar.color : '#f1f5f9',
                      color: isPillarActive ? '#ffffff' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.94rem', color: '#0f172a', fontWeight: 800, display: 'block' }}>
                      {pillar.labelAr}
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                      {pillar.badge}
                    </span>
                  </div>
                </div>

                {isPillarActive && (
                  <div style={{ color: pillar.color }}>
                    <CheckCircleIcon size={18} color={pillar.color} />
                  </div>
                )}
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: '0.76rem',
                  color: '#475569',
                  lineHeight: '1.45',
                  margin: 0,
                  textAlign: 'justify',
                }}
              >
                {pillar.descriptionAr}
              </p>

              {/* Features hint */}
              <div
                style={{
                  fontSize: '0.7rem',
                  color: isPillarActive ? pillar.color : '#64748b',
                  borderTop: '1px solid rgba(0,0,0,0.06)',
                  paddingTop: '8px',
                  fontWeight: 700,
                }}
              >
                {pillar.featuresSummary}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sub-verticals selection for Commerce Pillar */}
      {selectedPillar === 'commerce' && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '16px',
          }}
        >
          <div style={{ marginBottom: '10px' }}>
            <strong style={{ fontSize: '0.86rem', color: '#0f172a', fontWeight: 800 }}>
              اختر تخصص نشاط التجارة الدقيق:
            </strong>
            <span style={{ fontSize: '0.74rem', color: '#64748b', marginRight: '8px' }}>
              لتفعيل الخصائص الموجهة لنوعية بضاعتك
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '8px',
            }}
          >
            {COMMERCE_SUB_VERTICALS.map((sub) => {
              const isSubActive = selectedSubVertical === sub.key;
              const SubIcon = sub.icon;

              return (
                <div
                  key={sub.key}
                  onClick={() => handleSubVerticalChange(sub.key)}
                  style={{
                    border: isSubActive ? '1.5px solid #170e5e' : '1px solid #e2e8f0',
                    background: isSubActive ? '#eef2ff' : '#f8fafc',
                    borderRadius: '8px',
                    padding: '10px 12px',
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
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <SubIcon size={16} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: '0.8rem', color: isSubActive ? '#170e5e' : '#0f172a', fontWeight: 800 }}>
                        {sub.labelAr}
                      </strong>
                      {isSubActive && <CheckCircleIcon size={13} color="#170e5e" />}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: '1px' }}>
                      {sub.tag}
                    </span>
                  </div>
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
          marginTop: '16px',
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
            padding: '10px 22px',
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
          }}
        >
          <span>&rarr;</span>
          <span>رجوع</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          style={{
            padding: '11px 30px',
            borderRadius: '8px',
            background: '#170e5e',
            color: '#ffffff',
            fontSize: '0.92rem',
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(23, 14, 94, 0.25)',
          }}
        >
          تأكيد واكتمال التهيئة
        </button>
      </div>
    </div>
  );
}
