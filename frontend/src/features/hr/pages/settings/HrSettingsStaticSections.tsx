import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useHrPayrollPolicies, useHrMutations, useHrHolidays } from '@/features/hr/hooks/useHr';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { getErrorMessage } from '@/lib/errors';
import { systemAlert } from '@/shared/components/system-alert';
import {
  FileTextIcon,
  ClockIcon,
  BanknotesIcon,
  CalendarDaysIcon,
} from '@/features/hr/components/HrIcons';

type NavigateTo = (path: string) => void;

const STANDARD_DOCUMENT_TYPES = [
  { name: 'بطاقة الرقم القومي', validityDays: '7 سنوات', required: true, note: 'إلزامية لجميع الموظفين' },
  { name: 'شهادة المؤهل الدراسي', validityDays: 'دائمة', required: true, note: 'مطلوبة لإثبات التخصص' },
  { name: 'صحيفة الحالة الجنائية (فيش)', validityDays: '3 شهور', required: true, note: 'تُجدد عند التعيين' },
  { name: 'شهادة المعاملة العسكرية', validityDays: 'دائمة / مؤقتة', required: false, note: 'للذكور فقط' },
  { name: 'شهادة الميلاد المميكنة', validityDays: 'دائمة', required: true, note: 'مطلوبة للتأمينات' },
  { name: 'عقد العمل الموقع', validityDays: 'حسب مدة العقد', required: true, note: 'ساري بموجب مدة التعيين' },
  { name: 'كعب العمل والتأمينات', validityDays: 'عند التعيين', required: false, note: 'للتسجيل بالتأمينات' },
];

export function HrSettingsDocumentsSection({ navigate }: { navigate: NavigateTo }) {
  const { t } = useTranslation();
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <div>
          <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', color: '#0f172a' }}>
            <FileTextIcon size={18} style={{ color: 'var(--primary, #170c5c)' }} />
            <span>{t('hr.settings.hr_settings_static_sections.s0', "سياسات وأنواع مستندات الموظفين")}</span>
          </strong>
          <small style={{ color: '#64748b', fontSize: '0.775rem' }}>{t('hr.settings.hr_settings_static_sections.s1', "المستندات الثبوتية القياسية المعتمدة في ملف كل موظف وتنبيهات انتهاء الصلاحية.")}</small>
        </div>
        <Button type="button" variant="primary" onClick={() => navigate('/hr/documents')} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>
          {t('hr.settings.hr_settings_static_sections.s2', "فتح صفحة المستندات")}
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
          <span style={{ fontSize: '0.725rem', color: '#64748b', display: 'block' }}>{t('hr.settings.hr_settings_static_sections.s3', "المستندات الأساسية")}</span>
          <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{t('hr.settings.hr_settings_static_sections.s4', "7 أنواع معتمدة")}</strong>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
          <span style={{ fontSize: '0.725rem', color: '#64748b', display: 'block' }}>{t('hr.settings.hr_settings_static_sections.s5', "تنبيه قبل الانتهاء")}</span>
          <strong style={{ fontSize: '1rem', color: '#ea580c' }}>{t('hr.settings.hr_settings_static_sections.s6', "30 يوماً")}</strong>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
          <span style={{ fontSize: '0.725rem', color: '#64748b', display: 'block' }}>{t('hr.settings.hr_settings_static_sections.s7', "حالة الربط")}</span>
          <strong style={{ fontSize: '1rem', color: '#166534' }}>{t('hr.settings.hr_settings_static_sections.s8', "مفعل بالملف الشخصي")}</strong>
        </div>
      </div>

      <div>
        <strong style={{ display: 'block', fontSize: '0.85rem', color: '#0f172a', marginBottom: '8px' }}>{t('hr.settings.hr_settings_static_sections.s9', "قائمة المستندات القياسية في النظام")}</strong>
        <DataTable
          rows={STANDARD_DOCUMENT_TYPES}
          rowKey={(row) => row.name}
          density="compact"
          columns={[
            { key: 'name', header: t('hr.settings.hr_settings_static_sections.s10', "نوع المستند"), cell: (row) => row.name },
            { key: 'validity', header: t('hr.settings.hr_settings_static_sections.s11', "الصلاحية القياسية"), cell: (row) => row.validityDays },
            { key: 'required', header: t('hr.settings.hr_settings_static_sections.s12', "الإلزامية"), cell: (row) => row.required ? <span style={{ color: '#166534', fontWeight: 600 }}>{t('hr.settings.hr_settings_static_sections.s13', "إلزامي")}</span> : <span style={{ color: '#64748b' }}>{t('hr.settings.hr_settings_static_sections.s14', "اختياري")}</span> },
            { key: 'note', header: t('hr.settings.hr_settings_static_sections.s15', "ملاحظات"), cell: (row) => row.note },
          ]}
        />
      </div>
    </div>
  );
}

export function HrSettingsAttendanceSection({ navigate }: { navigate: NavigateTo }) {
  const { t } = useTranslation();
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <div>
          <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', color: '#0f172a' }}>
            <ClockIcon size={18} style={{ color: 'var(--primary, #170c5c)' }} />
            <span>{t('hr.settings.hr_settings_static_sections.s16', "سياسات وضوابط الحضور والانصراف")}</span>
          </strong>
          <small style={{ color: '#64748b', fontSize: '0.775rem' }}>{t('hr.settings.hr_settings_static_sections.s17', "إدارة أوقات الورديات، فترات السماح، الاستيراد من البصمة، وقواعد الاحتساب التلقائي.")}</small>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button type="button" variant="primary" onClick={() => navigate('/hr/attendance')} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>
            {t('hr.settings.hr_settings_static_sections.s18', "فتح سجل الحضور")}
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
          <span style={{ fontSize: '0.725rem', color: '#64748b', display: 'block' }}>{t('hr.settings.hr_settings_static_sections.s19', "طريقة التسجيل")}</span>
          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{t('hr.settings.hr_settings_static_sections.s20', "يدوي + استيراد إكسيل")}</strong>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
          <span style={{ fontSize: '0.725rem', color: '#64748b', display: 'block' }}>{t('hr.settings.hr_settings_static_sections.s21', "مراجعة الاستثناءات")}</span>
          <strong style={{ fontSize: '0.95rem', color: '#2563eb' }}>{t('hr.settings.hr_settings_static_sections.s22', "شهرية تلقائية")}</strong>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
          <span style={{ fontSize: '0.725rem', color: '#64748b', display: 'block' }}>{t('hr.settings.hr_settings_static_sections.s23', "احتساب الإضافي")}</span>
          <strong style={{ fontSize: '0.95rem', color: '#166534' }}>{t('hr.settings.hr_settings_static_sections.s24', "مضاعف 1.5x")}</strong>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
          <span style={{ fontSize: '0.725rem', color: '#64748b', display: 'block' }}>{t('hr.settings.hr_settings_static_sections.s25', "فترة السماح الافتراضية")}</span>
          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{t('hr.settings.hr_settings_static_sections.s26', "15 دقيقة")}</strong>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
        <strong style={{ display: 'block', fontSize: '0.85rem', color: '#0f172a', marginBottom: '6px' }}>{t('hr.settings.hr_settings_static_sections.s27', "قواعد الربط مع مسير المرتبات")}</strong>
        <ul style={{ margin: 0, paddingRight: '20px', fontSize: '0.8rem', color: '#475569', lineHeight: 1.6 }}>
          <li>{t('hr.settings.hr_settings_static_sections.s28', "يتم ترحيل ساعات الغياب والتأخير غير المبررة تلقائياً كخصومات عند إنشاء مسير المرتبات الشهري.")}</li>
          <li>{t('hr.settings.hr_settings_static_sections.s29', "الاستثناءات المعتمدة كـ \"إضافي\" يتم إدراج قيمتها في خانة الإضافي بالمسير مباشرة.")}</li>
          <li>{t('hr.settings.hr_settings_static_sections.s30', "يمكن ضبط فترة السماح وسياسة التأخير التصاعدية من تبويب \"المرتبات\" في الإعدادات.")}</li>
        </ul>
      </div>
    </div>
  );
}

export function HrSettingsPayrollSection({ navigate }: { navigate: NavigateTo }) {
  const { t } = useTranslation();
  const policiesQuery = useHrPayrollPolicies();
  const mutations = useHrMutations();
  const [draft, setDraft] = useState({
    workHoursPerDay: '8',
    latenessGracePeriodMinutes: '15',
    latenessPenaltyMultiplier: '0.25',
    absencePenaltyMultiplier: '1',
    overtimeMultiplier: '1.5',
    hrDelayPolicyEnabled: false,
    hrDelayPolicyFirstTimeDeduction: '0.25',
    hrDelayPolicySecondTimeDeduction: '0.5',
    hrDelayPolicyThirdTimeDeduction: '1',
    hrDelayPolicyFourthTimeDeduction: '1',
    hrCommissionType: 'none',
    hrCommissionValue: '0',
    hrCommissionTarget: '0',
    hrSocialInsuranceEnabled: false,
    hrSocialInsuranceEmployeePct: '11',
    hrIncomeTaxEnabled: false,
    taxPersonalExemption: '20000',
    taxBrackets: [{"max":40000,"rate":0},{"max":55000,"rate":10},{"max":70000,"rate":15},{"max":200000,"rate":20},{"max":400000,"rate":22.5},{"max":999999999,"rate":25}],
    insuranceConfig: {"employeePct":11,"employerPct":18.75,"minSalary":2000,"maxSalary":12600},
    hrWeekendDays: 'friday,saturday',
  });

  useEffect(() => {
    if (policiesQuery.data) {
      setDraft({
        workHoursPerDay: String((policiesQuery.data as any).workHoursPerDay ?? '8'),
        latenessGracePeriodMinutes: String((policiesQuery.data as any).latenessGracePeriodMinutes ?? '15'),
        latenessPenaltyMultiplier: String((policiesQuery.data as any).latenessPenaltyMultiplier ?? '0.25'),
        absencePenaltyMultiplier: String((policiesQuery.data as any).absencePenaltyMultiplier ?? '1'),
        overtimeMultiplier: String((policiesQuery.data as any).overtimeMultiplier ?? '1.5'),
        hrDelayPolicyEnabled: (policiesQuery.data as any).hrDelayPolicyEnabled === true,
        hrDelayPolicyFirstTimeDeduction: String((policiesQuery.data as any).hrDelayPolicyFirstTimeDeduction ?? '0.25'),
        hrDelayPolicySecondTimeDeduction: String((policiesQuery.data as any).hrDelayPolicySecondTimeDeduction ?? '0.5'),
        hrDelayPolicyThirdTimeDeduction: String((policiesQuery.data as any).hrDelayPolicyThirdTimeDeduction ?? '1'),
        hrDelayPolicyFourthTimeDeduction: String((policiesQuery.data as any).hrDelayPolicyFourthTimeDeduction ?? '1'),
        hrCommissionType: String((policiesQuery.data as any).hrCommissionType || 'none'),
        hrCommissionValue: String((policiesQuery.data as any).hrCommissionValue || '0'),
        hrCommissionTarget: String((policiesQuery.data as any).hrCommissionTarget || '0'),
        hrSocialInsuranceEnabled: (policiesQuery.data as any).hrSocialInsuranceEnabled === true,
        hrSocialInsuranceEmployeePct: String((policiesQuery.data as any).hrSocialInsuranceEmployeePct ?? '11'),
        hrIncomeTaxEnabled: (policiesQuery.data as any).hrIncomeTaxEnabled === true,
        taxPersonalExemption: String((policiesQuery.data as any).taxPersonalExemption ?? '20000'),
        taxBrackets: (policiesQuery.data as any).taxBrackets || [{"max":40000,"rate":0},{"max":55000,"rate":10},{"max":70000,"rate":15},{"max":200000,"rate":20},{"max":400000,"rate":22.5},{"max":999999999,"rate":25}],
        insuranceConfig: (policiesQuery.data as any).insuranceConfig || {"employeePct":11,"employerPct":18.75,"minSalary":2000,"maxSalary":12600},
        hrWeekendDays: String((policiesQuery.data as any).hrWeekendDays || 'friday,saturday'),
      });
    }
  }, [policiesQuery.data]);

  async function handleSave() {
    await mutations.updatePayrollPolicies.mutateAsync({
      workHoursPerDay: Number(draft.workHoursPerDay) || 8,
      latenessGracePeriodMinutes: Number(draft.latenessGracePeriodMinutes) || 0,
      latenessPenaltyMultiplier: Number(draft.latenessPenaltyMultiplier) || 0,
      absencePenaltyMultiplier: Number(draft.absencePenaltyMultiplier) || 0,
      overtimeMultiplier: Number(draft.overtimeMultiplier) || 0,
      hrDelayPolicyEnabled: draft.hrDelayPolicyEnabled,
      hrDelayPolicyFirstTimeDeduction: Number(draft.hrDelayPolicyFirstTimeDeduction) || 0,
      hrDelayPolicySecondTimeDeduction: Number(draft.hrDelayPolicySecondTimeDeduction) || 0,
      hrDelayPolicyThirdTimeDeduction: Number(draft.hrDelayPolicyThirdTimeDeduction) || 0,
      hrDelayPolicyFourthTimeDeduction: Number(draft.hrDelayPolicyFourthTimeDeduction) || 0,
      hrCommissionType: draft.hrCommissionType,
      hrCommissionValue: Number(draft.hrCommissionValue) || 0,
      hrCommissionTarget: Number(draft.hrCommissionTarget) || 0,
      hrSocialInsuranceEnabled: draft.hrSocialInsuranceEnabled,
      hrSocialInsuranceEmployeePct: Number(draft.hrSocialInsuranceEmployeePct) || 0,
      hrIncomeTaxEnabled: draft.hrIncomeTaxEnabled,
      taxPersonalExemption: Number(draft.taxPersonalExemption) || 0,
      taxBrackets: draft.taxBrackets,
      insuranceConfig: draft.insuranceConfig,
      hrWeekendDays: draft.hrWeekendDays,
    });
  }

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
        <div>
          <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', color: '#0f172a' }}>
            <BanknotesIcon size={18} style={{ color: 'var(--primary, #170c5c)' }} />
            <span>{t('hr.settings.hr_settings_static_sections.s31', "قواعد وسياسات المرتبات والخصومات")}</span>
          </strong>
          <small style={{ color: '#64748b', fontSize: '0.775rem' }}>{t('hr.settings.hr_settings_static_sections.s32', "إعدادات القواعد الحسابية وساعات العمل، التأخير، الضرائب والتأمينات.")}</small>
        </div>
      </div>

      <QueryFeedback isLoading={policiesQuery.isLoading} isError={policiesQuery.isError} error={policiesQuery.error} isEmpty={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Card 1: Work Hours & Multipliers */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
            <strong style={{ display: 'block', fontSize: '0.85rem', color: '#0f172a', marginBottom: '8px' }}>{t('hr.settings.hr_settings_static_sections.s33', "ساعات العمل ومُعاملات الخصم والإضافي")}</strong>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span>{t('hr.settings.hr_settings_static_sections.s34', "ساعات العمل اليومية")}</span>
                <input type="number" step="0.5" value={draft.workHoursPerDay} onChange={(e) => setDraft({ ...draft, workHoursPerDay: e.target.value })} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
              </label>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span>{t('hr.settings.hr_settings_static_sections.s35', "فترة السماح للتأخير (دقائق)")}</span>
                <input type="number" value={draft.latenessGracePeriodMinutes} onChange={(e) => setDraft({ ...draft, latenessGracePeriodMinutes: e.target.value })} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
              </label>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span>{t('hr.settings.hr_settings_static_sections.s36', "مُعامل خصم التأخير")}</span>
                <input type="number" step="0.1" value={draft.latenessPenaltyMultiplier} onChange={(e) => setDraft({ ...draft, latenessPenaltyMultiplier: e.target.value })} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
              </label>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span>{t('hr.settings.hr_settings_static_sections.s37', "مُعامل خصم الغياب")}</span>
                <input type="number" step="0.1" value={draft.absencePenaltyMultiplier} onChange={(e) => setDraft({ ...draft, absencePenaltyMultiplier: e.target.value })} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
              </label>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span>{t('hr.settings.hr_settings_static_sections.s38', "مضاعف الوقت الإضافي")}</span>
                <input type="number" step="0.1" value={draft.overtimeMultiplier} onChange={(e) => setDraft({ ...draft, overtimeMultiplier: e.target.value })} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
              </label>
            </div>
          </div>

          {/* Card 2: Progressive Delay Policy */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
              <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{t('hr.settings.hr_settings_static_sections.s39', "سياسة التأخير التصاعدية")}</strong>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem', fontWeight: 600, color: '#334155', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={draft.hrDelayPolicyEnabled}
                  onChange={(e) => setDraft({ ...draft, hrDelayPolicyEnabled: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', margin: 0, accentColor: 'var(--primary, #170c5c)' }}
                />
                <span>{t('hr.settings.hr_settings_static_sections.s40', "تفعيل سياسة التأخير التصاعدية")}</span>
              </label>
            </div>
            <p className="muted" style={{ margin: '0 0 8px 0', fontSize: '0.75rem' }}>{t('hr.settings.hr_settings_static_sections.s41', "تطبيق خصم تصاعدي لمرات التأخير المتكررة في نفس الشهر بدلاً من الخصم المباشر للدقائق.")}</p>
            {draft.hrDelayPolicyEnabled && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', marginTop: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span>{t('hr.settings.hr_settings_static_sections.s42', "خصم التأخير الأول (يوم)")}</span>
                  <input type="number" step="0.1" value={draft.hrDelayPolicyFirstTimeDeduction} onChange={(e) => setDraft({ ...draft, hrDelayPolicyFirstTimeDeduction: e.target.value })} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                </label>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span>{t('hr.settings.hr_settings_static_sections.s43', "خصم التأخير الثاني")}</span>
                  <input type="number" step="0.1" value={draft.hrDelayPolicySecondTimeDeduction} onChange={(e) => setDraft({ ...draft, hrDelayPolicySecondTimeDeduction: e.target.value })} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                </label>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span>{t('hr.settings.hr_settings_static_sections.s44', "خصم التأخير الثالث")}</span>
                  <input type="number" step="0.1" value={draft.hrDelayPolicyThirdTimeDeduction} onChange={(e) => setDraft({ ...draft, hrDelayPolicyThirdTimeDeduction: e.target.value })} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                </label>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span>{t('hr.settings.hr_settings_static_sections.s45', "خصم التأخير الرابع فأكثر")}</span>
                  <input type="number" step="0.1" value={draft.hrDelayPolicyFourthTimeDeduction} onChange={(e) => setDraft({ ...draft, hrDelayPolicyFourthTimeDeduction: e.target.value })} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                </label>
              </div>
            )}
          </div>

          {/* Card 3: Tax, Insurance & Weekend Days */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
            <strong style={{ display: 'block', fontSize: '0.85rem', color: '#0f172a', marginBottom: '10px' }}>{t('hr.settings.hr_settings_static_sections.s46', "الضرائب، التأمينات، والراحة الأسبوعية")}</strong>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem', fontWeight: 600, color: '#334155', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={draft.hrSocialInsuranceEnabled}
                  onChange={(e) => setDraft({ ...draft, hrSocialInsuranceEnabled: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', margin: 0, accentColor: 'var(--primary, #170c5c)' }}
                />
                <span>{t('hr.settings.hr_settings_static_sections.s47', "استقطاع التأمينات الاجتماعية")}</span>
              </label>

              {draft.hrSocialInsuranceEnabled && (
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span>{t('hr.settings.hr_settings_static_sections.s48', "حصة الموظف (%):")}</span>
                  <input type="number" step="0.1" value={draft.hrSocialInsuranceEmployeePct} onChange={(e) => setDraft({ ...draft, hrSocialInsuranceEmployeePct: e.target.value })} style={{ width: '70px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }} />
                </label>
              )}

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem', fontWeight: 600, color: '#334155', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={draft.hrIncomeTaxEnabled}
                  onChange={(e) => setDraft({ ...draft, hrIncomeTaxEnabled: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', margin: 0, accentColor: 'var(--primary, #170c5c)' }}
                />
                <span>{t('hr.settings.hr_settings_static_sections.s49', "تفعيل ضريبة كسب العمل")}</span>
              </label>

              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '6px', marginRight: 'auto' }}>
                <span>{t('hr.settings.hr_settings_static_sections.s50', "أيام الراحة الأسبوعية:")}</span>
                <input type="text" value={draft.hrWeekendDays} onChange={(e) => setDraft({ ...draft, hrWeekendDays: e.target.value })} placeholder="friday,saturday" dir="ltr" style={{ width: '150px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }} />
              </label>
            </div>
          </div>

          <div className="compact-actions" style={{ display: 'flex', gap: 8, marginTop: '4px' }}>
            <Button type="button" variant="primary" onClick={() => void handleSave()} disabled={mutations.updatePayrollPolicies.isPending} style={{ padding: '4px 14px', fontSize: '0.8rem' }}>
              {mutations.updatePayrollPolicies.isPending ? t('hr.settings.hr_settings_static_sections.s51', "جاري الحفظ...") : t('hr.settings.hr_settings_static_sections.s52', "حفظ سياسات المرتبات")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/hr/payroll')} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>{t('hr.settings.hr_settings_static_sections.s53', "فتح مسير المرتبات")}</Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/hr/loans')} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>{t('hr.settings.hr_settings_static_sections.s54', "فتح السلف")}</Button>
          </div>
        </div>
      </QueryFeedback>
    </div>
  );
}

export function HrSettingsHolidaysSection() {
  const { t } = useTranslation();
  const holidaysQuery = useHrHolidays({ page: 1, pageSize: 200 });
  const mutations = useHrMutations();
  const [draft, setDraft] = useState({ name: '', startDate: '', endDate: '' });
  const [error, setError] = useState('');

  const holidays = (holidaysQuery.data as any)?.rows || [];

  async function handleSave() {
    const name = draft.name.trim();
    if (!name || !draft.startDate || !draft.endDate) {
      setError('الرجاء تعبئة جميع الحقول.');
      return;
    }
    setError('');
    try {
      await mutations.saveHoliday.mutateAsync({ payload: { name, startDate: draft.startDate, endDate: draft.endDate } });
      setDraft({ name: '', startDate: '', endDate: '' });
    } catch (e) {
      setError(getErrorMessage(e, 'تعذر حفظ العطلة.'));
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('هل أنت متأكد من حذف هذه العطلة؟')) return;
    try {
      await mutations.deleteHoliday.mutateAsync(id);
    } catch (e) {
      systemAlert(getErrorMessage(e, 'تعذر حذف العطلة.'));
    }
  }

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
        <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', color: '#0f172a' }}>
          <CalendarDaysIcon size={18} style={{ color: 'var(--primary, #170c5c)' }} />
          <span>{t('hr.settings.hr_settings_static_sections.s55', "العطلات الرسمية والإجازات العامة")}</span>
        </strong>
        <small style={{ color: '#64748b', fontSize: '0.775rem' }}>{t('hr.settings.hr_settings_static_sections.s56', "إدارة أيام العطلات الرسمية التي لا يُحتسب فيها غياب للموظفين.")}</small>
      </div>

      <QueryFeedback isLoading={holidaysQuery.isLoading} isError={holidaysQuery.isError} error={holidaysQuery.error} isEmpty={false}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <div><label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.settings.hr_settings_static_sections.s57', "اسم العطلة")}</label><input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={t('hr.settings.hr_settings_static_sections.s58', "مثال: عيد الفطر")} style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} /></div>
          <div><label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.settings.hr_settings_static_sections.s59', "من تاريخ")}</label><input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} /></div>
          <div><label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.settings.hr_settings_static_sections.s60', "إلى تاريخ")}</label><input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} /></div>
        </div>
        {error && <div style={{ color: '#dc2626', fontSize: '0.8rem' }}>{error}</div>}
        <div>
          <Button type="button" onClick={() => void handleSave()} disabled={mutations.saveHoliday.isPending} style={{ padding: '4px 14px', fontSize: '0.8rem' }}>
            {mutations.saveHoliday.isPending ? t('hr.settings.hr_settings_static_sections.s61', "جاري الحفظ...") : t('hr.settings.hr_settings_static_sections.s62', "حفظ العطلة")}
          </Button>
        </div>
        
        {holidays.length > 0 ? (
          <DataTable 
            rows={holidays} 
            rowKey={(row) => String(row.id)} 
            density="compact" 
            columns={[
              { key: 'name', header: t('hr.settings.hr_settings_static_sections.s63', "اسم العطلة"), cell: (row: any) => row.name },
              { key: 'startDate', header: t('hr.settings.hr_settings_static_sections.s64', "من تاريخ"), cell: (row: any) => row.startDate },
              { key: 'endDate', header: t('hr.settings.hr_settings_static_sections.s65', "إلى تاريخ"), cell: (row: any) => row.endDate },
              { key: 'actions', header: '', cell: (row: any) => (
                <Button type="button" variant="danger" onClick={() => void handleDelete(row.id)} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                  {t('hr.settings.hr_settings_static_sections.s66', "حذف")}
                </Button>
              )}
            ]}
          />
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: '0.825rem' }}>{t('hr.settings.hr_settings_static_sections.s67', "لا توجد عطلات مسجلة.")}</p>
        )}
      </QueryFeedback>
    </div>
  );
}

export function HrSettingsOperationalNote() {
  return null;
}


