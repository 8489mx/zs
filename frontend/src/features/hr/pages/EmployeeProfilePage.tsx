import { useTranslation } from 'react-i18next';
import { FormEvent, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';
import { getErrorMessage } from '@/lib/errors';
import type { HrContact, HrContract, HrDocument, HrEmployee, HrEmployeeAsset, HrLedgerEntry, HrLeaveRequest, HrLoan } from '@/types/domain';
import { useHrEmployeeAssets, useHrLeaveRequests, useHrMutations, useHrProfile, useHrEmployeeAdjustments } from '@/features/hr/hooks/useHr';
import { LedgerSection } from '@/features/hr/components/employee-profile/EmployeeProfileSections';
import { EndOfServiceModal } from '../components/employee-profile/EndOfServiceModal';
import { EmployeeAdjustmentsSection } from '@/features/hr/components/employee-profile/EmployeeAdjustmentsSection';
import { buildEmployeeProfileDerivedData } from '@/features/hr/components/employee-profile/employee-profile.derived';
import { mobilePunchApi } from '@/features/hr/api/mobile-punch.api';
import { systemAlert } from '@/shared/components/system-alert';
import { EmployeePinModal } from '../components/employee-profile/EmployeePinModal';
import { EmployeeOverviewTab } from '../components/employee-profile/EmployeeOverviewTab';
import { EmployeeDetailsTab } from '../components/employee-profile/EmployeeDetailsTab';
import {
  employeeName,
  fallbackText,
  money,
  assetStatusLabel,
  documentStatusLabel,
  leaveStatusLabel,
  loanStatusLabel,
  loanTypeLabel,
  repaymentModeLabel,
} from '@/features/hr/utils/employee-profile.helpers';
import {
  initialDocumentDraft,
  PROFILE_SECTIONS,
  shouldShowProfileSection,
  type DocumentDraft,
  type ProfileSection,
} from '@/features/hr/components/employee-profile/employee-profile-page.helpers';

export function EmployeeProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const profile = useHrProfile(id);
  const leaveRequestsQuery = useHrLeaveRequests({ employeeId: id || '', page: 1, pageSize: 200 });
  const assetsQuery = useHrEmployeeAssets({ employeeId: id || '', page: 1, pageSize: 200 });
  const adjustmentsQuery = useHrEmployeeAdjustments(id);
  const mutations = useHrMutations();
  const canViewSalary = useHasAnyPermission(['hrSalaryView', 'hrSalaryManage', 'hrPayrollView', 'hrPayrollManage', 'hrPayrollApprove']);
  const canViewLoans = useHasAnyPermission('hrLoans');
  const canManageEmployees = useHasAnyPermission(['hrEmployees', 'hrContracts', 'hrSalaryManage']);

  const [activeSection, setActiveSection] = useState<ProfileSection>('overview');
  const [documentDraft, setDocumentDraft] = useState<DocumentDraft>(initialDocumentDraft);
  const [documentError, setDocumentError] = useState('');
  const [contractDraft, setContractDraft] = useState({ baseSalary: '', contractType: 'monthly' });
  const [showContractForm, setShowContractForm] = useState(false);
  const [showEndOfServiceModal, setShowEndOfServiceModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinCodeInput, setPinCodeInput] = useState('');
  const [isPinSubmitting, setIsPinSubmitting] = useState(false);

  async function handleSavePin() {
    if (!id) return;
    const cleanPin = pinCodeInput.trim();
    if (!cleanPin || cleanPin.length < 4) {
      systemAlert('يرجى إدخال رمز PIN لا يقل عن 4 أرقام');
      return;
    }
    setIsPinSubmitting(true);
    try {
      await mobilePunchApi.setEmployeePin(Number(id), cleanPin);
      await profile.refetch();
      systemAlert('تم تعيين رمز الدخول السريع (PIN) بنجاح');
      setShowPinModal(false);
      setPinCodeInput('');
    } catch (err: any) {
      systemAlert(err.message || 'حدث خطأ أثناء حفظ الرمز');
    } finally {
      setIsPinSubmitting(false);
    }
  }

  const employee = (profile.data?.employee || undefined) as HrEmployee | undefined;
  const contacts = useMemo(() => (profile.data?.contacts || []) as HrContact[], [profile.data?.contacts]);
  const documents = useMemo(() => (profile.data?.documents || []) as HrDocument[], [profile.data?.documents]);
  const contracts = useMemo(() => (profile.data?.contracts || []) as HrContract[], [profile.data?.contracts]);
  const loans = useMemo(() => (profile.data?.loans || []) as HrLoan[], [profile.data?.loans]);
  const ledger = useMemo(() => (profile.data?.ledger || []) as HrLedgerEntry[], [profile.data?.ledger]);
  const leaveRequests = useMemo(() => (leaveRequestsQuery.data?.requests || []) as HrLeaveRequest[], [leaveRequestsQuery.data?.requests]);
  const employeeAssets = useMemo(() => (assetsQuery.data?.assets || []) as HrEmployeeAsset[], [assetsQuery.data?.assets]);

  const derived = useMemo(() => buildEmployeeProfileDerivedData({ employee, contacts, documents, contracts, loans, leaveRequests, employeeAssets }), [employee, contacts, documents, contracts, loans, leaveRequests, employeeAssets]);
  const latestContract = derived.latestContract;
  const primaryPhone = derived.primaryPhone;
  const nationalIdMasked = derived.nationalIdMasked;
  const openLoansCount = derived.openLoansCount;
  const openLoansRemaining = derived.openLoansRemaining;
  const openAssetsCount = employeeAssets.length;
  const pendingLeavesCount = derived.pendingLeavesCount;
  const unpaidLeavesCount = derived.unpaidLeavesCount;
  const expiredOrNearDocumentsCount = derived.documentStats.expired + derived.documentStats.nearExpiry;
  const reviewAlerts = derived.reviewAlerts;
  const completenessRows = derived.completenessRows;

  const isSavingDocument = mutations.saveDocument.isPending;
  const isSavingContract = mutations.saveContract.isPending;

  async function handleAddDocument(event: FormEvent) {
    event.preventDefault();
    setDocumentError('');
    if (!id || !documentDraft.title.trim()) {
      setDocumentError('اسم المستند مطلوب');
      return;
    }
    try {
      await mutations.saveDocument.mutateAsync({
        employeeId: id,
        id: undefined,
        payload: {
          documentType: documentDraft.documentType || 'general',
          title: documentDraft.title.trim(),
          fileUrl: documentDraft.fileUrl || undefined,
          expiryDate: documentDraft.expiryDate || undefined,
          notes: documentDraft.notes || undefined,
        },
      });
      setDocumentDraft(initialDocumentDraft);
      await profile.refetch();
    } catch (error) {
      setDocumentError(getErrorMessage(error));
    }
  }

  async function handleSaveContract(event: FormEvent) {
    event.preventDefault();
    if (!id || !contractDraft.baseSalary) return;
    try {
      await mutations.saveContract.mutateAsync({
        employeeId: id,
        id: undefined,
        payload: {
          contractType: contractDraft.contractType || 'monthly',
          baseSalary: Number(contractDraft.baseSalary),
          startDate: new Date().toISOString().slice(0, 10),
        },
      });
      setShowContractForm(false);
      await profile.refetch();
    } catch (error) {
      systemAlert(getErrorMessage(error));
    }
  }

  return (
    <div className="page-stack page-shell hr-employee-profile-workspace" dir="rtl">
      <main className="document-prototype-column" style={{ maxWidth: '1280px', paddingBottom: '60px' }}>
        <PageHeader
          title={employee ? employeeName(employee) : t('hr.employee_profile_page.s0', "الملف الوظيفي للموظف")}
          description={t('hr.employee_profile_page.s1', "الملف المركزي الشامل للموظف: العقود، البدلات، المستندات، العُهد، والأرصدة")}
          badge={<span className="nav-pill">{employee ? (employee.status || '—') : '—'}</span>}
          actions={
            <div className="compact-actions">
              <Button variant="secondary" onClick={() => navigate('/hr/employees')}>{t('hr.employee_profile_page.s2', "قائمة الموظفين")}</Button>
              {canManageEmployees && id && (
                <Button variant="secondary" onClick={() => navigate(`/hr/employees/${id}/edit`)}>{t('hr.employee_profile_page.s3', "تعديل البيانات")}</Button>
              )}
              {canManageEmployees && employee && (
                <Button variant="secondary" onClick={() => setShowEndOfServiceModal(true)} style={{ color: '#dc2626', borderColor: '#fecaca' }}>
                  {t('hr.employee_profile_page.s4', "مستحقات نهاية الخدمة")}
                </Button>
              )}
            </div>
          }
        />

        <QueryFeedback
          isLoading={profile.isLoading}
          isError={profile.isError}
          error={profile.error}
          isEmpty={!profile.data?.employee}
          loadingText={t('hr.employee_profile_page.s5', "جاري تحميل بيانات الموظف...")}
          errorTitle={t('hr.employee_profile_page.s6', "تعذر تحميل ملف الموظف")}
          emptyTitle={t('hr.employee_profile_page.s7', "الموظف غير موجود")}
        >
          {/* Top Quick Navigation Pills */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', background: '#ffffff', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
              {PROFILE_SECTIONS.map((section) => (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveSection(section.key)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: activeSection === section.key ? '#170e5e' : 'transparent',
                    color: activeSection === section.key ? '#ffffff' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {section.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <Button type="button" variant="secondary" onClick={() => navigate('/hr/attendance')} style={{ padding: '3px 8px', fontSize: '0.75rem' }}>{t('hr.employee_profile_page.s8', "الحضور")}</Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/hr/leaves')} style={{ padding: '3px 8px', fontSize: '0.75rem' }}>{t('hr.employee_profile_page.s9', "الإجازات")}</Button>
              {canViewLoans ? <Button type="button" variant="secondary" onClick={() => navigate('/hr/loans')} style={{ padding: '3px 8px', fontSize: '0.75rem' }}>{t('hr.employee_profile_page.s10', "السلف")}</Button> : null}
              {canViewSalary ? <Button type="button" variant="secondary" onClick={() => navigate('/hr/payroll')} style={{ padding: '3px 8px', fontSize: '0.75rem' }}>{t('hr.employee_profile_page.s11', "المرتبات")}</Button> : null}
            </div>
          </div>

          {shouldShowProfileSection(activeSection, 'overview') ? (
            <EmployeeOverviewTab
              employee={employee}
              primaryPhone={primaryPhone}
              canManageEmployees={canManageEmployees}
              canViewLoans={canViewLoans}
              onOpenPinModal={() => {
                setPinCodeInput(employee?.pinCode || (employee as any)?.pin_code || '');
                setShowPinModal(true);
              }}
              reviewAlerts={reviewAlerts}
              documentsCount={documents.length}
              expiredOrNearDocumentsCount={expiredOrNearDocumentsCount}
              openAssetsCount={openAssetsCount}
              pendingLeavesCount={pendingLeavesCount}
              unpaidLeavesCount={unpaidLeavesCount}
              openLoansCount={openLoansCount}
              openLoansRemaining={openLoansRemaining}
              completenessText={`${completenessRows.filter((item) => item.state === 'مكتمل').length}/${completenessRows.length}`}
              onNavigateSection={setActiveSection}
            />
          ) : null}

          {shouldShowProfileSection(activeSection, 'details') ? (
            <EmployeeDetailsTab
              employee={employee}
              nationalIdMasked={nationalIdMasked}
              contacts={contacts}
              latestContract={latestContract}
              canViewSalary={canViewSalary}
              canManageEmployees={canManageEmployees}
              showContractForm={showContractForm}
              setShowContractForm={setShowContractForm}
              contractDraft={contractDraft}
              setContractDraft={setContractDraft}
              handleSaveContract={handleSaveContract}
              isSavingContract={isSavingContract}
            />
          ) : null}

          {shouldShowProfileSection(activeSection, 'documents') ? (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{t('hr.employee_profile_page.s12', "مستندات الموظف")}</strong>
                <Button variant="secondary" onClick={() => navigate('/hr/documents')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.employee_profile_page.s13', "عرض المستندات")}</Button>
              </div>

              <form onSubmit={(event) => { void handleAddDocument(event); }} style={{ marginBottom: '14px', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                  <div><label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.employee_profile_page.s14', "اسم المستند *")}</label><input value={documentDraft.title} onChange={(e) => setDocumentDraft((current) => ({ ...current, title: e.target.value }))} style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} /></div>
                  <div><label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.employee_profile_page.s15', "نوع المستند")}</label><input value={documentDraft.documentType} onChange={(e) => setDocumentDraft((current) => ({ ...current, documentType: e.target.value }))} style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} /></div>
                  <div><label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.employee_profile_page.s16', "تاريخ الانتهاء")}</label><input type="date" value={documentDraft.expiryDate} onChange={(e) => setDocumentDraft((current) => ({ ...current, expiryDate: e.target.value }))} style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} /></div>
                  <div><label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.employee_profile_page.s17', "ملاحظات")}</label><input value={documentDraft.notes} onChange={(e) => setDocumentDraft((current) => ({ ...current, notes: e.target.value }))} style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} /></div>
                </div>
                {documentError ? <div style={{ color: '#dc2626', fontSize: '0.8rem', marginBottom: '8px' }}>{documentError}</div> : null}
                <div><Button type="submit" disabled={isSavingDocument} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>{isSavingDocument ? t('hr.employee_profile_page.s18', "جاري الحفظ...") : t('hr.employee_profile_page.s19', "إضافة مستند")}</Button></div>
              </form>

              {documents.length ? (
                <DataTable
                  density="compact"
                  rows={documents}
                  rowKey={(row) => String(row.id)}
                  columns={[
                    { key: 'title', header: t('hr.employee_profile_page.s20', "اسم المستند"), cell: (row: HrDocument) => fallbackText(row.title) },
                    { key: 'documentType', header: t('hr.employee_profile_page.s21', "نوع المستند"), cell: (row: HrDocument) => fallbackText(row.documentType) },
                    { key: 'expiryDate', header: t('hr.employee_profile_page.s22', "تاريخ الانتهاء"), cell: (row: HrDocument) => fallbackText(row.expiryDate) || t('hr.employee_profile_page.s23', "بدون تاريخ انتهاء") },
                    { key: 'status', header: t('hr.employee_profile_page.s24', "الحالة"), cell: (row: HrDocument) => documentStatusLabel(row.expiryDate) },
                    { key: 'notes', header: t('hr.employee_profile_page.s25', "ملاحظات"), cell: (row: HrDocument) => fallbackText(row.notes) },
                  ]}
                />
              ) : <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>{t('hr.employee_profile_page.s26', "لا توجد مستندات مسجلة.")}</p>}
            </div>
          ) : null}

          {shouldShowProfileSection(activeSection, 'assets') ? (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{t('hr.employee_profile_page.s27', "العُهد والأصول")}</strong>
                <Button variant="secondary" onClick={() => navigate('/hr/assets')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.employee_profile_page.s28', "عرض العُهد")}</Button>
              </div>
              {employeeAssets.length ? (
                <DataTable<HrEmployeeAsset>
                  density="compact"
                  rows={employeeAssets}
                  rowKey={(row) => String(row.id)}
                  columns={[
                    { key: 'assetName', header: t('hr.employee_profile_page.s29', "اسم العهدة"), cell: (row: HrEmployeeAsset) => fallbackText(row.assetName) },
                    { key: 'assetCode', header: t('hr.employee_profile_page.s30', "الكود/التسلسلي"), cell: (row: HrEmployeeAsset) => fallbackText(row.assetCode || row.serialNo) },
                    { key: 'assignedAt', header: t('hr.employee_profile_page.s31', "تاريخ التسليم"), cell: (row: HrEmployeeAsset) => fallbackText(row.assignedAt) },
                    { key: 'returnedAt', header: t('hr.employee_profile_page.s32', "تاريخ الاسترجاع"), cell: (row: HrEmployeeAsset) => fallbackText(row.returnedAt) },
                    { key: 'status', header: t('hr.employee_profile_page.s33', "الحالة"), cell: (row: HrEmployeeAsset) => assetStatusLabel(row.status) },
                  ]}
                />
              ) : <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>{t('hr.employee_profile_page.s34', "لا توجد عُهد مسجلة لهذا الموظف.")}</p>}
            </div>
          ) : null}

          {shouldShowProfileSection(activeSection, 'leaves') ? (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{t('hr.employee_profile_page.s35', "الإجازات")}</strong>
                <Button variant="secondary" onClick={() => navigate('/hr/leaves')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.employee_profile_page.s36', "عرض الإجازات")}</Button>
              </div>
              {leaveRequests.length ? (
                <DataTable<HrLeaveRequest>
                  density="compact"
                  rows={leaveRequests.slice(0, 8)}
                  rowKey={(row) => String(row.id)}
                  columns={[
                    { key: 'leaveTypeName', header: t('hr.employee_profile_page.s37', "نوع الإجازة"), cell: (row: HrLeaveRequest) => fallbackText(row.leaveTypeName || row.leaveType) },
                    { key: 'startDate', header: t('hr.employee_profile_page.s38', "من تاريخ"), cell: (row: HrLeaveRequest) => fallbackText(row.startDate) },
                    { key: 'endDate', header: t('hr.employee_profile_page.s39', "إلى تاريخ"), cell: (row: HrLeaveRequest) => fallbackText(row.endDate) },
                    { key: 'daysCount', header: t('hr.employee_profile_page.s40', "عدد الأيام"), cell: (row: HrLeaveRequest) => fallbackText(row.daysCount) },
                    { key: 'status', header: t('hr.employee_profile_page.s41', "الحالة"), cell: (row: HrLeaveRequest) => leaveStatusLabel(row.status) },
                  ]}
                />
              ) : <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>{t('hr.employee_profile_page.s42', "لا توجد طلبات إجازة حالية.")}</p>}
            </div>
          ) : null}

          {shouldShowProfileSection(activeSection, 'payroll') ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{t('hr.employee_profile_page.s43', "السلف والأقساط")}</strong>
                  <div className="compact-actions">
                    {canViewSalary ? <Button variant="secondary" onClick={() => navigate('/hr/payroll')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.employee_profile_page.s44', "عرض المرتبات")}</Button> : null}
                    {canViewLoans ? <Button variant="secondary" onClick={() => navigate('/hr/loans')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.employee_profile_page.s45', "إدارة السلف")}</Button> : null}
                  </div>
                </div>
                {!canViewSalary && !canViewLoans ? (
                  <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>{t('hr.employee_profile_page.s46', "لا تملك صلاحية عرض هذه البيانات.")}</p>
                ) : loans.length ? (
                  <DataTable<HrLoan>
                    density="compact"
                    rows={loans}
                    rowKey={(row) => String(row.id)}
                    columns={[
                      { key: 'loanNo', header: t('hr.employee_profile_page.s47', "رقم السلفة"), cell: (row: HrLoan) => fallbackText(row.loanNo) },
                      { key: 'loanType', header: t('hr.employee_profile_page.s48', "النوع"), cell: (row: HrLoan) => loanTypeLabel(row.loanType) },
                      { key: 'repaymentMode', header: t('hr.employee_profile_page.s49', "طريقة السداد"), cell: (row: HrLoan) => repaymentModeLabel(row.repaymentMode) },
                      { key: 'principalAmount', header: t('hr.employee_profile_page.s50', "قيمة السلفة"), cell: (row: HrLoan) => canViewLoans ? money(row.principalAmount) : '—' },
                      { key: 'remainingAmount', header: t('hr.employee_profile_page.s51', "المتبقي"), cell: (row: HrLoan) => canViewLoans ? money(row.remainingAmount) : '—' },
                      { key: 'status', header: t('hr.employee_profile_page.s52', "الحالة"), cell: (row: HrLoan) => loanStatusLabel(row.status) },
                    ]}
                  />
                ) : <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>{t('hr.employee_profile_page.s53', "لا توجد سلف أو قروض مسجلة لهذا الموظف.")}</p>}
              </div>

              {id ? (
                <EmployeeAdjustmentsSection
                  adjustments={adjustmentsQuery.adjustments}
                  onAddAdjustment={async (payload) => {
                    await mutations.createEmployeeAdjustment.mutateAsync({ employeeId: id, payload });
                    await adjustmentsQuery.refetch();
                  }}
                  onDeleteAdjustment={async (adjustmentId) => {
                    await mutations.deleteEmployeeAdjustment.mutateAsync(adjustmentId);
                    await adjustmentsQuery.refetch();
                  }}
                  isBusy={mutations.createEmployeeAdjustment.isPending || mutations.deleteEmployeeAdjustment.isPending}
                />
              ) : null}
            </div>
          ) : null}

          {shouldShowProfileSection(activeSection, 'ledger') ? (
            <LedgerSection ledger={ledger} />
          ) : null}
        </QueryFeedback>

        {showEndOfServiceModal && employee && id && (
          <EndOfServiceModal
            isOpen={showEndOfServiceModal}
            onClose={() => setShowEndOfServiceModal(false)}
            onSuccess={() => {
              setShowEndOfServiceModal(false);
              profile.refetch();
            }}
            employeeId={id}
            employeeName={employeeName(employee)}
          />
        )}

        <EmployeePinModal
          open={showPinModal}
          onClose={() => setShowPinModal(false)}
          pinCodeInput={pinCodeInput}
          setPinCodeInput={setPinCodeInput}
          onSave={handleSavePin}
          isSubmitting={isPinSubmitting}
        />
      </main>
    </div>
  );
}

export default EmployeeProfilePage;
