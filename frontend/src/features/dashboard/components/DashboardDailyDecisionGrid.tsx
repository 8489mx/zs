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
    <div className="manager-overview-metric" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
      <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginBottom: '2px', fontWeight: 600 }}>{label}</span>
      <strong style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>{value}</strong>
    </div>
  );
}

function ProductList({ rows, type }: { rows: DashboardStagnantItem[] | DashboardBuyingItem[]; type: 'stagnant' | 'buying' }) {
  if (!rows.length) return <div className="manager-overview-inline-empty" style={{ padding: '20px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>لا توجد عناصر تحتاج متابعة الآن</div>;

  return (
    <div className="manager-overview-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {rows.slice(0, 6).map((row) => {
        const stockQty = type === 'stagnant' ? (row as DashboardStagnantItem).stockQty : (row as DashboardBuyingItem).stockQty;
        const isOutOfStock = type === 'buying' && stockQty <= 0;

        return (
          <div className="manager-overview-row" key={`${type}-${row.productId}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#ffffff', borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <div>
              <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{row.name}</strong>
              <span style={{ display: 'block', fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>{row.categoryName || 'بدون قسم'}</span>
            </div>
            <span
              style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                background: isOutOfStock ? '#fef2f2' : '#f8fafc',
                color: isOutOfStock ? '#dc2626' : '#334155',
                border: isOutOfStock ? '1px solid #fecaca' : '1px solid #e2e8f0',
              }}
            >
              {type === 'stagnant'
                ? `راكد منذ ${formatNumber((row as DashboardStagnantItem).daysWithoutSales)} يوم`
                : (stockQty <= 0 ? 'الرصيد: 0 (نافد)' : `المتاح: ${formatNumber(stockQty)}`)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ProfitList({ rows, emptyLabel, valueType }: { rows: DashboardProfitItem[]; emptyLabel: string; valueType: 'profit' | 'margin' }) {
  if (!rows.length) return <div className="manager-overview-inline-empty" style={{ padding: '20px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>{emptyLabel}</div>;

  return (
    <div className="manager-overview-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {rows.slice(0, 5).map((row, index) => (
        <div className="manager-overview-row" key={`${valueType}-${row.productId || row.categoryId || row.name}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#ffffff', borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div>
            <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{row.name}</strong>
            <span style={{ display: 'block', fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>{row.categoryName || `مبيعات ${formatCurrency(row.revenue)}`}</span>
          </div>
          <span style={{ fontSize: '0.82rem', color: '#0f766e', fontWeight: 700, background: '#f0fdfa', border: '1px solid #ccfbf1', padding: '3px 8px', borderRadius: '6px' }}>
            {valueType === 'profit' ? formatCurrency(row.grossProfit) : formatPercent(row.marginPercent)}
          </span>
        </div>
      ))}
    </div>
  );
}

function CustomerList({ rows }: { rows: DashboardCollectionItem[] }) {
  if (!rows.length) return <div className="manager-overview-inline-empty" style={{ padding: '20px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>لا توجد أرصدة تحتاج متابعة الآن</div>;

  return (
    <div className="manager-overview-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {rows.slice(0, 6).map((row) => (
        <div className="manager-overview-row" key={row.customerId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#ffffff', borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div>
            <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{row.name}</strong>
            <span style={{ display: 'block', fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>{row.creditLimit > 0 ? `حد الائتمان ${formatCurrency(row.creditLimit)}` : 'بدون حد ائتمان'}</span>
          </div>
          <span style={{ fontSize: '0.82rem', color: '#b91c1c', fontWeight: 700, background: '#fef2f2', border: '1px solid #fee2e2', padding: '3px 8px', borderRadius: '6px' }}>
            {formatCurrency(row.balance)}
          </span>
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
      {/* Apple-style Segmented Tabs */}
      <div
        style={{
          background: '#f1f5f9',
          padding: '4px',
          borderRadius: '10px',
          display: 'inline-flex',
          gap: '4px',
          flexWrap: 'wrap',
          marginBottom: '16px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('buying')}
          style={{
            background: activeTab === 'buying' ? '#ffffff' : 'transparent',
            color: activeTab === 'buying' ? '#0f172a' : '#64748b',
            boxShadow: activeTab === 'buying' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            border: 'none',
            padding: '7px 14px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: activeTab === 'buying' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          أولويات الشراء {data.buying.priorityTotal > 0 ? `(${data.buying.priorityTotal})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('stagnant')}
          style={{
            background: activeTab === 'stagnant' ? '#ffffff' : 'transparent',
            color: activeTab === 'stagnant' ? '#0f172a' : '#64748b',
            boxShadow: activeTab === 'stagnant' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            border: 'none',
            padding: '7px 14px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: activeTab === 'stagnant' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          الأصناف الراكدة {data.stagnant.days30 > 0 ? `(${data.stagnant.days30})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('profit')}
          style={{
            background: activeTab === 'profit' ? '#ffffff' : 'transparent',
            color: activeTab === 'profit' ? '#0f172a' : '#64748b',
            boxShadow: activeTab === 'profit' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            border: 'none',
            padding: '7px 14px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: activeTab === 'profit' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          تحليل الربحية
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('collection')}
          style={{
            background: activeTab === 'collection' ? '#ffffff' : 'transparent',
            color: activeTab === 'collection' ? '#0f172a' : '#64748b',
            boxShadow: activeTab === 'collection' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            border: 'none',
            padding: '7px 14px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: activeTab === 'collection' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          متابعة التحصيل {data.collection.topDebts.length > 0 ? `(${data.collection.topDebts.length})` : ''}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            <div>
              <div className="muted small" style={{ marginBottom: '6px', fontWeight: 600 }}>أعلى الأصناف تحقيقاً للربح</div>
              <ProfitList rows={data.profitSources.topProducts} emptyLabel="لا توجد أرباح أصناف كافية الآن" valueType="profit" />
            </div>
            <div>
              <div className="muted small" style={{ marginBottom: '6px', fontWeight: 600 }}>مبيعات عالية بهامش ضعيف</div>
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
