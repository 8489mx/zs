import { useTranslation } from 'react-i18next';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { useMemo } from 'react';
import { isThreeDecimalCurrency, getGlobalSystemCurrency } from '@/lib/currencies';
import { OnlineOrderRecord, StorefrontInfo, StorefrontProduct } from '../types/storefront.types';
import { CheckIcon, PackageIcon } from '@/shared/components/icons/AppIcons';

interface StorefrontCustomerOrderCardProps {
  order: OnlineOrderRecord;
  info: StorefrontInfo;
  onEditOrder: (order: OnlineOrderRecord) => void;
  onReorder?: (order: OnlineOrderRecord) => void;
  onCancelOrder: (order: OnlineOrderRecord) => void;
  isCancelling?: boolean;
  allProducts?: StorefrontProduct[];
  defaultExpanded?: boolean;
}

const TRACKING_STEPS = [
  { id: 'pending', label: 'تم الطلب' },
  { id: 'processing', label: 'تم التجهيز' },
  { id: 'shipped', label: 'في الطريق' },
  { id: 'delivered', label: 'تم التسليم' },
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

function getStatusBadge(status: string, isEn = false) {
  switch (status) {
    case 'pending':
      return { label: isEn ? 'New Order' : 'طلب جديد', bg: '#ecfdf5', text: '#059669' };
    case 'confirmed':
    case 'processing':
      return { label: isEn ? 'Processing' : 'قيد التجهيز', bg: '#eff6ff', text: '#2563eb' };
    case 'shipped':
      return { label: isEn ? 'Order In Transit' : 'جاري التوصيل', bg: '#ecfdf5', text: '#059669' };
    case 'delivered':
      return { label: isEn ? 'Delivered' : 'تم التسليم', bg: '#ecfdf5', text: '#059669' };
    case 'cancelled':
      return { label: isEn ? 'Cancelled' : 'ملغي', bg: '#fef2f2', text: '#ef4444' };
    default:
      return { label: status, bg: '#f1f5f9', text: '#64748b' };
  }
}

export function StorefrontCustomerOrderCard({
  order,
  info,
  onEditOrder,
  onReorder,
  onCancelOrder,
  isCancelling = false,
  allProducts = [],
}: StorefrontCustomerOrderCardProps) {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const badge = getStatusBadge(order.status, isEn);
  const isPending = order.status === 'pending' && !order.saleId;
  const currentStepIndex = getStepIndex(order.status);
  const brandColor = info?.brandColor || '#2563eb';

  const currCode = order.currency || info.currency || getGlobalSystemCurrency();
  const isThreeDec = isThreeDecimalCurrency(currCode);
  const formatPriceNumber = (val: number | string | undefined | null): string => {
    const num = Number(val || 0);
    if (isThreeDec) return num.toFixed(3);
    if (currCode === 'EGP') return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
    return num.toFixed(2);
  };

  const createdDate = useMemo(() => {
    const d = new Date(order.createdAt);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, [order.createdAt]);

  const formattedOrderDate = createdDate.toLocaleDateString(isEn ? 'en-US' : 'ar-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const formattedOrderTime = createdDate.toLocaleTimeString(isEn ? 'en-US' : 'ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const stepTimestamps = useMemo(() => {
    const baseMs = createdDate.getTime();
    return [0, 15, 45, 120].map((offsetMinutes, idx) => {
      if (idx > currentStepIndex) return 'قيد الانتظار...';
      const stepDate = new Date(baseMs + offsetMinutes * 60 * 1000);
      return stepDate.toLocaleTimeString(isEn ? 'en-US' : 'ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    });
  }, [createdDate, currentStepIndex, isEn]);

  const productLookup = useMemo(() => {
    const byId = new Map<number, StorefrontProduct>();
    const byName = new Map<string, StorefrontProduct>();
    for (const p of allProducts) {
      if (p?.id) byId.set(Number(p.id), p);
      if (p?.name) byName.set(p.name.trim().toLowerCase(), p);
    }
    return { byId, byName };
  }, [allProducts]);

  const getProductImageForItem = (productId: number, name: string): string | null => {
    const byIdMatch = productLookup.byId.get(Number(productId));
    if (byIdMatch?.imageUrl) return byIdMatch.imageUrl;
    const byNameMatch = productLookup.byName.get((name || '').trim().toLowerCase());
    if (byNameMatch?.imageUrl) return byNameMatch.imageUrl;
    return null;
  };

  const isPaid = order.paymentStatus === 'paid';
  const paymentMethodLabel =
    order.paymentMethod === 'online' || order.paymentMethod === 'card'
      ? 'بطاقة بنكية'
      : 'عند الاستلام';

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '18px',
        border: '1px solid #f1f5f9',
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.025)',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}
    >
      {/* 1. Balanced Order Header: Icon + Order ID & Date on Right, Status Badge on Left */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '11px',
              background: '#f8fafc',
              border: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <PackageIcon size={19} color="#0d9488" strokeWidth={1.8} />
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              dir="ltr"
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#0f172a',
                textAlign: 'right',
                lineHeight: 1.25,
              }}
            >
              Order #{order.orderNumber}
            </div>

            <div
              style={{
                fontSize: '12px',
                fontWeight: 400,
                color: '#94a3b8',
                marginTop: '3px',
                whiteSpace: 'nowrap',
              }}
            >
              {formattedOrderDate} • {formattedOrderTime}
            </div>
          </div>
        </div>

        {/* Status Pill & Actions on Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              padding: '4px 12px',
              borderRadius: '999px',
              background: badge.bg,
              color: badge.text,
              whiteSpace: 'nowrap',
            }}
          >
            {badge.label}
          </span>

          {isPending && (
            <>
              <button
                type="button"
                onClick={() => onEditOrder(order)}
                style={{
                  height: '28px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#334155',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                تعديل
              </button>
              <button
                type="button"
                onClick={() => onCancelOrder(order)}
                disabled={isCancelling}
                style={{
                  height: '28px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  background: '#fef2f2',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                إلغاء
              </button>
            </>
          )}

          {!isPending && onReorder && (order.status === 'delivered' || order.status === 'cancelled') && (
            <button
              type="button"
              onClick={() => onReorder(order)}
              style={{
                height: '28px',
                padding: '0 10px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#0f172a',
                fontSize: '11.5px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              إعادة الطلب
            </button>
          )}
        </div>
      </div>

      {/* 2. Clean Horizontal 4-Step Progress Bar (Image 1) */}
      {order.status !== 'cancelled' && (
        <div
          style={{
            background: '#f9fafb',
            borderRadius: '12px',
            padding: '16px 10px 14px',
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
            {/* Thin Connecting Line precisely between first and last circle centers */}
            <div
              style={{
                position: 'absolute',
                top: '10px',
                left: '12.5%',
                right: '12.5%',
                height: '1.5px',
                background: '#e2e8f0',
                zIndex: 1,
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: '#10b981',
                  width: `${(currentStepIndex / (TRACKING_STEPS.length - 1)) * 100}%`,
                  transition: 'width 0.35s ease',
                }}
              />
            </div>

            {TRACKING_STEPS.map((step, idx) => {
              const isCompleted = idx <= currentStepIndex;
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
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: isCompleted ? '#10b981' : '#ffffff',
                      border: isCompleted ? '1.5px solid #10b981' : '1.5px solid #cbd5e1',
                      boxShadow: '0 0 0 4px #f9fafb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    {isCompleted && <CheckIcon size={11} strokeWidth={2.5} color="#ffffff" />}
                  </div>

                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: isCompleted ? 500 : 400,
                      color: isCompleted ? '#1e293b' : '#94a3b8',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {step.label}
                  </span>

                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 400,
                      color: '#94a3b8',
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {stepTimestamps[idx]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Properly Proportioned 3-Column Info Row (Never wraps Date vertically) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto auto 1fr',
          gap: '20px',
          padding: '2px 2px 4px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '14px',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 400, marginBottom: '4px', whiteSpace: 'nowrap' }}>
            تاريخ الطلب
          </div>
          <div style={{ fontSize: '12.5px', color: '#1e293b', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {formattedOrderDate}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 400, marginBottom: '4px', whiteSpace: 'nowrap' }}>
            شركة الشحن
          </div>
          <div
            style={{
              fontSize: '12.5px',
              color: '#1e293b',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {order.deliveryZoneName || 'توصيل سريع'}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 400, marginBottom: '4px', whiteSpace: 'nowrap' }}>
            العنوان
          </div>
          <div
            title={order.customerAddress || 'استلام من الفرع'}
            style={{
              fontSize: '12.5px',
              color: '#1e293b',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {order.customerAddress || 'استلام من الفرع'}
          </div>
        </div>
      </div>

      {/* 4. Clean Borderless Product Items List (Exact Image 3 layout: Title on top, Price & Qty on same bottom baseline) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {order.items.map((it, idx) => {
          const thumbUrl = getProductImageForItem(it.productId, it.name);
          return (
            <div
              key={`${it.productId}-${idx}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                  padding: '6px',
                  boxSizing: 'border-box',
                }}
              >
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={it.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      mixBlendMode: 'multiply',
                    }}
                  />
                ) : (
                  <PackageIcon size={20} color="#94a3b8" />
                )}
              </div>

              <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 500,
                    color: '#1e293b',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.3,
                  }}
                >
                  {it.name}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '13.5px',
                      fontWeight: 600,
                      color: brandColor,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <span>{formatPriceNumber(it.total)}</span>
                    <CurrencySymbol currency={currCode} />
                  </div>

                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 400,
                      color: '#94a3b8',
                      flexShrink: 0,
                    }}
                  >
                    الكمية : {it.quantity}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Soft Order Summary Card (Image 1 & Image 3) */}
      <div
        style={{
          background: '#f9fafb',
          borderRadius: '12px',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            color: '#64748b',
            fontWeight: 400,
          }}
        >
          <span>المجموع الفرعي</span>
          <span style={{ color: '#1e293b', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <span>{formatPriceNumber(order.subtotal)}</span>
            <CurrencySymbol currency={currCode} />
          </span>
        </div>

        {(order.discountAmount ?? 0) > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: '#64748b',
              fontWeight: 400,
            }}
          >
            <span>الخصم</span>
            <span style={{ color: '#10b981', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <span>-{formatPriceNumber(order.discountAmount)}</span>
              <CurrencySymbol currency={currCode} />
            </span>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            color: '#64748b',
            fontWeight: 400,
          }}
        >
          <span>الشحن</span>
          <span style={{ color: '#1e293b', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            {order.deliveryFee === 0 ? (
              <span>مجاناً</span>
            ) : (
              <>
                <span>{formatPriceNumber(order.deliveryFee)}</span>
                <CurrencySymbol currency={currCode} />
              </>
            )}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            color: '#64748b',
            fontWeight: 400,
          }}
        >
          <span>طريقة الدفع</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#1e293b', fontWeight: 500 }}>{paymentMethodLabel}</span>
            {isPaid && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: '#22c55e',
                  color: '#ffffff',
                }}
              >
                مدفوع
              </span>
            )}
          </div>
        </div>

        <div style={{ height: '1px', background: '#e2e8f0', margin: '2px 0' }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '14px',
            color: '#64748b',
            fontWeight: 500,
          }}
        >
          <span>الإجمالي</span>
          <span
            style={{
              fontSize: '15.5px',
              fontWeight: 600,
              color: '#0f172a',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            <span>{formatPriceNumber(order.totalAmount)}</span>
            <CurrencySymbol currency={currCode} />
          </span>
        </div>
      </div>
    </div>
  );
}
