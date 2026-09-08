import {
  ClockIcon,
  CheckCircleIcon,
  PackageIcon,
  CreditCardIcon,
} from '@/shared/components/icons/AppIcons';

interface MaintenanceTicketsKpiCardsProps {
  inProgressCount: number;
  readyCount: number;
  deliveredCount: number;
  totalRemainingSum: number;
}

export function MaintenanceTicketsKpiCards({
  inProgressCount,
  readyCount,
  deliveredCount,
  totalRemainingSum,
}: MaintenanceTicketsKpiCardsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '14px' }}>
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>أجهزة قيد العمل والفحص</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{inProgressCount}</div>
        </div>
        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          <ClockIcon size={20} />
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>أجهزة جاهزة للتسليم</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{readyCount}</div>
        </div>
        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          <CheckCircleIcon size={20} />
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>تم تسليمها للعملاء</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{deliveredCount}</div>
        </div>
        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          <PackageIcon size={20} />
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>مبالغ متبقية للتحصيل</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {totalRemainingSum.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>ج.م</span>
          </div>
        </div>
        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          <CreditCardIcon size={20} />
        </div>
      </div>
    </div>
  );
}
