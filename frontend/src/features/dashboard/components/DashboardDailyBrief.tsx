import { Link } from 'react-router-dom';
import { FormSection } from '@/shared/components/form-section';
import type { ManagerActionInsight } from '@/features/dashboard/api/dashboard.types';
import {
  importantManagerActions,
  managerActionSeverityClasses,
  managerActionSeverityLabels,
  sortManagerActionsByImportance,
} from '@/features/dashboard/lib/manager-actions-ui';

interface DashboardDailyBriefProps {
  insights: ManagerActionInsight[];
  isLoading: boolean;
}

export function DashboardDailyBrief({
  insights,
  isLoading,
}: DashboardDailyBriefProps) {
  const importantActions = importantManagerActions(insights);
  const briefActions = (importantActions.length ? importantActions : sortManagerActionsByImportance(insights)).slice(0, 3);

  return (
    <FormSection title="ملخص تنفيذي سريع" description="أهم ما يحتاج مراجعة الآن من تنبيهات وقرارات عاجلة." actions={<span className="nav-pill">Executive Brief</span>} className="dashboard-daily-brief-card">
      <div className="daily-brief-layout daily-brief-layout-compact">
        <div className="daily-brief-copy">
          <span className="daily-brief-kicker">ملخص تنفيذي سريع</span>
          <h2>أهم ما يحتاج مراجعة الآن</h2>
          <p>
            {isLoading
              ? 'جاري تجهيز موجز التنبيهات والقرارات.'
              : briefActions.length
                ? `لديك ${briefActions.length} نقاط عملية للمراجعة الآن.`
                : 'لا توجد قرارات عاجلة الآن.'}
          </p>
        </div>

        <div className="daily-brief-actions daily-brief-actions-compact">
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
              <strong>لا توجد قرارات عاجلة الآن</strong>
              <span>استمر في المتابعة اليومية المعتادة.</span>
            </div>
          )}
        </div>
      </div>
    </FormSection>
  );
}
