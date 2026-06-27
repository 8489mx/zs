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
  if (!rows.length) return <div className="manager-overview-inline-empty">لا توجد بيانات كافية للعرض</div>;

  return (
    <div className="manager-overview-list">
      {rows.slice(0, 5).map((row) => (
        <div className="manager-overview-row" key={`${type}-${row.productId}`}>
          <div>
            <strong>{row.name}</strong>
            <span>{row.categoryName || 'بدون قسم'}</span>
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
  if (!rows.length) return <div className="manager-overview-inline-empty">لا توجد أرصدة تحتاج متابعة الآن</div>;

  return (
    <div className="manager-overview-list">
      {rows.slice(0, 5).map((row) => (
        <div className="manager-overview-row" key={row.customerId}>
          <div>
            <strong>{row.name}</strong>
            <span>{row.creditLimit > 0 ? `حد الائتمان ${formatCurrency(row.creditLimit)}` : 'بدون حد ائتمان'}</span>
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
  if (isLoading && !data) {
    return <LoadingState title="جاري تحميل ملخص المدير..." hint="نحسب المبيعات والربح والمخزون والذمم من البيانات المحلية." className="status-surface-block" />;
  }

  if (isError && !data) {
    return <ErrorState title="تعذر تحميل ملخص المدير" error={error} hint="ستظل بقية لوحة التحكم متاحة، ويمكن إعادة المحاولة لاحقًا." />;
  }

  if (!data) {
    return <EmptyState title="لا توجد بيانات كافية لملخص المدير" hint="سيظهر هذا الملخص بعد تسجيل مبيعات وأصناف وعملاء." />;
  }

  const comparison = data.salesLast30.comparisonPercent;

  return (
    <div className="manager-overview-sections">
      <FormSection title="مبيعات آخر 30 يوم" className="dashboard-premium-card dashboard-card-compact manager-overview-card">
        <div className="manager-overview-metrics-grid">
          <MetricTile label="مبيعات آخر 30 يوم" value={formatCurrency(data.salesLast30.total)} />
          <MetricTile label="عدد الفواتير" value={formatNumber(data.salesLast30.count)} />
          <MetricTile label="متوسط الفاتورة" value={formatCurrency(data.salesLast30.averageInvoice)} />
          {comparison != null ? (
            <MetricTile
              label="مقارنة بالفترة السابقة"
              value={`${comparison > 0 ? '+' : ''}${formatNumber(comparison)}%`}
              hint={`الفترة السابقة ${formatCurrency(data.salesLast30.previousTotal || 0)}`}
            />
          ) : null}
        </div>
      </FormSection>

      <FormSection title="ملخص الربح" className="dashboard-premium-card dashboard-card-compact manager-overview-card">
        <div className="manager-overview-metrics-grid manager-overview-profit-grid">
          <MetricTile label="صافي المبيعات" value={formatCurrency(data.profitSummary.netSales)} />
          <MetricTile label="تكلفة البضاعة" value={formatCurrency(data.profitSummary.cogs)} />
          <MetricTile label="إجمالي الربح" value={formatCurrency(data.profitSummary.grossProfit)} />
          <MetricTile label="المصروفات" value={formatCurrency(data.profitSummary.expenses)} />
          <MetricTile label="صافي الربح" value={formatCurrency(data.profitSummary.netProfit)} />
        </div>
      </FormSection>

      <section className="dashboard-content-grid dashboard-content-grid-wide manager-decision-grid">
        <FormSection title="بيكسب منين؟" className="dashboard-premium-card dashboard-card-compact manager-overview-card">
          <div className="manager-overview-three-col">
            <ProfitList title="أعلى الأصناف ربحًا" rows={data.profitSources.topProducts} emptyTitle="لا توجد أرباح أصناف كافية" />
            <ProfitList title="أعلى الأقسام ربحًا" rows={data.profitSources.topCategories} emptyTitle="لا توجد أرباح أقسام كافية" />
            <ProfitList title="بيع عالي وهامش ضعيف" rows={data.profitSources.weakMarginHighSales} emptyTitle="لا توجد أصناف بهامش ضعيف" />
          </div>
        </FormSection>

        <FormSection
          title="إيه الراكد؟"
          actions={<Link className="button button-secondary manager-overview-action" to="/inventory">راجع المخزون</Link>}
          className="dashboard-premium-card dashboard-card-compact manager-overview-card"
        >
          <div className="manager-overview-mini-metrics">
            <MetricTile label="راكد منذ 30 يوم" value={formatNumber(data.stagnant.days30)} />
            <MetricTile label="راكد منذ 90 يوم" value={formatNumber(data.stagnant.days90)} />
            <MetricTile label="قيمة المخزون الراكد" value={formatCurrency(data.stagnant.inventoryValue)} />
          </div>
          <ProductList rows={data.stagnant.items} type="stagnant" />
        </FormSection>

        <FormSection
          title="إيه أشتريه؟"
          actions={<Link className="button button-secondary manager-overview-action" to="/inventory">راجع المخزون</Link>}
          className="dashboard-premium-card dashboard-card-compact manager-overview-card"
        >
          <div className="manager-overview-mini-metrics">
            <MetricTile label="أصناف نافدة" value={formatNumber(data.buying.outOfStock.length)} />
            <MetricTile label="أصناف منخفضة" value={formatNumber(data.buying.lowStock.length)} />
            <MetricTile label="أولوية شراء" value={formatNumber(data.buying.priority.length)} />
          </div>
          <ProductList rows={data.buying.priority} type="buying" />
        </FormSection>

        <FormSection
          title="إيه أُحصّله؟"
          actions={<Link className="button button-secondary manager-overview-action" to="/accounts">افتح الحسابات</Link>}
          className="dashboard-premium-card dashboard-card-compact manager-overview-card"
        >
          <div className="manager-overview-mini-metrics">
            <MetricTile label="أعلى أرصدة العملاء" value={formatNumber(data.collection.topDebts.length)} />
            <MetricTile label="متجاوز حد الائتمان" value={formatNumber(data.collection.aboveCreditLimit.length)} />
            <MetricTile label="قريب من الحد" value={formatNumber(data.collection.nearCreditLimit.length)} />
          </div>
          <CustomerList rows={data.collection.topDebts} />
        </FormSection>
      </section>
    </div>
  );
}
