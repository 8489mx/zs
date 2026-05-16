import { FormEvent, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { getErrorMessage } from '@/lib/errors';
import type { HrContact, HrContract, HrDocument, HrEmployee, HrEmployeeAsset, HrLedgerEntry, HrLeaveRequest, HrLoan } from '@/types/domain';
import { useHrEmployeeAssets, useHrLeaveRequests, useHrMutations, useHrProfile } from '@/features/hr/hooks/useHr';
import { ContactsSection, LedgerSection } from '@/features/hr/pages/employee-profile/EmployeeProfileSections';
import {
  employeeName,
  fallbackText,
  maskNationalId,
  money,
  normalizeDateOnly,
  pickPrimaryPhone,
  statusLabel,
} from '@/features/hr/utils/employee-profile.helpers';

interface DocumentDraft {
  title: string;
  documentType: string;
  expiryDate: string;
  notes: string;
}

const initialDocumentDraft: DocumentDraft = {
  title: '',
  documentType: '',
  expiryDate: '',
  notes: '',
};

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function documentStatusLabel(expiryDate?: string) {
  const date = normalizeDateOnly(expiryDate);
  if (!date) return 'بدون تاريخ انتهاء';

  const expiry = new Date(`${date}T00:00:00`);
  if (Number.isNaN(expiry.getTime())) return 'بدون تاريخ انتهاء';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) return 'منتهي';
  if (diffDays <= 30) return 'قريب الانتهاء';
  return 'ساري';
}

function assetStatusLabel(status: unknown) {
  const value = normalize(status);
  if (value === 'assigned') return 'مسلّمة';
  if (value === 'returned') return 'مرتجعة';
  if (value === 'damaged') return 'تالفة';
  if (value === 'lost') return 'مفقودة';
  if (value === 'cancelled') return 'ملغاة';
  return 'غير محدد';
}

function leaveStatusLabel(status: unknown) {
  const value = normalize(status);
  if (value === 'pending') return 'قيد المراجعة';
  if (value === 'approved') return 'معتمدة';
  if (value === 'rejected') return 'مرفوضة';
  if (value === 'cancelled' || value === 'canceled') return 'ملغاة';
  return fallbackText(status);
}

export function EmployeeProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const profile = useHrProfile(id);
  const leaveRequestsQuery = useHrLeaveRequests({ employeeId: id || '', page: 1, pageSize: 200 });
  const assetsQuery = useHrEmployeeAssets({ employeeId: id || '', page: 1, pageSize: 200 });
  const mutations = useHrMutations();

  const [documentDraft, setDocumentDraft] = useState<DocumentDraft>(initialDocumentDraft);
  const [documentError, setDocumentError] = useState('');

  const employee = (profile.data?.employee || undefined) as HrEmployee | undefined;
  const contacts = useMemo(() => (profile.data?.contacts || []) as HrContact[], [profile.data?.contacts]);
  const documents = useMemo(() => (profile.data?.documents || []) as HrDocument[], [profile.data?.documents]);
  const contracts = useMemo(() => (profile.data?.contracts || []) as HrContract[], [profile.data?.contracts]);
  const loans = useMemo(() => (profile.data?.loans || []) as HrLoan[], [profile.data?.loans]);
  const ledger = useMemo(() => (profile.data?.ledger || []) as HrLedgerEntry[], [profile.data?.ledger]);
  const leaveRequests = useMemo(() => (leaveRequestsQuery.data?.requests || []) as HrLeaveRequest[], [leaveRequestsQuery.data?.requests]);
  const employeeAssets = useMemo(() => (assetsQuery.data?.assets || []) as HrEmployeeAsset[], [assetsQuery.data?.assets]);

  const latestContract = contracts[0];
  const primaryPhone = pickPrimaryPhone(contacts);
  const nationalIdMasked = maskNationalId(employee?.nationalId);

  const documentStats = useMemo(() => {
    return documents.reduce((acc, row) => {
      const label = documentStatusLabel(row.expiryDate);
      if (label === 'ساري') acc.valid += 1;
      if (label === 'قريب الانتهاء') acc.nearExpiry += 1;
      if (label === 'منتهي') acc.expired += 1;
      if (label === 'بدون تاريخ انتهاء') acc.noExpiry += 1;
      return acc;
    }, { valid: 0, nearExpiry: 0, expired: 0, noExpiry: 0 });
  }, [documents]);

  const openLoans = loans.filter((row) => Number(row.remainingAmount || 0) > 0);
  const openLoansCount = openLoans.length;
  const openLoansRemaining = openLoans.reduce((sum, row) => sum + Number(row.remainingAmount || 0), 0);

  const pendingLeavesCount = leaveRequests.filter((row) => normalize(row.status) === 'pending').length;
  const approvedLeavesCount = leaveRequests.filter((row) => normalize(row.status) === 'approved').length;
  const unpaidLeavesCount = leaveRequests.filter((row) => {
    const typeName = normalize(row.leaveTypeName || row.leaveType);
    return normalize(row.status) === 'approved' && (typeName.includes('بدون') || typeName.includes('unpaid'));
  }).length;

  const problematicAssetsCount = employeeAssets.filter((row) => {
    const status = normalize(row.status);
    return status === 'damaged' || status === 'lost';
  }).length;

  const basicComplete = Boolean(String(employee?.firstName || '').trim() && String(employee?.hireDate || '').trim());
  const mobileComplete = primaryPhone !== 'غير مسجل';
  const nationalIdComplete = nationalIdMasked !== 'غير مسجل';
  const deptTitleComplete = Boolean(normalize(employee?.departmentName) || normalize(employee?.jobTitleName));
  const contractSalaryComplete = Boolean(latestContract && Number(latestContract.baseSalary || 0) > 0);
  const documentsComplete = documents.length > 0;
  const assetsComplete = employeeAssets.length > 0;

  const completenessRows = [
    { label: 'البيانات الأساسية', state: basicComplete ? 'مكتمل' : 'ناقص' },
    { label: 'الموبايل', state: mobileComplete ? 'مكتمل' : 'ناقص' },
    { label: 'الرقم القومي', state: nationalIdComplete ? 'مكتمل' : 'ناقص' },
    { label: 'القسم / المسمى الوظيفي', state: deptTitleComplete ? 'مكتمل' : 'ناقص' },
    { label: 'العقد / الراتب', state: contractSalaryComplete ? 'مكتمل' : (contracts.length ? 'يحتاج مراجعة' : 'ناقص') },
    { label: 'المستندات', state: documentsComplete ? (documentStats.expired || documentStats.nearExpiry ? 'يحتاج مراجعة' : 'مكتمل') : 'ناقص' },
    { label: 'العُهد', state: assetsComplete ? (problematicAssetsCount ? 'يحتاج مراجعة' : 'مكتمل') : 'ناقص' },
  ];

  const reviewAlerts = useMemo(() => {
    const alerts: string[] = [];
    if (!nationalIdComplete) alerts.push('الرقم القومي غير مسجل.');
    if (!mobileComplete) alerts.push('الموبايل غير مسجل.');
    if (!deptTitleComplete) alerts.push('لا يوجد قسم أو مسمى وظيفي.');
    if (!contractSalaryComplete) alerts.push('لا يوجد عقد أو راتب مكتمل.');
    if (documentStats.expired > 0) alerts.push(`يوجد ${documentStats.expired} مستند منتهي.`);
    if (documentStats.nearExpiry > 0) alerts.push(`يوجد ${documentStats.nearExpiry} مستند قريب الانتهاء.`);
    if (problematicAssetsCount > 0) alerts.push('توجد عهدة تالفة أو مفقودة تحتاج متابعة.');
    if (unpaidLeavesCount > 0) alerts.push('توجد إجازة غير مدفوعة قد تحتاج مراجعة في المرتب.');
    if (openLoansCount > 0) alerts.push('توجد سلفة أو قسط مفتوح يحتاج متابعة.');
    return alerts;
  }, [
    nationalIdComplete,
    mobileComplete,
    deptTitleComplete,
    contractSalaryComplete,
    documentStats.expired,
    documentStats.nearExpiry,
    problematicAssetsCount,
    unpaidLeavesCount,
    openLoansCount,
  ]);

  async function handleAddDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDocumentError('');

    const title = String(documentDraft.title || '').trim();
    if (!title) {
      setDocumentError('اسم المستند مطلوب.');
      return;
    }
    if (!id) {
      setDocumentError('تعذر تحديد الموظف.');
      return;
    }

    try {
      await mutations.saveDocument.mutateAsync({
        employeeId: id,
        payload: {
          title,
          documentType: String(documentDraft.documentType || '').trim() || undefined,
          expiryDate: String(documentDraft.expiryDate || '').trim() || undefined,
          notes: String(documentDraft.notes || '').trim() || undefined,
        },
      });
      setDocumentDraft(initialDocumentDraft);
      void profile.refetch();
    } catch (error) {
      setDocumentError(getErrorMessage(error, 'تعذر حفظ المستند.'));
    }
  }

  const isSavingDocument = mutations.saveDocument.isPending;

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title={employeeName(employee)}
        description="مساحة تشغيل موحدة لمتابعة بيانات الموظف ووثائقه والعُهد والتنبيهات المرتبطة به."
        actions={(
          <div className="compact-actions">
            {id ? <Button variant="secondary" onClick={() => navigate(`/hr/employees/${id}/edit`)}>تعديل بيانات الموظف</Button> : null}
            <Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>
          </div>
        )}
      />

      <QueryFeedback
        isLoading={profile.isLoading}
        isError={profile.isError}
        error={profile.error}
        isEmpty={!employee}
        loadingText="جاري تحميل ملف الموظف..."
        errorTitle="تعذر تحميل ملف الموظف"
        emptyTitle="لم يتم العثور على الموظف."
      >
        <Card title="ملخص الموظف">
          <div className="form-grid">
            <div className="field"><span>كود الموظف</span><strong>{fallbackText(employee?.employeeNo)}</strong></div>
            <div className="field"><span>الحالة</span><strong>{statusLabel(employee?.status)}</strong></div>
            <div className="field"><span>القسم</span><strong>{fallbackText(employee?.departmentName)}</strong></div>
            <div className="field"><span>المسمى الوظيفي</span><strong>{fallbackText(employee?.jobTitleName)}</strong></div>
            <div className="field"><span>تاريخ التعيين</span><strong>{fallbackText(employee?.hireDate)}</strong></div>
            <div className="field"><span>الموبايل الأساسي</span><strong>{primaryPhone}</strong></div>
            <div className="field"><span>الرقم القومي</span><strong>{nationalIdMasked}</strong></div>
            <div className="field"><span>آخر تحديث</span><strong>{fallbackText((employee as HrEmployee & { updatedAt?: string })?.updatedAt || 'غير متاح')}</strong></div>
          </div>
        </Card>

        <Card title="بيانات الدوام والأجر">
          <div className="form-grid">
            <div className="field"><span>نوع الأجر</span><strong>{normalize(employee?.compensationType) === 'hourly' ? 'أجر بالساعة' : 'راتب شهري'}</strong></div>
            <div className="field"><span>الراتب الشهري</span><strong>{normalize(employee?.compensationType) === 'monthly' ? 'يُراجع من بيانات العقد والراتب' : 'غير متاح'}</strong></div>
            <div className="field"><span>أجر الساعة</span><strong>{normalize(employee?.compensationType) === 'hourly' ? money(Number(employee?.hourlyRate || 0)) : 'غير متاح'}</strong></div>
            <div className="field"><span>عدد ساعات اليوم المتوقعة</span><strong>{employee?.expectedDailyHours != null ? fallbackText(employee.expectedDailyHours) : 'غير محدد'}</strong></div>
            <div className="field"><span>موعد الحضور</span><strong>{fallbackText(employee?.scheduledCheckInTime || 'غير محدد')}</strong></div>
            <div className="field"><span>موعد الانصراف</span><strong>{fallbackText(employee?.scheduledCheckOutTime || 'غير محدد')}</strong></div>
            <div className="field"><span>فترة السماح</span><strong>{employee?.graceMinutes != null ? `${employee.graceMinutes} دقيقة` : 'غير محدد'}</strong></div>
            <div className="field"><span>سياسة الوقت الإضافي</span><strong>{normalize(employee?.overtimePolicy) === 'disabled' ? 'غير محتسب' : normalize(employee?.overtimePolicy) === 'auto_approved' ? 'محتسب تلقائيًا' : 'مراجعة واعتماد قبل الاحتساب'}</strong></div>
            <div className="field"><span>الأجر اليومي المتوقع</span><strong>{normalize(employee?.compensationType) === 'hourly' ? money(Number(employee?.hourlyRate || 0) * Number(employee?.expectedDailyHours || 0)) : 'غير متاح'}</strong></div>
          </div>
        </Card>

        <Card title="اكتمال ملف الموظف">
          <div className="form-grid">
            {completenessRows.map((item) => (
              <div key={item.label} className="field">
                <span>{item.label}</span>
                <strong>{item.state}</strong>
              </div>
            ))}
          </div>
          <p className="muted" style={{ marginBottom: 0 }}>استكمل بيانات الموظف لتحسين دقة المتابعة والتقارير.</p>
        </Card>

        <Card title="تنبيهات المراجعة">
          {reviewAlerts.length ? (
            <ul style={{ margin: 0, paddingInlineStart: 18 }}>
              {reviewAlerts.map((alert) => <li key={alert}>{alert}</li>)}
            </ul>
          ) : <p className="muted" style={{ margin: 0 }}>لا توجد تنبيهات مراجعة حالية.</p>}
        </Card>

        <Card title="البيانات الأساسية والوظيفية">
          <div className="form-grid">
            <div className="field"><span>الاسم</span><strong>{employeeName(employee)}</strong></div>
            <div className="field"><span>كود الموظف</span><strong>{fallbackText(employee?.employeeNo)}</strong></div>
            <div className="field"><span>الحالة</span><strong>{statusLabel(employee?.status)}</strong></div>
            <div className="field"><span>القسم</span><strong>{fallbackText(employee?.departmentName)}</strong></div>
            <div className="field"><span>المسمى الوظيفي</span><strong>{fallbackText(employee?.jobTitleName)}</strong></div>
            <div className="field"><span>الوظيفة/المنصب</span><strong>{fallbackText(employee?.positionName)}</strong></div>
            <div className="field"><span>تاريخ التعيين</span><strong>{fallbackText(employee?.hireDate)}</strong></div>
            <div className="field"><span>الرقم القومي</span><strong>{nationalIdMasked}</strong></div>
          </div>
        </Card>

        <Card title="التواصل">
          <ContactsSection contacts={contacts} />
        </Card>

        <Card title="العقد والراتب" actions={<Button variant="secondary" onClick={() => navigate('/hr/payroll')}>عرض المرتبات</Button>}>
          {latestContract ? (
            <>
              <div className="form-grid">
                <div className="field"><span>نوع التعاقد</span><strong>{fallbackText(latestContract.contractType)}</strong></div>
                <div className="field"><span>الحالة</span><strong>{statusLabel(latestContract.status)}</strong></div>
                <div className="field"><span>بداية العقد</span><strong>{fallbackText(latestContract.startDate)}</strong></div>
                <div className="field"><span>نهاية العقد</span><strong>{fallbackText(latestContract.endDate)}</strong></div>
                <div className="field"><span>الراتب الأساسي</span><strong>{money(latestContract.baseSalary)}</strong></div>
                <div className="field"><span>العملة</span><strong>{fallbackText(latestContract.currency)}</strong></div>
              </div>
              <p className="muted" style={{ marginBottom: 0 }}>تفاصيل الضرائب والتأمينات تحتاج إعدادات مستقلة ومراجعة محاسب قبل الاعتماد.</p>
            </>
          ) : <p className="muted">لا يوجد عقد أو راتب مسجل.</p>}
        </Card>

        <Card
          title="المستندات"
          actions={<Button variant="secondary" onClick={() => navigate('/hr/documents')}>عرض المستندات</Button>}
        >
          <form onSubmit={(event) => { void handleAddDocument(event); }}>
            <div className="form-grid">
              <div className="field">
                <span>اسم المستند</span>
                <input value={documentDraft.title} onChange={(e) => setDocumentDraft((current) => ({ ...current, title: e.target.value }))} />
              </div>
              <div className="field">
                <span>نوع المستند</span>
                <input value={documentDraft.documentType} onChange={(e) => setDocumentDraft((current) => ({ ...current, documentType: e.target.value }))} />
              </div>
              <div className="field">
                <span>تاريخ الانتهاء</span>
                <input type="date" value={documentDraft.expiryDate} onChange={(e) => setDocumentDraft((current) => ({ ...current, expiryDate: e.target.value }))} />
              </div>
              <div className="field field-wide">
                <span>ملاحظات</span>
                <input value={documentDraft.notes} onChange={(e) => setDocumentDraft((current) => ({ ...current, notes: e.target.value }))} />
              </div>
            </div>
            {documentError ? <div className="error-box" style={{ marginTop: 12 }}>{documentError}</div> : null}
            <div className="actions compact-actions" style={{ marginTop: 12 }}>
              <Button type="submit" disabled={isSavingDocument}>{isSavingDocument ? 'جاري الحفظ...' : 'إضافة مستند'}</Button>
            </div>
          </form>

          {documents.length ? (
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>اسم المستند</th>
                    <th>نوع المستند</th>
                    <th>تاريخ الانتهاء</th>
                    <th>الحالة</th>
                    <th>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((row) => (
                    <tr key={String(row.id)}>
                      <td>{fallbackText(row.title)}</td>
                      <td>{fallbackText(row.documentType)}</td>
                      <td>{fallbackText(row.expiryDate) || 'بدون تاريخ انتهاء'}</td>
                      <td>{documentStatusLabel(row.expiryDate)}</td>
                      <td>{fallbackText(row.notes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="muted">لا توجد مستندات مسجلة.</p>}
        </Card>

        <Card
          title="العُهد والأصول"
          actions={<Button variant="secondary" onClick={() => navigate('/hr/assets')}>عرض العُهد</Button>}
        >
          {employeeAssets.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>اسم العهدة</th>
                    <th>الكود/التسلسلي</th>
                    <th>تاريخ التسليم</th>
                    <th>تاريخ الاسترجاع</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeAssets.map((row) => (
                    <tr key={String(row.id)}>
                      <td>{fallbackText(row.assetName)}</td>
                      <td>{fallbackText(row.assetCode || row.serialNo)}</td>
                      <td>{fallbackText(row.assignedAt)}</td>
                      <td>{fallbackText(row.returnedAt)}</td>
                      <td>{assetStatusLabel(row.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="muted">لا توجد عُهد مسجلة.</p>}
        </Card>

        <Card title="الإجازات" actions={<Button variant="secondary" onClick={() => navigate('/hr/leaves')}>عرض الإجازات</Button>}>
          <div className="form-grid">
            <div className="field"><span>قيد المراجعة</span><strong>{pendingLeavesCount}</strong></div>
            <div className="field"><span>معتمدة</span><strong>{approvedLeavesCount}</strong></div>
            <div className="field"><span>غير مدفوعة</span><strong>{unpaidLeavesCount}</strong></div>
            <div className="field"><span>إجمالي الطلبات</span><strong>{leaveRequests.length}</strong></div>
          </div>
          {leaveRequests.length ? (
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>نوع الإجازة</th>
                    <th>من تاريخ</th>
                    <th>إلى تاريخ</th>
                    <th>عدد الأيام</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.slice(0, 8).map((row) => (
                    <tr key={String(row.id)}>
                      <td>{fallbackText(row.leaveTypeName || row.leaveType)}</td>
                      <td>{fallbackText(row.startDate)}</td>
                      <td>{fallbackText(row.endDate)}</td>
                      <td>{fallbackText(row.daysCount)}</td>
                      <td>{leaveStatusLabel(row.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="muted">لا توجد طلبات إجازة حالية.</p>}
        </Card>

        <Card title="الحضور والانصراف" actions={<Button variant="secondary" onClick={() => navigate('/hr/attendance')}>عرض الحضور والانصراف</Button>}>
          <p className="muted" style={{ margin: 0 }}>تفاصيل الحضور متاحة من صفحة الحضور والانصراف.</p>
        </Card>

        <Card
          title="المرتبات والسلف"
          actions={(
            <div className="compact-actions">
              <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>عرض المرتبات</Button>
              <Button variant="secondary" onClick={() => navigate('/hr/loans')}>إدارة السلف</Button>
            </div>
          )}
        >
          {loans.length ? (
            <>
              <div className="form-grid">
                <div className="field"><span>عدد السلف المفتوحة</span><strong>{openLoansCount}</strong></div>
                <div className="field"><span>إجمالي المتبقي</span><strong>{money(openLoansRemaining)}</strong></div>
              </div>
              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>رقم السلفة</th>
                      <th>النوع</th>
                      <th>قيمة السلفة</th>
                      <th>المتبقي</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map((row) => (
                      <tr key={String(row.id)}>
                        <td>{fallbackText(row.loanNo)}</td>
                        <td>{fallbackText(row.loanType)}</td>
                        <td>{money(row.principalAmount)}</td>
                        <td>{money(row.remainingAmount)}</td>
                        <td>{statusLabel(row.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : <p className="muted">لا توجد سلف أو خصومات مسجلة.</p>}
        </Card>

        <Card title="السجل المالي">
          <LedgerSection ledger={ledger} />
        </Card>
      </QueryFeedback>
    </div>
  );
}
