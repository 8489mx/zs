import { useTranslation } from 'react-i18next';
import { FormSection } from '@/shared/components/form-section';
import { ReportMetricCard } from '@/features/reports/components/ReportMetricCard';
import { formatCurrency } from '@/lib/format';
import { relativePercent } from '@/features/reports/lib/reports-format';

export function ReportsQuickOverviewCard({
  spotlightCards,
  movementBars,
  report,
  salesDailyAverage,
  totalCustomerBalance
}: {
  spotlightCards: Array<{
    label: string;
    helper: string;
    value: number;
    tone: 'primary' | 'success' | 'warning' | 'danger';
    formatter?: (value: number) => string;
    decimals?: number;
    progress: number;
  }>;
  movementBars: Array<{ label: string; value: number; tone: 'primary' | 'warning' | 'danger' }>;
  report: {
    sales: { count?: number };
    purchases: { count?: number };
    treasury: { cashIn?: number };
  } | null | undefined;
  salesDailyAverage: number;
  totalCustomerBalance: number;
}) {
  const { t } = useTranslation();
  return (
    <>
      <section className="reports-spotlight-grid" aria-label={t('reports.reports_quick_overview_card.s0', "ملخص تنفيذي سريع")}>
        {spotlightCards.map((card) => (
          <ReportMetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            helper={card.helper}
            tone={card.tone}
            formatter={card.formatter}
            decimals={card.decimals}
            progress={card.progress}
          />
        ))}
      </section>

      <FormSection title={t('reports.reports_quick_overview_card.s1', "قراءة سريعة للنطاق")} actions={<span className="nav-pill">{t('reports.reports_quick_overview_card.s2', "نظرة عامة")}</span>} className="reports-motion-card">
        <div className="reports-visual-grid">
          <div className="reports-bar-panel">
            <div className="reports-panel-copy">
              <strong>{t('reports.reports_quick_overview_card.s3', "توزيع الحركة")}</strong>
              <p className="section-description">{t('reports.reports_quick_overview_card.s4', "عرض بصري خفيف يوضح أين يتركز المال في هذا النطاق.")}</p>
            </div>
            <div className="reports-bar-stack">
              {movementBars.map((entry) => (
                <div className="reports-bar-row" key={entry.label}>
                  <div className="reports-bar-meta">
                    <span>{entry.label}</span>
                    <strong>{formatCurrency(entry.value)}</strong>
                  </div>
                  <div className="report-progress-track tone-surface" aria-hidden="true">
                    <span className={`report-progress-fill tone-${entry.tone}`} style={{ width: `${relativePercent(entry.value, movementBars.map((item) => item.value))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="reports-insight-grid">
            <div className="report-floating-chip">
              <span>{t('reports.reports_quick_overview_card.s5', "عدد الفواتير")}</span>
              <strong>{(report?.sales.count || 0) + (report?.purchases.count || 0)}</strong>
            </div>
            <div className="report-floating-chip">
              <span>{t('reports.reports_quick_overview_card.s6', "داخل الخزينة")}</span>
              <strong>{formatCurrency(report?.treasury.cashIn || 0)}</strong>
            </div>
            <div className="report-floating-chip">
              <span>{t('reports.reports_quick_overview_card.s7', "متوسط بيع يومي")}</span>
              <strong>{formatCurrency(salesDailyAverage)}</strong>
            </div>
            <div className="report-floating-chip">
              <span>{t('reports.reports_quick_overview_card.s8', "أرصدة العملاء")}</span>
              <strong>{formatCurrency(totalCustomerBalance)}</strong>
            </div>
          </div>
        </div>
      </FormSection>
    </>
  );
}
