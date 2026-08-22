import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { SettingsFormInput, SettingsFormOutput } from '@/features/settings/schemas/settings.schema';
import { FormSection } from '@/shared/components/form-section';
import { useHasFeature } from '@/shared/hooks/use-permission';
import { DialogShell } from '@/shared/components/dialog-shell';
import { MAINTENANCE_PROFILES, getMaintenanceProfile, type MaintenanceProfileKey } from '@/features/maintenance/constants/maintenance-profiles';

interface ModulesTabProps {
  form: UseFormReturn<SettingsFormInput, undefined, SettingsFormOutput>;
  disabled: boolean;
  activeTab: string;
}

// Premium SVG Line Icons
function FactoryIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M17 18h1" />
      <path d="M12 18h1" />
      <path d="M7 18h1" />
    </svg>
  );
}

function ComboPackageIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function CargoShipIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.26.94 4.3 2.45 5.82" />
      <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
      <path d="M12 2v4" />
    </svg>
  );
}

function UtensilsIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
      <path d="M15 2v18" />
      <path d="M5 2v8a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V2" />
      <path d="M8 2v18" />
    </svg>
  );
}

function TableCustomerIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ShirtIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
    </svg>
  );
}

function ScaleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </svg>
  );
}

function EnterpriseIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}

const premiumCardStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 18px',
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  gap: '12px',
};

const iconBadgeStyle = {
  width: '38px',
  height: '38px',
  borderRadius: '8px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#0f172a',
  flexShrink: 0,
};

const premiumCardTextStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '3px',
};

const premiumCheckboxInputStyle = {
  width: '18px',
  height: '18px',
  accentColor: '#0f172a',
  cursor: 'pointer',
  flexShrink: 0,
};

export function ModulesSettingsTab({ form, disabled, activeTab }: ModulesTabProps) {
  const hasManufacturingFeature = useHasFeature('manufacturing');
  const clothingModuleEnabled = form.watch('clothingModuleEnabled');
  const weightedBarcodeEnabled = form.watch('weightedBarcodeEnabled');
  const enableMaintenance = form.watch('enableMobileStoreFeatures');
  const currentProfileKey = form.watch('maintenanceProfile') || 'mobile';
  const currentProfile = getMaintenanceProfile(currentProfileKey);

  const [profileModalOpen, setProfileModalOpen] = useState(false);

  return (
    <div style={{ display: activeTab === 'modules' ? 'block' : 'none' }}>
      {/* ===== موديولات النظام ===== */}
      <FormSection title="موديولات النظام" description={<>شغّل الأجزاء التي تحتاجها لنشاطك، وسيتم ضبط وتحديث القوائم والشاشات تلقائياً.</>}>
        <div className="document-prototype-grid compact-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '12px' }}>
          {hasManufacturingFeature && (
            <label style={premiumCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={iconBadgeStyle}>
                  <FactoryIcon size={20} />
                </div>
                <div style={premiumCardTextStyle}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>التصنيع والإنتاج</strong>
                  <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>يضيف خيارات المكونات، وصفات الإنتاج، وأوامر التصنيع</small>
                </div>
              </div>
              <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('manufacturingModuleEnabled')} disabled={disabled} />
            </label>
          )}

          <label style={premiumCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={iconBadgeStyle}>
                <ComboPackageIcon size={20} />
              </div>
              <div style={premiumCardTextStyle}>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>العروض المجمعة والوجبات</strong>
                <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>يفعّل العروض المكوّنة من عدة أصناف (Combo)</small>
              </div>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('comboModuleEnabled')} disabled={disabled} />
          </label>

          <label style={premiumCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={iconBadgeStyle}>
                <CargoShipIcon size={20} />
              </div>
              <div style={premiumCardTextStyle}>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>موديول الاستيراد والشراكة</strong>
                <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>يفعّل إدارة الحاويات، مسير الشحن، وتوزيع الأرباح</small>
              </div>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('importModuleEnabled')} disabled={disabled} />
          </label>

          <label style={premiumCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={iconBadgeStyle}>
                <UtensilsIcon size={20} />
              </div>
              <div style={premiumCardTextStyle}>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>موديول المطاعم والكافيهات</strong>
                <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>يفعّل نظام الطاولات والمطبخ وأنواع الطلبات</small>
              </div>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('restaurantModuleEnabled')} disabled={disabled} />
          </label>

          <label style={premiumCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={iconBadgeStyle}>
                <TableCustomerIcon size={20} />
              </div>
              <div style={premiumCardTextStyle}>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>اختيار الطاولة والعميل بالكاشير</strong>
                <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>يظهر حقول العميل والطاولة أعلى السلة لتسهيل الاختيار قبل الدفع</small>
              </div>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('posShowCartMeta')} disabled={disabled} />
          </label>

          {/* ===== موديول إدارة الصيانة الشامل مع محدد الأنشطة ===== */}
          <div style={{ ...premiumCardStyle, flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ ...iconBadgeStyle, background: enableMaintenance ? '#ecfdf5' : '#f8fafc', borderColor: enableMaintenance ? '#a7f3d0' : '#e2e8f0' }}>
                  <span style={{ fontSize: '1.25rem' }}>{currentProfile.icon}</span>
                </div>
                <div style={premiumCardTextStyle}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>موديول إدارة الصيانة والأجهزة</strong>
                  <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>يفعّل تتبع السيريال، استلام الأجهزة، فحص الضمان، وحساب المصنعية</small>
                </div>
              </div>
              <input
                type="checkbox"
                style={premiumCheckboxInputStyle}
                {...form.register('enableMobileStoreFeatures', {
                  onChange: (e) => {
                    if (e.target.checked && !form.getValues('maintenanceProfile')) {
                      form.setValue('maintenanceProfile', 'mobile', { shouldDirty: true });
                    }
                  }
                })}
                disabled={disabled}
              />
            </div>

            {enableMaintenance && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 10px', marginTop: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                  <span style={{ color: '#64748b' }}>نشاط الصيانة المحدد:</span>
                  <span style={{ color: '#2563eb', fontWeight: 800 }}>{currentProfile.icon} {currentProfile.shortTitle}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(true)}
                  disabled={disabled}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                  }}
                >
                  <span>تغيير النشاط</span>
                  <span style={{ fontSize: '10px', opacity: 0.7 }}>▾</span>
                </button>
              </div>
            )}
          </div>

          <label style={premiumCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={iconBadgeStyle}>
                <ShirtIcon size={20} />
              </div>
              <div style={premiumCardTextStyle}>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>موديل الملابس والمتغيرات</strong>
                <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>يفعّل موديلات الملابس وشبكة المقاسات والألوان</small>
              </div>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('clothingModuleEnabled')} disabled={disabled} />
          </label>

          <label style={premiumCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={iconBadgeStyle}>
                <ScaleIcon size={20} />
              </div>
              <div style={premiumCardTextStyle}>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>باركود الميزان</strong>
                <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>باركود مضمّن فيه الوزن أو السعر مباشرةً للأوزان</small>
              </div>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('weightedBarcodeEnabled')} disabled={disabled} />
          </label>

          <label style={premiumCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={iconBadgeStyle}>
                <EnterpriseIcon size={20} />
              </div>
              <div style={premiumCardTextStyle}>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>موديول الشركات والمحاسبة المتقدمة</strong>
                <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>يفعّل مراكز التكلفة، ربط الفواتير بالمشاريع، وشروط التعاقد</small>
              </div>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('enableEnterpriseFeatures')} disabled={disabled} />
          </label>
        </div>

        {enableMaintenance ? (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>{currentProfile.icon}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>{currentProfile.title}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{currentProfile.subtitle}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                disabled={disabled}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: '#2563eb',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                تخصيص القالب والنشاط ({currentProfile.shortTitle}) ▾
              </button>
            </div>

            <div className="document-prototype-grid compact-grid-2">
              <div className="field">
                <label style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px', display: 'block', fontSize: '0.82rem' }}>
                  نسبة عمولة فني الصيانة من صافي المصنعية (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  className="purchase-prototype-field-input"
                  {...form.register('technicianCommissionRate')}
                  disabled={disabled}
                  placeholder="30"
                  style={{ fontWeight: 700 }}
                />
                <small className="muted">تُحسب العمولة تلقائيًا كنسبة مئوية من صافي ربح المصنعية وشغل اليد بعد خصم سعر قطع الغيار القطاعي.</small>
              </div>

              <div className="field">
                <label style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px', display: 'block', fontSize: '0.82rem' }}>
                  الملحقات الافتراضية للفحص والاستلام
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {currentProfile.defaultAccessories.map((acc) => (
                    <span key={acc} style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', color: '#334155', fontWeight: 600 }}>
                      {acc}
                    </span>
                  ))}
                </div>
                <small className="muted">تظهر هذه الملحقات كأزرار سريعة في شاشة استلام وتذاكر الصيانة.</small>
              </div>
            </div>
          </div>
        ) : null}

        {/* Modal Dialog for Selecting Maintenance Profile */}
        <DialogShell
          open={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          width="min(860px, 95vw)"
          ariaLabel="تخصيص نوع نشاط الصيانة والأجهزة"
        >
          <div style={{ padding: '8px 4px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>🛠️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>تخصيص نوع نشاط الصيانة والأجهزة</h3>
                  <small style={{ fontSize: '0.78rem', color: '#64748b' }}>اختر نوع النشاط لتكييف حقول الفحص، مسميات القائمة، والملحقات تلقائياً</small>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', width: 28, height: 28, cursor: 'pointer', fontWeight: 800, color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', maxHeight: '60vh', overflowY: 'auto', padding: '2px' }}>
              {(Object.keys(MAINTENANCE_PROFILES) as MaintenanceProfileKey[]).map((key) => {
                const profile = MAINTENANCE_PROFILES[key];
                const isSelected = currentProfileKey === key;
                return (
                  <div
                    key={key}
                    onClick={() => {
                      form.setValue('maintenanceProfile', key, { shouldDirty: true });
                      form.setValue('enableMobileStoreFeatures', true, { shouldDirty: true });
                      setProfileModalOpen(false);
                    }}
                    style={{
                      border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      borderRadius: '12px',
                      padding: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.5rem' }}>{profile.icon}</span>
                        <strong style={{ fontSize: '0.88rem', color: isSelected ? '#1e40af' : '#0f172a', fontWeight: 800 }}>
                          {profile.title}
                        </strong>
                      </div>
                      {isSelected && (
                        <span style={{ background: '#2563eb', color: '#ffffff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 900 }}>
                          ✓
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: '0.78rem', color: isSelected ? '#3b82f6' : '#64748b', lineHeight: 1.4, margin: 0 }}>
                      {profile.subtitle}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.72rem', background: isSelected ? '#dbeafe' : '#f1f5f9', color: isSelected ? '#1e40af' : '#475569', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        {profile.serialLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogShell>

        {clothingModuleEnabled ? (
          <div className="document-prototype-grid compact-grid-2" style={{ marginTop: 16 }}>
            <div className="field">
              <label>الصنف الافتراضي عند الإضافة</label>
              <select className="purchase-prototype-field-input" {...form.register('defaultProductKind')} disabled={disabled}>
                <option value="standard">صنف عادي</option>
                <option value="fashion">موديل ملابس</option>
              </select>
            </div>
          </div>
        ) : null}

        {weightedBarcodeEnabled ? (
          <div className="document-prototype-grid compact-grid-2" style={{ marginTop: 16 }}>
            <div className="field">
              <label>بداية باركود الميزان</label>
              <input className="purchase-prototype-field-input" inputMode="numeric" {...form.register('weightedBarcodePrefix')} disabled={disabled} placeholder="21" />
            </div>
            <div className="field">
              <label>أرقام كود الصنف</label>
              <input className="purchase-prototype-field-input" type="number" min="3" max="8" {...form.register('weightedBarcodeProductCodeLength')} disabled={disabled} />
            </div>
            <div className="field">
              <label>أرقام الوزن</label>
              <input className="purchase-prototype-field-input" type="number" min="3" max="8" {...form.register('weightedBarcodeWeightDigits')} disabled={disabled} />
            </div>
            <div className="field">
              <label>دقة الوزن (خانات عشرية)</label>
              <input className="purchase-prototype-field-input" type="number" min="0" max="3" {...form.register('weightedBarcodeWeightDecimals')} disabled={disabled} />
            </div>
          </div>
        ) : null}
      </FormSection>
    </div>
  );
}
