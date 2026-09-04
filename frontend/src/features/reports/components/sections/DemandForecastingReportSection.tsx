import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, DemandForecastingItem } from '@/features/reports/api/reports.api';
import { Button } from '@/shared/ui/button';

export function DemandForecastingReportSection() {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'out_of_stock'>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reports', 'demand-forecasting'],
    queryFn: () => reportsApi.demandForecasting(),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
        جاري تحليل معدلات الاستهلاك والتنبؤ بطلبات المخزون...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#dc2626' }}>
        تعذر تحميل تقرير التنبؤ بالطلب. <Button variant="secondary" onClick={() => refetch()}>إعادة المحاولة</Button>
      </div>
    );
  }

  const { summary, items } = data;

  const filteredItems = items.filter((item: DemandForecastingItem) => {
    if (filter === 'critical' && item.urgency !== 'critical') return false;
    if (filter === 'warning' && item.urgency !== 'warning') return false;
    if (filter === 'out_of_stock' && item.urgency !== 'out_of_stock') return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.barcode.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getUrgencyBadge = (urgency: DemandForecastingItem['urgency'], runwayDays: number) => {
    switch (urgency) {
      case 'out_of_stock':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, background: '#fee2e2', color: '#991b1b' }}>
            نفد تماماً (0 متبقي)
          </span>
        );
      case 'critical':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, background: '#fee2e2', color: '#b91c1c' }}>
            حرج ({runwayDays} يوم ويكمل)
          </span>
        );
      case 'warning':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, background: '#fef3c7', color: '#92400e' }}>
            تنبيه ({runwayDays} يوم)
          </span>
        );
      case 'healthy':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, background: '#dcfce7', color: '#166534' }}>
            مستقر ({runwayDays} يوم)
          </span>
        );
      case 'overstocked':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, background: '#e0f2fe', color: '#0369a1' }}>
            فائض (+{runwayDays} يوم)
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* 1. Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
      }}>
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>إجمالي الأصناف المراقبة</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
            {summary.totalMonitoredProducts}
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#991b1b', fontWeight: 600 }}>نافد من المخزن (Out of Stock)</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#991b1b', marginTop: '4px' }}>
            {summary.outOfStockCount}
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>أصناف حرجة (خلال 7 أيام)</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#dc2626', marginTop: '4px' }}>
            {summary.criticalCount}
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#b45309', fontWeight: 600 }}>تنبيه إعادة طلب (خلال 15 يوم)</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#b45309', marginTop: '4px' }}>
            {summary.warningCount}
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>مخزون صحي ومستقر</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#166534', marginTop: '4px' }}>
            {summary.healthyCount}
          </div>
        </div>
      </div>

      {/* 2. Controls and Filters */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: '#ffffff',
        padding: '14px 18px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setFilter('all')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '12.5px',
              background: filter === 'all' ? '#170e5e' : '#f1f5f9',
              color: filter === 'all' ? '#ffffff' : '#334155',
            }}
          >
            جميع الأصناف
          </button>
          <button
            type="button"
            onClick={() => setFilter('critical')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '12.5px',
              background: filter === 'critical' ? '#dc2626' : '#f1f5f9',
              color: filter === 'critical' ? '#ffffff' : '#334155',
            }}
          >
            أصناف حرجة ({summary.criticalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('out_of_stock')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '12.5px',
              background: filter === 'out_of_stock' ? '#991b1b' : '#f1f5f9',
              color: filter === 'out_of_stock' ? '#ffffff' : '#334155',
            }}
          >
            نافدة ({summary.outOfStockCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('warning')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '12.5px',
              background: filter === 'warning' ? '#b45309' : '#f1f5f9',
              color: filter === 'warning' ? '#ffffff' : '#334155',
            }}
          >
            تنبيه طلب ({summary.warningCount})
          </button>
        </div>

        <div>
          <input
            type="text"
            placeholder="بحث بالصنف أو الباركود..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              width: '220px',
            }}
          />
        </div>
      </div>

      {/* 3. Products Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
            قائمة التنبؤ بمخزون الأصناف المقترحة لإعادة الطلب ({filteredItems.length})
          </h4>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 16px' }}>الصنف</th>
                <th style={{ padding: '12px 16px' }}>الباركود</th>
                <th style={{ padding: '12px 16px' }}>المخزون الحالي</th>
                <th style={{ padding: '12px 16px' }}>مبيعات آخر 30 يوم</th>
                <th style={{ padding: '12px 16px' }}>المعدل اليومي</th>
                <th style={{ padding: '12px 16px' }}>الحالة والأيام المتبقية</th>
                <th style={{ padding: '12px 16px', color: '#0284c7' }}>الكمية المقترحة للشراء</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    لا توجد أصناف مطابقة.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item: DemandForecastingItem) => (
                  <tr key={item.productId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                      {item.name}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {item.barcode || item.sku || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: item.stock <= 0 ? '#dc2626' : '#0f172a' }}>
                      {item.stock}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>
                      {item.soldLast30Days}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {item.dailyBurnRate} / يوم
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {getUrgencyBadge(item.urgency, item.runwayDays)}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: item.suggestedReorderQty > 0 ? '#0284c7' : '#64748b' }}>
                      {item.suggestedReorderQty > 0 ? `+${item.suggestedReorderQty} وحدة` : 'كافٍ حالياً'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
