import { FormEvent } from 'react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import type { HrContract, HrDocument, HrEmployee, HrEmployeeAsset, HrLeaveRequest, HrLoan } from '@/types/domain';
import {
  assetStatusLabel,
  documentStatusLabel,
  fallbackText,
  installmentStatusLabel,
  leaveStatusLabel,
  loanStatusLabel,
  loanTypeLabel,
  money,
  normalizeText,
  repaymentModeLabel,
  statusLabel,
} from '@/features/hr/utils/employee-profile.helpers';

type CompletenessRow = { label: string; state: string };

type TopCardsProps = {
  employee: HrEmployee | undefined;
  primaryPhone: string;
  nationalIdMasked: string;
  completenessRows: CompletenessRow[];
  reviewAlerts: string[];
};

export function EmployeeProfileTopCards({
  employee,
  primaryPhone,
  nationalIdMasked,
  completenessRows,
  reviewAlerts,
}: TopCardsProps) {
  return (
    <>
      <Card title="ظ…ظ„ط®طµ ط§ظ„ظ…ظˆط¸ظپ">
        <div className="form-grid">
          <div className="field"><span>ظƒظˆط¯ ط§ظ„ظ…ظˆط¸ظپ</span><strong>{fallbackText(employee?.employeeNo)}</strong></div>
          <div className="field"><span>ط§ظ„ط­ط§ظ„ط©</span><strong>{statusLabel(employee?.status)}</strong></div>
          <div className="field"><span>ط§ظ„ظ‚ط³ظ…</span><strong>{fallbackText(employee?.departmentName)}</strong></div>
          <div className="field"><span>ط§ظ„ظ…ط³ظ…ظ‰ ط§ظ„ظˆط¸ظٹظپظٹ</span><strong>{fallbackText(employee?.jobTitleName)}</strong></div>
          <div className="field"><span>طھط§ط±ظٹط® ط§ظ„طھط¹ظٹظٹظ†</span><strong>{fallbackText(employee?.hireDate)}</strong></div>
          <div className="field"><span>ط§ظ„ظ…ظˆط¨ط§ظٹظ„ ط§ظ„ط£ط³ط§ط³ظٹ</span><strong>{primaryPhone}</strong></div>
          <div className="field"><span>ط§ظ„ط±ظ‚ظ… ط§ظ„ظ‚ظˆظ…ظٹ</span><strong>{nationalIdMasked}</strong></div>
          <div className="field"><span>ط¢ط®ط± طھط­ط¯ظٹط«</span><strong>{fallbackText((employee as HrEmployee & { updatedAt?: string })?.updatedAt || 'ط؛ظٹط± ظ…طھط§ط­')}</strong></div>
        </div>
      </Card>

      <Card title="ط¨ظٹط§ظ†ط§طھ ط§ظ„ط¯ظˆط§ظ… ظˆط§ظ„ط£ط¬ط±">
        <div className="form-grid">
          <div className="field"><span>ظ†ظˆط¹ ط§ظ„ط£ط¬ط±</span><strong>{normalizeText(employee?.compensationType) === 'hourly' ? 'ط£ط¬ط± ط¨ط§ظ„ط³ط§ط¹ط©' : 'ط±ط§طھط¨ ط´ظ‡ط±ظٹ'}</strong></div>
          <div className="field"><span>ط§ظ„ط±ط§طھط¨ ط§ظ„ط´ظ‡ط±ظٹ</span><strong>{normalizeText(employee?.compensationType) === 'monthly' ? 'ظٹظڈط±ط§ط¬ط¹ ظ…ظ† ط¨ظٹط§ظ†ط§طھ ط§ظ„ط¹ظ‚ط¯ ظˆط§ظ„ط±ط§طھط¨' : 'ط؛ظٹط± ظ…طھط§ط­'}</strong></div>
          <div className="field"><span>ط£ط¬ط± ط§ظ„ط³ط§ط¹ط©</span><strong>{normalizeText(employee?.compensationType) === 'hourly' ? money(Number(employee?.hourlyRate || 0)) : 'ط؛ظٹط± ظ…طھط§ط­'}</strong></div>
          <div className="field"><span>ط¹ط¯ط¯ ط³ط§ط¹ط§طھ ط§ظ„ظٹظˆظ… ط§ظ„ظ…طھظˆظ‚ط¹ط©</span><strong>{employee?.expectedDailyHours != null ? fallbackText(employee.expectedDailyHours) : 'ط؛ظٹط± ظ…ط­ط¯ط¯'}</strong></div>
          <div className="field"><span>ظ…ظˆط¹ط¯ ط§ظ„ط­ط¶ظˆط±</span><strong>{fallbackText(employee?.scheduledCheckInTime || 'ط؛ظٹط± ظ…ط­ط¯ط¯')}</strong></div>
          <div className="field"><span>ظ…ظˆط¹ط¯ ط§ظ„ط§ظ†طµط±ط§ظپ</span><strong>{fallbackText(employee?.scheduledCheckOutTime || 'ط؛ظٹط± ظ…ط­ط¯ط¯')}</strong></div>
          <div className="field"><span>ظپطھط±ط© ط§ظ„ط³ظ…ط§ط­</span><strong>{employee?.graceMinutes != null ? `${employee.graceMinutes} ط¯ظ‚ظٹظ‚ط©` : 'ط؛ظٹط± ظ…ط­ط¯ط¯'}</strong></div>
          <div className="field"><span>ط³ظٹط§ط³ط© ط§ظ„ظˆظ‚طھ ط§ظ„ط¥ط¶ط§ظپظٹ</span><strong>{normalizeText(employee?.overtimePolicy) === 'disabled' ? 'ط؛ظٹط± ظ…ط­طھط³ط¨' : normalizeText(employee?.overtimePolicy) === 'auto_approved' ? 'ظ…ط­طھط³ط¨ طھظ„ظ‚ط§ط¦ظٹظ‹ط§' : 'ظ…ط±ط§ط¬ط¹ط© ظˆط§ط¹طھظ…ط§ط¯ ظ‚ط¨ظ„ ط§ظ„ط§ط­طھط³ط§ط¨'}</strong></div>
          <div className="field"><span>ط§ظ„ط£ط¬ط± ط§ظ„ظٹظˆظ…ظٹ ط§ظ„ظ…طھظˆظ‚ط¹</span><strong>{normalizeText(employee?.compensationType) === 'hourly' ? money(Number(employee?.hourlyRate || 0) * Number(employee?.expectedDailyHours || 0)) : 'ط؛ظٹط± ظ…طھط§ط­'}</strong></div>
        </div>
      </Card>

      <Card title="ط§ظƒطھظ…ط§ظ„ ظ…ظ„ظپ ط§ظ„ظ…ظˆط¸ظپ">
        <div className="form-grid">
          {completenessRows.map((item) => (
            <div key={item.label} className="field">
              <span>{item.label}</span>
              <strong>{item.state}</strong>
            </div>
          ))}
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>ط§ط³طھظƒظ…ظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظˆط¸ظپ ظ„طھط­ط³ظٹظ† ط¯ظ‚ط© ط§ظ„ظ…طھط§ط¨ط¹ط© ظˆط§ظ„طھظ‚ط§ط±ظٹط±.</p>
      </Card>

      <Card title="طھظ†ط¨ظٹظ‡ط§طھ ط§ظ„ظ…ط±ط§ط¬ط¹ط©">
        {reviewAlerts.length ? (
          <ul style={{ margin: 0, paddingInlineStart: 18 }}>
            {reviewAlerts.map((alert) => <li key={alert}>{alert}</li>)}
          </ul>
        ) : <p className="muted" style={{ margin: 0 }}>ظ„ط§ طھظˆط¬ط¯ طھظ†ط¨ظٹظ‡ط§طھ ظ…ط±ط§ط¬ط¹ط© ط­ط§ظ„ظٹط©.</p>}
      </Card>

      <Card title="ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط£ط³ط§ط³ظٹط© ظˆط§ظ„ظˆط¸ظٹظپظٹط©">
        <div className="form-grid">
          <div className="field"><span>ط§ظ„ط§ط³ظ…</span><strong>{fallbackText(employee?.displayName || `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim())}</strong></div>
          <div className="field"><span>ظƒظˆط¯ ط§ظ„ظ…ظˆط¸ظپ</span><strong>{fallbackText(employee?.employeeNo)}</strong></div>
          <div className="field"><span>ط§ظ„ط­ط§ظ„ط©</span><strong>{statusLabel(employee?.status)}</strong></div>
          <div className="field"><span>ط§ظ„ظ‚ط³ظ…</span><strong>{fallbackText(employee?.departmentName)}</strong></div>
          <div className="field"><span>ط§ظ„ظ…ط³ظ…ظ‰ ط§ظ„ظˆط¸ظٹظپظٹ</span><strong>{fallbackText(employee?.jobTitleName)}</strong></div>
          <div className="field"><span>ط§ظ„ظˆط¸ظٹظپط©/ط§ظ„ظ…ظ†طµط¨</span><strong>{fallbackText(employee?.positionName)}</strong></div>
          <div className="field"><span>طھط§ط±ظٹط® ط§ظ„طھط¹ظٹظٹظ†</span><strong>{fallbackText(employee?.hireDate)}</strong></div>
          <div className="field"><span>ط§ظ„ط±ظ‚ظ… ط§ظ„ظ‚ظˆظ…ظٹ</span><strong>{nationalIdMasked}</strong></div>
        </div>
      </Card>
    </>
  );
}

type OperationalProps = {
  canViewSalary: boolean;
  canViewLoans: boolean;
  latestContract: HrContract | undefined;
  navigate: (to: string) => void;
  handleAddDocument: (event: FormEvent<HTMLFormElement>) => void;
  documentDraft: { title: string; documentType: string; expiryDate: string; notes: string };
  setDocumentDraft: (updater: (current: { title: string; documentType: string; expiryDate: string; notes: string }) => { title: string; documentType: string; expiryDate: string; notes: string }) => void;
  documentError: string;
  isSavingDocument: boolean;
  documents: HrDocument[];
  employeeAssets: HrEmployeeAsset[];
  pendingLeavesCount: number;
  approvedLeavesCount: number;
  unpaidLeavesCount: number;
  leaveRequests: HrLeaveRequest[];
  loans: HrLoan[];
  openLoansCount: number;
  openLoansRemaining: number;
  ledger: Array<{ id: string | number; entryType?: string; amount?: number; balanceAfter?: number; createdAt?: string }>;
};

export function EmployeeProfileOperationalSections(props: OperationalProps) {
  const {
    canViewSalary,
    canViewLoans,
    latestContract,
    navigate,
    handleAddDocument,
    documentDraft,
    setDocumentDraft,
    documentError,
    isSavingDocument,
    documents,
    employeeAssets,
    pendingLeavesCount,
    approvedLeavesCount,
    unpaidLeavesCount,
    leaveRequests,
    loans,
    openLoansCount,
    openLoansRemaining,
    ledger,
  } = props;

  return (
    <>
      <Card title="ط§ظ„ط¹ظ‚ط¯ ظˆط§ظ„ط±ط§طھط¨" actions={canViewSalary ? <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>ط¹ط±ط¶ ط§ظ„ظ…ط±طھط¨ط§طھ</Button> : undefined}>
        {!canViewSalary ? (
          <p className="muted">ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.</p>
        ) : latestContract ? (
          <>
            <div className="form-grid">
              <div className="field"><span>ظ†ظˆط¹ ط§ظ„طھط¹ط§ظ‚ط¯</span><strong>{fallbackText(latestContract.contractType)}</strong></div>
              <div className="field"><span>ط§ظ„ط­ط§ظ„ط©</span><strong>{statusLabel(latestContract.status)}</strong></div>
              <div className="field"><span>ط¨ط¯ط§ظٹط© ط§ظ„ط¹ظ‚ط¯</span><strong>{fallbackText(latestContract.startDate)}</strong></div>
              <div className="field"><span>ظ†ظ‡ط§ظٹط© ط§ظ„ط¹ظ‚ط¯</span><strong>{fallbackText(latestContract.endDate)}</strong></div>
              <div className="field"><span>ط§ظ„ط±ط§طھط¨ ط§ظ„ط£ط³ط§ط³ظٹ</span><strong>{money(latestContract.baseSalary)}</strong></div>
              <div className="field"><span>ط§ظ„ط¹ظ…ظ„ط©</span><strong>{fallbackText(latestContract.currency)}</strong></div>
            </div>
            <p className="muted" style={{ marginBottom: 0 }}>طھظپط§طµظٹظ„ ط§ظ„ط¶ط±ط§ط¦ط¨ ظˆط§ظ„طھط£ظ…ظٹظ†ط§طھ طھط­طھط§ط¬ ط¥ط¹ط¯ط§ط¯ط§طھ ظ…ط³طھظ‚ظ„ط© ظˆظ…ط±ط§ط¬ط¹ط© ظ…ط­ط§ط³ط¨ ظ‚ط¨ظ„ ط§ظ„ط§ط¹طھظ…ط§ط¯.</p>
          </>
        ) : <p className="muted">ظ„ط§ ظٹظˆط¬ط¯ ط¹ظ‚ط¯ ط£ظˆ ط±ط§طھط¨ ظ…ط³ط¬ظ„.</p>}
      </Card>

      <Card title="ط§ظ„ظ…ط³طھظ†ط¯ط§طھ" actions={<Button variant="secondary" onClick={() => navigate('/hr/documents')}>ط¹ط±ط¶ ط§ظ„ظ…ط³طھظ†ط¯ط§طھ</Button>}>
        <form onSubmit={handleAddDocument}>
          <div className="form-grid">
            <div className="field"><span>ط§ط³ظ… ط§ظ„ظ…ط³طھظ†ط¯</span><input value={documentDraft.title} onChange={(e) => setDocumentDraft((current) => ({ ...current, title: e.target.value }))} /></div>
            <div className="field"><span>ظ†ظˆط¹ ط§ظ„ظ…ط³طھظ†ط¯</span><input value={documentDraft.documentType} onChange={(e) => setDocumentDraft((current) => ({ ...current, documentType: e.target.value }))} /></div>
            <div className="field"><span>طھط§ط±ظٹط® ط§ظ„ط§ظ†طھظ‡ط§ط،</span><input type="date" value={documentDraft.expiryDate} onChange={(e) => setDocumentDraft((current) => ({ ...current, expiryDate: e.target.value }))} /></div>
            <div className="field field-wide"><span>ظ…ظ„ط§ط­ط¸ط§طھ</span><input value={documentDraft.notes} onChange={(e) => setDocumentDraft((current) => ({ ...current, notes: e.target.value }))} /></div>
          </div>
          {documentError ? <div className="error-box" style={{ marginTop: 12 }}>{documentError}</div> : null}
          <div className="actions compact-actions" style={{ marginTop: 12 }}>
            <Button type="submit" disabled={isSavingDocument}>{isSavingDocument ? 'ط¬ط§ط±ظٹ ط§ظ„ط­ظپط¸...' : 'ط¥ط¶ط§ظپط© ظ…ط³طھظ†ط¯'}</Button>
          </div>
        </form>

        {documents.length ? (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="data-table"><thead><tr><th>ط§ط³ظ… ط§ظ„ظ…ط³طھظ†ط¯</th><th>ظ†ظˆط¹ ط§ظ„ظ…ط³طھظ†ط¯</th><th>طھط§ط±ظٹط® ط§ظ„ط§ظ†طھظ‡ط§ط،</th><th>ط§ظ„ط­ط§ظ„ط©</th><th>ظ…ظ„ط§ط­ط¸ط§طھ</th></tr></thead>
              <tbody>{documents.map((row) => (<tr key={String(row.id)}><td>{fallbackText(row.title)}</td><td>{fallbackText(row.documentType)}</td><td>{fallbackText(row.expiryDate) || 'ط¨ط¯ظˆظ† طھط§ط±ظٹط® ط§ظ†طھظ‡ط§ط،'}</td><td>{documentStatusLabel(row.expiryDate)}</td><td>{fallbackText(row.notes)}</td></tr>))}</tbody>
            </table>
          </div>
        ) : <p className="muted">ظ„ط§ طھظˆط¬ط¯ ظ…ط³طھظ†ط¯ط§طھ ظ…ط³ط¬ظ„ط©.</p>}
      </Card>

      <Card title="ط§ظ„ط¹ظڈظ‡ط¯ ظˆط§ظ„ط£طµظˆظ„" actions={<Button variant="secondary" onClick={() => navigate('/hr/assets')}>ط¹ط±ط¶ ط§ظ„ط¹ظڈظ‡ط¯</Button>}>
        {employeeAssets.length ? (
          <div className="table-wrap">
            <table className="data-table"><thead><tr><th>ط§ط³ظ… ط§ظ„ط¹ظ‡ط¯ط©</th><th>ط§ظ„ظƒظˆط¯/ط§ظ„طھط³ظ„ط³ظ„ظٹ</th><th>طھط§ط±ظٹط® ط§ظ„طھط³ظ„ظٹظ…</th><th>طھط§ط±ظٹط® ط§ظ„ط§ط³طھط±ط¬ط§ط¹</th><th>ط§ظ„ط­ط§ظ„ط©</th></tr></thead>
              <tbody>{employeeAssets.map((row) => (<tr key={String(row.id)}><td>{fallbackText(row.assetName)}</td><td>{fallbackText(row.assetCode || row.serialNo)}</td><td>{fallbackText(row.assignedAt)}</td><td>{fallbackText(row.returnedAt)}</td><td>{assetStatusLabel(row.status)}</td></tr>))}</tbody>
            </table>
          </div>
        ) : <p className="muted">ظ„ط§ طھظˆط¬ط¯ ط¹ظڈظ‡ط¯ ظ…ط³ط¬ظ„ط©.</p>}
      </Card>

      <Card title="ط§ظ„ط¥ط¬ط§ط²ط§طھ" actions={<Button variant="secondary" onClick={() => navigate('/hr/leaves')}>ط¹ط±ط¶ ط§ظ„ط¥ط¬ط§ط²ط§طھ</Button>}>
        <div className="form-grid">
          <div className="field"><span>ظ‚ظٹط¯ ط§ظ„ظ…ط±ط§ط¬ط¹ط©</span><strong>{pendingLeavesCount}</strong></div>
          <div className="field"><span>ظ…ط¹طھظ…ط¯ط©</span><strong>{approvedLeavesCount}</strong></div>
          <div className="field"><span>ط؛ظٹط± ظ…ط¯ظپظˆط¹ط©</span><strong>{unpaidLeavesCount}</strong></div>
          <div className="field"><span>ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط·ظ„ط¨ط§طھ</span><strong>{leaveRequests.length}</strong></div>
        </div>
        {leaveRequests.length ? (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="data-table"><thead><tr><th>ظ†ظˆط¹ ط§ظ„ط¥ط¬ط§ط²ط©</th><th>ظ…ظ† طھط§ط±ظٹط®</th><th>ط¥ظ„ظ‰ طھط§ط±ظٹط®</th><th>ط¹ط¯ط¯ ط§ظ„ط£ظٹط§ظ…</th><th>ط§ظ„ط­ط§ظ„ط©</th></tr></thead>
              <tbody>{leaveRequests.slice(0, 8).map((row) => (<tr key={String(row.id)}><td>{fallbackText(row.leaveTypeName || row.leaveType)}</td><td>{fallbackText(row.startDate)}</td><td>{fallbackText(row.endDate)}</td><td>{fallbackText(row.daysCount)}</td><td>{leaveStatusLabel(row.status)}</td></tr>))}</tbody>
            </table>
          </div>
        ) : <p className="muted">ظ„ط§ طھظˆط¬ط¯ ط·ظ„ط¨ط§طھ ط¥ط¬ط§ط²ط© ط­ط§ظ„ظٹط©.</p>}
      </Card>

      <Card title="ط§ظ„ط­ط¶ظˆط± ظˆط§ظ„ط§ظ†طµط±ط§ظپ" actions={<Button variant="secondary" onClick={() => navigate('/hr/attendance')}>ط¹ط±ط¶ ط§ظ„ط­ط¶ظˆط± ظˆط§ظ„ط§ظ†طµط±ط§ظپ</Button>}>
        <p className="muted" style={{ margin: 0 }}>طھظپط§طµظٹظ„ ط§ظ„ط­ط¶ظˆط± ظ…طھط§ط­ط© ظ…ظ† طµظپط­ط© ط§ظ„ط­ط¶ظˆط± ظˆط§ظ„ط§ظ†طµط±ط§ظپ.</p>
      </Card>

      <Card title="ط§ظ„ظ…ط±طھط¨ط§طھ ظˆط§ظ„ط³ظ„ظپ" actions={<div className="compact-actions">{canViewSalary ? <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>ط¹ط±ط¶ ط§ظ„ظ…ط±طھط¨ط§طھ</Button> : null}{canViewLoans ? <Button variant="secondary" onClick={() => navigate('/hr/loans')}>ط¥ط¯ط§ط±ط© ط§ظ„ط³ظ„ظپ</Button> : null}</div>}>
        {!canViewSalary && !canViewLoans ? (<p className="muted">ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.</p>) : loans.length ? (<>
          <div className="form-grid"><div className="field"><span>ط¹ط¯ط¯ ط§ظ„ط³ظ„ظپ ط§ظ„ظ…ظپطھظˆط­ط©</span><strong>{canViewLoans ? openLoansCount : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.'}</strong></div><div className="field"><span>ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…طھط¨ظ‚ظٹ</span><strong>{canViewLoans ? money(openLoansRemaining) : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.'}</strong></div></div>
          <div className="table-wrap" style={{ marginTop: 12 }}><table className="data-table"><thead><tr><th>ط±ظ‚ظ… ط§ظ„ط³ظ„ظپط©</th><th>ط§ظ„ظ†ظˆط¹</th><th>ط·ط±ظٹظ‚ط© ط§ظ„ط³ط¯ط§ط¯</th><th>ظ‚ظٹظ…ط© ط§ظ„ط³ظ„ظپط©</th><th>ط§ظ„ظ…طھط¨ظ‚ظٹ</th><th>ط§ظ„ط­ط§ظ„ط©</th><th>ط®ط·ط© ط§ظ„ط£ظ‚ط³ط§ط·</th></tr></thead>
            <tbody>{loans.map((row) => (<tr key={String(row.id)}><td>{fallbackText(row.loanNo)}</td><td>{loanTypeLabel(row.loanType)}</td><td>{repaymentModeLabel(row.repaymentMode)}</td><td>{canViewLoans ? money(row.principalAmount) : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.'}</td><td>{canViewLoans ? money(row.remainingAmount) : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.'}</td><td>{loanStatusLabel(row.status)}</td><td>{Array.isArray(row.installments) && row.installments.length ? (<details><summary>{`ط¹ط¯ط¯ ط§ظ„ط£ظ‚ط³ط§ط·: ${row.installments.length}`}</summary><div className="table-wrap" style={{ marginTop: 8 }}><table className="data-table"><thead><tr><th>ط±ظ‚ظ… ط§ظ„ظ‚ط³ط·</th><th>ط´ظ‡ط± ط§ظ„ط§ط³طھط­ظ‚ط§ظ‚</th><th>ظ‚ظٹظ…ط© ط§ظ„ظ‚ط³ط·</th><th>ط§ظ„ط­ط§ظ„ط©</th><th>طھط§ط±ظٹط® ط§ظ„ط®طµظ…</th></tr></thead><tbody>{row.installments.map((installment) => (<tr key={String(installment.id)}><td>{fallbackText(installment.installmentNumber)}</td><td>{fallbackText(installment.dueDate)}</td><td>{canViewLoans ? money(installment.amount) : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.'}</td><td>{installmentStatusLabel(installment.status)}</td><td>{fallbackText(installment.paidAt)}</td></tr>))}</tbody></table></div></details>) : 'â€”'}</td></tr>))}</tbody>
          </table></div>
        </>) : <p className="muted">ظ„ط§ طھظˆط¬ط¯ ط³ظ„ظپ ط£ظˆ ط®طµظˆظ…ط§طھ ظ…ط³ط¬ظ„ط©.</p>}
      </Card>

      <Card title="ط§ظ„ط³ط¬ظ„ ط§ظ„ظ…ط§ظ„ظٹ"><div className="table-wrap"><table className="data-table"><thead><tr><th>نوع الحركة</th><th>القيمة</th><th>الرصيد بعد الحركة</th><th>التاريخ</th></tr></thead><tbody>{ledger.map((row) => (<tr key={String(row.id)}><td>{fallbackText((row as { entryType?: string }).entryType)}</td><td>{money((row as { amount?: number }).amount)}</td><td>{money((row as { balanceAfter?: number }).balanceAfter)}</td><td>{fallbackText((row as { createdAt?: string }).createdAt)}</td></tr>))}</tbody></table></div></Card>
    </>
  );
}

