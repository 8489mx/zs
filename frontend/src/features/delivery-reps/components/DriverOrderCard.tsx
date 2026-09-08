import React from 'react';
import { DeliveryOrder } from '../api/delivery-reps.api';
import {
  SmartphoneIcon,
  UserIcon,
  MapPinIcon,
  MessageSquareIcon,
  CheckIcon,
} from '@/shared/components/icons/AppIcons';

interface DriverOrderCardProps {
  order: DeliveryOrder;
  onCall: (phone?: string | null) => void;
  onWhatsApp: (phone?: string | null, docNo?: string) => void;
  onOpenMap: (address?: string | null) => void;
  onSettle: (order: DeliveryOrder) => void;
}

export const DriverOrderCard: React.FC<DriverOrderCardProps> = ({
  order,
  onCall,
  onWhatsApp,
  onOpenMap,
  onSettle,
}) => {
  const isSettled = Boolean(order.settledAt) || order.deliveryStatus === 'settled';

  return (
    <div
      style={{
        background: '#ffffff',
        border: isSettled ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '14px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {/* Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <strong style={{ fontSize: '14px', color: '#0f172a' }}>
              طلب #{order.docNo || order.id}
            </strong>
            {isSettled ? (
              <span style={{ fontSize: '10px', fontWeight: 800, background: '#dcfce7', color: '#16a34a', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <CheckIcon size={11} color="#16a34a" strokeWidth={2.5} />
                <span>تم التسليم</span>
              </span>
            ) : (
              <span style={{ fontSize: '10px', fontWeight: 800, background: '#ffedd5', color: '#ea580c', padding: '2px 6px', borderRadius: '4px' }}>
                قيد التوصيل
              </span>
            )}
          </div>
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <UserIcon size={13} color="#64748b" />
            <span>{order.customerName || 'عميل نقدي'}</span>
          </div>
          {order.customerPhone && (
            <div style={{ fontSize: '12px', color: '#64748b', direction: 'ltr', textAlign: 'right', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <SmartphoneIcon size={12} color="#64748b" />
              <span>{order.customerPhone}</span>
            </div>
          )}
          {order.customerAddress && (
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <MapPinIcon size={12} color="#64748b" />
              <span>{order.customerAddress}</span>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>المطلوب:</div>
          <div style={{ fontSize: '16px', fontWeight: 900, color: '#170e5e' }}>
            {Number(order.total || 0).toLocaleString('ar-EG')} ج.م
          </div>
        </div>
      </div>

      {/* Quick Communication Actions */}
      <div style={{ display: 'flex', gap: '6px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
        <button
          type="button"
          onClick={() => onCall(order.customerPhone)}
          disabled={!order.customerPhone}
          style={{
            flex: 1,
            padding: '6px',
            borderRadius: '7px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            fontSize: '11px',
            fontWeight: 700,
            color: '#0369a1',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          <SmartphoneIcon size={13} color="#0369a1" />
          <span>اتصال</span>
        </button>
        <button
          type="button"
          onClick={() => onWhatsApp(order.customerPhone, order.docNo)}
          disabled={!order.customerPhone}
          style={{
            flex: 1,
            padding: '6px',
            borderRadius: '7px',
            border: '1px solid #bbf7d0',
            background: '#f0fdf4',
            fontSize: '11px',
            fontWeight: 700,
            color: '#15803d',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          <MessageSquareIcon size={13} color="#15803d" />
          <span>واتساب</span>
        </button>
        <button
          type="button"
          onClick={() => onOpenMap(order.customerAddress)}
          disabled={!order.customerAddress}
          style={{
            flex: 1,
            padding: '6px',
            borderRadius: '7px',
            border: '1px solid #fed7aa',
            background: '#fff7ed',
            fontSize: '11px',
            fontWeight: 700,
            color: '#c2410c',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          <MapPinIcon size={13} color="#c2410c" />
          <span>الخريطة</span>
        </button>
      </div>

      {/* Settle Action Button */}
      {!isSettled && (
        <button
          type="button"
          onClick={() => onSettle(order)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            background: '#16a34a',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <span>تأكيد التسليم مع إثبات وتوقيع العميل</span>
        </button>
      )}

      {isSettled && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#16a34a', background: '#f0fdf4', padding: '6px 10px', borderRadius: '6px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CheckIcon size={12} color="#16a34a" strokeWidth={2.5} />
            <span>تم تسليمها وتحصيل {Number(order.total || 0).toLocaleString('ar-EG')} ج.م</span>
          </span>
          {order.deliverySignature && <span>موقّع</span>}
        </div>
      )}
    </div>
  );
};
