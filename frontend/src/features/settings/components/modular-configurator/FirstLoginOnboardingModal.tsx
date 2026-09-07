import { useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import {
  INDUSTRY_PRESETS,
  PLAN_TIERS,
  buildSettingsFromIndustry,
  type IndustryPresetId,
} from './modular-presets';
import { useSettingsUpdateMutation } from '@/features/settings/hooks/useSettingsMutations';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { CheckIcon } from '@/shared/components/icons/AppIcons';

interface FirstLoginOnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onOpenAdvancedConfigurator?: () => void;
}

// Clean Enterprise SVG Icons for Industry Presets (0 Emojis)
// Clean Enterprise SVG Line Icons (Ultra-expressive, 0 emojis)
function PresetIcon({ id, size = 20 }: { id: IndustryPresetId; size?: number }) {
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

export function FirstLoginOnboardingModal({
  open,
  onClose,
  onOpenAdvancedConfigurator,
}: FirstLoginOnboardingModalProps) {
  const { data: currentSettings } = useSettingsQuery();
  const updateSettingsMutation = useSettingsUpdateMutation(currentSettings as any, () => {
    onClose();
  });

  const [selectedIndustry, setSelectedIndustry] = useState<IndustryPresetId>('retail');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const currentPreset = INDUSTRY_PRESETS[selectedIndustry];

  const handleApplyIndustry = async () => {
    setIsSubmitting(true);
    try {
      const patch = buildSettingsFromIndustry(selectedIndustry);
      await updateSettingsMutation.mutateAsync(patch as any);
    } catch {
      // Handled by mutation error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      await updateSettingsMutation.mutateAsync({
        onboardingCompleted: true,
      } as any);
    } catch {
      // Handled by mutation error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogShell
      open={open}
      onClose={() => {
        // Prevent accidental closing without explicit skip or apply
      }}
      width="820px"
      ariaLabel="تخصيص المنظومة وتجهيز بيئة العمل"
    >
      <div dir="rtl" style={{ padding: '8px 4px' }}>
        {/* الترويسة المؤسسية الناصعة */}
        <div style={{ marginBottom: '20px', textAlign: 'start' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#eef2ff', color: '#170e5e', padding: '4px 10px', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 800, marginBottom: '8px' }}>
            تهيئة المنشأة لأول مرة
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>
            تخصيص المنظومة وتجهيز بيئة العمل
          </h2>
          <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
            أهلاً بك في Z-Systems. لمساعدتك في الحصول على تجربة سريعة وسلسة ومناسبة لطبيعة عملك، اختر نشاطك التجاري لتهيئة الموديولات والشاشات وإخفاء ما لا تحتاجه فورياً:
          </p>
        </div>

        {/* شبكة الأنشطة الـ 10 المعيارية */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '10px',
            maxHeight: '360px',
            overflowY: 'auto',
            padding: '4px',
            marginBottom: '18px',
          }}
        >
          {(Object.keys(INDUSTRY_PRESETS) as IndustryPresetId[]).map((indKey) => {
            const item = INDUSTRY_PRESETS[indKey];
            const isSelected = selectedIndustry === indKey;

            return (
              <div
                key={indKey}
                onClick={() => setSelectedIndustry(indKey)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: isSelected ? '#f8fafc' : '#ffffff',
                  border: isSelected ? '2px solid #170e5e' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 3px 10px rgba(23, 14, 94, 0.10)' : 'none',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      background: isSelected ? '#170e5e' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PresetIcon id={indKey} size={18} />
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    {item.badge}
                  </span>
                </div>

                <div>
                  <strong style={{ display: 'block', fontSize: '0.86rem', color: '#0f172a', fontWeight: 800 }}>
                    {item.name}
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '3px', lineHeight: 1.3 }}>
                    {item.subtitle}
                  </span>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                  <span style={{ color: '#170e5e', fontWeight: 800 }}>
                    {PLAN_TIERS[item.recommendedPlan].name}
                  </span>
                  {isSelected && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', color: '#170e5e' }}>
                      <CheckIcon size={14} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* بطاقة ملخص النشاط المختار */}
        <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#475569' }}>
              النشاط المختار: <strong style={{ color: '#0f172a' }}>{currentPreset.name}</strong>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
              {currentPreset.description}
            </div>
          </div>
          {onOpenAdvancedConfigurator && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAdvancedConfigurator();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#170e5e',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              تخصيص متقدم بنداً ببند
            </button>
          )}
        </div>

        {/* أزرار الإجراءات السفلية */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#64748b',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            تخطي والبدء بالإعدادات العامة
          </button>

          <button
            type="button"
            onClick={handleApplyIndustry}
            disabled={isSubmitting}
            style={{
              padding: '10px 28px',
              borderRadius: '8px',
              background: '#170e5e',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: 800,
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(23, 14, 94, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isSubmitting ? 'جاري التجهيز...' : 'تأكيد وبدء العمل'}
          </button>
        </div>
      </div>
    </DialogShell>
  );
}
