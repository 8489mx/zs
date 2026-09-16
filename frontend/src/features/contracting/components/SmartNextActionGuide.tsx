import React from 'react';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import type { ContractingPhaseKey } from './ProjectLifecycleStepper';
import type { ContractingProject } from '../contracting.types';

interface SmartNextActionGuideProps {
  phase: ContractingPhaseKey;
  activeProject: ContractingProject | null;
  actions: {
    openTenderEstimator?: () => void;
    openCreateProject?: () => void;
    openLicensesModal?: () => void;
    openMobilizationModal?: () => void;
    openScheduleGenerator?: () => void;
    openCreateTask?: () => void;
    openMrpModal?: () => void;
    openCreateRequisition?: () => void;
    openCreateSubcontract?: () => void;
    openMaterialSubmittalsModal?: () => void;
    openPriceEscalationsModal?: () => void;
    openCreateDailyLog?: () => void;
    openLaborAttendance?: () => void;
    openEquipmentTracking?: () => void;
    openFuelLogsModal?: () => void;
    openPettyCash?: () => void;
    openCreateRfi?: () => void;
    openWorkInspection?: () => void;
    openCreateIpc?: () => void;
    openCreateChangeOrder?: () => void;
    openEvmMetricsModal?: () => void;
    openBackChargesModal?: () => void;
    openRetentionLedger?: () => void;
    openSnagList?: () => void;
    openHandoverModal?: () => void;
    openProfitabilityModal?: () => void;
    openCostSnapshotModal?: () => void;
    openBoqItemModal?: () => void;
  };
}

interface PhaseGuideContent {
  stepBadge: string;
  headline: string;
  guidanceText: string;
  quickActionButtons: {
    label: string;
    actionKey: keyof SmartNextActionGuideProps['actions'];
    primary?: boolean;
    icon: keyof typeof AppIcons;
  }[];
}

const PHASE_GUIDES: Record<ContractingPhaseKey, PhaseGuideContent> = {
  projects: {
    stepBadge: 'المركز الرئيسي للمشاريع',
    headline: 'نظرة شمولية على محفظة المشروعات والتدفقات النقدية الإنشائية',
    guidanceText:
      'يمكنك هنا متابعة مؤشرات القيمة التعاقدية الكلية، نسب الإنجاز المالي والفعلي، أو البدء فوراً في دراسة عطاء جديد أو تأسيس مشروع إنشائي معتمد.',
    quickActionButtons: [
      { label: 'دراسة عطاء جديد', actionKey: 'openTenderEstimator', primary: true, icon: 'Sliders' },
      { label: 'تأسيس مشروع إنشائي', actionKey: 'openCreateProject', primary: false, icon: 'Plus' },
    ],
  },
  tender: {
    stepBadge: 'المرحلة 1 من 7',
    headline: 'دراسة وتسعير العطاءات والمشروعات المحتملة (Bidding & Estimating)',
    guidanceText:
      'الخطوة الأولى قبل التعاقد: حصر الكميات من أبعاد اللوحات المعمارية والإنشائية، تفكيك الكود الهندسي (BOM) للخامات والمصنعيات، وضبط هوامش الربح وإصدار عرض السعر للمالك.',
    quickActionButtons: [
      { label: 'حاسبة الحصر وتفكيك الأسعار (BOM)', actionKey: 'openTenderEstimator', primary: true, icon: 'Sliders' },
    ],
  },
  boq: {
    stepBadge: 'المرحلة 2 من 7',
    headline: 'المقايسة التعاقدية وميزانية التكاليف المستهدفة (SOV & Target Budget)',
    guidanceText:
      'تثبيت بنود جدول الكميات التعاقدي (Schedule of Values) مع المالك، وتجميد ميزانية التكلفة التشغيلية (Cost Baseline) للبدء في ضبط تكاليف المواد والمصنعيات.',
    quickActionButtons: [
      { label: 'إضافة بند مقايسة', actionKey: 'openBoqItemModal', primary: true, icon: 'Plus' },
      { label: 'ميزانية التكاليف والمخطط', actionKey: 'openCostSnapshotModal', primary: false, icon: 'FileText' },
      { label: 'تحليل ربحية المقايسة', actionKey: 'openProfitabilityModal', primary: false, icon: 'Layers' },
    ],
  },
  planning: {
    stepBadge: 'المرحلة 3 من 7',
    headline: 'التجهيز الميداني والجدول الزمني الإنشائي (Mobilization & Schedule)',
    guidanceText:
      'قبل دخول المعدات للموقع: مراجعة تراخيص البناء والموافقات الحكومية، توثيق تجهيز الموقع والكرفانات والمرافق، وتوليد الجدول الزمني والمسار الحرج (Gantt Chart).',
    quickActionButtons: [
      { label: 'الجدول الزمني والمسار الحرج', actionKey: 'openScheduleGenerator', primary: true, icon: 'Calendar' },
      { label: 'التراخيص والموافقات', actionKey: 'openLicensesModal', primary: false, icon: 'CheckShield' },
      { label: 'تجهيزات الموقع (Mobilization)', actionKey: 'openMobilizationModal', primary: false, icon: 'Tool' },
    ],
  },
  procurement: {
    stepBadge: 'المرحلة 4 من 7',
    headline: 'التوريدات والمشتريات والاعتمادات (Procurement & Submittals)',
    guidanceText:
      'إصدار خطة الاحتياجات من المواد (MRP)، إبرام عقود مقاولي الباطن، تقديم اعتمادات المواد والمخططات التنفيذية (MAR/Shop Drawings) للاستشاري، وحساب مطالبات فروق الأسعار.',
    quickActionButtons: [
      { label: 'طلب توريد مواد', actionKey: 'openCreateRequisition', primary: true, icon: 'Truck' },
      { label: 'اعتماد مواد ومخططات (MAR)', actionKey: 'openMaterialSubmittalsModal', primary: false, icon: 'FileCheck' },
      { label: 'فروق أسعار الخامات', actionKey: 'openPriceEscalationsModal', primary: false, icon: 'TrendingUp' },
      { label: 'عقد مقاول باطن', actionKey: 'openCreateSubcontract', primary: false, icon: 'Users' },
      { label: 'خطة الاحتياجات (MRP)', actionKey: 'openMrpModal', primary: false, icon: 'Package' },
    ],
  },
  field: {
    stepBadge: 'المرحلة 5 من 7',
    headline: 'التنفيذ الميداني وضبط الجودة والسلامة (Field Execution & Quality)',
    guidanceText:
      'توثيق أحداث اليوميات وحالة الطقس، متابعة حضور العمالة، تتبع استهلاك وقود وساعات تشغيل المعدات، رفع طلبات الاستفسار الفني (RFI)، وطلبات فحص واستلام الأعمال (WIR).',
    quickActionButtons: [
      { label: 'تسجيل يومية', actionKey: 'openCreateDailyLog', primary: true, icon: 'FileText' },
      { label: 'وقود وتشغيل المعدات', actionKey: 'openFuelLogsModal', primary: false, icon: 'Truck' },
      { label: 'استلام أعمال (WIR)', actionKey: 'openWorkInspection', primary: false, icon: 'FileCheck' },
      { label: 'استفسار فني (RFI)', actionKey: 'openCreateRfi', primary: false, icon: 'Info' },
      { label: 'حضور العمالة', actionKey: 'openLaborAttendance', primary: false, icon: 'Users' },
      { label: 'تتبع المعدات', actionKey: 'openEquipmentTracking', primary: false, icon: 'Tool' },
      { label: 'العهدة النقدية', actionKey: 'openPettyCash', primary: false, icon: 'Receipt' },
    ],
  },
  financials: {
    stepBadge: 'المرحلة 6 من 7',
    headline: 'المستخلصات والقيمة المكتسبة والخصومات (Billing, EVM & Deductions)',
    guidanceText:
      'إصدار مستخلصات الدفع الدورية للمالك (AIA G702/G703)، تحليل مؤشرات القيمة المكتسبة ومنحنى S-Curve، وتطبيق خصومات مقاولي الباطن والأوامر التغييرية.',
    quickActionButtons: [
      { label: 'إصدار مستخلص (IPC)', actionKey: 'openCreateIpc', primary: true, icon: 'Receipt' },
      { label: 'القيمة المكتسبة (EVM)', actionKey: 'openEvmMetricsModal', primary: false, icon: 'TrendingUp' },
      { label: 'خصومات مقاولي الباطن', actionKey: 'openBackChargesModal', primary: false, icon: 'Receipt' },
      { label: 'أمر تغييري جديد', actionKey: 'openCreateChangeOrder', primary: false, icon: 'Plus' },
      { label: 'دفتر ضمان حسن التنفيذ', actionKey: 'openRetentionLedger', primary: false, icon: 'CheckShield' },
    ],
  },
  closeout: {
    stepBadge: 'المرحلة 7 من 7',
    headline: 'التسليم والإغلاق وحساب الأرباح الختامية (Snag List & Handover)',
    guidanceText:
      'المرحلة النهائية للمشروع: فحص ومعالجة قائمة الملاحظات والعيوب (Snag List)، تحرير محاضر الاستلام الابتدائي والنهائي، والإفراج عن ضمان حسن التنفيذ وتصفية أرباح المشروع.',
    quickActionButtons: [
      { label: 'قائمة الملاحظات (Snag List)', actionKey: 'openSnagList', primary: true, icon: 'FileCheck' },
      { label: 'محاضر الاستلام والإنهاء', actionKey: 'openHandoverModal', primary: false, icon: 'CheckCircle' },
      { label: 'تحليل الأرباح الختامي', actionKey: 'openProfitabilityModal', primary: false, icon: 'Layers' },
    ],
  },
};

export function SmartNextActionGuide({ phase, activeProject, actions }: SmartNextActionGuideProps) {
  const guide = PHASE_GUIDES[phase] || PHASE_GUIDES.projects;

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRight: '4px solid #170e5e',
        borderRadius: '10px',
        padding: '14px 18px',
        marginBottom: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
      }}
      dir="rtl"
    >
      {/* رأس البطاقة والشارة */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: 'var(--font-micro)',
              fontWeight: 800,
              background: '#170e5e',
              color: '#ffffff',
            }}
          >
            {guide.stepBadge}
          </span>
          <h3 style={{ margin: 0, fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#0f172a' }}>
            {guide.headline}
          </h3>
        </div>

        {activeProject && (
          <span style={{ fontSize: 'var(--font-micro)', fontWeight: 600, color: '#64748b' }}>
            مشروع: {activeProject.name}
          </span>
        )}
      </div>

      {/* نص الإرشاد الواضح البسيط */}
      <p style={{ margin: 0, fontSize: 'var(--font-body)', color: '#475569', lineHeight: 1.55 }}>
        {guide.guidanceText}
      </p>

      {/* أزرار الإجراءات السريعة الفورية - سطر واحد حصرياً */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexWrap: 'nowrap',
          marginTop: '4px',
          paddingTop: '8px',
          borderTop: '1px solid #f1f5f9',
          overflowX: 'auto',
          width: '100%',
          scrollbarWidth: 'thin',
        }}
      >
        <span
          style={{
            fontSize: 'var(--font-table-head)',
            fontWeight: 700,
            color: '#334155',
            flexShrink: 0,
            marginLeft: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          الإجراءات المباشرة:
        </span>
        {guide.quickActionButtons.map((btn, idx) => {
          const handler = actions[btn.actionKey];
          if (!handler) return null;
          const IconComp = (AppIcons[btn.icon] as React.ElementType) || AppIcons.Plus;

          return (
            <button
              key={idx}
              type="button"
              onClick={handler}
              style={{
                height: '28px',
                padding: '0 10px',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '11.5px',
                border: btn.primary ? 'none' : '1px solid #cbd5e1',
                background: btn.primary ? '#170e5e' : '#ffffff',
                color: btn.primary ? '#ffffff' : '#334155',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <IconComp size={13} />
              <span>{btn.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
