import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { getErrorMessage } from '@/lib/errors';
import type { HrEmployee, HrEmployeeAsset } from '@/types/domain';
import { useHrEmployeeAssets, useHrMutations, useHrWorkspace } from '@/features/hr/hooks/useHr';

type AssetFormState = {
  employeeId: string;
  assetType: string;
  assetName: string;
  assetCode: string;
  serialNo: string;
  assignedAt: string;
  notes: string;
};

type ReviewStatusFilter = 'all' | 'assigned' | 'returned' | 'damaged' | 'lost' | 'needs_review' | 'cancelled';

const assetTypeOptions = ['جهاز', 'هاتف', 'حاسوب محمول', 'أدوات', 'مفاتيح', 'زي عمل', 'أخرى'];

const statusOptions: Array<{ value: ReviewStatusFilter; label: string }> = [
  { value: 'needs_review', label: 'تحتاج مراجعة' },
  { value: 'assigned', label: 'مسلّمة' },
  { value: 'returned', label: 'مرتجعة' },
  { value: 'damaged', label: 'تالفة' },
  { value: 'lost', label: 'مفقودة' },
  { value: 'cancelled', label: 'ملغاة' },
  { value: 'all', label: 'الكل' },
];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function text(value: unknown) {
  return String(value || '').trim();
}

function fallbackText(value: unknown) {
  return String(value || '').trim() || '—';
}

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function employeeDisplay(row: HrEmployee) {
  return text(row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim()) || '—';
}

function statusLabel(status: unknown) {
  const value = normalize(status);
  if (value === 'assigned') return 'مسلّمة';
  if (value === 'returned') return 'مرتجعة';
  if (value === 'lost') return 'مفقودة';
  if (value === 'damaged') return 'تالفة';
  if (value === 'cancelled') return 'ملغاة';
  return 'غير محدد';
}

function needsReview(row: HrEmployeeAsset) {
  const status = normalize(row.status);
  if (status === 'damaged' || status === 'lost') return true;
  if (status === 'assigned' && !text(row.assignedAt)) return true;
  if (status === 'returned' && !text(row.returnedAt)) return true;
  return false;
}

function statusMatches(row: HrEmployeeAsset, filter: ReviewStatusFilter) {
  const status = normalize(row.status);
  if (filter === 'all') return true;
  if (filter === 'needs_review') return needsReview(row);
  return status === filter;
}

export function HrAssetsPage() {
  const navigate = useNavigate();
  const mutations = useHrMutations();

  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>('needs_review');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<AssetFormState>({
    employeeId: '',
    assetType: '',
    assetName: '',
    assetCode: '',
    serialNo: '',
    assignedAt: todayDate(),
    notes: '',
  });

  const workspace = useHrWorkspace({ page: 1, pageSize: 200, search: '' });
  const assetsQuery = useHrEmployeeAssets({ search, status: statusFilter === 'needs_review' || statusFilter === 'all' ? '' : statusFilter, page, pageSize });

  const employees = useMemo(() => (workspace.employees.data?.employees || []) as HrEmployee[], [workspace.employees.data?.employees]);
  const employeesMap = useMemo(() => new Map(employees.map((row) => [String(row.id), row])), [employees]);
  const rawAssets = useMemo(() => (assetsQuery.data?.assets || []) as HrEmployeeAsset[], [assetsQuery.data?.assets]);

  const departmentOptions = useMemo(() => {
    const set = new Map<string, string>();
    for (const employee of employees) {
      const key = normalize(employee.departmentName);
      if (!key) continue;
      set.set(key, String(employee.departmentName || '').trim());
    }
    return Array.from(set.entries()).map(([value, label]) => ({ value, label }));
  }, [employees]);

  const assets = useMemo(() => rawAssets.filter((row) => {
    const employee = employeesMap.get(String(row.employeeId));
    const departmentName = normalize(employee?.departmentName || row.departmentName);
    if (departmentFilter !== 'all' && departmentName !== departmentFilter) return false;
    return statusMatches(row, statusFilter);
  }), [rawAssets, employeesMap, departmentFilter, statusFilter]);

  const summary = useMemo(() => {
    const result = { total: rawAssets.length, assigned: 0, returned: 0, damaged: 0, lost: 0, needsReview: 0, visible: assets.length };
    for (const row of rawAssets) {
      const status = normalize(row.status);
      if (status === 'assigned') result.assigned += 1;
      if (status === 'returned') result.returned += 1;
      if (status === 'damaged') result.damaged += 1;
      if (status === 'lost') result.lost += 1;
      if (needsReview(row)) result.needsReview += 1;
    }
    return result;
  }, [assets.length, rawAssets]);

  const totalItems = statusFilter === 'all' && departmentFilter === 'all'
    ? Number(assetsQuery.data?.summary?.totalItems || rawAssets.length || 0)
    : assets.length;

  const submitAsset = async () => {
    const nextErrors: Record<string, string> = {};
    if (!form.employeeId) nextErrors.employeeId = 'اختيار الموظف مطلوب.';
    if (!text(form.assetType)) nextErrors.assetType = 'نوع العهدة مطلوب.';
    if (!text(form.assetName)) nextErrors.assetName = 'اسم العهدة مطلوب.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    await mutations.saveEmployeeAsset.mutateAsync({
      payload: {
        employeeId: Number(form.employeeId),
        assetType: form.assetType,
        assetName: form.assetName,
        assetCode: form.assetCode || undefined,
        serialNo: form.serialNo || undefined,
        assignedAt: form.assignedAt || undefined,
        notes: form.notes || undefined,
      },
    });

    setForm({
      employeeId: '',
      assetType: '',
      assetName: '',
      assetCode: '',
      serialNo: '',
      assignedAt: todayDate(),
      notes: '',
    });
    setErrors({});
    setShowCreate(false);
    setStatusFilter('assigned');
  };

  const setFilter = (filter: ReviewStatusFilter) => {
    setStatusFilter(filter);
    setPage(1);
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="العُهد والأصول"
        description="سجّل تسليم العُهد، راجع العُهد المفتوحة، وتابع التالف أو المفقود قبل إغلاق ملف الموظف أو خروجه."
        actions={(
          <div className="compact-actions">
            <Button type="button" onClick={() => setShowCreate((current) => !current)}>
              {showCreate ? 'إغلاق نموذج العهدة' : 'تسليم عهدة'}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>
          </div>
        )}
      />

      <Card title="تسلسل إدارة العُهد" description="استخدم الصفحة بهذا الترتيب حتى لا تضيع العُهد أو تظل مفتوحة بدون مراجعة.">
        <div className="form-grid">
          <div className="field"><strong>1. سلّم العهدة</strong><span className="muted">اختر الموظف ونوع العهدة والكود أو الرقم التسلسلي.</span></div>
          <div className="field"><strong>2. راجع المفتوح</strong><span className="muted">العُهد المسلّمة تظهر كمسؤولية قائمة على الموظف.</span></div>
          <div className="field"><strong>3. عالج التالف والمفقود</strong><span className="muted">أي تالف أو مفقود يظهر في فئة تحتاج مراجعة.</span></div>
          <div className="field"><strong>4. أغلق عند الاسترجاع</strong><span className="muted">سجّل الاسترجاع عند رجوع العهدة من الموظف.</span></div>
        </div>
      </Card>

      {showCreate ? (
        <Card title="تسليم عهدة جديدة" description="سجّل العهدة على الموظف الصحيح. يمكن متابعة العُهد أيضًا من ملف الموظف.">
          <div id="asset-create-form" />
          <div className="form-grid">
            <label className="field">
              <span>الموظف *</span>
              <select value={form.employeeId} onChange={(event) => setForm((prev) => ({ ...prev, employeeId: event.target.value }))}>
                <option value="">اختر الموظف</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employeeDisplay(employee)}</option>)}
              </select>
              {errors.employeeId ? <small className="field-error">{errors.employeeId}</small> : null}
            </label>
            <label className="field">
              <span>نوع العهدة *</span>
              <select value={form.assetType} onChange={(event) => setForm((prev) => ({ ...prev, assetType: event.target.value }))}>
                <option value="">اختر النوع</option>
                {assetTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              {errors.assetType ? <small className="field-error">{errors.assetType}</small> : null}
            </label>
            <label className="field">
              <span>اسم العهدة / الأصل *</span>
              <input value={form.assetName} onChange={(event) => setForm((prev) => ({ ...prev, assetName: event.target.value }))} />
              {errors.assetName ? <small className="field-error">{errors.assetName}</small> : null}
            </label>
            <label className="field">
              <span>الكود / الرقم التسلسلي</span>
              <input value={form.assetCode} onChange={(event) => setForm((prev) => ({ ...prev, assetCode: event.target.value, serialNo: event.target.value }))} />
            </label>
            <label className="field">
              <span>تاريخ التسليم</span>
              <input type="date" value={form.assignedAt} onChange={(event) => setForm((prev) => ({ ...prev, assignedAt: event.target.value }))} />
            </label>
            <label className="field field-wide">
              <span>ملاحظات</span>
              <textarea rows={2} value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
            </label>
          </div>
          <div className="actions compact-actions">
            <Button type="button" onClick={submitAsset} disabled={mutations.saveEmployeeAsset.isPending}>
              {mutations.saveEmployeeAsset.isPending ? 'جاري التسجيل...' : 'تسليم عهدة'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>إلغاء</Button>
          </div>
          {mutations.saveEmployeeAsset.isError ? <p className="muted">{getErrorMessage(mutations.saveEmployeeAsset.error)}</p> : null}
        </Card>
      ) : null}

      <Card title="ملخص العُهد" description="اضغط على الكروت لتصفية القائمة مباشرة.">
        <div className="stats-grid">
          <button className="stat-card" type="button" onClick={() => setFilter('all')} style={{ textAlign: 'right' }}><span>إجمالي العُهد</span><strong>{summary.total}</strong></button>
          <button className="stat-card" type="button" onClick={() => setFilter('assigned')} style={{ textAlign: 'right' }}><span>مسلّمة</span><strong>{summary.assigned}</strong></button>
          <button className="stat-card" type="button" onClick={() => setFilter('returned')} style={{ textAlign: 'right' }}><span>مرتجعة</span><strong>{summary.returned}</strong></button>
          <button className="stat-card" type="button" onClick={() => setFilter('damaged')} style={{ textAlign: 'right' }}><span>تالفة</span><strong>{summary.damaged}</strong></button>
          <button className="stat-card" type="button" onClick={() => setFilter('lost')} style={{ textAlign: 'right' }}><span>مفقودة</span><strong>{summary.lost}</strong></button>
          <button className="stat-card" type="button" onClick={() => setFilter('needs_review')} style={{ textAlign: 'right' }}><span>تحتاج مراجعة</span><strong>{summary.needsReview}</strong></button>
          <div className="stat-card"><span>ظاهر حاليًا</span><strong>{summary.visible}</strong></div>
        </div>
      </Card>

      <Card title="قائمة العُهد" description="الفئة الافتراضية تعرض العُهد التي تحتاج مراجعة حتى لا يتم تجاهل التالف أو المفقود.">
        <div className="compact-actions" style={{ marginBottom: 12 }}>
          {statusOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={statusFilter === option.value ? 'primary' : 'secondary'}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div className="form-grid" style={{ marginBottom: 12 }}>
          <div className="field field-wide">
            <span>بحث الموظف أو العهدة</span>
            <SearchToolbar
              search={search}
              onSearchChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              searchPlaceholder="بحث باسم الموظف أو الكود أو اسم العهدة"
              inputAriaLabel="بحث العُهد"
            />
          </div>
          <label className="field">
            <span>القسم</span>
            <select value={departmentFilter} onChange={(event) => { setDepartmentFilter(event.target.value); setPage(1); }}>
              <option value="all">الكل</option>
              {departmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>

        <QueryFeedback
          isLoading={assetsQuery.isLoading}
          isError={assetsQuery.isError}
          error={assetsQuery.error}
          isEmpty={!assets.length}
          loadingText="جاري تحميل العُهد..."
          errorTitle="تعذر تحميل بيانات العُهد"
          emptyTitle={statusFilter === 'needs_review' ? 'لا توجد عُهد تحتاج مراجعة حاليًا.' : 'لا توجد نتائج مطابقة للفلاتر الحالية.'}
          emptyHint={statusFilter === 'needs_review' ? 'يمكنك عرض كل العُهد أو تسليم عهدة جديدة من أعلى الصفحة.' : 'جرّب تغيير الفلتر أو البحث.'}
        >
          <DataTable
            rows={assets}
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
              itemLabel: 'عهدة',
            }}
            columns={[
              { key: 'employeeNo', header: 'كود الموظف', cell: (row) => fallbackText(row.employeeNo) },
              { key: 'employeeName', header: 'اسم الموظف', cell: (row) => fallbackText(row.employeeName) },
              { key: 'departmentName', header: 'القسم', cell: (row) => fallbackText(row.departmentName || employeesMap.get(String(row.employeeId))?.departmentName) },
              { key: 'assetName', header: 'اسم العهدة / الأصل', cell: (row) => fallbackText(row.assetName) },
              { key: 'assetCode', header: 'الكود / الرقم التسلسلي', cell: (row) => fallbackText(row.assetCode || row.serialNo) },
              { key: 'assignedAt', header: 'تاريخ التسليم', cell: (row) => fallbackText(row.assignedAt) },
              { key: 'returnedAt', header: 'تاريخ الاسترجاع', cell: (row) => fallbackText(row.returnedAt) },
              { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status) },
              { key: 'notes', header: 'ملاحظات', cell: (row) => fallbackText(row.notes || row.returnNotes) },
              {
                key: 'actions',
                header: 'إجراء',
                cell: (row) => (
                  <div className="compact-actions">
                    <Button type="button" variant="secondary" onClick={() => navigate(`/hr/employees/${row.employeeId}`)}>ملف الموظف</Button>
                    {normalize(row.status) === 'assigned' ? <Button type="button" variant="secondary" onClick={() => mutations.returnEmployeeAsset.mutate({ id: String(row.id), payload: {} })}>استرجاع</Button> : null}
                    {normalize(row.status) === 'assigned' ? <Button type="button" variant="secondary" onClick={() => mutations.markEmployeeAssetDamaged.mutate({ id: String(row.id), payload: {} })}>تالفة</Button> : null}
                    {normalize(row.status) === 'assigned' ? <Button type="button" variant="secondary" onClick={() => mutations.markEmployeeAssetLost.mutate({ id: String(row.id), payload: {} })}>مفقودة</Button> : null}
                  </div>
                ),
              },
            ]}
          />
        </QueryFeedback>
      </Card>

      <Card title="ملاحظة تشغيلية">
        <p className="muted" style={{ margin: 0 }}>
          الربط مع المخزون أو المحاسبة يمكن إضافته لاحقًا بعد تثبيت دورة العُهد الحالية. الآن الهدف هو معرفة ما مع كل موظف وما يحتاج مراجعة.
        </p>
      </Card>
    </div>
  );
}
