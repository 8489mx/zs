import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { getErrorMessage } from '@/lib/errors';
import type { HrAttendanceRecord } from '@/types/domain';
import { useHrAttendance, useHrMutations } from '@/features/hr/hooks/useHr';

type DraftRow = {
  employeeId: string;
  workDate: string;
  status: string;
  checkInAt: string;
  checkOutAt: string;
  notes: string;
  source: 'manual' | 'import';
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function text(value: unknown) {
  return String(value || '').trim();
}

function toTimeValue(value: string) {
  const matched = text(value).match(/(\d{2}):(\d{2})/);
  return matched ? `${matched[1]}:${matched[2]}` : '';
}

function rowToDraft(row: HrAttendanceRecord, workDate: string): DraftRow {
  return {
    employeeId: String(row.employeeId || ''),
    workDate: workDate || row.workDate || todayDate(),
    status: text(row.status),
    checkInAt: toTimeValue(row.checkInAt || ''),
    checkOutAt: toTimeValue(row.checkOutAt || ''),
    notes: text(row.notes),
    source: row.source === 'import' ? 'import' : 'manual',
  };
}

function draftHash(row: DraftRow) {
  return `${row.status}|${row.checkInAt}|${row.checkOutAt}|${row.notes}|${row.source}`;
}

function toDateTime(workDate: string, timeValue: string) {
  if (!workDate || !timeValue) return undefined;
  return `${workDate}T${timeValue}:00Z`;
}

const statusOptions: Array<{ value: string; label: string }> = [
  { value: '', label: 'غير مسجل' },
  { value: 'present', label: 'حاضر' },
  { value: 'absent', label: 'غائب' },
  { value: 'late', label: 'متأخر' },
  { value: 'half_day', label: 'نصف يوم' },
  { value: 'leave', label: 'إجازة' },
  { value: 'excused', label: 'بعذر' },
  { value: 'early_leave', label: 'انصراف مبكر' },
];

export function HrAttendancePage() {
  const navigate = useNavigate();
  const mutations = useHrMutations();
  const [date, setDate] = useState(todayDate());
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [draftByEmployeeId, setDraftByEmployeeId] = useState<Record<string, DraftRow>>({});
  const [initialHashByEmployeeId, setInitialHashByEmployeeId] = useState<Record<string, string>>({});

  const attendance = useHrAttendance({ date, search, page, pageSize });
  const rows = useMemo(() => (attendance.data?.rows || []) as HrAttendanceRecord[], [attendance.data?.rows]);
  const totalItems = Number(attendance.data?.summary?.totalItems || rows.length || 0);

  useEffect(() => {
    const nextDraft: Record<string, DraftRow> = {};
    const nextHash: Record<string, string> = {};
    for (const row of rows) {
      const employeeId = String(row.employeeId || '');
      if (!employeeId) continue;
      const draft = rowToDraft(row, date);
      nextDraft[employeeId] = draft;
      nextHash[employeeId] = draftHash(draft);
    }
    setDraftByEmployeeId(nextDraft);
    setInitialHashByEmployeeId(nextHash);
  }, [rows, date]);

  const hasPendingChanges = useMemo(() => {
    return Object.keys(draftByEmployeeId).some((employeeId) => draftHash(draftByEmployeeId[employeeId]) !== initialHashByEmployeeId[employeeId]);
  }, [draftByEmployeeId, initialHashByEmployeeId]);

  const updateDraft = (employeeId: string, patch: Partial<DraftRow>) => {
    setDraftByEmployeeId((prev) => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || { employeeId, workDate: date, status: '', checkInAt: '', checkOutAt: '', notes: '', source: 'manual' as const }),
        ...patch,
        source: 'manual',
      },
    }));
  };

  const markAllVisiblePresent = () => {
    setDraftByEmployeeId((prev) => {
      const next = { ...prev };
      for (const row of rows) {
        const employeeId = String(row.employeeId || '');
        if (!employeeId) continue;
        const current = next[employeeId] || rowToDraft(row, date);
        if (!current.status) {
          next[employeeId] = { ...current, status: 'present', source: 'manual' };
        }
      }
      return next;
    });
  };

  const resetDraft = () => {
    const nextDraft: Record<string, DraftRow> = {};
    for (const row of rows) {
      const employeeId = String(row.employeeId || '');
      if (!employeeId) continue;
      nextDraft[employeeId] = rowToDraft(row, date);
    }
    setDraftByEmployeeId(nextDraft);
  };

  const saveDay = async () => {
    const payloadRows = Object.values(draftByEmployeeId)
      .filter((row) => row.employeeId && row.status)
      .map((row) => ({
        employeeId: Number(row.employeeId),
        workDate: date,
        status: row.status,
        checkInAt: toDateTime(date, row.checkInAt),
        checkOutAt: toDateTime(date, row.checkOutAt),
        source: row.source,
        notes: row.notes || undefined,
      }));

    await mutations.saveAttendanceDay.mutateAsync({ workDate: date, rows: payloadRows });
  };

  const summary = attendance.data?.summary || {};

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="الحضور والانصراف"
        description="تسجيل حضور الموظفين اليومي بطريقة بسيطة، مع إمكانية تجهيز الاستيراد من ملف لاحقًا."
        actions={<Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>}
      />

      <Card title="اليوم">
        <div className="form-grid">
          <label className="field">
            <span>التاريخ</span>
            <input type="date" value={date} onChange={(event) => { setDate(event.target.value || todayDate()); setPage(1); }} />
          </label>
        </div>
      </Card>

      <Card title="ملخص اليوم">
        <div className="compact-actions" style={{ marginBottom: 12 }}>
          <SearchToolbar
            search={search}
            onSearchChange={(value) => { setSearch(value); setPage(1); }}
            searchPlaceholder="بحث باسم الموظف أو كود الموظف"
            inputAriaLabel="بحث الموظفين"
          />
        </div>
        <div className="stats-grid">
          <div><strong>إجمالي الموظفين:</strong> {Number(summary.totalItems || 0)}</div>
          <div><strong>حاضر:</strong> {Number(summary.presentCount || 0)}</div>
          <div><strong>غائب:</strong> {Number(summary.absentCount || 0)}</div>
          <div><strong>متأخر:</strong> {Number(summary.lateCount || 0)}</div>
          <div><strong>إجازة:</strong> {Number(summary.leaveCount || 0)}</div>
          <div><strong>غير مسجل:</strong> {Number(summary.unmarkedCount || 0)}</div>
        </div>
      </Card>

      <Card title="إجراءات سريعة">
        <div className="actions compact-actions">
          <Button type="button" variant="secondary" onClick={markAllVisiblePresent}>تحديد الكل حاضر</Button>
          {hasPendingChanges ? <Button type="button" variant="secondary" onClick={resetDraft}>مسح التعديلات غير المحفوظة</Button> : null}
          <Button type="button" onClick={saveDay} disabled={mutations.saveAttendanceDay.isPending}>
            {mutations.saveAttendanceDay.isPending ? 'جاري الحفظ...' : 'حفظ اليوم'}
          </Button>
        </div>
        {mutations.saveAttendanceDay.isError ? <p className="muted" style={{ marginTop: 8 }}>{getErrorMessage(mutations.saveAttendanceDay.error)}</p> : null}
      </Card>

      <Card title="سجل الحضور">
        <QueryFeedback
          isLoading={attendance.isLoading}
          isError={attendance.isError}
          error={attendance.error}
          isEmpty={!rows.length}
          loadingText="جارٍ تحميل بيانات الحضور..."
          errorTitle="تعذر تحميل بيانات الحضور"
          emptyTitle="لا يوجد موظفون لعرضهم."
        >
          <DataTable
            rows={rows}
            rowKey={(row) => String(row.employeeId)}
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
              itemLabel: 'موظف',
            }}
            columns={[
              { key: 'employeeNo', header: 'كود الموظف', cell: (row) => text(row.employeeNo) || '—' },
              { key: 'employeeName', header: 'الموظف', cell: (row) => text(row.employeeName) || '—' },
              { key: 'departmentName', header: 'القسم', cell: (row) => text(row.departmentName) || '—' },
              { key: 'jobTitleName', header: 'المسمى الوظيفي', cell: (row) => text(row.jobTitleName) || '—' },
              {
                key: 'status',
                header: 'الحالة',
                cell: (row) => {
                  const employeeId = String(row.employeeId);
                  const value = draftByEmployeeId[employeeId]?.status || '';
                  return (
                    <select value={value} onChange={(event) => updateDraft(employeeId, { status: event.target.value })}>
                      {statusOptions.map((option) => (
                        <option key={option.value || 'unmarked'} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  );
                },
              },
              {
                key: 'checkInAt',
                header: 'وقت الحضور',
                cell: (row) => {
                  const employeeId = String(row.employeeId);
                  const value = draftByEmployeeId[employeeId]?.checkInAt || '';
                  return <input type="time" value={value} onChange={(event) => updateDraft(employeeId, { checkInAt: event.target.value })} />;
                },
              },
              {
                key: 'checkOutAt',
                header: 'وقت الانصراف',
                cell: (row) => {
                  const employeeId = String(row.employeeId);
                  const value = draftByEmployeeId[employeeId]?.checkOutAt || '';
                  return <input type="time" value={value} onChange={(event) => updateDraft(employeeId, { checkOutAt: event.target.value })} />;
                },
              },
              {
                key: 'notes',
                header: 'ملاحظات',
                cell: (row) => {
                  const employeeId = String(row.employeeId);
                  const value = draftByEmployeeId[employeeId]?.notes || '';
                  return <input value={value} onChange={(event) => updateDraft(employeeId, { notes: event.target.value })} placeholder="ملاحظة" />;
                },
              },
            ]}
          />
        </QueryFeedback>
      </Card>

      <Card title="ملاحظة">
        <p className="muted" style={{ margin: 0 }}>
          استيراد ملفات الحضور من Excel/CSV سيتم ربطه في خطوة لاحقة. لا يوجد ربط مباشر بجهاز بصمة في هذه المرحلة.
        </p>
      </Card>
    </div>
  );
}


