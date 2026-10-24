import { useTranslation } from 'react-i18next';
import { useState, useEffect, type FC } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { CustomSelect } from '@/shared/ui/custom-select';
import { formatCurrency } from '@/lib/format';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';
import { toast, systemConfirm } from '@/shared/components/system-alert';
import {
  CheckCircleIcon,
  FileTextIcon,
} from '@/shared/components/icons/AppIcons';
import {
  recruitmentAtsApi,
  type ApplicantRecord,
} from '../../api/recruitment-ats.api';

interface ApplicantDetailsModalProps {
  open: boolean;
  onClose: () => void;
  applicant: ApplicantRecord | null;
  onUpdated: () => void;
}

export const ApplicantDetailsModal: FC<ApplicantDetailsModalProps> = ({
  open,
  onClose,
  applicant,
  onUpdated,
}) => {
  const { t } = useTranslation();
  const canHireWithSalary = useHasAnyPermission(['hrSalaryManage']);
  const [currentStage, setCurrentStage] = useState<string>(applicant?.stage || 'new');
  const [notes, setNotes] = useState(applicant?.interview_notes || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isHiring, setIsHiring] = useState(false);
  const [hireSalary, setHireSalary] = useState(String(applicant?.expected_salary || ''));

  useEffect(() => {
    if (applicant) {
      setCurrentStage(applicant.stage);
      setNotes(applicant.interview_notes || '');
      setHireSalary(String(applicant.expected_salary || ''));
    }
  }, [applicant]);

  if (!applicant) return null;

  const stageOptions = [
    { value: 'new', label: '1. متقدم جديد (New)' },
    { value: 'screening', label: '2. فحص السيرة الذاتية (Screening)' },
    { value: 'interview', label: '3. المقابلة الشخصية (Interview)' },
    { value: 'offer', label: '4. تقديم عرض العمل (Job Offer)' },
    ...(applicant.stage === 'hired' ? [{ value: 'hired', label: '5. تم التوظيف والتعيين (Hired)' }] : []),
    { value: 'rejected', label: 'مرفوض / غير مؤهل (Rejected)' },
  ];

  const handleStageSave = async () => {
    setIsUpdating(true);
    try {
      await recruitmentAtsApi.updateStage(applicant.id, currentStage as any, notes.trim() || undefined);
      toast.success('تم تحديث مرحلة وملاحظات المرشح بنجاح');
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحديث المرحلة');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleHireToEmployee = async () => {
    const salary = Number(hireSalary);
    if (!Number.isFinite(salary) || salary <= 0) {
      toast.error('أدخل راتبًا أساسيًا أكبر من صفر قبل اعتماد التعيين.');
      return;
    }
    const confirmed = await systemConfirm({
      title: 'تحويل المرشح إلى موظف رسمي (Hire to Employee)',
      message: `هل أنت متأكد من تعيين المرشح "${applicant.full_name}" رسمياً؟ سيتم إنشاء ملف موظف معتمد تلقائياً في دليل الموظفين براتب أساسي قدره ${formatCurrency(salary)} وعقد نشط، وخصم شاغر من الوظيفة.`,
      confirmText: 'تأكيد التعيين الفوري',
      cancelText: 'إلغاء',
    });
    if (!confirmed) return;

    setIsHiring(true);
    try {
      const res = await recruitmentAtsApi.hire(applicant.id, salary);
      toast.success(`تم بنجاح تعيين المرشح كموظف رسمي في المنظومة (كود الموظف #${res.employeeId})`);
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحويل المرشح لموظف');
    } finally {
      setIsHiring(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={`ملف المرشح: ${applicant.full_name}`}
      subtitle={`رقم المتقدم: ${applicant.applicant_number} ${applicant.job_title ? `| الوظيفة: ${applicant.job_title}` : ''}`}
      size="md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        {/* Quick Profile Banner */}
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>{t('hr.recruitment.applicant_details_modal.s0', "رقم الهاتف / الواتساب")}</div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>{applicant.phone}</div>
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>{t('hr.recruitment.applicant_details_modal.s1', "البريد الإلكتروني")}</div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>{applicant.email || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>{t('hr.recruitment.applicant_details_modal.s2', "الراتب المتوقع")}</div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#16a34a' }}>
              {applicant.expected_salary ? formatCurrency(applicant.expected_salary) : '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>{t('hr.recruitment.applicant_details_modal.s3', "سنوات الخبرة")}</div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>{applicant.experience_years} {t('hr.recruitment.applicant_details_modal.s4', "سنة")}</div>
          </div>
        </div>

        {/* Talent Pool & CV info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{t('hr.recruitment.applicant_details_modal.s5', "تصنيف الموهبة:")} </span>
            <span style={{ fontSize: '12.5px', fontWeight: 600, background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '4px' }}>
              {applicant.talent_pool_tag || t('hr.recruitment.applicant_details_modal.s6', "عام")}
            </span>
          </div>
          {applicant.cv_url && (
            <a
              href={applicant.cv_url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                fontWeight: 600,
                color: '#170e5e',
                textDecoration: 'none',
                background: '#ffffff',
              }}
            >
              <FileTextIcon size={14} />
              {t('hr.recruitment.applicant_details_modal.s7', "معاينة السيرة الذاتية (CV)")}
            </a>
          )}
        </div>

        {/* Stage and Pipeline Advancement */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', background: '#ffffff' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>
            {t('hr.recruitment.applicant_details_modal.s8', "تحديث مرحلة التوظيف (Pipeline Stage)")}
          </h4>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <CustomSelect
                value={currentStage}
                onChange={setCurrentStage}
                options={stageOptions}
              />
            </div>
            <button
              onClick={handleStageSave}
              disabled={isUpdating}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#170e5e',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isUpdating ? t('hr.recruitment.applicant_details_modal.s9', "جاري الحفظ...") : t('hr.recruitment.applicant_details_modal.s10', "تحديث المرحلة")}
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
            {t('hr.recruitment.applicant_details_modal.s11', "ملاحظات المقابلة والتقييم الداخلي")}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={t('hr.recruitment.applicant_details_modal.s12', "ملاحظات لجنة المقابلة، نقاط القوة والضعف...")}
            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical' }}
          />
        </div>

        {applicant.stage !== 'hired' && canHireWithSalary && (
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600 }}>
            الراتب الأساسي المعتمد عند التعيين
            <input type="number" min="0.01" step="0.01" value={hireSalary}
              onChange={(event) => setHireSalary(event.target.value)}
              style={{ display: 'block', width: '100%', marginTop: '5px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
          </label>
        )}
        {/* 1-Click Hire CTA Banner */}
        <div
          style={{
            background: applicant.stage === 'hired' ? '#f0fdf4' : '#faf5ff',
            border: `1px solid ${applicant.stage === 'hired' ? '#86efac' : '#d8b4fe'}`,
            borderRadius: '10px',
            padding: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: '13.5px', color: applicant.stage === 'hired' ? '#15803d' : '#6b21a8' }}>
              {applicant.stage === 'hired' ? t('hr.recruitment.applicant_details_modal.s13', "تم تعيين المرشح كموظف رسمي في الشركة") : t('hr.recruitment.applicant_details_modal.s14', "اعتماد التعيين وتحويل المرشح إلى موظف")}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              {applicant.stage === 'hired'
                ? `معرف ملف الموظف في النظام: #${applicant.hired_employee_id}`
                : t('hr.recruitment.applicant_details_modal.s15', "إنشاء ملف موظف رسمي آلياً بنقرة واحدة ونقل بياناته إلى قسم الموارد البشرية")}
            </div>
          </div>

          {applicant.stage !== 'hired' && canHireWithSalary && (
            <button
              onClick={handleHireToEmployee}
              disabled={isHiring}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                borderRadius: '8px',
                border: 'none',
                background: '#16a34a',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <CheckCircleIcon size={16} />
              {isHiring ? t('hr.recruitment.applicant_details_modal.s16', "جاري التحويل...") : t('hr.recruitment.applicant_details_modal.s17', "تحويل إلى موظف رسمي (Hire)")}
            </button>
          )}
        </div>
      </div>
    </StandardDialog>
  );
};
