import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { getErrorMessage } from '@/shared/lib/error';
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

const assetTypeOptions = ['جهاز', 'موبايل', 'لابتوب', 'أدوات', 'مفاتيح', 'يونيفورم', 'أخرى'];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function text(value: unknown) {
  return String(value || '').trim();
}

function employeeDisplay(row: HrEmployee) {
  return text(row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim()) || '—';
}

function statusLabel(status: unknown) {
  const value = text(status);
  if (value === 'assigned') return 'مسلّمة';
  if (value === 'returned') return 'تم الاسترداد';
  if (value === 'lost') return 'مفقودة';
  if (value === 'damaged') return 'تالفة';
  if (value === 'cancelled') return 'ملغاة';
  return 'غير محدد';
}

export function HrAssetsPage() {
  const navigate = useNavigate();
  const mutations = useHrMutations();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
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
  const assetsQuery = useHrEmployeeAssets({ search, status, page, pageSize });
  const employees = useMemo(() => (workspace.employees.data?.employees || []) as HrEmployee[], [workspace.employees.data?.employees]);
  const assets = useMemo(() => (assetsQuery.data?.assets || []) as HrEmployeeAsset[], [assetsQuery.data?.assets]);
  const totalItems = Number(assetsQuery.data?.summary?.totalItems || assets.length || 0);
  const summary = assetsQuery.data?.summary || {};

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
        title="العُهد"
        description="تسجيل العُهد المسلّمة للموظفين ومتابعة الاسترداد أو التلف أو الفقد."
        actions={<Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>}
      />

      <Card title="تسليم عهدة جديدة">
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
            <span>اسم العهدة *</span>
            <input value={form.assetName} onChange={(event) => setForm((prev) => ({ ...prev, assetName: event.target.value }))} />
            {errors.assetName ? <small className="field-error">{errors.assetName}</small> : null}
          </label>
          <label className="field">
            <span>كود/سيريال</span>
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
            {mutations.saveEmployeeAsset.isPending ? 'جاري التسجيل...' : 'تسجيل العهدة'}
          </Button>
        </div>
        {mutations.saveEmployeeAsset.isError ? <p className="muted">{getErrorMessage(mutations.saveEmployeeAsset.error)}</p> : null}
      </Card>

      <Card title="ملخص العُهد">
        <div className="stats-grid">
          <div><strong>إجمالي العُهد:</strong> {Number(summary.totalItems || 0)}</div>
          <div><strong>مسلّمة:</strong> {Number(summary.assignedCount || 0)}</div>
          <div><strong>تم الاسترداد:</strong> {Number(summary.returnedCount || 0)}</div>
          <div><strong>مفقودة:</strong> {Number(summary.lostCount || 0)}</div>
          <div><strong>تالفة:</strong> {Number(summary.damagedCount || 0)}</div>
        </div>
      </Card>

      <Card title="قائمة العُهد">
        <div className="compact-actions" style={{ marginBottom: 12 }}>
          <SearchToolbar
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            searchPlaceholder="بحث باسم الموظف أو كود الموظف أو اسم العهدة"
            inputAriaLabel="بحث العهد"
          />
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="تصفية الحالة">
            <option value="">الكل</option>
            <option value="assigned">مسلّمة</option>
            <option value="returned">تم الاسترداد</option>
            <option value="lost">مفقودة</option>
            <option value="damaged">تالفة</option>
            <option value="cancelled">ملغاة</option>
          </select>
        </div>

        <QueryFeedback
          isLoading={assetsQuery.isLoading}
          isError={assetsQuery.isError}
          error={assetsQuery.error}
          isEmpty={!assets.length}
          loadingText="جارٍ تحميل العُهد..."
          errorTitle="تعذر تحميل العُهد"
          emptyTitle="لا توجد عُهد مسجلة."
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
              { key: 'employeeNo', header: 'كود الموظف', cell: (row) => text(row.employeeNo) || '—' },
              { key: 'employeeName', header: 'الموظف', cell: (row) => text(row.employeeName) || '—' },
              { key: 'assetType', header: 'نوع العهدة', cell: (row) => text(row.assetType) || '—' },
              { key: 'assetName', header: 'اسم العهدة', cell: (row) => text(row.assetName) || '—' },
              { key: 'assetCode', header: 'كود/سيريال', cell: (row) => text(row.assetCode || row.serialNo) || '—' },
              { key: 'assignedAt', header: 'تاريخ التسليم', cell: (row) => text(row.assignedAt) || '—' },
              { key: 'returnedAt', header: 'تاريخ الاسترداد', cell: (row) => text(row.returnedAt) || '—' },
              { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status) },
              { key: 'notes', header: 'ملاحظات', cell: (row) => text(row.notes || row.returnNotes) || '—' },
              {
                key: 'actions',
                header: 'إجراءات',
                cell: (row) => (
                  <div className="compact-actions">
                    {row.status === 'assigned' ? <Button type="button" variant="secondary" onClick={() => mutations.returnEmployeeAsset.mutate({ id: String(row.id), payload: {} })}>استرداد</Button> : null}
                    {row.status === 'assigned' ? <Button type="button" variant="secondary" onClick={() => mutations.markEmployeeAssetLost.mutate({ id: String(row.id), payload: {} })}>مفقودة</Button> : null}
                    {row.status === 'assigned' ? <Button type="button" variant="secondary" onClick={() => mutations.markEmployeeAssetDamaged.mutate({ id: String(row.id), payload: {} })}>تالفة</Button> : null}
                    {row.status === 'assigned' ? <Button type="button" variant="secondary" onClick={() => mutations.cancelEmployeeAsset.mutate({ id: String(row.id), payload: {} })}>إلغاء</Button> : null}
                  </div>
                ),
              },
            ]}
          />
        </QueryFeedback>
      </Card>

      <Card title="ملاحظة">
        <p className="muted" style={{ margin: 0 }}>
          الربط مع المخزون أو الحسابات يمكن إضافته لاحقًا بعد تثبيت دورة العُهد.
        </p>
      </Card>
    </div>
  );
}
