import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { DialogShell } from '@/shared/components/dialog-shell';
import type { OnlineOrderRecord } from '../types/storefront.types';
import {
  PackageIcon,
  TruckIcon,
  CheckIcon,
  XIcon,
  MapPinIcon,
  AlertTriangleIcon,
} from '@/shared/components/icons/AppIcons';

interface MerchantOrderDetailModalProps {
  order: OnlineOrderRecord | null;
  onClose: () => void;
  onUpdateStatus: (id: number, status: string) => void;
  isUpdatingStatus: boolean;
  onConvertToDelivery: (order: OnlineOrderRecord) => void;
  onShipBosta: (order: OnlineOrderRecord) => void;
  onShipGcc: (order: OnlineOrderRecord) => void;
  onLoadToPos: (orderId: number) => void;
  loadingPosOrderId: number | null;
}

export function MerchantOrderDetailModal({
  order,
  onClose,
  onUpdateStatus,
  isUpdatingStatus,
  onConvertToDelivery,
  onShipBosta,
  onShipGcc,
  onLoadToPos,
  loadingPosOrderId,
}: MerchantOrderDetailModalProps) {
  if (!order) return null;

  return (
    <DialogShell
      open={Boolean(order)}
      onClose={onClose}
      width="min(560px, 95%)"
      ariaLabel={`تفاصيل الطلب رقم #${order.orderNumber}`}
    >
      <div style={{ padding: '20px 24px', direction: 'rtl' }}>
        {/* Header */}
        <div
          style={{
            paddingBottom: '16px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#170e5e' }}>
              طلب رقم #{order.orderNumber}
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {new Date(order.createdAt).toLocaleString('ar-EG')}
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

        {/* Body */}
        <div style={{ padding: '16px 0', maxHeight: '60vh', overflowY: 'auto' }}>
          {/* Customer Info Card */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>اسم العميل:</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                {order.customerName}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>رقم الهاتف:</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', direction: 'ltr' }}>
                {order.customerPhone}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>عنوان التوصيل:</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                {order.customerAddress || 'غير محدد'}
              </span>
            </div>
            {order.deliveryZoneName && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>منطقة التوصيل:</span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: '#f0f3ff',
                    color: '#170e5e',
                    border: '1px solid #d8e0fc',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <MapPinIcon size={12} color="#170e5e" />
                  <span>{order.deliveryZoneName}</span>
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>طريقة الدفع:</span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: order.paymentMethod === 'instapay_wallet' ? '#ede9fe' : '#f1f5f9',
                  color: order.paymentMethod === 'instapay_wallet' ? '#6d28d9' : '#0f172a',
                }}
              >
                {order.paymentMethod === 'instapay_wallet' ? 'إنستاباي / محفظة (تحويل مسبق)' : 'دفع عند الاستلام (كاش)'}
              </span>
            </div>
            {order.customerNotes && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 12px', marginTop: '2px' }}>
                <span style={{ fontSize: '12px', color: '#92400e', fontWeight: 800 }}>ملاحظات العميل وتجهيز الأصناف:</span>
                <span style={{ fontSize: '12.5px', color: '#b45309', fontWeight: 600, whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                  {order.customerNotes}
                </span>
              </div>
            )}

            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '11.5px',
                color: '#166534',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '4px',
              }}
            >
              <span>أوتوميشن فوري: عند التحويل يتم تسجيل هذا العميل تلقائياً، وإصدار فاتورة دليفري، وخصم المخزون.</span>
            </div>
          </div>

          {/* Items List */}
          <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
            الأصناف المطلوبة ({order.items.length}):
          </h4>
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '18px',
            }}
          >
            {order.items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderBottom: idx < order.items.length - 1 ? '1px solid #f1f5f9' : 'none',
                  fontSize: '13px',
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.name}</span>
                  <span style={{ fontSize: '12px', color: '#64748b', marginRight: '6px' }}>
                    (×{item.quantity})
                  </span>
                </div>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {item.total.toFixed(0)} ج
                </span>
              </div>
            ))}
          </div>

          {/* Bosta Shipping Info Card */}
          {order.bostaTrackingNumber && (
            <div
              style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '13px', color: '#e11d48' }}>
                  <PackageIcon size={15} color="#e11d48" />
                  <span>شحنة بوسطة إكسبريس (Bosta)</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  رقم التتبع: #{order.bostaTrackingNumber}
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.open(`/api/bosta/awb/${order.bostaDeliveryId || order.bostaTrackingNumber}`, '_blank')}
                style={{
                  background: '#e11d48',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                طباعة البوليصة AWB
              </button>
            </div>
          )}

          {/* GCC Shipping Info Card */}
          {(order.gccTrackingNumber || order.gcc_tracking_number) && (
            <div
              style={{
                background: (order.gccShippingCarrier || order.gcc_shipping_carrier) === 'aramex' ? '#fef2f2' : '#fff7ed',
                border: `1px solid ${(order.gccShippingCarrier || order.gcc_shipping_carrier) === 'aramex' ? '#fecaca' : '#fed7aa'}`,
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '13px', color: (order.gccShippingCarrier || order.gcc_shipping_carrier) === 'aramex' ? '#dc2626' : '#ea580c' }}>
                  <TruckIcon size={15} color={(order.gccShippingCarrier || order.gcc_shipping_carrier) === 'aramex' ? '#dc2626' : '#ea580c'} />
                  <span>شحنة {(order.gccShippingCarrier || order.gcc_shipping_carrier) === 'aramex' ? 'أرامكس (Aramex)' : 'سمسا إكسبريس (SMSA)'}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  رقم التتبع: #{order.gccTrackingNumber || order.gcc_tracking_number}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onShipGcc(order)}
                style={{
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                عرض التتبع والطباعة
              </button>
            </div>
          )}

          {/* Cost Breakdown */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '13px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
              <span>المجموع الفرعي:</span>
              <span style={{ fontWeight: 600 }}>{order.subtotal.toFixed(0)} ج</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
              <span>رسوم التوصيل {order.deliveryZoneName ? `(${order.deliveryZoneName})` : ''}:</span>
              {order.deliveryFee === 0 ? (
                <span style={{ fontWeight: 700, color: '#16a34a' }}>مجاناً</span>
              ) : (
                <span style={{ fontWeight: 600 }}>{order.deliveryFee.toFixed(0)} ج</span>
              )}
            </div>
            {order.couponCode && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#170e5e' }}>
                <span>كود الخصم المستخدم:</span>
                <span style={{ fontWeight: 800, fontFamily: 'monospace' }}>{order.couponCode}</span>
              </div>
            )}
            {(order.discountAmount ?? 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                <span>قيمة الخصم:</span>
                <span style={{ fontWeight: 700 }}>-{(order.discountAmount ?? 0).toFixed(0)} <CurrencySymbol /></span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '8px',
                borderTop: '1px dashed #cbd5e1',
                fontSize: '16px',
                fontWeight: 800,
                color: '#0f172a',
              }}
            >
              <span>المبلغ المطلوب:</span>
              <span>{order.totalAmount.toFixed(0)} <CurrencySymbol /></span>
            </div>
          </div>

          {/* Status Selector */}
          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              تحديث حالة الطلب:
            </label>
            <select
              value={order.status}
              disabled={isUpdatingStatus}
              onChange={(e) => onUpdateStatus(order.id, e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                background: '#ffffff',
                fontFamily: 'inherit',
              }}
            >
              <option value="pending">قيد الانتظار (جديد)</option>
              <option value="confirmed">تم التأكيد</option>
              <option value="processing">جاري التجهيز</option>
              <option value="shipped">خرج للتوصيل</option>
              <option value="delivered">مكتمل / تم التسليم</option>
              <option value="cancelled">ملغي</option>
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            paddingTop: '16px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: '10px',
          }}
        >
          {order.status === 'cancelled' ? (
            <div
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '10px',
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <AlertTriangleIcon size={14} color="#991b1b" />
              <span>هذا الطلب تم إلغاؤه من قبل العميل</span>
            </div>
          ) : order.saleId ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <div
                style={{
                  textAlign: 'center',
                  padding: '10px',
                  background: '#dcfce7',
                  color: '#166534',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <CheckIcon size={14} color="#166534" strokeWidth={2.5} />
                <span>تم إصدار فاتورة دليفري رقم #{order.saleId}</span>
              </div>
              {order.status === 'processing' && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(order.id, 'shipped')}
                  disabled={isUpdatingStatus}
                  style={{
                    background: '#6b21a8',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '13px',
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <TruckIcon size={14} color="#ffffff" />
                  <span>تسليم للمندوب (خرج للتوصيل)</span>
                </button>
              )}
              {order.status === 'shipped' && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(order.id, 'delivered')}
                  disabled={isUpdatingStatus}
                  style={{
                    background: '#166534',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '13px',
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <CheckIcon size={14} color="#ffffff" strokeWidth={2.5} />
                  <span>تأكيد استلام العميل (تم التسليم بنجاح)</span>
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <button
                type="button"
                onClick={() => onLoadToPos(order.id)}
                disabled={loadingPosOrderId === order.id}
                style={{
                  flex: 1,
                  background: '#047857',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: loadingPosOrderId === order.id ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span>
                  {loadingPosOrderId === order.id ? 'جاري النقل...' : 'تنزيل في السلة (POS)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onConvertToDelivery(order)}
                style={{
                  flex: 1,
                  background: '#170e5e',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>دليفري داخلي</span>
              </button>

              <button
                type="button"
                onClick={() => onShipBosta(order)}
                style={{
                  flex: 1,
                  background: '#e11d48',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <PackageIcon size={14} color="#ffffff" />
                <span>شحن بوسطة</span>
              </button>

              <button
                type="button"
                onClick={() => onShipGcc(order)}
                style={{
                  flex: 1,
                  background: '#ea580c',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <TruckIcon size={14} color="#ffffff" />
                <span>شحن خليجي</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </DialogShell>
  );
}
