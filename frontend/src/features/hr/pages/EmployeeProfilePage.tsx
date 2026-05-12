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
} from '@/features/hr/pages/employee-profile/employee-profile.helpers';

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

  const basicComplete = Boolean(String(employee?.firstName || '').trim() && String(employee?.hireDate || '').trim());
  const nationalIdComplete = Boolean(String(employee?.nationalId || '').trim());
  const mobileComplete = primaryPhone !== 'غير مسجل';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const documentsExpirySummary = documents.reduce((acc, row) => {
    const expiryDate = normalizeDateOnly(row.expiryDate);
    if (!expiryDate) return acc;
    const expiry = new Date(`${expiryDate}T00:00:00`);
    if (Number.isNaN(expiry.getTime())) return acc;
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays < 0) acc.expired += 1;
    if (diffDays >= 0 && diffDays <= 30) acc.nearExpiry += 1;
    return acc;
  }, { expired: 0, nearExpiry: 0 });

  const openLoans = loans.filter((row) => Number(row.remainingAmount || 0) > 0);
  const openLoansCount = openLoans.length;
  const openLoansRemaining = openLoans.reduce((sum, row) => sum + Number(row.remainingAmount || 0), 0);

  const pendingLeavesCount = leaveRequests.filter((row) => String(row.status || '').trim() === 'pending').length;
  const approvedLeavesCount = leaveRequests.filter((row) => String(row.status || '').trim() === 'approved').length;
  const assignedAssetsCount = employeeAssets.filter((row) => String(row.status || '').trim() === 'assigned').length;

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
        description="بيانات الموظف الأساسية والعقد والمستندات والسلف في مكان واحد."
        actions={<Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>}
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
        <Card title="ملخص سريع">
          <div className="form-grid">
            <div className="field"><span>كود الموظف</span><strong>{fallbackText(employee?.employeeNo)}</strong></div>
            <div className="field"><span>الحالة</span><strong>{statusLabel(employee?.status)}</strong></div>
            <div className="field"><span>الموبايل الأساسي</span><strong>{primaryPhone}</strong></div>
            <div className="field"><span>القسم</span><strong>{fallbackText(employee?.departmentName)}</strong></div>
            <div className="field"><span>المسمى الوظيفي</span><strong>{fallbackText(employee?.jobTitleName)}</strong></div>
            <div className="field"><span>تاريخ التعيين</span><strong>{fallbackText(employee?.hireDate)}</strong></div>
            <div className="field"><span>الرقم القومي</span><strong>{nationalIdMasked}</strong></div>
          </div>
        </Card>

        <Card
          title="ملخص تشغيل الموظف"
          actions={(
            <div className="compact-actions">
              <Button variant="secondary" onClick={() => navigate('/hr/attendance')}>عرض الحضور والانصراف</Button>
              <Button variant="secondary" onClick={() => navigate('/hr/leaves')}>عرض الإجازات</Button>
              <Button variant="secondary" onClick={() => navigate('/hr/assets')}>عرض العُهد</Button>
              <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>عرض المرتبات</Button>
            </div>
          )}
        >
          <div className="form-grid">
            <div className="field">
              <span>المستندات</span>
              <strong>{documents.length} مستند</strong>
              <small className="muted">منتهي: {documentsExpirySummary.expired} | قريب الانتهاء: {documentsExpirySummary.nearExpiry}</small>
            </div>
            <div className="field">
              <span>السلف والخصومات</span>
              <strong>{openLoansCount} سلفة مفتوحة</strong>
              <small className="muted">إجمالي المتبقي: {money(openLoansRemaining)}</small>
            </div>
            <div className="field">
              <span>الحضور والانصراف</span>
              <strong>متاح من الصفحة المختصة</strong>
              <small className="muted">لأن ملخص الحضور للموظف غير متاح مباشرة في بيانات الملف الحالية.</small>
            </div>
            <div className="field">
              <span>الإجازات</span>
              <strong>قيد المراجعة: {pendingLeavesCount}</strong>
              <small className="muted">معتمدة: {approvedLeavesCount}</small>
            </div>
            <div className="field">
              <span>العُهد</span>
              <strong>عُهد مسلّمة: {assignedAssetsCount}</strong>
              <small className="muted">إجمالي السجلات: {employeeAssets.length}</small>
            </div>
          </div>
        </Card>

        <Card title="اكتمال الملف">
          <div className="form-grid">
            <div className="field"><span>البيانات الأساسية</span><strong>{basicComplete ? 'مكتمل' : 'ناقص'}</strong></div>
            <div className="field"><span>الرقم القومي</span><strong>{nationalIdComplete ? 'مكتمل' : 'ناقص'}</strong></div>
            <div className="field"><span>الموبايل</span><strong>{mobileComplete ? 'مكتمل' : 'ناقص'}</strong></div>
            <div className="field"><span>العقد</span><strong>{contracts.length > 0 ? 'مكتمل' : 'ناقص'}</strong></div>
            <div className="field"><span>المستندات</span><strong>{documents.length > 0 ? 'مكتمل' : 'ناقص'}</strong></div>
            <div className="field"><span>السلف</span><strong>{loans.length > 0 ? 'يوجد سجل' : 'لا يوجد'}</strong></div>
            <div className="field"><span>الحضور</span><strong>متاح من الصفحة المختصة</strong></div>
            <div className="field"><span>الإجازات</span><strong>{leaveRequests.length > 0 ? 'يوجد سجل' : 'لا يوجد'}</strong></div>
            <div className="field"><span>العُهد</span><strong>{employeeAssets.length > 0 ? 'يوجد سجل' : 'لا يوجد'}</strong></div>
          </div>
        </Card>

        <Card title="بيانات أساسية">
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

        <Card title="العقد والمرتب" actions={<Button variant="secondary" onClick={() => navigate('/hr/payroll')}>عرض المرتبات</Button>}>
          {latestContract ? (
            <div className="form-grid">
              <div className="field"><span>نوع التعاقد</span><strong>{fallbackText(latestContract.contractType)}</strong></div>
              <div className="field"><span>الحالة</span><strong>{statusLabel(latestContract.status)}</strong></div>
              <div className="field"><span>بداية العقد</span><strong>{fallbackText(latestContract.startDate)}</strong></div>
              <div className="field"><span>نهاية العقد</span><strong>{fallbackText(latestContract.endDate)}</strong></div>
              <div className="field"><span>المرتب الأساسي</span><strong>{money(latestContract.baseSalary)}</strong></div>
              <div className="field"><span>العملة</span><strong>{fallbackText(latestContract.currency)}</strong></div>
            </div>
          ) : <p className="muted">لا يوجد عقد مسجل حتى الآن.</p>}
        </Card>

        <Card
          title="المستندات"
          actions={<Button variant="secondary" onClick={() => navigate('/hr/documents')}>عرض كل المستندات</Button>}
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
                    <th>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((row) => (
                    <tr key={String(row.id)}>
                      <td>{fallbackText(row.title)}</td>
                      <td>{fallbackText(row.documentType)}</td>
                      <td>{fallbackText(row.expiryDate)}</td>
                      <td>{fallbackText(row.notes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="muted">لا توجد مستندات مسجلة</p>}
        </Card>

        <Card
          title="السلف والخصومات"
          actions={(
            <div className="compact-actions">
              <Button variant="secondary" onClick={() => navigate('/hr/loans')}>إدارة السلف</Button>
              <Button variant="secondary" onClick={() => navigate('/hr/assets')}>إدارة العُهد</Button>
            </div>
          )}
        >
          {loans.length ? (
            <div className="table-wrap">
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
          ) : <p className="muted">لا توجد سلف أو خصومات مسجلة.</p>}
        </Card>

        <Card title="السجل">
          <LedgerSection ledger={ledger} />
        </Card>
      </QueryFeedback>
    </div>
  );
}
