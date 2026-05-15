import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { useHrReportsSummary } from '@/features/hr/hooks/useHr';

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartDate() {
  return `${todayDate().slice(0, 7)}-01`;
}

function money(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '0.00 ج.م';
  return `${amount.toFixed(2)} ج.م`;
}

interface HrMetricCardProps {
  label: string;
  value: string | number;
}

function HrMetricCard({ label, value }: HrMetricCardProps) {
  return (
    <div className="card" style={{ padding: 12, minHeight: 84 }}>
      <div className="muted small">{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{value}</div>
    </div>
  );
}

interface HrActionTileProps {
  title: string;
  description: string;
  label: string;
  onClick: () => void;
}

function HrActionTile({ title, description, label, onClick }: HrActionTileProps) {
  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ fontWeight: 700 }}>{title}</div>
      <div className="muted small" style={{ marginTop: 6 }}>{description}</div>
      <div className="actions compact-actions" style={{ marginTop: 10 }}>
        <Button variant="secondary" onClick={onClick}>{label}</Button>
      </div>
    </div>
  );
}

export function HrComingSoonPage() {
  const navigate = useNavigate();
  const today = todayDate();
  const monthStart = monthStartDate();

  const todaySummaryQuery = useHrReportsSummary({ from: today, to: today, month: today.slice(0, 7) });
  const monthSummaryQuery = useHrReportsSummary({ from: monthStart, to: today, month: today.slice(0, 7) });

  const todaySummary = todaySummaryQuery.data?.summary;
  const monthSummary = monthSummaryQuery.data?.summary;

  const hasSummaryData = useMemo(() => {
    const values = [
      Number(monthSummary?.activeEmployeeCount || 0),
      Number(todaySummary?.attendance?.presentCount || 0),
      Number(todaySummary?.attendance?.absentCount || 0),
      Number(monthSummary?.leaves?.pendingCount || 0),
      Number(monthSummary?.loans?.openLoanCount || 0),
    ];
    return values.some((value) => value > 0);
  }, [monthSummary, todaySummary]);

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="الموارد البشرية"
        description="إدارة الموظفين، الحضور، الإجازات، المرتبات، والعُهد من مكان واحد."
        actions={(
          <div className="actions compact-actions" style={{ flexWrap: 'wrap' }}>
            <Button onClick={() => navigate('/hr/employees/new')}>إضافة موظف</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/attendance')}>الحضور والانصراف</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/leaves')}>الإجازات</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>المرتبات</Button>
          </div>
        )}
      />

      <QueryFeedback
        isLoading={todaySummaryQuery.isLoading || monthSummaryQuery.isLoading}
        isError={todaySummaryQuery.isError || monthSummaryQuery.isError}
        error={todaySummaryQuery.error || monthSummaryQuery.error}
        isEmpty={!hasSummaryData}
        loadingText="جارٍ تحميل الملخص التشغيلي..."
        errorTitle="تعذر تحميل ملخص الموارد البشرية"
        emptyTitle="لا توجد بيانات كافية للعرض حاليًا."
      >
        <div className="stats-grid">
          <HrMetricCard label="الموظفون النشطون" value={Number(monthSummary?.activeEmployeeCount || 0)} />
          <HrMetricCard label="الحضور اليوم" value={Number(todaySummary?.attendance?.presentCount || 0)} />
          <HrMetricCard label="الغياب اليوم" value={Number(todaySummary?.attendance?.absentCount || 0)} />
          <HrMetricCard label="إجازات بانتظار الموافقة" value={Number(monthSummary?.leaves?.pendingCount || 0)} />
          <HrMetricCard label="سلف/خصومات هذا الشهر" value={money(monthSummary?.loans?.outstandingAmount || 0)} />
        </div>
      </QueryFeedback>

      <Card title="التشغيل اليومي">
        <div className="grid-3" style={{ gap: 10 }}>
          <HrActionTile
            title="الحضور والانصراف"
            description="تسجيل يوم العمل ومراجعة حالات الحضور."
            label="فتح الحضور والانصراف"
            onClick={() => navigate('/hr/attendance')}
          />
          <HrActionTile
            title="الإجازات"
            description="متابعة الطلبات والاعتماد أو الرفض."
            label="فتح الإجازات"
            onClick={() => navigate('/hr/leaves')}
          />
          <HrActionTile
            title="العُهد"
            description="تسليم واسترداد عهدة الموظفين."
            label="فتح العُهد"
            onClick={() => navigate('/hr/assets')}
          />
        </div>
      </Card>

      <Card title="الموظفون والملفات">
        <div className="grid-3" style={{ gap: 10 }}>
          <HrActionTile
            title="الموظفون"
            description="ملفات الموظفين والبيانات الأساسية."
            label="فتح الموظفين"
            onClick={() => navigate('/hr/employees')}
          />
          <HrActionTile
            title="المستندات"
            description="إدارة مستندات الموظفين وتواريخ الانتهاء."
            label="فتح المستندات"
            onClick={() => navigate('/hr/documents')}
          />
          <HrActionTile
            title="الإعدادات"
            description="الأقسام والمسميات والوظائف/المناصب."
            label="فتح الإعدادات"
            onClick={() => navigate('/hr/settings')}
          />
        </div>
      </Card>

      <Card title="المالي والإداري">
        <div className="grid-3" style={{ gap: 10 }}>
          <HrActionTile
            title="المرتبات"
            description="تجهيز كشف المرتبات ومراجعته."
            label="فتح المرتبات"
            onClick={() => navigate('/hr/payroll')}
          />
          <HrActionTile
            title="السلف والخصومات"
            description="متابعة السلف والسداد والخصومات."
            label="فتح السلف والخصومات"
            onClick={() => navigate('/hr/loans')}
          />
          <HrActionTile
            title="تقارير الموارد البشرية"
            description="ملخصات تشغيلية للحضور والإجازات والمرتبات."
            label="فتح التقارير"
            onClick={() => navigate('/hr/reports')}
          />
        </div>
      </Card>
    </div>
  );
}
