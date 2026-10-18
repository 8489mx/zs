import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FormSection } from '@/shared/components/form-section';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { LoadingState } from '@/shared/ui/loading-state';
import { formatCurrency } from '@/lib/format';
import type {
  DashboardBuyingItem,
  DashboardCollectionItem,
  DashboardManagerOverviewPayload,
  DashboardProfitItem,
  DashboardStagnantItem,
} from '@/features/dashboard/api/dashboard.types';

interface DashboardManagerOverviewSectionsProps {
  data?: DashboardManagerOverviewPayload;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

function formatNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return 'غير متاح';
  return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 }).format(Number(value));
}

function MetricTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="manager-overview-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

function ProfitList({ title, rows, emptyTitle }: { title: string; rows: DashboardProfitItem[]; emptyTitle: string }) {
  return (
    <div className="manager-overview-list-card">
      <h4>{title}</h4>
      {rows.length ? (
        <div className="manager-overview-list">
          {rows.slice(0, 5).map((row) => (
            <div className="manager-overview-row" key={`${title}-${row.productId || row.categoryId || row.name}`}>
              <div>
                <strong>{row.name}</strong>
                <span>{row.categoryName || `هامش ${formatNumber(row.marginPercent)}%`}</span>
              </div>
              <b>{formatCurrency(row.grossProfit)}</b>
            </div>
          ))}
        </div>
      ) : (
        <div className="manager-overview-inline-empty">{emptyTitle}</div>
      )}
    </div>
  );
}

function ProductList({ rows, type }: { rows: DashboardStagnantItem[] | DashboardBuyingItem[]; type: 'stagnant' | 'buying' }) {
  const { t } = useTranslation();
  if (!rows.length) return <div className="manager-overview-inline-empty">{t('dashboard.dashboard_manager_overview_sections.s0', "لا توجد بيانات كافية للعرض")}</div>;

  return (
    <div className="manager-overview-list">
      {rows.slice(0, 5).map((row) => (
        <div className="manager-overview-row" key={`${type}-${row.productId}`}>
          <div>
            <strong>{row.name}</strong>
            <span>{row.categoryName || t('dashboard.dashboard_manager_overview_sections.s1', "بدون قسم")}</span>
          </div>
          <b>
            {type === 'stagnant'
              ? `${formatNumber((row as DashboardStagnantItem).daysWithoutSales)} يوم`
              : `متاح ${formatNumber((row as DashboardBuyingItem).stockQty)}`}
          </b>
        </div>
      ))}
    </div>
  );
}

function CustomerList({ rows }: { rows: DashboardCollectionItem[] }) {
  const { t } = useTranslation();
  if (!rows.length) return <div className="manager-overview-inline-empty">{t('dashboard.dashboard_manager_overview_sections.s2', "لا توجد أرصدة تحتاج متابعة الآن")}</div>;

  return (
    <div className="manager-overview-list">
      {rows.slice(0, 5).map((row) => (
        <div className="manager-overview-row" key={row.customerId}>
          <div>
            <strong>{row.name}</strong>
            <span>{row.creditLimit > 0 ? `حد الائتمان ${formatCurrency(row.creditLimit)}` : t('dashboard.dashboard_manager_overview_sections.s3', "بدون حد ائتمان")}</span>
          </div>
          <b>{formatCurrency(row.balance)}</b>
        </div>
      ))}
    </div>
  );
}

export function DashboardManagerOverviewSections({
  data,
  isLoading,
  isError,
  error,
}: DashboardManagerOverviewSectionsProps) {
  const { t } = useTranslation();
  if (isLoading && !data) {
    return <LoadingState title={t('dashboard.dashboard_manager_overview_sections.s4', "جاري تحميل ملخص المدير...")} hint={t('dashboard.dashboard_manager_overview_sections.s5', "نحسب المبيعات والربح والمخزون والذمم من البيانات المحلية.")} className="status-surface-block" />;
  }

  if (isError && !data) {
    return <ErrorState title={t('dashboard.dashboard_manager_overview_sections.s6', "تعذر تحميل ملخص المدير")} error={error} hint={t('dashboard.dashboard_manager_overview_sections.s7', "ستظل بقية لوحة التحكم متاحة، ويمكن إعادة المحاولة لاحقًا.")} />;
  }

  if (!data) {
    return <EmptyState title={t('dashboard.dashboard_manager_overview_sections.s8', "لا توجد بيانات كافية لملخص المدير")} hint={t('dashboard.dashboard_manager_overview_sections.s9', "سيظهر هذا الملخص بعد تسجيل مبيعات وأصناف وعملاء.")} />;
  }

  const comparison = data.salesLast30.comparisonPercent;

  return (
    <div className="manager-overview-sections">
      <FormSection title={t('dashboard.dashboard_manager_overview_sections.s10', "مبيعات آخر 30 يوم")} className="dashboard-premium-card dashboard-card-compact manager-overview-card">
        <div className="manager-overview-metrics-grid">
          <MetricTile label={t('dashboard.dashboard_manager_overview_sections.s11', "مبيعات آخر 30 يوم")} value={formatCurrency(data.salesLast30.total)} />
          <MetricTile label={t('dashboard.dashboard_manager_overview_sections.s12', "عدد الفواتير")} value={formatNumber(data.salesLast30.count)} />
          <MetricTile label={t('dashboard.dashboard_manager_overview_sections.s13', "متوسط الفاتورة")} value={formatCurrency(data.salesLast30.averageInvoice)} />
          {comparison != null ? (
            <MetricTile
              label={t('dashboard.dashboard_manager_overview_sections.s14', "مقارنة بالفترة السابقة")}
              value={`${comparison > 0 ? '+' : ''}${formatNumber(comparison)}%`}
              hint={`الفترة السابقة ${formatCurrency(data.salesLast30.previousTotal || 0)}`}
            />
          ) : null}
        </div>
      </FormSection>

      <FormSection title={t('dashboard.dashboard_manager_overview_sections.s15', "ملخص الربح")} className="dashboard-premium-card dashboard-card-compact manager-overview-card">
        <div className="manager-overview-metrics-grid manager-overview-profit-grid">
          <MetricTile label={t('dashboard.dashboard_manager_overview_sections.s16', "صافي المبيعات")} value={formatCurrency(data.profitSummary.netSales)} />
          <MetricTile label={t('dashboard.dashboard_manager_overview_sections.s17', "تكلفة البضاعة")} value={formatCurrency(data.profitSummary.cogs)} />
          <MetricTile label={t('dashboard.dashboard_manager_overview_sections.s18', "إجمالي الربح")} value={formatCurrency(data.profitSummary.grossProfit)} />
          <MetricTile label={t('dashboard.dashboard_manager_overview_sections.s19', "المصروفات")} value={formatCurrency(data.profitSummary.expenses)} />
          <MetricTile label={t('dashboard.dashboard_manager_overview_sections.s20', "صافي الربح")} value={formatCurrency(data.profitSummary.netProfit)} />
        </div>
      </FormSection>

      <section className="dashboard-content-grid dashboard-content-grid-wide manager-decision-grid">
        <FormSection title={t('dashboard.dashboard_manager_overview_sections.s21', "بيكسب منين؟")} className="dashboard-premium-card dashboard-card-compact manager-overview-card">
          <div className="manager-overview-three-col">
            <ProfitList title={t('dashboard.dashboard_manager_overview_sections.s22', "أعلى الأصناف ربحًا")} rows={data.profitSources.topProducts} emptyTitle={t('dashboard.dashboard_manager_overview_sections.s23', "لا توجد أرباح أصناف كافية")} />
            <ProfitList title={t('dashboard.dashboard_manager_overview_sections.s24', "أعلى الأقسام ربحًا")} rows={data.profitSources.topCategories} emptyTitle={t('dashboard.dashboard_manager_overview_sections.s25', "لا توجد أرباح أقسام كافية")} />
            <ProfitList title={t('dashboard.dashboard_manager_overview_sections.s26', "بيع عالي وهامش ضعيف")} rows={data.profitSources.weakMarginHighSales} emptyTitle={t('dashboard.dashboard_manager_overview_sections.s27', "لا توجد أصناف بهامش ضعيف")} />
          </div>
        </FormSection>

        <FormSection
          title={t('dashboard.dashboard_manager_overview_sections.s28', "إيه الراكد؟")}
          actions={<Link className="button button-secondary manager-overview-action" to="/inventory">{t('dashboard.dashboard_manager_overview_sections.s29', "راجع المخزون")}</Link>}
          className="dashboard-premium-card dashboard-card-compact manager-overview-card"
        >
          <div className="manager-overview-mini-metrics">
            <MetricTile label={`راكد (حد المتجر: ${data.stagnant.thresholdDays || 30} يوم)`} value={formatNumber(data.stagnant.daysConfigured ?? data.stagnant.days30)} />
            <MetricTile label={t('dashboard.dashboard_manager_overview_sections.s30', "راكد أكثر من 90 يوم")} value={formatNumber(data.stagnant.days90)} />
            <MetricTile label={t('dashboard.dashboard_manager_overview_sections.s31', "قيمة المخزون الراكد")} value={formatCurrency(data.stagnant.inventoryValue)} />
          </div>
          <ProductList rows={data.stagnant.items} type="stagnant" />
        </FormSection>

        <FormSection
          title={t('dashboard.dashboard_manager_overview_sections.s32', "إيه أشتريه؟")}
          actions={<Link className="button button-secondary manager-overview-action" to="/inventory">{t('dashboard.dashboard_manager_overview_sections.s33', "راجع المخزون")}</Link>}
          className="dashboard-premium-card dashboard-card-compact manager-overview-card"
        >
          <div className="manager-overview-mini-metrics">
            <MetricTile label={t('dashboard.dashboard_manager_overview_sections.s34', "أصناف نافدة")} value={formatNumber(data.buying.outOfStockTotal)} />
            <MetricTile label={t('dashboard.dashboard_manager_overview_sections.s35', "أصناف منخفضة")} value={formatNumber(data.buying.lowStockTotal)} />
            <MetricTile label={t('dashboard.dashboard_manager_overview_sections.s36', "أولوية شراء")} value={formatNumber(data.buying.priorityTotal)} />
          </div>
          <ProductList rows={data.buying.priority} type="buying" />
        </FormSection>

        <FormSection
          title={t('dashboard.dashboard_manager_overview_sections.s37', "إيه أُحصّله؟")}
          actions={<Link className="button button-secondary manager-overview-action" to="/accounts">{t('dashboard.dashboard_manager_overview_sections.s38', "افتح الحسابات")}</Link>}
          className="dashboard-premium-card dashboard-card-compact manager-overview-card"
        >
          <div className="manager-overview-mini-metrics">
            <MetricTile label={t('dashboard.dashboard_manager_overview_sections.s39', "أعلى أرصدة العملاء")} value={formatNumber(data.collection.topDebtsTotal)} />
            <MetricTile label={t('dashboard.dashboard_manager_overview_sections.s40', "متجاوز حد الائتمان")} value={formatNumber(data.collection.aboveCreditLimitTotal)} />
            <MetricTile label={t('dashboard.dashboard_manager_overview_sections.s41', "قريب من الحد")} value={formatNumber(data.collection.nearCreditLimitTotal)} />
          </div>
          <CustomerList rows={data.collection.topDebts} />
        </FormSection>
      </section>
    </div>
  );
}
