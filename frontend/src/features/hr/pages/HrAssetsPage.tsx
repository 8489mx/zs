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
  { value: 'all', label: 'الكل' },
  { value: 'assigned', label: 'مسلّمة' },
  { value: 'returned', label: 'مرتجعة' },
  { value: 'damaged', label: 'تالفة' },
  { value: 'lost', label: 'مفقودة' },
  { value: 'needs_review', label: 'تحتاج مراجعة' },
  { value: 'cancelled', label: 'ملغاة' },
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

export function HrAssetsPage() {
  const navigate = useNavigate();
  const mutations = useHrMutations();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>('all');
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
  const totalItems = Number(assetsQuery.data?.summary?.totalItems || rawAssets.length || 0);

  const departmentOptions = useMemo(() => {
    const set = new Map<string, string>();
    for (const employee of employees) {
      const key = normalize(employee.departmentName);
      if (!key) continue;
      set.set(key, String(employee.departmentName || '').trim());
    }
    return Array.from(set.entries()).map(([value, label]) => ({ value, label }));
  }, [employees]);

  const assets = useMemo(() => {
    return rawAssets.filter((row) => {
      const employee = employeesMap.get(String(row.employeeId));
      const departmentName = normalize(employee?.departmentName || row.departmentName);
      if (departmentFilter !== 'all' && departmentName !== departmentFilter) return false;
      if (statusFilter === 'needs_review') return needsReview(row);
      return true;
    });
  }, [rawAssets, employeesMap, departmentFilter, statusFilter]);

  const summary = useMemo(() => {
    const result = {
      total: assets.length,
      assigned: 0,
      returned: 0,
      damagedOrLost: 0,
      needsReview: 0,
    };

    for (const row of assets) {
      const status = normalize(row.status);
      if (status === 'assigned') result.assigned += 1;
      if (status === 'returned') result.returned += 1;
      if (status === 'damaged' || status === 'lost') result.damagedOrLost += 1;
      if (needsReview(row)) result.needsReview += 1;
    }

    return result;
  }, [assets]);

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
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="العُهد والأصول"
        description="متابعة العُهد المسلّمة للموظفين وحالات الاسترجاع والتلف والفقد."
        actions={(
          <div className="compact-actions">
            <Button
              variant="secondary"
              onClick={() => document.getElementById('asset-create-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              إضافة عهدة
            </Button>
            <Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>
          </div>
        )}
      />

      <Card title="تسليم عهدة جديدة">
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
        </div>
        {mutations.saveEmployeeAsset.isError ? <p className="muted">{getErrorMessage(mutations.saveEmployeeAsset.error)}</p> : null}
      </Card>

      <Card title="ملخص العُهد">
        <div className="stats-grid">
          <div><strong>إجمالي العُهد:</strong> {summary.total}</div>
          <div><strong>مسلّمة:</strong> {summary.assigned}</div>
          <div><strong>مرتجعة:</strong> {summary.returned}</div>
          <div><strong>تالفة / مفقودة:</strong> {summary.damagedOrLost}</div>
          <div><strong>تحتاج مراجعة:</strong> {summary.needsReview}</div>
        </div>
      </Card>

      <Card title="قائمة العُهد">
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
            <span>الحالة</span>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as ReviewStatusFilter); setPage(1); }}>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
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
          emptyTitle="لا توجد نتائج مطابقة للفلاتر الحالية."
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
              {
                key: 'departmentName',
                header: 'القسم',
                cell: (row) => fallbackText(row.departmentName || employeesMap.get(String(row.employeeId))?.departmentName),
              },
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
                    {normalize(row.status) === 'assigned' ? (
                      <Button type="button" variant="secondary" onClick={() => mutations.returnEmployeeAsset.mutate({ id: String(row.id), payload: {} })}>
                        استرجاع
                      </Button>
                    ) : null}
                    {normalize(row.status) === 'assigned' ? (
                      <Button type="button" variant="secondary" onClick={() => mutations.markEmployeeAssetDamaged.mutate({ id: String(row.id), payload: {} })}>
                        تالفة
                      </Button>
                    ) : null}
                    {normalize(row.status) === 'assigned' ? (
                      <Button type="button" variant="secondary" onClick={() => mutations.markEmployeeAssetLost.mutate({ id: String(row.id), payload: {} })}>
                        مفقودة
                      </Button>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        </QueryFeedback>
      </Card>

      <Card title="ملاحظة">
        <p className="muted" style={{ margin: 0 }}>
          الربط مع المخزون أو المحاسبة يمكن إضافته لاحقًا بعد تثبيت دورة العُهد الحالية.
        </p>
      </Card>
    </div>
  );
}
