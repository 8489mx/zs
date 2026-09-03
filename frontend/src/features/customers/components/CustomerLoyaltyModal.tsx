import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { customersApi } from '@/shared/api/customers.api';
import type { Customer } from '@/types/domain';

interface CustomerLoyaltyModalProps {
  customer: Customer | null;
  onClose: () => void;
}

export function CustomerLoyaltyModal({ customer, onClose }: CustomerLoyaltyModalProps) {
  const queryClient = useQueryClient();
  const [pointsChange, setPointsChange] = useState<number>(50);
  const [isDeduction, setIsDeduction] = useState(false);
  const [notes, setNotes] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customer-loyalty-history', customer?.id],
    queryFn: () => (customer?.id ? customersApi.getLoyaltyHistory(customer.id) : Promise.resolve({ ok: true, logs: [] })),
    enabled: Boolean(customer?.id),
  });

  const adjustMutation = useMutation({
    mutationFn: () => {
      if (!customer?.id) return Promise.reject();
      const change = isDeduction ? -Math.abs(pointsChange) : Math.abs(pointsChange);
      return customersApi.adjustLoyaltyPoints(customer.id, change, notes.trim() || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-loyalty-history', customer?.id] });
      refetch();
      setNotes('');
      alert('تم تحديث رصيد نقاط الولاء بنجاح!');
    },
    onError: (err: any) => {
      alert(err.message || 'فشل تحديث النقاط');
    },
  });

  if (!customer) return null;

  const logs = data?.logs || [];
  const currentBalance = Number((customer as any).loyaltyPoints || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pointsChange <= 0) {
      alert('يرجى تحديد عدد نقاط صحيح');
      return;
    }
    adjustMutation.mutate();
  };

  return (
    <DialogShell open={Boolean(customer)} onClose={onClose} ariaLabel={`نقاط الولاء - ${customer.name}`} width="640px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 20px' }} dir="rtl">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
              ⭐ رصيد نقاط الولاء: {customer.name}
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
              إدارة وتعديل رصيد النقاط واستعراض سجل الحركات المكتسبة والمستبدلة.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: '18px', color: '#64748b', cursor: 'pointer', padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>

        {/* Current Balance Box */}
        <div style={{ background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: '10px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#9d174d' }}>الرصيد الحالي للنقاط</div>
            <div style={{ fontSize: '11.5px', color: '#be185d' }}>يمكن استبدال كل 100 نقطة بخصم مباشر في المبيعات</div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#be185d' }}>
            {currentBalance.toLocaleString('ar-EG')} نقطة
          </div>
        </div>

        {/* Adjust Form */}
        <form onSubmit={handleSubmit} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>إضافة أو خصم نقاط يدوياً:</div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setIsDeduction(false)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  background: !isDeduction ? '#166534' : '#e2e8f0',
                  color: !isDeduction ? '#ffffff' : '#475569',
                }}
              >
                + إضافة نقاط
              </button>
              <button
                type="button"
                onClick={() => setIsDeduction(true)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  background: isDeduction ? '#b91c1c' : '#e2e8f0',
                  color: isDeduction ? '#ffffff' : '#475569',
                }}
              >
                - خصم نقاط
              </button>
            </div>

            <input
              type="number"
              min="1"
              value={pointsChange}
              onChange={(e) => setPointsChange(Math.max(1, Number(e.target.value)))}
              style={{ width: '100px', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
            />

            <input
              type="text"
              placeholder="السبب أو الملاحظة (اختياري)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ flex: 1, padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
            />

            <Button variant="primary" type="submit" disabled={adjustMutation.isPending} style={{ background: isDeduction ? '#b91c1c' : '#166534' }}>
              {adjustMutation.isPending ? '...' : 'تنفيذ'}
            </Button>
          </div>
        </form>

        {/* History Table */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>سجل حركات النقاط:</div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', maxHeight: '200px', overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>جاري التحميل...</div>
            ) : logs.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12.5px' }}>
                لا توجد حركات نقاط سابقة لهذا العميل.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'right' }}>
                  <tr>
                    <th style={{ padding: '6px 10px' }}>التاريخ</th>
                    <th style={{ padding: '6px 10px' }}>النوع</th>
                    <th style={{ padding: '6px 10px' }}>الحركة</th>
                    <th style={{ padding: '6px 10px' }}>الرصيد بعد</th>
                    <th style={{ padding: '6px 10px' }}>الملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 10px', color: '#64748b' }}>
                        {new Date(log.created_at).toLocaleDateString('ar-EG')}
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        {log.action_type === 'earn' ? 'اكتساب' : log.action_type === 'redeem' ? 'استبدال' : 'تعديل يدوي'}
                      </td>
                      <td style={{ padding: '6px 10px', fontWeight: 800, color: Number(log.points_change) > 0 ? '#166534' : '#b91c1c' }}>
                        {Number(log.points_change) > 0 ? `+${log.points_change}` : log.points_change}
                      </td>
                      <td style={{ padding: '6px 10px', fontWeight: 700 }}>{log.balance_after}</td>
                      <td style={{ padding: '6px 10px', color: '#64748b' }}>{log.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Close Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
          <Button variant="secondary" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
