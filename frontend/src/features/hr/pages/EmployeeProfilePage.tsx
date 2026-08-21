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
import { ContactsSection, LedgerSection } from '@/features/hr/components/employee-profile/EmployeeProfileSections';
import { EndOfServiceModal } from '../components/employee-profile/EndOfServiceModal';
import { EmployeeAdjustmentsSection } from '@/features/hr/components/employee-profile/EmployeeAdjustmentsSection';
import { buildEmployeeProfileDerivedData } from '@/features/hr/components/employee-profile/employee-profile.derived';

import { systemAlert } from '@/shared/components/system-alert';

import {
  employeeName,
  fallbackText,
  money,
  statusLabel,
  assetStatusLabel,
  documentStatusLabel,
  leaveStatusLabel,
  loanStatusLabel,
  loanTypeLabel,
  normalizeText,
  repaymentModeLabel,
} from '@/features/hr/utils/employee-profile.helpers';
import {
  initialDocumentDraft,
  isAssetOpen,
  isDocumentExpired,
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
  const pendingLeavesCount = derived.pendingLeavesCount;
  const unpaidLeavesCount = derived.unpaidLeavesCount;
  const completenessRows = derived.completenessRows;
  const reviewAlerts = derived.reviewAlerts;

  const expiredOrNearDocumentsCount = documents.filter(isDocumentExpired).length;
  const openAssetsCount = employeeAssets.filter(isAssetOpen).length;

  async function handleAddDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDocumentError('');
    const title = String(documentDraft.title || '').trim();
    if (!title) { setDocumentError('اسم المستند مطلوب.'); return; }
    if (!id) { setDocumentError('تعذر تحديد الموظف.'); return; }
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

  async function handleSaveContract(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    try {
      await mutations.saveContract.mutateAsync({
        employeeId: id,
        payload: { baseSalary: contractDraft.baseSalary, contractType: contractDraft.contractType },
        id: latestContract ? String(latestContract.id) : undefined
      });
      setShowContractForm(false);
      void profile.refetch();
    } catch(err) {
      systemAlert(getErrorMessage(err, 'تعذر حفظ الراتب'));
    }
  }

  const isSavingDocument = mutations.saveDocument.isPending;
  const isSavingContract = mutations.saveContract.isPending;

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '20px' }}>
        {id && employee ? <EndOfServiceModal employeeId={id} employeeName={employeeName(employee)} isOpen={showEndOfServiceModal} onClose={() => setShowEndOfServiceModal(false)} onSuccess={() => void profile.refetch()} /> : null}

        <PageHeader
          title={employee ? employeeName(employee) : 'ملف الموظف'}
          description="مركز تشغيل الموظف: بياناته، الدوام، المستندات، العُهد، الإجازات، والسلف."
          actions={
            <div className="actions compact-actions">
              {id && canManageEmployees ? <Button variant="secondary" onClick={() => navigate(`/hr/employees/${id}/edit`)}>تعديل بيانات الموظف</Button> : null}
              <Button variant="secondary" onClick={() => navigate(`/hr/employees/${id}/print-contract`)}>طباعة العقد</Button>
              {employee?.status !== 'terminated' && <Button variant="secondary" className="danger" onClick={() => setShowEndOfServiceModal(true)}>إنهاء خدمة</Button>}
              <Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>
            </div>
          }
        />

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

        <QueryFeedback isLoading={profile.isLoading} isError={profile.isError} error={profile.error} isEmpty={!employee} loadingText="جاري تحميل ملف الموظف..." errorTitle="تعذر تحميل ملف الموظف" emptyTitle="لم يتم العثور على الموظف.">
          {/* Section Switcher Tabs & Quick Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {PROFILE_SECTIONS.map((section) => (
                <Button
                  key={section.key}
                  type="button"
                  variant={activeSection === section.key ? 'primary' : 'secondary'}
                  onClick={() => setActiveSection(section.key)}
                  style={{ padding: '3px 10px', fontSize: '0.8rem' }}
                >
                  {section.label}
                </Button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <Button type="button" variant="secondary" onClick={() => navigate('/hr/attendance')} style={{ padding: '3px 8px', fontSize: '0.75rem' }}>الحضور</Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/hr/leaves')} style={{ padding: '3px 8px', fontSize: '0.75rem' }}>الإجازات</Button>
              {canViewLoans ? <Button type="button" variant="secondary" onClick={() => navigate('/hr/loans')} style={{ padding: '3px 8px', fontSize: '0.75rem' }}>السلف</Button> : null}
              {canViewSalary ? <Button type="button" variant="secondary" onClick={() => navigate('/hr/payroll')} style={{ padding: '3px 8px', fontSize: '0.75rem' }}>المرتبات</Button> : null}
            </div>
          </div>

          {shouldShowProfileSection(activeSection, 'overview') ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px', alignItems: 'stretch', marginBottom: '14px' }}>
                {/* Right Card: Quick Summary */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <strong style={{ fontSize: '0.85rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>ملخص الموظف والتشغيل</strong>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', flex: 1 }}>
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>كود الموظف</span>
                      <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>{fallbackText(employee?.employeeNo)}</strong>
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>الحالة</span>
                      <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>{statusLabel(employee?.status)}</strong>
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>القسم</span>
                      <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>{fallbackText(employee?.departmentName)}</strong>
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>المسمى الوظيفي</span>
                      <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>{fallbackText(employee?.jobTitleName)}</strong>
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>نوع الأجر</span>
                      <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>{normalizeText(employee?.compensationType) === 'hourly' ? 'أجر بالساعة' : 'راتب شهري'}</strong>
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>الموبايل الأساسي</span>
                      <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>{primaryPhone}</strong>
                    </div>
                  </div>
                </div>

                {/* Left Card: Review Alerts */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <strong style={{ fontSize: '0.85rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>تنبيهات المراجعة والمتابعة</strong>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: reviewAlerts.length ? 'flex-start' : 'center' }}>
                    {reviewAlerts.length ? (
                      reviewAlerts.map((alert) => (
                        <div key={alert} style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', padding: '6px 10px', fontSize: '0.8rem', color: '#92400e', fontWeight: 600 }}>
                          {alert}
                        </div>
                      ))
                    ) : (
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', textAlign: 'center', color: '#10b981', fontWeight: 600, fontSize: '0.85rem' }}>
                        جميع البيانات الأساسية مستوفاة ولا توجد تنبيهات عاجلة
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Compact Single-Row KPI Operational Summary Bar */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#0f172a' }}>ملخص العمليات والتشغيل</span>
                  <span style={{ fontSize: '0.725rem', color: '#64748b' }}>اضغط على أي مؤشر للانتقال للقسم الخاص به</span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: '8px' }}>
                  {[
                    { label: 'مستندات', value: documents.length, onClick: () => setActiveSection('documents'), isAlert: false },
                    { label: 'قريبة الانتهاء', value: expiredOrNearDocumentsCount, onClick: () => setActiveSection('documents'), isAlert: expiredOrNearDocumentsCount > 0 },
                    { label: 'عُهد مفتوحة', value: openAssetsCount, onClick: () => setActiveSection('assets'), isAlert: false },
                    { label: 'إجازات للمراجعة', value: pendingLeavesCount, onClick: () => setActiveSection('leaves'), isAlert: pendingLeavesCount > 0 },
                    { label: 'إجازات غير مدفوعة', value: unpaidLeavesCount, onClick: () => setActiveSection('leaves'), isAlert: false },
                    { label: 'سلف مفتوحة', value: openLoansCount, onClick: () => setActiveSection('payroll'), isAlert: false },
                    { label: 'متبقي سلف', value: canViewLoans ? money(openLoansRemaining) : '—', onClick: () => setActiveSection('payroll'), isAlert: false },
                    { label: 'اكتمال الملف', value: `${completenessRows.filter((item) => item.state === 'مكتمل').length}/${completenessRows.length}`, onClick: () => setActiveSection('details'), isAlert: false },
                  ].map((stat, idx) => (
                    <div
                      key={idx}
                      onClick={stat.onClick}
                      style={{
                        background: '#ffffff',
                        border: `1px solid ${stat.isAlert ? '#fca5a5' : '#e2e8f0'}`,
                        borderRadius: '6px',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                        minWidth: 0,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#94a3b8')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = stat.isAlert ? '#fca5a5' : '#e2e8f0')}
                    >
                      <span style={{ fontSize: '0.725rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stat.label}>
                        {stat.label}
                      </span>
                      <strong style={{ fontSize: '1.05rem', fontWeight: 800, color: stat.isAlert ? '#dc2626' : '#0f172a', lineHeight: 1.2 }}>
                        {stat.value}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {shouldShowProfileSection(activeSection, 'details') ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: '#0f172a', marginBottom: '8px' }}>البيانات الأساسية والوظيفية</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                  <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الاسم</span><strong style={{ fontSize: '0.85rem' }}>{employeeName(employee)}</strong></div>
                  <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>كود الموظف</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(employee?.employeeNo)}</strong></div>
                  <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الحالة</span><strong style={{ fontSize: '0.85rem' }}>{statusLabel(employee?.status)}</strong></div>
                  <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>القسم</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(employee?.departmentName)}</strong></div>
                  <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>المسمى الوظيفي</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(employee?.jobTitleName)}</strong></div>
                  <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الوظيفة/المنصب</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(employee?.positionName)}</strong></div>
                  <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>تاريخ التعيين</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(employee?.hireDate)}</strong></div>
                  <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الرقم القومي</span><strong style={{ fontSize: '0.85rem' }}>{nationalIdMasked}</strong></div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: '#0f172a', marginBottom: '8px' }}>بيانات الدوام والأجر</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                  <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>نوع الأجر</span><strong style={{ fontSize: '0.85rem' }}>{normalizeText(employee?.compensationType) === 'hourly' ? 'أجر بالساعة' : 'راتب شهري'}</strong></div>
                  <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>أجر الساعة</span><strong style={{ fontSize: '0.85rem' }}>{normalizeText(employee?.compensationType) === 'hourly' ? money(Number(employee?.hourlyRate || 0)) : 'غير متاح'}</strong></div>
                  <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>ساعات اليوم المتوقعة</span><strong style={{ fontSize: '0.85rem' }}>{employee?.expectedDailyHours != null ? fallbackText(employee.expectedDailyHours) : 'غير محدد'}</strong></div>
                  <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>موعد الحضور</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(employee?.scheduledCheckInTime || 'غير محدد')}</strong></div>
                  <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>موعد الانصراف</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(employee?.scheduledCheckOutTime || 'غير محدد')}</strong></div>
                  <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>فترة السماح</span><strong style={{ fontSize: '0.85rem' }}>{employee?.graceMinutes != null ? `${employee.graceMinutes} دقيقة` : 'غير محدد'}</strong></div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: '#0f172a', marginBottom: '8px' }}>بيانات التواصل</strong>
                <ContactsSection contacts={contacts} />
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>العقد والراتب</strong>
                  <div className="compact-actions">
                    {canManageEmployees ? <Button variant="secondary" onClick={() => { setContractDraft({ baseSalary: latestContract ? String(latestContract.baseSalary) : '', contractType: latestContract?.contractType || 'monthly' }); setShowContractForm(!showContractForm); }} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>تحديث بيانات العقد</Button> : null}
                  </div>
                </div>
                {!canViewSalary ? <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>لا تملك صلاحية عرض هذه البيانات.</p> : latestContract ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                    <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>نوع التعاقد</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(latestContract.contractType)}</strong></div>
                    <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الحالة</span><strong style={{ fontSize: '0.85rem' }}>{statusLabel(latestContract.status)}</strong></div>
                    <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>بداية العقد</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(latestContract.startDate)}</strong></div>
                    <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الراتب الأساسي</span><strong style={{ fontSize: '0.85rem' }}>{money(latestContract.baseSalary)}</strong></div>
                  </div>
                ) : <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>لا يوجد عقد أو راتب مسجل.</p>}

                {showContractForm && (
                  <form onSubmit={handleSaveContract} style={{ marginTop: 12, padding: 12, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                      <div><label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>نوع التعاقد</label><input value={contractDraft.contractType} onChange={e => setContractDraft(c => ({...c, contractType: e.target.value}))} style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} /></div>
                      <div><label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>الراتب الأساسي</label><input inputMode="decimal" min="0" required value={contractDraft.baseSalary} onChange={e => setContractDraft(c => ({...c, baseSalary: e.target.value}))} style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} /></div>
                    </div>
                    <div className="compact-actions" style={{ marginTop: 10 }}>
                      <Button type="submit" disabled={isSavingContract} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>{isSavingContract ? 'جاري الحفظ...' : 'حفظ العقد والراتب'}</Button>
                      <Button type="button" variant="secondary" onClick={() => setShowContractForm(false)} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>إلغاء</Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
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
                ) : <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>لا توجد سلف أو قروض مسجلة.</p>}
              </div>

              {canViewSalary ? (
                <EmployeeAdjustmentsSection 
                  adjustments={adjustmentsQuery.adjustments} 
                  isBusy={mutations.createEmployeeAdjustment.isPending || mutations.deleteEmployeeAdjustment.isPending}
                  onAddAdjustment={async (payload) => {
                    if (id) {
                      await mutations.createEmployeeAdjustment.mutateAsync({ employeeId: id, payload });
                      await adjustmentsQuery.refetch();
                    }
                  }}
                  onDeleteAdjustment={async (adjId) => {
                    await mutations.deleteEmployeeAdjustment.mutateAsync(adjId);
                    await adjustmentsQuery.refetch();
                  }}
                />
              ) : null}
            </div>
          ) : null}

          {shouldShowProfileSection(activeSection, 'ledger') ? (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <strong style={{ display: 'block', fontSize: '0.9rem', color: '#0f172a', marginBottom: '8px' }}>السجل المالي</strong>
              <LedgerSection ledger={ledger} />
            </div>
          ) : null}
        </QueryFeedback>
      </div>
      </main>
    </div>
  );
}
