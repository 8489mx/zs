import {
  SYSTEM_MODULES,
} from '@/features/settings/components/modular-configurator/modular-presets';
import { MODULE_GROUPS, CATEGORY_TABS, type ModuleCategoryFilter } from './types';

interface ModulesConfiguratorGridProps {
  customModules: Record<string, boolean>;
  onToggleModule: (key: string) => void;
  selectedCategory: ModuleCategoryFilter;
  onSelectCategory: (cat: ModuleCategoryFilter) => void;
}

export function ModulesConfiguratorGrid({
  customModules,
  onToggleModule,
  selectedCategory,
  onSelectCategory,
}: ModulesConfiguratorGridProps) {
  const displayedGroups =
    selectedCategory === 'all'
      ? MODULE_GROUPS
      : MODULE_GROUPS.filter((g) => g.id === selectedCategory);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '18px' }}>
        <div>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#170e5e', display: 'block', marginBottom: '4px' }}>
            الخطوة 2 من 2: خصص الميزات والموديولات
          </span>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            تفعيل وإلغاء ميزات النظام
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
            تم تفعيل الموديولات المقترحة لنشاطك، ويمكنك تفعيل أو إيقاف أي موديول إضافي بحرية.
          </p>
        </div>

        {/* Tabs Filter */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
          {CATEGORY_TABS.map((tab) => {
            const isTabActive = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectCategory(tab.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isTabActive ? '#ffffff' : 'transparent',
                  color: isTabActive ? '#170e5e' : '#64748b',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: isTabActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Module Groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {displayedGroups.map((grp) => {
          const groupModules = SYSTEM_MODULES.filter((m) => m.category === grp.id);
          if (groupModules.length === 0) return null;

          return (
            <div key={grp.id} style={{ border: '1px solid #f1f5f9', borderRadius: '12px', padding: '16px', backgroundColor: '#fafbfc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b', margin: 0 }}>{grp.title}</h3>
                  <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0' }}>{grp.desc}</p>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', backgroundColor: '#e2e8f0', color: '#334155' }}>
                  {grp.badge}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                {groupModules.map((mod) => {
                  const isChecked = customModules[mod.key] === true;
                  return (
                    <label
                      key={mod.key}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: isChecked ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                        backgroundColor: isChecked ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleModule(mod.key)}
                        style={{ marginTop: '3px', cursor: 'pointer', accentColor: '#170e5e' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: isChecked ? '#1e40af' : '#0f172a' }}>
                          {mod.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                          {mod.shortDesc}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
