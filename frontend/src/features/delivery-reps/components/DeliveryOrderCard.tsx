import { Button } from '@/shared/ui/button';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { CheckIcon, ClockIcon, PrinterIcon } from '@/shared/components/icons/AppIcons';
import { DeliveryOrder } from '@/features/delivery-reps/api/delivery-reps.api';

interface DeliveryOrderCardProps {
  order: DeliveryOrder;
  handleCall: (phone: string) => void;
  handleWhatsApp: (phone: string, docNo: string) => void;
  handleOpenMap: (address: string) => void;
  handlePrintDeliveryReceipt: (order: DeliveryOrder) => void;
  handleOpenSettleModal: (order: DeliveryOrder) => void;
  isSettlePending: boolean;
  activeSettleOrderId?: number;
}

export function DeliveryOrderCard({
  order,
  handleCall,
  handleWhatsApp,
  handleOpenMap,
  handlePrintDeliveryReceipt,
  handleOpenSettleModal,
  isSettlePending,
  activeSettleOrderId,
}: DeliveryOrderCardProps) {
  const isSettled = Boolean(order.settledAt);

  return (
    <div
      key={order.id}
      style={{
        background: '#ffffff',
        border: `1px solid ${isSettled ? '#bbf7d0' : '#e2e8f0'}`,
        borderRadius: '12px',
        padding: '14px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {/* Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#170e5e', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
            #{order.docNo}
          </span>
          <span style={{ fontSize: '11px', color: '#94a3b8', marginInlineStart: '6px' }}>
            {new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <span
          style={{
            fontSize: '11px',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: '6px',
            background: isSettled ? '#dcfce7' : '#ffedd5',
            color: isSettled ? '#166534' : '#c2410c',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {isSettled ? (
            <>
              <CheckIcon size={12} color="#166534" />
              <span>تم التسليم والتحصيل</span>
            </>
          ) : (
            <>
              <ClockIcon size={12} color="#c2410c" />
              <span>قيد التوصيل</span>
            </>
          )}
        </span>
      </div>

      {/* Customer & Address */}
      <div>
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
          {order.customerName}
        </div>
        {order.deliveryStatus && (
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
            {order.deliveryStatus}
          </div>
        )}
      </div>

      {/* Amount to collect */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>المبلغ المطلوب تحصيله:</span>
        <span style={{ fontSize: '16px', fontWeight: 900, color: '#16a34a' }}>
          {Number(order.total).toLocaleString('ar-EG')} <CurrencySymbol />
        </span>
      </div>

      {/* Quick Actions Bar */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          type="button"
          onClick={() => handleCall(order.customerPhone || '')}
          style={{
            flex: 1,
            padding: '7px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          اتصال
        </button>

        <button
          type="button"
          onClick={() => handleWhatsApp(order.customerPhone || '', order.docNo)}
          style={{
            flex: 1,
            padding: '7px',
            borderRadius: '8px',
            border: '1px solid #86efac',
            background: '#f0fdf4',
            color: '#166534',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          واتساب
        </button>

        <button
          type="button"
          onClick={() => handleOpenMap(order.customerAddress || order.deliveryStatus || '')}
          style={{
            flex: 1,
            padding: '7px',
            borderRadius: '8px',
            border: '1px solid #bfdbfe',
            background: '#eff6ff',
            color: '#1d4ed8',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          الخريطة
        </button>

        <button
          type="button"
          onClick={() => handlePrintDeliveryReceipt(order)}
          style={{
            padding: '7px 10px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            color: '#334155',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <PrinterIcon size={13} color="#334155" />
          <span>إيصال</span>
        </button>
      </div>

      {/* Settle / Proof Info */}
      {isSettled ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
          {order.deliverySignature && (
            <span style={{ fontSize: '11px', background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <CheckIcon size={11} color="#3730a3" />
              <span>توقيع العميل معتمد</span>
            </span>
          )}
          {order.deliveryPhotoUrl && (
            <span style={{ fontSize: '11px', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <CheckIcon size={11} color="#92400e" />
              <span>صورة إثبات التسليم مرفقة</span>
            </span>
          )}
          {order.deliveryNotes && (
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              ملاحظة: {order.deliveryNotes}
            </span>
          )}
        </div>
      ) : (
        <Button
          variant="primary"
          disabled={isSettlePending}
          onClick={() => handleOpenSettleModal(order)}
          style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: 800, background: '#16a34a', border: 'none', borderRadius: '10px' }}
        >
          {isSettlePending && activeSettleOrderId === order.id
            ? 'جاري التأكيد...'
            : 'تسليم وتحصيل (توقيع وكاميرا أوفلاين)'}
        </Button>
      )}
    </div>
  );
}
