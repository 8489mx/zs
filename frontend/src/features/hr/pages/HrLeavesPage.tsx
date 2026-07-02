import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import type { HrEmployee, HrLeaveRequest, HrLeaveType } from '@/types/domain';
import { useHrLeaveRequests, useHrLeaveTypes, useHrMutations, useHrWorkspace } from '@/features/hr/hooks/useHr';
import { HrLeavesCreateRequestCard } from '@/features/hr/pages/leaves/HrLeavesCreateRequestCard';
import { HrLeavesOperationalNote, HrLeavesWorkflowCard } from '@/features/hr/pages/leaves/HrLeavesStaticCards';
import {
  leaveStatusLabel,
  normalizeArabicDigits,
  normalizeDecimal,
  text,
  toDateOnly,
  todayDate,
} from '@/features/hr/pages/leaves/hr-leaves.helpers';

type LeaveFormState = {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  daysCount: string;
  reason: string;
  notes: string;
};

type QuickFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'unpaid';

export function HrLeavesPage() {
  const navigate = useNavigate();
  const mutations = useHrMutations();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('pending');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('all');
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rejectTargetId, setRejectTargetId] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');

  const [leaveForm, setLeaveForm] = useState<LeaveFormState>({
    employeeId: '',
    leaveTypeId: '',
    startDate: todayDate(),
    endDate: todayDate(),
    daysCount: '1',
    reason: '',
    notes: '',
  });

  const workspace = useHrWorkspace({ page: 1, pageSize: 250, search: '' });
  const leaveTypesQuery = useHrLeaveTypes({ page: 1, pageSize: 100, search: '' });
  const leaveRequestsQuery = useHrLeaveRequests({ search, status: statusFilter, page, pageSize });

  const employees = useMemo(() => (workspace.employees.data?.employees || []) as HrEmployee[], [workspace.employees.data?.employees]);
  const leaveTypes = useMemo(() => (leaveTypesQuery.data?.rows || []) as HrLeaveType[], [leaveTypesQuery.data?.rows]);
  const requests = useMemo(() => (leaveRequestsQuery.data?.requests || []) as HrLeaveRequest[], [leaveRequestsQuery.data?.requests]);

  const leaveTypeById = useMemo(() => {
    const map = new Map<string, HrLeaveType>();
    for (const type of leaveTypes) map.set(String(type.id), type);
    return map;
  }, [leaveTypes]);

  const leaveTypeByName = useMemo(() => {
    const map = new Map<string, HrLeaveType>();
    for (const type of leaveTypes) {
      const key = text(type.name).toLowerCase();
      if (key) map.set(key, type);
    }
    return map;
  }, [leaveTypes]);

  const isUnpaidLeave = useCallback((row: HrLeaveRequest) => {
    const byId = leaveTypeById.get(String(row.leaveTypeId || ''));
    const byName = leaveTypeByName.get(text(row.leaveTypeName || row.leaveType).toLowerCase());
    return byId?.isPaid === false || byName?.isPaid === false;
  }, [leaveTypeById, leaveTypeByName]);

  const visibleRequests = useMemo(() => {
    return requests.filter((row) => {
      const leaveTypeId = text(row.leaveTypeId);
      const status = text(row.status);
      if (leaveTypeFilter !== 'all' && leaveTypeId !== leaveTypeFilter) return false;
      if (quickFilter === 'pending' && status !== 'pending') return false;
      if (quickFilter === 'approved' && status !== 'approved') return false;
      if (quickFilter === 'rejected' && status !== 'rejected') return false;
      if (quickFilter === 'unpaid' && !isUnpaidLeave(row)) return false;

      const rowStartDate = toDateOnly(row.startDate);
      const rowEndDate = toDateOnly(row.endDate);
      if (fromDateFilter && rowEndDate && rowEndDate < fromDateFilter) return false;
      if (toDateFilter && rowStartDate && rowStartDate > toDateFilter) return false;
      return true;
    });
  }, [requests, leaveTypeFilter, quickFilter, fromDateFilter, toDateFilter, isUnpaidLeave]);

  const summary = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let unpaid = 0;

    for (const row of requests) {
      const status = text(row.status);
      if (status === 'pending') pending += 1;
      if (status === 'approved') approved += 1;
      if (status === 'rejected') rejected += 1;
      if (isUnpaidLeave(row)) unpaid += 1;
    }

    return {
      total: requests.length,
      visible: visibleRequests.length,
      pending,
      approved,
      rejected,
      unpaid,
    };
  }, [requests, visibleRequests.length, isUnpaidLeave]);

  const isSearchOrFilterActive = Boolean(search.trim()) || Boolean(statusFilter) || quickFilter !== 'all' || leaveTypeFilter !== 'all' || Boolean(fromDateFilter) || Boolean(toDateFilter);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setQuickFilter('all');
    setLeaveTypeFilter('all');
    setFromDateFilter('');
    setToDateFilter('');
    setPage(1);
  };

  const createLeaveRequest = async () => {
    const nextErrors: Record<string, string> = {};
    if (!leaveForm.employeeId) nextErrors.employeeId = 'ط§ط®طھظٹط§ط± ط§ظ„ظ…ظˆط¸ظپ ظ…ط·ظ„ظˆط¨.';
    if (!leaveForm.leaveTypeId) nextErrors.leaveTypeId = 'ظ†ظˆط¹ ط§ظ„ط¥ط¬ط§ط²ط© ظ…ط·ظ„ظˆط¨.';
    if (!leaveForm.startDate) nextErrors.startDate = 'طھط§ط±ظٹط® ط§ظ„ط¨ط¯ط§ظٹط© ظ…ط·ظ„ظˆط¨.';
    if (!leaveForm.endDate) nextErrors.endDate = 'طھط§ط±ظٹط® ط§ظ„ظ†ظ‡ط§ظٹط© ظ…ط·ظ„ظˆط¨.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const selectedType = leaveTypes.find((row) => String(row.id) === leaveForm.leaveTypeId);
    const normalizedDaysCount = normalizeDecimal(leaveForm.daysCount);
    await mutations.createLeaveRequest.mutateAsync({
      employeeId: Number(normalizeArabicDigits(leaveForm.employeeId)),
      leaveTypeId: Number(normalizeArabicDigits(leaveForm.leaveTypeId)),
      leaveType: text(selectedType?.name),
      startDate: toDateOnly(normalizeArabicDigits(leaveForm.startDate)),
      endDate: toDateOnly(normalizeArabicDigits(leaveForm.endDate)),
      daysCount: normalizedDaysCount ? Number(normalizedDaysCount) : undefined,
      reason: text(leaveForm.reason) || undefined,
      notes: text(leaveForm.notes) || undefined,
    });

    setLeaveForm({
      employeeId: '',
      leaveTypeId: '',
      startDate: todayDate(),
      endDate: todayDate(),
      daysCount: '1',
      reason: '',
      notes: '',
    });
    setErrors({});
    setShowCreate(false);
    setQuickFilter('pending');
  };

  const approveRequest = async (id: string) => {
    await mutations.approveLeaveRequest.mutate({ id, payload: {} });
  };

  const rejectRequest = async (id: string) => {
    const reason = text(rejectNotes);
    if (!reason) {
      setErrors((prev) => ({ ...prev, reject: 'ط³ط¨ط¨ ط§ظ„ط±ظپط¶ ظ…ط·ظ„ظˆط¨.' }));
      return;
    }
    await mutations.rejectLeaveRequest.mutateAsync({ id, payload: { decisionNotes: reason, notes: reason } });
    setRejectTargetId('');
    setRejectNotes('');
    setErrors((prev) => ({ ...prev, reject: '' }));
  };

  const cancelRequest = async (id: string) => {
    await mutations.cancelLeaveRequest.mutate({ id, payload: {} });
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
      <PageHeader
        title="ط§ظ„ط¥ط¬ط§ط²ط§طھ"
        description="ط±ط§ط¬ط¹ ط§ظ„ط·ظ„ط¨ط§طھ ظ‚ظٹط¯ ط§ظ„ظ…ط±ط§ط¬ط¹ط© ط£ظˆظ„ظ‹ط§طŒ ط«ظ… طھط§ط¨ط¹ ط§ظ„ط¥ط¬ط§ط²ط§طھ ط؛ظٹط± ط§ظ„ظ…ط¯ظپظˆط¹ط© ظ„ط£ظ†ظ‡ط§ طھط¤ط«ط± ط¹ظ„ظ‰ ط§ظ„ظ…ط±طھط¨ط§طھ."
        actions={(
          <div className="compact-actions">
            <Button type="button" onClick={() => setShowCreate((current) => !current)}>
              {showCreate ? 'ط¥ط؛ظ„ط§ظ‚ ظ†ظ…ظˆط°ط¬ ط§ظ„ط·ظ„ط¨' : 'ط¥ط¶ط§ظپط© ط·ظ„ط¨ ط¥ط¬ط§ط²ط©'}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>ظپطھط­ ط§ظ„ظ…ط±طھط¨ط§طھ</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/employees')}>ط±ط¬ظˆط¹ ظ„ظ„ظ…ظˆط¸ظپظٹظ†</Button>
          </div>
        )}
      />
{showCreate ? (
        <HrLeavesCreateRequestCard
          leaveForm={leaveForm}
          employees={employees}
          leaveTypes={leaveTypes}
          errors={errors}
          isPending={mutations.createLeaveRequest.isPending}
          onLeaveFormChange={(updater) => setLeaveForm((prev) => updater(prev))}
          onCreate={() => {
            void createLeaveRequest();
          }}
          onClose={() => {
            setShowCreate(false);
            setLeaveForm((prev) => ({ ...prev, startDate: todayDate(), endDate: todayDate() }));
          }}
        />
      ) : null}

      <FormSection title="ظ…ظ„ط®طµ ط§ظ„ط·ظ„ط¨ط§طھ" description="ط§ط¶ط؛ط· ط¹ظ„ظ‰ ط§ظ„ظƒط±ظˆطھ ظ„طھطµظپظٹط© ط§ظ„ط¬ط¯ظˆظ„ ظ…ط¨ط§ط´ط±ط©.">
        <div className="stats-grid">
          <button className="stat-card" type="button" onClick={() => { setQuickFilter('all'); setPage(1); }} style={{ textAlign: 'right' }}><span>ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط·ظ„ط¨ط§طھ</span><strong>{summary.total}</strong></button>
          <button className="stat-card" type="button" onClick={() => { setQuickFilter('pending'); setStatusFilter(''); setPage(1); }} style={{ textAlign: 'right' }}><span>ظ‚ظٹط¯ ط§ظ„ظ…ط±ط§ط¬ط¹ط©</span><strong>{summary.pending}</strong></button>
          <button className="stat-card" type="button" onClick={() => { setQuickFilter('approved'); setStatusFilter(''); setPage(1); }} style={{ textAlign: 'right' }}><span>ظ…ط¹طھظ…ط¯ط©</span><strong>{summary.approved}</strong></button>
          <button className="stat-card" type="button" onClick={() => { setQuickFilter('rejected'); setStatusFilter(''); setPage(1); }} style={{ textAlign: 'right' }}><span>ظ…ط±ظپظˆط¶ط©</span><strong>{summary.rejected}</strong></button>
          <button className="stat-card" type="button" onClick={() => { setQuickFilter('unpaid'); setStatusFilter(''); setPage(1); }} style={{ textAlign: 'right' }}><span>ط¥ط¬ط§ط²ط§طھ ط؛ظٹط± ظ…ط¯ظپظˆط¹ط©</span><strong>{summary.unpaid}</strong></button>
          <div className="stat-card"><span>ط¸ط§ظ‡ط± ط­ط§ظ„ظٹظ‹ط§</span><strong>{summary.visible}</strong></div>
        </div>
      </FormSection>

      <FormSection title="ظپظ„ط§طھط± ط§ظ„ط·ظ„ط¨ط§طھ" description="ط§ظ„ظپظ„ط§طھط± ظ‡ظ†ط§ طھط¶ظٹظ‚ ط§ظ„ظ†طھط§ط¦ط¬ ط§ظ„ط¸ط§ظ‡ط±ط© ظپظ‚ط·طŒ ظˆظٹظ…ظƒظ† طھطµظپظٹط±ظ‡ط§ ط¨ط²ط± ظˆط§ط­ط¯.">
        <div className="compact-actions" style={{ marginBottom: 12 }}>
          <Button type="button" variant={quickFilter === 'pending' ? 'primary' : 'secondary'} onClick={() => { setQuickFilter('pending'); setStatusFilter(''); setPage(1); }}>ظ‚ظٹط¯ ط§ظ„ظ…ط±ط§ط¬ط¹ط©</Button>
          <Button type="button" variant={quickFilter === 'unpaid' ? 'primary' : 'secondary'} onClick={() => { setQuickFilter('unpaid'); setStatusFilter(''); setPage(1); }}>ط؛ظٹط± ظ…ط¯ظپظˆط¹ط©</Button>
          <Button type="button" variant={quickFilter === 'all' ? 'primary' : 'secondary'} onClick={() => { setQuickFilter('all'); setPage(1); }}>ظƒظ„ ط§ظ„ط·ظ„ط¨ط§طھ</Button>
          <Button type="button" variant="secondary" onClick={resetFilters}>ظ…ط³ط­ ط§ظ„ظپظ„ط§طھط±</Button>
        </div>
        <div className="form-grid">
          <div className="field field-wide">
            <span>ط¨ط­ط« ط§ظ„ظ…ظˆط¸ظپ</span>
            <SearchToolbar
              search={search}
              onSearchChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              searchPlaceholder="ط¨ط­ط« ط¨ط§ط³ظ… ط§ظ„ظ…ظˆط¸ظپ ط£ظˆ ظƒظˆط¯ ط§ظ„ظ…ظˆط¸ظپ"
              inputAriaLabel="ط¨ط­ط« ط·ظ„ط¨ط§طھ ط§ظ„ط¥ط¬ط§ط²ط§طھ"
            />
          </div>
          <label className="field">
            <span>ط§ظ„ط­ط§ظ„ط© ط§ظ„طھظپطµظٹظ„ظٹط©</span>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setQuickFilter('all'); setPage(1); }}>
              <option value="">ط§ظ„ظƒظ„</option>
              <option value="pending">ظ‚ظٹط¯ ط§ظ„ظ…ط±ط§ط¬ط¹ط©</option>
              <option value="approved">ظ…ط¹طھظ…ط¯ط©</option>
              <option value="rejected">ظ…ط±ظپظˆط¶ط©</option>
              <option value="cancelled">ظ…ظ„ط؛ط§ط©</option>
            </select>
          </label>
          <label className="field">
            <span>ظ†ظˆط¹ ط§ظ„ط¥ط¬ط§ط²ط©</span>
            <select value={leaveTypeFilter} onChange={(event) => { setLeaveTypeFilter(event.target.value); setPage(1); }}>
              <option value="all">ط§ظ„ظƒظ„</option>
              {leaveTypes.map((type) => <option key={type.id} value={String(type.id)}>{text(type.name) || 'â€”'}</option>)}
            </select>
          </label>
          <label className="field">
            <span>ظ…ظ† طھط§ط±ظٹط®</span>
            <input type="date" value={fromDateFilter} onChange={(event) => { setFromDateFilter(normalizeArabicDigits(event.target.value)); setPage(1); }} />
          </label>
          <label className="field">
            <span>ط¥ظ„ظ‰ طھط§ط±ظٹط®</span>
            <input type="date" value={toDateFilter} onChange={(event) => { setToDateFilter(normalizeArabicDigits(event.target.value)); setPage(1); }} />
          </label>
        </div>
      </FormSection>

      <FormSection title="ط·ظ„ط¨ط§طھ ط§ظ„ط¥ط¬ط§ط²ط©" description="ط§ظ„ط·ظ„ط¨ط§طھ ظ‚ظٹط¯ ط§ظ„ظ…ط±ط§ط¬ط¹ط© طھط¸ظ‡ط± ط§ظپطھط±ط§ط¶ظٹظ‹ط§ ط­طھظ‰ ظٹظƒظˆظ† ط§ظ„ظ‚ط±ط§ط± ظˆط§ط¶ط­ظ‹ط§ ظˆط³ط±ظٹط¹ظ‹ط§.">
        <QueryFeedback
          isLoading={leaveRequestsQuery.isLoading}
          isError={leaveRequestsQuery.isError}
          error={leaveRequestsQuery.error}
          isEmpty={!requests.length || !visibleRequests.length}
          loadingText="ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ط·ظ„ط¨ط§طھ ط§ظ„ط¥ط¬ط§ط²ط©..."
          errorTitle="طھط¹ط°ط± طھط­ظ…ظٹظ„ ط·ظ„ط¨ط§طھ ط§ظ„ط¥ط¬ط§ط²ط©."
          emptyTitle={isSearchOrFilterActive ? 'ظ„ط§ طھظˆط¬ط¯ ظ†طھط§ط¦ط¬ ظ…ط·ط§ط¨ظ‚ط© ظ„ظ„ظپظ„ط§طھط± ط§ظ„ط­ط§ظ„ظٹط©.' : 'ظ„ط§ طھظˆط¬ط¯ ط·ظ„ط¨ط§طھ ط¥ط¬ط§ط²ط© ط­طھظ‰ ط§ظ„ط¢ظ†.'}
          emptyHint={isSearchOrFilterActive ? 'ط¬ط±ظ‘ط¨ طھط¹ط¯ظٹظ„ ط§ظ„ظپظ„ط§طھط± ط£ظˆ ط¥ط²ط§ظ„ط© ط§ظ„ط¨ط­ط«.' : 'ط§ط¨ط¯ط£ ط¨ط¥ط¶ط§ظپط© ط·ظ„ط¨ ط¥ط¬ط§ط²ط© ط¬ط¯ظٹط¯ ظ…ظ† ط§ظ„ط²ط± ط£ط¹ظ„ظ‰ ط§ظ„طµظپط­ط©.'}
        >
          <DataTable
            rows={visibleRequests}
            rowKey={(row) => String(row.id)}
            density="compact"
            pagination={{
              page,
              pageSize,
              totalItems: visibleRequests.length,
              onPageChange: setPage,
              onPageSizeChange: (next) => {
                setPageSize(next);
                setPage(1);
              },
              itemLabel: 'ط·ظ„ط¨',
            }}
            columns={[
              { key: 'employeeNo', header: 'ظƒظˆط¯ ط§ظ„ظ…ظˆط¸ظپ', cell: (row) => text(row.employeeNo) || 'â€”' },
              { key: 'employeeName', header: 'ط§ط³ظ… ط§ظ„ظ…ظˆط¸ظپ', cell: (row) => text(row.employeeName) || 'â€”' },
              { key: 'leaveType', header: 'ظ†ظˆط¹ ط§ظ„ط¥ط¬ط§ط²ط©', cell: (row) => text(row.leaveTypeName || row.leaveType) || 'â€”' },
              { key: 'startDate', header: 'ظ…ظ† طھط§ط±ظٹط®', cell: (row) => toDateOnly(row.startDate) || 'â€”' },
              { key: 'endDate', header: 'ط¥ظ„ظ‰ طھط§ط±ظٹط®', cell: (row) => toDateOnly(row.endDate) || 'â€”' },
              { key: 'daysCount', header: 'ط¹ط¯ط¯ ط§ظ„ط£ظٹط§ظ…', cell: (row) => Number(row.daysCount || 0).toFixed(2) },
              { key: 'status', header: 'ط§ظ„ط­ط§ظ„ط©', cell: (row) => leaveStatusLabel(row.status) },
              { key: 'isPaid', header: 'ظ…ط¯ظپظˆط¹ط© / ط؛ظٹط± ظ…ط¯ظپظˆط¹ط©', cell: (row) => (!isUnpaidLeave(row) ? 'ظ…ط¯ظپظˆط¹ط© ط£ظˆ ط؛ظٹط± ظ…ط­ط¯ط¯ط©' : 'ط؛ظٹط± ظ…ط¯ظپظˆط¹ط©') },
              { key: 'notes', header: 'ظ…ظ„ط§ط­ط¸ط§طھ', cell: (row) => text(row.notes || row.reason || '') || 'â€”' },
              {
                key: 'actions',
                header: 'ط¥ط¬ط±ط§ط،',
                cell: (row) => {
                  const rowId = String(row.id);
                  const isUnpaid = isUnpaidLeave(row);
                  return (
                    <div className="actions compact-actions">
                      {row.status === 'pending' ? <Button type="button" variant="secondary" onClick={() => void approveRequest(rowId)} disabled={mutations.approveLeaveRequest.isPending}>ط§ط¹طھظ…ط§ط¯</Button> : null}
                      {row.status === 'pending' ? <Button type="button" variant="secondary" onClick={() => { setRejectTargetId(rowId); setRejectNotes(''); }} disabled={mutations.rejectLeaveRequest.isPending}>ط±ظپط¶</Button> : null}
                      {row.status !== 'cancelled' ? <Button type="button" variant="secondary" onClick={() => void cancelRequest(rowId)} disabled={mutations.cancelLeaveRequest.isPending}>ط¥ظ„ط؛ط§ط،</Button> : null}
                      {isUnpaid ? <span className="muted small">طھط¤ط«ط± ط¹ظ„ظ‰ ط§ظ„ظ…ط±طھط¨ط§طھ.</span> : null}
                    </div>
                  );
                },
              },
            ]}
          />
        </QueryFeedback>
      </FormSection>

      {rejectTargetId ? (
        <FormSection title="ط³ط¨ط¨ ط±ظپط¶ ط§ظ„ط·ظ„ط¨">
          <div className="form-grid">
            <label className="field field-wide">
              <span>ط³ط¨ط¨ ط§ظ„ط±ظپط¶</span>
              <textarea rows={2} value={rejectNotes} onChange={(event) => setRejectNotes(event.target.value)} />
              {errors.reject ? <small className="field-error">{errors.reject}</small> : null}
            </label>
          </div>
          <div className="actions compact-actions">
            <Button type="button" onClick={() => void rejectRequest(rejectTargetId)} disabled={mutations.rejectLeaveRequest.isPending}>
              {mutations.rejectLeaveRequest.isPending ? 'ط¬ط§ط±ظٹ ط§ظ„ط±ظپط¶...' : 'طھط£ظƒظٹط¯ ط§ظ„ط±ظپط¶'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => { setRejectTargetId(''); setRejectNotes(''); }}>ط¥ظ„ط؛ط§ط،</Button>
          </div>
        </FormSection>
      ) : null}

      <HrLeavesOperationalNote />

          <HrLeavesWorkflowCard />
      </main>
    </div>
  );
}

