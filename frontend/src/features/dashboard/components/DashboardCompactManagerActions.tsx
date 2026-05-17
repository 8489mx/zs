import { Link } from 'react-router-dom';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { LoadingState } from '@/shared/ui/loading-state';
import type { ManagerActionInsight } from '@/features/dashboard/api/dashboard.types';
import {
  buildManagerActionMetricLabels,
  managerActionSeverityClasses,
  managerActionSeverityLabels,
  sortManagerActionsByImportance,
} from '@/features/dashboard/lib/manager-actions-ui';

interface DashboardCompactManagerActionsProps {
  insights: ManagerActionInsight[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

export function DashboardCompactManagerActions({
  insights,
  isLoading,
  isError,
  error,
}: DashboardCompactManagerActionsProps) {
  const topInsights = sortManagerActionsByImportance(insights).slice(0, 3);

  return (
    <Card
      title="مركز قرارات المدير"
      description="أهم ما يحتاج تصرف سريع فقط، بدون إغراق الرئيسية بالتفاصيل."
      className="dashboard-premium-card dashboard-card-compact manager-action-center-card manager-action-center-card-compact"
    >
      {isLoading ? (
        <LoadingState
          title="جاري تحليل البيانات..."
          hint="نراجع التسعير والمخزون والمبيعات والحسابات."
          className="dashboard-inline-state"
        />
      ) : null}

      {!isLoading && isError ? (
        <ErrorState
          title="تعذر تحميل قرارات المدير"
          error={error}
          hint="يمكنك متابعة الرئيسية، ثم إعادة المحاولة بعد تشغيل الخادم."
          className="dashboard-inline-state"
        />
      ) : null}

      {!isLoading && !isError && !insights.length ? (
        <EmptyState
          title="لا توجد قرارات عاجلة الآن"
          hint="ستظهر هنا فقط التنبيهات التي تحتاج تصرفًا واضحًا."
          className="dashboard-empty-state"
        />
      ) : null}

      {!isLoading && !isError && topInsights.length ? (
        <div className="manager-action-list manager-action-list-compact">
          {topInsights.map((insight) => {
            const metricLabels = buildManagerActionMetricLabels(insight.metrics).slice(0, 2);

            return (
              <div className={`manager-action-item ${managerActionSeverityClasses[insight.severity]}`} key={insight.id}>
                <div className="manager-action-copy">
                  <span className="manager-action-severity">{managerActionSeverityLabels[insight.severity]}</span>
                  <strong>{insight.title}</strong>
                  <span>{insight.message}</span>
                  {metricLabels.length ? (
                    <div className="manager-action-metadata">
                      {metricLabels.map((label) => <span key={label}>{label}</span>)}
                    </div>
                  ) : null}
                </div>
                <Link className="button button-secondary manager-action-link" to={insight.actionHref}>
                  {insight.actionLabel}
                </Link>
              </div>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}
