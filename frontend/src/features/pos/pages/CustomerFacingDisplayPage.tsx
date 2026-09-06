import { useEffect, useMemo, useState } from 'react';
import type { CustomerDisplayPayload } from '@/features/pos/types/pos-customer-display.types';
import {
  getCustomerDisplayInitialState,
  subscribeCustomerDisplayState,
} from '@/features/pos/lib/pos-customer-display-bridge';
import { buildQrSvg } from '@/lib/qrcode';
import { formatCurrency } from '@/lib/format';
import {
  TagIcon,
  AwardIcon,
  CreditCardIcon,
  TruckIcon,
  QrCodeIcon,
  CheckIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  ClockIcon,
  Maximize2Icon,
  Minimize2Icon,
} from '@/shared/components/icons/AppIcons';

const DEFAULT_PROMOTIONS = [
  {
    id: 'promo-1',
    title: 'عروض وتخفيضات حصرية بالمعرض',
    subtitle: 'اكتشف عروضنا اليومية المتجددة على تشكيلة واسعة من المنتجات المختارة بعناية بأفضل الأسعار التنافسية.',
    badge: 'توفير استثنائي',
    icon: <TagIcon size={26} color="#170e5e" />,
  },
  {
    id: 'promo-2',
    title: 'برنامج ولاء ومكافآت العملاء',
    subtitle: 'اجمع نقاطاً مع كل فاتورة شراء واستبدلها بخصومات مالية فورية على مشترياتك القادمة.',
    badge: 'نقاط ومكافآت',
    icon: <AwardIcon size={26} color="#170e5e" />,
  },
  {
    id: 'promo-3',
    title: 'سداد إلكتروني فوري وسلس',
    subtitle: 'ادفع بأمان وسرعة عبر تطبيق InstaPay أو المحافظ الإلكترونية وكروت الدفع البنكي.',
    badge: 'دفع ذكي',
    icon: <CreditCardIcon size={26} color="#170e5e" />,
  },
  {
    id: 'promo-4',
    title: 'خدمة التوصيل السريع للمنازل',
    subtitle: 'اطلب من خلال المتجر الإلكتروني أو الواتساب لتصلك مشترياتك حتى باب بيتك بأسرع وقت.',
    badge: 'دليفري سريع',
    icon: <TruckIcon size={26} color="#170e5e" />,
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

  // Loyalty QR Code SVG for Idle Screen
  const storefrontUrl = typeof window !== 'undefined' ? `${window.location.origin}/storefront` : '';
  const loyaltyQrSvg = useMemo(() => {
    return buildQrSvg(storefrontUrl || 'https://z-systems.app', {
      size: 140,
      quietZone: 1,
      color: '#170e5e',
      bgColor: '#ffffff',
    });
  }, [storefrontUrl]);

  // Determine latest added item key for visual feedback
  const latestItemKey = useMemo(() => {
    if (!payload.items || payload.items.length === 0) return null;
    return payload.items[payload.items.length - 1]?.id;
  }, [payload.items]);

  const activePromo = DEFAULT_PROMOTIONS[promoIndex] || DEFAULT_PROMOTIONS[0];

  return (
    <div className="cfd-container" dir="rtl">
      {/* Top Header Bar */}
      <header className="cfd-header">
        <div className="cfd-brand-section">
          <div className="cfd-logo-badge" aria-hidden="true">
            <ShoppingCartIcon size={22} color="#ffffff" />
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
            <ClockIcon size={16} color="#170e5e" />
            <span style={{ fontWeight: 800, color: '#170e5e', fontFamily: 'monospace' }}>{currentTime}</span>
            <span style={{ opacity: 0.3, margin: '0 4px' }}>|</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{currentDate}</span>
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
            {isFullscreen ? <Minimize2Icon size={18} /> : <Maximize2Icon size={18} />}
          </button>
        </div>
      </header>

      {/* Main Screen Body */}
      <main className="cfd-main">
        {/* ====================================================
            STATE 1: IDLE SCREEN (ترحيب وعروض المتجر الفاخرة)
            ==================================================== */}
        {payload.status === 'idle' && (
          <div className="cfd-idle-view">
            {/* Split Symmetrical 2-Column Luxury Layout */}
            <div className="cfd-idle-grid">
              {/* Right Column: Brand Welcome & Value Propositions */}
              <div className="cfd-idle-hero-card">
                {/* Welcome Store Showcase */}
                <div className="cfd-idle-welcome-top">
                  <div className="cfd-idle-avatar">
                    <ShoppingCartIcon size={32} color="#ffffff" />
                  </div>
                  <div>
                    <h2 className="cfd-idle-headline">
                      أهلاً وسهلاً بكم في {payload.storeName}
                    </h2>
                    <p className="cfd-idle-subheadline">
                      نسعد بخدمتكم وتوفير أفضل تجربة تسوق. تفضل بتقديم مشترياتك للكاشير وسيقوم بمسحها على الفور.
                    </p>
                  </div>
                </div>

                {/* Rotating Value Proposition Deck */}
                <div className="cfd-idle-feature-deck">
                  <div className="cfd-feature-deck-header">
                    <span className="cfd-feature-badge">{activePromo.badge}</span>
                    <div className="cfd-feature-dots">
                      {DEFAULT_PROMOTIONS.map((_, idx) => (
                        <span
                          key={idx}
                          onClick={() => setPromoIndex(idx)}
                          className={`cfd-feature-dot ${idx === promoIndex ? 'is-active' : ''}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="cfd-feature-deck-body">
                    <div className="cfd-feature-icon-box">{activePromo.icon}</div>
                    <div>
                      <h3 className="cfd-feature-title">{activePromo.title}</h3>
                      <p className="cfd-feature-desc">{activePromo.subtitle}</p>
                    </div>
                  </div>
                </div>

                {/* Trust & Official Guarantee Badges */}
                <div className="cfd-trust-strip">
                  <div className="cfd-trust-item">
                    <ReceiptIcon size={18} color="#170e5e" />
                    <div>
                      <div className="cfd-trust-title">فاتورة إلكترونية معتمدة</div>
                      <div className="cfd-trust-sub">متوافقة ضريبياً وموثقة</div>
                    </div>
                  </div>

                  <div className="cfd-trust-item">
                    <ShieldCheckIcon size={18} color="#170e5e" />
                    <div>
                      <div className="cfd-trust-title">ضمان واستبدال فوري</div>
                      <div className="cfd-trust-sub">جودة وأصالة معتمدة 100%</div>
                    </div>
                  </div>

                  <div className="cfd-trust-item">
                    <CreditCardIcon size={18} color="#170e5e" />
                    <div>
                      <div className="cfd-trust-title">سداد إلكتروني آمن</div>
                      <div className="cfd-trust-sub">InstaPay وفيزا ومحافظ</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Left Column: Smart Interactive Customer Kiosk */}
              <div className="cfd-idle-kiosk-card">
                {/* QR Engagement Box */}
                <div className="cfd-kiosk-qr-box">
                  <div className="cfd-kiosk-header">
                    <div className="cfd-kiosk-badge">
                      <QrCodeIcon size={16} color="#170e5e" />
                      <span>تفاعل رقمي ذكي</span>
                    </div>
                    <h3 className="cfd-kiosk-title">برنامج الولاء والخصومات</h3>
                    <p className="cfd-kiosk-desc">
                      امسح الرمز بهاتفك للانضمام لبرنامج نقاط العملاء وتلقي نسخة إلكترونية من فاتورتك عبر الواتساب فوراً.
                    </p>
                  </div>

                  <div className="cfd-kiosk-qr-container">
                    <div dangerouslySetInnerHTML={{ __html: loyaltyQrSvg }} />
                  </div>

                  <div className="cfd-kiosk-steps">
                    <div className="cfd-kiosk-step">
                      <span className="cfd-step-num">1</span>
                      <span>افتح الكاميرا</span>
                    </div>
                    <div className="cfd-kiosk-step">
                      <span className="cfd-step-num">2</span>
                      <span>امسح الـ QR</span>
                    </div>
                    <div className="cfd-kiosk-step">
                      <span className="cfd-step-num">3</span>
                      <span>اجمع نقاطك</span>
                    </div>
                  </div>
                </div>

                {/* Accepted Payment Gateways Box */}
                <div className="cfd-kiosk-payments-box">
                  <div className="cfd-payments-header">
                    <CreditCardIcon size={16} color="#170e5e" />
                    <span>وسائل الدفع المقبولة بصالة البيع</span>
                  </div>

                  <div className="cfd-payments-badges-grid">
                    <div className="cfd-payment-chip instapay">InstaPay فوري</div>
                    <div className="cfd-payment-chip cards">فيزا وماستركارد</div>
                    <div className="cfd-payment-chip meeza">كروت ميزة</div>
                    <div className="cfd-payment-chip wallets">المحافظ والموبايل كاش</div>
                    <div className="cfd-payment-chip cash">نقداً بالجنيه المصري</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer Note */}
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
                  <ShoppingCartIcon size={20} color="#170e5e" />
                  <span>سلة المشتريات الحالية</span>
                  <span className="cfd-item-count-badge">
                    {payload.itemCount} {payload.itemCount === 1 ? 'صنف' : 'أصناف'}
                  </span>
                </div>

                {payload.customer && (
                  <div className="cfd-customer-pill">
                    <AwardIcon size={16} color="#047857" />
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
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', marginBottom: '8px' }}>
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
                        ? 'الدفع عبر InstaPay'
                        : payload.payment?.channel === 'wallet'
                        ? 'الدفع بالمحفظة الإلكترونية'
                        : payload.payment?.channel === 'card'
                        ? 'الدفع بالبطاقة البنكية'
                        : 'الدفع نقداً'}
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
                      <div style={{ width: '100%', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                        <div className="cfd-summary-row" style={{ fontSize: '14px' }}>
                          <span>المدفوع:</span>
                          <span>{formatCurrency(payload.payment.paidAmount)}</span>
                        </div>
                        {payload.payment.change !== undefined && payload.payment.change > 0 && (
                          <div className="cfd-summary-row" style={{ fontSize: '16px', fontWeight: 900, color: '#16a34a' }}>
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
                <CheckIcon size={40} color="#16a34a" strokeWidth={2.5} />
              </div>

              <div className="cfd-completed-title">تمت عملية الشراء بنجاح!</div>
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
                    <div className="cfd-sale-meta-val" style={{ fontSize: '15px' }}>نقداً / إلكتروني</div>
                  </div>

                  {payload.completedSale.change > 0 && (
                    <div className="cfd-sale-change-box">
                      <div className="cfd-sale-meta-label" style={{ color: '#166534', fontSize: '14px' }}>
                        المتبقي المسترد للعميل
                      </div>
                      <div className="cfd-sale-meta-val">
                        {formatCurrency(payload.completedSale.change)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '14px' }}>
                سيتم العودة للشاشة الرئيسية تلقائياً خلال ثوانٍ...
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
export default CustomerFacingDisplayPage;
