import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { getErrorMessage } from '@/lib/errors';
import { hrApi } from '@/features/hr/api/hr.api';
import { useHrMutations } from '@/features/hr/hooks/useHr';
import type { HrAttendanceRecord, HrEmployee } from '@/types/domain';

export const QUICK_ATTENDANCE_SHORTCUT = 'Alt + Shift + F9';

interface QuickAttendanceShortcutProps {
  open: boolean;
  onClose: () => void;
}

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatTimeText(value?: string) {
  const text = String(value || '').trim();
  const match = text.match(/(\d{2}):(\d{2})/);
  if (!match) return '—';
  return `${match[1]}:${match[2]}`;
}

export function QuickAttendanceShortcut({ open, onClose }: QuickAttendanceShortcutProps) {
  const mutations = useHrMutations();
  const [search, setSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [feedback, setFeedback] = useState('');

  const employeesQuery = useQuery({
    queryKey: ['hr', 'quick-attendance', 'employees'],
    queryFn: () => hrApi.employees({ page: 1, pageSize: 1000 }),
    enabled: open,
    staleTime: 30_000,
  });

  const attendanceQuery = useQuery({
    queryKey: ['hr', 'quick-attendance', 'today', todayDate()],
    queryFn: () => hrApi.attendance({ date: todayDate(), page: 1, pageSize: 1000 }),
    enabled: open,
    staleTime: 10_000,
  });

  const employees = useMemo(() => (employeesQuery.data?.employees || []) as HrEmployee[], [employeesQuery.data?.employees]);
  const attendanceRows = useMemo(() => (attendanceQuery.data?.rows || []) as HrAttendanceRecord[], [attendanceQuery.data?.rows]);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, HrAttendanceRecord>();
    for (const row of attendanceRows) {
      map.set(String(row.employeeId), row);
    }
    return map;
  }, [attendanceRows]);

  const filteredEmployees = useMemo(() => {
    const term = normalize(search);
    if (!term) return employees.slice(0, 12);
    return employees
      .filter((employee) => {
        const haystack = [
          employee.employeeNo,
          employee.displayName,
          employee.firstName,
          employee.lastName,
        ].map(normalize).join(' ');
        return haystack.includes(term);
      })
      .slice(0, 12);
  }, [employees, search]);

  const selectedEmployee = filteredEmployees.find((row) => String(row.id) === selectedEmployeeId)
    || employees.find((row) => String(row.id) === selectedEmployeeId);
  const selectedAttendance = selectedEmployee ? attendanceMap.get(String(selectedEmployee.id)) : undefined;
  const hasCheckIn = Boolean(String(selectedAttendance?.checkInAt || '').trim());
  const hasCheckOut = Boolean(String(selectedAttendance?.checkOutAt || '').trim());

  const primaryActionLabel = !selectedEmployee
    ? ''
    : !hasCheckIn
      ? 'تسجيل حضور الآن'
      : !hasCheckOut
        ? 'تسجيل انصراف الآن'
        : '';

  async function handlePrimaryAction() {
    if (!selectedEmployee) return;
    setFeedback('');
    const current = attendanceMap.get(String(selectedEmployee.id));
    const checkIn = String(current?.checkInAt || '').trim();
    const checkOut = String(current?.checkOutAt || '').trim();

    try {
      if (!checkIn) {
        await mutations.saveAttendanceRecord.mutateAsync({
          employeeId: Number(selectedEmployee.id),
          workDate: todayDate(),
          status: 'present',
          checkInAt: nowIso(),
          source: 'manual',
        });
        setFeedback('تم تسجيل الحضور بنجاح');
        return;
      }
      if (!checkOut) {
        await mutations.saveAttendanceRecord.mutateAsync({
          employeeId: Number(selectedEmployee.id),
          workDate: todayDate(),
          status: String(current?.status || 'present'),
          checkInAt: current?.checkInAt || undefined,
          checkOutAt: nowIso(),
          source: 'manual',
        });
        setFeedback('تم تسجيل الانصراف بنجاح');
      }
    } catch {
      setFeedback('تعذر تسجيل الحضور أو الانصراف. حاول مرة أخرى.');
    }
  }

  return (
    <DialogShell open={open} onClose={onClose} width="min(760px, 100%)" ariaLabel="تسجيل حضور أو انصراف سريع">
      <div className="stack gap-12" dir="rtl">
        <div className="stack gap-4">
          <h3 style={{ margin: 0 }}>تسجيل حضور أو انصراف سريع</h3>
          <p className="muted" style={{ margin: 0 }}>
            ابحث عن الموظف بالاسم أو الكود وسجّل الحضور أو الانصراف دون مغادرة الصفحة الحالية.
          </p>
          <p className="muted" style={{ margin: 0 }}>الاختصار: {QUICK_ATTENDANCE_SHORTCUT}</p>
        </div>

        <label className="field">
          <span>بحث الموظف</span>
          <input
            data-autofocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث باسم الموظف أو كود الموظف"
          />
        </label>

        <div className="card-soft" style={{ maxHeight: 260, overflow: 'auto', padding: 8 }}>
          {filteredEmployees.length ? filteredEmployees.map((employee) => {
            const row = attendanceMap.get(String(employee.id));
            const rowHasCheckIn = Boolean(String(row?.checkInAt || '').trim());
            const rowHasCheckOut = Boolean(String(row?.checkOutAt || '').trim());
            const stateLabel = !rowHasCheckIn
              ? 'غير مسجل'
              : !rowHasCheckOut
                ? 'حضور مسجل'
                : 'اكتمل حضور وانصراف';
            return (
              <button
                key={String(employee.id)}
                type="button"
                className={`sidebar-link ${selectedEmployeeId === String(employee.id) ? 'active' : ''}`.trim()}
                style={{ width: '100%', textAlign: 'right', marginBottom: 6 }}
                onClick={() => setSelectedEmployeeId(String(employee.id))}
              >
                <span className="sidebar-label">
                  <strong>{employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || '—'}</strong>
                  <small className="muted" style={{ display: 'block' }}>
                    كود الموظف: {employee.employeeNo || '—'} · الحالة اليوم: {stateLabel}
                  </small>
                  <small className="muted" style={{ display: 'block' }}>
                    وقت الحضور: {formatTimeText(row?.checkInAt)} · وقت الانصراف: {formatTimeText(row?.checkOutAt)}
                  </small>
                </span>
              </button>
            );
          }) : (
            <p className="muted" style={{ margin: 8 }}>لا توجد نتائج مطابقة للبحث الحالي.</p>
          )}
        </div>

        {employeesQuery.isError || attendanceQuery.isError ? (
          <div className="error-box">
            {getErrorMessage(employeesQuery.error || attendanceQuery.error, 'تعذر تحميل بيانات الحضور السريع.')}
          </div>
        ) : null}

        {selectedEmployee ? (
          <CardSummary
            employee={selectedEmployee}
            attendance={selectedAttendance}
          />
        ) : null}

        {feedback ? (
          <p className="muted" style={{ margin: 0 }}>{feedback}</p>
        ) : null}

        <div className="actions compact-actions">
          <Button type="button" variant="secondary" onClick={onClose}>إغلاق</Button>
          {primaryActionLabel ? (
            <Button
              type="button"
              onClick={() => { void handlePrimaryAction(); }}
              disabled={mutations.saveAttendanceRecord.isPending || employeesQuery.isLoading || attendanceQuery.isLoading}
            >
              {mutations.saveAttendanceRecord.isPending ? 'جارٍ التسجيل...' : primaryActionLabel}
            </Button>
          ) : selectedEmployee ? (
            <span className="muted">تم تسجيل حضور وانصراف هذا الموظف اليوم</span>
          ) : null}
        </div>
      </div>
    </DialogShell>
  );
}

function CardSummary({ employee, attendance }: { employee: HrEmployee; attendance?: HrAttendanceRecord }) {
  const checkIn = String(attendance?.checkInAt || '').trim();
  const checkOut = String(attendance?.checkOutAt || '').trim();
  return (
    <div className="card-soft" style={{ padding: 10 }}>
      <strong>{employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || '—'}</strong>
      <div className="muted" style={{ marginTop: 6 }}>
        كود الموظف: {employee.employeeNo || '—'}<br />
        وقت الحضور: {formatTimeText(checkIn)}<br />
        وقت الانصراف: {formatTimeText(checkOut)}
      </div>
    </div>
  );
}

