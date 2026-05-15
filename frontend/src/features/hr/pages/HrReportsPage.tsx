import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { useHrReportsSummary } from '@/features/hr/hooks/useHr';

function money(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '0.00 ج.م';
  return `${amount.toFixed(2)} ج.م`;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartDate() {
  return `${todayDate().slice(0, 7)}-01`;
}

export function HrReportsPage() {
  const navigate = useNavigate();
  const [from, setFrom] = useState(monthStartDate());
  const [to, setTo] = useState(todayDate());
  const [month, setMonth] = useState(todayDate().slice(0, 7));

  const reports = useHrReportsSummary({ from, to, month });
  const summary = reports.data?.summary;

  const hasAnyData = useMemo(() => {
    if (!summary) return false;
    return [
      Number(summary.employeeCount || 0),
      Number(summary.activeEmployeeCount || 0),
      Number(summary.attendance?.presentCount || 0),
      Number(summary.leaves?.approvedCount || 0),
      Number(summary.loans?.openLoanCount || 0),
      Number(summary.assets?.assignedCount || 0),
      Number(summary.payroll?.runCount || 0),
    ].some((value) => value > 0);
  }, [summary]);

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="تقارير الموارد البشرية"
        description="ملخصات تشغيلية بسيطة للحضور والإجازات والسلف والعُهد والمرتبات."
        actions={<Button variant="secondary" onClick={() => navigate('/hr')}>رجوع للموارد البشرية</Button>}
      />

      <Card title="فلاتر التقرير">
        <div className="form-grid">
          <label className="field">
            <span>من تاريخ</span>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="field">
            <span>إلى تاريخ</span>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <label className="field">
            <span>شهر المرتبات</span>
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </label>
        </div>
      </Card>

      <QueryFeedback
        isLoading={reports.isLoading}
        isError={reports.isError}
        error={reports.error}
        isEmpty={!hasAnyData}
        loadingText="جارٍ تحميل التقارير..."
        errorTitle="تعذر تحميل التقارير"
        emptyTitle="لا توجد بيانات كافية للفترة المحددة."
      >
        <Card title="ملخص الموارد البشرية">
          <div className="stats-grid">
            <div><strong>إجمالي الموظفين:</strong> {Number(summary?.employeeCount || 0)}</div>
            <div><strong>الموظفين النشطين:</strong> {Number(summary?.activeEmployeeCount || 0)}</div>
            <div><strong>كشوف المرتبات:</strong> {Number(summary?.payroll?.runCount || 0)}</div>
            <div><strong>إجمالي صافي المرتبات:</strong> {money(summary?.payroll?.totalNetPay || 0)}</div>
          </div>
        </Card>

        <Card title="تقرير الحضور والانصراف">
          <div className="stats-grid">
            <div><strong>حاضر:</strong> {Number(summary?.attendance?.presentCount || 0)}</div>
            <div><strong>غائب:</strong> {Number(summary?.attendance?.absentCount || 0)}</div>
            <div><strong>متأخر:</strong> {Number(summary?.attendance?.lateCount || 0)}</div>
            <div><strong>نصف يوم:</strong> {Number(summary?.attendance?.halfDayCount || 0)}</div>
            <div><strong>إجازة:</strong> {Number(summary?.attendance?.leaveCount || 0)}</div>
          </div>
        </Card>

        <Card title="تقرير الإجازات">
          <div className="stats-grid">
            <div><strong>قيد المراجعة:</strong> {Number(summary?.leaves?.pendingCount || 0)}</div>
            <div><strong>معتمدة:</strong> {Number(summary?.leaves?.approvedCount || 0)}</div>
            <div><strong>مرفوضة:</strong> {Number(summary?.leaves?.rejectedCount || 0)}</div>
            <div><strong>ملغاة:</strong> {Number(summary?.leaves?.cancelledCount || 0)}</div>
            <div><strong>إجازات بدون مرتب:</strong> {Number(summary?.leaves?.unpaidLeaveDays || 0)}</div>
          </div>
        </Card>

        <Card title="تقرير السلف والخصومات">
          <div className="stats-grid">
            <div><strong>عدد السلف المفتوحة:</strong> {Number(summary?.loans?.openLoanCount || 0)}</div>
            <div><strong>إجمالي المتبقي:</strong> {money(summary?.loans?.outstandingAmount || 0)}</div>
          </div>
        </Card>

        <Card title="تقرير العُهد">
          <div className="stats-grid">
            <div><strong>مسلّمة:</strong> {Number(summary?.assets?.assignedCount || 0)}</div>
            <div><strong>تم الاسترداد:</strong> {Number(summary?.assets?.returnedCount || 0)}</div>
            <div><strong>مفقودة:</strong> {Number(summary?.assets?.lostCount || 0)}</div>
            <div><strong>تالفة:</strong> {Number(summary?.assets?.damagedCount || 0)}</div>
          </div>
        </Card>

        <Card title="تقرير المرتبات">
          <div className="stats-grid">
            <div><strong>عدد الكشوف:</strong> {Number(summary?.payroll?.runCount || 0)}</div>
            <div><strong>المعتمد:</strong> {Number(summary?.payroll?.approvedRunCount || 0)}</div>
            <div><strong>إجمالي الصافي:</strong> {money(summary?.payroll?.totalNetPay || 0)}</div>
          </div>
        </Card>

        <Card title="روابط سريعة">
          <div className="actions compact-actions">
            <Button variant="secondary" onClick={() => navigate('/hr/attendance')}>فتح الحضور</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/leaves')}>فتح الإجازات</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/loans')}>فتح السلف</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/assets')}>فتح العُهد</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>فتح المرتبات</Button>
          </div>
        </Card>
      </QueryFeedback>
    </div>
  );
}
