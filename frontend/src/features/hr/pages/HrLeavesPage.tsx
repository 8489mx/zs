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

type LeaveTypeFormState = {
  name: string;
  code: string;
  description: string;
  isPaid: boolean;
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function text(value: unknown) {
  return String(value || '').trim();
}

function employeeDisplay(row: HrEmployee) {
  return text(row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim()) || '—';
}

function calculateInclusiveDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) return '';
  const from = new Date(`${startDate}T00:00:00Z`);
  const to = new Date(`${endDate}T00:00:00Z`);
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
  return 'غير محدد';
}

export function HrLeavesPage() {
  const navigate = useNavigate();
  const mutations = useHrMutations();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [leaveForm, setLeaveForm] = useState<LeaveFormState>({
    employeeId: '',
    leaveTypeId: '',
    startDate: todayDate(),
    endDate: todayDate(),
    daysCount: '1',
    reason: '',
    notes: '',
  });

  const [leaveTypeForm, setLeaveTypeForm] = useState<LeaveTypeFormState>({
    name: '',
    code: '',
    description: '',
    isPaid: true,
  });

  const workspace = useHrWorkspace({ page: 1, pageSize: 200, search: '' });
  const leaveTypesQuery = useHrLeaveTypes({ page: 1, pageSize: 100, search: '' });
  const leaveRequestsQuery = useHrLeaveRequests({ search, status: statusFilter, page, pageSize });

  const employees = useMemo(() => (workspace.employees.data?.employees || []) as HrEmployee[], [workspace.employees.data?.employees]);
  const leaveTypes = useMemo(() => (leaveTypesQuery.data?.rows || []) as HrLeaveType[], [leaveTypesQuery.data?.rows]);
  const requests = useMemo(() => (leaveRequestsQuery.data?.requests || []) as HrLeaveRequest[], [leaveRequestsQuery.data?.requests]);
  const totalItems = Number(leaveRequestsQuery.data?.summary?.totalItems || requests.length || 0);

  const createLeaveRequest = async () => {
    const nextErrors: Record<string, string> = {};
    if (!leaveForm.employeeId) nextErrors.employeeId = 'اختيار الموظف مطلوب.';
    if (!leaveForm.leaveTypeId) nextErrors.leaveTypeId = 'نوع الإجازة مطلوب.';
    if (!leaveForm.startDate) nextErrors.startDate = 'تاريخ البداية مطلوب.';
    if (!leaveForm.endDate) nextErrors.endDate = 'تاريخ النهاية مطلوب.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const selectedType = leaveTypes.find((row) => String(row.id) === leaveForm.leaveTypeId);
    await mutations.createLeaveRequest.mutateAsync({
      employeeId: Number(leaveForm.employeeId),
      leaveTypeId: Number(leaveForm.leaveTypeId),
      leaveType: text(selectedType?.name),
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      daysCount: leaveForm.daysCount ? Number(leaveForm.daysCount) : undefined,
      reason: leaveForm.reason || undefined,
      notes: leaveForm.notes || undefined,
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
  };

  const createLeaveType = async () => {
    if (!text(leaveTypeForm.name)) return;
    await mutations.saveLeaveType.mutateAsync({
      payload: {
        name: leaveTypeForm.name,
        code: leaveTypeForm.code || undefined,
        description: leaveTypeForm.description || undefined,
        isPaid: leaveTypeForm.isPaid,
        isActive: true,
      },
    });
    setLeaveTypeForm({ name: '', code: '', description: '', isPaid: true });
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="الإجازات"
        description="تسجيل ومراجعة طلبات إجازات الموظفين بطريقة بسيطة بدون تعقيد."
        actions={<Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>}
      />

      <Card title="طلب إجازة جديد">
        <div className="form-grid">
          <label className="field">
            <span>الموظف *</span>
            <select value={leaveForm.employeeId} onChange={(event) => setLeaveForm((prev) => ({ ...prev, employeeId: event.target.value }))}>
              <option value="">اختر الموظف</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employeeDisplay(employee)}</option>)}
            </select>
            {errors.employeeId ? <small className="field-error">{errors.employeeId}</small> : null}
          </label>
          <label className="field">
            <span>نوع الإجازة *</span>
            <select value={leaveForm.leaveTypeId} onChange={(event) => setLeaveForm((prev) => ({ ...prev, leaveTypeId: event.target.value }))}>
              <option value="">اختر النوع</option>
              {leaveTypes.map((type) => <option key={type.id} value={type.id}>{text(type.name) || '—'}</option>)}
            </select>
            {errors.leaveTypeId ? <small className="field-error">{errors.leaveTypeId}</small> : null}
          </label>
          <label className="field">
            <span>من تاريخ *</span>
            <input
              type="date"
              value={leaveForm.startDate}
              onChange={(event) => {
                const startDate = event.target.value;
                setLeaveForm((prev) => ({ ...prev, startDate, daysCount: calculateInclusiveDays(startDate, prev.endDate) || prev.daysCount }));
              }}
            />
            {errors.startDate ? <small className="field-error">{errors.startDate}</small> : null}
          </label>
          <label className="field">
            <span>إلى تاريخ *</span>
            <input
              type="date"
              value={leaveForm.endDate}
              onChange={(event) => {
                const endDate = event.target.value;
                setLeaveForm((prev) => ({ ...prev, endDate, daysCount: calculateInclusiveDays(prev.startDate, endDate) || prev.daysCount }));
              }}
            />
            {errors.endDate ? <small className="field-error">{errors.endDate}</small> : null}
          </label>
          <label className="field">
            <span>عدد الأيام</span>
            <input type="number" min="0.5" step="0.5" value={leaveForm.daysCount} onChange={(event) => setLeaveForm((prev) => ({ ...prev, daysCount: event.target.value }))} />
          </label>
          <label className="field field-wide">
            <span>السبب</span>
            <input value={leaveForm.reason} onChange={(event) => setLeaveForm((prev) => ({ ...prev, reason: event.target.value }))} />
          </label>
          <label className="field field-wide">
            <span>ملاحظات</span>
            <textarea rows={2} value={leaveForm.notes} onChange={(event) => setLeaveForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </label>
        </div>
        <div className="actions compact-actions">
          <Button type="button" onClick={createLeaveRequest} disabled={mutations.createLeaveRequest.isPending}>
            {mutations.createLeaveRequest.isPending ? 'جاري التسجيل...' : 'تسجيل الطلب'}
          </Button>
        </div>
        {mutations.createLeaveRequest.isError ? <p className="muted">{getErrorMessage(mutations.createLeaveRequest.error)}</p> : null}
      </Card>

      <Card title="طلبات الإجازات">
        <div className="compact-actions" style={{ marginBottom: 12 }}>
          <SearchToolbar
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            searchPlaceholder="بحث باسم الموظف أو كود الموظف"
            inputAriaLabel="بحث طلبات الإجازات"
          />
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} aria-label="تصفية الحالة">
            <option value="">الكل</option>
            <option value="pending">قيد المراجعة</option>
            <option value="approved">معتمدة</option>
            <option value="rejected">مرفوضة</option>
            <option value="cancelled">ملغاة</option>
          </select>
        </div>
        <QueryFeedback
          isLoading={leaveRequestsQuery.isLoading}
          isError={leaveRequestsQuery.isError}
          error={leaveRequestsQuery.error}
          isEmpty={!requests.length}
          loadingText="جارٍ تحميل طلبات الإجازات..."
          errorTitle="تعذر تحميل طلبات الإجازات"
          emptyTitle="لا توجد طلبات إجازات مسجلة."
        >
          <DataTable
            rows={requests}
            rowKey={(row) => String(row.id)}
            density="compact"
            pagination={{
              page,
              pageSize,
              totalItems,
              onPageChange: setPage,
              onPageSizeChange: (next) => {
                setPageSize(next);
                setPage(1);
              },
              itemLabel: 'طلب',
            }}
            columns={[
              { key: 'employeeNo', header: 'كود الموظف', cell: (row) => text(row.employeeNo) || '—' },
              { key: 'employeeName', header: 'الموظف', cell: (row) => text(row.employeeName) || '—' },
              { key: 'leaveType', header: 'نوع الإجازة', cell: (row) => text(row.leaveTypeName || row.leaveType) || '—' },
              { key: 'startDate', header: 'من تاريخ', cell: (row) => text(row.startDate) || '—' },
              { key: 'endDate', header: 'إلى تاريخ', cell: (row) => text(row.endDate) || '—' },
              { key: 'daysCount', header: 'عدد الأيام', cell: (row) => Number(row.daysCount || 0).toFixed(2) },
              { key: 'status', header: 'الحالة', cell: (row) => leaveStatusLabel(row.status) },
              { key: 'reason', header: 'السبب', cell: (row) => text(row.reason) || '—' },
              {
                key: 'actions',
                header: 'إجراءات',
                cell: (row) => (
                  <div className="compact-actions">
                    {row.status === 'pending' ? <Button type="button" variant="secondary" onClick={() => mutations.approveLeaveRequest.mutate({ id: String(row.id), payload: {} })}>اعتماد</Button> : null}
                    {row.status === 'pending' ? <Button type="button" variant="secondary" onClick={() => mutations.rejectLeaveRequest.mutate({ id: String(row.id), payload: {} })}>رفض</Button> : null}
                    {row.status !== 'cancelled' ? <Button type="button" variant="secondary" onClick={() => mutations.cancelLeaveRequest.mutate({ id: String(row.id), payload: {} })}>إلغاء</Button> : null}
                  </div>
                ),
              },
            ]}
          />
        </QueryFeedback>
      </Card>

      <Card title="أنواع الإجازات">
        <div className="form-grid">
          <label className="field">
            <span>الاسم</span>
            <input value={leaveTypeForm.name} onChange={(event) => setLeaveTypeForm((prev) => ({ ...prev, name: event.target.value }))} />
          </label>
          <label className="field">
            <span>الكود</span>
            <input value={leaveTypeForm.code} onChange={(event) => setLeaveTypeForm((prev) => ({ ...prev, code: event.target.value }))} />
          </label>
          <label className="field">
            <span>مدفوعة؟</span>
            <input type="checkbox" checked={leaveTypeForm.isPaid} onChange={(event) => setLeaveTypeForm((prev) => ({ ...prev, isPaid: event.target.checked }))} />
          </label>
          <label className="field field-wide">
            <span>الوصف</span>
            <input value={leaveTypeForm.description} onChange={(event) => setLeaveTypeForm((prev) => ({ ...prev, description: event.target.value }))} />
          </label>
        </div>
        <div className="actions compact-actions">
          <Button type="button" onClick={createLeaveType} disabled={mutations.saveLeaveType.isPending}>حفظ النوع</Button>
        </div>
        {mutations.saveLeaveType.isError ? <p className="muted">{getErrorMessage(mutations.saveLeaveType.error)}</p> : null}
        <QueryFeedback
          isLoading={leaveTypesQuery.isLoading}
          isError={leaveTypesQuery.isError}
          error={leaveTypesQuery.error}
          isEmpty={!leaveTypes.length}
          loadingText="جارٍ تحميل أنواع الإجازات..."
          errorTitle="تعذر تحميل أنواع الإجازات"
          emptyTitle="لا توجد أنواع إجازات مسجلة."
        >
          <DataTable
            rows={leaveTypes}
            rowKey={(row) => String(row.id)}
            density="compact"
            columns={[
              { key: 'name', header: 'الاسم', cell: (row) => text(row.name) || '—' },
              { key: 'code', header: 'الكود', cell: (row) => text(row.code) || '—' },
              { key: 'isPaid', header: 'مدفوعة', cell: (row) => (row.isPaid ? 'نعم' : 'لا') },
              { key: 'description', header: 'الوصف', cell: (row) => text(row.description) || '—' },
            ]}
          />
        </QueryFeedback>
      </Card>

      <Card title="ملاحظة">
        <p className="muted" style={{ margin: 0 }}>
          رصيد الإجازات والربط التلقائي مع المرتبات يمكن إضافته لاحقًا بعد تثبيت دورة الطلبات والاعتمادات.
        </p>
      </Card>
    </div>
  );
}

