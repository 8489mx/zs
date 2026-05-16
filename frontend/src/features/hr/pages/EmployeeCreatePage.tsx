import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { getErrorMessage } from '@/lib/errors';
import { useHrMutations, useHrWorkspace } from '@/features/hr/hooks/useHr';
import {
  getCreatedEmployeeId,
  initialDraft,
  normalizeArabicDigits,
  normalizeDigitsOnly,
  normalizeNumberText,
  normalizePhone,
  toId,
  type EmployeeDraft,
} from '@/features/hr/pages/employee-create/employee-create.helpers';

export function EmployeeCreatePage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<EmployeeDraft>(initialDraft);
  const [submitError, setSubmitError] = useState('');

  const workspace = useHrWorkspace({ page: 1, pageSize: 200 });
  const mutations = useHrMutations();

  const departments = useMemo(() => workspace.departments.data?.rows || [], [workspace.departments.data?.rows]);
  const jobTitles = useMemo(() => workspace.jobTitles.data?.rows || [], [workspace.jobTitles.data?.rows]);
  const positions = useMemo(() => workspace.positions.data?.rows || [], [workspace.positions.data?.rows]);

  const reviewWarnings = useMemo(() => {
    const warnings: string[] = [];
    const salaryText = normalizeNumberText(draft.baseSalary);
    const nationalId = normalizeDigitsOnly(draft.nationalId);
    if (!String(draft.firstName || '').trim()) warnings.push('ط§ظ„ط§ط³ظ… ط§ظ„ط£ظˆظ„ ظ…ط·ظ„ظˆط¨ ظ‚ط¨ظ„ ط§ظ„ط­ظپط¸.');
    if (!normalizePhone(draft.mobile)) warnings.push('ط§ظ„ظ…ظˆط¨ط§ظٹظ„ ظ…ط·ظ„ظˆط¨ ظ‚ط¨ظ„ ط§ظ„ط­ظپط¸.');
    if (!String(draft.hireDate || '').trim()) warnings.push('طھط§ط±ظٹط® ط§ظ„طھط¹ظٹظٹظ† ظ…ط·ظ„ظˆط¨ ظ‚ط¨ظ„ ط§ظ„ط­ظپط¸.');
    if (nationalId && nationalId.length !== 14) warnings.push('ط§ظ„ط±ظ‚ظ… ط§ظ„ظ‚ظˆظ…ظٹ ظٹط¬ط¨ ط£ظ† ظٹظƒظˆظ† 14 ط±ظ‚ظ…ظ‹ط§ ط¥ط°ط§ طھظ… ط¥ط¯ط®ط§ظ„ظ‡.');
    if (!draft.departmentId) warnings.push('ط§ظ„ظ‚ط³ظ… ط؛ظٹط± ظ…ط­ط¯ط¯ ظˆظٹظ…ظƒظ† ط§ط³طھظƒظ…ط§ظ„ظ‡ ظ„ط§ط­ظ‚ظ‹ط§.');
    if (!draft.jobTitleId) warnings.push('ط§ظ„ظ…ط³ظ…ظ‰ ط§ظ„ظˆط¸ظٹظپظٹ ط؛ظٹط± ظ…ط­ط¯ط¯ ظˆظٹظ…ظƒظ† ط§ط³طھظƒظ…ط§ظ„ظ‡ ظ„ط§ط­ظ‚ظ‹ط§.');
    if (salaryText && Number.isNaN(Number(salaryText))) warnings.push('ط§ظ„ط±ط§طھط¨ ط§ظ„ط£ط³ط§ط³ظٹ ظٹط¬ط¨ ط£ظ† ظٹظƒظˆظ† ط±ظ‚ظ…ظ‹ط§ طµط­ظٹط­ظ‹ط§.');
    return warnings;
  }, [draft]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError('');

    const firstName = String(draft.firstName || '').trim();
    const mobile = normalizePhone(draft.mobile);
    const nationalId = normalizeDigitsOnly(draft.nationalId);
    const hireDate = String(draft.hireDate || '').trim();
    const contractType = String(draft.contractType || '').trim();
    const baseSalaryText = normalizeNumberText(draft.baseSalary);
    const baseSalary = baseSalaryText ? Number(baseSalaryText) : 0;
    const hourlyRateText = normalizeNumberText(draft.hourlyRate);
    const expectedDailyHoursText = normalizeNumberText(draft.expectedDailyHours);
    const graceMinutesText = normalizeDigitsOnly(draft.graceMinutes);
    const hourlyRate = hourlyRateText ? Number(hourlyRateText) : 0;
    const expectedDailyHours = expectedDailyHoursText ? Number(expectedDailyHoursText) : 0;
    const graceMinutes = graceMinutesText ? Number(graceMinutesText) : 0;

    if (!firstName) {
      setSubmitError('ط§ظ„ط§ط³ظ… ط§ظ„ط£ظˆظ„ ظ…ط·ظ„ظˆط¨.');
      return;
    }
    if (!mobile) {
      setSubmitError('ط§ظ„ظ…ظˆط¨ط§ظٹظ„ ظ…ط·ظ„ظˆط¨.');
      return;
    }
    if (!hireDate) {
      setSubmitError('طھط§ط±ظٹط® ط§ظ„طھط¹ظٹظٹظ† ظ…ط·ظ„ظˆط¨.');
      return;
    }
    if (nationalId && !/^\d{14}$/.test(nationalId)) {
      setSubmitError('ط§ظ„ط±ظ‚ظ… ط§ظ„ظ‚ظˆظ…ظٹ ظٹط¬ط¨ ط£ظ† ظٹظƒظˆظ† 14 ط±ظ‚ظ…ظ‹ط§.');
      return;
    }
    if (Number.isNaN(baseSalary)) {
      setSubmitError('ط§ظ„ط±ط§طھط¨ ط§ظ„ط£ط³ط§ط³ظٹ ظٹط¬ط¨ ط£ظ† ظٹظƒظˆظ† ط±ظ‚ظ…ظ‹ط§ طµط­ظٹط­ظ‹ط§.');
      return;
    }
    if (draft.compensationType === 'hourly') {
      if (!(hourlyRate > 0)) {
        setSubmitError('ط£ط¬ط± ط§ظ„ط³ط§ط¹ط© ظ…ط·ظ„ظˆط¨ ظ„ظ„ظ…ظˆط¸ظپ ط¨ط§ظ„ط£ط¬ط± ط¨ط§ظ„ط³ط§ط¹ط©.');
        return;
      }
      if (!(expectedDailyHours > 0)) {
        setSubmitError('ط¹ط¯ط¯ ط³ط§ط¹ط§طھ ط§ظ„ط¹ظ…ظ„ ط§ظ„ظٹظˆظ…ظٹط© ط§ظ„ظ…طھظˆظ‚ط¹ط© ظ…ط·ظ„ظˆط¨ ظ„ظ„ظ…ظˆط¸ظپ ط¨ط§ظ„ط£ط¬ط± ط¨ط§ظ„ط³ط§ط¹ط©.');
        return;
      }
    }

    try {
      const employeePayload = {
        employeeNo: normalizeArabicDigits(String(draft.employeeNo || '').trim()) || undefined,
        firstName,
        lastName: String(draft.lastName || '').trim() || undefined,
        nationalId: nationalId || undefined,
        status: draft.status,
        departmentId: toId(draft.departmentId),
        jobTitleId: toId(draft.jobTitleId),
        positionId: toId(draft.positionId),
        hireDate,
        notes: String(draft.notes || '').trim() || undefined,
        compensationType: draft.compensationType,
        hourlyRate: draft.compensationType === 'hourly' ? hourlyRate : undefined,
        expectedDailyHours: draft.compensationType === 'hourly' ? expectedDailyHours : undefined,
        scheduledCheckInTime: draft.scheduledCheckInTime || undefined,
        scheduledCheckOutTime: draft.scheduledCheckOutTime || undefined,
        graceMinutes,
        overtimePolicy: draft.overtimePolicy,
      };

      const result = await mutations.saveEmployee.mutateAsync({ payload: employeePayload });
      const createdEmployeeId = getCreatedEmployeeId(result, draft, firstName);

      if (createdEmployeeId) {
        await mutations.saveContact.mutateAsync({
          employeeId: createdEmployeeId,
          payload: {
            contactType: 'phone',
            value: mobile,
            label: 'ط§ظ„ظ…ظˆط¨ط§ظٹظ„',
            isPrimary: true,
            notes: '',
          },
        });

        if (contractType || baseSalary > 0) {
          await mutations.saveContract.mutateAsync({
            employeeId: createdEmployeeId,
            payload: {
              contractType: contractType || 'standard',
              status: 'active',
              startDate: hireDate,
              baseSalary: baseSalary > 0 ? baseSalary : 0,
              currency: 'EGP',
              notes: 'طھظ… ط¥ظ†ط´ط§ط¤ظ‡ ظ…ظ† طµظپط­ط© ط¥ط¶ط§ظپط© ظ…ظˆط¸ظپ.',
            },
          });
        }
      }

      navigate('/hr/employees');
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'طھط¹ط°ط± ط­ظپط¸ ط§ظ„ظ…ظˆط¸ظپ.'));
    }
  }

  const isBusy = mutations.saveEmployee.isPending || mutations.saveContact.isPending || mutations.saveContract.isPending;

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="ط¥ط¶ط§ظپط© ظ…ظˆط¸ظپ"
        description="ط¥ط¶ط§ظپط© ظ…ظˆط¸ظپ ط¬ط¯ظٹط¯ ط¨ط¨ظٹط§ظ†ط§طھ ظˆط§ط¶ط­ط©طŒ ظ…ط¹ ظ…ط±ط§ط¬ط¹ط© ط³ط±ظٹط¹ط© ظ„ظ„ط­ظ‚ظˆظ„ ط§ظ„ظ†ط§ظ‚طµط© ظ‚ط¨ظ„ ط§ظ„ط­ظپط¸."
      />

      <form onSubmit={(event) => { void handleSubmit(event); }}>
        <Card title="ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط£ط³ط§ط³ظٹط©" description="ط£ط¯ط®ظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„طھط¹ط±ظٹظپ ط§ظ„ط£ط³ط§ط³ظٹط© ظ„ظ„ظ…ظˆط¸ظپ.">
          <div className="form-grid">
            <div className="field">
              <span>ظƒظˆط¯ ط§ظ„ظ…ظˆط¸ظپ</span>
              <input value={draft.employeeNo} onChange={(e) => setDraft((current) => ({ ...current, employeeNo: e.target.value }))} />
            </div>
            <div className="field">
              <span>ط§ظ„ط§ط³ظ… ط§ظ„ط£ظˆظ„ *</span>
              <input value={draft.firstName} onChange={(e) => setDraft((current) => ({ ...current, firstName: e.target.value }))} required />
            </div>
            <div className="field">
              <span>ط§ط³ظ… ط§ظ„ط¹ط§ط¦ظ„ط©</span>
              <input value={draft.lastName} onChange={(e) => setDraft((current) => ({ ...current, lastName: e.target.value }))} />
            </div>
            <div className="field">
              <span>ط§ظ„ظ…ظˆط¨ط§ظٹظ„ *</span>
              <input value={draft.mobile} onChange={(e) => setDraft((current) => ({ ...current, mobile: e.target.value }))} inputMode="tel" required />
            </div>
            <div className="field">
              <span>ط§ظ„ط±ظ‚ظ… ط§ظ„ظ‚ظˆظ…ظٹ</span>
              <input
                value={draft.nationalId}
                onChange={(e) => setDraft((current) => ({ ...current, nationalId: e.target.value }))}
                inputMode="numeric"
                maxLength={14}
                placeholder="ط§ط®طھظٹط§ط±ظٹ"
              />
            </div>
          </div>
        </Card>

        <Card title="ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ظˆط¸ظٹظپظٹط©" description="ط­ط¯ط¯ ط§ظ„ظ‚ط³ظ… ظˆط§ظ„ظ…ط³ظ…ظ‰ ط§ظ„ظˆط¸ظٹظپظٹ ظˆطھط§ط±ظٹط® ط§ظ„طھط¹ظٹظٹظ†.">
          <div className="form-grid">
            <div className="field">
              <span>ط§ظ„ظ‚ط³ظ…</span>
              <select value={draft.departmentId} onChange={(e) => setDraft((current) => ({ ...current, departmentId: e.target.value }))}>
                <option value="">ط§ط®طھظٹط§ط±</option>
                {departments.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
              </select>
            </div>
            <div className="field">
              <span>ط§ظ„ظ…ط³ظ…ظ‰ ط§ظ„ظˆط¸ظٹظپظٹ</span>
              <select value={draft.jobTitleId} onChange={(e) => setDraft((current) => ({ ...current, jobTitleId: e.target.value }))}>
                <option value="">ط§ط®طھظٹط§ط±</option>
                {jobTitles.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
              </select>
            </div>
            <div className="field">
              <span>ط§ظ„ظˆط¸ظٹظپط©/ط§ظ„ظ…ظ†طµط¨</span>
              <select value={draft.positionId} onChange={(e) => setDraft((current) => ({ ...current, positionId: e.target.value }))}>
                <option value="">ط§ط®طھظٹط§ط±</option>
                {positions.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
              </select>
            </div>
            <div className="field">
              <span>طھط§ط±ظٹط® ط§ظ„طھط¹ظٹظٹظ† *</span>
              <input type="date" value={draft.hireDate} onChange={(e) => setDraft((current) => ({ ...current, hireDate: e.target.value }))} required />
            </div>
            <div className="field">
              <span>ط§ظ„ط­ط§ظ„ط©</span>
              <select value={draft.status} onChange={(e) => setDraft((current) => ({ ...current, status: e.target.value === 'inactive' ? 'inactive' : 'active' }))}>
                <option value="active">ظ†ط´ط·</option>
                <option value="inactive">ط؛ظٹط± ظ†ط´ط·</option>
              </select>
            </div>
          </div>
        </Card>

        <Card title="ط§ظ„ط¹ظ‚ط¯ ظˆط§ظ„ط±ط§طھط¨" description="ط§ط®طھظٹط§ط±ظٹ. ظ„ظˆ ط£ط¯ط®ظ„طھ ظ†ظˆط¹ ط§ظ„طھط¹ط§ظ‚ط¯ ط£ظˆ ط§ظ„ط±ط§طھط¨ ط§ظ„ط£ط³ط§ط³ظٹ ط³ظٹطھظ… ط¥ظ†ط´ط§ط، ط¹ظ‚ط¯ ظ…ط¨ط¯ط¦ظٹ ظ„ظ„ظ…ظˆط¸ظپطŒ ظˆظٹظ…ظƒظ† ط§ط³طھظƒظ…ط§ظ„ ط§ظ„طھظپط§طµظٹظ„ ط¯ط§ط®ظ„ ظ…ظ„ظپ ط§ظ„ظ…ظˆط¸ظپ ظ„ط§ط­ظ‚ظ‹ط§.">
          <div className="form-grid">
            <div className="field">
              <span>ظ†ظˆط¹ ط§ظ„طھط¹ط§ظ‚ط¯</span>
              <input value={draft.contractType} onChange={(e) => setDraft((current) => ({ ...current, contractType: e.target.value }))} placeholder="ط§ط®طھظٹط§ط±ظٹ" />
            </div>
            <div className="field">
              <span>ط§ظ„ط±ط§طھط¨ ط§ظ„ط£ط³ط§ط³ظٹ</span>
              <input inputMode="decimal" min="0" value={draft.baseSalary} onChange={(e) => setDraft((current) => ({ ...current, baseSalary: e.target.value }))} placeholder="ط§ط®طھظٹط§ط±ظٹ" />
            </div>
          </div>
        </Card>

        <Card title="ط¨ظٹط§ظ†ط§طھ ط§ظ„ط¯ظˆط§ظ… ظˆط§ظ„ط£ط¬ط±" description="طھط­ط¯ظٹط¯ ظ†ظˆط¹ ط§ظ„ط£ط¬ط± ظˆط¬ط¯ظˆظ„ ط§ظ„ط¯ظˆط§ظ… ط§ظ„ظ…طھظˆظ‚ط¹ ظ„ظ„ظ…ظˆط¸ظپ.">
          <div className="form-grid">
            <label className="field">
              <span>ظ†ظˆط¹ ط§ظ„ط£ط¬ط±</span>
              <select value={draft.compensationType} onChange={(e) => setDraft((current) => ({ ...current, compensationType: e.target.value === 'hourly' ? 'hourly' : 'monthly' }))}>
                <option value="monthly">ط±ط§طھط¨ ط´ظ‡ط±ظٹ</option>
                <option value="hourly">ط£ط¬ط± ط¨ط§ظ„ط³ط§ط¹ط©</option>
              </select>
            </label>
            {draft.compensationType === 'monthly' ? (
              <label className="field">
                <span>ط§ظ„ط±ط§طھط¨ ط§ظ„ط´ظ‡ط±ظٹ ط§ظ„ط£ط³ط§ط³ظٹ</span>
                <input inputMode="decimal" min="0" value={draft.baseSalary} onChange={(e) => setDraft((current) => ({ ...current, baseSalary: e.target.value }))} placeholder="ط§ط®طھظٹط§ط±ظٹ" />
              </label>
            ) : (
              <>
                <label className="field">
                  <span>ط£ط¬ط± ط§ظ„ط³ط§ط¹ط©</span>
                  <input inputMode="decimal" min="0" value={draft.hourlyRate} onChange={(e) => setDraft((current) => ({ ...current, hourlyRate: e.target.value }))} />
                </label>
                <label className="field">
                  <span>ط¹ط¯ط¯ ط³ط§ط¹ط§طھ ط§ظ„ط¹ظ…ظ„ ط§ظ„ظٹظˆظ…ظٹط© ط§ظ„ظ…طھظˆظ‚ط¹ط©</span>
                  <input inputMode="decimal" min="0" value={draft.expectedDailyHours} onChange={(e) => setDraft((current) => ({ ...current, expectedDailyHours: e.target.value }))} />
                </label>
              </>
            )}
            <label className="field">
              <span>ظ…ظˆط¹ط¯ ط§ظ„ط­ط¶ظˆط±</span>
              <input type="time" value={draft.scheduledCheckInTime} onChange={(e) => setDraft((current) => ({ ...current, scheduledCheckInTime: e.target.value }))} />
            </label>
            <label className="field">
              <span>ظ…ظˆط¹ط¯ ط§ظ„ط§ظ†طµط±ط§ظپ</span>
              <input type="time" value={draft.scheduledCheckOutTime} onChange={(e) => setDraft((current) => ({ ...current, scheduledCheckOutTime: e.target.value }))} />
            </label>
            <label className="field">
              <span>ظپطھط±ط© ط§ظ„ط³ظ…ط§ط­ ط¨ط§ظ„ط¯ظ‚ط§ط¦ظ‚</span>
              <input inputMode="numeric" min="0" value={draft.graceMinutes} onChange={(e) => setDraft((current) => ({ ...current, graceMinutes: e.target.value }))} />
            </label>
            <label className="field">
              <span>ط³ظٹط§ط³ط© ط§ظ„ظˆظ‚طھ ط§ظ„ط¥ط¶ط§ظپظٹ</span>
              <select value={draft.overtimePolicy} onChange={(e) => setDraft((current) => ({ ...current, overtimePolicy: (e.target.value as 'review_only' | 'disabled' | 'auto_approved') || 'review_only' }))}>
                <option value="review_only">ظ…ط±ط§ط¬ط¹ط© ظˆط§ط¹طھظ…ط§ط¯ ظ‚ط¨ظ„ ط§ظ„ط§ط­طھط³ط§ط¨</option>
                <option value="disabled">ط؛ظٹط± ظ…ط­طھط³ط¨</option>
                <option value="auto_approved">ظ…ط­طھط³ط¨ طھظ„ظ‚ط§ط¦ظٹظ‹ط§</option>
              </select>
            </label>
          </div>
        </Card>

        <Card title="ظ…ط±ط§ط¬ط¹ط© ظ‚ط¨ظ„ ط§ظ„ط­ظپط¸" description="طھظ†ط¨ظٹظ‡ط§طھ ط¨ط³ظٹط·ط© ظ„طھظ‚ظ„ظٹظ„ ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ظ†ط§ظ‚طµط©. ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ ط§ظ„طھظ†ط¸ظٹظ…ظٹط© ظ„ط§ طھظ…ظ†ط¹ ط§ظ„ط­ظپط¸.">
          {reviewWarnings.length ? (
            <ul className="muted" style={{ margin: 0, paddingInlineStart: 20 }}>
              {reviewWarnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          ) : <p className="muted">ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط£ط³ط§ط³ظٹط© ط¬ط§ظ‡ط²ط© ظ„ظ„ط­ظپط¸.</p>}
        </Card>

        <Card title="ظ…ظ„ط§ط­ط¸ط§طھ" description="ط£ظٹ ظ…ظ„ط§ط­ط¸ط§طھ ط¥ط¶ط§ظپظٹط© ط¹ظ„ظ‰ ظ…ظ„ظپ ط§ظ„ظ…ظˆط¸ظپ.">
          <div className="field field-wide">
            <span>ظ…ظ„ط§ط­ط¸ط§طھ</span>
            <textarea rows={4} value={draft.notes} onChange={(e) => setDraft((current) => ({ ...current, notes: e.target.value }))} />
          </div>

          {submitError ? <div className="error-box" style={{ marginTop: 12 }}>{submitError}</div> : null}

          <div className="actions compact-actions" style={{ marginTop: 16 }}>
            <Button type="button" variant="secondary" onClick={() => navigate('/hr/employees')} disabled={isBusy}>ط¥ظ„ط؛ط§ط،</Button>
            <Button type="submit" disabled={isBusy}>{isBusy ? 'ط¬ط§ط±ظٹ ط§ظ„ط­ظپط¸...' : 'ط­ظپط¸ ط§ظ„ظ…ظˆط¸ظپ'}</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

