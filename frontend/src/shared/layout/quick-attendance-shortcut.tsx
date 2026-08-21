import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { getErrorMessage } from '@/lib/errors';
import { hrApi } from '@/features/hr/api/hr.api';
import { useHrMutations } from '@/features/hr/hooks/useHr';
import type { HrAttendanceRecord, HrEmployee } from '@/types/domain';
import { ClockIcon, CheckCircleIcon, UsersIcon } from '@/features/hr/components/HrIcons';

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
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      const match = String(value).match(/(\d{2}):(\d{2})/);
      return match ? `${match[1]}:${match[2]}` : '—';
    }
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '—';
  }
}

export function QuickAttendanceShortcut({ onClose }: QuickAttendanceShortcutProps) {
  const mutations = useHrMutations();
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [now, setNow] = useState(new Date());

  // Live timer tick
  useEffect(() => {
    if (!shortcutOpen) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [shortcutOpen]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
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
    setSearch('');
    setSelectedEmployeeId('');
    setFeedback(null);
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
        const haystack = [employee.employeeNo, employee.displayName, employee.firstName, employee.lastName, employee.departmentName, employee.jobTitleName].map(normalize).join(' ');
        return haystack.includes(term);
      })
      : employees;
    return source.slice(0, 10);
  }, [employees, search]);

  // Auto-select first matching employee if current selection is invalid
  useEffect(() => {
    if (filteredEmployees.length > 0 && (!selectedEmployeeId || !filteredEmployees.some(e => String(e.id) === selectedEmployeeId))) {
      setSelectedEmployeeId(String(filteredEmployees[0].id));
    }
  }, [filteredEmployees, selectedEmployeeId]);

  const selectedEmployee = employees.find((row) => String(row.id) === selectedEmployeeId);
  const selectedAttendance = selectedEmployee ? attendanceMap.get(String(selectedEmployee.id)) : undefined;
  const hasCheckIn = Boolean(String(selectedAttendance?.checkInAt || '').trim());
  const hasCheckOut = Boolean(String(selectedAttendance?.checkOutAt || '').trim());

  async function handlePrimaryAction() {
    if (!selectedEmployee) return;
    setFeedback(null);
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
        setFeedback({ type: 'success', message: `تم تسجيل حضور "${selectedEmployee.displayName || selectedEmployee.firstName}" بنجاح في ${now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}` });
        await attendanceQuery.refetch();
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
        setFeedback({ type: 'success', message: `تم تسجيل انصراف "${selectedEmployee.displayName || selectedEmployee.firstName}" بنجاح في ${now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}` });
        await attendanceQuery.refetch();
      }
    } catch {
      setFeedback({ type: 'error', message: 'تعذر تسجيل الحضور أو الانصراف. يرجى المحاولة مرة أخرى.' });
    }
  }

  const dateFormatted = now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeFormatted = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  return (
    <DialogShell open={shortcutOpen} onClose={handleClose} width="min(880px, calc(100vw - 40px))" ariaLabel="تسجيل حضور أو انصراف سريع">
      <div
        dir="rtl"
        style={{
          boxSizing: 'border-box',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: '#ffffff',
        }}
      >
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(23, 12, 92, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary, #170c5c)' }}>
              <ClockIcon size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>تسجيل الحضور والانصراف السريع</h2>
              <span style={{ fontSize: '0.775rem', color: '#64748b' }}>{dateFormatted}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Live Clock Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f172a', color: '#ffffff', padding: '5px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} />
              <span>{timeFormatted}</span>
            </div>

            <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 8px', fontSize: '0.725rem', fontWeight: 600, color: '#475569' }}>
              {QUICK_ATTENDANCE_SHORTCUT}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <input
            data-autofocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث باسم الموظف أو الكود أو القسم..."
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: '8px',
              border: '1.5px solid #cbd5e1',
              fontSize: '0.9rem',
              boxSizing: 'border-box',
              background: '#f8fafc',
              outline: 'none',
              transition: 'all 0.15s ease',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--primary, #170c5c)'; e.target.style.background = '#ffffff'; }}
            onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.background = '#f8fafc'; }}
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              ✕
            </button>
          ) : null}
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '0.825rem',
              fontWeight: 600,
              background: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: feedback.type === 'success' ? '#166534' : '#991b1b',
              border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {feedback.type === 'success' ? <CheckCircleIcon size={16} /> : null}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Error state */}
        {employeesQuery.isError || attendanceQuery.isError ? (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '6px', fontSize: '0.825rem' }}>
            {getErrorMessage(employeesQuery.error || attendanceQuery.error, 'تعذر تحميل بيانات الموظفين.')}
          </div>
        ) : null}

        {/* Employee Cards Grid */}
        <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '2px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px' }}>
          {filteredEmployees.length ? (
            filteredEmployees.map((employee) => {
              const isSelected = selectedEmployeeId === String(employee.id);
              const row = attendanceMap.get(String(employee.id));
              const rowHasCheckIn = Boolean(String(row?.checkInAt || '').trim());
              const rowHasCheckOut = Boolean(String(row?.checkOutAt || '').trim());

              const name = employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || '—';
              const initials = name.slice(0, 2);

              return (
                <div
                  key={String(employee.id)}
                  onClick={() => setSelectedEmployeeId(String(employee.id))}
                  style={{
                    border: `1.5px solid ${isSelected ? 'var(--primary, #170c5c)' : '#e2e8f0'}`,
                    background: isSelected ? 'rgba(23, 12, 92, 0.03)' : '#ffffff',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 0 0 1px var(--primary, #170c5c)' : '0 1px 2px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isSelected ? 'var(--primary, #170c5c)' : '#e2e8f0', color: isSelected ? '#ffffff' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</strong>
                      <span style={{ fontSize: '0.725rem', color: '#64748b' }}>كود: {employee.employeeNo || '—'} {employee.departmentName ? `· ${employee.departmentName}` : ''}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #e2e8f0', paddingTop: '6px', fontSize: '0.75rem' }}>
                    {!rowHasCheckIn ? (
                      <span style={{ color: '#64748b', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }} />
                        لم يسجل اليوم
                      </span>
                    ) : !rowHasCheckOut ? (
                      <span style={{ color: '#166534', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                        حضور: {formatTimeText(row?.checkInAt)}
                      </span>
                    ) : (
                      <span style={{ color: '#1e40af', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                        اكتمل: {formatTimeText(row?.checkInAt)} - {formatTimeText(row?.checkOutAt)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '0.85rem' }}>
              <UsersIcon size={24} style={{ margin: '0 auto 6px', display: 'block', opacity: 0.5 }} />
              لا يوجد موظفون مطابقون لبحثك.
            </div>
          )}
        </div>

        {/* Selected Employee Action Dock */}
        {selectedEmployee && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '0.725rem', color: '#64748b', display: 'block' }}>الموظف المحدد:</span>
                <strong style={{ fontSize: '0.925rem', color: '#0f172a' }}>{selectedEmployee.displayName || selectedEmployee.firstName}</strong>
              </div>
              <div style={{ borderRight: '1px solid #cbd5e1', paddingRight: '10px', marginRight: '6px' }}>
                <span style={{ fontSize: '0.725rem', color: '#64748b', display: 'block' }}>حالة اليوم:</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: !hasCheckIn ? '#64748b' : !hasCheckOut ? '#166534' : '#1e40af' }}>
                  {!hasCheckIn ? 'غير مسجل' : !hasCheckOut ? `حاضر منذ (${formatTimeText(selectedAttendance?.checkInAt)})` : `حضور وانصراف مكتملان (${formatTimeText(selectedAttendance?.checkInAt)} - ${formatTimeText(selectedAttendance?.checkOutAt)})`}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {!hasCheckIn ? (
                <button
                  type="button"
                  onClick={() => { void handlePrimaryAction(); }}
                  disabled={mutations.saveAttendanceRecord.isPending}
                  style={{
                    background: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 18px',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <ClockIcon size={16} />
                  <span>{mutations.saveAttendanceRecord.isPending ? 'جارٍ التسجيل...' : `تسجيل حضور الآن (${timeFormatted})`}</span>
                </button>
              ) : !hasCheckOut ? (
                <button
                  type="button"
                  onClick={() => { void handlePrimaryAction(); }}
                  disabled={mutations.saveAttendanceRecord.isPending}
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 18px',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <ClockIcon size={16} />
                  <span>{mutations.saveAttendanceRecord.isPending ? 'جارٍ التسجيل...' : `تسجيل انصراف الآن (${timeFormatted})`}</span>
                </button>
              ) : (
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534', background: '#dcfce7', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircleIcon size={16} />
                  <span>اكتمل تسجيل الحضور والانصراف لهذا اليوم</span>
                </span>
              )}

              <Button type="button" variant="secondary" onClick={handleClose} style={{ padding: '6px 12px', fontSize: '0.825rem' }}>
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </div>
    </DialogShell>
  );
}
