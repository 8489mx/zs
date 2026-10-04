import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { useState } from 'react';
import { OnlineOrderRecord, StorefrontInfo } from '../types/storefront.types';
import { 
  CheckIcon, 
  XIcon, 
  TruckIcon, 
  MapPinIcon, 
  MessageSquareIcon, 
  SmartphoneIcon, 
  ShoppingCartIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@/shared/components/icons/AppIcons';

interface StorefrontCustomerOrderCardProps {
  order: OnlineOrderRecord;
  info: StorefrontInfo;
  onEditOrder: (order: OnlineOrderRecord) => void;
  onReorder?: (order: OnlineOrderRecord) => void;
  onCancelOrder: (order: OnlineOrderRecord) => void;
  isCancelling?: boolean;
}

const TRACKING_STEPS = [
  { id: 'pending', label: 'تم الاستلام', desc: 'تم تسجيل طلبك بنجاح وفي انتظار الاعتماد' },
  { id: 'processing', label: 'جاري التجهيز', desc: 'يتم تجهيز وتغليف المنتجات في المتجر' },
  { id: 'shipped', label: 'مع المندوب', desc: 'خرج للتوصيل إلى عنوانك الآن' },
  { id: 'delivered', label: 'تم التسليم', desc: 'تم تسليم الطلب بنجاح' },
];

function getStepIndex(status: string): number {
  switch (status) {
    case 'pending':
      return 0;
    case 'confirmed':
    case 'processing':
      return 1;
    case 'shipped':
      return 2;
    case 'delivered':
      return 3;
    default:
      return 0;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return { label: 'قيد الانتظار', bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
    case 'confirmed':
      return { label: 'تم الاعتماد', bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' };
    case 'processing':
      return { label: 'جاري التجهيز', bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' };
    case 'shipped':
      return { label: 'مع المندوب', bg: '#faf5ff', text: '#6b21a8', border: '#d8b4fe' };
    case 'delivered':
      return { label: 'تم التسليم', bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' };
    case 'cancelled':
      return { label: 'ملغي', bg: '#fef2f2', text: '#991b1b', border: '#fecaca' };
    default:
      return { label: status, bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
  }
}

export function StorefrontCustomerOrderCard({
  order,
  info,
  onEditOrder,
  onReorder,
  onCancelOrder,
  isCancelling = false,
}: StorefrontCustomerOrderCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const badge = getStatusBadge(order.status);
  const isPending = order.status === 'pending' && !order.saleId;
  const currentStepIndex = getStepIndex(order.status);

  const orderTimeStr = new Date(order.createdAt).toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const repPhoneClean = (order.deliveryRepPhone || '').replace(/\D/g, '');
  const cleanStoreWhatsapp = (info.whatsappPhone || '').replace(/\D/g, '');

  const storeInquiryUrl = cleanStoreWhatsapp
    ? `https://wa.me/${cleanStoreWhatsapp}?text=${encodeURIComponent(
        `مرحباً، أود الاستفسار عن حالة طلبي رقم #${order.orderNumber}`
      )}`
    : null;

  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '13px',
        background: '#ffffff',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Top Header: Order Number, Time, Status Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <span
            dir="ltr"
            style={{
              fontWeight: 800,
              fontSize: '12.5px',
              color: '#0f172a',
              background: '#f1f5f9',
              padding: '2.5px 7px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              letterSpacing: '0.2px',
              whiteSpace: 'nowrap',
            }}
          >
            #{order.orderNumber}
          </span>
          <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>
            {orderTimeStr}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          {order.paymentStatus === 'paid' && (
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '999px',
                background: '#dcfce7',
                color: '#15803d',
                border: '1px solid #86efac',
                whiteSpace: 'nowrap',
              }}
            >
              مدفوع
            </span>
          )}
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2.5px 8px',
              borderRadius: '999px',
              background: badge.bg,
              color: badge.text,
              border: `1px solid ${badge.border}`,
              whiteSpace: 'nowrap',
            }}
          >
            {badge.label}
          </span>
        </div>
      </div>

      {order.status !== 'cancelled' ? (
        <div style={{ padding: '4px 0 6px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              position: 'relative',
            }}
          >
            {/* Stepper Connecting Line */}
            <div
              style={{
                position: 'absolute',
                top: '15px',
                left: '24px',
                right: '24px',
                height: '3px',
                background: '#e2e8f0',
                borderRadius: '999px',
                zIndex: 1,
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: '#170e5e',
                  borderRadius: '999px',
                  width: `${(currentStepIndex / (TRACKING_STEPS.length - 1)) * 100}%`,
                  transition: 'width 0.35s ease',
                }}
              />
            </div>

            {TRACKING_STEPS.map((step, idx) => {
              const isPassed = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const circleColor = isCurrent
                ? '#170e5e'
                : isPassed
                ? '#16a34a'
                : '#cbd5e1';
              const circleBg = isCurrent
                ? '#170e5e'
                : isPassed
                ? '#dcfce7'
                : '#ffffff';
              const circleText = isCurrent
                ? '#ffffff'
                : isPassed
                ? '#16a34a'
                : '#94a3b8';

              return (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    flex: 1,
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: circleBg,
                      border: `2px solid ${circleColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 800,
                      color: circleText,
                      boxShadow: isCurrent
                        ? '0 0 0 3px rgba(23, 14, 94, 0.15)'
                        : '0 1px 2px rgba(0,0,0,0.04)',
                      transition: 'all 0.25s ease',
                      marginBottom: '6px',
                    }}
                  >
                    {isPassed ? <CheckIcon size={14} strokeWidth={3} /> : idx + 1}
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: isCurrent ? 800 : 600,
                      color: isCurrent ? '#170e5e' : isPassed ? '#166534' : '#64748b',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Unified Compact Status Callout */}
          <div
            style={{
              marginTop: '12px',
              padding: '9px 12px',
              background: '#f8fafc',
              borderRadius: '9px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, flex: 1 }}>
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#170e5e',
                  flexShrink: 0,
                }}
              />
              <div style={{ fontSize: '11.5px', color: '#334155', minWidth: 0, lineHeight: 1.4 }}>
                <strong style={{ color: '#0f172a', fontWeight: 800, marginInlineEnd: '4px' }}>الحالة:</strong>
                <span>{TRACKING_STEPS[currentStepIndex]?.desc}</span>
              </div>
            </div>

            {storeInquiryUrl && (
              <a
                href={storeInquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="استفسار عبر واتساب المتجر"
                style={{
                  color: '#16a34a',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '11px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#f0fdf4',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #bbf7d0',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                <MessageSquareIcon size={12} />
                <span>استفسار</span>
              </a>
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            borderRadius: '9px',
            padding: '9px 12px',
            fontSize: '11.5px',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
          }}
        >
          <XIcon size={15} />
          <span>تم إلغاء هذا الطلب. للتفاصيل يرجى التواصل مع المتجر.</span>
        </div>
      )}

      {/* Out for Delivery Card (Delivery Rep details) */}
      {order.status === 'shipped' && (
        <div
          style={{
            background: '#faf5ff',
            border: '1px solid #e9d5ff',
            borderRadius: '10px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '9px',
                background: '#f3e8ff',
                color: '#7e22ce',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e9d5ff',
                flexShrink: 0,
              }}
            >
              <TruckIcon size={18} color="#7e22ce" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '10.5px', color: '#7e22ce', fontWeight: 800 }}>
                طلبك في الطريق مع المندوب
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {order.deliveryRepName || 'مندوب توصيل المتجر'}
              </div>
            </div>
          </div>

          {/* Quick Rep Call / WhatsApp Actions */}
          {order.deliveryRepPhone && (
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <a
                href={`tel:${repPhoneClean}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '7px',
                  background: '#170e5e',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <SmartphoneIcon size={12} />
                <span>اتصال</span>
              </a>
              <a
                href={`https://wa.me/${repPhoneClean}?text=${encodeURIComponent(
                  `مرحباً كابتن ${order.deliveryRepName || ''}، بخصوص طلبي رقم #${order.orderNumber}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '7px',
                  background: '#25D366',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <MessageSquareIcon size={12} />
                <span>واتساب</span>
              </a>
            </div>
          )}
        </div>
      )}

      {/* Address & Notes Summary */}
      {(order.customerAddress || order.customerNotes) && (
        <div
          style={{
            fontSize: '11.5px',
            color: '#475569',
            background: '#f8fafc',
            padding: '8px 11px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
          }}
        >
          {order.customerAddress && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
              <MapPinIcon size={13} color="#170e5e" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1, minWidth: 0, lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700, color: '#334155', marginInlineEnd: '4px' }}>العنوان:</span>
                <span style={{ color: '#0f172a' }}>{order.customerAddress}</span>
                {order.deliveryZoneName && (
                  <span
                    style={{
                      marginInlineStart: '6px',
                      background: '#f0f3ff',
                      color: '#170e5e',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      border: '1px solid #d8e0fc',
                      display: 'inline-block',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {order.deliveryZoneName}
                  </span>
                )}
              </div>
            </div>
          )}
          {order.customerNotes && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
              <MessageSquareIcon size={13} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1, minWidth: 0, lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700, color: '#334155', marginInlineEnd: '4px' }}>ملاحظاتك:</span>
                <span style={{ color: '#0f172a' }}>{order.customerNotes}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Items Toggle Header */}
      <div>
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '7px 11px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 700,
            color: '#170e5e',
            fontFamily: 'inherit',
            transition: 'background 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShoppingCartIcon size={13} color="#170e5e" />
            <span>تفاصيل الأصناف ({order.items.length})</span>
          </div>
          <span style={{ fontSize: '11px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span>{showDetails ? 'إخفاء' : 'عرض'}</span>
            {showDetails ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />}
          </span>
        </button>

        {/* Expandable Items List */}
        {showDetails && (
          <div
            style={{
              marginTop: '6px',
              fontSize: '12px',
              color: '#334155',
              background: '#f8fafc',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {order.items.map((it, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingBottom: '4px',
                  borderBottom:
                    idx < order.items.length - 1 ? '1px dashed #e2e8f0' : 'none',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {it.name} <span style={{ color: '#64748b', fontWeight: 600 }}>(×{it.quantity})</span>
                </span>
                <span style={{ fontWeight: 700, flexShrink: 0, marginInlineStart: '8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <span>{it.total.toFixed(0)}</span>
                  <CurrencySymbol />
                </span>
              </div>
            ))}

            {order.deliveryFee === 0 ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '4px',
                  color: '#16a34a',
                  fontWeight: 700,
                }}
              >
                <span>خدمة التوصيل {order.deliveryZoneName ? `(${order.deliveryZoneName})` : ''}:</span>
                <span>مجاناً</span>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '4px',
                  color: '#64748b',
                }}
              >
                <span>خدمة التوصيل {order.deliveryZoneName ? `(${order.deliveryZoneName})` : ''}:</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <span>{order.deliveryFee.toFixed(0)}</span>
                  <CurrencySymbol />
                </span>
              </div>
            )}

            {(order.discountAmount ?? 0) > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '4px',
                  color: '#16a34a',
                  fontWeight: 700,
                }}
              >
                <span>خصم الكوبون {order.couponCode ? `(${order.couponCode})` : ''}:</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <span>-{(order.discountAmount ?? 0).toFixed(0)}</span>
                  <CurrencySymbol />
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Footer: Total Amount & Actions (Strict Single Row) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          paddingTop: '10px',
          borderTop: '1px solid #f1f5f9',
          flexWrap: 'nowrap',
        }}
      >
        <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, whiteSpace: 'nowrap' }}>
          <span style={{ color: '#64748b' }}>إجمالي الفاتورة:</span>
          <strong style={{ fontWeight: 800, color: '#170e5e', fontSize: '14.5px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <span>{order.totalAmount.toFixed(0)}</span>
            <CurrencySymbol />
          </strong>
        </div>

        {/* Action buttons (only if pending) */}
        {isPending ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => onEditOrder(order)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: '30px',
                padding: '0 10px',
                borderRadius: '7px',
                background: '#f0f3ff',
                border: '1px solid #c7d2fe',
                color: '#170e5e',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span>تعديل الطلب</span>
            </button>

            <button
              type="button"
              onClick={() => onCancelOrder(order)}
              disabled={isCancelling}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: '30px',
                padding: '0 10px',
                borderRadius: '7px',
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#be123c',
                fontSize: '11px',
                fontWeight: 700,
                cursor: isCancelling ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span>إلغاء</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {order.status === 'cancelled'
                ? 'الطلب ملغي'
                : order.status === 'delivered'
                ? 'اكتمل التوصيل بنجاح'
                : 'الطلب معتمد'}
            </span>
            {onReorder && (order.status === 'delivered' || order.status === 'cancelled') && (
              <button
                type="button"
                onClick={() => onReorder(order)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: '30px',
                  padding: '0 10px',
                  borderRadius: '7px',
                  background: info.brandColor || '#170e5e',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'opacity 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                اطلب تاني
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
