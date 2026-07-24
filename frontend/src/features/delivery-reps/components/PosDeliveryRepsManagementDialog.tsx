import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { formatCurrency, formatDate } from '@/lib/format';
import { deliveryRepsApi } from '../api/delivery-reps.api';
import { DialogShell } from '@/shared/components/dialog-shell';

interface PosDeliveryRepsManagementDialogProps {
  onClose: () => void;
}

export function PosDeliveryRepsManagementDialog({ onClose }: PosDeliveryRepsManagementDialogProps) {
  const [selectedRepId, setSelectedRepId] = useState<number | null>(null);
  const today = new Date().toISOString().split('T')[0];
  const [filterDateFrom, setFilterDateFrom] = useState(today);
  const [filterDateTo, setFilterDateTo] = useState(today);
  const [filterStatus, setFilterStatus] = useState('');
  
  const [expectedAmountInput, setExpectedAmountInput] = useState('');
  const [feedbackPopup, setFeedbackPopup] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const queryClient = useQueryClient();

  const repsQuery = useQuery({
    queryKey: ['delivery-reps'],
    queryFn: deliveryRepsApi.list,
  });

  const ordersQuery = useQuery({
    queryKey: ['delivery-rep-orders', selectedRepId, filterDateFrom, filterDateTo, filterStatus],
    queryFn: () => deliveryRepsApi.listOrders(selectedRepId!, {
      dateFrom: filterDateFrom,
      dateTo: filterDateTo,
      status: filterStatus
    }),
    enabled: !!selectedRepId,
  });

  const summaryQuery = useQuery({
    queryKey: ['delivery-rep-summary', selectedRepId],
    queryFn: () => deliveryRepsApi.getSummary(selectedRepId!),
    enabled: !!selectedRepId,
  });

  const settleOrderMutation = useMutation({
    mutationFn: (saleId: number) => deliveryRepsApi.settleOrder(saleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-rep-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-rep-summary'] });
    }
  });

  const settleAllMutation = useMutation({
    mutationFn: ({ repId, amount }: { repId: number, amount: number }) => deliveryRepsApi.settleAllOrders(repId, amount),
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

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '90vw', maxWidth: '1200px', height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>إدارة مناديب التوصيل</h2>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>&times;</button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* Sidebar: Reps List */}
          <div style={{ width: '280px', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#334155' }}>قائمة المناديب</h3>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {repsQuery.isLoading && <div style={{ padding: '16px', color: '#64748b' }}>جاري التحميل...</div>}
              {repsQuery.data?.map(rep => (
                <div 
                  key={rep.id} 
                  onClick={() => setSelectedRepId(rep.id)}
                  style={{
                    padding: '16px', 
                    cursor: 'pointer', 
                    borderBottom: '1px solid #e2e8f0',
                    background: selectedRepId === rep.id ? '#eff6ff' : 'white',
                    fontWeight: selectedRepId === rep.id ? 'bold' : 'normal',
                    color: selectedRepId === rep.id ? '#2563eb' : '#334155',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background 0.2s'
                  }}
                >
                  <span>{rep.name}</span>
                  {rep.is_active ? (
                    <span style={{ color: '#16a34a', fontSize: '12px', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>نشط</span>
                  ) : (
                    <span style={{ color: '#ef4444', fontSize: '12px', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>موقوف</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main Area: Orders & Settlement */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '24px', background: 'white' }}>
            {!selectedRepId ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#64748b' }}>
                اختر مندوب من القائمة لعرض طلباته وتسويتها
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <div>
                    <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>
                      {repsQuery.data?.find(r => r.id === selectedRepId)?.name}
                    </h3>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#475569' }}>
                      <div>إجمالي الطلبات: {summaryQuery.data?.totalOrders || 0}</div>
                      <div style={{ color: '#16a34a' }}>تم تحصيله: {formatCurrency(summaryQuery.data?.collectedAmount || 0)}</div>
                      <div style={{ color: '#dc2626', fontWeight: 'bold' }}>متبقي للتحصيل: {formatCurrency(summaryQuery.data?.pendingAmount || 0)}</div>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ marginBottom: '8px', fontSize: '14px' }}>تسوية سريعة لكل الطلبات المعلقة</h4>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="number" 
                        placeholder="المبلغ المستلم من المندوب"
                        value={expectedAmountInput}
                        onChange={(e) => setExpectedAmountInput(e.target.value)}
                        style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', width: '200px' }}
                      />
                      <Button 
                        variant="primary"
                        onClick={() => settleAllMutation.mutate({ repId: selectedRepId, amount: Number(expectedAmountInput) })}
                        disabled={!expectedAmountInput || settleAllMutation.isPending || !summaryQuery.data?.pendingAmount}
                      >
                        {settleAllMutation.isPending ? 'جاري التسوية...' : 'تسوية الكل'}
                      </Button>
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>يجب مطابقة المبلغ مع المتبقي للتحصيل</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                  <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                    <option value="">كل الحالات</option>
                    <option value="settled">تمت التسوية</option>
                    <option value="unsettled">معلق (لم يسدد)</option>
                  </select>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table className="table" style={{ width: '100%' }}>
                    <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ padding: '12px' }}>رقم الطلب</th>
                        <th style={{ padding: '12px' }}>التاريخ</th>
                        <th style={{ padding: '12px' }}>العميل</th>
                        <th style={{ padding: '12px' }}>حالة التحصيل</th>
                        <th style={{ padding: '12px' }}>الإجمالي</th>
                        <th style={{ padding: '12px' }}>التسوية</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersQuery.isLoading && <tr><td colSpan={6} style={{ padding: '12px', textAlign: 'center' }}>جاري التحميل...</td></tr>}
                      {ordersQuery.data?.length === 0 && <tr><td colSpan={6} style={{ padding: '12px', textAlign: 'center' }}>لا يوجد طلبات</td></tr>}
                      {ordersQuery.data?.map(order => {
                        const isSettled = order.deliveryStatus === 'settled';
                        return (
                          <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px' }}>{order.docNo}</td>
                            <td style={{ padding: '12px' }}>{formatDate(order.createdAt)}</td>
                            <td style={{ padding: '12px' }}>{order.customerName || 'عميل نقدي'}</td>
                            <td style={{ padding: '12px' }}>
                              {order.collectionStatus === 'cod' ? 'تحصيل من العميل' : 
                               order.collectionStatus === 'prepaid_by_rep' ? 'مسدد مقدماً' : 
                               order.collectionStatus === 'prepaid_online' ? 'مدفوع مسبقاً' : '-'}
                            </td>
                            <td style={{ padding: '12px', fontWeight: 'bold' }}>{formatCurrency(order.total)}</td>
                            <td style={{ padding: '12px' }}>
                              {isSettled ? (
                                <span style={{ color: '#16a34a', fontSize: '13px', fontWeight: 'bold' }}>
                                  تم السداد {order.settledAt ? `(${formatDate(order.settledAt)})` : ''}
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
                                  style={{ fontSize: '12px', padding: '4px 8px' }}
                                >
                                  {settleOrderMutation.isPending ? '...' : 'تم السداد'}
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
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
    </div>
  );
}
