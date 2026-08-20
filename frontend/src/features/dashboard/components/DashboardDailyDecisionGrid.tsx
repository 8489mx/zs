import { useState } from 'react';
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
    <div className="manager-overview-metric" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px' }}>
      <span style={{ fontSize: '0.76rem', color: '#64748b', display: 'block' }}>{label}</span>
      <strong style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>{value}</strong>
    </div>
  );
}

function ProductList({ rows, type }: { rows: DashboardStagnantItem[] | DashboardBuyingItem[]; type: 'stagnant' | 'buying' }) {
  if (!rows.length) return <div className="manager-overview-inline-empty" style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>لا توجد عناصر تحتاج متابعة الآن</div>;

  return (
    <div className="manager-overview-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {rows.slice(0, 6).map((row) => {
        const stockQty = type === 'stagnant' ? (row as DashboardStagnantItem).stockQty : (row as DashboardBuyingItem).stockQty;
        const qtyText = type === 'stagnant'
          ? `${formatNumber((row as DashboardStagnantItem).daysWithoutSales)} يوم`
          : (stockQty <= 0 ? `نفد (${formatNumber(stockQty)})` : `الكمية ${formatNumber(stockQty)}`);

        return (
          <div className="manager-overview-row" key={`${type}-${row.productId}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
            <div>
              <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{row.name}</strong>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>{row.categoryName || 'بدون قسم'}</span>
            </div>
            <b className={type === 'buying' && stockQty <= 0 ? 'text-danger' : ''} style={{ fontSize: '0.84rem', color: type === 'buying' && stockQty <= 0 ? '#dc2626' : '#334155' }}>
              {qtyText}
            </b>
          </div>
        );
      })}
    </div>
  );
}

function ProfitList({ rows, emptyLabel, valueType }: { rows: DashboardProfitItem[]; emptyLabel: string; valueType: 'profit' | 'margin' }) {
  if (!rows.length) return <div className="manager-overview-inline-empty" style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>{emptyLabel}</div>;

  return (
    <div className="manager-overview-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {rows.slice(0, 5).map((row, index) => (
        <div className="manager-overview-row" key={`${valueType}-${row.productId || row.categoryId || row.name}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
          <div>
            <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{row.name}</strong>
            <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>{row.categoryName || `مبيعات ${formatCurrency(row.revenue)}`}</span>
          </div>
          <b style={{ fontSize: '0.84rem', color: '#0f766e', fontWeight: 700 }}>{valueType === 'profit' ? formatCurrency(row.grossProfit) : formatPercent(row.marginPercent)}</b>
        </div>
      ))}
    </div>
  );
}

function CustomerList({ rows }: { rows: DashboardCollectionItem[] }) {
  if (!rows.length) return <div className="manager-overview-inline-empty" style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>لا توجد أرصدة تحتاج متابعة الآن</div>;

  return (
    <div className="manager-overview-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {rows.slice(0, 6).map((row) => (
        <div className="manager-overview-row" key={row.customerId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
          <div>
            <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{row.name}</strong>
            <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>{row.creditLimit > 0 ? `حد الائتمان ${formatCurrency(row.creditLimit)}` : 'بدون حد ائتمان'}</span>
          </div>
          <b style={{ fontSize: '0.84rem', color: '#b91c1c', fontWeight: 700 }}>{formatCurrency(row.balance)}</b>
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
  const [activeTab, setActiveTab] = useState<'buying' | 'stagnant' | 'profit' | 'collection'>('buying');

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
    <FormSection
      title="مركز اتخاذ القرارات"
      description="متابعة فورية للأولويات: نواقص الشراء، الأصناف الراكدة، مصادر الربحية، والمديونيات المستحقة."
      actions={
        <div className="actions compact-actions">
          {activeTab === 'buying' && <Link className="button button-secondary" to="/inventory">مراجعة المخزون</Link>}
          {activeTab === 'stagnant' && <Link className="button button-secondary" to="/inventory">إدارة الراكد</Link>}
          {activeTab === 'profit' && <Link className="button button-secondary" to="/reports/profit">تقرير الأرباح</Link>}
          {activeTab === 'collection' && <Link className="button button-secondary" to="/accounts">كشف الحسابات</Link>}
        </div>
      }
      className="dashboard-premium-card"
    >
      {/* Interactive Tabs */}
      <div className="filter-chip-row" style={{ marginBottom: '14px', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'buying' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('buying')}
          style={{ padding: '6px 14px', fontSize: '0.84rem' }}
        >
          أولويات الشراء والنواقص {data.buying.priorityTotal > 0 ? `(${data.buying.priorityTotal})` : ''}
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'stagnant' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('stagnant')}
          style={{ padding: '6px 14px', fontSize: '0.84rem' }}
        >
          الأصناف الراكدة والبطيئة {data.stagnant.days30 > 0 ? `(${data.stagnant.days30})` : ''}
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'profit' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('profit')}
          style={{ padding: '6px 14px', fontSize: '0.84rem' }}
        >
          تحليل الربحية والأكثر مبيعاً
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'collection' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('collection')}
          style={{ padding: '6px 14px', fontSize: '0.84rem' }}
        >
          متابعة التحصيل والمديونيات {data.collection.topDebts.length > 0 ? `(${data.collection.topDebts.length})` : ''}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'buying' && (
        <div className="page-stack" style={{ gap: '12px' }}>
          <div className="manager-overview-mini-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <MetricTile label="أصناف نافدة" value={formatNumber(data.buying.outOfStockTotal)} />
            <MetricTile label="أصناف منخفضة" value={formatNumber(data.buying.lowStockTotal)} />
            <MetricTile label="إجمالي أولوية الشراء" value={formatNumber(data.buying.priorityTotal)} />
          </div>
          <ProductList rows={data.buying.priority} type="buying" />
        </div>
      )}

      {activeTab === 'stagnant' && (
        <div className="page-stack" style={{ gap: '12px' }}>
          <div className="manager-overview-mini-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <MetricTile label="راكد منذ 30 يوم" value={formatNumber(data.stagnant.days30)} />
            <MetricTile label="راكد منذ 90 يوم" value={formatNumber(data.stagnant.days90)} />
            <MetricTile label="قيمة المخزون الراكد" value={formatCurrency(data.stagnant.inventoryValue)} />
          </div>
          <ProductList rows={data.stagnant.items} type="stagnant" />
        </div>
      )}

      {activeTab === 'profit' && (
        <div className="page-stack" style={{ gap: '12px' }}>
          <div className="manager-overview-mini-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <MetricTile label="أعلى ربح محقق" value={data.profitSources.topProducts[0] ? formatCurrency(data.profitSources.topProducts[0].grossProfit) : 'غير متاح'} />
            <MetricTile label="هامش أعلى صنف" value={data.profitSources.topProducts[0] ? formatPercent(data.profitSources.topProducts[0].marginPercent) : 'غير متاح'} />
            <MetricTile label="أصناف بهامش ضعيف" value={formatNumber(data.profitSources.weakMarginHighSales.length)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            <div>
              <div className="muted small" style={{ marginBottom: '6px', fontWeight: 600 }}>أعلى الأصناف تحقيقاً للربح</div>
              <ProfitList rows={data.profitSources.topProducts} emptyLabel="لا توجد أرباح أصناف كافية الآن" valueType="profit" />
            </div>
            <div>
              <div className="muted small" style={{ marginBottom: '6px', fontWeight: 600 }}>مبيعات عالية بهامش ربح ضعيف</div>
              <ProfitList rows={data.profitSources.weakMarginHighSales} emptyLabel="لا توجد أصناف بهامش ضعيف تحتاج متابعة الآن" valueType="margin" />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'collection' && (
        <div className="page-stack" style={{ gap: '12px' }}>
          <div className="manager-overview-mini-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <MetricTile label="أعلى أرصدة مستحقة" value={formatNumber(data.collection.topDebts.length)} />
            <MetricTile label="عملاء تجاوزوا الحد" value={formatNumber(data.collection.aboveCreditLimit.length)} />
            <MetricTile label="عملاء قاربوا الحد" value={formatNumber(data.collection.nearCreditLimit.length)} />
          </div>
          <CustomerList rows={data.collection.topDebts} />
        </div>
      )}
    </FormSection>
  );
}
