import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { deliveryRepsApi, type DeliveryRep } from '@/shared/api/delivery-reps.api';
import { storefrontApi } from '../api/storefront.api';
import { OnlineOrderRecord } from '../types/storefront.types';
import { Button } from '@/shared/ui/button';

interface ConvertDeliveryModalProps {
  order: OnlineOrderRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
  onLoadToPos: (orderId: number) => void;
}

export function ConvertDeliveryModal({
  order,
  isOpen,
  onClose,
  onSuccess,
  onLoadToPos,
}: ConvertDeliveryModalProps) {
  const [selectedRepId, setSelectedRepId] = useState<number | ''>('');

  const deliveryRepsQuery = useQuery({
    queryKey: ['delivery-reps'],
    queryFn: deliveryRepsApi.list,
    enabled: isOpen,
    staleTime: 60 * 1000,
  });

  const reps: DeliveryRep[] = (deliveryRepsQuery.data as any) || [];
  const activeReps = reps.filter((r) => (r as any).is_active !== false && (r as any).isActive !== false);

  const convertMutation = useMutation({
    mutationFn: async () => {
      if (!order) return;
      return storefrontApi.convertToSale(
        order.id,
        selectedRepId ? Number(selectedRepId) : undefined
      );
    },
    onSuccess: (data) => {
      if (data) {
        onSuccess(data);
        onClose();
      }
    },
    onError: (err: any) => {
      alert(`تعذر تحويل الطلب: ${err.message || 'خطأ غير متوقع'}`);
    },
  });

  if (!isOpen || !order) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        direction: 'rtl',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.3)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#170e5e' }}>
              تحويل الطلب #{order.orderNumber}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#e2e8f0',
              border: 'none',
              borderRadius: '8px',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              fontWeight: 700,
              color: '#475569',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Customer info card */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '13px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>{order.customerName}</span>
              <span style={{ color: '#475569', direction: 'ltr', fontWeight: 600 }}>{order.customerPhone}</span>
            </div>
            <div style={{ color: '#64748b' }}>
              {order.customerAddress || 'استلام من المتجر'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', marginTop: '4px' }}>
              <span style={{ color: '#64748b' }}>إجمالي الطلب:</span>
              <span style={{ fontWeight: 900, color: '#170e5e', fontSize: '14px' }}>
                {order.totalAmount} ج.م
              </span>
            </div>
          </div>

          {/* Delivery Rep Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              اختيار مندوب التوصيل:
            </label>
            <select
              value={selectedRepId}
              onChange={(e) => setSelectedRepId(e.target.value ? Number(e.target.value) : '')}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13.5px',
                background: '#ffffff',
                color: '#0f172a',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">-- تلقائي (توصيل المتجر / أول مندوب متاح) --</option>
              {activeReps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name} {rep.phone ? `(${rep.phone})` : ''}
                </option>
              ))}
            </select>
            <span style={{ display: 'block', fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
              سيتم تسجيل عهدة تحصيل الفاتورة على المندوب المختار لمتابعتها في الوردية.
            </span>
          </div>

          {/* Action Choice Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <Button
              type="button"
              onClick={() => convertMutation.mutate()}
              disabled={convertMutation.isPending}
              style={{
                background: '#170e5e',
                color: '#ffffff',
                padding: '12px',
                fontSize: '13.5px',
                fontWeight: 800,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span>{convertMutation.isPending ? 'جاري الإصدار...' : 'إصدار فاتورة دليفري فورية'}</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                onClose();
                onLoadToPos(order.id);
              }}
              style={{
                background: '#f1f5f9',
                border: '1.5px solid #cbd5e1',
                color: '#0f172a',
                padding: '11px',
                fontSize: '13.5px',
                fontWeight: 700,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span>تنزيل في سلة الكاشير (POS) للتعديل وإتمام البيع</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
