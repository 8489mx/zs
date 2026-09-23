import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { XIcon, UserIcon, PhoneIcon, MapPinIcon, TruckIcon } from '@/shared/components/icons/AppIcons';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { deliveryRepsApi, type DeliveryRep } from '@/shared/api/delivery-reps.api';
import { storefrontApi } from '../api/storefront.api';
import { OnlineOrderRecord } from '../types/storefront.types';
import { toast } from '@/shared/components/system-alert';
import { DialogShell } from '@/shared/components/dialog-shell';
import { CustomSelect } from '@/shared/ui/custom-select';

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
      toast.error(`تعذر تحويل الطلب: ${err?.message || 'خطأ غير متوقع'}`);
    },
  });

  if (!isOpen || !order) return null;

  const repOptions = [
    { value: '', label: '-- تلقائي (توصيل المتجر / أول مندوب متاح) --' },
    ...activeReps.map((r) => ({
      value: String(r.id),
      label: `${r.name}${r.phone ? ' (' + r.phone + ')' : ''}`,
    })),
  ];

  return (
    <DialogShell
      open={isOpen && Boolean(order)}
      onClose={onClose}
      width="min(500px, 95vw)"
      ariaLabel={`تحويل الطلب #${order.orderNumber}`}
    >
      <div style={{ padding: '20px 24px', direction: 'rtl' }}>
        {/* Header */}
        <div
          style={{
            paddingBottom: '14px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#170e5e' }}>
              تحويل الطلب #{order.orderNumber}
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              إصدار فاتورة مبيعات دليفري وتعيين مندوب التوصيل
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Customer Info Box */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginTop: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserIcon size={14} color="#64748b" />
              <span style={{ fontSize: '12px', color: '#64748b' }}>العميل:</span>
              <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>{order.customerName}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PhoneIcon size={13} color="#64748b" />
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#170e5e', direction: 'ltr' }}>{order.customerPhone}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
              <MapPinIcon size={14} color="#170e5e" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: '#64748b', flexShrink: 0 }}>عنوان التوصيل:</span>
              <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {order.customerAddress || 'استلام من الفرع'}
              </span>
            </div>
            {order.deliveryZoneName && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#170e5e',
                  background: '#f0f3ff',
                  border: '1px solid #d8e0fc',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {order.deliveryZoneName}
              </span>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px dashed #cbd5e1',
              paddingTop: '10px',
              marginTop: '2px',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>إجمالي الفاتورة المطلوب:</span>
            <span style={{ fontSize: '16px', fontWeight: 900, color: '#170e5e' }}>
              {Number(order.totalAmount).toLocaleString('ar-EG')} {getGlobalCurrencySymbol()}
            </span>
          </div>
        </div>

        {/* Delivery Rep Selection Box */}
        <div style={{ marginTop: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
            <TruckIcon size={14} color="#170e5e" />
            <span>مندوب التوصيل المسؤول عن الطلب:</span>
          </label>
          <CustomSelect
            value={selectedRepId ? String(selectedRepId) : ''}
            onChange={(val) => setSelectedRepId(val ? Number(val) : '')}
            options={repOptions}
            placeholder="اختر مندوب التوصيل..."
          />
          <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '6px', lineHeight: 1.4 }}>
            سيتم تسجيل عهدة تحصيل الفاتورة على المندوب المختار لمطابقتها في الوردية وتوريد النقدية.
          </span>
        </div>

        {/* Action Choice Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
          <button
            type="button"
            onClick={() => convertMutation.mutate()}
            disabled={convertMutation.isPending}
            style={{
              background: '#170e5e',
              color: '#ffffff',
              padding: '11px 16px',
              fontSize: '13.5px',
              fontWeight: 800,
              borderRadius: '9px',
              border: 'none',
              cursor: convertMutation.isPending ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 5px rgba(23,14,94,0.25)',
            }}
          >
            <span>{convertMutation.isPending ? 'جاري إصدار الفاتورة...' : 'إصدار فاتورة دليفري فورية'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onLoadToPos(order.id);
            }}
            style={{
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              color: '#334155',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: '9px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <span>تنزيل في سلة الكاشير (POS) للتعديل وإتمام البيع</span>
          </button>
        </div>
      </div>
    </DialogShell>
  );
}
