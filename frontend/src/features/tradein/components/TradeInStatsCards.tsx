import { TradeInIcons } from './TradeInIcons';

interface TradeInStatsCardsProps {
  totalItems: number;
  tradeInExchangeCount: number;
  autoInventoryCount: number;
  totalPurchaseSpend: number;
}

export function TradeInStatsCards({
  totalItems,
  tradeInExchangeCount,
  autoInventoryCount,
  totalPurchaseSpend,
}: TradeInStatsCardsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TradeInIcons.Device />
        </div>
        <div>
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>إجمالي الأجهزة المشتراة</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{totalItems} جهاز</div>
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TradeInIcons.Exchange />
        </div>
        <div>
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>عمليات الاستبدال Trade-In</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{tradeInExchangeCount} عملية</div>
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TradeInIcons.Box />
        </div>
        <div>
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>أدرجت بالمخزن تلقائياً</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669' }}>{autoInventoryCount} صنف</div>
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TradeInIcons.Coins />
        </div>
        <div>
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>إجمالي مبالغ الشراء</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{totalPurchaseSpend.toLocaleString('ar-EG')} ج.م</div>
        </div>
      </div>
    </div>
  );
}
