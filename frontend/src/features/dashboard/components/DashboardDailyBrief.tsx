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
    <FormSection
      title="تنبيهات عاجلة وموجز تنفيذي"
      description="أهم ما يتطلب تدخلاً سريعاً من إدارة المخزون أو الحسابات."
      actions={<span className="nav-pill">تنبيهات</span>}
      className="dashboard-premium-card"
    >
      <div
        className="daily-brief-compact-2col keep-grid-row"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '6px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {isLoading ? (
          <div style={{ gridColumn: '1 / -1', padding: '12px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>جاري تجهيز موجز التنبيهات...</div>
        ) : briefActions.length ? (
          briefActions.map((action, index) => (
            <Link
              className={`daily-brief-action ${managerActionSeverityClasses[action.severity]}`}
              key={action.id}
              to={action.actionHref}
              style={{
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '2px',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #fee2e2',
                borderInlineStart: '3px solid #ef4444',
                background: '#ffffff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                boxSizing: 'border-box',
                transition: 'all 0.15s ease',
                minWidth: 0,
                ...(index === briefActions.length - 1 && briefActions.length % 2 !== 0 ? { gridColumn: '1 / -1' } : {}),
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fee2e2', padding: '1px 4px', borderRadius: '3px', flexShrink: 0 }}>
                  {managerActionSeverityLabels[action.severity]}
                </span>
                <strong style={{ fontSize: '0.78rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{action.title}</strong>
              </div>
              <small style={{ fontSize: '0.7rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {action.message}
              </small>
            </Link>
          ))
        ) : (
          <div style={{ gridColumn: '1 / -1', padding: '12px', textAlign: 'center', color: '#166534', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.82rem', fontWeight: 600 }}>
            لا توجد تنبيهات عاجلة تتطلب تدخلاً الآن
          </div>
        )}
      </div>
    </FormSection>
  );
}
