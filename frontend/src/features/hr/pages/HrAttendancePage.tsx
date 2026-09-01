import { useEffect, useMemo, useState } from 'react'; 
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { DataTable } from '@/shared/ui/data-table';
import type { HrAttendanceException, HrAttendanceRecord } from '@/types/domain';
import { useHrAttendance, useHrAttendanceExceptions, useHrMutations } from '@/features/hr/hooks/useHr';
import { ImportWorkbench } from '@/shared/components/ImportWorkbench';
import { DialogShell } from '@/shared/components/dialog-shell';

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
  if (!safeTime) return undefined;
  const localDate = new Date(`${workDate}T${safeTime}:00`);
  return !isNaN(localDate.getTime()) ? localDate.toISOString() : `${workDate}T${safeTime}:00`;
}

function exceptionTypeLabel(value: string) {
  switch (value) {
    case 'early_check_in': return 'حضور مبكر';
    case 'late_check_in': return 'تأخير';
    case 'early_check_out': return 'انصراف مبكر';
    case 'late_check_out': return 'انصراف متأخر';
    case 'missing_check_in': return 'حضور غير مسجل';
    case 'missing_check_out': return 'انصراف غير مسجل';
    case 'extra_hours': return 'ساعات إضافية';
    case 'absent': return 'غياب';
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
  return type === 'early_check_in' || type === 'late_check_out' || type === 'extra_hours';
}

function isDeductionException(type: string) {
  return type === 'late_check_in' || type === 'early_check_out' || type === 'missing_check_in' || type === 'missing_check_out' || type === 'absent';
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

type ManualAttendancePrompt = {
  rowId: string;
  employeeId: number;
  workDate: string;
  type: 'check_in' | 'check_out';
  defaultTime: string;
} | null;

export function HrAttendancePage() {
  const navigate = useNavigate();
  const mutations = useHrMutations();
  const [date, setDate] = useState(todayDate());
  const [exceptionMonth, setExceptionMonth] = useState(todayDate().slice(0, 7));
  const [search, setSearch] = useState('');
  const [exceptionFilter, setExceptionFilter] = useState<ExceptionFilter>('needs_action');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'unmarked' | 'recorded'>('all');
  const [draftByEmployeeId, setDraftByEmployeeId] = useState<Record<string, DraftRow>>({});
  const [importOpen, setImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'attendance' | 'exceptions'>('attendance');
  const [manualPrompt, setManualPrompt] = useState<ManualAttendancePrompt>(null);
  const [manualTimeInput, setManualTimeInput] = useState('');

  const attendance = useHrAttendance({ date, search, page: 1, pageSize: 200 });
  const exceptions = useHrAttendanceExceptions({ month: exceptionMonth, search, page: 1, pageSize: 200 });
  const rows = useMemo(() => (attendance.data?.rows || []) as HrAttendanceRecord[], [attendance.data?.rows]);
  const allExceptionRows = useMemo(() => (exceptions.data?.rows || []) as HrAttendanceException[], [exceptions.data?.rows]);
  const exceptionRows = useMemo(() => filterExceptions(allExceptionRows, exceptionFilter), [allExceptionRows, exceptionFilter]);

  const filteredAttendanceRows = useMemo(() => {
    if (attendanceFilter === 'all') return rows;
    return rows.filter((row) => {
      const status = String(draftByEmployeeId[String(row.employeeId)]?.status || row.status || '');
      if (attendanceFilter === 'unmarked') return !status;
      return !!status;
    });
  }, [rows, draftByEmployeeId, attendanceFilter]);

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

  const saveRow = async (employeeId: string, patch?: Partial<DraftRow>) => {
    const current = draftByEmployeeId[employeeId] || { employeeId, status: '', checkInAt: '', checkOutAt: '', notes: '' };
    const draft = patch ? { ...current, ...patch } : current;
    if (!draft.status && (draft.checkInAt || draft.checkOutAt)) draft.status = 'present';
    
    if (patch) {
      setDraftByEmployeeId((prev) => ({ ...prev, [employeeId]: draft }));
    }

    if (draft.status || draft.checkInAt || draft.checkOutAt) {
      const payloadRow = {
        employeeId: Number(normalizeArabicDigits(draft.employeeId)),
        workDate: date,
        status: draft.status || 'present',
        checkInAt: toDateTime(date, draft.checkInAt),
        checkOutAt: toDateTime(date, draft.checkOutAt),
        notes: draft.notes || undefined,
        source: 'manual',
      };
      await mutations.saveAttendanceDay.mutateAsync({ workDate: date, rows: [payloadRow] }).catch(console.error);
    }
  };

  const approveException = async (id: string) => {
    await mutations.approveAttendanceException.mutateAsync({ id, payload: {} });
  };

  const skipException = async (id: string) => {
    await mutations.skipAttendanceException.mutateAsync({ id, payload: {} });
  };

  const submitManualTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPrompt || !manualTimeInput) return;
    const { rowId, employeeId, workDate, type } = manualPrompt;
    const payload = {
      employeeId,
      workDate,
      status: 'present',
      ...(type === 'check_in' ? { checkInAt: toDateTime(workDate, manualTimeInput) } : { checkOutAt: toDateTime(workDate, manualTimeInput) })
    };
    setManualPrompt(null);
    mutations.saveAttendanceRecord.mutateAsync(payload)
      .then(() => mutations.skipAttendanceException.mutateAsync({ id: rowId, payload: {} }))
      .catch(console.error);
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '20px' }}>
        <PageHeader
          title="الحضور والانصراف"
          description="تسجيل الحضور اليومي، مراجعة الاستثناءات والتأخير والأوفر تايم في شاشة واحدة."
          actions={
            <div className="actions compact-actions">
              <Button variant={importOpen ? 'primary' : 'secondary'} onClick={() => setImportOpen(!importOpen)}>استيراد</Button>
              <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>المرتبات</Button>
              <Button variant="secondary" onClick={() => navigate('/hr/employees')}>الموظفون</Button>
            </div>
          }
        />
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

          {importOpen && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
              <ImportWorkbench
                title="استيراد الحضور من إكسيل"
                description="يدعم الأعمدة العربية أو الإنجليزية المكافئة."
                defaultCollapsed={false}
                requiredColumns={['كود الموظف', 'التاريخ']}
                fieldMappings={[
                  { key: 'employeeNo', label: 'كود الموظف (مطلوب)' },
                  { key: 'workDate', label: 'التاريخ (مطلوب)' },
                  { key: 'checkInAt', label: 'وقت الحضور' },
                  { key: 'checkOutAt', label: 'وقت الانصراف' },
                ]}
                isPending={mutations.bulkImportAttendanceRecords.isPending}
                onDownloadTemplate={() => {
                  const csv = 'كود الموظف,التاريخ,وقت الحضور,وقت الانصراف\n101,2026-07-25,09:00,17:00';
                  const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csv], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = 'نموذج_الحضور.csv';
                  link.click();
                }}
                onImportRows={async (rows) => {
                  const records = rows.map((row) => {
                    const workDate = String(row['التاريخ'] || row.workDate || '');
                    return {
                      employeeNo: String(row['كود الموظف'] || row.employeeNo || ''),
                      workDate,
                      checkInAt: toDateTime(workDate, row['وقت الحضور'] || row.checkInAt || ''),
                      checkOutAt: toDateTime(workDate, row['وقت الانصراف'] || row.checkOutAt || ''),
                    };
                  }).filter(r => r.employeeNo && r.workDate);
                  return mutations.bulkImportAttendanceRecords.mutateAsync({ records });
                }}
              />
            </div>
          )}

          {/* Compact Single-Row KPI Summary Bar */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#0f172a' }}>ملخص حضور اليوم والاستثناءات</span>
              <span style={{ fontSize: '0.725rem', color: '#64748b' }}>اضغط على أي مؤشر للتبديل والتصفية الفورية</span>
            </div>
            
            <div className="hr-operational-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: '8px' }}>
              {[
                { label: 'إجمالي اليوم', value: summary.total, onClick: () => { setActiveTab('attendance'); setAttendanceFilter('all'); }, isAlert: false, active: activeTab === 'attendance' && attendanceFilter === 'all' },
                { label: 'حاضر', value: summary.present, onClick: () => { setActiveTab('attendance'); setAttendanceFilter('recorded'); }, isAlert: false, active: activeTab === 'attendance' && attendanceFilter === 'recorded' },
                { label: 'غائب', value: summary.absent, onClick: () => { setActiveTab('exceptions'); setExceptionFilter('needs_action'); }, isAlert: summary.absent > 0 },
                { label: 'متأخر', value: summary.late, onClick: () => { setActiveTab('exceptions'); setExceptionFilter('deduction'); }, isAlert: summary.late > 0 },
                { label: 'غير مسجل', value: summary.unmarked, onClick: () => { setActiveTab('attendance'); setAttendanceFilter('unmarked'); }, isAlert: summary.unmarked > 0, active: activeTab === 'attendance' && attendanceFilter === 'unmarked' },
                { label: 'تحتاج إجراء', value: summary.needsAction, onClick: () => { setActiveTab('exceptions'); setExceptionFilter('needs_action'); }, isAlert: summary.needsAction > 0, active: activeTab === 'exceptions' && exceptionFilter === 'needs_action' },
                { label: 'إضافي محتمل', value: summary.overtime, onClick: () => { setActiveTab('exceptions'); setExceptionFilter('overtime'); }, isAlert: false, active: activeTab === 'exceptions' && exceptionFilter === 'overtime' },
                { label: 'خصم محتمل', value: summary.deduction, onClick: () => { setActiveTab('exceptions'); setExceptionFilter('deduction'); }, isAlert: summary.deduction > 0, active: activeTab === 'exceptions' && exceptionFilter === 'deduction' },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  onClick={stat.onClick}
                  style={{
                    background: stat.active ? '#eff6ff' : '#ffffff',
                    border: `1px solid ${stat.active ? '#3b82f6' : stat.isAlert ? '#fca5a5' : '#e2e8f0'}`,
                    borderRadius: '6px',
                    padding: '8px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    minWidth: 0,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#94a3b8')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = stat.active ? '#3b82f6' : stat.isAlert ? '#fca5a5' : '#e2e8f0')}
                >
                  <span style={{ fontSize: '0.725rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stat.label}>
                    {stat.label}
                  </span>
                  <strong style={{ fontSize: '1.05rem', fontWeight: 800, color: stat.isAlert ? '#dc2626' : stat.active ? '#1d4ed8' : '#0f172a', lineHeight: 1.2 }}>
                    {stat.value}
                  </strong>
                </div>
              ))}
            </div>
          </div>

          {/* Unified Navigation & Toolbar - Single Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <Button
                type="button"
                variant={activeTab === 'attendance' ? 'primary' : 'secondary'}
                onClick={() => setActiveTab('attendance')}
                style={{ padding: '5px 12px', fontSize: '0.825rem' }}
              >
                سجل الحضور اليومي
              </Button>
              <Button
                type="button"
                variant={activeTab === 'exceptions' ? 'primary' : 'secondary'}
                onClick={() => setActiveTab('exceptions')}
                style={{ padding: '5px 12px', fontSize: '0.825rem', position: 'relative' }}
              >
                استثناءات الشهر
                {summary.needsAction > 0 && (
                  <span style={{ marginRight: '6px', background: '#dc2626', color: '#ffffff', borderRadius: '10px', padding: '1px 6px', fontSize: '0.7rem', fontWeight: 800 }}>
                    {summary.needsAction}
                  </span>
                )}
              </Button>
            </div>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الكود..."
              style={{ width: '190px', minWidth: '150px', padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', background: '#fff', boxSizing: 'border-box' }}
            />

            {activeTab === 'attendance' ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>التاريخ:</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(normalizeArabicDigits(e.target.value || todayDate()))}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#fff' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Button type="button" variant={attendanceFilter === 'all' ? 'primary' : 'secondary'} onClick={() => setAttendanceFilter('all')} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>الكل</Button>
                  <Button type="button" variant={attendanceFilter === 'unmarked' ? 'primary' : 'secondary'} onClick={() => setAttendanceFilter('unmarked')} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>لم يسجل</Button>
                  <Button type="button" variant={attendanceFilter === 'recorded' ? 'primary' : 'secondary'} onClick={() => setAttendanceFilter('recorded')} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>مسجل</Button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>الشهر:</span>
                  <input
                    type="month"
                    value={exceptionMonth}
                    onChange={(e) => setExceptionMonth(normalizeArabicDigits(e.target.value || todayDate().slice(0, 7)))}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#fff' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Button type="button" variant={exceptionFilter === 'needs_action' ? 'primary' : 'secondary'} onClick={() => setExceptionFilter('needs_action')} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>يحتاج إجراء</Button>
                  <Button type="button" variant={exceptionFilter === 'overtime' ? 'primary' : 'secondary'} onClick={() => setExceptionFilter('overtime')} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>إضافي</Button>
                  <Button type="button" variant={exceptionFilter === 'deduction' ? 'primary' : 'secondary'} onClick={() => setExceptionFilter('deduction')} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>خصم</Button>
                  <Button type="button" variant={exceptionFilter === 'all' ? 'primary' : 'secondary'} onClick={() => setExceptionFilter('all')} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>الكل</Button>
                </div>
              </div>
            )}
          </div>

          {/* Active View Content */}
          {activeTab === 'attendance' ? (
            <QueryFeedback
              isLoading={attendance.isLoading}
              isError={attendance.isError}
              error={attendance.error}
              isEmpty={!filteredAttendanceRows.length}
              loadingText="جاري تحميل سجلات الحضور..."
              errorTitle="تعذر تحميل سجلات الحضور."
              emptyTitle="لا توجد سجلات مطابقة للفلتر الحالي."
            >
              <DataTable
                rows={filteredAttendanceRows}
                rowKey={(row) => String(row.employeeId)}
                density="compact"
                columns={[
                  { key: 'employeeNo', header: 'كود الموظف', className: 'col-fit', cell: (row) => row.employeeNo || '—' },
                  { key: 'employeeName', header: 'اسم الموظف', className: 'col-main', cell: (row) => row.employeeName || '—' },
                  { key: 'departmentName', header: 'القسم', className: 'col-fit', cell: (row) => row.departmentName || '—' },
                  {
                    key: 'checkInAt',
                    header: 'وقت الحضور',
                    className: 'col-fit',
                    cell: (row) => (
                      <input
                        type="time"
                        value={draftByEmployeeId[String(row.employeeId)]?.checkInAt || ''}
                        onChange={(e) => updateDraft(String(row.employeeId), { checkInAt: normalizeTime(e.target.value) })}
                        style={{ padding: '2px 6px', fontSize: '0.85rem' }}
                      />
                    ),
                  },
                  {
                    key: 'checkOutAt',
                    header: 'وقت الانصراف',
                    className: 'col-fit',
                    cell: (row) => (
                      <input
                        type="time"
                        value={draftByEmployeeId[String(row.employeeId)]?.checkOutAt || ''}
                        onChange={(e) => updateDraft(String(row.employeeId), { checkOutAt: normalizeTime(e.target.value) })}
                        style={{ padding: '2px 6px', fontSize: '0.85rem' }}
                      />
                    ),
                  },
                  {
                    key: 'status',
                    header: 'الحالة',
                    className: 'col-fit',
                    cell: (row) => (
                      <div style={{ width: '130px' }}>
                        <CustomSelect
                          value={draftByEmployeeId[String(row.employeeId)]?.status || ''}
                          onChange={(val) => updateDraft(String(row.employeeId), { status: val })}
                          options={[
                            { value: '', label: 'غير مسجل' },
                            { value: 'present', label: 'حاضر' },
                            { value: 'absent', label: 'غائب' },
                            { value: 'late', label: 'متأخر' },
                            { value: 'early_leave', label: 'انصراف مبكر' },
                            { value: 'leave', label: 'إجازة' },
                            { value: 'half_day', label: 'نصف يوم' },
                            { value: 'excused', label: 'بعذر' },
                          ]}
                        />
                      </div>
                    ),
                  },

                  {
                    key: 'notes',
                    header: 'ملاحظات',
                    className: 'col-main',
                    cell: (row) => (
                      <input
                        value={draftByEmployeeId[String(row.employeeId)]?.notes || ''}
                        onChange={(e) => updateDraft(String(row.employeeId), { notes: e.target.value })}
                        placeholder="ملاحظات..."
                        style={{ padding: '2px 6px', fontSize: '0.85rem', width: '100%' }}
                      />
                    ),
                  },
                  {
                    key: 'actions',
                    header: 'إجراء',
                    className: 'col-fit',
                    cell: (row) => (
                      <Button type="button" onClick={() => saveRow(String(row.employeeId))} style={{ padding: '2px 10px', fontSize: '0.8rem' }}>حفظ</Button>
                    ),
                  },
                ]}
              />
            </QueryFeedback>
          ) : (
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
                  { key: 'workDate', header: 'التاريخ', className: 'col-fit', cell: (row) => row.workDate || '—' },
                  { key: 'employeeNo', header: 'كود الموظف', className: 'col-fit', cell: (row) => row.employeeNo || '—' },
                  { key: 'employeeName', header: 'اسم الموظف', className: 'col-main', cell: (row) => row.employeeName || '—' },
                  {
                    key: 'exceptionType',
                    header: 'نوع الاستثناء',
                    className: 'col-fit',
                    cell: (row) => {
                      const label = exceptionTypeLabel(row.exceptionType);
                      const isRed = row.status === 'needs_review' || row.status === 'pending' || isOvertimeException(row.exceptionType);
                      return isRed ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{label}</span> : <span>{label}</span>;
                    },
                  },
                  { key: 'scheduledTime', header: 'المجدول', className: 'col-fit', cell: (row) => row.scheduledTime || '?' },
                  { key: 'actualTime', header: 'الفعلي', className: 'col-fit', cell: (row) => row.actualTime || '?' },
                  { key: 'durationMinutes', header: 'المدة', className: 'col-fit', cell: (row) => `${row.durationMinutes || 0} د` },
                  {
                    key: 'status',
                    header: 'الحالة',
                    className: 'col-fit',
                    cell: (row) => {
                      const label = exceptionStatusLabel(row.status);
                      const isRed = row.status === 'needs_review' || row.status === 'pending';
                      return isRed ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{label}</span> : <span>{label}</span>;
                    },
                  },
                  {
                    key: 'actions',
                    header: 'الإجراء',
                    className: 'col-fit',
                    cell: (row) => {
                      if (row.status !== 'pending') return <span className="muted">{exceptionStatusLabel(row.status)}</span>;

                      const isMissingCheckIn = row.exceptionType === 'missing_check_in';
                      const isMissingCheckOut = row.exceptionType === 'missing_check_out';
                      const isLateIn = row.exceptionType === 'late_check_in';
                      const isEarlyOut = row.exceptionType === 'early_check_out';
                      const isAbsent = row.exceptionType === 'absent';

                      if (isOvertimeException(row.exceptionType)) {
                        return (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <Button type="button" variant="secondary" disabled={mutations.approveAttendanceException.isPending || mutations.skipAttendanceException.isPending} onClick={() => { void approveException(row.id); }} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>اعتماد كإضافي</Button>
                            <Button type="button" variant="secondary" disabled={mutations.approveAttendanceException.isPending || mutations.skipAttendanceException.isPending} onClick={() => { void skipException(row.id); }} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>تخطي</Button>
                          </div>
                        );
                      }

                      if (isMissingCheckIn || isMissingCheckOut) {
                        return (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <Button type="button" variant="secondary" onClick={() => {
                              setManualTimeInput(isMissingCheckIn ? '09:00' : '17:00');
                              setManualPrompt({
                                rowId: String(row.id),
                                employeeId: Number(row.employeeId || row.employeeNo),
                                workDate: String(row.workDate),
                                type: isMissingCheckIn ? 'check_in' : 'check_out',
                                defaultTime: isMissingCheckIn ? '09:00' : '17:00',
                              });
                            }} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>تسجيل {isMissingCheckIn ? 'حضور' : 'انصراف'}</Button>
                            <Button type="button" variant="secondary" disabled={mutations.skipAttendanceException.isPending} onClick={() => { void skipException(row.id); }} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>تخطي</Button>
                          </div>
                        );
                      }

                      if (isLateIn || isEarlyOut) {
                        return (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <Button type="button" variant="secondary" disabled={mutations.approveAttendanceException.isPending} onClick={() => { void approveException(row.id); }} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>تأكيد الخصم</Button>
                            <Button type="button" variant="secondary" disabled={mutations.skipAttendanceException.isPending} onClick={() => { void skipException(row.id); }} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>تجاهل (عذر)</Button>
                          </div>
                        );
                      }

                      if (isAbsent) {
                        return (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <Button type="button" variant="secondary" disabled={mutations.approveAttendanceException.isPending} onClick={() => { void approveException(row.id); }} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>تأكيد الغياب</Button>
                            <Button type="button" variant="secondary" disabled={mutations.skipAttendanceException.isPending} onClick={() => { void skipException(row.id); }} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>تخطي</Button>
                          </div>
                        );
                      }

                      return <span className="muted">{exceptionStatusLabel(row.status)}</span>;
                    },
                  },
                ]}
              />
            </QueryFeedback>
          )}

          {manualPrompt && (
            <DialogShell open={true} onClose={() => setManualPrompt(null)} width="400px">
              <form className="document-prototype-section" onSubmit={(e) => { void submitManualTime(e); }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1.25rem' }}>
                  تسجيل {manualPrompt.type === 'check_in' ? 'حضور' : 'انصراف'} يدوي
                </h3>
                <div className="form-grid">
                  <label className="field field-wide">
                    <span>أدخل الوقت</span>
                    <input
                      type="time"
                      required
                      autoFocus
                      value={manualTimeInput}
                      onChange={(e) => setManualTimeInput(e.target.value)}
                    />
                  </label>
                </div>
                <div className="actions compact-actions" style={{ marginTop: 24, justifyContent: 'flex-end' }}>
                  <Button type="button" variant="secondary" onClick={() => setManualPrompt(null)}>إلغاء</Button>
                  <Button type="submit" disabled={mutations.saveAttendanceRecord.isPending}>تسجيل</Button>
                </div>
              </form>
            </DialogShell>
          )}
        </div>
      </main>
    </div>
  );
}
