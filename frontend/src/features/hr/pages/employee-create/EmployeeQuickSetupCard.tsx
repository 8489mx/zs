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
  if (!missingSetup && !setupError && !setupSuccess) return null;
  return (
    <FormSection title="تجهيز سريع قبل الإضافة" description="حتى لا تضطر للخروج من الصفحة، يمكنك إضافة قسم أو مسمى وظيفي سريعًا ثم استخدامه في بيانات الموظف.">
      {missingSetup ? (
        <div className="notice-box" style={{ marginBottom: 12 }}>
          لا توجد أقسام أو مسميات وظيفية كافية حتى الآن. الأفضل تجهيزها قبل حفظ الموظف، أو إضافتها سريعًا من هنا.
        </div>
      ) : null}
      <div className="form-grid">
        <label className="field" style={{ gridColumn: 'auto' }}>
          <span>إضافة قسم سريع</span>
          <input value={quickDepartmentName} onChange={(event) => onQuickDepartmentNameChange(event.target.value)} placeholder="مثال: المبيعات" />
          <Button type="button" variant="secondary" onClick={() => onCreateQuickMaster('departments', quickDepartmentName)} disabled={isBusy}>إضافة القسم</Button>
        </label>
        <label className="field" style={{ gridColumn: 'auto' }}>
          <span>إضافة مسمى وظيفي جديد</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={quickJobTitleName} onChange={(e) => onQuickJobTitleNameChange(e.target.value)} placeholder="مثال: محاسب" disabled={isBusy} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onCreateQuickMaster('job-titles', quickJobTitleName); } }} />
            <Button type="button" variant="secondary" onClick={() => onCreateQuickMaster('job-titles', quickJobTitleName)} disabled={isBusy}>إضافة</Button>
          </div>
        </label>
      </div>
      {setupError ? <div className="error-box" style={{ marginTop: 12 }}>{setupError}</div> : null}
      {setupSuccess ? <div className="success-box" style={{ marginTop: 12, color: 'var(--success-text)', background: 'var(--success-bg)', padding: '8px 12px', borderRadius: 6, fontSize: '0.9rem' }}>{setupSuccess}</div> : null}
    </FormSection>
  );
}


