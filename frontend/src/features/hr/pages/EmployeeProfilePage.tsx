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
import { EmployeePeriodStatement } from '../components/employee-profile/EmployeePeriodStatement';
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
  statusLabel,
  normalizeText,
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
          badge={<span className="nav-pill">{employee ? (statusLabel(employee.status) || '—') : '—'}</span>}
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
          {/* Employee Hero Profile Card */}
          {employee ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '12px',
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  boxShadow: '0 2px 4px rgba(23, 14, 94, 0.15)',
                  flexShrink: 0,
                }}>
                  {(employee.displayName || employee.firstName || 'م').slice(0, 2)}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      {employeeName(employee)}
                    </h2>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#334155' }}>
                      كود: {fallbackText(employee.employeeNo)}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: employee.status === 'active' ? '#dcfce7' : '#fee2e2',
                      color: employee.status === 'active' ? '#15803d' : '#b91c1c',
                    }}>
                      {statusLabel(employee.status)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '0.8rem', color: '#64748b', flexWrap: 'wrap' }}>
                    <span>المسمى: <strong style={{ color: '#1e293b' }}>{fallbackText(employee.jobTitleName)}</strong></span>
                    <span>•</span>
                    <span>القسم: <strong style={{ color: '#1e293b' }}>{fallbackText(employee.departmentName)}</strong></span>
                    <span>•</span>
                    <span>نوع الأجر: <strong style={{ color: '#1e293b' }}>{normalizeText(employee.compensationType) === 'hourly' ? 'بالساعة' : 'راتب شهري'}</strong></span>
                    {primaryPhone && primaryPhone !== '—' ? (
                      <>
                        <span>•</span>
                        <span>الهاتف: <strong style={{ color: '#1e293b', direction: 'ltr', display: 'inline-block' }}>{primaryPhone}</strong></span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Quick PIN Info Card */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: '#f8fafc', padding: '5px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem' }}>
                  <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>رمز البوابة (PIN)</span>
                  <span style={{ fontWeight: 700, color: employee.hasPinCode ? '#15803d' : '#94a3b8' }}>
                    {employee.hasPinCode ? 'تم تعيينه' : 'غير محدد'}
                  </span>
                </div>
                {canManageEmployees && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setPinCodeInput(employee?.pinCode || (employee as any)?.pin_code || '');
                      setShowPinModal(true);
                    }}
                    style={{ fontSize: '0.75rem', padding: '5px 8px' }}
                  >
                    تعديل الـ PIN
                  </Button>
                )}
              </div>
            </div>
          ) : null}

          {/* Key Metric Overview Cards */}
          {employee ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              {/* Card 1: Base Salary */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: 600, display: 'block' }}>الراتب الأساسي التعاقدي</span>
                <strong style={{ fontSize: '1.15rem', color: '#0f172a', marginTop: '2px', display: 'block' }}>
                  {canViewSalary ? `${money(latestContract?.baseSalary || employee.baseSalary || 0)}` : '—'}
                </strong>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  {normalizeText(employee.compensationType) === 'hourly' ? `أجر الساعة: ${money(employee.hourlyRate || 0)}` : (latestContract?.contractType ? `عقد ${latestContract.contractType}` : 'عقد شهري')}
                </span>
              </div>

              {/* Card 2: Loans Remaining */}
              <div
                onClick={() => setActiveSection('loans')}
                style={{
                  backgroundColor: '#ffffff',
                  border: `1px solid ${openLoansRemaining > 0 ? '#fed7aa' : '#e2e8f0'}`,
                  borderRadius: '10px',
                  padding: '12px 16px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.725rem', color: openLoansRemaining > 0 ? '#9a3412' : '#64748b', fontWeight: 600 }}>رصيد السلف القائم</span>
                  {openLoansCount > 0 ? (
                    <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#ffedd5', color: '#9a3412', fontWeight: 700 }}>
                      {openLoansCount} سلفة
                    </span>
                  ) : null}
                </div>
                <strong style={{ fontSize: '1.15rem', color: openLoansRemaining > 0 ? '#c2410c' : '#0f172a', marginTop: '2px', display: 'block' }}>
                  {canViewLoans ? `${money(openLoansRemaining)}` : '—'}
                </strong>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  {openLoansCount > 0 ? 'اضغط لعرض الأقساط والسداد' : 'لا توجد سلف قائمة'}
                </span>
              </div>

              {/* Card 3: Leaves */}
              <div
                onClick={() => setActiveSection('leaves')}
                style={{
                  backgroundColor: '#ffffff',
                  border: `1px solid ${pendingLeavesCount > 0 ? '#fef3c7' : '#e2e8f0'}`,
                  borderRadius: '10px',
                  padding: '12px 16px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.725rem', color: pendingLeavesCount > 0 ? '#b45309' : '#64748b', fontWeight: 600 }}>طلبات الإجازات</span>
                  {pendingLeavesCount > 0 ? (
                    <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#b45309', fontWeight: 700 }}>
                      معلق
                    </span>
                  ) : null}
                </div>
                <strong style={{ fontSize: '1.15rem', color: pendingLeavesCount > 0 ? '#b45309' : '#0f172a', marginTop: '2px', display: 'block' }}>
                  {pendingLeavesCount > 0 ? `${pendingLeavesCount} طلب معلق` : `${leaveRequests.length} إجازة مسجلة`}
                </strong>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  {unpaidLeavesCount > 0 ? `${unpaidLeavesCount} إجازة غير مدفوعة` : 'سجل الإجازات والأرصدة'}
                </span>
              </div>

              {/* Card 4: Assets */}
              <div
                onClick={() => setActiveSection('assets')}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: 600, display: 'block' }}>العُهد المسلمة</span>
                <strong style={{ fontSize: '1.15rem', color: '#0f172a', marginTop: '2px', display: 'block' }}>
                  {openAssetsCount > 0 ? `${openAssetsCount} عهدة` : 'لا توجد عُهد'}
                </strong>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  {openAssetsCount > 0 ? 'أجهزة ومعدات بالعهدة' : 'العهدة مستقرة'}
                </span>
              </div>
            </div>
          ) : null}

          {/* Unified Single-Row Tab Bar */}
          <div style={{
            display: 'flex',
            gap: '4px',
            background: '#ffffff',
            padding: '6px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            marginBottom: '16px',
            overflowX: 'auto',
          }}>
            {PROFILE_SECTIONS.map((section) => {
              const isActive = activeSection === section.key;
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveSection(section.key)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '7px',
                    border: '1px solid',
                    borderColor: isActive ? '#170e5e' : 'transparent',
                    background: isActive ? '#170e5e' : 'transparent',
                    color: isActive ? '#ffffff' : '#475569',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {section.label}
                </button>
              );
            })}
          </div>

          {/* Tab 1: Overview Tab */}
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

          {/* Tab 2: Attendance Statement (Dedicated Tab) */}
          {shouldShowProfileSection(activeSection, 'attendance') && id && employee ? (
            <EmployeePeriodStatement
              employeeId={id}
              employee={employee}
              canViewSalary={canViewSalary}
              canViewLoans={canViewLoans}
            />
          ) : null}

          {/* Tab 3: Payroll & Compensation */}
          {shouldShowProfileSection(activeSection, 'payroll') ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>بيانات الأجر ومسير الرواتب</strong>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>الراتب الأساسي التعاقدي والبدلات المعتمدة ومسيرات الصرف</span>
                  </div>
                  {canViewSalary ? (
                    <Button variant="secondary" onClick={() => navigate('/hr/payroll')} style={{ padding: '3px 10px', fontSize: '0.78rem' }}>
                      فتح شاشة المرتبات
                    </Button>
                  ) : null}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>الراتب الأساسي</span>
                    <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{canViewSalary ? money(latestContract?.baseSalary || employee?.baseSalary || 0) : '—'}</strong>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>نظام الأجر</span>
                    <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{normalizeText(employee?.compensationType) === 'hourly' ? 'بالساعة' : 'شهري'}</strong>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>تاريخ بداية العقد</span>
                    <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{fallbackText(latestContract?.startDate || employee?.hireDate)}</strong>
                  </div>
                </div>
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

          {/* Tab 4: Loans & Advances (Dedicated Tab) */}
          {shouldShowProfileSection(activeSection, 'loans') ? (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>السلف والأقساط الشهرية</strong>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>متابعة السلف القائمة والمخصومة والأقساط المستحقة</span>
                </div>
                {canViewLoans ? (
                  <Button variant="secondary" onClick={() => navigate('/hr/loans')} style={{ padding: '3px 10px', fontSize: '0.78rem' }}>
                    إدارة السلف
                  </Button>
                ) : null}
              </div>

              {!canViewLoans ? (
                <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>لا تملك صلاحية عرض هذه البيانات.</p>
              ) : loans.length ? (
                <DataTable<HrLoan>
                  density="compact"
                  rows={loans}
                  rowKey={(row) => String(row.id)}
                  columns={[
                    { key: 'loanNo', header: 'رقم السلفة', cell: (row: HrLoan) => <span style={{ fontWeight: 700 }}>{fallbackText(row.loanNo)}</span> },
                    { key: 'loanType', header: 'النوع', cell: (row: HrLoan) => loanTypeLabel(row.loanType) },
                    { key: 'repaymentMode', header: 'طريقة السداد', cell: (row: HrLoan) => repaymentModeLabel(row.repaymentMode) },
                    { key: 'principalAmount', header: 'قيمة السلفة', cell: (row: HrLoan) => canViewLoans ? money(row.principalAmount) : '—' },
                    { key: 'paidAmount', header: 'المسدد', cell: (row: HrLoan) => canViewLoans ? <span style={{ color: '#15803d', fontWeight: 700 }}>{money(row.paidAmount || 0)}</span> : '—' },
                    { key: 'remainingAmount', header: 'المتبقي', cell: (row: HrLoan) => canViewLoans ? <span style={{ color: '#c2410c', fontWeight: 700 }}>{money(row.remainingAmount)}</span> : '—' },
                    { key: 'status', header: 'الحالة', cell: (row: HrLoan) => loanStatusLabel(row.status) },
                  ]}
                />
              ) : (
                <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>لا توجد سلف أو قروض مسجلة لهذا الموظف.</p>
              )}
            </div>
          ) : null}

          {/* Tab 5: Leaves */}
          {shouldShowProfileSection(activeSection, 'leaves') ? (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>{t('hr.employee_profile_page.s35', "الإجازات والأذونات")}</strong>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>سجل طلبات الإجازات المعتمدة والمعلقة</span>
                </div>
                <Button variant="secondary" onClick={() => navigate('/hr/leaves')} style={{ padding: '3px 10px', fontSize: '0.78rem' }}>{t('hr.employee_profile_page.s36', "عرض الإجازات")}</Button>
              </div>
              {leaveRequests.length ? (
                <DataTable<HrLeaveRequest>
                  density="compact"
                  rows={leaveRequests.slice(0, 15)}
                  rowKey={(row) => String(row.id)}
                  columns={[
                    { key: 'leaveTypeName', header: t('hr.employee_profile_page.s37', "نوع الإجازة"), cell: (row: HrLeaveRequest) => fallbackText(row.leaveTypeName || row.leaveType) },
                    { key: 'startDate', header: t('hr.employee_profile_page.s38', "من تاريخ"), cell: (row: HrLeaveRequest) => fallbackText(row.startDate) },
                    { key: 'endDate', header: t('hr.employee_profile_page.s39', "إلى تاريخ"), cell: (row: HrLeaveRequest) => fallbackText(row.endDate) },
                    { key: 'daysCount', header: t('hr.employee_profile_page.s40', "عدد الأيام"), cell: (row: HrLeaveRequest) => <span style={{ fontWeight: 700 }}>{fallbackText(row.daysCount)}</span> },
                    { key: 'status', header: t('hr.employee_profile_page.s41', "الحالة"), cell: (row: HrLeaveRequest) => leaveStatusLabel(row.status) },
                  ]}
                />
              ) : <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>{t('hr.employee_profile_page.s42', "لا توجد طلبات إجازة حالية.")}</p>}
            </div>
          ) : null}

          {/* Tab 6: Assets & Custody */}
          {shouldShowProfileSection(activeSection, 'assets') ? (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>{t('hr.employee_profile_page.s27', "العُهد والأصول المسلمة")}</strong>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>الأجهزة والمعدات والسيارات المسلمة كعهدة للموظف</span>
                </div>
                <Button variant="secondary" onClick={() => navigate('/hr/assets')} style={{ padding: '3px 10px', fontSize: '0.78rem' }}>{t('hr.employee_profile_page.s28', "عرض العُهد")}</Button>
              </div>
              {employeeAssets.length ? (
                <DataTable<HrEmployeeAsset>
                  density="compact"
                  rows={employeeAssets}
                  rowKey={(row) => String(row.id)}
                  columns={[
                    { key: 'assetName', header: t('hr.employee_profile_page.s29', "اسم العهدة"), cell: (row: HrEmployeeAsset) => <span style={{ fontWeight: 600 }}>{fallbackText(row.assetName)}</span> },
                    { key: 'assetCode', header: t('hr.employee_profile_page.s30', "الكود/التسلسلي"), cell: (row: HrEmployeeAsset) => fallbackText(row.assetCode || row.serialNo) },
                    { key: 'assignedAt', header: t('hr.employee_profile_page.s31', "تاريخ التسليم"), cell: (row: HrEmployeeAsset) => fallbackText(row.assignedAt) },
                    { key: 'returnedAt', header: t('hr.employee_profile_page.s32', "تاريخ الاسترجاع"), cell: (row: HrEmployeeAsset) => fallbackText(row.returnedAt) },
                    { key: 'status', header: t('hr.employee_profile_page.s33', "الحالة"), cell: (row: HrEmployeeAsset) => assetStatusLabel(row.status) },
                  ]}
                />
              ) : <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>{t('hr.employee_profile_page.s34', "لا توجد عُهد مسجلة لهذا الموظف.")}</p>}
            </div>
          ) : null}

          {/* Tab 7: Documents */}
          {shouldShowProfileSection(activeSection, 'documents') ? (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>{t('hr.employee_profile_page.s12', "مستندات ووثائق الموظف")}</strong>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>الرقم القومي، شهادات المؤهل، عقود العمل، والشهادات الرسمية</span>
                </div>
                <Button variant="secondary" onClick={() => navigate('/hr/documents')} style={{ padding: '3px 10px', fontSize: '0.78rem' }}>{t('hr.employee_profile_page.s13', "عرض المستندات")}</Button>
              </div>

              <form onSubmit={(event) => { void handleAddDocument(event); }} style={{ marginBottom: '14px', background: '#fff', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                  <div><label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.employee_profile_page.s14', "اسم المستند *")}</label><input value={documentDraft.title} onChange={(e) => setDocumentDraft((current) => ({ ...current, title: e.target.value }))} style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem' }} /></div>
                  <div><label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.employee_profile_page.s15', "نوع المستند")}</label><input value={documentDraft.documentType} onChange={(e) => setDocumentDraft((current) => ({ ...current, documentType: e.target.value }))} style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem' }} /></div>
                  <div><label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.employee_profile_page.s16', "تاريخ الانتهاء")}</label><input type="date" value={documentDraft.expiryDate} onChange={(e) => setDocumentDraft((current) => ({ ...current, expiryDate: e.target.value }))} style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem' }} /></div>
                  <div><label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.employee_profile_page.s17', "ملاحظات")}</label><input value={documentDraft.notes} onChange={(e) => setDocumentDraft((current) => ({ ...current, notes: e.target.value }))} style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem' }} /></div>
                </div>
                {documentError ? <div style={{ color: '#dc2626', fontSize: '0.8rem', marginBottom: '8px' }}>{documentError}</div> : null}
                <div><Button type="submit" disabled={isSavingDocument} style={{ padding: '4px 14px', fontSize: '0.8rem' }}>{isSavingDocument ? t('hr.employee_profile_page.s18', "جاري الحفظ...") : t('hr.employee_profile_page.s19', "إضافة مستند")}</Button></div>
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

          {/* Tab 8: Detailed Profile & Contract Details */}
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

          {/* Tab 9: Financial Ledger */}
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
