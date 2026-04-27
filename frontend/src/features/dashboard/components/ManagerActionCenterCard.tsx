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

interface ManagerActionCenterCardProps {
  insights: ManagerActionInsight[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

export function ManagerActionCenterCard({
  insights,
  isLoading,
  isError,
  error,
}: ManagerActionCenterCardProps) {
  const topInsights = sortManagerActionsByImportance(insights).slice(0, 8);

  return (
    <Card
      title="مركز قرارات المدير"
      description="تنبيهات عملية من بياناتك المحلية بدون اتصال خارجي."
      className="dashboard-premium-card dashboard-card-compact manager-action-center-card"
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
          hint="يمكنك متابعة لوحة التحكم، ثم إعادة المحاولة بعد تشغيل الخادم."
          className="dashboard-inline-state"
        />
      ) : null}

      {!isLoading && !isError && !insights.length ? (
        <EmptyState
          title="لا توجد قرارات عاجلة الآن"
          hint="ستظهر هنا التنبيهات عند وجود تسعير خاسر أو مخزون منخفض أو ذمم تحتاج مراجعة."
          className="dashboard-empty-state"
        />
      ) : null}

      {!isLoading && !isError && insights.length ? (
        <div className="manager-action-list">
          {topInsights.map((insight) => {
            const metricLabels = buildManagerActionMetricLabels(insight.metrics);

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
