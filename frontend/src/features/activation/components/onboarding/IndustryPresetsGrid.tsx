import {
  INDUSTRY_PRESETS,
  type IndustryPresetId,
  type IndustryPreset,
} from '@/features/settings/components/modular-configurator/modular-presets';
import { PresetIcon } from './PresetIcon';

interface IndustryPresetsGridProps {
  selectedIndustry: IndustryPresetId;
  onSelectIndustry: (id: IndustryPresetId) => void;
}

export function IndustryPresetsGrid({
  selectedIndustry,
  onSelectIndustry,
}: IndustryPresetsGridProps) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ marginBottom: '18px' }}>
        <span style={{ fontSize: '12px', fontWeight: 800, color: '#170e5e', display: 'block', marginBottom: '4px' }}>
          الخطوة 1 من 2: اختر نوع نشاطك التجاري
        </span>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          قوالب التكوين القطاعية الذكية
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
          حدد نشاط منشأتك لتفعيل الموديولات وشاشات الـ POS وخصائص المخازن المناسبة تلقائياً.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '12px',
        }}
      >
        {(Object.keys(INDUSTRY_PRESETS) as IndustryPresetId[]).map((indKey) => {
          const item: IndustryPreset = INDUSTRY_PRESETS[indKey];
          const isSelected = selectedIndustry === indKey;
          return (
            <button
              key={indKey}
              type="button"
              onClick={() => onSelectIndustry(indKey)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '12px',
                border: isSelected ? '2px solid #170e5e' : '1px solid #e2e8f0',
                backgroundColor: isSelected ? '#f8fafc' : '#ffffff',
                cursor: 'pointer',
                textAlign: 'right',
                transition: 'all 0.15s ease',
                outline: 'none',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: isSelected ? '#170e5e' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <PresetIcon id={indKey} size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#170e5e' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.name}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

