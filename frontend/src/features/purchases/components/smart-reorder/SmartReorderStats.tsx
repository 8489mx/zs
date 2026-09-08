import { formatCurrency } from '@/lib/format';

interface SmartReorderStatsProps {
  summary?: {
    totalMonitoredProducts?: number;
    outOfStockCount?: number;
    criticalCount?: number;
    warningCount?: number;
    totalEstimatedProcurementCost?: number;
    suppliersCount?: number;
  };
}

export function SmartReorderStats({ summary }: SmartReorderStatsProps) {
  return (
    <div
      className="stats-grid compact-grid workspace-stats-grid"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}
    >
      <div className="stat-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
        <span style={{ fontSize: '13px', color: '#64748b' }}>إجمالي الأصناف المراقبة</span>
        <strong style={{ fontSize: '22px', color: '#1e293b' }}>{summary?.totalMonitoredProducts || 0}</strong>
      </div>
      <div className="stat-card" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px' }}>
        <span style={{ fontSize: '13px', color: '#b91c1c', fontWeight: 600 }}>أصناف نفدت تماماً</span>
        <strong style={{ fontSize: '22px', color: '#dc2626' }}>{summary?.outOfStockCount || 0}</strong>
      </div>
      <div className="stat-card" style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px' }}>
        <span style={{ fontSize: '13px', color: '#b45309', fontWeight: 600 }}>أصناف حرجة وشيكة</span>
        <strong style={{ fontSize: '22px', color: '#d97706' }}>{summary?.criticalCount || 0}</strong>
      </div>
      <div className="stat-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
        <span style={{ fontSize: '13px', color: '#64748b' }}>أصناف في مرحلة التحذير</span>
        <strong style={{ fontSize: '22px', color: '#475569' }}>{summary?.warningCount || 0}</strong>
      </div>
      <div className="stat-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
        <span style={{ fontSize: '13px', color: '#64748b' }}>إجمالي التكلفة التقديرية</span>
        <strong style={{ fontSize: '20px', color: '#170e5e' }}>{formatCurrency(summary?.totalEstimatedProcurementCost || 0)}</strong>
      </div>
      <div className="stat-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
        <span style={{ fontSize: '13px', color: '#64748b' }}>الموردين المستهدفين</span>
        <strong style={{ fontSize: '22px', color: '#1e293b' }}>{summary?.suppliersCount || 0}</strong>
      </div>
    </div>
  );
}
