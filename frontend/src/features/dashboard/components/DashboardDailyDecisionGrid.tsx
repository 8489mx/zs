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

interface DashboardDailyDecisionGridProps {
  data?: DashboardManagerOverviewPayload;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

function formatNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return 'غير متاح';
  return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 }).format(Number(value));
}

function formatPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return 'غير متاح';
  return `${formatNumber(value)}%`;
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="manager-overview-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProductList({ rows, type }: { rows: DashboardStagnantItem[] | DashboardBuyingItem[]; type: 'stagnant' | 'buying' }) {
  if (!rows.length) return <div className="manager-overview-inline-empty">لا توجد عناصر تحتاج متابعة الآن</div>;

  return (
    <div className="manager-overview-list">
      {rows.slice(0, 4).map((row) => (
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

function ProfitList({ rows, emptyLabel, valueType }: { rows: DashboardProfitItem[]; emptyLabel: string; valueType: 'profit' | 'margin' }) {
  if (!rows.length) return <div className="manager-overview-inline-empty">{emptyLabel}</div>;

  return (
    <div className="manager-overview-list">
      {rows.slice(0, 3).map((row, index) => (
        <div className="manager-overview-row" key={`${valueType}-${row.productId || row.categoryId || row.name}-${index}`}>
          <div>
            <strong>{row.name}</strong>
            <span>{row.categoryName || `مبيعات ${formatCurrency(row.revenue)}`}</span>
          </div>
          <b>{valueType === 'profit' ? formatCurrency(row.grossProfit) : formatPercent(row.marginPercent)}</b>
        </div>
      ))}
    </div>
  );
}

function CustomerList({ rows }: { rows: DashboardCollectionItem[] }) {
  if (!rows.length) return <div className="manager-overview-inline-empty">لا توجد أرصدة تحتاج متابعة الآن</div>;

  return (
    <div className="manager-overview-list">
      {rows.slice(0, 4).map((row) => (
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

export function DashboardDailyDecisionGrid({
  data,
  isLoading,
  isError,
  error,
}: DashboardDailyDecisionGridProps) {
  if (isLoading && !data) {
    return <LoadingState title="جاري تحميل قرارات اليوم..." hint="نراجع الراكد والشراء والتحصيل من بياناتك المحلية." className="status-surface-block" />;
  }

  if (isError && !data) {
    return <ErrorState title="تعذر تحميل قرارات اليوم" error={error} hint="ستظل بقية الرئيسية متاحة، ويمكن إعادة المحاولة لاحقًا." />;
  }

  if (!data) {
    return <EmptyState title="لا توجد بيانات كافية لقرارات اليوم" hint="ستظهر هذه البطاقات بعد تسجيل مبيعات وأصناف وعملاء." />;
  }

  return (
    <div className="page-stack" aria-label="قرارات تحتاج متابعة">
      <FormSection
        title="إيه أشتريه؟"
        description="الأصناف الناقصة أو السريعة الحركة التي تستحق مراجعة قبل الشراء."
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
        title="إيه الراكد؟"
        description="أصناف موجودة لكنها لا تتحرك وتحتاج قرار تسعير أو عرض."
        actions={<Link className="button button-secondary manager-overview-action" to="/inventory">راجع المخزون</Link>}
        className="dashboard-premium-card dashboard-card-compact manager-overview-card"
      >
        <div className="manager-overview-mini-metrics">
          <MetricTile label="راكد منذ 30 يوم" value={formatNumber(data.stagnant.days30)} />
          <MetricTile label="راكد منذ 90 يوم" value={formatNumber(data.stagnant.days90)} />
          <MetricTile label="قيمة الراكد" value={formatCurrency(data.stagnant.inventoryValue)} />
        </div>
        <ProductList rows={data.stagnant.items} type="stagnant" />
      </FormSection>

      <FormSection
        title="بيكسب منين؟"
        description="أعلى الأصناف ربحًا، والأصناف التي تبيع كثيرًا بهامش ضعيف وتحتاج مراجعة سعر أو تكلفة."
        actions={<Link className="button button-secondary manager-overview-action" to="/reports/profit">افتح تقرير الربح</Link>}
        className="dashboard-premium-card dashboard-card-compact manager-overview-card"
      >
        <div className="manager-overview-mini-metrics">
          <MetricTile label="أعلى ربح" value={data.profitSources.topProducts[0] ? formatCurrency(data.profitSources.topProducts[0].grossProfit) : 'غير متاح'} />
          <MetricTile label="هامش أعلى صنف" value={data.profitSources.topProducts[0] ? formatPercent(data.profitSources.topProducts[0].marginPercent) : 'غير متاح'} />
          <MetricTile label="هامش ضعيف" value={formatNumber(data.profitSources.weakMarginHighSales.length)} />
        </div>
        <div className="manager-overview-list-section">
          <div className="muted small">أعلى الأصناف ربحًا</div>
          <ProfitList rows={data.profitSources.topProducts} emptyLabel="لا توجد أرباح أصناف كافية الآن" valueType="profit" />
        </div>
        <div className="manager-overview-list-section">
          <div className="muted small">مبيعات عالية وهامش ضعيف</div>
          <ProfitList rows={data.profitSources.weakMarginHighSales} emptyLabel="لا توجد أصناف بهامش ضعيف تحتاج متابعة الآن" valueType="margin" />
        </div>
      </FormSection>

      <FormSection
        title="إيه أُحصّله؟"
        description="أهم العملاء والأرصدة التي تحتاج متابعة تحصيل اليوم."
        actions={<Link className="button button-secondary manager-overview-action" to="/accounts">افتح الحسابات</Link>}
        className="dashboard-premium-card dashboard-card-compact manager-overview-card"
      >
        <div className="manager-overview-mini-metrics">
          <MetricTile label="أعلى أرصدة" value={formatNumber(data.collection.topDebts.length)} />
          <MetricTile label="متجاوز الحد" value={formatNumber(data.collection.aboveCreditLimit.length)} />
          <MetricTile label="قريب من الحد" value={formatNumber(data.collection.nearCreditLimit.length)} />
        </div>
        <CustomerList rows={data.collection.topDebts} />
      </FormSection>
    </div>
  );
}
