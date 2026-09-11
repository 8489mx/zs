import React from 'react';
import {
  FileTextIcon,
  SearchIcon,
  ReceiptIcon,
  ShipIcon,
  CheckCircleIcon,
  AppIcons,
} from '@/shared/components/icons/AppIcons';

interface StepItem {
  number: number;
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number | string; color?: string }>;
}

const STEPS: StepItem[] = [
  {
    number: 1,
    id: 'inquiry',
    title: 'طلب الشحن (Inquiry)',
    subtitle: 'استلام رغبة العميل وتفاصيل البضاعة',
    icon: FileTextIcon,
  },
  {
    number: 2,
    id: 'rfq',
    title: 'استقصاء الخطوط (RFQ)',
    subtitle: 'إرسال آلي وتلقي عروض الخطوط الملاحية',
    icon: SearchIcon,
  },
  {
    number: 3,
    id: 'quotation',
    title: 'عرض سعر العميل (Quote)',
    subtitle: 'تطبيق هامش الربح وإرسال واتساب/إيميل',
    icon: ReceiptIcon,
  },
  {
    number: 4,
    id: 'job',
    title: 'أمر التشغيل (Job File)',
    subtitle: 'فتح مركز التكلفة والربط المالي الآلي',
    icon: ShipIcon,
  },
  {
    number: 5,
    id: 'tracking',
    title: 'رحلة الشحن (DCSA)',
    subtitle: 'شحن، تتبع بحري، وتخليص جمركي',
    icon: AppIcons.Clock,
  },
  {
    number: 6,
    id: 'delivery',
    title: 'التسليم والإغلاق (DLVR)',
    subtitle: 'تسليم البضاعة للعميل وإرجاع الحاوية',
    icon: CheckCircleIcon,
  },
];

interface MaritimeWorkflowStepperProps {
  currentStepId?: string;
  onStepClick?: (stepId: string) => void;
}

export function MaritimeWorkflowStepper({ currentStepId = 'inquiry', onStepClick }: MaritimeWorkflowStepperProps) {
  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStepId);

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '14px 16px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#170e5e', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '6px' }}>
            مسار العمل المؤتمت (Automated Pipeline)
          </span>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            دورة الشحن المتكاملة من طلب العميل حتى التسليم النهائي بالمستودع واسترداد التأمين
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '8px',
          alignItems: 'stretch',
        }}
      >
        {STEPS.map((step, idx) => {
          const isPassed = currentStepIndex > idx;
          const isCurrent = currentStepIndex === idx;
          const Icon = step.icon;

          let borderColor = '#e2e8f0';
          let bgColor = '#f8fafc';
          let titleColor = '#475569';
          let badgeBg = '#f1f5f9';
          let badgeColor = '#64748b';

          if (isCurrent) {
            borderColor = '#170e5e';
            bgColor = '#f8faff';
            titleColor = '#170e5e';
            badgeBg = '#170e5e';
            badgeColor = '#ffffff';
          } else if (isPassed) {
            borderColor = '#86efac';
            bgColor = '#f0fdf4';
            titleColor = '#166534';
            badgeBg = '#16a34a';
            badgeColor = '#ffffff';
          }

          return (
            <div
              key={step.id}
              onClick={() => onStepClick && onStepClick(step.id)}
              style={{
                border: `1px solid ${borderColor}`,
                background: bgColor,
                borderRadius: '8px',
                padding: '10px 12px',
                cursor: onStepClick ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: badgeBg,
                    color: badgeColor,
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isPassed ? '✓' : step.number}
                </span>
                <div style={{ color: isCurrent ? '#170e5e' : isPassed ? '#16a34a' : '#94a3b8' }}>
                  <Icon size={16} />
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: titleColor, marginBottom: '2px' }}>
                  {step.title}
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#64748b', lineHeight: 1.3 }}>
                  {step.subtitle}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
