import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { customersApi } from '@/shared/api/customers.api';
import { toast } from '@/shared/components/system-alert';
import { AppIcons } from '@/shared/components/icons/AppIcons';
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
      toast.success('تم تحديث رصيد نقاط الولاء بنجاح.');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل تحديث النقاط');
    },
  });

  if (!customer) return null;

  const logs = data?.logs || [];
  const currentBalance = Number((customer as any).loyaltyPoints || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pointsChange <= 0) {
      toast.warning('يرجى تحديد عدد نقاط صحيح أكبر من صفر.');
      return;
    }
    adjustMutation.mutate();
  };

  return (
    <StandardDialog
      open={Boolean(customer)}
      onClose={onClose}
      title={`رصيد نقاط الولاء: ${customer.name}`}
      subtitle="إدارة وتعديل رصيد النقاط واستعراض سجل الحركات المكتسبة والمستبدلة"
      width="min(680px, 95vw)"
      minHeight="auto"
      footerActions={(
        <StandardDialogFooter
          onCancel={onClose}
          cancelText="إغلاق"
        />
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} dir="rtl">
        
        {/* Section 1: Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700 }}>إجمالي النقاط المكتسبة</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#15803d', marginTop: '3px' }}>
              +{logs.filter((l: any) => Number(l.points_change) > 0).reduce((s: number, l: any) => s + Number(l.points_change), 0).toLocaleString()}
            </div>
          </div>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 700 }}>إجمالي النقاط المستبدلة</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#b91c1c', marginTop: '3px' }}>
              {logs.filter((l: any) => l.action_type === 'redeem').reduce((s: number, l: any) => s + Math.abs(Number(l.points_change)), 0).toLocaleString()}
            </div>
          </div>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 700 }}>الرصيد الفعلي المتاح</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1d4ed8', marginTop: '3px' }}>
              {currentBalance.toLocaleString()} نقطة
            </div>
          </div>
        </div>

        {/* Section 2: Adjust Form */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.TrendingUp size={15} />
            <span>إضافة أو خصم نقاط يدوياً (Manual Points Adjustment)</span>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setIsDeduction(false)}
                style={{
                  height: '33px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  background: !isDeduction ? '#166534' : '#e2e8f0',
                  color: !isDeduction ? '#ffffff' : '#475569',
                  transition: 'background 0.15s',
                }}
              >
                + إضافة نقاط
              </button>
              <button
                type="button"
                onClick={() => setIsDeduction(true)}
                style={{
                  height: '33px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  background: isDeduction ? '#b91c1c' : '#e2e8f0',
                  color: isDeduction ? '#ffffff' : '#475569',
                  transition: 'background 0.15s',
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
              style={{
                width: '90px',
                height: '33px',
                padding: '0 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                textAlign: 'center',
                boxSizing: 'border-box',
              }}
            />

            <input
              type="text"
              placeholder="سبب العملية أو الملاحظة..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                flex: '1 1 180px',
                height: '33px',
                padding: '0 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                boxSizing: 'border-box',
              }}
            />

            <Button
              variant="primary"
              type="submit"
              disabled={adjustMutation.isPending}
              style={{
                height: '33px',
                background: isDeduction ? '#b91c1c' : '#166534',
                borderColor: isDeduction ? '#991b1b' : '#15803d',
                fontSize: '0.8125rem',
                fontWeight: 700,
                padding: '0 16px',
              }}
            >
              {adjustMutation.isPending ? 'جاري التنفيذ...' : 'تنفيذ العملية'}
            </Button>
          </form>
        </div>

        {/* Section 3: History Table */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
            <AppIcons.Clock size={14} />
            <span>سجل حركات ونقاط العميل (Transaction History)</span>
          </div>
          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.8125rem' }}>جاري التحميل...</div>
            ) : logs.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
                لا توجد حركات نقاط سابقة لهذا العميل.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '7px 12px' }}>التاريخ</th>
                    <th style={{ padding: '7px 12px' }}>نوع الحركة</th>
                    <th style={{ padding: '7px 12px' }}>عدد النقاط</th>
                    <th style={{ padding: '7px 12px' }}>الرصيد بعد</th>
                    <th style={{ padding: '7px 12px' }}>الملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any) => {
                    const actionBadge = (() => {
                      switch (log.action_type) {
                        case 'earn':
                          return <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>اكتساب مشتريات</span>;
                        case 'redeem':
                          return <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>استبدال بخصم</span>;
                        case 'return_clawback':
                          return <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>خصم لمرتجع</span>;
                        case 'return_refund':
                          return <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>رد نقاط مرتجع</span>;
                        default:
                          return <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>تعديل يدوي</span>;
                      }
                    })();

                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '7px 12px', color: '#64748b' }}>
                          {new Date(log.created_at).toLocaleDateString('ar-EG')}
                        </td>
                        <td style={{ padding: '7px 12px' }}>
                          {actionBadge}
                        </td>
                        <td style={{ padding: '7px 12px', fontWeight: 800, color: Number(log.points_change) > 0 ? '#166534' : '#b91c1c' }}>
                          {Number(log.points_change) > 0 ? `+${log.points_change}` : log.points_change}
                        </td>
                        <td style={{ padding: '7px 12px', fontWeight: 700, color: '#170e5e' }}>{log.balance_after}</td>
                        <td style={{ padding: '7px 12px', color: '#64748b' }}>{log.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </StandardDialog>
  );
}
