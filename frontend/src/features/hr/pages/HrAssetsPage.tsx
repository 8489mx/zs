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
import {
  assetTypeOptions,
  cashAmount,
  cashCustodyType,
  cashDifference,
  custodyKind,
  employeeDisplay,
  fallbackText,
  initialForm,
  isCashCustody,
  money,
  needsReview,
  normalize,
  parseAmount,
  settlementParts,
  statusLabel,
  statusMatches,
  statusOptions,
  text,
  todayDate,
  type AssetFormState,
  type CustodyTab,
  type ReviewStatusFilter,
  type SettlementDraft,
} from '@/features/hr/pages/assets/hr-assets.helpers';

export function HrAssetsPage() {
  const navigate = useNavigate();
  const mutations = useHrMutations();

  const [activeTab, setActiveTab] = useState<CustodyTab>('physical');
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>('needs_review');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<AssetFormState>(() => initialForm('physical'));
  const [settlementId, setSettlementId] = useState('');
  const [settlementDraft, setSettlementDraft] = useState<SettlementDraft>({ spentAmount: '', returnedAmount: '', notes: '' });
  const [settlementError, setSettlementError] = useState('');

  const workspace = useHrWorkspace({ page: 1, pageSize: 200, search: '' });
  const assetsQuery = useHrEmployeeAssets({ search, status: statusFilter === 'needs_review' || statusFilter === 'all' ? '' : statusFilter, page, pageSize });

  const employees = useMemo(() => (workspace.employees.data?.employees || []) as HrEmployee[], [workspace.employees.data?.employees]);
  const employeesMap = useMemo(() => new Map(employees.map((row) => [String(row.id), row])), [employees]);
  const rawAssets = useMemo(() => (assetsQuery.data?.assets || []) as HrEmployeeAsset[], [assetsQuery.data?.assets]);
  const tabAssets = useMemo(() => rawAssets.filter((row) => custodyKind(row) === activeTab), [activeTab, rawAssets]);
  const selectedSettlementRow = useMemo(() => tabAssets.find((row) => String(row.id) === settlementId), [settlementId, tabAssets]);

  const departmentOptions = useMemo(() => {
    const set = new Map<string, string>();
    for (const employee of employees) {
      const key = normalize(employee.departmentName);
      if (key) set.set(key, String(employee.departmentName || '').trim());
    }
    return Array.from(set.entries()).map(([value, label]) => ({ value, label }));
  }, [employees]);

  const assets = useMemo(() => tabAssets.filter((row) => {
    const employee = employeesMap.get(String(row.employeeId));
    const departmentName = normalize(employee?.departmentName || row.departmentName);
    if (departmentFilter !== 'all' && departmentName !== departmentFilter) return false;
    return statusMatches(row, statusFilter);
  }), [tabAssets, employeesMap, departmentFilter, statusFilter]);

  const summary = useMemo(() => {
    const result = { total: tabAssets.length, assigned: 0, returned: 0, damaged: 0, lost: 0, needsReview: 0, visible: assets.length, cashOpenAmount: 0, cashTotalAmount: 0 };
    for (const row of tabAssets) {
      const status = normalize(row.status);
      if (status === 'assigned') result.assigned += 1;
      if (status === 'returned') result.returned += 1;
      if (status === 'damaged') result.damaged += 1;
      if (status === 'lost') result.lost += 1;
      if (needsReview(row)) result.needsReview += 1;
      if (isCashCustody(row)) {
        const amount = cashAmount(row);
        result.cashTotalAmount = Number((result.cashTotalAmount + amount).toFixed(2));
        if (status === 'assigned') result.cashOpenAmount = Number((result.cashOpenAmount + amount).toFixed(2));
      }
    }
    return result;
  }, [assets.length, tabAssets]);

  const totalItems = statusFilter === 'all' && departmentFilter === 'all' ? tabAssets.length : assets.length;

  const switchTab = (tab: CustodyTab) => {
    setActiveTab(tab);
    setShowCreate(false);
    setStatusFilter('needs_review');
    setDepartmentFilter('all');
    setPage(1);
    setErrors({});
    setSettlementId('');
    setSettlementError('');
    setForm(initialForm(tab));
  };

  const submitAsset = async () => {
    const nextErrors: Record<string, string> = {};
    const isCash = activeTab === 'cash';
    const amount = parseAmount(form.cashAmount);
    if (!form.employeeId) nextErrors.employeeId = 'اختيار الموظف مطلوب.';
    if (isCash && !(amount > 0)) nextErrors.cashAmount = 'مبلغ العهدة النقدية مطلوب.';
    if (!isCash && !text(form.assetType)) nextErrors.assetType = 'نوع العهدة مطلوب.';
    if (!text(form.assetName)) nextErrors.assetName = isCash ? 'الغرض / بيان العهدة مطلوب.' : 'اسم العهدة مطلوب.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    await mutations.saveEmployeeAsset.mutateAsync({
      payload: {
        employeeId: Number(form.employeeId),
        assetType: isCash ? cashCustodyType : form.assetType,
        assetName: form.assetName,
        assetCode: isCash ? String(amount) : (form.assetCode || undefined),
        serialNo: isCash ? undefined : (form.serialNo || undefined),
        assignedAt: form.assignedAt || undefined,
        notes: form.notes || undefined,
      },
    });
    setForm(initialForm(activeTab));
    setErrors({});
    setShowCreate(false);
    setStatusFilter('assigned');
  };

  const submitSettlement = async () => {
    setSettlementError('');
    if (!selectedSettlementRow) return;
    const amount = cashAmount(selectedSettlementRow);
    const spent = parseAmount(settlementDraft.spentAmount);
    const returned = parseAmount(settlementDraft.returnedAmount);
    if (!(spent > 0) && !(returned > 0)) { setSettlementError('اكتب المصروف أو المرتجع على الأقل.'); return; }
    const difference = Number((amount - spent - returned).toFixed(2));
    const notes = [`مصروف: ${spent.toFixed(2)}`, `مرتجع: ${returned.toFixed(2)}`, `فرق: ${difference.toFixed(2)}`, text(settlementDraft.notes)].filter(Boolean).join(' | ');
    await mutations.returnEmployeeAsset.mutateAsync({ id: String(selectedSettlementRow.id), payload: { returnedAt: todayDate(), notes: selectedSettlementRow.notes || undefined, returnNotes: notes } });
    setSettlementId('');
    setSettlementDraft({ spentAmount: '', returnedAmount: '', notes: '' });
    setStatusFilter(Math.abs(difference) > 0.009 ? 'needs_review' : 'returned');
  };

  const setFilter = (filter: ReviewStatusFilter) => { setStatusFilter(filter); setPage(1); };

  const renderActions = (row: HrEmployeeAsset) => {
    const status = normalize(row.status);
    if (isCashCustody(row)) {
      return (
        <div className="compact-actions">
          <Button type="button" variant="secondary" onClick={() => navigate(`/hr/employees/${row.employeeId}`)}>ملف الموظف</Button>
          {status === 'assigned' ? <Button type="button" variant="secondary" onClick={() => { setSettlementId(String(row.id)); setSettlementDraft({ spentAmount: '', returnedAmount: '', notes: '' }); setSettlementError(''); }}>تسوية</Button> : null}
        </div>
      );
    }
    return (
      <div className="compact-actions">
        <Button type="button" variant="secondary" onClick={() => navigate(`/hr/employees/${row.employeeId}`)}>ملف الموظف</Button>
        {status === 'assigned' ? <Button type="button" variant="secondary" onClick={() => mutations.returnEmployeeAsset.mutate({ id: String(row.id), payload: { notes: row.notes || undefined } })}>استرجاع</Button> : null}
        {status === 'assigned' ? <Button type="button" variant="secondary" onClick={() => mutations.markEmployeeAssetDamaged.mutate({ id: String(row.id), payload: { notes: row.notes || undefined } })}>تالفة</Button> : null}
        {status === 'assigned' ? <Button type="button" variant="secondary" onClick={() => mutations.markEmployeeAssetLost.mutate({ id: String(row.id), payload: { notes: row.notes || undefined } })}>مفقودة</Button> : null}
      </div>
    );
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader title="العُهد والأصول" description="قسّم العُهد إلى عينية ونقدية. العهدة النقدية مخصصة لمبلغ يُسلّم للموظف للصرف على شغل الشركة ثم تتم تسويته." actions={<div className="compact-actions"><Button type="button" onClick={() => setShowCreate((current) => !current)}>{showCreate ? 'إغلاق النموذج' : activeTab === 'cash' ? 'تسليم عهدة نقدية' : 'تسليم عهدة عينية'}</Button><Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button></div>} />

      <Card title="نوع العهدة" description="اختر النوع قبل التسجيل حتى تظهر الحقول المناسبة لكل دورة."><div className="compact-actions"><Button type="button" variant={activeTab === 'physical' ? 'primary' : 'secondary'} onClick={() => switchTab('physical')}>عُهد عينية</Button><Button type="button" variant={activeTab === 'cash' ? 'primary' : 'secondary'} onClick={() => switchTab('cash')}>عُهد نقدية</Button></div></Card>

      <Card title={activeTab === 'cash' ? 'تسلسل العهدة النقدية' : 'تسلسل العهد العينية'} description={activeTab === 'cash' ? 'العهدة النقدية ليست سلفة شخصية؛ هي مبلغ للشغل يتم تسويته بفواتير أو مرتجع.' : 'استخدم الصفحة بهذا الترتيب حتى لا تضيع العُهد أو تظل مفتوحة بدون مراجعة.'}>
        <div className="form-grid">
          {activeTab === 'cash' ? <><div className="field"><strong>1. تسليم مبلغ</strong><span className="muted">اختر الموظف والمبلغ والغرض.</span></div><div className="field"><strong>2. صرف على الشغل</strong><span className="muted">الموظف يجمع الفواتير أو الإيصالات.</span></div><div className="field"><strong>3. تسوية</strong><span className="muted">سجّل المصروف والمرتجع وأي فرق.</span></div><div className="field"><strong>4. إغلاق أو مراجعة</strong><span className="muted">الفرق غير الصفري يظهر ضمن تحتاج مراجعة.</span></div></> : <><div className="field"><strong>1. سلّم العهدة</strong><span className="muted">اختر الموظف ونوع العهدة والكود أو الرقم التسلسلي.</span></div><div className="field"><strong>2. راجع المفتوح</strong><span className="muted">العُهد المسلّمة تظهر كمسؤولية قائمة على الموظف.</span></div><div className="field"><strong>3. عالج التالف والمفقود</strong><span className="muted">أي تالف أو مفقود يظهر في فئة تحتاج مراجعة.</span></div><div className="field"><strong>4. أغلق عند الاسترجاع</strong><span className="muted">سجّل الاسترجاع عند رجوع العهدة من الموظف.</span></div></>}
        </div>
      </Card>

      {showCreate ? (
        <Card title={activeTab === 'cash' ? 'تسليم عهدة نقدية' : 'تسليم عهدة عينية'} description={activeTab === 'cash' ? 'سجّل المبلغ والغرض. التسوية تتم لاحقًا من قائمة العهد النقدية.' : 'سجّل العهدة على الموظف الصحيح. يمكن متابعة العُهد أيضًا من ملف الموظف.'}>
          <div className="form-grid">
            <label className="field"><span>الموظف *</span><select value={form.employeeId} onChange={(event) => setForm((prev) => ({ ...prev, employeeId: event.target.value }))}><option value="">اختر الموظف</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employeeDisplay(employee)}</option>)}</select>{errors.employeeId ? <small className="field-error">{errors.employeeId}</small> : null}</label>
            {activeTab === 'cash' ? <label className="field"><span>مبلغ العهدة *</span><input inputMode="decimal" value={form.cashAmount} onChange={(event) => setForm((prev) => ({ ...prev, cashAmount: event.target.value }))} placeholder="مثال: 5000" />{errors.cashAmount ? <small className="field-error">{errors.cashAmount}</small> : null}</label> : <label className="field"><span>نوع العهدة *</span><select value={form.assetType} onChange={(event) => setForm((prev) => ({ ...prev, assetType: event.target.value }))}><option value="">اختر النوع</option>{assetTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>{errors.assetType ? <small className="field-error">{errors.assetType}</small> : null}</label>}
            <label className="field"><span>{activeTab === 'cash' ? 'الغرض / بيان العهدة *' : 'اسم العهدة / الأصل *'}</span><input value={form.assetName} onChange={(event) => setForm((prev) => ({ ...prev, assetName: event.target.value }))} placeholder={activeTab === 'cash' ? 'مثال: شراء مستلزمات للمحل' : ''} />{errors.assetName ? <small className="field-error">{errors.assetName}</small> : null}</label>
            {activeTab === 'physical' ? <label className="field"><span>الكود / الرقم التسلسلي</span><input value={form.assetCode} onChange={(event) => setForm((prev) => ({ ...prev, assetCode: event.target.value, serialNo: event.target.value }))} /></label> : null}
            <label className="field"><span>تاريخ التسليم</span><input type="date" value={form.assignedAt} onChange={(event) => setForm((prev) => ({ ...prev, assignedAt: event.target.value }))} /></label>
            <label className="field field-wide"><span>ملاحظات</span><textarea rows={2} value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} /></label>
          </div>
          <div className="actions compact-actions"><Button type="button" onClick={submitAsset} disabled={mutations.saveEmployeeAsset.isPending}>{mutations.saveEmployeeAsset.isPending ? 'جاري التسجيل...' : activeTab === 'cash' ? 'تسليم عهدة نقدية' : 'تسليم عهدة عينية'}</Button><Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>إلغاء</Button></div>
          {mutations.saveEmployeeAsset.isError ? <p className="muted">{getErrorMessage(mutations.saveEmployeeAsset.error)}</p> : null}
        </Card>
      ) : null}

      <Card title={activeTab === 'cash' ? 'ملخص العُهد النقدية' : 'ملخص العُهد العينية'} description="اضغط على الكروت لتصفية القائمة مباشرة.">
        <div className="stats-grid">
          <button className="stat-card" type="button" onClick={() => setFilter('all')} style={{ textAlign: 'right' }}><span>الإجمالي</span><strong>{summary.total}</strong></button>
          <button className="stat-card" type="button" onClick={() => setFilter('assigned')} style={{ textAlign: 'right' }}><span>{activeTab === 'cash' ? 'مفتوحة' : 'مسلّمة'}</span><strong>{summary.assigned}</strong></button>
          <button className="stat-card" type="button" onClick={() => setFilter('returned')} style={{ textAlign: 'right' }}><span>{activeTab === 'cash' ? 'مقفولة' : 'مرتجعة'}</span><strong>{summary.returned}</strong></button>
          {activeTab === 'physical' ? <button className="stat-card" type="button" onClick={() => setFilter('damaged')} style={{ textAlign: 'right' }}><span>تالفة</span><strong>{summary.damaged}</strong></button> : null}
          {activeTab === 'physical' ? <button className="stat-card" type="button" onClick={() => setFilter('lost')} style={{ textAlign: 'right' }}><span>مفقودة</span><strong>{summary.lost}</strong></button> : null}
          <button className="stat-card" type="button" onClick={() => setFilter('needs_review')} style={{ textAlign: 'right' }}><span>تحتاج مراجعة</span><strong>{summary.needsReview}</strong></button>
          {activeTab === 'cash' ? <div className="stat-card"><span>إجمالي المبالغ</span><strong>{money(summary.cashTotalAmount)}</strong></div> : null}
          {activeTab === 'cash' ? <div className="stat-card"><span>مبالغ مفتوحة</span><strong>{money(summary.cashOpenAmount)}</strong></div> : null}
          <div className="stat-card"><span>ظاهر حاليًا</span><strong>{summary.visible}</strong></div>
        </div>
      </Card>

      <Card title={activeTab === 'cash' ? 'قائمة العُهد النقدية' : 'قائمة العُهد العينية'} description={activeTab === 'cash' ? 'سجّل التسوية من نفس القائمة عند انتهاء الصرف.' : 'الفئة الافتراضية تعرض العُهد التي تحتاج مراجعة حتى لا يتم تجاهل التالف أو المفقود.'}>
        <div className="compact-actions" style={{ marginBottom: 12 }}>{statusOptions.filter((option) => activeTab === 'physical' || !['damaged', 'lost'].includes(option.value)).map((option) => <Button key={option.value} type="button" variant={statusFilter === option.value ? 'primary' : 'secondary'} onClick={() => setFilter(option.value)}>{option.label}</Button>)}</div>
        <div className="form-grid" style={{ marginBottom: 12 }}><div className="field field-wide"><span>بحث الموظف أو العهدة</span><SearchToolbar search={search} onSearchChange={(value) => { setSearch(value); setPage(1); }} searchPlaceholder={activeTab === 'cash' ? 'بحث باسم الموظف أو الغرض أو المبلغ' : 'بحث باسم الموظف أو الكود أو اسم العهدة'} inputAriaLabel="بحث العُهد" /></div><label className="field"><span>القسم</span><select value={departmentFilter} onChange={(event) => { setDepartmentFilter(event.target.value); setPage(1); }}><option value="all">الكل</option>{departmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>

        <QueryFeedback isLoading={assetsQuery.isLoading} isError={assetsQuery.isError} error={assetsQuery.error} isEmpty={!assets.length} loadingText="جاري تحميل العُهد..." errorTitle="تعذر تحميل بيانات العُهد" emptyTitle={statusFilter === 'needs_review' ? 'لا توجد عُهد تحتاج مراجعة حاليًا.' : 'لا توجد نتائج مطابقة للفلاتر الحالية.'} emptyHint={statusFilter === 'needs_review' ? 'يمكنك عرض كل العُهد أو تسليم عهدة جديدة من أعلى الصفحة.' : 'جرّب تغيير الفلتر أو البحث.'}>
          <DataTable
            rows={assets}
            rowKey={(row) => String(row.id)}
            density="compact"
            pagination={{ page, pageSize, totalItems, onPageChange: setPage, onPageSizeChange: (next) => { setPageSize(next); setPage(1); }, itemLabel: 'عهدة' }}
            columns={activeTab === 'cash' ? [
              { key: 'employeeNo', header: 'كود الموظف', cell: (row) => fallbackText(row.employeeNo) },
              { key: 'employeeName', header: 'اسم الموظف', cell: (row) => fallbackText(row.employeeName) },
              { key: 'assetName', header: 'الغرض / البيان', cell: (row) => fallbackText(row.assetName) },
              { key: 'cashAmount', header: 'المبلغ المسلم', cell: (row) => money(cashAmount(row)) },
              { key: 'spentAmount', header: 'المصروف', cell: (row) => money(settlementParts(row).spentAmount) },
              { key: 'returnedAmount', header: 'المرتجع', cell: (row) => money(settlementParts(row).returnedAmount) },
              { key: 'difference', header: 'فرق التسوية', cell: (row) => money(Math.abs(cashDifference(row))) },
              { key: 'assignedAt', header: 'تاريخ التسليم', cell: (row) => fallbackText(row.assignedAt) },
              { key: 'returnedAt', header: 'تاريخ التسوية', cell: (row) => fallbackText(row.returnedAt) },
              { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status, 'cash') },
              { key: 'notes', header: 'ملاحظات', cell: (row) => fallbackText(row.returnNotes || row.notes) },
              { key: 'actions', header: 'إجراء', cell: (row) => renderActions(row) },
            ] : [
              { key: 'employeeNo', header: 'كود الموظف', cell: (row) => fallbackText(row.employeeNo) },
              { key: 'employeeName', header: 'اسم الموظف', cell: (row) => fallbackText(row.employeeName) },
              { key: 'departmentName', header: 'القسم', cell: (row) => fallbackText(row.departmentName || employeesMap.get(String(row.employeeId))?.departmentName) },
              { key: 'assetType', header: 'نوع العهدة', cell: (row) => fallbackText(row.assetType) },
              { key: 'assetName', header: 'اسم العهدة / الأصل', cell: (row) => fallbackText(row.assetName) },
              { key: 'assetCode', header: 'الكود / الرقم التسلسلي', cell: (row) => fallbackText(row.assetCode || row.serialNo) },
              { key: 'assignedAt', header: 'تاريخ التسليم', cell: (row) => fallbackText(row.assignedAt) },
              { key: 'returnedAt', header: 'تاريخ الاسترجاع', cell: (row) => fallbackText(row.returnedAt) },
              { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status, 'physical') },
              { key: 'notes', header: 'ملاحظات', cell: (row) => fallbackText(row.notes || row.returnNotes) },
              { key: 'actions', header: 'إجراء', cell: (row) => renderActions(row) },
            ]}
          />

          {selectedSettlementRow ? (
            <div className="card-soft" style={{ marginTop: 14, padding: 14 }}>
              <strong style={{ display: 'block', marginBottom: 8 }}>تسوية عهدة نقدية: {fallbackText(selectedSettlementRow.assetName)}</strong>
              <div className="form-grid"><label className="field"><span>المبلغ المسلم</span><input value={money(cashAmount(selectedSettlementRow))} disabled /></label><label className="field"><span>المبلغ المصروف</span><input inputMode="decimal" value={settlementDraft.spentAmount} onChange={(event) => setSettlementDraft((prev) => ({ ...prev, spentAmount: event.target.value }))} /></label><label className="field"><span>المبلغ المرتجع</span><input inputMode="decimal" value={settlementDraft.returnedAmount} onChange={(event) => setSettlementDraft((prev) => ({ ...prev, returnedAmount: event.target.value }))} /></label><label className="field field-wide"><span>ملاحظات التسوية / الفواتير</span><input value={settlementDraft.notes} onChange={(event) => setSettlementDraft((prev) => ({ ...prev, notes: event.target.value }))} placeholder="مثال: فواتير شراء منظفات + رجع باقي المبلغ" /></label></div>
              {settlementError ? <div className="error-box" style={{ marginTop: 10 }}>{settlementError}</div> : null}
              <div className="actions compact-actions" style={{ marginTop: 12 }}><Button type="button" onClick={submitSettlement} disabled={mutations.returnEmployeeAsset.isPending}>{mutations.returnEmployeeAsset.isPending ? 'جاري التسوية...' : 'تسجيل التسوية'}</Button><Button type="button" variant="secondary" onClick={() => { setSettlementId(''); setSettlementError(''); }}>إلغاء</Button></div>
            </div>
          ) : null}
        </QueryFeedback>
      </Card>

      <Card title="ملاحظة تشغيلية"><p className="muted" style={{ margin: 0 }}>العهدة النقدية هنا لا تُعامل كسلفة موظف ولا تخصم من المرتب تلقائيًا؛ هي مبلغ مؤقت للشغل يتم إقفاله بالتسوية. السلف الشخصية تظل في صفحة السلف والخصومات.</p></Card>
    </div>
  );
}
