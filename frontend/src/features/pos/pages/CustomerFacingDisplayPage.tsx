import { useEffect, useMemo, useState } from 'react';
import type { CustomerDisplayPayload } from '@/features/pos/types/pos-customer-display.types';
import {
  getCustomerDisplayInitialState,
  subscribeCustomerDisplayState,
} from '@/features/pos/lib/pos-customer-display-bridge';
import { buildQrSvg } from '@/lib/qrcode';
import { formatCurrency } from '@/lib/format';

const DEFAULT_PROMOTIONS = [
  {
    id: 'promo-1',
    title: 'عروض وخصومات حصرية',
    subtitle: 'اكتشف عروضنا اليومية المتجددة على تشكيلة واسعة من الأصناف والمنتجات المختارة بعناية.',
    badge: 'توفير مميز',
    icon: '🏷️',
  },
  {
    id: 'promo-2',
    title: 'برنامج ولاء العملاء',
    subtitle: 'اجمع نقاطاً مع كل عملية شراء واستبدلها بخصومات مباشرة على فواتيرك القادمة فورياً.',
    badge: 'نقاط ومكافآت',
    icon: '⭐',
  },
  {
    id: 'promo-3',
    title: 'سداد إلكتروني فوري وسلس',
    subtitle: 'ادفع بأمان وسرعة عبر تطبيق InstaPay أو المحافظ الإلكترونية بالمسح المباشر لرمز الـ QR.',
    badge: 'دفع ذكي',
    icon: '📱',
  },
  {
    id: 'promo-4',
    title: 'خدمة التوصيل السريع للمنازل',
    subtitle: 'اطلب من خلال المتجر الإلكتروني أو الواتساب لتصلك طلباتك بأسرع وقت حتى باب بيتك.',
    badge: 'دليفري سريع',
    icon: '🛵',
  },
];

export function CustomerFacingDisplayPage() {
  const [payload, setPayload] = useState<CustomerDisplayPayload>(() => {
    return (
      getCustomerDisplayInitialState() || {
        status: 'idle',
        storeName: 'Z-Systems Store',
        items: [],
        subtotal: 0,
        discount: 0,
        tax: 0,
        total: 0,
        itemCount: 0,
        updatedAt: Date.now(),
      }
    );
  });

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [promoIndex, setPromoIndex] = useState<number>(0);

  // 1. Subscribe to POS real-time updates (via BroadcastChannel & storage)
  useEffect(() => {
    const unsubscribe = subscribeCustomerDisplayState((nextPayload) => {
      setPayload(nextPayload);
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time digital clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('ar-EG', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Promotional banner rotation for Idle state
  useEffect(() => {
    if (payload.status !== 'idle') return;
    const interval = setInterval(() => {
      setPromoIndex((prev) => (prev + 1) % DEFAULT_PROMOTIONS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [payload.status]);

  // 4. Auto-revert completed screen back to idle after 12 seconds if inactive
  useEffect(() => {
    if (payload.status !== 'completed') return;
    const timer = setTimeout(() => {
      setPayload((prev) => {
        if (prev.status === 'completed') {
          return { ...prev, status: 'idle', items: [], total: 0 };
        }
        return prev;
      });
    }, 12000);
    return () => clearTimeout(timer);
  }, [payload.status, payload.updatedAt]);

  // Fullscreen toggle handler
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // QR Code SVG for payment
  const qrSvg = useMemo(() => {
    if (!payload.payment?.qrData) return '';
    return buildQrSvg(payload.payment.qrData, {
      size: 160,
      quietZone: 1,
      color: '#170e5e',
      bgColor: '#ffffff',
    });
  }, [payload.payment?.qrData]);

  // Determine latest added item key for visual feedback
  const latestItemKey = useMemo(() => {
    if (!payload.items || payload.items.length === 0) return null;
    return payload.items[payload.items.length - 1]?.id;
  }, [payload.items]);

  return (
    <div className="cfd-container" dir="rtl">
      {/* Top Header Bar */}
      <header className="cfd-header">
        <div className="cfd-brand-section">
          <div className="cfd-logo-badge" aria-hidden="true">
            {payload.storeName?.trim()?.charAt(0)?.toUpperCase() || 'Z'}
          </div>
          <div>
            <div className="cfd-store-name">{payload.storeName || 'مؤسستنا التجارية'}</div>
            {payload.branchName && (
              <span className="cfd-branch-badge">{payload.branchName}</span>
            )}
          </div>
        </div>

        <div className="cfd-header-meta">
          <div className="cfd-clock-badge">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{currentTime}</span>
            <span style={{ opacity: 0.4, margin: '0 4px' }}>|</span>
            <span style={{ fontSize: '13px', fontWeight: 500 }}>{currentDate}</span>
          </div>

          <div className="cfd-status-pill">
            <span className="cfd-status-dot" aria-hidden="true" />
            <span>بث مباشر للكاشير</span>
          </div>

          <button
            type="button"
            className="cfd-fullscreen-btn"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Main Screen Body */}
      <main className="cfd-main">
        {/* ====================================================
            STATE 1: IDLE SCREEN (ترحيب وعروض المتجر)
            ==================================================== */}
        {payload.status === 'idle' && (
          <div className="cfd-idle-view">
            <div className="cfd-welcome-card">
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: '#f1f5f9',
                  fontSize: '32px',
                  marginBottom: '16px',
                }}
              >
                👋
              </div>
              <div className="cfd-welcome-title">أهلاً وسهلاً بكم في {payload.storeName}</div>
              <div className="cfd-welcome-subtitle">
                نسعد بخدمتكم وتوفير أفضل تجربة تسوق. تفضل بتقديم مشترياتك للكاشير وسيقوم بمسحها على الفور.
              </div>
            </div>

            {/* Promotional Cards Grid */}
            <div className="cfd-promo-grid">
              {DEFAULT_PROMOTIONS.map((promo, idx) => (
                <div
                  key={promo.id}
                  className="cfd-promo-card"
                  style={{
                    border: idx === promoIndex ? '1.5px solid #170e5e' : undefined,
                    background: idx === promoIndex ? '#fdfdff' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="cfd-promo-icon-wrap">{promo.icon}</div>
                    <span className="cfd-promo-badge">{promo.badge}</span>
                  </div>
                  <div className="cfd-promo-title">{promo.title}</div>
                  <div className="cfd-promo-desc">{promo.subtitle}</div>
                </div>
              ))}
            </div>

            <div className="cfd-footer-note">
              نظام المحاسبة ونقاط البيع السحابي Z-Systems • خدمة العملاء الرقمية المتطورة
            </div>
          </div>
        )}

        {/* ====================================================
            STATE 2 & 3: SCANNING OR PAYMENT
            ==================================================== */}
        {(payload.status === 'scanning' || payload.status === 'payment') && (
          <div className="cfd-scanning-layout">
            {/* Right Column: Cart Items List */}
            <div className="cfd-cart-card">
              <div className="cfd-cart-header">
                <div className="cfd-cart-header-title">
                  <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                  <span>سلة المشتريات الحالية</span>
                  <span className="cfd-item-count-badge">
                    {payload.itemCount} {payload.itemCount === 1 ? 'صنف' : 'أصناف'}
                  </span>
                </div>

                {payload.customer && (
                  <div className="cfd-customer-pill">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>عميلنا العزيز: {payload.customer.name}</span>
                    {typeof payload.customer.loyaltyPoints === 'number' && (
                      <span style={{ fontWeight: 800, color: '#047857' }}>
                        ({payload.customer.loyaltyPoints} نقطة)
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="cfd-cart-items-scroll">
                {payload.items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                    في انتظار مسح الأصناف بواسطة الكاشير...
                  </div>
                ) : (
                  payload.items.map((item) => {
                    const isLatest = item.id === latestItemKey;
                    return (
                      <div
                        key={item.id}
                        className={`cfd-item-row ${isLatest ? 'is-latest' : ''}`}
                      >
                        <div className="cfd-item-info">
                          <span className="cfd-item-name">{item.name}</span>
                          {item.barcode && (
                            <span className="cfd-item-barcode">باركود: {item.barcode}</span>
                          )}
                        </div>

                        <div className="cfd-item-unit-price">
                          {formatCurrency(item.price)}
                        </div>

                        <div className="cfd-item-qty-badge" title="الكمية">
                          ×{item.qty}
                        </div>

                        <div className="cfd-item-total">
                          {formatCurrency(item.lineTotal)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Left Column: Totals & Payment Summary */}
            <div className="cfd-summary-card">
              <div className="cfd-summary-section">
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  ملخص الحساب
                </div>

                <div className="cfd-summary-row">
                  <span>المجموع الفرعي</span>
                  <span>{formatCurrency(payload.subtotal)}</span>
                </div>

                {payload.discount > 0 && (
                  <div className="cfd-summary-row discount">
                    <span>الخصم المطبق</span>
                    <span>- {formatCurrency(payload.discount)}</span>
                  </div>
                )}

                {payload.tax > 0 && (
                  <div className="cfd-summary-row">
                    <span>ضريبة القيمة المضافة</span>
                    <span>+ {formatCurrency(payload.tax)}</span>
                  </div>
                )}

                <div className="cfd-total-banner">
                  <div className="cfd-total-label">المبلغ الإجمالي المطلوب سداده</div>
                  <div className="cfd-total-amount">
                    {payload.total.toFixed(2)}
                    <span className="cfd-total-currency">ج.م</span>
                  </div>
                </div>

                {/* Instant QR Payment Box */}
                {payload.status === 'payment' && (
                  <div className="cfd-payment-box">
                    <span className="cfd-payment-channel-badge">
                      {payload.payment?.channel === 'instapay'
                        ? 'الدفع عبر InstaPay ⚡'
                        : payload.payment?.channel === 'wallet'
                        ? 'الدفع بالمحفظة الإلكترونية 📱'
                        : payload.payment?.channel === 'card'
                        ? 'الدفع بالبطاقة البنكية 💳'
                        : 'الدفع نقداً 💵'}
                    </span>

                    {qrSvg ? (
                      <div className="cfd-qr-container">
                        <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
                      </div>
                    ) : null}

                    {payload.payment?.qrLabel && (
                      <div className="cfd-payment-instruction">{payload.payment.qrLabel}</div>
                    )}

                    {payload.payment?.paidAmount && payload.payment.paidAmount > 0 ? (
                      <div style={{ width: '100%', borderTop: '1px solid #e9d5ff', paddingTop: '10px' }}>
                        <div className="cfd-summary-row" style={{ fontSize: '14px' }}>
                          <span>المدفوع:</span>
                          <span>{formatCurrency(payload.payment.paidAmount)}</span>
                        </div>
                        {payload.payment.change !== undefined && payload.payment.change > 0 && (
                          <div className="cfd-summary-row" style={{ fontSize: '15px', fontWeight: 800, color: '#16a34a' }}>
                            <span>المتبقي للعميل:</span>
                            <span>{formatCurrency(payload.payment.change)}</span>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="cfd-footer-note">
                يرجى مراجعة الأصناف والأسعار قبل الدفع • شكراً لزيارتكم
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            STATE 4: SALE COMPLETED CELEBRATION
            ==================================================== */}
        {payload.status === 'completed' && (
          <div className="cfd-completed-view">
            <div className="cfd-completed-card">
              <div className="cfd-success-icon-wrap" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <div className="cfd-completed-title">تمت عملية الشراء بنجاح! 💚</div>
              <div className="cfd-completed-subtitle">
                شكراً لتسوقكم معنا في {payload.storeName}. نسعد دائماً بخدمتكم ونتطلع لرؤيتكم قريباً!
              </div>

              {payload.completedSale && (
                <div className="cfd-sale-meta-grid">
                  <div className="cfd-sale-meta-box">
                    <div className="cfd-sale-meta-label">رقم الفاتورة</div>
                    <div className="cfd-sale-meta-val">#{payload.completedSale.docNo}</div>
                  </div>

                  <div className="cfd-sale-meta-box">
                    <div className="cfd-sale-meta-label">المبلغ الإجمالي</div>
                    <div className="cfd-sale-meta-val">{formatCurrency(payload.completedSale.total)}</div>
                  </div>

                  <div className="cfd-sale-meta-box">
                    <div className="cfd-sale-meta-label">المبلغ المدفوع</div>
                    <div className="cfd-sale-meta-val">{formatCurrency(payload.completedSale.paidAmount)}</div>
                  </div>

                  <div className="cfd-sale-meta-box">
                    <div className="cfd-sale-meta-label">طريقة السداد</div>
                    <div className="cfd-sale-meta-val" style={{ fontSize: '16px' }}>نقداً / إلكتروني</div>
                  </div>

                  {payload.completedSale.change > 0 && (
                    <div className="cfd-sale-change-box">
                      <div className="cfd-sale-meta-label" style={{ color: '#166534', fontSize: '15px' }}>
                        المتبقي المسترد للعميل
                      </div>
                      <div className="cfd-sale-meta-val">
                        {formatCurrency(payload.completedSale.change)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '10px' }}>
                سيتم العودة للشاشة الرئيسية تلقائياً خلال ثوانٍ...
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
