import { useTranslation } from 'react-i18next';
import React from 'react';

interface KdsKpiStripProps {
  stats: {
    pendingCount: number;
    cookingCount: number;
    readyCount: number;
    criticalCount: number;
  };
}

export const KdsKpiStrip: React.FC<KdsKpiStripProps> = ({ stats }) => {
  const { t } = useTranslation();
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '10px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#170e5e', display: 'inline-block' }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>{t('pos.kds.kds_kpi_strip.s0', "ورد للتو (جديد):")}</span>
        </div>
        <span style={{ fontSize: '18px', fontWeight: 900, color: '#170e5e' }}>{stats.pendingCount}</span>
      </div>

      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>{t('pos.kds.kds_kpi_strip.s1', "قيد التحضير والطهي:")}</span>
        </div>
        <span style={{ fontSize: '18px', fontWeight: 900, color: '#b45309' }}>{stats.cookingCount}</span>
      </div>

      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>{t('pos.kds.kds_kpi_strip.s2', "جاهز للاستلام والتسليم:")}</span>
        </div>
        <span style={{ fontSize: '18px', fontWeight: 900, color: '#15803d' }}>{stats.readyCount}</span>
      </div>

      <div
        style={{
          backgroundColor: stats.criticalCount > 0 ? '#fef2f2' : '#ffffff',
          border: `1px solid ${stats.criticalCount > 0 ? '#fecaca' : '#e2e8f0'}`,
          borderRadius: '10px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: stats.criticalCount > 0 ? '#ef4444' : '#94a3b8', display: 'inline-block' }} />
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: stats.criticalCount > 0 ? '#991b1b' : '#64748b',
            }}
          >
            {t('pos.kds.kds_kpi_strip.s3', "متأخر (>15د):")}
          </span>
        </div>
        <span
          style={{
            fontSize: '18px',
            fontWeight: 900,
            color: stats.criticalCount > 0 ? '#dc2626' : '#64748b',
          }}
        >
          {stats.criticalCount}
        </span>
      </div>
    </div>
  );
};
