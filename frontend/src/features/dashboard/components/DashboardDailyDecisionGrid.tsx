import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { LoadingState } from '@/shared/ui/loading-state';
import { formatCurrency, formatCurrencyWithSymbol } from '@/lib/format';
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

function formatNumber(value: number | null | undefined, locale = 'ar-EG') {
  if (value == null || !Number.isFinite(Number(value))) return '0';
  const num = Number(value);
  if (num === 0) return '0';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(num);
}

function formatPercent(value: number | null | undefined, locale = 'ar-EG') {
  if (value == null || !Number.isFinite(Number(value))) return '0%';
  const num = Number(value);
  if (num === 0) return '0%';
  return `${formatNumber(num, locale)}%`;
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
  const { t, i18n } = useTranslation();
  const numLocale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';

  if (!rows.length) {
    return (
      <div className="manager-overview-inline-empty" style={{ padding: '20px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>
        {t('dashboard.no_items_need_attention', 'لا توجد عناصر تحتاج متابعة الآن')}
      </div>
    );
  }

  return (
    <div className="manager-overview-list decision-products-2col keep-grid-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
      {rows.slice(0, 6).map((row) => {
        const stockQty = type === 'stagnant' ? (row as DashboardStagnantItem).stockQty : (row as DashboardBuyingItem).stockQty;
        const isOutOfStock = type === 'buying' && stockQty <= 0;

        return (
          <div className="manager-overview-row" key={`${type}-${row.productId}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#ffffff', borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', minWidth: 0, boxSizing: 'border-box', gap: '4px' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ fontSize: '0.78rem', color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</strong>
              <span style={{ display: 'block', fontSize: '0.66rem', color: '#64748b', marginTop: '1px' }}>{row.categoryName || t('dashboard.no_category', 'بدون قسم')}</span>
            </div>
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                padding: '2px 5px',
                borderRadius: '4px',
                background: isOutOfStock ? '#fef2f2' : '#f8fafc',
                color: isOutOfStock ? '#dc2626' : '#334155',
                border: isOutOfStock ? '1px solid #fecaca' : '1px solid #e2e8f0',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {type === 'stagnant'
                ? t('dashboard.stagnant_days_label', { defaultValue: 'راكد {{days}} يوم', days: formatNumber((row as DashboardStagnantItem).daysWithoutSales, numLocale), count: formatNumber((row as DashboardStagnantItem).daysWithoutSales, numLocale) })
                : (stockQty <= 0 ? t('dashboard.out_of_stock_label', '0 (نافد)') : t('dashboard.available_unit', { defaultValue: '{{count}} متاح', count: formatNumber(stockQty, numLocale), qty: formatNumber(stockQty, numLocale) }))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ProfitList({ rows, emptyLabel, valueType }: { rows: DashboardProfitItem[]; emptyLabel: string; valueType: 'profit' | 'margin' }) {
  const { t, i18n } = useTranslation();
  const numLocale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';

  if (!rows.length) {
    return (
      <div className="manager-overview-inline-empty" style={{ padding: '16px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', fontSize: '0.82rem' }}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="manager-overview-list decision-products-2col keep-grid-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
      {rows.slice(0, 6).map((row, index) => (
        <div className="manager-overview-row" key={`${valueType}-${row.productId || row.categoryId || row.name}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#ffffff', borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', minWidth: 0, boxSizing: 'border-box', gap: '4px' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ fontSize: '0.78rem', color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</strong>
            <span style={{ display: 'block', fontSize: '0.66rem', color: '#64748b', marginTop: '1px' }}>
              {row.categoryName || t('dashboard.sales_label', 'مبيعات {{amount}}', { amount: formatCurrency(row.revenue) })}
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#0f766e', fontWeight: 700, background: '#f0fdfa', border: '1px solid #ccfbf1', padding: '2px 5px', borderRadius: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {valueType === 'profit' ? formatCurrency(row.grossProfit) : formatPercent(row.marginPercent, numLocale)}
          </span>
        </div>
      ))}
    </div>
  );
}

function CustomerList({ rows }: { rows: DashboardCollectionItem[] }) {
  const { t } = useTranslation();

  if (!rows.length) {
    return (
      <div className="manager-overview-inline-empty" style={{ padding: '16px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', fontSize: '0.82rem' }}>
        {t('dashboard.no_customer_debts', 'لا توجد أرصدة عملاء تحتاج متابعة الآن')}
      </div>
    );
  }

  return (
    <div className="manager-overview-list decision-products-2col keep-grid-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
      {rows.slice(0, 6).map((row) => (
        <div className="manager-overview-row" key={row.customerId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#ffffff', borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', minWidth: 0, boxSizing: 'border-box', gap: '4px' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ fontSize: '0.78rem', color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</strong>
            <span style={{ display: 'block', fontSize: '0.66rem', color: '#64748b', marginTop: '1px' }}>
              {row.creditLimit > 0 ? t('dashboard.credit_limit_label', 'حد {{amount}}', { amount: formatCurrency(row.creditLimit) }) : t('dashboard.no_credit_limit', 'بدون حد')}
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 700, background: '#fef2f2', border: '1px solid #fee2e2', padding: '2px 5px', borderRadius: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {formatCurrency(row.balance)}
          </span>
        </div>
      ))}
    </div>
  );
}

function SupplierList({ rows }: { rows: DashboardPartnerItem[] }) {
  const { t } = useTranslation();

  if (!rows.length) {
    return (
      <div className="manager-overview-inline-empty" style={{ padding: '16px', textAlign: 'center', color: '#15803d', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.82rem', fontWeight: 600 }}>
        {t('dashboard.no_supplier_debt', 'لا توجد مديونيات مستحقة للموردين حالياً')}
      </div>
    );
  }

  return (
    <div className="manager-overview-list decision-products-2col keep-grid-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
      {rows.slice(0, 6).map((row) => (
        <div className="manager-overview-row" key={row.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#ffffff', borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', minWidth: 0, boxSizing: 'border-box', gap: '4px' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ fontSize: '0.78rem', color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</strong>
            <span style={{ display: 'block', fontSize: '0.66rem', color: '#64748b', marginTop: '1px' }}>{t('dashboard.due_for_payment', 'واجب السداد')}</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#c2410c', fontWeight: 700, background: '#fff7ed', border: '1px solid #ffedd5', padding: '2px 5px', borderRadius: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}>
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
  const { t, i18n } = useTranslation();
  const numLocale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const [activeTab, setActiveTab] = useState<'buying' | 'stagnant' | 'profit' | 'collection' | 'payables'>('buying');

  if (isLoading && !data) {
    return <LoadingState title={t('dashboard.loading_decisions', 'جاري تحميل قرارات اليوم...')} hint={t('dashboard.decision_subtitle', 'نراجع الراكد والشراء والتحصيل من بياناتك المحلية.')} className="status-surface-block" />;
  }

  if (isError && !data) {
    return <ErrorState title={t('dashboard.error_decisions', 'تعذر تحميل قرارات اليوم')} error={error} hint={t('common.check_connection', 'ستظل بقية الرئيسية متاحة، ويمكن إعادة المحاولة لاحقًا.')} />;
  }

  if (!data) {
    return <EmptyState title={t('dashboard.empty_decisions', 'لا توجد بيانات كافية لقرارات اليوم')} hint={t('feedback.empty_hint', 'ستظهر هذه البطاقات بعد تسجيل مبيعات وأصناف وعملاء.')} />;
  }

  return (
    <section className="document-prototype-section dashboard-premium-card">
      <div className="section-header-compact-row">
        <h3 className="document-prototype-section-title">
          {t('dashboard.decision_center', 'مركز اتخاذ القرارات')}
        </h3>
        <div className="section-header-actions-group">
          {activeTab === 'buying' && <Link className="section-header-action-btn" to="/inventory">{t('dashboard.review_inventory', 'مراجعة المخزون')}</Link>}
          {activeTab === 'stagnant' && <Link className="section-header-action-btn" to="/inventory">{t('dashboard.manage_stagnant', 'إدارة الراكد')}</Link>}
          {activeTab === 'profit' && <Link className="section-header-action-btn" to="/reports/profit">{t('dashboard.profit_report', 'تقرير الأرباح')}</Link>}
          {activeTab === 'collection' && <Link className="section-header-action-btn" to="/accounts">{t('dashboard.accounts_statement', 'كشف الحسابات')}</Link>}
          {activeTab === 'payables' && <Link className="section-header-action-btn" to="/suppliers">{t('dashboard.suppliers_register', 'سجل الموردين')}</Link>}
        </div>
      </div>
      <p className="muted small section-header-subtitle">
        {t('dashboard.decision_subtitle', 'متابعة فورية للأولويات: نواقص الشراء، الأصناف الراكدة، مصادر الربحية، والمديونيات المستحقة.')}
      </p>
      {/* Apple-style Smooth Chips Carousel */}
      <div className="decision-grid-tabs-wrapper">
        <div className="decision-grid-tabs-bar">
          <button
            type="button"
            className={`decision-tab-chip ${activeTab === 'buying' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('buying')}
          >
            <span>{t('dashboard.tab_buying', 'نواقص الشراء')}</span>
            {data.buying.priorityTotal > 0 && (
              <span className="decision-tab-badge badge-danger">{data.buying.priorityTotal}</span>
            )}
          </button>
          <button
            type="button"
            className={`decision-tab-chip ${activeTab === 'stagnant' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('stagnant')}
          >
            <span>{t('dashboard.tab_stagnant', 'الأصناف الراكدة')}</span>
            {(data.stagnant.daysConfigured ?? data.stagnant.days30) > 0 && (
              <span className="decision-tab-badge badge-warning">{data.stagnant.daysConfigured ?? data.stagnant.days30}</span>
            )}
          </button>
          <button
            type="button"
            className={`decision-tab-chip ${activeTab === 'profit' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('profit')}
          >
            <span>{t('dashboard.tab_profit', 'مصادر الأرباح')}</span>
          </button>
          <button
            type="button"
            className={`decision-tab-chip ${activeTab === 'collection' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('collection')}
          >
            <span>{t('dashboard.tab_collection', 'تحصيل العملاء')}</span>
            {data.collection.topDebtsTotal > 0 && (
              <span className="decision-tab-badge badge-info">{data.collection.topDebtsTotal}</span>
            )}
          </button>
          <button
            type="button"
            className={`decision-tab-chip ${activeTab === 'payables' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('payables')}
          >
            <span>{t('dashboard.tab_payables', 'مستحقات الموردين')}</span>
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
            <MetricTile label={t('dashboard.out_of_stock_total', 'أصناف نفدت تماماً')} value={formatNumber(data.buying.outOfStockTotal, numLocale)} />
            <MetricTile label={t('dashboard.low_stock_total', 'أصناف وصلت للحد الأدنى')} value={formatNumber(data.buying.lowStockTotal, numLocale)} />
            <MetricTile label={t('dashboard.buying_priority_total', 'أصناف ذات أولوية شراء')} value={formatNumber(data.buying.priorityTotal, numLocale)} />
          </div>
          <ProductList rows={data.buying.priority} type="buying" />
        </div>
      )}

      {activeTab === 'stagnant' && (
        <div key="tab-stagnant" className="page-stack decision-grid-tab-content" style={{ gap: '12px' }}>
          <div className="manager-overview-mini-metrics">
            <MetricTile label={t('dashboard.stagnant_threshold', 'راكد (حد المتجر: {{days}} يوم)', { days: data.stagnant.thresholdDays || 30 })} value={formatNumber(data.stagnant.daysConfigured ?? data.stagnant.days30, numLocale)} />
            <MetricTile label={t('dashboard.stagnant_over_90d', 'راكد أكثر من 90 يوم')} value={formatNumber(data.stagnant.days90, numLocale)} />
            <MetricTile label={t('dashboard.stagnant_inventory_value', 'قيمة المخزون الراكد')} value={formatCurrency(data.stagnant.inventoryValue)} />
          </div>
          <ProductList rows={data.stagnant.items} type="stagnant" />
        </div>
      )}

      {activeTab === 'profit' && (
        <div key="tab-profit" className="page-stack decision-grid-tab-content" style={{ gap: '12px' }}>
          <div className="manager-overview-mini-metrics">
            <MetricTile label={t('dashboard.top_profit_achieved', 'أعلى ربح محقق')} value={data.profitSources.topProducts[0] ? formatCurrency(data.profitSources.topProducts[0].grossProfit) : t('dashboard.not_available', 'غير متاح')} />
            <MetricTile label={t('dashboard.top_margin_percent', 'هامش أعلى صنف')} value={data.profitSources.topProducts[0] ? formatPercent(data.profitSources.topProducts[0].marginPercent, numLocale) : t('dashboard.not_available', 'غير متاح')} />
            <MetricTile label={t('dashboard.weak_margin_items', 'أصناف بهامش ضعيف')} value={formatNumber(data.profitSources.weakMarginHighSales.length, numLocale)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            <div>
              <div className="muted small" style={{ marginBottom: '6px', fontWeight: 600 }}>{t('dashboard.top_profitable_products', 'أعلى الأصناف تحقيقاً للربح')}</div>
              <ProfitList rows={data.profitSources.topProducts} emptyLabel={t('dashboard.no_profit_items', 'لا توجد أرباح أصناف كافية الآن')} valueType="profit" />
            </div>
            <div>
              <div className="muted small" style={{ marginBottom: '6px', fontWeight: 600 }}>{t('dashboard.high_sales_weak_margin', 'مبيعات عالية بهامش ضعيف')}</div>
              <ProfitList rows={data.profitSources.weakMarginHighSales} emptyLabel={t('dashboard.no_weak_margin_items', 'لا توجد أصناف بهامش ضعيف تحتاج متابعة الآن')} valueType="margin" />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'collection' && (
        <div key="tab-collection" className="page-stack decision-grid-tab-content" style={{ gap: '12px' }}>
          <div className="manager-overview-mini-metrics">
            <MetricTile label={t('dashboard.top_debts_count', 'أعلى أرصدة مستحقة')} value={formatNumber(data.collection.topDebts.length, numLocale)} />
            <MetricTile label={t('dashboard.exceeded_credit_limit', 'عملاء تجاوزوا الحد')} value={formatNumber(data.collection.aboveCreditLimit.length, numLocale)} />
            <MetricTile label={t('dashboard.near_credit_limit', 'عملاء قاربوا الحد')} value={formatNumber(data.collection.nearCreditLimit.length, numLocale)} />
          </div>
          <CustomerList rows={data.collection.topDebts} />
        </div>
      )}

      {activeTab === 'payables' && (
        <div key="tab-payables" className="page-stack decision-grid-tab-content" style={{ gap: '12px' }}>
          <div className="manager-overview-mini-metrics">
            <MetricTile label={t('dashboard.total_supplier_debt', 'إجمالي ديون الموردين')} value={formatCurrency(totalSupplierDebt)} />
            <MetricTile label={t('dashboard.top_supplier_due', 'أعلى مورد مستحق')} value={topSuppliers[0] ? formatCurrency(topSuppliers[0].total) : formatCurrencyWithSymbol(0)} />
            <MetricTile label={t('dashboard.creditor_suppliers_count', 'عدد الموردين الدائنين')} value={formatNumber(topSuppliers.length, numLocale)} />
          </div>
          <SupplierList rows={topSuppliers} />
        </div>
      )}
    </section>
  );
}
