import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import type { PlanTierInfo } from '@/features/settings/components/modular-configurator/modular-presets';

interface OnboardingHeaderProps {
  currentCalculatedPlan: PlanTierInfo;
  activeCount: number;
  isSubmitting: boolean;
  onApply: () => void;
  onSkip: () => void;
  onAdvanced: () => void;
}

export function OnboardingHeader({
  currentCalculatedPlan,
  activeCount,
  isSubmitting,
  onApply,
  onSkip,
  onAdvanced,
}: OnboardingHeaderProps) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ maxWidth: '600px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '20px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '11.5px', fontWeight: 700, marginBottom: '8px' }}>
          <span>{t('activation.onboarding.onboarding_header.s0', "تهيئة النظام السحابية لأول مرة")}</span>
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>
          {t('activation.onboarding.onboarding_header.s1', "مرحباً بك في Z-Systems ERP")}
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.6 }}>
          {t('activation.onboarding.onboarding_header.s2', "صممنا المنظومة لتتكيف بالكامل مع هوية وطبيعة نشاطك التجاري. اختر نشاطك لتجهيز المصطلحات والقوائم تلقائياً.")}
        </p>
      </div>

      {/* Plan Card Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '12px 18px',
          borderRadius: '12px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{t('activation.onboarding.onboarding_header.s3', "الباقة الموصى بها لاحتياجك:")}</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#170e5e' }}>{currentCalculatedPlan.name}</div>
          <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>{activeCount} {t('activation.onboarding.onboarding_header.s4', "موديول مفعل")}</div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            onClick={onApply}
            disabled={isSubmitting}
            style={{ backgroundColor: '#170e5e', color: '#ffffff', fontWeight: 700, fontSize: '13px', padding: '10px 20px', borderRadius: '10px' }}
          >
            {isSubmitting ? t('activation.onboarding.onboarding_header.s5', "جاري التهيئة...") : t('activation.onboarding.onboarding_header.s6', "حفظ وبدء العمل")}
          </Button>

          <Button
            variant="secondary"
            onClick={onSkip}
            disabled={isSubmitting}
            style={{ fontSize: '12px', padding: '10px 14px' }}
          >
            {t('activation.onboarding.onboarding_header.s7', "تخطي")}
          </Button>

          <Button
            variant="secondary"
            onClick={onAdvanced}
            disabled={isSubmitting}
            style={{ fontSize: '12px', padding: '10px 14px' }}
          >
            {t('activation.onboarding.onboarding_header.s8', "تخصيص متقدم")}
          </Button>
        </div>
      </div>
    </div>
  );
}
