import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryRepsApi } from '@/shared/api/delivery-reps.api';
import { Button } from '@/shared/ui/button';
import { formatCurrency, formatDate } from '@/lib/format';
import { DialogShell } from '@/shared/components/dialog-shell';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';

function getLocalDateStr(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DeliveryRepOrders({ repId }: { repId: number | null }) {
  const queryClient = useQueryClient();
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('unsettled');
  const [expectedAmountInput, setExpectedAmountInput] = useState('');
  const [feedbackPopup, setFeedbackPopup] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [orderToSettle, setOrderToSettle] = useState<any | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ['delivery-rep-settlements'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-rep-kpis'] });
    }
  });

  const settleAllMutation = useMutation({
    mutationFn: ({ id, amount }: { id: number, amount: number }) => deliveryRepsApi.settleAllOrders(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-rep-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-rep-summary'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-rep-settlements'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-rep-kpis'] });
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#475569', background: '#ffffff', padding: '12px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>إجمالي الطلبات</span>
            <strong style={{ fontWeight: 800, color: '#0f172a', fontSize: '16px' }}>{summaryQuery.data?.totalOrders || 0}</strong>
          </div>
          <div style={{ width: '1px', background: '#e2e8f0' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>تم تحصيله</span>
            <strong style={{ fontWeight: 800, color: '#15803d', fontSize: '16px' }}>{formatCurrency(summaryQuery.data?.collectedAmount || 0)}</strong>
          </div>
          <div style={{ width: '1px', background: '#e2e8f0' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>متبقي للتحصيل (العهدة)</span>
            <strong style={{ fontWeight: 800, color: '#dc2626', fontSize: '17px' }}>{formatCurrency(summaryQuery.data?.pendingAmount || 0)}</strong>
          </div>
        </div>

        <div style={{ background: '#fef2f2', padding: '12px 16px', borderRadius: '10px', border: '1px solid #fecaca', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#991b1b' }}>تسوية سريعة لكل الطلبات المعلقة</h4>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
              type="number" 
              placeholder="المبلغ المستلم من المندوب"
              value={expectedAmountInput}
              onChange={(e) => setExpectedAmountInput(e.target.value)}
              style={{ padding: '6px 12px', border: '1px solid #fca5a5', borderRadius: '8px', width: '230px', minHeight: '36px', background: '#ffffff', fontSize: '13px' }}
            />
            <Button 
              variant="primary"
              onClick={() => settleAllMutation.mutate({ id: repId, amount: Number(expectedAmountInput) })}
              disabled={!expectedAmountInput || settleAllMutation.isPending || !summaryQuery.data?.pendingAmount}
              style={{ minHeight: '36px', padding: '0 16px', fontSize: '13px', fontWeight: 700 }}
            >
              {settleAllMutation.isPending ? 'جاري التسوية...' : 'تسوية الكل'}
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'row',
          flexWrap: 'nowrap',
          alignItems: 'center', 
          gap: '8px', 
          background: '#f8fafc', 
          padding: '8px 12px', 
          borderRadius: '8px', 
          border: '1px solid #e2e8f0',
          width: '100%',
          overflowX: 'auto',
        }}
      >
        <span style={{ fontWeight: 700, color: '#475569', fontSize: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}>
          فلترة الطلبات:
        </span>
        
        <input 
          type="date" 
          value={filterDateFrom} 
          onChange={(e) => setFilterDateFrom(e.target.value)} 
          style={{ width: '135px', minWidth: '125px', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '7px', fontSize: '12px', background: '#ffffff', minHeight: '34px', flexShrink: 0 }} 
        />

        <span style={{ color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}>إلى</span>

        <input 
          type="date" 
          value={filterDateTo} 
          onChange={(e) => setFilterDateTo(e.target.value)} 
          style={{ width: '135px', minWidth: '125px', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '7px', fontSize: '12px', background: '#ffffff', minHeight: '34px', flexShrink: 0 }} 
        />
        
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)} 
          style={{ width: '130px', minWidth: '110px', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '7px', fontSize: '12px', background: '#ffffff', minHeight: '34px', cursor: 'pointer', flexShrink: 0 }}
        >
          <option value="">كل الحالات</option>
          <option value="settled">تمت التسوية</option>
          <option value="unsettled">معلق (لم يسدد)</option>
        </select>

        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: '6px', flexShrink: 0 }}>
          <Button 
            variant="secondary" 
            onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setFilterStatus('unsettled'); }}
            style={{ 
              background: (!filterDateFrom && !filterDateTo && filterStatus === 'unsettled') ? '#1d4ed8' : '#eff6ff', 
              color: (!filterDateFrom && !filterDateTo && filterStatus === 'unsettled') ? '#ffffff' : '#1d4ed8', 
              borderColor: '#bfdbfe', 
              fontSize: '11px', 
              minHeight: '32px', 
              padding: '0 10px', 
              whiteSpace: 'nowrap',
              fontWeight: 700
            }}
          >
            الطلبات المعلقة
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => { const t = getLocalDateStr(); setFilterDateFrom(t); setFilterDateTo(t); setFilterStatus(''); }}
            style={{ 
              background: (filterDateFrom === getLocalDateStr() && filterDateTo === getLocalDateStr() && !filterStatus) ? '#0f172a' : '#f1f5f9', 
              color: (filterDateFrom === getLocalDateStr() && filterDateTo === getLocalDateStr() && !filterStatus) ? '#ffffff' : '#334155', 
              borderColor: '#cbd5e1', 
              fontSize: '11px', 
              minHeight: '32px', 
              padding: '0 10px', 
              whiteSpace: 'nowrap' 
            }}
          >
            طلبات اليوم
          </Button>
          {(filterDateFrom || filterDateTo || filterStatus) && (
            <Button 
              variant="secondary" 
              onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setFilterStatus(''); }} 
              style={{ fontSize: '11px', minHeight: '32px', padding: '0 10px', whiteSpace: 'nowrap' }}
            >
              عرض الكل (مسح الفلاتر)
            </Button>
          )}
        </div>
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
                          setOrderToSettle(order);
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

      <ActionConfirmDialog
        open={Boolean(orderToSettle)}
        title="تأكيد التحصيل"
        description={orderToSettle ? (
          <div>
            <p>هل أنت متأكد من تحصيل هذا المبلغ وإغلاق العهدة الخاصة بهذا الطلب؟</p>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginTop: '16px', border: '1px solid #e2e8f0', fontSize: '0.95rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>رقم الطلب:</span>
                <strong style={{ color: '#0f172a' }}>{orderToSettle.docNo}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>تاريخ الطلب:</span>
                <strong style={{ color: '#0f172a', direction: 'ltr' }}>{formatDate(orderToSettle.createdAt)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>اسم العميل:</span>
                <strong style={{ color: '#0f172a' }}>{orderToSettle.customerName || 'عميل نقدي'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
                <span style={{ color: '#64748b', alignSelf: 'center' }}>المبلغ المطلوب تحصيله:</span>
                <strong style={{ color: '#dc2626', fontSize: '1.2rem' }}>{formatCurrency(orderToSettle.total)}</strong>
              </div>
            </div>
          </div>
        ) : ''}
        confirmLabel="تأكيد السداد"
        isBusy={settleOrderMutation.isPending}
        onCancel={() => setOrderToSettle(null)}
        onConfirm={async () => {
          if (!orderToSettle) return;
          await settleOrderMutation.mutateAsync(orderToSettle.id);
          setOrderToSettle(null);
        }}
      />
    </div>
  );
}
