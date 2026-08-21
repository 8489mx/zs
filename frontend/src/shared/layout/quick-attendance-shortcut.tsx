import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { getErrorMessage } from '@/lib/errors';
import { hrApi } from '@/features/hr/api/hr.api';
import { useHrMutations } from '@/features/hr/hooks/useHr';
import type { HrAttendanceRecord, HrEmployee } from '@/types/domain';
import { ClockIcon, CheckCircleIcon } from '@/features/hr/components/HrIcons';

export const QUICK_ATTENDANCE_SHORTCUT = 'Ctrl + Alt + H';

interface QuickAttendanceShortcutProps {
  open: boolean;
  onClose: () => void;
}

type FilterTab = 'all' | 'unmarked' | 'present' | 'completed';

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
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
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
    let list = employees;

    if (term) {
      list = list.filter((employee) => {
        const haystack = [employee.employeeNo, employee.displayName, employee.firstName, employee.lastName, employee.departmentName, employee.jobTitleName].map(normalize).join(' ');
        return haystack.includes(term);
      });
    }

    if (activeTab === 'unmarked') {
      list = list.filter((e) => !attendanceMap.get(String(e.id))?.checkInAt);
    } else if (activeTab === 'present') {
      list = list.filter((e) => {
        const att = attendanceMap.get(String(e.id));
        return att?.checkInAt && !att?.checkOutAt;
      });
    } else if (activeTab === 'completed') {
      list = list.filter((e) => {
        const att = attendanceMap.get(String(e.id));
        return att?.checkInAt && att?.checkOutAt;
      });
    }

    return list;
  }, [employees, search, activeTab, attendanceMap]);

  // Auto-select first matching employee if current selection is invalid
  useEffect(() => {
    if (filteredEmployees.length > 0 && (!selectedEmployeeId || !filteredEmployees.some(e => String(e.id) === selectedEmployeeId))) {
      setSelectedEmployeeId(String(filteredEmployees[0].id));
    } else if (filteredEmployees.length === 0) {
      setSelectedEmployeeId('');
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

  const topQuickEmployees = useMemo(() => employees.slice(0, 5), [employees]);

  return (
    <DialogShell open={shortcutOpen} onClose={handleClose} width="min(880px, calc(100vw - 40px))" ariaLabel="تسجيل حضور أو انصراف سريع">
      <div
        dir="rtl"
        style={{
          boxSizing: 'border-box',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '520px',
          gap: '16px',
          background: '#ffffff',
        }}
      >
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ borderRight: '4px solid var(--primary, #170c5c)', paddingRight: '12px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>نافذة تسجيل الحضور والانصراف السريع</h3>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              تسجيل الحضور والانصراف اللحظي ومتابعة حالة اليوم دون مغادرة الصفحة الحالية.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Live Clock Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f172a', color: '#ffffff', padding: '6px 14px', borderRadius: '20px', fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} />
              <span>{timeFormatted}</span>
            </div>

            <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
              {QUICK_ATTENDANCE_SHORTCUT}
            </span>
          </div>
        </div>

        {/* Quick Filter Segment Tabs */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: '#f8fafc', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          {[
            { id: 'all', label: `كل الموظفين (${employees.length})` },
            { id: 'unmarked', label: `لم يسجل اليوم (${employees.filter(e => !attendanceMap.get(String(e.id))?.checkInAt).length})` },
            { id: 'present', label: `حاضر الآن (${employees.filter(e => { const a = attendanceMap.get(String(e.id)); return a?.checkInAt && !a?.checkOutAt; }).length})` },
            { id: 'completed', label: `اكتمل (${employees.filter(e => { const a = attendanceMap.get(String(e.id)); return a?.checkInAt && a?.checkOutAt; }).length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as FilterTab)}
              style={{
                flex: 1,
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === tab.id ? 'var(--primary, #170c5c)' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : '#475569',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Combobox & Quick Chips Card */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1rem' }}>🔍</span>
            <input
              data-autofocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="اكتب اسم الموظف أو الكود أو القسم للبحث السريع..."
              style={{
                width: '100%',
                padding: '10px 36px 10px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                background: '#ffffff',
                outline: 'none',
                transition: 'all 0.15s ease',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--primary, #170c5c)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; }}
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

          {topQuickEmployees.length > 0 && !search && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>⚡ اختيار سريع:</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {topQuickEmployees.map((e) => {
                  const isSel = selectedEmployeeId === String(e.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setSelectedEmployeeId(String(e.id))}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        border: `1px solid ${isSel ? 'var(--primary, #170c5c)' : '#cbd5e1'}`,
                        background: isSel ? 'rgba(23, 12, 92, 0.08)' : '#ffffff',
                        color: isSel ? 'var(--primary, #170c5c)' : '#334155',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {e.displayName || e.firstName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: feedback.type === 'success' ? '#166534' : '#991b1b',
              border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {feedback.type === 'success' ? <CheckCircleIcon size={18} /> : null}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Error state */}
        {employeesQuery.isError || attendanceQuery.isError ? (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '6px', fontSize: '0.825rem' }}>
            {getErrorMessage(employeesQuery.error || attendanceQuery.error, 'تعذر تحميل بيانات الموظفين.')}
          </div>
        ) : null}

        {/* Center Main Stage (Flex-1) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {selectedEmployee ? (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              {/* Employee Top Profile Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary, #170c5c), #3b82f6)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 800, flexShrink: 0, boxShadow: '0 2px 6px rgba(23, 12, 92, 0.25)' }}>
                    {(selectedEmployee.displayName || selectedEmployee.firstName || 'م').slice(0, 2)}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                      {selectedEmployee.displayName || `${selectedEmployee.firstName || ''} ${selectedEmployee.lastName || ''}`.trim()}
                    </h4>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                      كود الموظف: <strong>{selectedEmployee.employeeNo || '—'}</strong>
                      {selectedEmployee.departmentName ? ` · قسم ${selectedEmployee.departmentName}` : ''}
                      {selectedEmployee.jobTitleName ? ` · ${selectedEmployee.jobTitleName}` : ''}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>تاريخ اليوم:</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: '6px' }}>{dateFormatted}</span>
                </div>
              </div>

              {/* 3 KPI Status Boxes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>وقت الحضور اليوم</span>
                  <strong style={{ fontSize: '1.15rem', fontWeight: 800, color: hasCheckIn ? '#166534' : '#94a3b8' }}>
                    {formatTimeText(selectedAttendance?.checkInAt)}
                  </strong>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>وقت الانصراف اليوم</span>
                  <strong style={{ fontSize: '1.15rem', fontWeight: 800, color: hasCheckOut ? '#1e40af' : '#94a3b8' }}>
                    {formatTimeText(selectedAttendance?.checkOutAt)}
                  </strong>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>حالة التسجيل</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: !hasCheckIn ? '#94a3b8' : !hasCheckOut ? '#22c55e' : '#3b82f6', display: 'inline-block' }} />
                    <strong style={{ fontSize: '0.95rem', fontWeight: 800, color: !hasCheckIn ? '#64748b' : !hasCheckOut ? '#166534' : '#1e40af' }}>
                      {!hasCheckIn ? 'لم يسجل اليوم' : !hasCheckOut ? 'حاضر بالعمل' : 'اكتمل حضور وانصراف'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Instant Action Strip */}
              <div style={{ background: 'linear-gradient(135deg, rgba(23, 12, 92, 0.04), rgba(59, 130, 246, 0.04))', border: '1px solid rgba(23, 12, 92, 0.12)', borderRadius: '8px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', display: 'block' }}>
                    {!hasCheckIn ? 'تسجيل بصمة الحضور الآن' : !hasCheckOut ? 'تسجيل بصمة الانصراف الآن' : 'تم استكمال الدوام بالكامل'}
                  </span>
                  <small style={{ fontSize: '0.725rem', color: '#64748b' }}>
                    {!hasCheckIn ? 'سيتم اعتماد الوقت الحالي كبداية الوردية الفعلية للموظف.' : !hasCheckOut ? 'سيتم احتساب ساعات العمل والوقت الإضافي حتى هذه اللحظة.' : 'كافة أوقات الحضور والانصراف مسجلة ومعتمدة في الكشف اليومي.'}
                  </small>
                </div>

                <div>
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
                        padding: '10px 22px',
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 3px 8px rgba(22, 163, 74, 0.3)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <ClockIcon size={18} />
                      <span>{mutations.saveAttendanceRecord.isPending ? 'جارٍ الحفظ...' : `تسجيل حضور الآن (${timeFormatted})`}</span>
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
                        padding: '10px 22px',
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 3px 8px rgba(220, 38, 38, 0.3)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <ClockIcon size={18} />
                      <span>{mutations.saveAttendanceRecord.isPending ? 'جارٍ الحفظ...' : `تسجيل انصراف الآن (${timeFormatted})`}</span>
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#166534', background: '#dcfce7', border: '1px solid #bbf7d0', padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircleIcon size={18} />
                      <span>اكتمل تسجيل الحضور والانصراف لهذا اليوم</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, border: '2px dashed #cbd5e1', borderRadius: '10px', padding: '36px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: '#f8fafc' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(23, 12, 92, 0.08)', color: 'var(--primary, #170c5c)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <ClockIcon size={28} />
              </div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>اختر موظفاً لبدء تسجيل الحضور أو الانصراف</h4>
              <p style={{ fontSize: '0.825rem', color: '#64748b', maxWidth: '440px', margin: 0 }}>
                يمكنك كتابة اسم الموظف أو الكود في مربع البحث بالأعلى، أو التصفية بالضغط على التبويبات لعرض كرت الموظف وتسجيل البصمة فوراً.
              </p>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: 'auto' }}>
          <Button type="button" variant="secondary" onClick={handleClose} style={{ padding: '6px 18px', fontSize: '0.85rem' }}>
            إغلاق النافذة
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
