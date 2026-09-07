import {
  INDUSTRY_PRESETS,
  type IndustryPresetId,
} from './modular-presets';

interface SmartModularQuickBarProps {
  currentIndustry?: string;
  onOpenModal: () => void;
  onQuickSelect: (ind: IndustryPresetId) => void;
  disabled?: boolean;
}

function WandMagicIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 4-1-3-1 3-3 1 3 1 1 3 1-3 3-1-3-1z" />
      <path d="m19 16-1-2-1 2-2 1 2 1 1 2 1-2 2-1-2-1z" />
      <path d="M2 22 12 12" />
      <path d="M7 11 11 7" />
    </svg>
  );
}

export function SmartModularQuickBar({
  currentIndustry = 'retail',
  onOpenModal,
  onQuickSelect,
  disabled,
}: SmartModularQuickBarProps) {
  // 10 Clean, concise industry labels
  const presetsList: Array<{ id: IndustryPresetId; shortLabel: string }> = [
    { id: 'retail', shortLabel: 'تجارة التجزئة والسوبرماركت' },
    { id: 'wholesale', shortLabel: 'مبيعات الجملة والتوزيع' },
    { id: 'restaurant', shortLabel: 'المطاعم والكافيهات' },
    { id: 'fashion', shortLabel: 'الملابس والأزياء' },
    { id: 'electronics', shortLabel: 'الصيانة والإلكترونيات' },
    { id: 'pharmacy', shortLabel: 'الصيدليات والأدوية' },
    { id: 'manufacturing', shortLabel: 'التصنيع والورش' },
    { id: 'services', shortLabel: 'الشركات والخدمات' },
    { id: 'ecommerce', shortLabel: 'المتاجر الرقمية' },
    { id: 'custom', shortLabel: 'تخصيص يدوي حر' },
  ];

  const activePreset = INDUSTRY_PRESETS[currentIndustry as IndustryPresetId] || INDUSTRY_PRESETS.retail;

  return (
    <div
      dir="rtl"
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '18px 22px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      {/* Top Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          flexWrap: 'wrap',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#170e5e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <WandMagicIcon size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: '#0f172a' }}>
                تخصيص المنظومة وقوالب الأنشطة
              </h4>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  background: '#f1f5f9',
                  color: '#170e5e',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                }}
              >
                النشاط الحالي: {activePreset.name}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
              اختر قالباً لتفعيل الموديولات الأنسب فورياً وإخفاء الشاشات غير المستخدمة، أو افتح المعالج لتخصيص كل موديول.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenModal}
          disabled={disabled}
          style={{
            padding: '9px 20px',
            fontSize: '0.84rem',
            fontWeight: 800,
            color: '#ffffff',
            background: '#170e5e',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 6px rgba(23, 14, 94, 0.2)',
            transition: 'background 0.15s ease',
          }}
        >
          <WandMagicIcon size={16} />
          <span>فتح معالج التخصيص والمنيو</span>
        </button>
      </div>

      {/* Quick 1-Click Preset Chips (Wrapped, NO horizontal scroll) */}
      <div
        style={{
          borderTop: '1px solid #f1f5f9',
          paddingTop: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800 }}>
            القوالب الجاهزة الموصى بها (تطبيق فوري بنقرة واحدة):
          </span>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            الضغط على أي قالب يضبط موديولاته تلقائياً
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          {presetsList.map((item) => {
            const isSelected = currentIndustry === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onQuickSelect(item.id)}
                disabled={disabled}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  background: isSelected ? '#170e5e' : '#ffffff',
                  border: isSelected ? '1px solid #170e5e' : '1px solid #e2e8f0',
                  color: isSelected ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                  transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                  boxShadow: isSelected ? '0 2px 6px rgba(23, 14, 94, 0.15)' : 'none',
                }}
              >
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
