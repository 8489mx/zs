import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FormSection } from '@/shared/components/form-section';
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
  const { t } = useTranslation();
  const topInsights = sortManagerActionsByImportance(insights).slice(0, 3);

  return (
    <FormSection
      title={t('dashboard.dashboard_compact_manager_actions.s0', "مركز قرارات المدير")}
      description={t('dashboard.dashboard_compact_manager_actions.s1', "أهم ما يحتاج تصرف سريع فقط، بدون إغراق الرئيسية بالتفاصيل.")}
      className="dashboard-premium-card dashboard-card-compact manager-action-center-card manager-action-center-card-compact"
    >
      {isLoading ? (
        <LoadingState
          title={t('dashboard.dashboard_compact_manager_actions.s2', "جاري تحليل البيانات...")}
          hint={t('dashboard.dashboard_compact_manager_actions.s3', "نراجع التسعير والمخزون والمبيعات والحسابات.")}
          className="dashboard-inline-state"
        />
      ) : null}

      {!isLoading && isError ? (
        <ErrorState
          title={t('dashboard.dashboard_compact_manager_actions.s4', "تعذر تحميل قرارات المدير")}
          error={error}
          hint={t('dashboard.dashboard_compact_manager_actions.s5', "يمكنك متابعة الرئيسية، ثم إعادة المحاولة بعد تشغيل الخادم.")}
          className="dashboard-inline-state"
        />
      ) : null}

      {!isLoading && !isError && !insights.length ? (
        <EmptyState
          title={t('dashboard.dashboard_compact_manager_actions.s6', "لا توجد قرارات عاجلة الآن")}
          hint={t('dashboard.dashboard_compact_manager_actions.s7', "ستظهر هنا فقط التنبيهات التي تحتاج تصرفًا واضحًا.")}
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
    </FormSection>
  );
}
