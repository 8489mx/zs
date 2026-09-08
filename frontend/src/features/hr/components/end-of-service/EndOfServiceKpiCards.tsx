import { formatCurrency } from '@/lib/format';

interface EndOfServiceKpiCardsProps {
  totalCount: number;
  pendingAccounting: number;
  totalGratuitySum: number;
  clearedCustodies: number;
}

export function EndOfServiceKpiCards({
  totalCount,
  pendingAccounting,
  totalGratuitySum,
  clearedCustodies,
}: EndOfServiceKpiCardsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>إجمالي المخالصات المسجلة</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>{totalCount}</div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>بانتظار الترحيل المحاسبي</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: pendingAccounting > 0 ? '#b45309' : '#15803d' }}>
          {pendingAccounting}
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>إجمالي مكافآت نهاية الخدمة</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#170e5e' }}>
          {formatCurrency(totalGratuitySum)}
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>إخلاء طرف وعهد معتمد</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#047857' }}>
          {clearedCustodies} / {totalCount}
        </div>
      </div>
    </div>
  );
}
