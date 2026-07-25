import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryRepsApi } from '../api/delivery-reps.api';
import { Button } from '@/shared/ui/button';
import { formatCurrency, formatDate } from '@/lib/format';
import { DialogShell } from '@/shared/components/dialog-shell';

export function DeliveryRepOrders({ repId }: { repId: number | null }) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [filterDateFrom, setFilterDateFrom] = useState(today);
  const [filterDateTo, setFilterDateTo] = useState(today);
  const [filterStatus, setFilterStatus] = useState('');
  const [expectedAmountInput, setExpectedAmountInput] = useState('');
  const [feedbackPopup, setFeedbackPopup] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const ordersQuery = useQuery({
    queryKey: ['delivery-rep-orders', repId, filterDateFrom, filterDateTo, filterStatus],
    queryFn: () => deliveryRepsApi.listOrders(repId!, {
      dateFrom: filterDateFrom,
      dateTo: filterDateTo,
      status: filterStatus
    }),
    enabled: !!repId,
  });

  const summaryQuery = useQuery({
    queryKey: ['delivery-rep-summary', repId],
    queryFn: () => deliveryRepsApi.getSummary(repId!),
    enabled: !!repId,
  });

  const settleOrderMutation = useMutation({
    mutationFn: (saleId: number) => deliveryRepsApi.settleOrder(saleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-rep-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-rep-summary'] });
    }
  });

  const settleAllMutation = useMutation({
    mutationFn: ({ id, amount }: { id: number, amount: number }) => deliveryRepsApi.settleAllOrders(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-rep-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-rep-summary'] });
      setExpectedAmountInput('');
      setFeedbackPopup({ message: 'تمت التسوية بنجاح', type: 'success' });
    },
    onError: (error: any) => {
      setFeedbackPopup({ message: error.message || 'حدث خطأ أثناء التسوية', type: 'error' });
    }
  });

  if (!repId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', padding: '40px' }}>
        اختر مندوب من القائمة لعرض طلباته وتسويتها
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header and Bulk Settlement */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', fontSize: '15px', color: '#475569', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>إجمالي الطلبات</span>
            <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{summaryQuery.data?.totalOrders || 0}</span>
          </div>
          <div style={{ width: '1px', background: '#cbd5e1' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>تم تحصيله</span>
            <span style={{ fontWeight: 'bold', color: '#16a34a' }}>{formatCurrency(summaryQuery.data?.collectedAmount || 0)}</span>
          </div>
          <div style={{ width: '1px', background: '#cbd5e1' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>متبقي للتحصيل</span>
            <span style={{ fontWeight: 'bold', color: '#dc2626', fontSize: '18px' }}>{formatCurrency(summaryQuery.data?.pendingAmount || 0)}</span>
          </div>
        </div>

        <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '8px', border: '1px solid #fca5a5' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#991b1b' }}>تسوية سريعة لكل الطلبات المعلقة</h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="number" 
              placeholder="المبلغ المستلم من المندوب"
              value={expectedAmountInput}
              onChange={(e) => setExpectedAmountInput(e.target.value)}
              style={{ padding: '6px 12px', border: '1px solid #fca5a5', borderRadius: '4px', width: '200px' }}
            />
            <Button 
              variant="primary"
              onClick={() => settleAllMutation.mutate({ id: repId, amount: Number(expectedAmountInput) })}
              disabled={!expectedAmountInput || settleAllMutation.isPending || !summaryQuery.data?.pendingAmount}
            >
              {settleAllMutation.isPending ? 'جاري التسوية...' : 'تسوية الكل'}
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ fontWeight: 'bold', color: '#64748b', fontSize: '14px' }}>فلترة الطلبات:</div>
        <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="purchase-prototype-field-input" style={{ width: 'auto' }} />
        <span style={{ color: '#64748b' }}>إلى</span>
        <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="purchase-prototype-field-input" style={{ width: 'auto' }} />
        
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="purchase-prototype-field-input" style={{ width: 'auto' }}>
          <option value="">كل الحالات</option>
          <option value="settled">تمت التسوية</option>
          <option value="unsettled">معلق (لم يسدد)</option>
        </select>

        {(filterDateFrom || filterDateTo || filterStatus) && (
          <Button variant="secondary" onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setFilterStatus(''); }}>
            مسح الفلاتر
          </Button>
        )}
      </div>

      {/* Orders Table */}
      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
        <table className="table" style={{ width: '100%', margin: 0, fontSize: '13px' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>رقم الطلب</th>
              <th style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>التاريخ</th>
              <th style={{ padding: '8px 4px' }}>العميل</th>
              <th style={{ padding: '8px 4px' }}>حالة التحصيل</th>
              <th style={{ padding: '8px 4px' }}>الإجمالي</th>
              <th style={{ padding: '8px 4px' }}>مستلم المبلغ</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>إجراء التسوية</th>
            </tr>
          </thead>
          <tbody>
            {ordersQuery.isLoading && <tr><td colSpan={7} style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>جاري التحميل...</td></tr>}
            {ordersQuery.data?.length === 0 && <tr><td colSpan={7} style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>لا يوجد طلبات مطابقة</td></tr>}
            {ordersQuery.data?.map(order => {
              const isSettled = order.deliveryStatus === 'settled';
              return (
                <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>{order.docNo}</td>
                  <td style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>{formatDate(order.createdAt)}</td>
                  <td style={{ padding: '8px 4px' }}>{order.customerName || 'عميل نقدي'}</td>
                  <td style={{ padding: '8px 4px' }}>
                    {order.collectionStatus === 'cod' ? 'تحصيل من العميل' : 
                     order.collectionStatus === 'prepaid_by_rep' ? 'خالص من المندوب' : 
                     order.collectionStatus === 'prepaid_online' ? 'خالص أونلاين' : '-'}
                  </td>
                  <td style={{ padding: '8px 4px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{formatCurrency(order.total)}</td>
                  <td style={{ padding: '8px 4px', color: '#64748b', fontSize: '12px' }}>
                    {isSettled ? order.settledByName || 'غير معروف' : '-'}
                  </td>
                  <td style={{ padding: '8px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {isSettled ? (
                      <span style={{ color: '#16a34a', fontSize: '13px', fontWeight: 'bold', background: '#dcfce7', padding: '4px 8px', borderRadius: '4px' }}>
                        تم السداد
                      </span>
                    ) : order.collectionStatus !== 'cod' ? (
                      <span style={{ color: '#64748b', fontSize: '13px' }}>
                        مدفوع مسبقاً
                      </span>
                    ) : (
                      <Button 
                        variant="secondary" 
                        onClick={() => {
                          if (window.confirm(`هل أنت متأكد من تحصيل مبلغ ${formatCurrency(order.total)} للطلب رقم ${order.docNo} من المندوب؟`)) {
                            settleOrderMutation.mutate(order.id);
                          }
                        }}
                        disabled={settleOrderMutation.isPending}
                        style={{ fontSize: '12px', padding: '4px 12px' }}
                      >
                        {settleOrderMutation.isPending ? '...' : 'تأكيد السداد'}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {feedbackPopup && (
        <DialogShell 
          open={true}
          onClose={() => setFeedbackPopup(null)} 
          width="400px"
        >
          <div style={{ padding: '24px', textAlign: 'center', fontSize: '16px', color: feedbackPopup.type === 'error' ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>
            {feedbackPopup.message}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '24px' }}>
            <Button variant="primary" onClick={() => setFeedbackPopup(null)}>موافق</Button>
          </div>
        </DialogShell>
      )}
    </div>
  );
}
