import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { getErrorMessage } from '@/lib/errors';
import type { HrEmployee, HrLeaveRequest, HrLeaveType } from '@/types/domain';
import { useHrLeaveRequests, useHrLeaveTypes, useHrMutations, useHrWorkspace } from '@/features/hr/hooks/useHr';

type LeaveFormState = {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  daysCount: string;
  reason: string;
  notes: string;
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function text(value: unknown) {
  return String(value || '').trim();
}

function normalizeArabicDigits(value: string) {
  return String(value || '')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

function normalizeDecimal(value: string) {
  return normalizeArabicDigits(value).replace(/[،,]/g, '.').trim();
}

function toDateOnly(value: string) {
  return text(value).slice(0, 10);
}

function employeeDisplay(row: HrEmployee) {
  return text(row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim()) || '—';
}

function calculateInclusiveDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) return '';
  const from = new Date(`${startDate}T00:00:00`);
  const to = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return '';
  const days = Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  return String(days);
}

function leaveStatusLabel(value: unknown) {
  const status = text(value);
  if (status === 'pending') return 'قيد المراجعة';
  if (status === 'approved') return 'معتمدة';
  if (status === 'rejected') return 'مرفوضة';
  if (status === 'cancelled') return 'ملغاة';
  return status || 'غير محدد';
}

export function HrLeavesPage() {
  const navigate = useNavigate();
  const mutations = useHrMutations();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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

  const visibleRequests = useMemo(() => {
    return requests.filter((row) => {
      const leaveTypeId = text(row.leaveTypeId);
      if (leaveTypeFilter !== 'all' && leaveTypeId !== leaveTypeFilter) return false;

      const rowStartDate = toDateOnly(row.startDate);
      const rowEndDate = toDateOnly(row.endDate);
      if (fromDateFilter && rowEndDate && rowEndDate < fromDateFilter) return false;
      if (toDateFilter && rowStartDate && rowStartDate > toDateFilter) return false;
      return true;
    });
  }, [requests, leaveTypeFilter, fromDateFilter, toDateFilter]);

  const summary = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let unpaid = 0;

    for (const row of visibleRequests) {
      const status = text(row.status);
      if (status === 'pending') pending += 1;
      if (status === 'approved') approved += 1;
      if (status === 'rejected') rejected += 1;

      const byId = leaveTypeById.get(String(row.leaveTypeId || ''));
      const byName = leaveTypeByName.get(text(row.leaveTypeName || row.leaveType).toLowerCase());
      const isUnpaid = byId?.isPaid === false || byName?.isPaid === false;
      if (isUnpaid) unpaid += 1;
    }

    return {
      total: visibleRequests.length,
      pending,
      approved,
      rejected,
      unpaid,
    };
  }, [visibleRequests, leaveTypeById, leaveTypeByName]);

  const isSearchOrFilterActive = Boolean(search.trim()) || Boolean(statusFilter) || leaveTypeFilter !== 'all' || Boolean(fromDateFilter) || Boolean(toDateFilter);

  const createLeaveRequest = async () => {
    const nextErrors: Record<string, string> = {};
    if (!leaveForm.employeeId) nextErrors.employeeId = 'اختيار الموظف مطلوب.';
    if (!leaveForm.leaveTypeId) nextErrors.leaveTypeId = 'نوع الإجازة مطلوب.';
    if (!leaveForm.startDate) nextErrors.startDate = 'تاريخ البداية مطلوب.';
    if (!leaveForm.endDate) nextErrors.endDate = 'تاريخ النهاية مطلوب.';
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
  };

  const approveRequest = async (id: string) => {
    await mutations.approveLeaveRequest.mutate({ id, payload: {} });
  };

  const rejectRequest = async (id: string) => {
    const reason = text(rejectNotes);
    if (!reason) {
      setErrors((prev) => ({ ...prev, reject: 'سبب الرفض مطلوب.' }));
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
      <PageHeader
        title="الإجازات"
        description="مساحة العمل اليومية لمراجعة طلبات الإجازات والاعتماد والمتابعة، مع توضيح الحالات التي تحتاج مراجعة."
        actions={(
          <div className="compact-actions">
            <Button type="button" onClick={() => setShowCreate((current) => !current)}>
              {showCreate ? 'إغلاق نموذج الطلب' : 'إضافة طلب إجازة'}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>
          </div>
        )}
      />

      {showCreate ? (
        <Card title="إضافة طلب إجازة">
          <div className="form-grid">
            <label className="field">
              <span>الموظف</span>
              <select value={leaveForm.employeeId} onChange={(event) => setLeaveForm((prev) => ({ ...prev, employeeId: normalizeArabicDigits(event.target.value) }))}>
                <option value="">اختر الموظف</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employeeDisplay(employee)}</option>)}
              </select>
              {errors.employeeId ? <small className="field-error">{errors.employeeId}</small> : null}
            </label>
            <label className="field">
              <span>نوع الإجازة</span>
              <select value={leaveForm.leaveTypeId} onChange={(event) => setLeaveForm((prev) => ({ ...prev, leaveTypeId: normalizeArabicDigits(event.target.value) }))}>
                <option value="">اختر النوع</option>
                {leaveTypes.map((type) => <option key={type.id} value={type.id}>{text(type.name) || '—'}</option>)}
              </select>
              {errors.leaveTypeId ? <small className="field-error">{errors.leaveTypeId}</small> : null}
            </label>
            <label className="field">
              <span>من تاريخ</span>
              <input
                type="date"
                value={leaveForm.startDate}
                onChange={(event) => {
                  const startDate = normalizeArabicDigits(event.target.value);
                  setLeaveForm((prev) => ({ ...prev, startDate, daysCount: calculateInclusiveDays(startDate, prev.endDate) || prev.daysCount }));
                }}
              />
              {errors.startDate ? <small className="field-error">{errors.startDate}</small> : null}
            </label>
            <label className="field">
              <span>إلى تاريخ</span>
              <input
                type="date"
                value={leaveForm.endDate}
                onChange={(event) => {
                  const endDate = normalizeArabicDigits(event.target.value);
                  setLeaveForm((prev) => ({ ...prev, endDate, daysCount: calculateInclusiveDays(prev.startDate, endDate) || prev.daysCount }));
                }}
              />
              {errors.endDate ? <small className="field-error">{errors.endDate}</small> : null}
            </label>
            <label className="field">
              <span>عدد الأيام</span>
              <input type="text" inputMode="decimal" value={leaveForm.daysCount} onChange={(event) => setLeaveForm((prev) => ({ ...prev, daysCount: event.target.value }))} />
            </label>
            <label className="field field-wide">
              <span>السبب</span>
              <input value={leaveForm.reason} onChange={(event) => setLeaveForm((prev) => ({ ...prev, reason: event.target.value }))} />
            </label>
            <label className="field field-wide">
              <span>الملاحظات</span>
              <textarea rows={2} value={leaveForm.notes} onChange={(event) => setLeaveForm((prev) => ({ ...prev, notes: event.target.value }))} />
            </label>
          </div>
          <div className="actions compact-actions">
            <Button type="button" onClick={createLeaveRequest} disabled={mutations.createLeaveRequest.isPending}>
              {mutations.createLeaveRequest.isPending ? 'جاري التسجيل...' : 'تسجيل الطلب'}
            </Button>
          </div>
          {mutations.createLeaveRequest.isError ? <p className="muted">{getErrorMessage(mutations.createLeaveRequest.error, 'تعذر تسجيل طلب الإجازة.')}</p> : null}
        </Card>
      ) : null}

      <Card title="فلاتر الطلبات">
        <div className="form-grid">
          <div className="field field-wide">
            <span>بحث الموظف</span>
            <SearchToolbar
              search={search}
              onSearchChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              searchPlaceholder="بحث باسم الموظف أو كود الموظف"
              inputAriaLabel="بحث طلبات الإجازات"
            />
          </div>
          <label className="field">
            <span>الحالة</span>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
              <option value="">الكل</option>
              <option value="pending">قيد المراجعة</option>
              <option value="approved">معتمدة</option>
              <option value="rejected">مرفوضة</option>
              <option value="cancelled">ملغاة</option>
            </select>
          </label>
          <label className="field">
            <span>نوع الإجازة</span>
            <select value={leaveTypeFilter} onChange={(event) => { setLeaveTypeFilter(event.target.value); setPage(1); }}>
              <option value="all">الكل</option>
              {leaveTypes.map((type) => <option key={type.id} value={String(type.id)}>{text(type.name) || '—'}</option>)}
            </select>
          </label>
          <label className="field">
            <span>من تاريخ</span>
            <input type="date" value={fromDateFilter} onChange={(event) => { setFromDateFilter(normalizeArabicDigits(event.target.value)); setPage(1); }} />
          </label>
          <label className="field">
            <span>إلى تاريخ</span>
            <input type="date" value={toDateFilter} onChange={(event) => { setToDateFilter(normalizeArabicDigits(event.target.value)); setPage(1); }} />
          </label>
        </div>
      </Card>

      <Card title="ملخص الطلبات">
        <div className="stats-grid">
          <div className="stat-card"><span>إجمالي الطلبات</span><strong>{summary.total}</strong></div>
          <div className="stat-card"><span>قيد المراجعة</span><strong>{summary.pending}</strong></div>
          <div className="stat-card"><span>معتمدة</span><strong>{summary.approved}</strong></div>
          <div className="stat-card"><span>مرفوضة</span><strong>{summary.rejected}</strong></div>
          <div className="stat-card"><span>إجازات غير مدفوعة / تحتاج مراجعة</span><strong>{summary.unpaid}</strong></div>
        </div>
      </Card>

      <Card title="طلبات الإجازات">
        <QueryFeedback
          isLoading={leaveRequestsQuery.isLoading}
          isError={leaveRequestsQuery.isError}
          error={leaveRequestsQuery.error}
          isEmpty={!requests.length || !visibleRequests.length}
          loadingText="جاري تحميل طلبات الإجازات..."
          errorTitle="تعذر تحميل طلبات الإجازات"
          emptyTitle={isSearchOrFilterActive ? 'لا توجد نتائج مطابقة للبحث أو الفلاتر الحالية.' : 'لا توجد طلبات إجازة حتى الآن.'}
          emptyHint={isSearchOrFilterActive ? 'جرّب تعديل الفلاتر أو إزالة البحث.' : 'ابدأ بإضافة طلب إجازة جديد من الزر أعلى الصفحة.'}
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
              itemLabel: 'طلب',
            }}
            columns={[
              { key: 'employeeNo', header: 'كود الموظف', cell: (row) => text(row.employeeNo) || '—' },
              { key: 'employeeName', header: 'اسم الموظف', cell: (row) => text(row.employeeName) || '—' },
              { key: 'leaveType', header: 'نوع الإجازة', cell: (row) => text(row.leaveTypeName || row.leaveType) || '—' },
              { key: 'startDate', header: 'من تاريخ', cell: (row) => toDateOnly(row.startDate) || '—' },
              { key: 'endDate', header: 'إلى تاريخ', cell: (row) => toDateOnly(row.endDate) || '—' },
              { key: 'daysCount', header: 'عدد الأيام', cell: (row) => Number(row.daysCount || 0).toFixed(2) },
              { key: 'status', header: 'الحالة', cell: (row) => leaveStatusLabel(row.status) },
              {
                key: 'isPaid',
                header: 'مدفوعة / غير مدفوعة',
                cell: (row) => {
                  const byId = leaveTypeById.get(String(row.leaveTypeId || ''));
                  const byName = leaveTypeByName.get(text(row.leaveTypeName || row.leaveType).toLowerCase());
                  const isPaid = byId?.isPaid ?? byName?.isPaid;
                  if (isPaid === true) return 'مدفوعة';
                  if (isPaid === false) return 'غير مدفوعة';
                  return 'غير محدد';
                },
              },
              { key: 'notes', header: 'ملاحظات', cell: (row) => text(row.notes || row.reason || '') || '—' },
              {
                key: 'actions',
                header: 'إجراء',
                cell: (row) => {
                  const rowId = String(row.id);
                  const byId = leaveTypeById.get(String(row.leaveTypeId || ''));
                  const byName = leaveTypeByName.get(text(row.leaveTypeName || row.leaveType).toLowerCase());
                  const isUnpaid = byId?.isPaid === false || byName?.isPaid === false;
                  return (
                    <div className="actions compact-actions">
                      {row.status === 'pending' ? (
                        <Button type="button" variant="secondary" onClick={() => void approveRequest(rowId)} disabled={mutations.approveLeaveRequest.isPending}>
                          اعتماد
                        </Button>
                      ) : null}
                      {row.status === 'pending' ? (
                        <Button type="button" variant="secondary" onClick={() => { setRejectTargetId(rowId); setRejectNotes(''); }} disabled={mutations.rejectLeaveRequest.isPending}>
                          رفض
                        </Button>
                      ) : null}
                      {row.status !== 'cancelled' ? (
                        <Button type="button" variant="secondary" onClick={() => void cancelRequest(rowId)} disabled={mutations.cancelLeaveRequest.isPending}>
                          إلغاء
                        </Button>
                      ) : null}
                      {isUnpaid ? <span className="muted small">الإجازة غير المدفوعة قد تحتاج مراجعة في المرتب.</span> : null}
                    </div>
                  );
                },
              },
            ]}
          />
        </QueryFeedback>
      </Card>

      {rejectTargetId ? (
        <Card title="سبب رفض الطلب">
          <div className="form-grid">
            <label className="field field-wide">
              <span>سبب الرفض</span>
              <textarea rows={2} value={rejectNotes} onChange={(event) => setRejectNotes(event.target.value)} />
              {errors.reject ? <small className="field-error">{errors.reject}</small> : null}
            </label>
          </div>
          <div className="actions compact-actions">
            <Button type="button" onClick={() => void rejectRequest(rejectTargetId)} disabled={mutations.rejectLeaveRequest.isPending}>
              {mutations.rejectLeaveRequest.isPending ? 'جارٍ الرفض...' : 'تأكيد الرفض'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => { setRejectTargetId(''); setRejectNotes(''); }}>
              إلغاء
            </Button>
          </div>
        </Card>
      ) : null}

      <Card title="مراجعة رصيد الإجازات">
        <p className="muted" style={{ margin: 0 }}>رصيد الإجازات غير متاح حاليًا من البيانات الحالية.</p>
      </Card>
    </div>
  );
}

