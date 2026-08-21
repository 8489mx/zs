import { useQuery } from '@tanstack/react-query';
import { deliveryRepsApi } from '../api/delivery-reps.api';
import { formatCurrency } from '@/lib/format';

function getDelayStatus(orderDateStr: string, settleDateStr: string) {
  if (!orderDateStr || !settleDateStr) return { text: '-', color: '#64748b' };
  const diffMs = new Date(settleDateStr).getTime() - new Date(orderDateStr).getTime();
  if (diffMs <= 0) return { text: 'بدون تأخير', color: '#16a34a' };
  
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return { text: `${diffMins} دقيقة`, color: '#16a34a' };
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return { text: `${diffHours} ساعة و ${diffMins % 60} دقيقة`, color: '#ea580c' };
  
  const diffDays = Math.floor(diffHours / 24);
  return { text: `${diffDays} يوم و ${diffHours % 24} ساعة`, color: '#dc2626' };
}

export function DeliveryRepSettlements({ repId }: { repId: number | null }) {
  const settlementsQuery = useQuery({
    queryKey: ['delivery-rep-settlements', repId],
    queryFn: () => deliveryRepsApi.listSettlements(repId!),
    enabled: !!repId,
  });

  if (!repId) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
        <table className="table" style={{ width: '100%', margin: 0, fontSize: '13px' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>الطلب</th>
              <th style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>تاريخ الطلب</th>
              <th style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>وقت التسوية</th>
              <th style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>مدة التأخير</th>
              <th style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>المبلغ</th>
              <th style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>مستلم المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {settlementsQuery.isLoading && <tr><td colSpan={6} style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>جاري التحميل...</td></tr>}
            {settlementsQuery.data?.length === 0 && <tr><td colSpan={6} style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>لا يوجد طلبات تمت تسويتها</td></tr>}
            {settlementsQuery.data?.map((settlement: any) => {
              const delay = getDelayStatus(settlement.orderDate, settlement.createdAt);
              return (
                <tr key={settlement.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 800, color: '#0f172a' }}>{settlement.docNo}</td>
                  <td style={{ padding: '10px 8px', direction: 'ltr', textAlign: 'right', whiteSpace: 'nowrap', color: '#64748b', fontSize: '12px' }}>{new Date(settlement.orderDate).toLocaleString('ar-EG')}</td>
                  <td style={{ padding: '10px 8px', direction: 'ltr', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600, color: '#334155' }}>{settlement.createdAt ? new Date(settlement.createdAt).toLocaleString('ar-EG') : '-'}</td>
                  <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                    <span 
                      style={{ 
                        color: delay.color, 
                        background: delay.color === '#16a34a' ? '#f0fdf4' : delay.color === '#ea580c' ? '#fff7ed' : '#fef2f2',
                        border: `1px solid ${delay.color === '#16a34a' ? '#bbf7d0' : delay.color === '#ea580c' ? '#fed7aa' : '#fecaca'}`,
                        padding: '2px 8px', 
                        borderRadius: '6px', 
                        fontSize: '11px',
                        fontWeight: 700 
                      }}
                    >
                      {delay.text}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', fontWeight: 800, color: '#15803d', whiteSpace: 'nowrap' }}>{formatCurrency(settlement.amount)}</td>
                  <td style={{ padding: '10px 8px', whiteSpace: 'nowrap', color: '#64748b' }}>{settlement.settledByName || 'غير معروف'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
