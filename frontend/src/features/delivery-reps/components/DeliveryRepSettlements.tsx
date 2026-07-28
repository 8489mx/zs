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
                  <td style={{ padding: '8px 4px', fontWeight: 'bold' }}>{settlement.docNo}</td>
                  <td style={{ padding: '8px 4px', direction: 'ltr', textAlign: 'right', whiteSpace: 'nowrap', color: '#64748b', fontSize: '12px' }}>{new Date(settlement.orderDate).toLocaleString('ar-EG')}</td>
                  <td style={{ padding: '8px 4px', direction: 'ltr', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 'bold' }}>{settlement.createdAt ? new Date(settlement.createdAt).toLocaleString('ar-EG') : '-'}</td>
                  <td style={{ padding: '8px 4px', whiteSpace: 'nowrap', color: delay.color, fontWeight: 'bold' }}>{delay.text}</td>
                  <td style={{ padding: '8px 4px', fontWeight: 'bold', color: '#16a34a', whiteSpace: 'nowrap' }}>{formatCurrency(settlement.amount)}</td>
                  <td style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>{settlement.settledByName || 'غير معروف'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
