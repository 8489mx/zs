import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { getErrorMessage } from '@/lib/errors';
import { hrApi } from '@/features/hr/api/hr.api';
import { useHrMutations } from '@/features/hr/hooks/useHr';
import type { HrAttendanceRecord, HrEmployee } from '@/types/domain';

export const QUICK_ATTENDANCE_SHORTCUT = 'Ctrl + Alt + H';

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

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (target.isContentEditable || target.closest('[contenteditable="true"]')) return true;
  return false;
}

export function QuickAttendanceShortcut({ onClose }: QuickAttendanceShortcutProps) {
  const mutations = useHrMutations();
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (!event.ctrlKey || !event.altKey || event.shiftKey || event.metaKey) return;
      if (event.code !== 'KeyH' && event.key.toLowerCase() !== 'h') return;
      event.preventDefault();
      setShortcutOpen(true);
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  function handleClose() {
    setShortcutOpen(false);
    onClose();
  }

  const employeesQuery = useQuery({
    queryKey: ['hr', 'quick-attendance', 'employees'],
    queryFn: () => hrApi.employees({ page: 1, pageSize: 1000 }),
    enabled: shortcutOpen,
    staleTime: 30_000,
  });

  const attendanceQuery = useQuery({
    queryKey: ['hr', 'quick-attendance', 'today', todayDate()],
    queryFn: () => hrApi.attendance({ date: todayDate(), page: 1, pageSize: 1000 }),
    enabled: shortcutOpen,
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
    const source = term
      ? employees.filter((employee) => {
        const haystack = [employee.employeeNo, employee.displayName, employee.firstName, employee.lastName].map(normalize).join(' ');
        return haystack.includes(term);
      })
      : employees;
    return source.slice(0, 8);
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
    <DialogShell open={shortcutOpen} onClose={handleClose} width="min(1120px, calc(100vw - 80px))" ariaLabel="تسجيل حضور أو انصراف سريع">
      <div
        className="stack gap-18"
        dir="rtl"
        style={{
          boxSizing: 'border-box',
          minHeight: 520,
          minWidth: 0,
          overflow: 'visible',
          padding: '18px 18px 16px',
        }}
      >
        <div className="stack gap-8" style={{ alignItems: 'center', borderBottom: '1px solid var(--border)', minWidth: 0, paddingBottom: 14, textAlign: 'center' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.25, margin: 0 }}>تسجيل حضور أو انصراف سريع</h2>
          <p className="muted" style={{ margin: 0 }}>
            ابحث عن الموظف بالاسم أو الكود وسجّل الحضور أو الانصراف دون مغادرة الصفحة الحالية.
          </p>
          <p className="muted" style={{ margin: 0 }}>الاختصار: {QUICK_ATTENDANCE_SHORTCUT}</p>
        </div>

        <label className="field" style={{ minWidth: 0 }}>
          <span>بحث الموظف</span>
          <input
            data-autofocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث باسم الموظف أو كود الموظف"
          />
        </label>

        <div style={{ alignItems: 'stretch', display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 0.9fr)' }}>
          <div className="card-soft" style={{ boxSizing: 'border-box', minHeight: 340, overflow: 'visible', padding: 14 }}>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
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
                    style={{ boxSizing: 'border-box', display: 'block', minHeight: 102, padding: '14px 16px', textAlign: 'right', whiteSpace: 'normal', width: '100%' }}
                    onClick={() => setSelectedEmployeeId(String(employee.id))}
                  >
                    <span className="sidebar-label" style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: 15, marginBottom: 4 }}>{employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || '—'}</strong>
                      <small className="muted" style={{ display: 'block' }}>
                        كود الموظف: {employee.employeeNo || '—'} · الحالة اليوم: {stateLabel}
                      </small>
                      <small className="muted" style={{ display: 'block', marginTop: 3 }}>
                        وقت الحضور: {formatTimeText(row?.checkInAt)} · وقت الانصراف: {formatTimeText(row?.checkOutAt)}
                      </small>
                    </span>
                  </button>
                );
              }) : (
                <p className="muted" style={{ gridColumn: '1 / -1', margin: 8 }}>لا توجد نتائج مطابقة للبحث الحالي.</p>
              )}
            </div>
          </div>

          <div className="stack gap-14" style={{ minHeight: 340 }}>
            {employeesQuery.isError || attendanceQuery.isError ? (
              <div className="error-box">
                {getErrorMessage(employeesQuery.error || attendanceQuery.error, 'تعذر تحميل بيانات الحضور السريع.')}
              </div>
            ) : null}

            {selectedEmployee ? (
              <CardSummary employee={selectedEmployee} attendance={selectedAttendance} />
            ) : (
              <div className="card-soft" style={{ boxSizing: 'border-box', padding: 16 }}>
                <p className="muted" style={{ margin: 0 }}>اختر موظفًا من النتائج لعرض حالة اليوم وتنفيذ الإجراء المناسب.</p>
              </div>
            )}

            {feedback ? (
              <p className="muted" style={{ margin: 0 }}>{feedback}</p>
            ) : null}

            <div className="actions compact-actions" style={{ flexWrap: 'wrap', justifyContent: 'flex-start', marginTop: 'auto' }}>
              <Button type="button" variant="secondary" onClick={handleClose}>إغلاق</Button>
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
        </div>
      </div>
    </DialogShell>
  );
}

function CardSummary({ employee, attendance }: { employee: HrEmployee; attendance?: HrAttendanceRecord }) {
  const checkIn = String(attendance?.checkInAt || '').trim();
  const checkOut = String(attendance?.checkOutAt || '').trim();
  return (
    <div className="card-soft" style={{ boxSizing: 'border-box', padding: 16 }}>
      <strong style={{ display: 'block', fontSize: 16, marginBottom: 8 }}>{employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || '—'}</strong>
      <div className="muted" style={{ lineHeight: 1.9 }}>
        كود الموظف: {employee.employeeNo || '—'}<br />
        وقت الحضور: {formatTimeText(checkIn)}<br />
        وقت الانصراف: {formatTimeText(checkOut)}
      </div>
    </div>
  );
}
