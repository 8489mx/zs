import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import type { HrEmployee, HrLeaveRequest, HrLeaveType } from '@/types/domain';
import { useHrLeaveRequests, useHrLeaveTypes, useHrMutations, useHrWorkspace } from '@/features/hr/hooks/useHr';
import { HrLeavesCreateRequestCard } from '@/features/hr/pages/leaves/HrLeavesCreateRequestCard';
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
    setQuickFilter('pending');
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
        description="راجع الطلبات قيد المراجعة أولًا، ثم تابع الإجازات غير المدفوعة لأنها تؤثر على المرتبات."
        actions={(
          <div className="compact-actions">
            <Button type="button" onClick={() => setShowCreate((current) => !current)}>
              {showCreate ? 'إغلاق نموذج الطلب' : 'إضافة طلب إجازة'}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>فتح المرتبات</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>
          </div>
        )}
      />

      <Card title="تسلسل مراجعة الإجازات" description="استخدم الصفحة بهذا الترتيب حتى لا تدخل إجازة مؤثرة على المرتب بدون مراجعة.">
        <div className="form-grid">
          <div className="field"><strong>1. راجع قيد المراجعة</strong><span className="muted">اعتمد أو ارفض الطلبات الجديدة أولًا.</span></div>
          <div className="field"><strong>2. راجع غير المدفوعة</strong><span className="muted">الإجازات غير المدفوعة تظهر لاحقًا في مراجعة المرتبات.</span></div>
          <div className="field"><strong>3. استخدم الفلاتر</strong><span className="muted">ابحث بالموظف أو نوع الإجازة أو الفترة الزمنية.</span></div>
          <div className="field"><strong>4. انتقل للمرتبات</strong><span className="muted">بعد اعتماد الطلبات، راجع أثرها في صفحة المرتبات.</span></div>
        </div>
      </Card>

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

      <Card title="ملخص الطلبات" description="اضغط على الكروت لتصفية الجدول مباشرة.">
        <div className="stats-grid">
          <button className="stat-card" type="button" onClick={() => { setQuickFilter('all'); setPage(1); }} style={{ textAlign: 'right' }}><span>إجمالي الطلبات</span><strong>{summary.total}</strong></button>
          <button className="stat-card" type="button" onClick={() => { setQuickFilter('pending'); setStatusFilter(''); setPage(1); }} style={{ textAlign: 'right' }}><span>قيد المراجعة</span><strong>{summary.pending}</strong></button>
          <button className="stat-card" type="button" onClick={() => { setQuickFilter('approved'); setStatusFilter(''); setPage(1); }} style={{ textAlign: 'right' }}><span>معتمدة</span><strong>{summary.approved}</strong></button>
          <button className="stat-card" type="button" onClick={() => { setQuickFilter('rejected'); setStatusFilter(''); setPage(1); }} style={{ textAlign: 'right' }}><span>مرفوضة</span><strong>{summary.rejected}</strong></button>
          <button className="stat-card" type="button" onClick={() => { setQuickFilter('unpaid'); setStatusFilter(''); setPage(1); }} style={{ textAlign: 'right' }}><span>إجازات غير مدفوعة</span><strong>{summary.unpaid}</strong></button>
          <div className="stat-card"><span>ظاهر حاليًا</span><strong>{summary.visible}</strong></div>
        </div>
      </Card>

      <Card title="فلاتر الطلبات" description="الفلاتر هنا تضيق النتائج الظاهرة فقط، ويمكن تصفيرها بزر واحد.">
        <div className="compact-actions" style={{ marginBottom: 12 }}>
          <Button type="button" variant={quickFilter === 'pending' ? 'primary' : 'secondary'} onClick={() => { setQuickFilter('pending'); setStatusFilter(''); setPage(1); }}>قيد المراجعة</Button>
          <Button type="button" variant={quickFilter === 'unpaid' ? 'primary' : 'secondary'} onClick={() => { setQuickFilter('unpaid'); setStatusFilter(''); setPage(1); }}>غير مدفوعة</Button>
          <Button type="button" variant={quickFilter === 'all' ? 'primary' : 'secondary'} onClick={() => { setQuickFilter('all'); setPage(1); }}>كل الطلبات</Button>
          <Button type="button" variant="secondary" onClick={resetFilters}>مسح الفلاتر</Button>
        </div>
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
            <span>الحالة التفصيلية</span>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setQuickFilter('all'); setPage(1); }}>
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

      <Card title="طلبات الإجازة" description="الطلبات قيد المراجعة تظهر افتراضيًا حتى يكون القرار واضحًا وسريعًا.">
        <QueryFeedback
          isLoading={leaveRequestsQuery.isLoading}
          isError={leaveRequestsQuery.isError}
          error={leaveRequestsQuery.error}
          isEmpty={!requests.length || !visibleRequests.length}
          loadingText="جاري تحميل طلبات الإجازة..."
          errorTitle="تعذر تحميل طلبات الإجازة."
          emptyTitle={isSearchOrFilterActive ? 'لا توجد نتائج مطابقة للفلاتر الحالية.' : 'لا توجد طلبات إجازة حتى الآن.'}
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
                  const isPaid = !isUnpaidLeave(row);
                  return isPaid ? 'مدفوعة أو غير محددة' : 'غير مدفوعة';
                },
              },
              { key: 'notes', header: 'ملاحظات', cell: (row) => text(row.notes || row.reason || '') || '—' },
              {
                key: 'actions',
                header: 'إجراء',
                cell: (row) => {
                  const rowId = String(row.id);
                  const isUnpaid = isUnpaidLeave(row);
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
                      {isUnpaid ? <span className="muted small">تؤثر على المرتبات.</span> : null}
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
              {mutations.rejectLeaveRequest.isPending ? 'جاري الرفض...' : 'تأكيد الرفض'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => { setRejectTargetId(''); setRejectNotes(''); }}>
              إلغاء
            </Button>
          </div>
        </Card>
      ) : null}

      <Card title="ملاحظة تشغيلية">
        <p className="muted" style={{ margin: 0 }}>رصيد الإجازات غير متاح حاليًا من البيانات الحالية. راجع نوع الإجازة وحالة الدفع قبل اعتماد المرتبات.</p>
      </Card>
    </div>
  );
}
