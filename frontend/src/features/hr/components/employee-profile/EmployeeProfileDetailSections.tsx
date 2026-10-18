import { useTranslation } from 'react-i18next';
import { FormEvent } from 'react';
import { Button } from '@/shared/ui/button';
import { FormSection } from '@/shared/components/form-section';
import type { HrContract, HrDocument, HrEmployee, HrEmployeeAsset, HrLeaveRequest, HrLoan } from '@/types/domain';
import {
  assetStatusLabel,
  documentStatusLabel,
  fallbackText,
  installmentStatusLabel,
  leaveStatusLabel,
  loanStatusLabel,
  loanTypeLabel,
  money,
  normalizeText,
  repaymentModeLabel,
  statusLabel,
} from '@/features/hr/utils/employee-profile.helpers';

type CompletenessRow = { label: string; state: string };

type TopCardsProps = {
  employee: HrEmployee | undefined;
  primaryPhone: string;
  nationalIdMasked: string;
  completenessRows: CompletenessRow[];
  reviewAlerts: string[];
};

export function EmployeeProfileTopCards({
  employee,
  primaryPhone,
  nationalIdMasked,
  completenessRows,
  reviewAlerts,
}: TopCardsProps) {
  const { t } = useTranslation();
  return (
    <>
      <FormSection title={t('hr.employee_profile.employee_profile_detail_sections.s0', "ملخص الموظف")}>
        <div className="form-grid">
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s1', "كود الموظف")}</span><strong>{fallbackText(employee?.employeeNo)}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s2', "الحالة")}</span><strong>{statusLabel(employee?.status)}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s3', "القسم")}</span><strong>{fallbackText(employee?.departmentName)}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s4', "المسمى الوظيفي")}</span><strong>{fallbackText(employee?.jobTitleName)}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s5', "تاريخ التعيين")}</span><strong>{fallbackText(employee?.hireDate)}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s6', "الموبايل الأساسي")}</span><strong>{primaryPhone}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s7', "الرقم القومي")}</span><strong>{nationalIdMasked}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s8', "آخر تحديث")}</span><strong>{fallbackText((employee as HrEmployee & { updatedAt?: string })?.updatedAt || t('hr.employee_profile.employee_profile_detail_sections.s9', "غير متاح"))}</strong></div>
        </div>
      </FormSection>

      <FormSection title={t('hr.employee_profile.employee_profile_detail_sections.s10', "بيانات الدوام والأجر")}>
        <div className="form-grid">
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s11', "نوع الأجر")}</span><strong>{normalizeText(employee?.compensationType) === 'hourly' ? t('hr.employee_profile.employee_profile_detail_sections.s12', "أجر بالساعة") : t('hr.employee_profile.employee_profile_detail_sections.s13', "راتب شهري")}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s14', "دورة القبض")}</span><strong>{normalizeText(employee?.payFrequency) === 'weekly' ? t('hr.employee_profile.employee_profile_detail_sections.s15', "أسبوعي") : normalizeText(employee?.payFrequency) === 'biweekly' ? t('hr.employee_profile.employee_profile_detail_sections.s16', "نصف شهري") : normalizeText(employee?.payFrequency) === 'daily' ? t('hr.employee_profile.employee_profile_detail_sections.s17', "يومي") : t('hr.employee_profile.employee_profile_detail_sections.s18', "شهري")}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s19', "الراتب الشهري")}</span><strong>{normalizeText(employee?.compensationType) === 'monthly' ? t('hr.employee_profile.employee_profile_detail_sections.s20', "يُراجع من بيانات العقد والراتب") : t('hr.employee_profile.employee_profile_detail_sections.s21', "غير متاح")}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s22', "أجر الساعة")}</span><strong>{normalizeText(employee?.compensationType) === 'hourly' ? money(Number(employee?.hourlyRate || 0)) : t('hr.employee_profile.employee_profile_detail_sections.s23', "غير متاح")}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s24', "عدد ساعات اليوم المتوقعة")}</span><strong>{employee?.expectedDailyHours != null ? fallbackText(employee.expectedDailyHours) : t('hr.employee_profile.employee_profile_detail_sections.s25', "غير محدد")}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s26', "موعد الحضور")}</span><strong>{fallbackText(employee?.scheduledCheckInTime || t('hr.employee_profile.employee_profile_detail_sections.s27', "غير محدد"))}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s28', "موعد الانصراف")}</span><strong>{fallbackText(employee?.scheduledCheckOutTime || t('hr.employee_profile.employee_profile_detail_sections.s29', "غير محدد"))}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s30', "فترة السماح")}</span><strong>{employee?.graceMinutes != null ? `${employee.graceMinutes} دقيقة` : t('hr.employee_profile.employee_profile_detail_sections.s31', "غير محدد")}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s32', "سياسة الحضور")}</span><strong>{normalizeText((employee as any)?.attendancePolicy) === 'flexible' ? t('hr.employee_profile.employee_profile_detail_sections.s33', "مواعيد مرنة (حسب الساعات)") : t('hr.employee_profile.employee_profile_detail_sections.s34', "مواعيد صارمة (خصم تلقائي)")}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s35', "سياسة الوقت الإضافي")}</span><strong>{normalizeText(employee?.overtimePolicy) === 'disabled' ? t('hr.employee_profile.employee_profile_detail_sections.s36', "غير محتسب") : normalizeText(employee?.overtimePolicy) === 'auto_approved' ? t('hr.employee_profile.employee_profile_detail_sections.s37', "محتسب تلقائيًا") : t('hr.employee_profile.employee_profile_detail_sections.s38', "مراجعة واعتماد قبل الاحتساب")}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s39', "سياسة التأخير")}</span><strong>{normalizeText(employee?.delayPolicy) === 'standard' ? t('hr.employee_profile.employee_profile_detail_sections.s40', "خصم الدقائق والساعات فقط") : normalizeText(employee?.delayPolicy) === 'disabled' ? t('hr.employee_profile.employee_profile_detail_sections.s41', "بدون خصم (معطل)") : t('hr.employee_profile.employee_profile_detail_sections.s42', "نفس السياسة العامة (افتراضي)")}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s43', "نظام العمولة")}</span><strong>{normalizeText(employee?.commissionType) === 'none' ? t('hr.employee_profile.employee_profile_detail_sections.s44', "بدون عمولة") : normalizeText(employee?.commissionType) === 'percentage' ? t('hr.employee_profile.employee_profile_detail_sections.s45', "نسبة من المبيعات") : normalizeText(employee?.commissionType) === 'target_percentage' ? t('hr.employee_profile.employee_profile_detail_sections.s46', "نسبة بعد التارجت") : normalizeText(employee?.commissionType) === 'fixed' ? t('hr.employee_profile.employee_profile_detail_sections.s47', "مكافأة ثابتة") : t('hr.employee_profile.employee_profile_detail_sections.s48', "نفس السياسة العامة (افتراضي)")}</strong></div>
          {(employee?.commissionType === 'percentage' || employee?.commissionType === 'target_percentage' || employee?.commissionType === 'fixed') && (
            <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s49', "قيمة العمولة")}</span><strong>{employee.commissionType === 'fixed' ? money(employee.commissionValue || 0) : `${employee.commissionValue || 0}%`}</strong></div>
          )}
          {employee?.commissionType === 'target_percentage' && (
            <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s50', "تارجت المبيعات المطلوب")}</span><strong>{money(employee.commissionTarget || 0)}</strong></div>
          )}
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s51', "الأجر اليومي المتوقع")}</span><strong>{normalizeText(employee?.compensationType) === 'hourly' ? money(Number(employee?.hourlyRate || 0) * Number(employee?.expectedDailyHours || 0)) : t('hr.employee_profile.employee_profile_detail_sections.s52', "غير متاح")}</strong></div>
        </div>
      </FormSection>

      <FormSection title={t('hr.employee_profile.employee_profile_detail_sections.s53', "اكتمال ملف الموظف")}>
        <div className="form-grid">
          {completenessRows.map((item) => (
            <div key={item.label} className="field">
              <span>{item.label}</span>
              <strong>{item.state}</strong>
            </div>
          ))}
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>{t('hr.employee_profile.employee_profile_detail_sections.s54', "استكمل بيانات الموظف لتحسين دقة المتابعة والتقارير.")}</p>
      </FormSection>

      <FormSection title={t('hr.employee_profile.employee_profile_detail_sections.s55', "تنبيهات المراجعة")}>
        {reviewAlerts.length ? (
          <ul style={{ margin: 0, paddingInlineStart: 18 }}>
            {reviewAlerts.map((alert) => <li key={alert}>{alert}</li>)}
          </ul>
        ) : <p className="muted" style={{ margin: 0 }}>{t('hr.employee_profile.employee_profile_detail_sections.s56', "لا توجد تنبيهات مراجعة حالية.")}</p>}
      </FormSection>

      <FormSection title={t('hr.employee_profile.employee_profile_detail_sections.s57', "البيانات الأساسية والوظيفية")}>
        <div className="form-grid">
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s58', "الاسم")}</span><strong>{fallbackText(employee?.displayName || `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim())}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s59', "كود الموظف")}</span><strong>{fallbackText(employee?.employeeNo)}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s60', "الحالة")}</span><strong>{statusLabel(employee?.status)}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s61', "القسم")}</span><strong>{fallbackText(employee?.departmentName)}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s62', "المسمى الوظيفي")}</span><strong>{fallbackText(employee?.jobTitleName)}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s63', "الوظيفة/المنصب")}</span><strong>{fallbackText(employee?.positionName)}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s64', "تاريخ التعيين")}</span><strong>{fallbackText(employee?.hireDate)}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s65', "الرقم القومي")}</span><strong>{nationalIdMasked}</strong></div>
        </div>
      </FormSection>

      <FormSection title={t('hr.employee_profile.employee_profile_detail_sections.s66', "البيانات البنكية وحماية الأجور (WPS / SIF)")}>
        <div className="form-grid">
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s67', "اسم البنك")}</span><strong>{fallbackText(employee?.bankName)}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s68', "رقم الحساب البنكي")}</span><strong>{fallbackText(employee?.bankAccountNumber)}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s69', "رقم الآيبان (IBAN)")}</span><strong style={{ fontFamily: 'monospace', direction: 'ltr' }}>{fallbackText(employee?.iban)}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s70', "رمز السويفت (SWIFT)")}</span><strong style={{ fontFamily: 'monospace', direction: 'ltr' }}>{fallbackText(employee?.bankSwiftCode)}</strong></div>
        </div>
      </FormSection>
    </>
  );
}

type OperationalProps = {
  canViewSalary: boolean;
  canViewLoans: boolean;
  latestContract: HrContract | undefined;
  navigate: (to: string) => void;
  handleAddDocument: (event: FormEvent<HTMLFormElement>) => void;
  documentDraft: { title: string; documentType: string; expiryDate: string; notes: string };
  setDocumentDraft: (updater: (current: { title: string; documentType: string; expiryDate: string; notes: string }) => { title: string; documentType: string; expiryDate: string; notes: string }) => void;
  documentError: string;
  isSavingDocument: boolean;
  documents: HrDocument[];
  employeeAssets: HrEmployeeAsset[];
  pendingLeavesCount: number;
  approvedLeavesCount: number;
  unpaidLeavesCount: number;
  leaveRequests: HrLeaveRequest[];
  loans: HrLoan[];
  openLoansCount: number;
  openLoansRemaining: number;
  ledger: Array<{ id: string | number; entryType?: string; amount?: number; balanceAfter?: number; createdAt?: string }>;
};

export function EmployeeProfileOperationalSections(props: OperationalProps) {
  const { t } = useTranslation();
  const {
    canViewSalary,
    canViewLoans,
    latestContract,
    navigate,
    handleAddDocument,
    documentDraft,
    setDocumentDraft,
    documentError,
    isSavingDocument,
    documents,
    employeeAssets,
    pendingLeavesCount,
    approvedLeavesCount,
    unpaidLeavesCount,
    leaveRequests,
    loans,
    openLoansCount,
    openLoansRemaining,
    ledger,
  } = props;

  return (
    <>
      <FormSection title={t('hr.employee_profile.employee_profile_detail_sections.s71', "العقد والراتب")} actions={canViewSalary ? <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>{t('hr.employee_profile.employee_profile_detail_sections.s72', "عرض المرتبات")}</Button> : undefined}>
        {!canViewSalary ? (
          <p className="muted">{t('hr.employee_profile.employee_profile_detail_sections.s73', "لا تملك صلاحية عرض هذه البيانات.")}</p>
        ) : latestContract ? (
          <>
            <div className="form-grid">
              <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s74', "نوع التعاقد")}</span><strong>{fallbackText(latestContract.contractType)}</strong></div>
              <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s75', "الحالة")}</span><strong>{statusLabel(latestContract.status)}</strong></div>
              <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s76', "بداية العقد")}</span><strong>{fallbackText(latestContract.startDate)}</strong></div>
              <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s77', "نهاية العقد")}</span><strong>{fallbackText(latestContract.endDate)}</strong></div>
              <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s78', "الراتب الأساسي")}</span><strong>{money(latestContract.baseSalary)}</strong></div>
              <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s79', "العملة")}</span><strong>{fallbackText(latestContract.currency)}</strong></div>
            </div>
            <p className="muted" style={{ marginBottom: 0 }}>{t('hr.employee_profile.employee_profile_detail_sections.s80', "تفاصيل الضرائب والتأمينات تحتاج إعدادات مستقلة ومراجعة محاسب قبل الاعتماد.")}</p>
          </>
        ) : <p className="muted">{t('hr.employee_profile.employee_profile_detail_sections.s81', "لا يوجد عقد أو راتب مسجل.")}</p>}
      </FormSection>

      <FormSection title={t('hr.employee_profile.employee_profile_detail_sections.s82', "المستندات")} actions={<Button variant="secondary" onClick={() => navigate('/hr/documents')}>{t('hr.employee_profile.employee_profile_detail_sections.s83', "عرض المستندات")}</Button>}>
        <form onSubmit={handleAddDocument}>
          <div className="form-grid">
            <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s84', "اسم المستند")}</span><input value={documentDraft.title} onChange={(e) => setDocumentDraft((current) => ({ ...current, title: e.target.value }))} /></div>
            <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s85', "نوع المستند")}</span><input value={documentDraft.documentType} onChange={(e) => setDocumentDraft((current) => ({ ...current, documentType: e.target.value }))} /></div>
            <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s86', "تاريخ الانتهاء")}</span><input type="date" value={documentDraft.expiryDate} onChange={(e) => setDocumentDraft((current) => ({ ...current, expiryDate: e.target.value }))} /></div>
            <div className="field field-wide"><span>{t('hr.employee_profile.employee_profile_detail_sections.s87', "ملاحظات")}</span><input value={documentDraft.notes} onChange={(e) => setDocumentDraft((current) => ({ ...current, notes: e.target.value }))} /></div>
          </div>
          {documentError ? <div className="error-box" style={{ marginTop: 12 }}>{documentError}</div> : null}
          <div className="actions compact-actions" style={{ marginTop: 12 }}>
            <Button type="submit" disabled={isSavingDocument}>{isSavingDocument ? t('hr.employee_profile.employee_profile_detail_sections.s88', "جاري الحفظ...") : t('hr.employee_profile.employee_profile_detail_sections.s89', "إضافة مستند")}</Button>
          </div>
        </form>

        {documents.length ? (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="data-table"><thead><tr><th>{t('hr.employee_profile.employee_profile_detail_sections.s90', "اسم المستند")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s91', "نوع المستند")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s92', "تاريخ الانتهاء")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s93', "الحالة")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s94', "ملاحظات")}</th></tr></thead>
              <tbody>{documents.map((row) => (<tr key={String(row.id)}><td>{fallbackText(row.title)}</td><td>{fallbackText(row.documentType)}</td><td>{fallbackText(row.expiryDate) || t('hr.employee_profile.employee_profile_detail_sections.s95', "بدون تاريخ انتهاء")}</td><td>{documentStatusLabel(row.expiryDate)}</td><td>{fallbackText(row.notes)}</td></tr>))}</tbody>
            </table>
          </div>
        ) : <p className="muted">{t('hr.employee_profile.employee_profile_detail_sections.s96', "لا توجد مستندات مسجلة.")}</p>}
      </FormSection>

      <FormSection title={t('hr.employee_profile.employee_profile_detail_sections.s97', "العظڈهد والأصول")} actions={<Button variant="secondary" onClick={() => navigate('/hr/assets')}>{t('hr.employee_profile.employee_profile_detail_sections.s98', "عرض العُهد")}</Button>}>
        {employeeAssets.length ? (
          <div className="table-wrap">
            <table className="data-table"><thead><tr><th>{t('hr.employee_profile.employee_profile_detail_sections.s99', "اسم العهدة")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s100', "الكود/التسلسلي")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s101', "تاريخ التسليم")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s102', "تاريخ الاسترجاع")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s103', "الحالة")}</th></tr></thead>
              <tbody>{employeeAssets.map((row) => (<tr key={String(row.id)}><td>{fallbackText(row.assetName)}</td><td>{fallbackText(row.assetCode || row.serialNo)}</td><td>{fallbackText(row.assignedAt)}</td><td>{fallbackText(row.returnedAt)}</td><td>{assetStatusLabel(row.status)}</td></tr>))}</tbody>
            </table>
          </div>
        ) : <p className="muted">{t('hr.employee_profile.employee_profile_detail_sections.s104', "لا توجد عظڈهد مسجلة.")}</p>}
      </FormSection>

      <FormSection title={t('hr.employee_profile.employee_profile_detail_sections.s105', "الإجازات")} actions={<Button variant="secondary" onClick={() => navigate('/hr/leaves')}>{t('hr.employee_profile.employee_profile_detail_sections.s106', "عرض الإجازات")}</Button>}>
        <div className="form-grid">
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s107', "قيد المراجعة")}</span><strong>{pendingLeavesCount}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s108', "معتمدة")}</span><strong>{approvedLeavesCount}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s109', "غير مدفوعة")}</span><strong>{unpaidLeavesCount}</strong></div>
          <div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s110', "إجمالي الطلبات")}</span><strong>{leaveRequests.length}</strong></div>
        </div>
        {leaveRequests.length ? (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="data-table"><thead><tr><th>{t('hr.employee_profile.employee_profile_detail_sections.s111', "نوع الإجازة")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s112', "من تاريخ")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s113', "إلى تاريخ")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s114', "عدد الأيام")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s115', "الحالة")}</th></tr></thead>
              <tbody>{leaveRequests.slice(0, 8).map((row) => (<tr key={String(row.id)}><td>{fallbackText(row.leaveTypeName || row.leaveType)}</td><td>{fallbackText(row.startDate)}</td><td>{fallbackText(row.endDate)}</td><td>{fallbackText(row.daysCount)}</td><td>{leaveStatusLabel(row.status)}</td></tr>))}</tbody>
            </table>
          </div>
        ) : <p className="muted">{t('hr.employee_profile.employee_profile_detail_sections.s116', "لا توجد طلبات إجازة حالية.")}</p>}
      </FormSection>

      <FormSection title={t('hr.employee_profile.employee_profile_detail_sections.s117', "الحضور والانصراف")} actions={<Button variant="secondary" onClick={() => navigate('/hr/attendance')}>{t('hr.employee_profile.employee_profile_detail_sections.s118', "عرض الحضور والانصراف")}</Button>}>
        <p className="muted" style={{ margin: 0 }}>{t('hr.employee_profile.employee_profile_detail_sections.s119', "تفاصيل الحضور متاحة من صفحة الحضور والانصراف.")}</p>
      </FormSection>

      <FormSection title={t('hr.employee_profile.employee_profile_detail_sections.s120', "المرتبات والسلف")} actions={<div className="compact-actions">{canViewSalary ? <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>{t('hr.employee_profile.employee_profile_detail_sections.s121', "عرض المرتبات")}</Button> : null}{canViewLoans ? <Button variant="secondary" onClick={() => navigate('/hr/loans')}>{t('hr.employee_profile.employee_profile_detail_sections.s122', "إدارة السلف")}</Button> : null}</div>}>
        {!canViewSalary && !canViewLoans ? (<p className="muted">{t('hr.employee_profile.employee_profile_detail_sections.s123', "لا تملك صلاحية عرض هذه البيانات.")}</p>) : loans.length ? (<>
          <div className="form-grid"><div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s124', "عدد السلف المفتوحة")}</span><strong>{canViewLoans ? openLoansCount : t('hr.employee_profile.employee_profile_detail_sections.s125', "لا تملك صلاحية عرض هذه البيانات.")}</strong></div><div className="field"><span>{t('hr.employee_profile.employee_profile_detail_sections.s126', "إجمالي المتبقي")}</span><strong>{canViewLoans ? money(openLoansRemaining) : t('hr.employee_profile.employee_profile_detail_sections.s127', "لا تملك صلاحية عرض هذه البيانات.")}</strong></div></div>
          <div className="table-wrap" style={{ marginTop: 12 }}><table className="data-table"><thead><tr><th>{t('hr.employee_profile.employee_profile_detail_sections.s128', "رقم السلفة")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s129', "النوع")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s130', "طريقة السداد")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s131', "قيمة السلفة")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s132', "المتبقي")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s133', "الحالة")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s134', "خطة الأقساط")}</th></tr></thead>
            <tbody>{loans.map((row) => (<tr key={String(row.id)}><td>{fallbackText(row.loanNo)}</td><td>{loanTypeLabel(row.loanType)}</td><td>{repaymentModeLabel(row.repaymentMode)}</td><td>{canViewLoans ? money(row.principalAmount) : t('hr.employee_profile.employee_profile_detail_sections.s135', "لا تملك صلاحية عرض هذه البيانات.")}</td><td>{canViewLoans ? money(row.remainingAmount) : t('hr.employee_profile.employee_profile_detail_sections.s136', "لا تملك صلاحية عرض هذه البيانات.")}</td><td>{loanStatusLabel(row.status)}</td><td>{Array.isArray(row.installments) && row.installments.length ? (<details><summary>{`عدد الأقساط: ${row.installments.length}`}</summary><div className="table-wrap" style={{ marginTop: 8 }}><table className="data-table"><thead><tr><th>{t('hr.employee_profile.employee_profile_detail_sections.s137', "رقم القسط")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s138', "شهر الاستحقاق")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s139', "قيمة القسط")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s140', "الحالة")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s141', "تاريخ الخصم")}</th></tr></thead><tbody>{row.installments.map((installment) => (<tr key={String(installment.id)}><td>{fallbackText(installment.installmentNumber)}</td><td>{fallbackText(installment.dueDate)}</td><td>{canViewLoans ? money(installment.amount) : t('hr.employee_profile.employee_profile_detail_sections.s142', "لا تملك صلاحية عرض هذه البيانات.")}</td><td>{installmentStatusLabel(installment.status)}</td><td>{fallbackText(installment.paidAt)}</td></tr>))}</tbody></table></div></details>) : '—'}</td></tr>))}</tbody>
          </table></div>
        </>) : <p className="muted">{t('hr.employee_profile.employee_profile_detail_sections.s143', "لا توجد سلف أو خصومات مسجلة.")}</p>}
      </FormSection>

      <FormSection title={t('hr.employee_profile.employee_profile_detail_sections.s144', "السجل المالي")}><div className="table-wrap"><table className="data-table"><thead><tr><th>{t('hr.employee_profile.employee_profile_detail_sections.s145', "نوع الحركة")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s146', "القيمة")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s147', "الرصيد بعد الحركة")}</th><th>{t('hr.employee_profile.employee_profile_detail_sections.s148', "التاريخ")}</th></tr></thead><tbody>{ledger.map((row) => (<tr key={String(row.id)}><td>{fallbackText((row as { entryType?: string }).entryType)}</td><td>{money((row as { amount?: number }).amount)}</td><td>{money((row as { balanceAfter?: number }).balanceAfter)}</td><td>{fallbackText((row as { createdAt?: string }).createdAt)}</td></tr>))}</tbody></table></div></FormSection>
    </>
  );
}

