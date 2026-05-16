import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { getErrorMessage } from '@/lib/errors';
import type { HrAttendanceException, HrAttendanceRecord } from '@/types/domain';
import { useHrAttendance, useHrAttendanceExceptions, useHrMutations } from '@/features/hr/hooks/useHr';

type DraftRow = {
  employeeId: string;
  status: string;
  checkInAt: string;
  checkOutAt: string;
  notes: string;
};

type ExceptionFilter = 'all' | 'needs_action' | 'overtime' | 'deduction';

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  const date = new Date();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function normalizeArabicDigits(value: string) {
  return String(value || '')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

function normalizeTime(value: string) {
  const normalized = normalizeArabicDigits(String(value || '').trim());
  const match = normalized.match(/^(\d{1,2}):(\d{1,2})/);
  if (!match) return '';
  const hh = String(Math.max(0, Math.min(23, Number(match[1])))).padStart(2, '0');
  const mm = String(Math.max(0, Math.min(59, Number(match[2])))).padStart(2, '0');
  return `${hh}:${mm}`;
}

function toDateTime(workDate: string, timeValue: string) {
  if (!workDate || !timeValue) return undefined;
  const safeTime = normalizeTime(timeValue);
  return safeTime ? `${workDate}T${safeTime}:00Z` : undefined;
}

function exceptionTypeLabel(value: string) {
  switch (value) {
    case 'early_check_in': return 'حضور مبكر';
    case 'late_check_in': return 'تأخير';
    case 'early_check_out': return 'انصراف مبكر';
    case 'late_check_out': return 'انصراف متأخر';
    case 'missing_check_in': return 'حضور غير مسجل';
    case 'missing_check_out': return 'انصراف غير مسجل';
    default: return value || 'غير محدد';
  }
}

function exceptionStatusLabel(value: string) {
  switch (value) {
    case 'pending': return 'في انتظار المراجعة';
    case 'approved': return 'معتمد';
    case 'skipped': return 'غير معتمد';
    case 'auto_calculated': return 'محسوب تلقائيًا';
    case 'needs_review': return 'يحتاج مراجعة';
    default: return value || 'غير محدد';
  }
}

function isOvertimeException(type: string) {
  return type === 'early_check_in' || type === 'late_check_out';
}

function isDeductionException(type: string) {
  return type === 'late_check_in' || type === 'early_check_out' || type === 'missing_check_in' || type === 'missing_check_out';
}

function isActionableException(row: HrAttendanceException) {
  const status = String(row.status || '').toLowerCase();
  return status === 'pending' || status === 'needs_review';
}

function filterExceptions(rows: HrAttendanceException[], filter: ExceptionFilter) {
  if (filter === 'needs_action') return rows.filter(isActionableException);
  if (filter === 'overtime') return rows.filter((row) => isOvertimeException(row.exceptionType));
  if (filter === 'deduction') return rows.filter((row) => isDeductionException(row.exceptionType));
  return rows;
}

export function HrAttendancePage() {
  const navigate = useNavigate();
  const mutations = useHrMutations();
  const [date, setDate] = useState(todayDate());
  const [search, setSearch] = useState('');
  const [exceptionFilter, setExceptionFilter] = useState<ExceptionFilter>('needs_action');
  const [draftByEmployeeId, setDraftByEmployeeId] = useState<Record<string, DraftRow>>({});

  const attendance = useHrAttendance({ date, search, page: 1, pageSize: 200 });
  const exceptions = useHrAttendanceExceptions({ date, search, page: 1, pageSize: 200 });
  const rows = useMemo(() => (attendance.data?.rows || []) as HrAttendanceRecord[], [attendance.data?.rows]);
  const allExceptionRows = useMemo(() => (exceptions.data?.rows || []) as HrAttendanceException[], [exceptions.data?.rows]);
  const exceptionRows = useMemo(() => filterExceptions(allExceptionRows, exceptionFilter), [allExceptionRows, exceptionFilter]);

  useEffect(() => {
    const next: Record<string, DraftRow> = {};
    for (const row of rows) {
      const employeeId = String(row.employeeId || '');
      if (!employeeId) continue;
      next[employeeId] = {
        employeeId,
        status: String(row.status || ''),
        checkInAt: normalizeTime(String(row.checkInAt || '').slice(11, 16) || String(row.checkInAt || '')),
        checkOutAt: normalizeTime(String(row.checkOutAt || '').slice(11, 16) || String(row.checkOutAt || '')),
        notes: String(row.notes || ''),
      };
    }
    setDraftByEmployeeId(next);
  }, [rows]);

  const summary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let unmarked = 0;
    for (const row of rows) {
      const status = String(draftByEmployeeId[String(row.employeeId)]?.status || row.status || '').toLowerCase();
      if (!status) unmarked += 1;
      else if (status === 'present') present += 1;
      else if (status === 'absent') absent += 1;
      else if (status === 'late') late += 1;
    }
    const needsAction = allExceptionRows.filter(isActionableException).length;
    const overtime = allExceptionRows.filter((row) => isOvertimeException(row.exceptionType)).length;
    const deduction = allExceptionRows.filter((row) => isDeductionException(row.exceptionType)).length;
    return { total: rows.length, present, absent, late, unmarked, needsAction, overtime, deduction };
  }, [rows, draftByEmployeeId, allExceptionRows]);

  const updateDraft = (employeeId: string, patch: Partial<DraftRow>) => {
    setDraftByEmployeeId((current) => ({
      ...current,
      [employeeId]: { ...(current[employeeId] || { employeeId, status: '', checkInAt: '', checkOutAt: '', notes: '' }), ...patch },
    }));
  };

  const saveDay = async () => {
    const payloadRows = Object.values(draftByEmployeeId)
      .filter((row) => row.employeeId && row.status)
      .map((row) => ({
        employeeId: Number(normalizeArabicDigits(row.employeeId)),
        workDate: date,
        status: row.status,
        checkInAt: toDateTime(date, row.checkInAt),
        checkOutAt: toDateTime(date, row.checkOutAt),
        notes: row.notes || undefined,
        source: 'manual',
      }));
    await mutations.saveAttendanceDay.mutateAsync({ workDate: date, rows: payloadRows });
  };

  const approveException = async (id: string) => {
    await mutations.approveAttendanceException.mutateAsync({ id, payload: {} });
  };

  const skipException = async (id: string) => {
    await mutations.skipAttendanceException.mutateAsync({ id, payload: {} });
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="الحضور والانصراف"
        description="ابدأ بتحديد اليوم، راجع الاستثناءات التي تؤثر على الراتب، ثم احفظ أي تعديل على سجل الحضور."
        actions={(
          <div className="compact-actions">
            <Button onClick={saveDay} disabled={mutations.saveAttendanceDay.isPending}>
              {mutations.saveAttendanceDay.isPending ? 'جاري الحفظ...' : 'حفظ اليوم'}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>فتح المرتبات</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>
          </div>
        )}
      />

      <Card title="تسلسل العمل في صفحة الحضور" description="استخدم هذه الصفحة كمسار يومي واضح بدل التنقل بين أكثر من مكان.">
        <div className="form-grid">
          <div className="field"><strong>1. اختر اليوم</strong><span className="muted">حدد التاريخ وابحث عن الموظف عند الحاجة.</span></div>
          <div className="field"><strong>2. راجع الاستثناءات</strong><span className="muted">اعتمد أو تخطَّى الحضور المبكر والانصراف المتأخر قبل المرتبات.</span></div>
          <div className="field"><strong>3. عدّل السجل</strong><span className="muted">سجل حضور أو انصراف يدويًا عند وجود نسيان أو خطأ.</span></div>
          <div className="field"><strong>4. احفظ اليوم</strong><span className="muted">الحفظ يعيد حساب الاستثناءات الخاصة بهذا اليوم.</span></div>
        </div>
      </Card>

      <Card title="اليوم والبحث" description="اختيار التاريخ والبحث يؤثران على السجل والاستثناءات معًا.">
        <div className="form-grid">
          <label className="field">
            <span>التاريخ</span>
            <input type="date" value={date} onChange={(e) => setDate(normalizeArabicDigits(e.target.value || todayDate()))} />
          </label>
          <div className="field field-wide">
            <span>بحث الموظف</span>
            <SearchToolbar search={search} onSearchChange={setSearch} searchPlaceholder="ابحث باسم الموظف أو الكود" />
          </div>
        </div>
      </Card>

      <Card title="ملخص اليوم" description="اضغط على أرقام الاستثناءات لتصفية قائمة المراجعة بالأسفل.">
        <div className="stats-grid">
          <div className="stat-card"><span>إجمالي الموظفين</span><strong>{summary.total}</strong></div>
          <div className="stat-card"><span>حاضر</span><strong>{summary.present}</strong></div>
          <div className="stat-card"><span>غائب</span><strong>{summary.absent}</strong></div>
          <div className="stat-card"><span>متأخر</span><strong>{summary.late}</strong></div>
          <div className="stat-card"><span>غير مسجل / يحتاج مراجعة</span><strong>{summary.unmarked}</strong></div>
          <button className="stat-card" type="button" onClick={() => setExceptionFilter('needs_action')} style={{ textAlign: 'right' }}><span>استثناءات تحتاج إجراء</span><strong>{summary.needsAction}</strong></button>
          <button className="stat-card" type="button" onClick={() => setExceptionFilter('overtime')} style={{ textAlign: 'right' }}><span>وقت إضافي محتمل</span><strong>{summary.overtime}</strong></button>
          <button className="stat-card" type="button" onClick={() => setExceptionFilter('deduction')} style={{ textAlign: 'right' }}><span>خصم/نقص محتمل</span><strong>{summary.deduction}</strong></button>
        </div>
      </Card>

      <Card title="استثناءات تحتاج مراجعة" description="هذه أهم منطقة قبل المرتبات: الحضور المبكر والانصراف المتأخر يمكن اعتمادهما كوقت إضافي، أما التأخير والانصراف المبكر فيظهران للمراجعة.">
        <div className="compact-actions" style={{ marginBottom: 12 }}>
          <Button type="button" variant={exceptionFilter === 'needs_action' ? 'primary' : 'secondary'} onClick={() => setExceptionFilter('needs_action')}>يحتاج إجراء</Button>
          <Button type="button" variant={exceptionFilter === 'overtime' ? 'primary' : 'secondary'} onClick={() => setExceptionFilter('overtime')}>وقت إضافي محتمل</Button>
          <Button type="button" variant={exceptionFilter === 'deduction' ? 'primary' : 'secondary'} onClick={() => setExceptionFilter('deduction')}>خصم/نقص محتمل</Button>
          <Button type="button" variant={exceptionFilter === 'all' ? 'primary' : 'secondary'} onClick={() => setExceptionFilter('all')}>كل الاستثناءات</Button>
        </div>
        <QueryFeedback
          isLoading={exceptions.isLoading}
          isError={exceptions.isError}
          error={exceptions.error}
          isEmpty={!exceptionRows.length}
          loadingText="جاري تحميل الاستثناءات..."
          errorTitle="تعذر تحميل الاستثناءات."
          emptyTitle="لا توجد استثناءات مطابقة لهذا الفلتر."
        >
          <DataTable
            rows={exceptionRows}
            rowKey={(row) => row.id}
            density="compact"
            columns={[
              { key: 'workDate', header: 'التاريخ', cell: (row) => row.workDate || '—' },
              { key: 'employeeNo', header: 'كود الموظف', cell: (row) => row.employeeNo || '—' },
              { key: 'employeeName', header: 'اسم الموظف', cell: (row) => row.employeeName || '—' },
              { key: 'exceptionType', header: 'نوع الاستثناء', cell: (row) => exceptionTypeLabel(row.exceptionType) },
              { key: 'scheduledTime', header: 'المجدول', cell: (row) => row.scheduledTime || '—' },
              { key: 'actualTime', header: 'الفعلي', cell: (row) => row.actualTime || '—' },
              { key: 'durationMinutes', header: 'المدة', cell: (row) => `${row.durationMinutes || 0} دقيقة` },
              { key: 'status', header: 'الحالة', cell: (row) => exceptionStatusLabel(row.status) },
              {
                key: 'actions',
                header: 'الإجراء',
                cell: (row) => isOvertimeException(row.exceptionType) && row.status === 'pending' ? (
                  <div className="compact-actions">
                    <Button type="button" variant="secondary" disabled={mutations.approveAttendanceException.isPending || mutations.skipAttendanceException.isPending} onClick={() => { void approveException(row.id); }}>اعتماد كوقت إضافي</Button>
                    <Button type="button" variant="secondary" disabled={mutations.approveAttendanceException.isPending || mutations.skipAttendanceException.isPending} onClick={() => { void skipException(row.id); }}>تخطي</Button>
                  </div>
                ) : (
                  <span className="muted">{exceptionStatusLabel(row.status)}</span>
                ),
              },
            ]}
          />
        </QueryFeedback>
        {(mutations.approveAttendanceException.isError || mutations.skipAttendanceException.isError)
          ? <p className="muted">{getErrorMessage(mutations.approveAttendanceException.error || mutations.skipAttendanceException.error, 'تعذر تحديث حالة الاستثناء.')}</p>
          : null}
      </Card>

      <Card title="سجل الحضور اليومي" description="استخدمه للتعديل اليدوي عند نسيان الحضور أو الانصراف، ثم اضغط حفظ اليوم.">
        <QueryFeedback
          isLoading={attendance.isLoading}
          isError={attendance.isError}
          error={attendance.error}
          isEmpty={!rows.length}
          loadingText="جاري تحميل سجلات الحضور..."
          errorTitle="تعذر تحميل سجلات الحضور."
          emptyTitle="لا توجد سجلات حضور لهذا اليوم."
        >
          <DataTable
            rows={rows}
            rowKey={(row) => String(row.employeeId)}
            density="compact"
            columns={[
              { key: 'employeeNo', header: 'كود الموظف', cell: (row) => row.employeeNo || '—' },
              { key: 'employeeName', header: 'اسم الموظف', cell: (row) => row.employeeName || '—' },
              { key: 'departmentName', header: 'القسم', cell: (row) => row.departmentName || '—' },
              {
                key: 'checkInAt',
                header: 'وقت الحضور',
                cell: (row) => (
                  <input
                    type="time"
                    value={draftByEmployeeId[String(row.employeeId)]?.checkInAt || ''}
                    onChange={(e) => updateDraft(String(row.employeeId), { checkInAt: normalizeTime(e.target.value) })}
                  />
                ),
              },
              {
                key: 'checkOutAt',
                header: 'وقت الانصراف',
                cell: (row) => (
                  <input
                    type="time"
                    value={draftByEmployeeId[String(row.employeeId)]?.checkOutAt || ''}
                    onChange={(e) => updateDraft(String(row.employeeId), { checkOutAt: normalizeTime(e.target.value) })}
                  />
                ),
              },
              {
                key: 'status',
                header: 'الحالة',
                cell: (row) => (
                  <select
                    value={draftByEmployeeId[String(row.employeeId)]?.status || ''}
                    onChange={(e) => updateDraft(String(row.employeeId), { status: e.target.value })}
                  >
                    <option value="">غير مسجل</option>
                    <option value="present">حاضر</option>
                    <option value="absent">غائب</option>
                    <option value="late">متأخر</option>
                    <option value="early_leave">انصراف مبكر</option>
                    <option value="leave">إجازة</option>
                    <option value="half_day">نصف يوم</option>
                    <option value="excused">بعذر</option>
                  </select>
                ),
              },
              {
                key: 'notes',
                header: 'ملاحظات',
                cell: (row) => (
                  <input
                    value={draftByEmployeeId[String(row.employeeId)]?.notes || ''}
                    onChange={(e) => updateDraft(String(row.employeeId), { notes: e.target.value })}
                  />
                ),
              },
              {
                key: 'actions',
                header: 'إجراء',
                cell: (row) => (
                  <div className="compact-actions">
                    <Button type="button" variant="secondary" onClick={() => updateDraft(String(row.employeeId), { status: 'present', checkInAt: draftByEmployeeId[String(row.employeeId)]?.checkInAt || nowTime() })}>تسجيل حضور</Button>
                    <Button type="button" variant="secondary" onClick={() => updateDraft(String(row.employeeId), { status: draftByEmployeeId[String(row.employeeId)]?.status || 'present', checkOutAt: draftByEmployeeId[String(row.employeeId)]?.checkOutAt || nowTime() })}>تسجيل انصراف</Button>
                  </div>
                ),
              },
            ]}
          />
        </QueryFeedback>
      </Card>
    </div>
  );
}
