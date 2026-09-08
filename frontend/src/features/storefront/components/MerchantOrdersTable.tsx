import type { OnlineOrderRecord } from '../types/storefront.types';
import {
  PackageIcon,
  TruckIcon,
  CheckIcon,
  MapPinIcon,
} from '@/shared/components/icons/AppIcons';

interface MerchantOrdersTableProps {
  orders: OnlineOrderRecord[];
  isLoading: boolean;
  onSelectOrder: (order: OnlineOrderRecord) => void;
  onConvertToDelivery: (order: OnlineOrderRecord) => void;
  onShipBosta: (order: OnlineOrderRecord) => void;
  onShipGcc: (order: OnlineOrderRecord) => void;
  onLoadToPos: (orderId: number) => void;
  loadingPosOrderId: number | null;
  onUpdateStatus: (id: number, status: string) => void;
  isUpdatingStatus: boolean;
}

export function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return { label: 'جديد / قيد الانتظار', bg: '#fefce8', text: '#854d0e', border: '#fef08a' };
    case 'confirmed':
      return { label: 'تم التأكيد', bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' };
    case 'processing':
      return { label: 'جاري التجهيز', bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' };
    case 'shipped':
      return { label: 'خرج للتوصيل', bg: '#fff7ed', text: '#c2410c', border: '#ffedd5' };
    case 'delivered':
      return { label: 'مكتمل / تم التسليم', bg: '#f0fdf4', text: '#15803d', border: '#dcfce7' };
    case 'cancelled':
      return { label: 'ملغي', bg: '#fef2f2', text: '#b91c1c', border: '#fee2e2' };
    default:
      return { label: status, bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
  }
}

export function MerchantOrdersTable({
  orders,
  isLoading,
  onSelectOrder,
  onConvertToDelivery,
  onShipBosta,
  onShipGcc,
  onLoadToPos,
  loadingPosOrderId,
  onUpdateStatus,
  isUpdatingStatus,
}: MerchantOrdersTableProps) {
  if (isLoading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
        جاري تحميل الطلبات...
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: '#94a3b8' }}>
          <PackageIcon size={44} />
        </div>
        <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
          لا توجد طلبات في هذا القسم
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
          عندما يطلب أي عميل من رابط متجرك سيظهر طلبه هنا فوراً مع تنبيه بالبيانات والمخزون.
        </p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
            <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>رقم الطلب</th>
            <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>العميل والهاتف</th>
            <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>عنوان التوصيل</th>
            <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>الأصناف</th>
            <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>الإجمالي</th>
            <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>الحالة</th>
            <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const badge = getStatusBadge(order.status);
            const cleanPhone = order.customerPhone.replace(/\D/g, '');
            const waPhone = cleanPhone.startsWith('01') ? `2${cleanPhone}` : cleanPhone;

            return (
              <tr
                key={order.id}
                style={{
                  borderBottom: '1px solid #f1f5f9',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
              >
                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px', direction: 'ltr', textAlign: 'center' }}>
                    #{order.orderNumber}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', textAlign: 'center' }}>
                    {new Date(order.createdAt).toLocaleDateString('ar-EG', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </td>
                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', textAlign: 'center' }}>{order.customerName}</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', direction: 'ltr', textAlign: 'center', marginTop: '1px' }}>
                    {order.customerPhone}
                  </div>
                </td>
                <td style={{ padding: '12px 14px', maxWidth: '180px', color: '#334155', textAlign: 'center', verticalAlign: 'middle' }}>
                  <div
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontSize: '12.5px',
                      textAlign: 'center',
                    }}
                    title={order.customerAddress || ''}
                  >
                    {order.customerAddress || 'غير محدد'}
                  </div>
                  {order.deliveryZoneName && (
                    <div
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        color: '#170e5e',
                        background: '#f0f3ff',
                        border: '1px solid #d8e0fc',
                        borderRadius: '4px',
                        padding: '1px 6px',
                        marginTop: '3px',
                        display: 'inline-block',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <MapPinIcon size={12} color="#170e5e" />
                        <span>{order.deliveryZoneName}</span>
                      </span>
                    </div>
                  )}
                </td>
                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '12.5px', textAlign: 'center' }}>
                    {order.items.length} صنف
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px', textAlign: 'center' }}>
                    ({order.items.reduce((acc, i) => acc + i.quantity, 0)} قطعة)
                  </div>
                </td>
                <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', fontSize: '13.5px', textAlign: 'center', verticalAlign: 'middle' }}>
                  {order.totalAmount.toFixed(0)} ج
                </td>
                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '999px',
                      background: badge.bg,
                      color: badge.text,
                      border: `1px solid ${badge.border}`,
                      whiteSpace: 'nowrap',
                      display: 'inline-block',
                    }}
                  >
                    {badge.label}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '102px 120px 58px 32px',
                      gap: '6px',
                      alignItems: 'center',
                      margin: '0 auto',
                      width: 'fit-content',
                    }}
                  >
                    {/* Col 1: Status / Invoice Badge */}
                    {order.status === 'cancelled' ? (
                      <span
                        style={{
                          width: '100%',
                          height: '32px',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '7px',
                          background: '#f8fafc',
                          color: '#64748b',
                          border: '1px solid #e2e8f0',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxSizing: 'border-box',
                        }}
                      >
                        ملغي من العميل
                      </span>
                    ) : order.saleId ? (
                      <span
                        style={{
                          width: '100%',
                          height: '32px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          borderRadius: '7px',
                          background: '#f8fafc',
                          color: '#1e293b',
                          border: '1px solid #cbd5e1',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '3px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <CheckIcon size={13} color="#059669" strokeWidth={2.5} />
                        <span>فاتورة #{order.saleId}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onLoadToPos(order.id)}
                        disabled={loadingPosOrderId === order.id}
                        title="فتح شاشة الكاشير وتنزيل الأصناف والعميل في السلة لتعديلها وإتمام البيع"
                        style={{
                          width: '100%',
                          height: '32px',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '7px',
                          background: '#047857',
                          color: '#ffffff',
                          border: 'none',
                          cursor: loadingPosOrderId === order.id ? 'wait' : 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 2px rgba(4,120,87,0.2)',
                          boxSizing: 'border-box',
                        }}
                      >
                        <span>{loadingPosOrderId === order.id ? 'جاري...' : 'بالسلة (POS)'}</span>
                      </button>
                    )}

                    {/* Col 2: Action Button */}
                    {order.status === 'processing' && order.saleId ? (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(order.id, 'shipped')}
                        disabled={isUpdatingStatus}
                        title="تسليم الأوردر والفاتورة لمندوب التوصيل"
                        style={{
                          width: '100%',
                          height: '32px',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '7px',
                          background: '#170e5e',
                          color: '#ffffff',
                          border: 'none',
                          cursor: isUpdatingStatus ? 'wait' : 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          boxShadow: '0 1px 2px rgba(23,14,94,0.2)',
                          boxSizing: 'border-box',
                        }}
                      >
                        <TruckIcon size={13} color="#ffffff" />
                        <span>تسليم للمندوب</span>
                      </button>
                    ) : order.status === 'shipped' ? (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(order.id, 'delivered')}
                        disabled={isUpdatingStatus}
                        title="تأكيد تسليم الأوردر للعميل بنجاح"
                        style={{
                          width: '100%',
                          height: '32px',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '7px',
                          background: '#059669',
                          color: '#ffffff',
                          border: 'none',
                          cursor: isUpdatingStatus ? 'wait' : 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          boxShadow: '0 1px 2px rgba(5,150,105,0.2)',
                          boxSizing: 'border-box',
                        }}
                      >
                        <CheckIcon size={13} color="#ffffff" strokeWidth={2.5} />
                        <span>تم التسليم</span>
                      </button>
                    ) : order.bostaTrackingNumber ? (
                      <button
                        type="button"
                        onClick={() => window.open(`/api/bosta/awb/${order.bostaDeliveryId || order.bostaTrackingNumber}`, '_blank')}
                        title="طباعة بوليصة شحن بوسطة AWB"
                        style={{
                          width: '100%',
                          height: '32px',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '7px',
                          background: '#fff1f2',
                          color: '#e11d48',
                          border: '1px solid #fecdd3',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <PackageIcon size={13} color="#e11d48" />
                        <span>بوسطة #{order.bostaTrackingNumber}</span>
                      </button>
                    ) : (order.gccTrackingNumber || order.gcc_tracking_number) ? (
                      <button
                        type="button"
                        onClick={() => onShipGcc(order)}
                        title="عرض تتبع وطباعة بوليصة الشحن الخليجي"
                        style={{
                          width: '100%',
                          height: '32px',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '7px',
                          background: (order.gccShippingCarrier || order.gcc_shipping_carrier) === 'aramex' ? '#fef2f2' : '#fff7ed',
                          color: (order.gccShippingCarrier || order.gcc_shipping_carrier) === 'aramex' ? '#dc2626' : '#ea580c',
                          border: `1px solid ${(order.gccShippingCarrier || order.gcc_shipping_carrier) === 'aramex' ? '#fecaca' : '#fed7aa'}`,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <TruckIcon size={13} color={(order.gccShippingCarrier || order.gcc_shipping_carrier) === 'aramex' ? '#dc2626' : '#ea580c'} />
                        <span>{(order.gccShippingCarrier || order.gcc_shipping_carrier) === 'aramex' ? 'أرامكس' : 'سمسا'} #{order.gccTrackingNumber || order.gcc_tracking_number}</span>
                      </button>
                    ) : !order.saleId && order.status !== 'cancelled' ? (
                      <div style={{ display: 'flex', gap: '3px', width: '100%' }}>
                        <button
                          type="button"
                          onClick={() => onConvertToDelivery(order)}
                          title="تحويل فوري لدليفري واختيار مندوب التوصيل"
                          style={{
                            flex: 1,
                            height: '32px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            borderRadius: '7px',
                            background: '#170e5e',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '1px',
                            boxShadow: '0 1px 2px rgba(23,14,94,0.2)',
                            boxSizing: 'border-box',
                            padding: '0 2px',
                          }}
                        >
                          <span>دليفري</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onShipBosta(order)}
                          title="شحن فوري عبر بوسطة وتوليد البوليصة"
                          style={{
                            flex: 1,
                            height: '32px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            borderRadius: '7px',
                            background: '#e11d48',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2px',
                            boxShadow: '0 1px 2px rgba(225,29,72,0.2)',
                            boxSizing: 'border-box',
                            padding: '0 2px',
                          }}
                        >
                          <PackageIcon size={12} color="#ffffff" />
                          <span>بوسطة</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onShipGcc(order)}
                          title="شحن خليجي عبر أرامكس أو سمسا"
                          style={{
                            flex: 1,
                            height: '32px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            borderRadius: '7px',
                            background: '#ea580c',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2px',
                            boxShadow: '0 1px 2px rgba(234,88,12,0.2)',
                            boxSizing: 'border-box',
                            padding: '0 2px',
                          }}
                        >
                          <TruckIcon size={12} color="#ffffff" />
                          <span>خليجي</span>
                        </button>
                      </div>
                    ) : order.status === 'delivered' ? (
                      <div
                        style={{
                          width: '100%',
                          height: '32px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#059669',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '3px',
                          borderRadius: '7px',
                          background: '#f0fdf4',
                          border: '1px solid #dcfce7',
                          boxSizing: 'border-box',
                        }}
                      >
                        <CheckIcon size={13} color="#059669" strokeWidth={2.5} />
                        <span>مكتمل</span>
                      </div>
                    ) : (
                      <div style={{ width: '100%', height: '32px' }} />
                    )}

                    {/* Col 3: Details Button */}
                    <button
                      type="button"
                      onClick={() => onSelectOrder(order)}
                      style={{
                        width: '100%',
                        height: '32px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        borderRadius: '7px',
                        background: '#ffffff',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        transition: 'all 0.15s ease',
                        boxSizing: 'border-box',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f1f5f9';
                        e.currentTarget.style.borderColor = '#94a3b8';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }}
                    >
                      تفاصيل
                    </button>

                    {/* Col 4: WhatsApp Button */}
                    {waPhone ? (
                      <a
                        href={`https://wa.me/${waPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="مراسلة العميل واتساب"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '7px',
                          background: '#ecfdf5',
                          color: '#059669',
                          border: '1px solid #a7f3d0',
                          textDecoration: 'none',
                          flexShrink: 0,
                          boxShadow: '0 1px 2px rgba(5,150,105,0.1)',
                          boxSizing: 'border-box',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#25D366';
                          e.currentTarget.style.color = '#ffffff';
                          e.currentTarget.style.borderColor = '#25D366';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#ecfdf5';
                          e.currentTarget.style.color = '#059669';
                          e.currentTarget.style.borderColor = '#a7f3d0';
                        }}
                      >
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.181-.076.355.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z" />
                        </svg>
                      </a>
                    ) : (
                      <div style={{ width: '32px', height: '32px' }} />
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
