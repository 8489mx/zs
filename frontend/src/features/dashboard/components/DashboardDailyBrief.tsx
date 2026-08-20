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
      <div className="daily-brief-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {isLoading ? (
          <div style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>جاري تجهيز موجز التنبيهات...</div>
        ) : briefActions.length ? (
          briefActions.map((action) => (
            <Link
              className={`daily-brief-action ${managerActionSeverityClasses[action.severity]}`}
              key={action.id}
              to={action.actionHref}
              style={{
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                borderInlineStart: '4px solid #ef4444',
                background: '#ffffff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>{action.title}</strong>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fee2e2', padding: '1px 6px', borderRadius: '4px' }}>
                  {managerActionSeverityLabels[action.severity]}
                </span>
              </div>
              <small style={{ fontSize: '0.74rem', color: '#64748b' }}>{action.message}</small>
            </Link>
          ))
        ) : (
          <div style={{ padding: '16px', textAlign: 'center', color: '#166534', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.84rem', fontWeight: 600 }}>
            لا توجد تنبيهات عاجلة تتطلب تدخلاً الآن
          </div>
        )}
      </div>
    </FormSection>
  );
}
