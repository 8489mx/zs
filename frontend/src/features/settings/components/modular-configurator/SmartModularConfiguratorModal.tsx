import { useState, useMemo, useEffect } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import {
  XIcon,
  CheckIcon,
  SearchIcon,
  AlertCircleIcon,
  CheckCircleIcon,
} from '@/shared/components/icons/AppIcons';
import {
  INDUSTRY_PRESETS,
  SYSTEM_MODULES,
  PLAN_TIERS,
  calculateRecommendedPlan,
  resolveModuleDependencies,
  type IndustryPresetId,
  type PlanTierInfo,
} from './modular-presets';

interface SmartModularConfiguratorModalProps {
  open: boolean;
  onClose: () => void;
  currentValues: Record<string, any>;
  onApply: (config: {
    selectedModules: Record<string, boolean>;
    industry: IndustryPresetId;
    posMode?: 'scanner' | 'touch';
    productKind?: 'standard' | 'fashion';
    maintenanceProfile?: string;
  }) => void;
  disabled?: boolean;
}

// Crisp SVG Line Icons (Enterprise Standards - 0 Emojis)
function RetailShopIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function WholesaleIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function RestaurantIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
      <path d="M15 2v18" />
      <path d="M5 2v8a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V2" />
      <path d="M8 2v18" />
    </svg>
  );
}

function FashionIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </svg>
  );
}

function ElectronicsIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}

function PharmacyIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="4" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}

function ManufacturingIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M17 18h1" />
      <path d="M12 18h1" />
      <path d="M7 18h1" />
    </svg>
  );
}

function ServicesIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function EcommerceIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" x2="22" y1="12" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function CustomSettingsIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="21" y2="21" />
      <line x1="4" x2="20" y1="14" y2="14" />
      <line x1="4" x2="20" y1="7" y2="7" />
      <circle cx="8" cy="7" r="2" />
      <circle cx="16" cy="14" r="2" />
      <circle cx="10" cy="21" r="2" />
    </svg>
  );
}

function ContractingIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
    </svg>
  );
}

function MaritimeIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76" />
      <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6" />
      <path d="M12 10V2" />
      <path d="M12 2l3 3" />
    </svg>
  );
}

function getIndustryIcon(id: IndustryPresetId, size = 22) {
  switch (id) {
    case 'contracting':
      return <ContractingIcon size={size} />;
    case 'maritime':
      return <MaritimeIcon size={size} />;
    case 'retail':
      return <RetailShopIcon size={size} />;
    case 'wholesale':
      return <WholesaleIcon size={size} />;
    case 'restaurant':
      return <RestaurantIcon size={size} />;
    case 'fashion':
      return <FashionIcon size={size} />;
    case 'electronics':
      return <ElectronicsIcon size={size} />;
    case 'pharmacy':
      return <PharmacyIcon size={size} />;
    case 'manufacturing':
      return <ManufacturingIcon size={size} />;
    case 'services':
      return <ServicesIcon size={size} />;
    case 'ecommerce':
      return <EcommerceIcon size={size} />;
    default:
      return <CustomSettingsIcon size={size} />;
  }
}

export function SmartModularConfiguratorModal({
  open,
  onClose,
  currentValues,
  onApply,
  disabled,
}: SmartModularConfiguratorModalProps) {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryPresetId>('retail');
  const [selectedModules, setSelectedModules] = useState<Record<string, boolean>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dependencyAlert, setDependencyAlert] = useState<string | null>(null);

  // Initialize from current values when opening
  useEffect(() => {
    if (open) {
      const initialModules: Record<string, boolean> = {};
      for (const mod of SYSTEM_MODULES) {
        initialModules[mod.key] = Boolean(currentValues[mod.key]);
      }
      setSelectedModules(initialModules);

      // Guess current industry or default to general/retail
      const currentInd = (currentValues.businessIndustry as IndustryPresetId) || 'retail';
      if (INDUSTRY_PRESETS[currentInd]) {
        setSelectedIndustry(currentInd);
      } else {
        setSelectedIndustry('retail');
      }
      setActiveStep(1);
      setDependencyAlert(null);
    }
  }, [open, currentValues]);

  // When industry changes, automatically configure recommended modules
  const handleSelectIndustry = (indId: IndustryPresetId) => {
    setSelectedIndustry(indId);
    const preset = INDUSTRY_PRESETS[indId];
    const newSelection: Record<string, boolean> = {};

    // Start with all false
    for (const mod of SYSTEM_MODULES) {
      newSelection[mod.key] = false;
    }

    if (indId === 'custom') {
      // In custom mode, keep whatever is currently selected
      for (const mod of SYSTEM_MODULES) {
        newSelection[mod.key] = Boolean(selectedModules[mod.key]);
      }
    } else {
      // Enable recommended
      for (const key of preset.recommendedModules) {
        newSelection[key] = true;
      }
      // Ensure disabled are explicitly false
      for (const key of preset.disabledModules) {
        newSelection[key] = false;
      }
    }

    // Auto resolve dependencies
    const activeKeys = Object.keys(newSelection).filter((k) => newSelection[k]);
    const { resolvedKeys } = resolveModuleDependencies(activeKeys);
    for (const key of resolvedKeys) {
      newSelection[key] = true;
    }

    setSelectedModules(newSelection);
    setDependencyAlert(null);
  };

  const handleToggleModule = (key: string) => {
    const isCurrentlyActive = Boolean(selectedModules[key]);
    const newActive = !isCurrentlyActive;

    const updated = { ...selectedModules, [key]: newActive };

    if (newActive) {
      // Check if activating this module pulls in dependencies
      const activeKeys = Object.keys(updated).filter((k) => updated[k]);
      const { resolvedKeys, autoActivated } = resolveModuleDependencies(activeKeys);
      for (const depKey of resolvedKeys) {
        updated[depKey] = true;
      }
      if (autoActivated.length > 0) {
        const depTitles = autoActivated
          .map((k) => SYSTEM_MODULES.find((m) => m.key === k)?.title || k)
          .join('، ');
        setDependencyAlert(`تم تفعيل (${depTitles}) تلقائياً لاكتمال اعتماديات الموديول.`);
      } else {
        setDependencyAlert(null);
      }
    } else {
      setDependencyAlert(null);
    }

    setSelectedModules(updated);
    // Switch industry to custom if user manually deviates from preset
    if (selectedIndustry !== 'custom') {
      // If manually adjusted, keep the preset reference but acknowledge custom tweaks
    }
  };

  // Active module keys
  const activeKeys = useMemo(() => {
    return Object.keys(selectedModules).filter((k) => selectedModules[k]);
  }, [selectedModules]);

  // Recommended plan calculation
  const recommendedPlan: PlanTierInfo = useMemo(() => {
    return calculateRecommendedPlan(activeKeys);
  }, [activeKeys]);

  // Filtered modules for Menu tab
  const filteredModules = useMemo(() => {
    return SYSTEM_MODULES.filter((mod) => {
      const matchCategory = categoryFilter === 'all' || mod.category === categoryFilter;
      const matchSearch =
        !searchQuery.trim() ||
        mod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.shortDesc.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [categoryFilter, searchQuery]);

  const preset = INDUSTRY_PRESETS[selectedIndustry];

  const handleApply = () => {
    onApply({
      selectedModules,
      industry: selectedIndustry,
      posMode: preset.defaultPosMode,
      productKind: preset.defaultProductKind,
      maintenanceProfile: preset.maintenanceProfile,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <DialogShell open={open} onClose={onClose} width="960px" ariaLabel="معالج التخصيص الذكي للموديولات">
      <div
        dir="rtl"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  background: '#f1f5f9',
                  color: '#170e5e',
                  padding: '6px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CustomSettingsIcon size={20} />
              </span>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                معالج تخصيص النظام الذكي (Modular Configurator)
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              خصص موديولات المنظومة وقوائمها وفق طبيعة نشاطك للحصول على واجهة سريعة ومباشرة تناسب حجم عملك.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '6px',
              borderRadius: '8px',
            }}
            title="إغلاق"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Step Tabs Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            padding: '0 24px',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            style={{
              padding: '14px 18px',
              fontSize: '0.86rem',
              fontWeight: 700,
              color: activeStep === 1 ? '#170e5e' : '#64748b',
              border: 'none',
              borderBottom: activeStep === 1 ? '3px solid #170e5e' : '3px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'color 0.15s ease, border-color 0.15s ease',
            }}
          >
            <span
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: activeStep === 1 ? '#170e5e' : '#cbd5e1',
                color: '#ffffff',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
              }}
            >
              1
            </span>
            <span>طبيعة النشاط التجاري</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStep(2)}
            style={{
              padding: '14px 18px',
              fontSize: '0.86rem',
              fontWeight: 700,
              color: activeStep === 2 ? '#170e5e' : '#64748b',
              border: 'none',
              borderBottom: activeStep === 2 ? '3px solid #170e5e' : '3px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'color 0.15s ease, border-color 0.15s ease',
            }}
          >
            <span
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: activeStep === 2 ? '#170e5e' : '#cbd5e1',
                color: '#ffffff',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
              }}
            >
              2
            </span>
            <span>قائمة الموديولات (Menu)</span>
            <span
              style={{
                background: '#e2e8f0',
                color: '#334155',
                fontSize: '0.72rem',
                padding: '1px 7px',
                borderRadius: '12px',
                fontWeight: 700,
              }}
            >
              {activeKeys.length} مفعّل
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStep(3)}
            style={{
              padding: '14px 18px',
              fontSize: '0.86rem',
              fontWeight: 700,
              color: activeStep === 3 ? '#170e5e' : '#64748b',
              border: 'none',
              borderBottom: activeStep === 3 ? '3px solid #170e5e' : '3px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'color 0.15s ease, border-color 0.15s ease',
            }}
          >
            <span
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: activeStep === 3 ? '#170e5e' : '#cbd5e1',
                color: '#ffffff',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
              }}
            >
              3
            </span>
            <span>مطابقة الباقة والملخص</span>
            <span
              style={{
                background: recommendedPlan.badgeBg,
                color: recommendedPlan.badgeColor,
                fontSize: '0.72rem',
                padding: '1px 7px',
                borderRadius: '12px',
                fontWeight: 800,
              }}
            >
              {recommendedPlan.name}
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {dependencyAlert && (
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                padding: '10px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.82rem',
                color: '#1e40af',
                fontWeight: 600,
              }}
            >
              <AlertCircleIcon size={18} color="#2563eb" />
              <span>{dependencyAlert}</span>
            </div>
          )}

          {/* ===== STEP 1: INDUSTRY PRESETS ===== */}
          {activeStep === 1 && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  اختر طبيعة نشاطك التجاري
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  سيقوم النظام تلقائياً بتحديد الموديولات الموصى بها لهذا القطاع وإخفاء الموديولات الزائدة.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '12px',
                }}
              >
                {(Object.keys(INDUSTRY_PRESETS) as IndustryPresetId[]).map((indKey) => {
                  const item = INDUSTRY_PRESETS[indKey];
                  const isSelected = selectedIndustry === indKey;

                  return (
                    <div
                      key={indKey}
                      onClick={() => handleSelectIndustry(indKey)}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: isSelected ? '#f8fafc' : '#ffffff',
                        border: isSelected ? '2px solid #170e5e' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px',
                        boxShadow: isSelected ? '0 4px 12px rgba(23, 14, 94, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
                        position: 'relative',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              background: isSelected ? '#170e5e' : '#f1f5f9',
                              color: isSelected ? '#ffffff' : '#334155',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {getIndustryIcon(indKey, 22)}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: '#f1f5f9',
                                color: '#475569',
                                fontWeight: 700,
                              }}
                            >
                              {item.badge}
                            </span>
                            {isSelected && (
                              <span
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  background: '#170e5e',
                                  color: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <CheckIcon size={12} color="#ffffff" />
                              </span>
                            )}
                          </div>
                        </div>

                        <strong style={{ display: 'block', fontSize: '0.92rem', color: '#0f172a', fontWeight: 800 }}>
                          {item.name}
                        </strong>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.77rem', color: '#64748b', lineHeight: 1.4 }}>
                          {item.description}
                        </p>
                      </div>

                      <div
                        style={{
                          borderTop: '1px solid #f1f5f9',
                          paddingTop: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.73rem',
                          color: '#64748b',
                        }}
                      >
                        <span>
                          <strong>{item.recommendedModules.length}</strong> موديولات موصى بها
                        </span>
                        <span style={{ fontWeight: 800, color: '#170e5e' }}>
                          {PLAN_TIERS[item.recommendedPlan].name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== STEP 2: MODULAR MENU CUSTOMIZER ===== */}
          {activeStep === 2 && (
            <div>
              {/* Category Pills & Search */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: 'كافة الموديولات' },
                    { id: 'pos', label: 'المبيعات ونقاط البيع' },
                    { id: 'inventory', label: 'المخزون وسلاسل الإمداد' },
                    { id: 'specialized', label: 'الخدمات والتشغيل' },
                    { id: 'logistics', label: 'التجارة والتوصيل' },
                    { id: 'finance', label: 'المالية والمؤسسات' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: categoryFilter === cat.id ? 800 : 600,
                        border: '1px solid',
                        borderColor: categoryFilter === cat.id ? '#170e5e' : '#e2e8f0',
                        background: categoryFilter === cat.id ? '#170e5e' : '#ffffff',
                        color: categoryFilter === cat.id ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.1s ease',
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    position: 'relative',
                    minWidth: '220px',
                  }}
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث في الموديولات..."
                    style={{
                      width: '100%',
                      padding: '7px 32px 7px 12px',
                      fontSize: '0.8rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                    }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '8px', color: '#94a3b8' }}>
                    <SearchIcon size={15} />
                  </span>
                </div>
              </div>

              {/* Modules Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                  gap: '12px',
                }}
              >
                {filteredModules.map((mod) => {
                  const isChecked = Boolean(selectedModules[mod.key]);
                  const isRecommendedForPreset = preset.recommendedModules.includes(mod.key);
                  const planInfo = PLAN_TIERS[mod.requiredPlan];

                  return (
                    <label
                      key={mod.key}
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggleModule(mod.key);
                      }}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '12px',
                        background: isChecked ? '#f0fdf4' : '#ffffff',
                        border: isChecked ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '14px',
                        boxShadow: isChecked ? '0 2px 6px rgba(0,0,0,0.02)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>
                            {mod.title}
                          </strong>
                          {isRecommendedForPreset && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: '#dbeafe',
                                color: '#1e40af',
                                fontWeight: 800,
                              }}
                            >
                              موصى به
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: '0.68rem',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: planInfo.badgeBg,
                              color: planInfo.badgeColor,
                              fontWeight: 700,
                            }}
                          >
                            {planInfo.name}
                          </span>
                        </div>

                        <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b', lineHeight: 1.4 }}>
                          {mod.shortDesc}
                        </p>

                        {mod.dependencies && mod.dependencies.length > 0 && (
                          <span style={{ display: 'block', marginTop: '6px', fontSize: '0.7rem', color: '#94a3b8' }}>
                            يتطلب: {mod.dependencies.map((d) => SYSTEM_MODULES.find((m) => m.key === d)?.title || d).join(', ')}
                          </span>
                        )}
                      </div>

                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by container click
                        style={{
                          width: '18px',
                          height: '18px',
                          accentColor: '#170e5e',
                          cursor: 'pointer',
                          marginTop: '3px',
                          flexShrink: 0,
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== STEP 3: SUMMARY & PLAN RECOMMENDATION ===== */}
          {activeStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Plan Matching Hero Card */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '14px',
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '20px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    الباقة المطابقة للموديولات المختارة
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
                      {recommendedPlan.name}
                    </h3>
                    <span
                      style={{
                        background: recommendedPlan.badgeBg,
                        color: recommendedPlan.badgeColor,
                        padding: '4px 12px',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                      }}
                    >
                      {recommendedPlan.priceLabel}
                    </span>
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: '#475569', lineHeight: 1.4 }}>
                    {recommendedPlan.summary}
                  </p>
                </div>

                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px 18px',
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>إجمالي الموديولات المفعلة</span>
                  <strong style={{ fontSize: '1.6rem', color: '#170e5e', fontWeight: 900 }}>
                    {activeKeys.length}
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>من أصل {SYSTEM_MODULES.length}</span>
                </div>
              </div>

              {/* Two Column Breakdown */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                }}
              >
                {/* Active Modules */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ color: '#16a34a' }}>
                      <CheckCircleIcon size={18} />
                    </span>
                    <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                      الموديولات التي سيتم تفعيلها وإظهارها ({activeKeys.length})
                    </strong>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                    {activeKeys.map((key) => {
                      const mod = SYSTEM_MODULES.find((m) => m.key === key);
                      return (
                        <div
                          key={key}
                          style={{
                            padding: '6px 10px',
                            background: '#f0fdf4',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            color: '#166534',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span>{mod?.title || key}</span>
                          <span style={{ fontSize: '0.7rem', color: '#15803d' }}>{mod?.categoryLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Disabled / Hidden Modules */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ color: '#94a3b8' }}>
                      <XIcon size={18} />
                    </span>
                    <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                      موديولات غير مستخدمة (ستبقى مخفية لتسريع الواجهة) ({SYSTEM_MODULES.length - activeKeys.length})
                    </strong>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                    {SYSTEM_MODULES.filter((m) => !activeKeys.includes(m.key)).map((mod) => (
                      <div
                        key={mod.key}
                        style={{
                          padding: '6px 10px',
                          background: '#f8fafc',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          color: '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{mod.title}</span>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>مخفي</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {activeStep > 1 && (
              <button
                type="button"
                onClick={() => setActiveStep((s) => (s - 1) as any)}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: '#475569',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                &rarr; الخطوة السابقة
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                fontSize: '0.84rem',
                fontWeight: 700,
                color: '#64748b',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              إلغاء
            </button>

            {activeStep < 3 ? (
              <button
                type="button"
                onClick={() => setActiveStep((s) => (s + 1) as any)}
                style={{
                  padding: '8px 20px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  background: '#170e5e',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                متابعة &larr;
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApply}
                disabled={disabled}
                style={{
                  padding: '9px 24px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  background: '#170e5e',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(23, 14, 94, 0.25)',
                }}
              >
                تطبيق وتخصيص المنظومة فورياً
              </button>
            )}
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
