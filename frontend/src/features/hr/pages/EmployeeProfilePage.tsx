import { FormEvent, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';
import { getErrorMessage } from '@/lib/errors';
import type { HrContact, HrContract, HrDocument, HrEmployee, HrEmployeeAsset, HrLedgerEntry, HrLeaveRequest, HrLoan } from '@/types/domain';
import { useHrEmployeeAssets, useHrLeaveRequests, useHrMutations, useHrProfile } from '@/features/hr/hooks/useHr';
import { ContactsSection, LedgerSection } from '@/features/hr/pages/employee-profile/EmployeeProfileSections';
import { buildEmployeeProfileDerivedData } from '@/features/hr/pages/employee-profile/employee-profile.derived';
import {
  employeeName,
  fallbackText,
  money,
  statusLabel,
  assetStatusLabel,
  documentStatusLabel,
  installmentStatusLabel,
  leaveStatusLabel,
  loanStatusLabel,
  loanTypeLabel,
  normalizeText,
  repaymentModeLabel,
} from '@/features/hr/utils/employee-profile.helpers';

interface DocumentDraft {
  title: string;
  documentType: string;
  expiryDate: string;
  notes: string;
}

type ProfileSection = 'overview' | 'details' | 'documents' | 'assets' | 'leaves' | 'payroll' | 'ledger' | 'all';

const initialDocumentDraft: DocumentDraft = {
  title: '',
  documentType: '',
  expiryDate: '',
  notes: '',
};

const PROFILE_SECTIONS: { key: ProfileSection; label: string }[] = [
  { key: 'overview', label: 'نظرة سريعة' },
  { key: 'details', label: 'البيانات' },
  { key: 'documents', label: 'المستندات' },
  { key: 'assets', label: 'العُهد' },
  { key: 'leaves', label: 'الإجازات' },
  { key: 'payroll', label: 'المرتبات والسلف' },
  { key: 'ledger', label: 'السجل المالي' },
  { key: 'all', label: 'عرض الكل' },
];

function shouldShowProfileSection(activeSection: ProfileSection, section: ProfileSection) {
  return activeSection === 'all' || activeSection === section;
}

function isDocumentExpired(row: HrDocument) {
  return documentStatusLabel(row.expiryDate) === 'منتهي' || documentStatusLabel(row.expiryDate) === 'قريب الانتهاء';
}

function isAssetOpen(row: HrEmployeeAsset) {
  const status = normalizeText(row.status);
  return status === 'assigned' || status === 'damaged' || status === 'lost';
}

export function EmployeeProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const profile = useHrProfile(id);
  const leaveRequestsQuery = useHrLeaveRequests({ employeeId: id || '', page: 1, pageSize: 200 });
  const assetsQuery = useHrEmployeeAssets({ employeeId: id || '', page: 1, pageSize: 200 });
  const mutations = useHrMutations();
  const canViewSalary = useHasAnyPermission(['hrSalaryView', 'hrSalaryManage', 'hrPayrollView', 'hrPayrollManage', 'hrPayrollApprove']);
  const canViewLoans = useHasAnyPermission('hrLoans');
  const canManageEmployees = useHasAnyPermission(['hrEmployees', 'hrContracts', 'hrSalaryManage']);

  const [activeSection, setActiveSection] = useState<ProfileSection>('overview');
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

  const derived = useMemo(() => buildEmployeeProfileDerivedData({
    employee,
    contacts,
    documents,
    contracts,
    loans,
    leaveRequests,
    employeeAssets,
  }), [employee, contacts, documents, contracts, loans, leaveRequests, employeeAssets]);

  const latestContract = derived.latestContract;
  const primaryPhone = derived.primaryPhone;
  const nationalIdMasked = derived.nationalIdMasked;
  const openLoansCount = derived.openLoansCount;
  const openLoansRemaining = derived.openLoansRemaining;
  const pendingLeavesCount = derived.pendingLeavesCount;
  const approvedLeavesCount = derived.approvedLeavesCount;
  const unpaidLeavesCount = derived.unpaidLeavesCount;
  const completenessRows = derived.completenessRows;
  const reviewAlerts = derived.reviewAlerts;

  const expiredOrNearDocumentsCount = documents.filter(isDocumentExpired).length;
  const openAssetsCount = employeeAssets.filter(isAssetOpen).length;
  const activeOperationalItems = pendingLeavesCount + openLoansCount + expiredOrNearDocumentsCount + openAssetsCount;

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
        description="مركز تشغيل الموظف: بياناته، الدوام، المستندات، العُهد، الإجازات، السلف، والتنبيهات من مكان واحد."
        actions={(
          <div className="compact-actions">
            {id && canManageEmployees ? <Button variant="secondary" onClick={() => navigate(`/hr/employees/${id}/edit`)}>تعديل بيانات الموظف</Button> : null}
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
        <Card title="تشغيل سريع" description="اختصارات مرتبطة بهذا الموظف حتى لا تتنقل يدويًا بين صفحات كثيرة.">
          <div className="compact-actions" style={{ flexWrap: 'wrap' }}>
            {id && canManageEmployees ? <Button type="button" onClick={() => navigate(`/hr/employees/${id}/edit`)}>تعديل البيانات</Button> : null}
            <Button type="button" variant="secondary" onClick={() => navigate('/hr/attendance')}>فتح الحضور</Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/hr/leaves')}>فتح الإجازات</Button>
            {canViewLoans ? <Button type="button" variant="secondary" onClick={() => navigate('/hr/loans')}>تسجيل/مراجعة سلفة</Button> : null}
            {canViewSalary ? <Button type="button" variant="secondary" onClick={() => navigate('/hr/payroll')}>فتح المرتبات</Button> : null}
            <Button type="button" variant="secondary" onClick={() => setActiveSection('documents')}>إضافة مستند</Button>
          </div>
        </Card>

        <Card title="أقسام ملف الموظف" description="اختر القسم المطلوب بدل التمرير داخل ملف طويل.">
          <div className="compact-actions" style={{ flexWrap: 'wrap' }}>
            {PROFILE_SECTIONS.map((section) => (
              <Button
                key={section.key}
                type="button"
                variant={activeSection === section.key ? 'primary' : 'secondary'}
                onClick={() => setActiveSection(section.key)}
              >
                {section.label}
              </Button>
            ))}
          </div>
        </Card>

        {shouldShowProfileSection(activeSection, 'overview') ? (
          <>
            <Card title="ملخص الموظف" description="أهم بيانات التشغيل والمتابعة في بطاقة واحدة.">
              <div className="form-grid">
                <div className="field"><span>كود الموظف</span><strong>{fallbackText(employee?.employeeNo)}</strong></div>
                <div className="field"><span>الحالة</span><strong>{statusLabel(employee?.status)}</strong></div>
                <div className="field"><span>القسم</span><strong>{fallbackText(employee?.departmentName)}</strong></div>
                <div className="field"><span>المسمى الوظيفي</span><strong>{fallbackText(employee?.jobTitleName)}</strong></div>
                <div className="field"><span>نوع الأجر</span><strong>{normalizeText(employee?.compensationType) === 'hourly' ? 'أجر بالساعة' : 'راتب شهري'}</strong></div>
                <div className="field"><span>الدوام</span><strong>{fallbackText(employee?.scheduledCheckInTime || 'غير محدد')} ← {fallbackText(employee?.scheduledCheckOutTime || 'غير محدد')}</strong></div>
                <div className="field"><span>الموبايل الأساسي</span><strong>{primaryPhone}</strong></div>
                <div className="field"><span>عناصر تحتاج متابعة</span><strong>{activeOperationalItems}</strong></div>
              </div>
            </Card>

            <Card title="تنبيهات المراجعة" description="أي نقص أو عنصر يحتاج انتباه يظهر هنا قبل الدخول في التفاصيل.">
              {reviewAlerts.length ? (
                <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                  {reviewAlerts.map((alert) => <li key={alert}>{alert}</li>)}
                </ul>
              ) : <p className="muted" style={{ margin: 0 }}>لا توجد تنبيهات مراجعة حالية.</p>}
            </Card>

            <Card title="ملخص التشغيل" description="اضغط على أي كارت للانتقال لقسمه داخل الملف.">
              <div className="stats-grid">
                <button className="stat-card" type="button" onClick={() => setActiveSection('documents')} style={{ textAlign: 'right' }}><span>مستندات</span><strong>{documents.length}</strong></button>
                <button className="stat-card" type="button" onClick={() => setActiveSection('documents')} style={{ textAlign: 'right' }}><span>منتهية/قريبة الانتهاء</span><strong>{expiredOrNearDocumentsCount}</strong></button>
                <button className="stat-card" type="button" onClick={() => setActiveSection('assets')} style={{ textAlign: 'right' }}><span>عُهد مفتوحة</span><strong>{openAssetsCount}</strong></button>
                <button className="stat-card" type="button" onClick={() => setActiveSection('leaves')} style={{ textAlign: 'right' }}><span>إجازات قيد المراجعة</span><strong>{pendingLeavesCount}</strong></button>
                <button className="stat-card" type="button" onClick={() => setActiveSection('leaves')} style={{ textAlign: 'right' }}><span>إجازات غير مدفوعة</span><strong>{unpaidLeavesCount}</strong></button>
                <button className="stat-card" type="button" onClick={() => setActiveSection('payroll')} style={{ textAlign: 'right' }}><span>سلف مفتوحة</span><strong>{openLoansCount}</strong></button>
                <button className="stat-card" type="button" onClick={() => setActiveSection('payroll')} style={{ textAlign: 'right' }}><span>متبقي سلف</span><strong>{canViewLoans ? money(openLoansRemaining) : '—'}</strong></button>
                <button className="stat-card" type="button" onClick={() => setActiveSection('details')} style={{ textAlign: 'right' }}><span>اكتمال الملف</span><strong>{completenessRows.filter((item) => item.state === 'مكتمل').length}/{completenessRows.length}</strong></button>
              </div>
            </Card>
          </>
        ) : null}

        {shouldShowProfileSection(activeSection, 'details') ? (
          <>
            <Card title="بيانات الدوام والأجر">
              <div className="form-grid">
                <div className="field"><span>نوع الأجر</span><strong>{normalizeText(employee?.compensationType) === 'hourly' ? 'أجر بالساعة' : 'راتب شهري'}</strong></div>
                <div className="field"><span>الراتب الشهري</span><strong>{normalizeText(employee?.compensationType) === 'monthly' ? 'يراجع من بيانات العقد والراتب' : 'غير متاح'}</strong></div>
                <div className="field"><span>أجر الساعة</span><strong>{normalizeText(employee?.compensationType) === 'hourly' ? money(Number(employee?.hourlyRate || 0)) : 'غير متاح'}</strong></div>
                <div className="field"><span>عدد ساعات اليوم المتوقعة</span><strong>{employee?.expectedDailyHours != null ? fallbackText(employee.expectedDailyHours) : 'غير محدد'}</strong></div>
                <div className="field"><span>موعد الحضور</span><strong>{fallbackText(employee?.scheduledCheckInTime || 'غير محدد')}</strong></div>
                <div className="field"><span>موعد الانصراف</span><strong>{fallbackText(employee?.scheduledCheckOutTime || 'غير محدد')}</strong></div>
                <div className="field"><span>فترة السماح</span><strong>{employee?.graceMinutes != null ? `${employee.graceMinutes} دقيقة` : 'غير محدد'}</strong></div>
                <div className="field"><span>سياسة الوقت الإضافي</span><strong>{normalizeText(employee?.overtimePolicy) === 'disabled' ? 'غير محتسب' : normalizeText(employee?.overtimePolicy) === 'auto_approved' ? 'محتسب تلقائيًا' : 'مراجعة واعتماد قبل الاحتساب'}</strong></div>
                <div className="field"><span>الأجر اليومي المتوقع</span><strong>{normalizeText(employee?.compensationType) === 'hourly' ? money(Number(employee?.hourlyRate || 0) * Number(employee?.expectedDailyHours || 0)) : 'غير متاح'}</strong></div>
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

            <Card title="العقد والراتب" actions={canViewSalary ? <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>عرض المرتبات</Button> : undefined}>
              {!canViewSalary ? (
                <p className="muted">لا تملك صلاحية عرض هذه البيانات.</p>
              ) : latestContract ? (
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
          </>
        ) : null}

        {shouldShowProfileSection(activeSection, 'documents') ? (
          <Card
            title="المستندات"
            description="أضف مستندات الموظف وتابع تاريخ الانتهاء من نفس الملف."
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
            ) : <p className="muted">لا توجد مستندات مسجلة. يمكنك إضافة أول مستند من النموذج بالأعلى.</p>}
          </Card>
        ) : null}

        {shouldShowProfileSection(activeSection, 'assets') ? (
          <Card
            title="العُهد والأصول"
            description="ملخص العُهد المسجلة على الموظف وحالتها الحالية."
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
            ) : <p className="muted">لا توجد عُهد مسجلة لهذا الموظف.</p>}
          </Card>
        ) : null}

        {shouldShowProfileSection(activeSection, 'leaves') ? (
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
            ) : <p className="muted">لا توجد طلبات إجازة حالية. يمكن إنشاء الطلب من صفحة الإجازات.</p>}
          </Card>
        ) : null}

        {shouldShowProfileSection(activeSection, 'payroll') ? (
          <>
            <Card title="الحضور والانصراف" actions={<Button variant="secondary" onClick={() => navigate('/hr/attendance')}>عرض الحضور والانصراف</Button>}>
              <p className="muted" style={{ margin: 0 }}>تفاصيل الحضور متاحة من صفحة الحضور والانصراف، وسيتم ربط أي استثناءات بمراجعة المرتبات.</p>
            </Card>

            <Card
              title="المرتبات والسلف"
              actions={(
                <div className="compact-actions">
                  {canViewSalary ? <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>عرض المرتبات</Button> : null}
                  {canViewLoans ? <Button variant="secondary" onClick={() => navigate('/hr/loans')}>إدارة السلف</Button> : null}
                </div>
              )}
            >
              {!canViewSalary && !canViewLoans ? (
                <p className="muted">لا تملك صلاحية عرض هذه البيانات.</p>
              ) : loans.length ? (
                <>
                  <div className="form-grid">
                    <div className="field"><span>عدد السلف المفتوحة</span><strong>{canViewLoans ? openLoansCount : 'لا تملك صلاحية عرض هذه البيانات.'}</strong></div>
                    <div className="field"><span>إجمالي المتبقي</span><strong>{canViewLoans ? money(openLoansRemaining) : 'لا تملك صلاحية عرض هذه البيانات.'}</strong></div>
                  </div>
                  <div className="table-wrap" style={{ marginTop: 12 }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>رقم السلفة</th>
                          <th>النوع</th>
                          <th>طريقة السداد</th>
                          <th>قيمة السلفة</th>
                          <th>المتبقي</th>
                          <th>الحالة</th>
                          <th>خطة الأقساط</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loans.map((row) => (
                          <tr key={String(row.id)}>
                            <td>{fallbackText(row.loanNo)}</td>
                            <td>{loanTypeLabel(row.loanType)}</td>
                            <td>{repaymentModeLabel(row.repaymentMode)}</td>
                            <td>{canViewLoans ? money(row.principalAmount) : 'لا تملك صلاحية عرض هذه البيانات.'}</td>
                            <td>{canViewLoans ? money(row.remainingAmount) : 'لا تملك صلاحية عرض هذه البيانات.'}</td>
                            <td>{loanStatusLabel(row.status)}</td>
                            <td>
                              {Array.isArray(row.installments) && row.installments.length ? (
                                <details>
                                  <summary>{`عدد الأقساط: ${row.installments.length}`}</summary>
                                  <div className="table-wrap" style={{ marginTop: 8 }}>
                                    <table className="data-table">
                                      <thead>
                                        <tr>
                                          <th>رقم القسط</th>
                                          <th>شهر الاستحقاق</th>
                                          <th>قيمة القسط</th>
                                          <th>الحالة</th>
                                          <th>تاريخ الخصم</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {row.installments.map((installment) => (
                                          <tr key={String(installment.id)}>
                                            <td>{fallbackText(installment.installmentNumber)}</td>
                                            <td>{fallbackText(installment.dueDate)}</td>
                                            <td>{canViewLoans ? money(installment.amount) : 'لا تملك صلاحية عرض هذه البيانات.'}</td>
                                            <td>{installmentStatusLabel(installment.status)}</td>
                                            <td>{fallbackText(installment.paidAt)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </details>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : <p className="muted">لا توجد سلف أو خصومات مسجلة.</p>}
            </Card>
          </>
        ) : null}

        {shouldShowProfileSection(activeSection, 'ledger') ? (
          <Card title="السجل المالي">
            <LedgerSection ledger={ledger} />
          </Card>
        ) : null}
      </QueryFeedback>
    </div>
  );
}
