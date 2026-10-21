import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Button } from '@/shared/ui/button';
import type { HrAttendanceException, HrAttendanceRecord } from '@/types/domain';
import { useHrAttendance, useHrAttendanceExceptions, useHrMutations } from '@/features/hr/hooks/useHr';
import { ImportWorkbench } from '@/shared/components/ImportWorkbench';
import {
  DraftRow,
  ExceptionFilter,
  ManualAttendancePrompt,
  todayDate,
  normalizeArabicDigits,
  normalizeTime,
  toDateTime,
  toCheckOutDateTime,
  isOvertimeException,
  isDeductionException,
  isActionableException,
  filterExceptions,
} from '../components/attendance/attendance-types';
import { AttendanceKpiSummary } from '../components/attendance/AttendanceKpiSummary';
import { AttendanceExceptionsTable } from '../components/attendance/AttendanceExceptionsTable';
import { DailyAttendanceTable } from '../components/attendance/DailyAttendanceTable';
import { AttendanceRangeTable } from '../components/attendance/AttendanceRangeTable';
import { ManualAttendanceModal } from '../components/attendance/ManualAttendanceModal';

export function HrAttendancePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mutations = useHrMutations();
  const [date, setDate] = useState(todayDate());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'custom'>('day');
  const [rangeFrom, setRangeFrom] = useState(todayDate().slice(0, 7) + '-01');
  const [rangeTo, setRangeTo] = useState(todayDate());
  const [rangePage, setRangePage] = useState(1);
  const isRange = viewMode !== 'day';
  const selectPeriod = (mode: 'day' | 'week' | 'month' | 'custom') => {
    setViewMode(mode);
    setRangePage(1);
    const local = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (mode === 'week') {
      const start = new Date(date + 'T12:00:00');
      start.setDate(start.getDate() - (start.getDay() + 6) % 7);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      setRangeFrom(local(start)); setRangeTo(local(end));
    } else if (mode === 'month') {
      const month = date.slice(0, 7);
      setRangeFrom(month + '-01');
      setRangeTo(local(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)));
    }
  };
  const [exceptionMonth, setExceptionMonth] = useState(todayDate().slice(0, 7));
  const [search, setSearch] = useState('');
  const [exceptionFilter, setExceptionFilter] = useState<ExceptionFilter>('needs_action');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'unmarked' | 'recorded'>('all');
  const [draftByEmployeeId, setDraftByEmployeeId] = useState<Record<string, DraftRow>>({});
  const [importOpen, setImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'attendance' | 'exceptions'>('attendance');
  const [manualPrompt, setManualPrompt] = useState<ManualAttendancePrompt>(null);
  const [manualTimeInput, setManualTimeInput] = useState('');

  const attendance = useHrAttendance(isRange
    ? { from: rangeFrom, to: rangeTo, search, page: rangePage, pageSize: 100 }
    : { date, search, page: 1, pageSize: 200 });
  const exceptions = useHrAttendanceExceptions({ month: exceptionMonth, search, page: 1, pageSize: 200 });
  const rows = useMemo(() => (attendance.data?.rows || []) as HrAttendanceRecord[], [attendance.data?.rows]);
  const allExceptionRows = useMemo(() => (exceptions.data?.rows || []) as HrAttendanceException[], [exceptions.data?.rows]);
  const exceptionRows = useMemo(() => filterExceptions(allExceptionRows, exceptionFilter), [allExceptionRows, exceptionFilter]);

  const filteredAttendanceRows = useMemo(() => {
    if (isRange || attendanceFilter === 'all') return rows;
    return rows.filter((row) => {
      const status = String(draftByEmployeeId[String(row.employeeId)]?.status || row.status || '');
      if (attendanceFilter === 'unmarked') return !status;
      return !!status;
    });
  }, [rows, draftByEmployeeId, attendanceFilter, isRange]);

  useEffect(() => {
    const next: Record<string, DraftRow> = {};
    if (isRange) return;
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
  }, [rows, isRange]);

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
    const data = attendance.data?.summary;
    return {
      total: isRange ? Number(data?.totalItems || 0) : rows.length,
      present: isRange ? Number(data?.presentCount || 0) : present,
      absent: isRange ? Number(data?.absentCount || 0) : absent,
      late: isRange ? Number(data?.lateCount || 0) : late,
      unmarked: isRange ? 0 : unmarked, needsAction, overtime, deduction,
    };
  }, [rows, draftByEmployeeId, allExceptionRows, isRange, attendance.data?.summary]);

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
        checkOutAt: toCheckOutDateTime(date, draft.checkInAt, draft.checkOutAt),
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
          title={t('hr.hr_attendance_page.s0', "الحضور والانصراف")}
          description={t('hr.hr_attendance_page.s1', "تسجيل الحضور اليومي، مراجعة الاستثناءات والتأخير والأوفر تايم في شاشة واحدة.")}
          actions={
            <div className="actions compact-actions">
              <Button variant={importOpen ? 'primary' : 'secondary'} onClick={() => setImportOpen(!importOpen)}>{t('hr.hr_attendance_page.s2', "استيراد")}</Button>
              <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>{t('hr.hr_attendance_page.s3', "المرتبات")}</Button>
              <Button variant="secondary" onClick={() => navigate('/hr/employees')}>{t('hr.hr_attendance_page.s4', "الموظفون")}</Button>
            </div>
          }
        />
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

          {importOpen && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
              <ImportWorkbench
                title={t('hr.hr_attendance_page.s5', "استيراد الحضور من إكسيل")}
                description={t('hr.hr_attendance_page.s6', "يدعم الأعمدة العربية أو الإنجليزية المكافئة.")}
                defaultCollapsed={false}
                requiredColumns={[t('hr.hr_attendance_page.s7', "كود الموظف"), t('hr.hr_attendance_page.s8', "التاريخ")]}
                fieldMappings={[
                  { key: 'employeeNo', label: t('hr.hr_attendance_page.s9', "كود الموظف (مطلوب)") },
                  { key: 'workDate', label: t('hr.hr_attendance_page.s10', "التاريخ (مطلوب)") },
                  { key: 'checkInAt', label: t('hr.hr_attendance_page.s11', "وقت الحضور") },
                  { key: 'checkOutAt', label: t('hr.hr_attendance_page.s12', "وقت الانصراف") },
                ]}
                isPending={mutations.bulkImportAttendanceRecords.isPending}
                onDownloadTemplate={() => {
                  const csv = t('hr.hr_attendance_page.s13', "كود الموظف,التاريخ,وقت الحضور,وقت الانصراف\n101,2026-07-25,09:00,17:00");
                  const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csv], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = t('hr.hr_attendance_page.s14', "نموذج_الحضور.csv");
                  link.click();
                }}
                onImportRows={async (rows) => {
                  const records = rows.map((row) => {
                    const workDate = String(row[t('hr.hr_attendance_page.s15', "التاريخ")] || row.workDate || '');
                    return {
                      employeeNo: String(row[t('hr.hr_attendance_page.s16', "كود الموظف")] || row.employeeNo || ''),
                      workDate,
                      checkInAt: toDateTime(workDate, row[t('hr.hr_attendance_page.s17', "وقت الحضور")] || row.checkInAt || ''),
                      checkOutAt: toDateTime(workDate, row[t('hr.hr_attendance_page.s18', "وقت الانصراف")] || row.checkOutAt || ''),
                    };
                  }).filter(r => r.employeeNo && r.workDate);
                  return mutations.bulkImportAttendanceRecords.mutateAsync({ records });
                }}
              />
            </div>
          )}

          {activeTab === 'attendance' ? (
            <div className="actions compact-actions" style={{ marginBottom: 10, gap: 6, flexWrap: 'wrap' }}>
              {(['day', 'week', 'month', 'custom'] as const).map(mode => (
                <Button key={mode} type="button" variant={viewMode === mode ? 'primary' : 'secondary'}
                  onClick={() => selectPeriod(mode)}>
                  {{ day: 'يوم', week: 'أسبوع', month: 'شهر', custom: 'من / إلى' }[mode]}
                </Button>
              ))}
              {isRange ? (
                <>
                  <label>من <input type="date" value={rangeFrom} max={rangeTo} onChange={e => { setRangeFrom(e.target.value); setRangePage(1); }} /></label>
                  <label>إلى <input type="date" value={rangeTo} min={rangeFrom} onChange={e => { setRangeTo(e.target.value); setRangePage(1); }} /></label>
                  <strong>إجمالي ساعات التشغيل: {(Number(attendance.data?.summary?.workedMinutes || 0) / 60).toFixed(2)} ساعة</strong>
                  <span>ساعات مرتب بالساعة: {(Number(attendance.data?.summary?.payableMinutes || 0) / 60).toFixed(2)} ساعة</span>
                </>
              ) : null}
            </div>
          ) : null}
          {activeTab === 'attendance' && !isRange ? (
            <div style={{ padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', marginBottom: 10, borderRadius: 8 }}>
              إجمالي ساعات التشغيل اليوم: <strong>{(Number(attendance.data?.summary?.workedMinutes || 0) / 60).toFixed(2)} ساعة</strong>
              <span style={{ marginRight: 14 }}>ساعات مرتب بالساعة: <strong>{(Number(attendance.data?.summary?.payableMinutes || 0) / 60).toFixed(2)} ساعة</strong></span>
            </div>
          ) : null}
          {/* KPI Summary */}
          <AttendanceKpiSummary
            summary={summary}
            activeTab={activeTab}
            attendanceFilter={attendanceFilter}
            exceptionFilter={exceptionFilter}
            onSelectAttendanceFilter={(filter) => {
              setActiveTab('attendance');
              setAttendanceFilter(filter);
            }}
            onSelectExceptionFilter={(filter) => {
              setActiveTab('exceptions');
              setExceptionFilter(filter);
            }}
          />

          {/* Unified Navigation & Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <Button
                type="button"
                variant={activeTab === 'attendance' ? 'primary' : 'secondary'}
                onClick={() => setActiveTab('attendance')}
                style={{ padding: '5px 12px', fontSize: '0.825rem' }}
              >
                {t('hr.hr_attendance_page.s19', "سجل الحضور اليومي")}
              </Button>
              <Button
                type="button"
                variant={activeTab === 'exceptions' ? 'primary' : 'secondary'}
                onClick={() => setActiveTab('exceptions')}
                style={{ padding: '5px 12px', fontSize: '0.825rem', position: 'relative' }}
              >
                {t('hr.hr_attendance_page.s20', "استثناءات الشهر")}
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
              placeholder={t('hr.hr_attendance_page.s21', "بحث بالاسم أو الكود...")}
              style={{ width: '190px', minWidth: '150px', padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', background: '#fff', boxSizing: 'border-box' }}
            />

            {activeTab === 'attendance' ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>{t('hr.hr_attendance_page.s22', "التاريخ:")}</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(normalizeArabicDigits(e.target.value || todayDate()))}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#fff' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Button type="button" variant={attendanceFilter === 'all' ? 'primary' : 'secondary'} onClick={() => setAttendanceFilter('all')} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>{t('hr.hr_attendance_page.s23', "الكل")}</Button>
                  <Button type="button" variant={attendanceFilter === 'unmarked' ? 'primary' : 'secondary'} onClick={() => setAttendanceFilter('unmarked')} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>{t('hr.hr_attendance_page.s24', "لم يسجل")}</Button>
                  <Button type="button" variant={attendanceFilter === 'recorded' ? 'primary' : 'secondary'} onClick={() => setAttendanceFilter('recorded')} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>{t('hr.hr_attendance_page.s25', "مسجل")}</Button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>{t('hr.hr_attendance_page.s26', "الشهر:")}</span>
                  <input
                    type="month"
                    value={exceptionMonth}
                    onChange={(e) => setExceptionMonth(normalizeArabicDigits(e.target.value || todayDate().slice(0, 7)))}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#fff' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Button type="button" variant={exceptionFilter === 'needs_action' ? 'primary' : 'secondary'} onClick={() => setExceptionFilter('needs_action')} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>{t('hr.hr_attendance_page.s27', "يحتاج إجراء")}</Button>
                  <Button type="button" variant={exceptionFilter === 'overtime' ? 'primary' : 'secondary'} onClick={() => setExceptionFilter('overtime')} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>{t('hr.hr_attendance_page.s28', "إضافي")}</Button>
                  <Button type="button" variant={exceptionFilter === 'deduction' ? 'primary' : 'secondary'} onClick={() => setExceptionFilter('deduction')} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>{t('hr.hr_attendance_page.s29', "خصم")}</Button>
                  <Button type="button" variant={exceptionFilter === 'all' ? 'primary' : 'secondary'} onClick={() => setExceptionFilter('all')} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>{t('hr.hr_attendance_page.s30', "الكل")}</Button>
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
              loadingText={t('hr.hr_attendance_page.s31', "جاري تحميل سجلات الحضور...")}
              errorTitle={t('hr.hr_attendance_page.s32', "تعذر تحميل سجلات الحضور.")}
              emptyTitle={t('hr.hr_attendance_page.s33', "لا توجد سجلات مطابقة للفلتر الحالي.")}
            >
              {isRange ? (
                <>
                  <AttendanceRangeTable rows={filteredAttendanceRows} />
                  {Number(attendance.data?.pagination?.totalPages || 1) > 1 ? (
                    <div className="actions compact-actions" style={{ marginTop: 12 }}>
                      <Button type="button" variant="secondary" disabled={rangePage <= 1} onClick={() => setRangePage(n => Math.max(1, n - 1))}>السابق</Button>
                      <span>صفحة {rangePage} من {attendance.data?.pagination?.totalPages}</span>
                      <Button type="button" variant="secondary" disabled={rangePage >= Number(attendance.data?.pagination?.totalPages || 1)} onClick={() => setRangePage(n => n + 1)}>التالي</Button>
                    </div>
                  ) : null}
                </>
              ) : <DailyAttendanceTable rows={filteredAttendanceRows}
                draftByEmployeeId={draftByEmployeeId} onUpdateDraft={updateDraft} onSaveRow={saveRow} />}
            </QueryFeedback>
          ) : (
            <QueryFeedback
              isLoading={exceptions.isLoading}
              isError={exceptions.isError}
              error={exceptions.error}
              isEmpty={!exceptionRows.length}
              loadingText={t('hr.hr_attendance_page.s34', "جاري تحميل الاستثناءات...")}
              errorTitle={t('hr.hr_attendance_page.s35', "تعذر تحميل الاستثناءات.")}
              emptyTitle={t('hr.hr_attendance_page.s36', "لا توجد استثناءات مطابقة لهذا الفلتر.")}
            >
              <AttendanceExceptionsTable
                rows={exceptionRows}
                onApprove={approveException}
                onSkip={skipException}
                onOpenManualPrompt={(p) => {
                  setManualTimeInput(p?.defaultTime || '09:00');
                  setManualPrompt(p);
                }}
                isApprovePending={mutations.approveAttendanceException.isPending}
                isSkipPending={mutations.skipAttendanceException.isPending}
              />
            </QueryFeedback>
          )}

          <ManualAttendanceModal
            prompt={manualPrompt}
            timeInput={manualTimeInput}
            setTimeInput={setManualTimeInput}
            isPending={mutations.saveAttendanceRecord.isPending}
            onClose={() => setManualPrompt(null)}
            onSubmit={(e) => { void submitManualTime(e); }}
          />
        </div>
      </main>
    </div>
  );
}
