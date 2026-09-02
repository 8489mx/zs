import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { LoadingState } from '@/shared/ui/loading-state';
import { formatCurrency } from '@/lib/format';
import type {
  DashboardBuyingItem,
  DashboardCollectionItem,
  DashboardManagerOverviewPayload,
  DashboardPartnerItem,
  DashboardProfitItem,
  DashboardStagnantItem,
} from '@/features/dashboard/api/dashboard.types';

interface DashboardDailyDecisionGridProps {
  data?: DashboardManagerOverviewPayload;
  topSuppliers?: DashboardPartnerItem[];
  totalSupplierDebt?: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

function formatNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return '0';
  const num = Number(value);
  if (num === 0) return '0';
  return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 }).format(num);
}

function formatPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return '0%';
  const num = Number(value);
  if (num === 0) return '0%';
  return `${formatNumber(num)}%`;
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
  if (!rows.length) return <div className="manager-overview-inline-empty" style={{ padding: '20px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>لا توجد أرصدة عملاء تحتاج متابعة الآن</div>;

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

function SupplierList({ rows }: { rows: DashboardPartnerItem[] }) {
  if (!rows.length) return <div className="manager-overview-inline-empty" style={{ padding: '20px', textAlign: 'center', color: '#15803d', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.84rem', fontWeight: 600 }}>لا توجد مديونيات مستحقة للموردين حالياً ✓</div>;

  return (
    <div className="manager-overview-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {rows.slice(0, 6).map((row) => (
        <div className="manager-overview-row" key={row.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#ffffff', borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div>
            <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{row.name}</strong>
            <span style={{ display: 'block', fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>مستحقات للمورد واجبة السداد</span>
          </div>
          <span style={{ fontSize: '0.82rem', color: '#c2410c', fontWeight: 700, background: '#fff7ed', border: '1px solid #ffedd5', padding: '3px 8px', borderRadius: '6px' }}>
            {formatCurrency(row.total)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DashboardDailyDecisionGrid({
  data,
  topSuppliers = [],
  totalSupplierDebt = 0,
  isLoading,
  isError,
  error,
}: DashboardDailyDecisionGridProps) {
  const [activeTab, setActiveTab] = useState<'buying' | 'stagnant' | 'profit' | 'collection' | 'payables'>('buying');

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
    <section className="document-prototype-section dashboard-premium-card">
      <div className="section-header-compact-row">
        <h3 className="document-prototype-section-title">
          مركز اتخاذ القرارات
        </h3>
        <div className="section-header-actions-group">
          {activeTab === 'buying' && <Link className="section-header-action-btn" to="/inventory">مراجعة المخزون</Link>}
          {activeTab === 'stagnant' && <Link className="section-header-action-btn" to="/inventory">إدارة الراكد</Link>}
          {activeTab === 'profit' && <Link className="section-header-action-btn" to="/reports/profit">تقرير الأرباح</Link>}
          {activeTab === 'collection' && <Link className="section-header-action-btn" to="/accounts">كشف الحسابات</Link>}
          {activeTab === 'payables' && <Link className="section-header-action-btn" to="/suppliers">سجل الموردين</Link>}
        </div>
      </div>
      <p className="muted small section-header-subtitle">
        متابعة فورية للأولويات: نواقص الشراء، الأصناف الراكدة، مصادر الربحية، والمديونيات المستحقة.
      </p>
      {/* Apple-style Smooth Chips Carousel */}
      <div className="decision-grid-tabs-wrapper">
        <div className="decision-grid-tabs-bar">
          <button
            type="button"
            className={`decision-tab-chip ${activeTab === 'buying' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('buying')}
          >
            <span>نواقص الشراء</span>
            {data.buying.priorityTotal > 0 && (
              <span className="decision-tab-badge badge-danger">{data.buying.priorityTotal}</span>
            )}
          </button>
          <button
            type="button"
            className={`decision-tab-chip ${activeTab === 'stagnant' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('stagnant')}
          >
            <span>الأصناف الراكدة</span>
            {(data.stagnant.daysConfigured ?? data.stagnant.days30) > 0 && (
              <span className="decision-tab-badge badge-warning">{data.stagnant.daysConfigured ?? data.stagnant.days30}</span>
            )}
          </button>
          <button
            type="button"
            className={`decision-tab-chip ${activeTab === 'profit' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('profit')}
          >
            <span>مصادر الأرباح</span>
          </button>
          <button
            type="button"
            className={`decision-tab-chip ${activeTab === 'collection' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('collection')}
          >
            <span>تحصيل العملاء</span>
            {data.collection.topDebtsTotal > 0 && (
              <span className="decision-tab-badge badge-info">{data.collection.topDebtsTotal}</span>
            )}
          </button>
          <button
            type="button"
            className={`decision-tab-chip ${activeTab === 'payables' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('payables')}
          >
            <span>مستحقات الموردين</span>
            {topSuppliers.length > 0 && (
              <span className="decision-tab-badge badge-neutral">{topSuppliers.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content with smooth anti-jitter transition */}
      {activeTab === 'buying' && (
        <div key="tab-buying" className="page-stack decision-grid-tab-content" style={{ gap: '12px' }}>
          <div className="manager-overview-mini-metrics">
            <MetricTile label="أصناف نفدت تماماً" value={formatNumber(data.buying.outOfStockTotal)} />
            <MetricTile label="أصناف وصلت للحد الأدنى" value={formatNumber(data.buying.lowStockTotal)} />
            <MetricTile label="أصناف ذات أولوية شراء" value={formatNumber(data.buying.priorityTotal)} />
          </div>
          <ProductList rows={data.buying.priority} type="buying" />
        </div>
      )}

      {activeTab === 'stagnant' && (
        <div key="tab-stagnant" className="page-stack decision-grid-tab-content" style={{ gap: '12px' }}>
          <div className="manager-overview-mini-metrics">
            <MetricTile label={`راكد (حد المتجر: ${data.stagnant.thresholdDays || 30} يوم)`} value={formatNumber(data.stagnant.daysConfigured ?? data.stagnant.days30)} />
            <MetricTile label="راكد أكثر من 90 يوم" value={formatNumber(data.stagnant.days90)} />
            <MetricTile label="قيمة المخزون الراكد" value={formatCurrency(data.stagnant.inventoryValue)} />
          </div>
          <ProductList rows={data.stagnant.items} type="stagnant" />
        </div>
      )}

      {activeTab === 'profit' && (
        <div key="tab-profit" className="page-stack decision-grid-tab-content" style={{ gap: '12px' }}>
          <div className="manager-overview-mini-metrics">
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
        <div key="tab-collection" className="page-stack decision-grid-tab-content" style={{ gap: '12px' }}>
          <div className="manager-overview-mini-metrics">
            <MetricTile label="أعلى أرصدة مستحقة" value={formatNumber(data.collection.topDebts.length)} />
            <MetricTile label="عملاء تجاوزوا الحد" value={formatNumber(data.collection.aboveCreditLimit.length)} />
            <MetricTile label="عملاء قاربوا الحد" value={formatNumber(data.collection.nearCreditLimit.length)} />
          </div>
          <CustomerList rows={data.collection.topDebts} />
        </div>
      )}

      {activeTab === 'payables' && (
        <div key="tab-payables" className="page-stack decision-grid-tab-content" style={{ gap: '12px' }}>
          <div className="manager-overview-mini-metrics">
            <MetricTile label="إجمالي ديون الموردين" value={formatCurrency(totalSupplierDebt)} />
            <MetricTile label="أعلى مورد مستحق" value={topSuppliers[0] ? formatCurrency(topSuppliers[0].total) : '0 ج.م'} />
            <MetricTile label="عدد الموردين الدائنين" value={formatNumber(topSuppliers.length)} />
          </div>
          <SupplierList rows={topSuppliers} />
        </div>
      )}
    </section>
  );
}
