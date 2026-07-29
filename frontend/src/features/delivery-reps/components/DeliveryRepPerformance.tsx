import { useQuery } from '@tanstack/react-query';
import { deliveryRepsApi } from '../api/delivery-reps.api';

export function DeliveryRepPerformance({ repId }: { repId: number | null }) {
  const kpiQuery = useQuery({
    queryKey: ['delivery-rep-kpis', repId],
    queryFn: () => deliveryRepsApi.getKPIs(repId!),
    enabled: !!repId,
  });

  if (!repId) return null;

  if (kpiQuery.isLoading) {
    return <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>جاري تحميل لوحة الأداء...</div>;
  }

  const kpis = kpiQuery.data;
  if (!kpis) return null;

  const renderStars = (rating: number) => {
    if (kpis.successfulOrders === 0 && kpis.returnedOrders === 0) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', height: '36px' }}>
          <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#94a3b8', background: '#f1f5f9', padding: '4px 12px', borderRadius: '16px' }}>لم يُقيّم بعد</span>
        </div>
      );
    }

    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {[...Array(fullStars)].map((_, i) => <span key={`f-${i}`} style={{ color: '#eab308', fontSize: '24px' }}>★</span>)}
        {hasHalfStar && (
          <span style={{ 
            fontSize: '24px', 
            background: 'linear-gradient(to left, #eab308 50%, #cbd5e1 50%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            display: 'inline-block'
          }}>
            ★
          </span>
        )}
        {[...Array(emptyStars)].map((_, i) => <span key={`e-${i}`} style={{ color: '#cbd5e1', fontSize: '24px' }}>★</span>)}
        <span style={{ marginLeft: '8px', fontWeight: 'bold', fontSize: '18px', color: '#334155' }}>{rating}/5</span>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <h3 style={{ margin: 0, color: '#475569', fontSize: '16px' }}>التقييم العام للمندوب</h3>
        {renderStars(kpis.rating)}
        <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
          يتم حساب التقييم بناءً على سرعة التوريد المالي ومعدلات المرتجعات.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ padding: '16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ color: '#64748b', fontSize: '14px' }}>إجمالي الطلبات المسندة</span>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{kpis.totalOrders}</span>
        </div>
        
        <div style={{ padding: '16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ color: '#64748b', fontSize: '14px' }}>معدل التوصيل الناجح</span>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: kpis.successRate >= 90 ? '#16a34a' : kpis.successRate >= 75 ? '#eab308' : '#dc2626' }}>
            {kpis.successRate}%
          </span>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>{kpis.successfulOrders} طلب ناجح</span>
        </div>

        <div style={{ padding: '16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ color: '#64748b', fontSize: '14px' }}>معدل المرتجعات</span>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: kpis.returnedOrders === 0 ? '#16a34a' : '#dc2626' }}>
            {kpis.returnedOrders} طلب
          </span>
        </div>

        <div style={{ padding: '16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ color: '#64748b', fontSize: '14px' }}>متوسط تأخير التوريد</span>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: kpis.averageDelayHours < 1 ? '#16a34a' : kpis.averageDelayHours < 24 ? '#ea580c' : '#dc2626' }}>
            {kpis.averageDelayHours} ساعة
          </span>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>لكل طلب يتم توصيله</span>
        </div>
      </div>
    </div>
  );
}
