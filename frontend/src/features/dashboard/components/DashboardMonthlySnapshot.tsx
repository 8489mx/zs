import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/lib/format';
import type { DashboardManagerOverviewPayload } from '@/features/dashboard/api/dashboard.types';

interface DashboardMonthlySnapshotProps {
  data?: DashboardManagerOverviewPayload;
}

function formatPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return 'غير متاح';
  const formatted = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 }).format(Number(value));
  return `${Number(value) > 0 ? '+' : ''}${formatted}%`;
}

export function DashboardMonthlySnapshot({ data }: DashboardMonthlySnapshotProps) {
  const { t } = useTranslation();
  if (!data) return null;

  const hasMonthlyActivity = Number(data.salesLast30.count || 0) > 0
    || Number(data.salesLast30.total || 0) > 0
    || Number(data.profitSummary.netProfit || 0) !== 0;

  return (
    <section className="document-prototype-section dashboard-premium-card dashboard-card-compact dashboard-monthly-snapshot-card">
      <div className="section-header-compact-row">
        <h3 className="document-prototype-section-title">
          {t('dashboard.dashboard_monthly_snapshot.s0', "لمحة شهرية مختصرة")}
        </h3>
        <div className="section-header-actions-group">
          <Link className="section-header-action-btn" to="/reports">{t('dashboard.dashboard_monthly_snapshot.s1', "عرض التقارير")}</Link>
        </div>
      </div>
      <p className="muted small section-header-subtitle">
        {t('dashboard.dashboard_monthly_snapshot.s2', "أرقام كافية للاتجاه العام، والتفاصيل الكاملة مكانها التقارير.")}
      </p>
      {hasMonthlyActivity ? (
        <div className="dashboard-monthly-snapshot-grid">
          <div className="manager-overview-metric">
            <span>{t('dashboard.dashboard_monthly_snapshot.s3', "مبيعات آخر 30 يوم")}</span>
            <strong>{formatCurrency(data.salesLast30.total)}</strong>
            <small>{formatPercent(data.salesLast30.comparisonPercent)} {t('dashboard.dashboard_monthly_snapshot.s4', "عن الفترة السابقة")}</small>
          </div>
          <div className="manager-overview-metric">
            <span>{t('dashboard.dashboard_monthly_snapshot.s5', "صافي الربح")}</span>
            <strong>{formatCurrency(data.profitSummary.netProfit)}</strong>
            <small>{t('dashboard.dashboard_monthly_snapshot.s6', "بعد تكلفة البضاعة والمصروفات")}</small>
          </div>
          <div className="manager-overview-metric">
            <span>{t('dashboard.dashboard_monthly_snapshot.s7', "متوسط الفاتورة")}</span>
            <strong>{formatCurrency(data.salesLast30.averageInvoice)}</strong>
            <small>{data.salesLast30.count} {t('dashboard.dashboard_monthly_snapshot.s8', "فاتورة في آخر 30 يوم")}</small>
          </div>
        </div>
      ) : (
        <div className="dashboard-inline-empty dashboard-monthly-empty">{t('dashboard.dashboard_monthly_snapshot.s9', "لا توجد بيانات شهرية كافية حاليًا.")}</div>
      )}
    </section>
  );
}
