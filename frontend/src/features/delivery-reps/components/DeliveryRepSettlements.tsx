import { useQuery } from '@tanstack/react-query';
import { deliveryRepsApi } from '../api/delivery-reps.api';
import { formatCurrency } from '@/lib/format';

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
        <table className="table" style={{ width: '100%', margin: 0 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '12px' }}>التاريخ والوقت</th>
              <th style={{ padding: '12px' }}>المبلغ المورد</th>
              <th style={{ padding: '12px' }}>مستلم المبلغ</th>
              <th style={{ padding: '12px' }}>البيان</th>
            </tr>
          </thead>
          <tbody>
            {settlementsQuery.isLoading && <tr><td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>جاري التحميل...</td></tr>}
            {settlementsQuery.data?.length === 0 && <tr><td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>لا يوجد توريدات سابقة</td></tr>}
            {settlementsQuery.data?.map((settlement: any) => (
              <tr key={settlement.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px', direction: 'ltr', textAlign: 'right' }}>{new Date(settlement.createdAt).toLocaleString('ar-EG')}</td>
                <td style={{ padding: '12px', fontWeight: 'bold', color: '#16a34a' }}>{formatCurrency(settlement.amount)}</td>
                <td style={{ padding: '12px' }}>{settlement.settledByName || 'غير معروف'}</td>
                <td style={{ padding: '12px', color: '#64748b', fontSize: '13px' }}>{settlement.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
