import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';

type MasterKind = 'departments' | 'job-titles';

interface EmployeeQuickSetupCardProps {
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';

type MasterKind = 'departments' | 'job-titles';

interface EmployeeQuickSetupCardProps {
  missingSetup: boolean;
  quickDepartmentName: string;
  quickJobTitleName: string;
  setupError: string;
  setupSuccess: string;
  isBusy: boolean;
  onQuickDepartmentNameChange: (value: string) => void;
  onQuickJobTitleNameChange: (value: string) => void;
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
    <FormSection title="طھط¬ظ‡ظٹط² ط³ط±ظٹط¹ ظ‚ط¨ظ„ ط§ظ„ط¥ط¶ط§ظپط©" description="ط­طھظ‰ ظ„ط§ طھط¶ط·ط± ظ„ظ„ط®ط±ظˆط¬ ظ…ظ† ط§ظ„طµظپط­ط©طŒ ظٹظ…ظƒظ†ظƒ ط¥ط¶ط§ظپط© ظ‚ط³ظ… ط£ظˆ ظ…ط³ظ…ظ‰ ظˆط¸ظٹظپظٹ ط³ط±ظٹط¹ظ‹ط§ ط«ظ… ط§ط³طھط®ط¯ط§ظ…ظ‡ ظپظٹ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظˆط¸ظپ.">
      {missingSetup ? (
        <div className="notice-box" style={{ marginBottom: 12 }}>
          ظ„ط§ طھظˆط¬ط¯ ط£ظ‚ط³ط§ظ… ط£ظˆ ظ…ط³ظ…ظٹط§طھ ظˆط¸ظٹظپظٹط© ظƒط§ظپظٹط© ط­طھظ‰ ط§ظ„ط¢ظ†. ط§ظ„ط£ظپط¶ظ„ طھط¬ظ‡ظٹط²ظ‡ط§ ظ‚ط¨ظ„ ط­ظپط¸ ط§ظ„ظ…ظˆط¸ظپطŒ ط£ظˆ ط¥ط¶ط§ظپطھظ‡ط§ ط³ط±ظٹط¹ظ‹ط§ ظ…ظ† ظ‡ظ†ط§.
        </div>
      ) : null}
      <div className="form-grid">
        <label className="field">
          <span>ط¥ط¶ط§ظپط© ظ‚ط³ظ… ط³ط±ظٹط¹</span>
          <input value={quickDepartmentName} onChange={(event) => onQuickDepartmentNameChange(event.target.value)} placeholder="ظ…ط«ط§ظ„: ط§ظ„ظ…ط¨ظٹط¹ط§طھ" />
          <Button type="button" variant="secondary" onClick={() => onCreateQuickMaster('departments', quickDepartmentName)} disabled={isBusy}>ط¥ط¶ط§ظپط© ط§ظ„ظ‚ط³ظ…</Button>
        </label>
        <label className="field">
          <span>ط¥ط¶ط§ظپط© ظ…ط³ظ…ظ‰ ظˆط¸ظٹظپظٹ ط¬ط¯ظٹط¯</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={quickJobTitleName} onChange={(e) => onQuickJobTitleNameChange(e.target.value)} placeholder="ظ…ط«ط§ظ„: ظ…ط­ط§ط³ط¨" disabled={isBusy} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onCreateQuickMaster('job-titles', quickJobTitleName); } }} />
            <Button type="button" variant="secondary" onClick={() => onCreateQuickMaster('job-titles', quickJobTitleName)} disabled={isBusy}>ط¥ط¶ط§ظپط©</Button>
          </div>
        </label>
      </div>
      {setupError ? <div className="error-box" style={{ marginTop: 12 }}>{setupError}</div> : null}
      {setupSuccess ? <div className="success-box" style={{ marginTop: 12, color: 'var(--success-text)', background: 'var(--success-bg)', padding: '8px 12px', borderRadius: 6, fontSize: '0.9rem' }}>{setupSuccess}</div> : null}
    </FormSection>
  );
}

