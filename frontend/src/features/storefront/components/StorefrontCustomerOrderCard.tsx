import { useState } from 'react';
import { OnlineOrderRecord, StorefrontInfo } from '../types/storefront.types';

interface StorefrontCustomerOrderCardProps {
  order: OnlineOrderRecord;
  info: StorefrontInfo;
  onEditOrder: (order: OnlineOrderRecord) => void;
  onCancelOrder: (order: OnlineOrderRecord) => void;
  isCancelling?: boolean;
}

const TRACKING_STEPS = [
  { id: 'pending', label: 'تم الاستلام', icon: '📝', desc: 'تم تسجيل طلبك بنجاح وفي انتظار الاعتماد' },
  { id: 'processing', label: 'جاري التجهيز', icon: '📦', desc: 'يتم تجهيز وتغليف المنتجات في المتجر' },
  { id: 'shipped', label: 'مع المندوب', icon: '🛵', desc: 'خرج للتوصيل إلى عنوانك الآن' },
  { id: 'delivered', label: 'تم التسليم', icon: '✅', desc: 'تم تسليم الطلب بنجاح' },
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
      return { label: 'قيد الانتظار (يمكن التعديل)', bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
    case 'confirmed':
      return { label: 'تم الاعتماد والتأكيد', bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' };
    case 'processing':
      return { label: 'جاري التجهيز في المتجر', bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' };
    case 'shipped':
      return { label: 'خرج للتوصيل مع المندوب 🛵', bg: '#faf5ff', text: '#6b21a8', border: '#d8b4fe' };
    case 'delivered':
      return { label: 'تم التسليم ومكتمل ✓', bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' };
    case 'cancelled':
      return { label: 'طلب ملغي ✕', bg: '#fef2f2', text: '#991b1b', border: '#fecaca' };
    default:
      return { label: status, bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
  }
}

export function StorefrontCustomerOrderCard({
  order,
  info,
  onEditOrder,
  onCancelOrder,
  isCancelling = false,
}: StorefrontCustomerOrderCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const badge = getStatusBadge(order.status);
  const isCancelled = order.status === 'cancelled';
  const isPending = order.status === 'pending' && !order.saleId;
  const currentStep = getStepIndex(order.status);

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
        borderRadius: '14px',
        padding: '16px',
        background: '#ffffff',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Top Header: Order Number, Time, Status Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            dir="ltr"
            style={{
              fontWeight: 800,
              fontSize: '13.5px',
              color: '#0f172a',
              background: '#f1f5f9',
              padding: '3px 8px',
              borderRadius: '7px',
              border: '1px solid #e2e8f0',
              letterSpacing: '0.3px',
            }}
          >
            #{order.orderNumber}
          </span>
          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
            {orderTimeStr}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {order.paymentStatus === 'paid' && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '999px',
                background: '#dcfce7',
                color: '#15803d',
                border: '1px solid #86efac',
                whiteSpace: 'nowrap',
              }}
            >
              مدفوع أونلاين 💳
            </span>
          )}
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              padding: '3px 10px',
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

      {/* Live Tracking Stepper Bar (if not cancelled) */}
      {!isCancelled ? (
        <div
          style={{
            background: '#f8fafc',
            borderRadius: '12px',
            padding: '14px 12px 10px',
            border: '1px solid #f1f5f9',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              position: 'relative',
            }}
          >
            {/* Connecting Background Line */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                right: '12%',
                left: '12%',
                height: '3px',
                background: '#e2e8f0',
                zIndex: 1,
              }}
            >
              {/* Active Progress Line */}
              <div
                style={{
                  height: '100%',
                  width: `${(currentStep / (TRACKING_STEPS.length - 1)) * 100}%`,
                  background: currentStep === 3 ? '#10b981' : '#170e5e',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>

            {/* Stepper Nodes */}
            {TRACKING_STEPS.map((step, idx) => {
              const isPassed = idx < currentStep;
              const isCurrent = idx === currentStep;

              let circleBg = '#ffffff';
              let circleBorder = '#cbd5e1';
              let circleColor = '#94a3b8';

              if (isPassed) {
                circleBg = '#10b981';
                circleBorder = '#10b981';
                circleColor = '#ffffff';
              } else if (isCurrent) {
                circleBg = '#170e5e';
                circleBorder = '#170e5e';
                circleColor = '#ffffff';
              }

              return (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    zIndex: 2,
                    width: '24%',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: circleBg,
                      border: `2px solid ${circleBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: isPassed ? '13px' : '14px',
                      fontWeight: 800,
                      color: circleColor,
                      boxShadow: isCurrent
                        ? '0 0 0 4px rgba(23, 14, 94, 0.15)'
                        : '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.3s ease',
                      marginBottom: '6px',
                    }}
                  >
                    {isPassed ? '✓' : step.icon}
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: isCurrent ? 800 : 600,
                      color: isCurrent ? '#170e5e' : isPassed ? '#166534' : '#64748b',
                      lineHeight: '1.2',
                    }}
                  >
                    {step.label}
                  </span>
                  {isCurrent && (
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 700,
                        color: currentStep === 3 ? '#059669' : '#170e5e',
                        marginTop: '2px',
                        background: currentStep === 3 ? '#d1fae5' : '#e0e7ff',
                        padding: '1px 5px',
                        borderRadius: '4px',
                      }}
                    >
                      {currentStep === 3 ? 'مكتمل' : 'الحالي'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Current Step Description Callout */}
          <div
            style={{
              marginTop: '12px',
              paddingTop: '8px',
              borderTop: '1px dashed #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11.5px',
              color: '#475569',
            }}
          >
            <span>
              الحالة الآن:{' '}
              <strong style={{ color: '#0f172a' }}>
                {TRACKING_STEPS[currentStep]?.desc}
              </strong>
            </span>
            {storeInquiryUrl && (
              <a
                href={storeInquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#16a34a',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '11px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <span>استفسار واتساب</span>
                <span>💬</span>
              </a>
            )}
          </div>
        </div>
      ) : (
        /* Cancelled Banner */
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            borderRadius: '10px',
            padding: '10px 14px',
            fontSize: '12.5px',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>✕</span>
          <span>
            تم إلغاء هذا الطلب. إذا كان لديك أي استفسار، يرجى التواصل مع إدارة المتجر مباشرة.
          </span>
        </div>
      )}

      {/* Out for Delivery Card (Delivery Rep details) */}
      {order.status === 'shipped' && (
        <div
          style={{
            background: '#faf5ff',
            border: '1.5px solid #d8b4fe',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#f3e8ff',
                color: '#7e22ce',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}
            >
              🛵
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#6b21a8', fontWeight: 700 }}>
                طلبك في الطريق مع المندوب
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                {order.deliveryRepName || 'مندوب توصيل المتجر'}
              </div>
            </div>
          </div>

          {/* Quick Rep Call / WhatsApp Actions */}
          {order.deliveryRepPhone && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <a
                href={`tel:${repPhoneClean}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: '#170e5e',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <span>اتصال</span>
                <span>📞</span>
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
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: '#25D366',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <span>واتساب</span>
                <span>💬</span>
              </a>
            </div>
          )}
        </div>
      )}

      {/* Address & Notes Summary */}
      {(order.customerAddress || order.customerNotes) && (
        <div
          style={{
            fontSize: '12px',
            color: '#475569',
            background: '#f8fafc',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {order.customerAddress && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px' }}>📍</span>
              <span style={{ fontWeight: 600 }}>العنوان:</span>
              <span style={{ color: '#0f172a' }}>{order.customerAddress}</span>
              {order.deliveryZoneName && (
                <span
                  style={{
                    background: '#f0f3ff',
                    color: '#170e5e',
                    padding: '1px 7px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: '1px solid #d8e0fc',
                  }}
                >
                  📍 {order.deliveryZoneName}
                </span>
              )}
            </div>
          )}
          {order.customerNotes && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px' }}>💬</span>
              <span style={{ fontWeight: 600 }}>ملاحظاتك:</span>
              <span style={{ color: '#0f172a' }}>{order.customerNotes}</span>
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
            background: 'none',
            border: 'none',
            padding: '6px 2px',
            cursor: 'pointer',
            fontSize: '12.5px',
            fontWeight: 700,
            color: '#170e5e',
            fontFamily: 'inherit',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🛒</span>
            <span>تفاصيل الأصناف ({order.items.length} منتجات)</span>
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {showDetails ? 'إخفاء التفاصيل ▲' : 'عرض التفاصيل ▼'}
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
                <span style={{ fontWeight: 700, flexShrink: 0, marginInlineStart: '8px' }}>
                  {it.total.toFixed(0)} ج
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
                <span>مجاناً 🚚</span>
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
                <span>{order.deliveryFee.toFixed(0)} ج</span>
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
                <span>-{(order.discountAmount ?? 0).toFixed(0)} ج</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Footer: Total Amount & Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          paddingTop: '10px',
          borderTop: '1px solid #f1f5f9',
        }}
      >
        <div style={{ fontSize: '13px' }}>
          <span style={{ color: '#64748b' }}>إجمالي الفاتورة: </span>
          <strong style={{ fontWeight: 800, color: '#170e5e', fontSize: '15px' }}>
            {order.totalAmount.toFixed(0)} {info.currency || 'ج.م'}
          </strong>
        </div>

        {/* Action buttons (only if pending) */}
        {isPending ? (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => onEditOrder(order)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#f0f3ff',
                border: '1px solid #c7d2fe',
                color: '#170e5e',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
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
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#be123c',
                fontSize: '12px',
                fontWeight: 700,
                cursor: isCancelling ? 'not-allowed' : 'pointer',
              }}
            >
              <span>إلغاء</span>
            </button>
          </div>
        ) : (
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {order.status === 'cancelled'
              ? 'الطلب ملغي'
              : order.status === 'delivered'
              ? 'اكتمل التوصيل بنجاح'
              : 'الطلب معتمد ولا يمكن تعديله'}
          </span>
        )}
      </div>
    </div>
  );
}
