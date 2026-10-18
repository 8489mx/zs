import { useTranslation } from 'react-i18next';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';

type MasterKind = 'departments' | 'job-titles' | 'positions';

interface EmployeeQuickSetupCardProps {
  missingSetup: boolean;
  quickDepartmentName: string;
  quickJobTitleName: string;
  quickPositionName?: string;
  setupError: string;
  setupSuccess: string;
  isBusy: boolean;
  onQuickDepartmentNameChange: (value: string) => void;
  onQuickJobTitleNameChange: (value: string) => void;
  onQuickPositionNameChange?: (value: string) => void;
  onCreateQuickMaster: (kind: MasterKind, name: string) => void;
}

export function EmployeeQuickSetupCard({
  missingSetup,
  quickDepartmentName,
  quickJobTitleName,
  setupError,
  setupSuccess,
  isBusy,
  onQuickDepartmentNameChange,
  onQuickJobTitleNameChange,
  onCreateQuickMaster,
}: EmployeeQuickSetupCardProps) {
  const { t } = useTranslation();
  if (!missingSetup && !setupError && !setupSuccess) return null;
  return (
    <FormSection title={t('hr.employee_create.employee_quick_setup_card.s0', "تجهيز سريع قبل الإضافة")} description={t('hr.employee_create.employee_quick_setup_card.s1', "حتى لا تضطر للخروج من الصفحة، يمكنك إضافة قسم أو مسمى وظيفي سريعًا ثم استخدامه في بيانات الموظف.")}>
      {missingSetup ? (
        <div className="notice-box" style={{ marginBottom: 12 }}>
          {t('hr.employee_create.employee_quick_setup_card.s2', "لا توجد أقسام أو مسميات وظيفية كافية حتى الآن. الأفضل تجهيزها قبل حفظ الموظف، أو إضافتها سريعًا من هنا.")}
        </div>
      ) : null}
      <div className="form-grid">
        <label className="field" style={{ gridColumn: 'auto' }}>
          <span>{t('hr.employee_create.employee_quick_setup_card.s3', "إضافة قسم سريع")}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <input 
              value={quickDepartmentName} 
              onChange={(event) => onQuickDepartmentNameChange(event.target.value)} 
              placeholder={t('hr.employee_create.employee_quick_setup_card.s4', "مثال: المبيعات")} 
              disabled={isBusy}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onCreateQuickMaster('departments', quickDepartmentName); } }}
            />
            <Button type="button" variant="secondary" onClick={() => onCreateQuickMaster('departments', quickDepartmentName)} disabled={isBusy}>{t('hr.employee_create.employee_quick_setup_card.s5', "إضافة")}</Button>
          </div>
        </label>
        <label className="field" style={{ gridColumn: 'auto' }}>
          <span>{t('hr.employee_create.employee_quick_setup_card.s6', "إضافة مسمى وظيفي جديد")}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={quickJobTitleName} onChange={(e) => onQuickJobTitleNameChange(e.target.value)} placeholder={t('hr.employee_create.employee_quick_setup_card.s7', "مثال: محاسب")} disabled={isBusy} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onCreateQuickMaster('job-titles', quickJobTitleName); } }} />
            <Button type="button" variant="secondary" onClick={() => onCreateQuickMaster('job-titles', quickJobTitleName)} disabled={isBusy}>{t('hr.employee_create.employee_quick_setup_card.s8', "إضافة")}</Button>
          </div>
        </label>
      </div>
      {setupError ? <div className="error-box" style={{ marginTop: 12 }}>{setupError}</div> : null}
      {setupSuccess ? <div className="success-box" style={{ marginTop: 12, color: 'var(--success-text)', background: 'var(--success-bg)', padding: '8px 12px', borderRadius: 6, fontSize: '0.9rem' }}>{setupSuccess}</div> : null}
    </FormSection>
  );
}


