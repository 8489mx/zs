import { AppIcons } from '@/shared/components/icons/AppIcons';
import type { ContractingProject } from '../contracting.types';

export type ContractingPhaseKey =
  | 'projects'
  | 'tender'
  | 'boq'
  | 'planning'
  | 'procurement'
  | 'field'
  | 'financials'
  | 'closeout';

export interface PhaseDefinition {
  key: ContractingPhaseKey;
  stepNumber: number;
  title: string;
  subtitle: string;
  icon: keyof typeof AppIcons;
}

export const CONTRACTING_PHASES: PhaseDefinition[] = [
  {
    key: 'tender',
    stepNumber: 1,
    title: 'التسعير والعطاء',
    subtitle: 'حصر CAD وتفكيك الأسعار',
    icon: 'Sliders',
  },
  {
    key: 'boq',
    stepNumber: 2,
    title: 'المقايسة والميزانية',
    subtitle: 'بنود التعاقد وميزانية التكلفة',
    icon: 'FileText',
  },
  {
    key: 'planning',
    stepNumber: 3,
    title: 'التجهيز والجدول',
    subtitle: 'التراخيص ومخطط جانت الإنشائي',
    icon: 'Calendar',
  },
  {
    key: 'procurement',
    stepNumber: 4,
    title: 'التوريد والمقاولين',
    subtitle: 'طلبات الشراء وعقود الباطن',
    icon: 'Truck',
  },
  {
    key: 'field',
    stepNumber: 5,
    title: 'الميدان وضبط الجودة',
    subtitle: 'اليوميات واستلام الأعمال WIR',
    icon: 'Tool',
  },
  {
    key: 'financials',
    stepNumber: 6,
    title: 'المستخلصات والمالية',
    subtitle: 'مستخلصات AIA وأوامر التغيير',
    icon: 'Receipt',
  },
  {
    key: 'closeout',
    stepNumber: 7,
    title: 'التسليم والإغلاق',
    subtitle: 'فحص العيوب ومحاضر التسليم',
    icon: 'CheckShield',
  },
];

interface ProjectLifecycleStepperProps {
  currentPhase: ContractingPhaseKey;
  onPhaseSelect: (phaseKey: ContractingPhaseKey) => void;
  activeProject: ContractingProject | null;
  totalProjectsCount: number;
  onOpenTenderEstimator?: () => void;
}

export function ProjectLifecycleStepper({
  currentPhase,
  onPhaseSelect,
  activeProject,
  totalProjectsCount,
  onOpenTenderEstimator,
}: ProjectLifecycleStepperProps) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '10px 14px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        width: '100%',
        boxSizing: 'border-box',
      }}
      dir="rtl"
    >
      {/* شريط التحكم العلوي: تبويب سجل المشاريع الشامل + مؤشر حالة المشروع المحدد */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '10px',
          marginBottom: '10px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => onPhaseSelect('projects')}
            style={{
              height: '34px',
              padding: '0 14px',
              borderRadius: '8px',
              border: currentPhase === 'projects' ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
              background: currentPhase === 'projects' ? '#170e5e' : '#f8fafc',
              color: currentPhase === 'projects' ? '#ffffff' : '#334155',
              fontWeight: 700,
              fontSize: 'var(--font-table-head)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <AppIcons.Building size={15} />
            <span>سجل ومؤشرات كافة المشاريع ({totalProjectsCount})</span>
          </button>

          <span style={{ color: '#cbd5e1', fontSize: '14px' }}>|</span>

          <span style={{ fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#475569' }}>
            مسار دورة حياة المشروع التنفيذية (من العطاء حتى التسليم النهائي):
          </span>
        </div>

        {activeProject && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: 'var(--font-badge)',
                fontWeight: 700,
                color: '#1e40af',
                background: '#eff6ff',
                padding: '3px 10px',
                borderRadius: '6px',
                border: '1px solid #dbeafe',
              }}
            >
              مشروع محدد: [{activeProject.code}] {activeProject.name}
            </span>
          </div>
        )}
      </div>

      {/* مسار الخطوات السبع المتسلسلة (7-Phase Workflow Pipeline) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px',
          alignItems: 'stretch',
        }}
      >
        {CONTRACTING_PHASES.map((phase) => {
          const isActive = currentPhase === phase.key;

          return (
            <button
              key={phase.key}
              type="button"
              onClick={() => {
                if (phase.key === 'tender' && onOpenTenderEstimator) {
                  onOpenTenderEstimator();
                } else {
                  onPhaseSelect(phase.key);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                borderRadius: '8px',
                border: isActive ? '1.5px solid #170e5e' : '1px solid #e2e8f0',
                background: isActive ? '#170e5e' : '#ffffff',
                color: isActive ? '#ffffff' : '#1e293b',
                cursor: 'pointer',
                textAlign: 'right',
                transition: 'all 0.15s ease',
                position: 'relative',
                boxShadow: isActive ? '0 2px 6px rgba(23, 14, 94, 0.15)' : 'none',
              }}
              title={`${phase.title}: ${phase.subtitle}`}
            >
              {/* رقم الخطوة الدائري */}
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: isActive ? '#ffffff' : '#f1f5f9',
                  color: isActive ? '#170e5e' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 'var(--font-table-head)',
                  flexShrink: 0,
                  border: isActive ? 'none' : '1px solid #cbd5e1',
                }}
              >
                {phase.stepNumber}
              </div>

              {/* عنوان وتفاصيل المرحلة */}
              <div style={{ overflow: 'hidden', minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 'var(--font-table-head)',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.25,
                    color: isActive ? '#ffffff' : '#0f172a',
                  }}
                >
                  {phase.title}
                </div>
                <div
                  style={{
                    fontSize: 'var(--font-micro)',
                    fontWeight: 500,
                    color: isActive ? '#cbd5e1' : '#64748b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginTop: '2px',
                  }}
                >
                  {phase.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
