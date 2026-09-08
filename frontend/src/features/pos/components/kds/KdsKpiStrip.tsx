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
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>ورد للتو (جديد):</span>
        <span style={{ fontSize: '18px', fontWeight: 900, color: '#170e5e' }}>{stats.pendingCount}</span>
      </div>

      <div
        style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '10px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#92400e' }}>قيد التحضير والطهي:</span>
        <span style={{ fontSize: '18px', fontWeight: 900, color: '#b45309' }}>{stats.cookingCount}</span>
      </div>

      <div
        style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '10px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>جاهز للاستلام والتسليم:</span>
        <span style={{ fontSize: '18px', fontWeight: 900, color: '#15803d' }}>{stats.readyCount}</span>
      </div>

      <div
        style={{
          backgroundColor: stats.criticalCount > 0 ? '#fef2f2' : '#f8fafc',
          border: `1px solid ${stats.criticalCount > 0 ? '#fecaca' : '#e2e8f0'}`,
          borderRadius: '10px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: stats.criticalCount > 0 ? '#991b1b' : '#64748b',
          }}
        >
          متأخر (&gt;15د):
        </span>
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
