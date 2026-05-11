import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import type { HrContact, HrContract, HrDocument, HrEmployee, HrLedgerEntry, HrLoan } from '@/types/domain';
import { useHrProfile } from '@/features/hr/hooks/useHr';

function fallbackText(value: unknown) {
  return String(value || '').trim() || '—';
}

function money(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '—';
  return `${amount.toFixed(2)} ج.م`;
}

function statusLabel(status: unknown) {
  const value = String(status || '').trim();
  if (value === 'active') return 'نشط';
  if (value === 'inactive') return 'غير نشط';
  if (value === 'deactivated') return 'موقوف';
  if (value === 'terminated') return 'منتهي الخدمة';
  return 'غير محدد';
}

function maskNationalId(nationalId: unknown) {
  const value = String(nationalId || '').trim();
  if (!/^\d{14}$/.test(value)) return 'غير مسجل';
  return `**********${value.slice(-4)}`;
}

function pickPrimaryPhone(contacts: HrContact[]) {
  const phone = contacts.find((entry) => String(entry.contactType || '').toLowerCase() === 'phone' && entry.isPrimary)
    || contacts.find((entry) => String(entry.contactType || '').toLowerCase() === 'phone')
    || contacts[0];
  return phone ? fallbackText(phone.value) : 'غير مسجل';
}

function employeeName(employee?: HrEmployee) {
  if (!employee) return 'ملف الموظف';
  return fallbackText(employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim()) || 'ملف الموظف';
}

export function EmployeeProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const profile = useHrProfile(id);

  const employee = (profile.data?.employee || undefined) as HrEmployee | undefined;
  const contacts = useMemo(() => (profile.data?.contacts || []) as HrContact[], [profile.data?.contacts]);
  const documents = useMemo(() => (profile.data?.documents || []) as HrDocument[], [profile.data?.documents]);
  const contracts = useMemo(() => (profile.data?.contracts || []) as HrContract[], [profile.data?.contracts]);
  const loans = useMemo(() => (profile.data?.loans || []) as HrLoan[], [profile.data?.loans]);
  const ledger = useMemo(() => (profile.data?.ledger || []) as HrLedgerEntry[], [profile.data?.ledger]);

  const latestContract = contracts[0];
  const primaryPhone = pickPrimaryPhone(contacts);
  const nationalIdMasked = maskNationalId(employee?.nationalId);

  const basicComplete = Boolean(String(employee?.firstName || '').trim() && String(employee?.hireDate || '').trim());
  const nationalIdComplete = Boolean(String(employee?.nationalId || '').trim());
  const mobileComplete = primaryPhone !== 'غير مسجل';

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

        <Card title="اكتمال الملف">
          <div className="form-grid">
            <div className="field"><span>البيانات الأساسية</span><strong>{basicComplete ? 'مكتمل' : 'ناقص'}</strong></div>
            <div className="field"><span>الرقم القومي</span><strong>{nationalIdComplete ? 'مكتمل' : 'ناقص'}</strong></div>
            <div className="field"><span>الموبايل</span><strong>{mobileComplete ? 'مكتمل' : 'ناقص'}</strong></div>
            <div className="field"><span>العقد</span><strong>{contracts.length > 0 ? 'مكتمل' : 'ناقص'}</strong></div>
            <div className="field"><span>المستندات</span><strong>{documents.length > 0 ? 'مكتمل' : 'ناقص'}</strong></div>
            <div className="field"><span>السلف</span><strong>{loans.length > 0 ? 'يوجد سجل' : 'لا يوجد'}</strong></div>
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
          {contacts.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>البيان</th>
                    <th>النوع</th>
                    <th>القيمة</th>
                    <th>أساسي</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((row) => (
                    <tr key={String(row.id)}>
                      <td>{fallbackText(row.label)}</td>
                      <td>{fallbackText(row.contactType)}</td>
                      <td>{fallbackText(row.value)}</td>
                      <td>{row.isPrimary ? 'نعم' : 'لا'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="muted">لا توجد بيانات تواصل مسجلة.</p>}
        </Card>

        <Card title="العقد والمرتب">
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

        <Card title="المستندات">
          {documents.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>المستند</th>
                    <th>النوع</th>
                    <th>تاريخ الانتهاء</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((row) => (
                    <tr key={String(row.id)}>
                      <td>{fallbackText(row.title)}</td>
                      <td>{fallbackText(row.documentType)}</td>
                      <td>{fallbackText(row.expiryDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="muted">لا توجد مستندات مسجلة.</p>}
        </Card>

        <Card title="السلف والخصومات">
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
          {ledger.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>نوع الحركة</th>
                    <th>القيمة</th>
                    <th>الرصيد بعد الحركة</th>
                    <th>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((row) => (
                    <tr key={String(row.id)}>
                      <td>{fallbackText(row.entryType)}</td>
                      <td>{money(row.amount)}</td>
                      <td>{money(row.balanceAfter)}</td>
                      <td>{fallbackText(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="muted">لا توجد حركات مسجلة.</p>}
        </Card>
      </QueryFeedback>
    </div>
  );
}
