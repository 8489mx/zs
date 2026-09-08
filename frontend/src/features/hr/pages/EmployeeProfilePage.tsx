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
          title={employee ? employeeName(employee) : 'الملف الوظيفي للموظف'}
          description="الملف المركزي الشامل للموظف: العقود، البدلات، المستندات، العُهد، والأرصدة"
          badge={<span className="nav-pill">{employee ? (employee.status || '—') : '—'}</span>}
          actions={
            <div className="compact-actions">
              <Button variant="secondary" onClick={() => navigate('/hr/employees')}>قائمة الموظفين</Button>
              {canManageEmployees && id && (
                <Button variant="secondary" onClick={() => navigate(`/hr/employees/${id}/edit`)}>تعديل البيانات</Button>
              )}
              {canManageEmployees && employee && (
                <Button variant="secondary" onClick={() => setShowEndOfServiceModal(true)} style={{ color: '#dc2626', borderColor: '#fecaca' }}>
                  مستحقات نهاية الخدمة
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
          loadingText="جاري تحميل بيانات الموظف..."
          errorTitle="تعذر تحميل ملف الموظف"
          emptyTitle="الموظف غير موجود"
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
              <Button type="button" variant="secondary" onClick={() => navigate('/hr/attendance')} style={{ padding: '3px 8px', fontSize: '0.75rem' }}>الحضور</Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/hr/leaves')} style={{ padding: '3px 8px', fontSize: '0.75rem' }}>الإجازات</Button>
              {canViewLoans ? <Button type="button" variant="secondary" onClick={() => navigate('/hr/loans')} style={{ padding: '3px 8px', fontSize: '0.75rem' }}>السلف</Button> : null}
              {canViewSalary ? <Button type="button" variant="secondary" onClick={() => navigate('/hr/payroll')} style={{ padding: '3px 8px', fontSize: '0.75rem' }}>المرتبات</Button> : null}
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
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>مستندات الموظف</strong>
                <Button variant="secondary" onClick={() => navigate('/hr/documents')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>عرض المستندات</Button>
              </div>

              <form onSubmit={(event) => { void handleAddDocument(event); }} style={{ marginBottom: '14px', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                  <div><label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>اسم المستند *</label><input value={documentDraft.title} onChange={(e) => setDocumentDraft((current) => ({ ...current, title: e.target.value }))} style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} /></div>
                  <div><label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>نوع المستند</label><input value={documentDraft.documentType} onChange={(e) => setDocumentDraft((current) => ({ ...current, documentType: e.target.value }))} style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} /></div>
                  <div><label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>تاريخ الانتهاء</label><input type="date" value={documentDraft.expiryDate} onChange={(e) => setDocumentDraft((current) => ({ ...current, expiryDate: e.target.value }))} style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} /></div>
                  <div><label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>ملاحظات</label><input value={documentDraft.notes} onChange={(e) => setDocumentDraft((current) => ({ ...current, notes: e.target.value }))} style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} /></div>
                </div>
                {documentError ? <div style={{ color: '#dc2626', fontSize: '0.8rem', marginBottom: '8px' }}>{documentError}</div> : null}
                <div><Button type="submit" disabled={isSavingDocument} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>{isSavingDocument ? 'جاري الحفظ...' : 'إضافة مستند'}</Button></div>
              </form>

              {documents.length ? (
                <DataTable
                  density="compact"
                  rows={documents}
                  rowKey={(row) => String(row.id)}
                  columns={[
                    { key: 'title', header: 'اسم المستند', cell: (row: HrDocument) => fallbackText(row.title) },
                    { key: 'documentType', header: 'نوع المستند', cell: (row: HrDocument) => fallbackText(row.documentType) },
                    { key: 'expiryDate', header: 'تاريخ الانتهاء', cell: (row: HrDocument) => fallbackText(row.expiryDate) || 'بدون تاريخ انتهاء' },
                    { key: 'status', header: 'الحالة', cell: (row: HrDocument) => documentStatusLabel(row.expiryDate) },
                    { key: 'notes', header: 'ملاحظات', cell: (row: HrDocument) => fallbackText(row.notes) },
                  ]}
                />
              ) : <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>لا توجد مستندات مسجلة.</p>}
            </div>
          ) : null}

          {shouldShowProfileSection(activeSection, 'assets') ? (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>العُهد والأصول</strong>
                <Button variant="secondary" onClick={() => navigate('/hr/assets')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>عرض العُهد</Button>
              </div>
              {employeeAssets.length ? (
                <DataTable<HrEmployeeAsset>
                  density="compact"
                  rows={employeeAssets}
                  rowKey={(row) => String(row.id)}
                  columns={[
                    { key: 'assetName', header: 'اسم العهدة', cell: (row: HrEmployeeAsset) => fallbackText(row.assetName) },
                    { key: 'assetCode', header: 'الكود/التسلسلي', cell: (row: HrEmployeeAsset) => fallbackText(row.assetCode || row.serialNo) },
                    { key: 'assignedAt', header: 'تاريخ التسليم', cell: (row: HrEmployeeAsset) => fallbackText(row.assignedAt) },
                    { key: 'returnedAt', header: 'تاريخ الاسترجاع', cell: (row: HrEmployeeAsset) => fallbackText(row.returnedAt) },
                    { key: 'status', header: 'الحالة', cell: (row: HrEmployeeAsset) => assetStatusLabel(row.status) },
                  ]}
                />
              ) : <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>لا توجد عُهد مسجلة لهذا الموظف.</p>}
            </div>
          ) : null}

          {shouldShowProfileSection(activeSection, 'leaves') ? (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>الإجازات</strong>
                <Button variant="secondary" onClick={() => navigate('/hr/leaves')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>عرض الإجازات</Button>
              </div>
              {leaveRequests.length ? (
                <DataTable<HrLeaveRequest>
                  density="compact"
                  rows={leaveRequests.slice(0, 8)}
                  rowKey={(row) => String(row.id)}
                  columns={[
                    { key: 'leaveTypeName', header: 'نوع الإجازة', cell: (row: HrLeaveRequest) => fallbackText(row.leaveTypeName || row.leaveType) },
                    { key: 'startDate', header: 'من تاريخ', cell: (row: HrLeaveRequest) => fallbackText(row.startDate) },
                    { key: 'endDate', header: 'إلى تاريخ', cell: (row: HrLeaveRequest) => fallbackText(row.endDate) },
                    { key: 'daysCount', header: 'عدد الأيام', cell: (row: HrLeaveRequest) => fallbackText(row.daysCount) },
                    { key: 'status', header: 'الحالة', cell: (row: HrLeaveRequest) => leaveStatusLabel(row.status) },
                  ]}
                />
              ) : <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>لا توجد طلبات إجازة حالية.</p>}
            </div>
          ) : null}

          {shouldShowProfileSection(activeSection, 'payroll') ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>السلف والأقساط</strong>
                  <div className="compact-actions">
                    {canViewSalary ? <Button variant="secondary" onClick={() => navigate('/hr/payroll')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>عرض المرتبات</Button> : null}
                    {canViewLoans ? <Button variant="secondary" onClick={() => navigate('/hr/loans')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>إدارة السلف</Button> : null}
                  </div>
                </div>
                {!canViewSalary && !canViewLoans ? (
                  <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>لا تملك صلاحية عرض هذه البيانات.</p>
                ) : loans.length ? (
                  <DataTable<HrLoan>
                    density="compact"
                    rows={loans}
                    rowKey={(row) => String(row.id)}
                    columns={[
                      { key: 'loanNo', header: 'رقم السلفة', cell: (row: HrLoan) => fallbackText(row.loanNo) },
                      { key: 'loanType', header: 'النوع', cell: (row: HrLoan) => loanTypeLabel(row.loanType) },
                      { key: 'repaymentMode', header: 'طريقة السداد', cell: (row: HrLoan) => repaymentModeLabel(row.repaymentMode) },
                      { key: 'principalAmount', header: 'قيمة السلفة', cell: (row: HrLoan) => canViewLoans ? money(row.principalAmount) : '—' },
                      { key: 'remainingAmount', header: 'المتبقي', cell: (row: HrLoan) => canViewLoans ? money(row.remainingAmount) : '—' },
                      { key: 'status', header: 'الحالة', cell: (row: HrLoan) => loanStatusLabel(row.status) },
                    ]}
                  />
                ) : <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>لا توجد سلف أو قروض مسجلة لهذا الموظف.</p>}
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
