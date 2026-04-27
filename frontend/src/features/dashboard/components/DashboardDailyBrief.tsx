import { Link } from 'react-router-dom';
import { Card } from '@/shared/ui/card';
import { formatCurrency } from '@/lib/format';
import type { DashboardTrendPoint, ManagerActionInsight } from '@/features/dashboard/api/dashboard.types';
import {
  importantManagerActions,
  managerActionSeverityClasses,
  managerActionSeverityLabels,
  sortManagerActionsByImportance,
} from '@/features/dashboard/lib/manager-actions-ui';

interface DashboardDailyBriefProps {
  insights: ManagerActionInsight[];
  salesTrend: DashboardTrendPoint[];
  purchasesTrend: DashboardTrendPoint[];
  isLoading: boolean;
}

function buildComparison(label: string, trend: DashboardTrendPoint[]) {
  if (trend.length < 2) return null;
  const today = Number(trend[trend.length - 1]?.value || 0);
  const yesterday = Number(trend[trend.length - 2]?.value || 0);
  const difference = today - yesterday;
  const direction = difference > 0 ? 'أعلى من أمس' : difference < 0 ? 'أقل من أمس' : 'مثل أمس';

  return {
    label,
    value: formatCurrency(today),
    detail: `${direction} ${difference === 0 ? '' : formatCurrency(Math.abs(difference))}`.trim(),
  };
}

export function DashboardDailyBrief({
  insights,
  salesTrend,
  purchasesTrend,
  isLoading,
}: DashboardDailyBriefProps) {
  const importantActions = importantManagerActions(insights);
  const briefActions = (importantActions.length ? importantActions : sortManagerActionsByImportance(insights)).slice(0, 3);
  const comparisons = [
    buildComparison('مبيعات اليوم', salesTrend),
    buildComparison('مشتريات اليوم', purchasesTrend),
  ].filter(Boolean) as Array<{ label: string; value: string; detail: string }>;

  return (
    <Card className="dashboard-daily-brief-card">
      <div className="daily-brief-layout">
        <div className="daily-brief-copy">
          <span className="daily-brief-kicker">أهم ما يحتاج مراجعة اليوم</span>
          <h2>موجز المدير اليومي</h2>
          <p>
            {isLoading
              ? 'نراجع بيانات التسعير والمخزون والحسابات الآن.'
              : briefActions.length
                ? `لديك ${briefActions.length} نقاط عملية للمتابعة قبل نهاية اليوم.`
                : 'لا توجد تنبيهات حرجة حاليًا، والوضع مناسب للمتابعة اليومية المعتادة.'}
          </p>
        </div>

        <div className="daily-brief-actions">
          {isLoading ? (
            <div className="daily-brief-positive">جاري تجهيز موجز القرارات...</div>
          ) : briefActions.length ? (
            briefActions.map((action) => (
              <Link
                className={`daily-brief-action ${managerActionSeverityClasses[action.severity]}`}
                key={action.id}
                to={action.actionHref}
              >
                <span>{managerActionSeverityLabels[action.severity]}</span>
                <strong>{action.title}</strong>
                <small>{action.message}</small>
              </Link>
            ))
          ) : (
            <div className="daily-brief-positive">
              <strong>لا توجد تنبيهات حرجة حاليًا</strong>
              <span>استمر في مراجعة المبيعات والمخزون كالمعتاد.</span>
            </div>
          )}
        </div>

        {comparisons.length ? (
          <div className="daily-brief-comparisons" aria-label="مقارنة اليوم مع أمس">
            {comparisons.map((item) => (
              <div className="daily-brief-comparison" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.detail}</small>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
