import { useEffect, useMemo, useState } from 'react'; 
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { getErrorMessage } from '@/lib/errors';
import type { HrAttendanceException, HrAttendanceRecord } from '@/types/domain';
import { useHrAttendance, useHrAttendanceExceptions, useHrMutations } from '@/features/hr/hooks/useHr';
import { ImportWorkbench } from '@/shared/components/ImportWorkbench';

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
  const [exceptionMonth, setExceptionMonth] = useState(todayDate().slice(0, 7));
  const [search, setSearch] = useState('');
  const [exceptionFilter, setExceptionFilter] = useState<ExceptionFilter>('needs_action');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'unmarked' | 'recorded'>('all');
  const [draftByEmployeeId, setDraftByEmployeeId] = useState<Record<string, DraftRow>>({});
  const [importOpen, setImportOpen] = useState(false);

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

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
      <PageHeader
        title="الحضور والانصراف"
        description="ابدأ بتحديد اليوم، راجع الاستثناءات التي تؤثر على الراتب، ثم احفظ أي تعديل على سجل الحضور."
        actions={(
          <div className="compact-actions">
            <Button variant={importOpen ? 'primary' : 'secondary'} onClick={() => setImportOpen(!importOpen)}>استيراد إكسيل</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>سجل المرتبات</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع</Button>
          </div>
        )}
      />

      {importOpen && (
        <FormSection title="استيراد الحضور من إكسيل" description="ارفع شيت الإكسيل الصادر من جهاز البصمة هنا.">
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
        </FormSection>
      )}

      <FormSection title="ملخص اليوم" description="اضغط على أرقام الاستثناءات لتصفية قائمة المراجعة بالأسفل.">
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
      </FormSection>

      <FormSection title="سجل الحضور اليومي" description="اختر تاريخ اليوم لعرض السجل وتسجيل الحضور والانصراف.">
        <div className="form-grid">
          <label className="field">
            <span>التاريخ</span>
            <input type="date" value={date} onChange={(e) => setDate(normalizeArabicDigits(e.target.value || todayDate()))} />
          </label>
          <div className="field field-wide">
            <span>بحث الموظف (لليوم والاستثناءات)</span>
            <SearchToolbar search={search} onSearchChange={setSearch} searchPlaceholder="ابحث باسم الموظف أو الكود" />
          </div>
        </div>
      </FormSection>

      <FormSection title="استثناءات تحتاج مراجعة" description="يتم عرض الاستثناءات بالشهر. الاستثناءات المعتمدة هنا ستؤثر على المرتب تلقائيًا.">
        <div className="form-grid" style={{ marginBottom: 12 }}>
          <label className="field">
            <span>شهر الاستثناءات</span>
            <input type="month" value={exceptionMonth} onChange={(e) => setExceptionMonth(normalizeArabicDigits(e.target.value || todayDate().slice(0, 7)))} />
          </label>
        </div>
        {summary.needsAction > 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', padding: '12px 16px', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>
              <strong>تنبيه هام!</strong> يوجد <strong>{summary.needsAction}</strong> استثناء أو أكثر بحاجة لمراجعتك وتدخل منك.
            </div>
          </div>
        )}
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
              { key: 'workDate', header: 'التاريخ', className: 'col-fit', cell: (row) => row.workDate || '—' },
              { key: 'employeeNo', header: 'كود الموظف', className: 'col-fit', cell: (row) => row.employeeNo || '—' },
              { key: 'employeeName', header: 'اسم الموظف', className: 'col-main', cell: (row) => row.employeeName || '—' },
              { key: 'exceptionType', header: 'نوع الاستثناء', className: 'col-fit', cell: (row) => {
                  const label = exceptionTypeLabel(row.exceptionType);
                  const isRed = row.status === 'needs_review' || row.status === 'pending' || isOvertimeException(row.exceptionType);
                  return isRed ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{label}</span> : <span>{label}</span>;
              } },
              { key: 'scheduledTime', header: 'المجدول', className: 'col-fit', cell: (row) => row.scheduledTime || '?' },
              { key: 'actualTime', header: 'الفعلي', className: 'col-fit', cell: (row) => row.actualTime || '?' },
              { key: 'durationMinutes', header: 'المدة', className: 'col-fit', cell: (row) => `${row.durationMinutes || 0} د` },
              { key: 'status', header: 'الحالة', className: 'col-fit', cell: (row) => {
                  const label = exceptionStatusLabel(row.status);
                  const isRed = row.status === 'needs_review' || row.status === 'pending';
                  return isRed ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{label}</span> : <span>{label}</span>;
              } },
              {
                key: 'actions',
                header: 'الإجراء',
                className: 'col-fit',
                cell: (row) => isOvertimeException(row.exceptionType) && row.status === 'pending' ? (
                  <div className="compact-actions-vertical">
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
      </FormSection>

      <FormSection title="سجل الحضور اليومي" description="استخدمه للتعديل اليدوي عند نسيان الحضور أو الانصراف، ثم اضغط حفظ اليوم.">
        <div className="compact-actions" style={{ marginBottom: 12 }}>
          <Button type="button" variant={attendanceFilter === 'all' ? 'primary' : 'secondary'} onClick={() => setAttendanceFilter('all')}>الكل</Button>
          <Button type="button" variant={attendanceFilter === 'unmarked' ? 'primary' : 'secondary'} onClick={() => setAttendanceFilter('unmarked')}>لم يُسجل بعد</Button>
          <Button type="button" variant={attendanceFilter === 'recorded' ? 'primary' : 'secondary'} onClick={() => setAttendanceFilter('recorded')}>مُسجل</Button>
        </div>
        <QueryFeedback
          isLoading={attendance.isLoading}
          isError={attendance.isError}
          error={attendance.error}
          isEmpty={!filteredAttendanceRows.length}
          loadingText="جاري تحميل سجلات الحضور..."
          errorTitle="تعذر تحميل سجلات الحضور."
          emptyTitle="لا توجد سجلات مطابقة للفلتر."
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
                  />
                ),
              },
              {
                key: 'status',
                header: 'الحالة',
                className: 'col-fit',
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
                className: 'col-main',
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
                className: 'col-fit',
                cell: (row) => (
                  <div className="compact-actions-vertical">
                    <Button type="button" onClick={() => saveRow(String(row.employeeId))}>حفظ</Button>
                  </div>
                ),
              },
            ]}
          />
        </QueryFeedback>
      </FormSection>

      </main>
    </div>
  );
}
