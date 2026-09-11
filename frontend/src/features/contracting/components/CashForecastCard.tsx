import { useState, useEffect } from 'react';
import { contractingApi } from '../api/contracting.api';
import { ContractingCashForecast, CashForecastBucket } from '../contracting.types';
import { AppIcons } from '@/shared/components/icons/AppIcons';

interface CashForecastCardProps {
  projectId?: string; // undefined = cross-project summary
}

export function CashForecastCard({ projectId }: CashForecastCardProps) {
  const [forecast, setForecast] = useState<ContractingCashForecast | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    contractingApi.getCashForecast(projectId)
      .then((d) => setForecast(d as ContractingCashForecast))
      .catch(() => {/* ignore */})
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ color: '#94a3b8', fontSize: 'var(--font-body)', textAlign: 'center' }}>جاري تحميل توقعات السيولة...</div>
      </div>
    );
  }

  if (!forecast) return null;

  const fmt = (n: number) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const PERIOD_LABELS: Record<string, string> = {
    '30_days': '30 يوماً',
    '60_days': '60 يوماً',
    '90_days': '90 يوماً',
  };

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }} dir="rtl">
      {/* Card Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b' }}>توقعات التدفق النقدي</div>
          <div style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', marginTop: '2px' }}>
            المركز النقدي الحالي: <strong style={{ color: '#0f172a' }}>{fmt(forecast.totalCurrentCashPosition)}</strong>
          </div>
        </div>
        <AppIcons.TrendingUp size={22} style={{ color: '#170e5e', opacity: 0.7 }} />
      </div>

      {/* Buckets Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
        {forecast.buckets.map((bucket: CashForecastBucket, idx: number) => {
          const isPositive = bucket.netCashFlow >= 0;
          return (
            <div
              key={bucket.period}
              style={{
                padding: '14px 18px',
                borderRight: idx < forecast.buckets.length - 1 ? '1px solid #f1f5f9' : 'none',
                borderBottom: 'none',
              }}
            >
              <div style={{ fontSize: 'var(--font-badge)', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {PERIOD_LABELS[bucket.period] || bucket.label}
              </div>
              {/* Inflows */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: 'var(--font-subtitle)', color: '#64748b' }}>واردات متوقعة</span>
                <span style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: '#15803d' }}>+{fmt(bucket.expectedInflows)}</span>
              </div>
              {/* Outflows */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: 'var(--font-subtitle)', color: '#64748b' }}>صادرات متوقعة</span>
                <span style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: '#b91c1c' }}>-{fmt(bucket.expectedOutflows)}</span>
              </div>
              {/* Net */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--font-subtitle)', fontWeight: 600, color: '#475569' }}>صافي</span>
                <span style={{
                  fontSize: 'var(--font-body)',
                  fontWeight: 800,
                  color: isPositive ? '#15803d' : '#b91c1c',
                  background: isPositive ? '#f0fdf4' : '#fef2f2',
                  padding: '2px 8px',
                  borderRadius: '6px',
                }}>
                  {isPositive ? '+' : ''}{fmt(bucket.netCashFlow)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upcoming Commitments Footer */}
      <div style={{ background: '#f8fafc', borderTop: '1px solid #f1f5f9', padding: '12px 20px' }}>
        <div style={{ fontSize: 'var(--font-badge)', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>الالتزامات القادمة</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {[
            { label: 'مستخلصات مقاولي الباطن', value: forecast.upcomingCommitmentsSummary.pendingSubcontractorIpcs },
            { label: 'فواتير موردين', value: forecast.upcomingCommitmentsSummary.pendingSupplierInvoices },
            { label: 'أجور عمالة', value: forecast.upcomingCommitmentsSummary.upcomingWages },
            { label: 'تجديد تراخيص', value: forecast.upcomingCommitmentsSummary.upcomingLicenseRenewals },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--font-subtitle)', color: '#64748b' }}>{item.label}:</span>
              <span style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: '#0f172a' }}>{fmt(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}