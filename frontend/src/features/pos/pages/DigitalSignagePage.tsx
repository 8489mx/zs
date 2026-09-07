import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/features/products/api/products.api';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import {
  TagIcon,
  SettingsIcon,
  FlameIcon,
  QrCodeIcon,
  Maximize2Icon,
  XIcon,
  ShoppingCartIcon,
  AwardIcon,
  TruckIcon,
  PackageIcon,
} from '@/shared/components/icons/AppIcons';

interface SignagePromoItem {
  id: number | string;
  name: string;
  categoryName?: string;
  originalPrice: number;
  promoPrice: number;
  discountPercent: number;
  savingAmount: number;
  badge: string;
  barcode?: string;
  imageUrl?: string;
}

export function DigitalSignagePage() {
  const settingsQuery = useSettingsQuery();
  const settings = settingsQuery.data;

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [slideIntervalSec, setSlideIntervalSec] = useState<number>(8);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);
  const [customTickerText, setCustomTickerText] = useState<string>(
    'أهلاً بكم في صالة العرض • عروض وتخفيضات كبرى على مدار الأسبوع • امسح كود الـ QR للتسوق من هاتفك فورياً • نضمن لكم أعلى جودة بأفضل سعر'
  );
  const [viewFilter, setViewFilter] = useState<'offers' | 'all'>('offers');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Clock ticker
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

  // Fetch products
  const productsQuery = useQuery({
    queryKey: ['signage-products', viewFilter],
    queryFn: async () => {
      const res = await productsApi.listPage({
        page: 1,
        pageSize: 40,
        view: viewFilter === 'offers' ? 'offers' : 'all',
      });
      return res.products || [];
    },
    refetchInterval: 60000,
  });

  const rawProducts = productsQuery.data || [];

  // Transform products to promo items
  const promoItems: SignagePromoItem[] = useMemo(() => {
    if (!rawProducts.length) return [];

    return rawProducts.map((p, idx) => {
      const retail = Number(p.retailPrice) || 0;
      const promotionalPrice = (p as any).promotionalPrice ? Number((p as any).promotionalPrice) : null;
      const firstOffer = p.offers && p.offers.length > 0 ? p.offers[0] : null;
      const offerVal = firstOffer ? Number(firstOffer.value) : 0;
      let offerPrice: number | null = null;
      if (firstOffer && offerVal > 0) {
        if (firstOffer.type === 'percent') {
          offerPrice = Math.max(0, retail * (1 - offerVal / 100));
        } else if (firstOffer.type === 'fixed') {
          offerPrice = Math.max(0, retail - offerVal);
        }
      }

      const calculatedPromoPrice = promotionalPrice || offerPrice || (retail > 0 ? retail * 0.85 : 100);
      const originalPrice = retail > 0 ? retail : calculatedPromoPrice * 1.25;
      const savingAmount = Math.max(0, originalPrice - calculatedPromoPrice);
      const discountPercent =
        originalPrice > 0 ? Math.round((savingAmount / originalPrice) * 100) : 15;

      const badges = ['عرض خاص', 'أفضل مبيعاً', 'صفقة اليوم', 'تخفيض محدود', 'سعر حصري'];
      const badge = (p as any).badge || badges[idx % badges.length];

      return {
        id: p.id,
        name: p.name,
        categoryName: (p as any).category?.name || 'القسم الرئيسي',
        originalPrice,
        promoPrice: calculatedPromoPrice,
        discountPercent: discountPercent > 0 ? discountPercent : 15,
        savingAmount,
        badge,
        barcode: p.barcode || (p as any).sku || '',
        imageUrl: (p as any).imageUrl || '',
      };
    });
  }, [rawProducts]);

  // Automatic Carousel Ticker
  useEffect(() => {
    if (!promoItems.length || isPaused) return;

    const tickIntervalMs = 100;
    const totalTicks = (slideIntervalSec * 1000) / tickIntervalMs;
    let tickCount = 0;

    const timer = setInterval(() => {
      tickCount += 1;
      const percent = Math.min(100, (tickCount / totalTicks) * 100);
      setProgressPercent(percent);

      if (tickCount >= totalTicks) {
        tickCount = 0;
        setCurrentIndex((prev) => (prev + 1) % promoItems.length);
        setProgressPercent(0);
      }
    }, tickIntervalMs);

    return () => clearInterval(timer);
  }, [isPaused, promoItems.length, slideIntervalSec, currentIndex]);

  const activeItem = promoItems[currentIndex] || null;

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const storeName = settings?.storeName || 'مؤسستنا التجارية';
  const currencyCode = settings?.currency || 'ج.م';
  const storefrontUrl = typeof window !== 'undefined' ? `${window.location.origin}/storefront` : '';

  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    storefrontUrl
  )}&bgcolor=ffffff&color=170e5e&margin=2`;

  const MarqueeTag = 'marquee' as any;

  return (
    <div
      dir="rtl"
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          padding: '12px 28px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
          zIndex: 20,
        }}
      >
        {/* Store Brand & Live Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #170e5e 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(23, 14, 94, 0.2)',
            }}
          >
            <ShoppingCartIcon size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: 900,
                  letterSpacing: '-0.3px',
                  color: '#0f172a',
                }}
              >
                {storeName}
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  backgroundColor: '#f0fdf4',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                  padding: '2px 8px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#16a34a',
                    display: 'inline-block',
                  }}
                />
                <span>بث مباشر بصالة العرض</span>
              </span>
            </div>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: '12px',
                color: '#64748b',
                fontWeight: 600,
              }}
            >
              شاشة العروض الترويجية والصفقات الحصرية • Digital Showroom Board
            </p>
          </div>
        </div>

        {/* Live Clock & Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'left', direction: 'ltr' }}>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 900,
                fontFamily: 'monospace',
                color: '#170e5e',
                letterSpacing: '1px',
              }}
            >
              {currentTime}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, direction: 'rtl' }}>
              {currentDate}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleToggleFullscreen}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                borderRadius: '10px',
                width: '38px',
                height: '38px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
                transition: 'all 0.15s ease',
              }}
              title="ملء الشاشة"
            >
              <Maximize2Icon size={18} color="#334155" />
            </button>

            <button
              type="button"
              onClick={() => setShowSettingsDrawer((prev) => !prev)}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#170e5e',
                borderRadius: '10px',
                width: '38px',
                height: '38px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
                transition: 'all 0.15s ease',
              }}
              title="إعدادات الشاشة وسرعة العرض"
            >
              <SettingsIcon size={18} color="#170e5e" />
            </button>
          </div>
        </div>
      </header>

      {/* Progress Bar for Current Slide */}
      <div style={{ width: '100%', height: '4px', backgroundColor: '#e2e8f0' }}>
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg, #170e5e 0%, #2563eb 100%)',
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      {/* Main Promo Stage */}
      <main
        style={{
          flex: 1,
          padding: '20px 28px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)',
          gap: '24px',
          alignItems: 'stretch',
          overflow: 'hidden',
          zIndex: 10,
        }}
      >
        {/* Right (in RTL): Giant Featured Promo Hero Card */}
        {activeItem ? (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 8px 28px -4px rgba(15, 23, 42, 0.06), 0 0 1px 1px rgba(15, 23, 42, 0.02)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top Badges & Indicator */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: 900,
                      padding: '6px 16px',
                      borderRadius: '30px',
                      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <FlameIcon size={14} color="#ffffff" />
                    <span>{activeItem.badge}</span>
                  </span>

                  <span
                    style={{
                      backgroundColor: '#f1f5f9',
                      color: '#170e5e',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 800,
                      padding: '6px 14px',
                      borderRadius: '20px',
                    }}
                  >
                    {activeItem.categoryName}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {activeItem.discountPercent > 0 && (
                    <div
                      style={{
                        backgroundColor: '#f0fdf4',
                        color: '#166534',
                        border: '1px solid #bbf7d0',
                        fontSize: '16px',
                        fontWeight: 900,
                        padding: '5px 14px',
                        borderRadius: '12px',
                      }}
                    >
                      خصم {activeItem.discountPercent}%
                    </div>
                  )}

                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      padding: '4px 10px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: '#64748b',
                      fontWeight: 800,
                    }}
                  >
                    {currentIndex + 1} من {promoItems.length}
                  </div>
                </div>
              </div>

              {/* Showcase Deck (Centered Product Presentation) */}
              <div
                style={{
                  marginTop: '20px',
                  marginBottom: '20px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '24px',
                }}
              >
                <div
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '18px',
                    background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
                    border: '1px solid #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
                  }}
                >
                  <TagIcon size={56} color="#170e5e" strokeWidth={1.75} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: '32px',
                      fontWeight: 900,
                      lineHeight: 1.3,
                      color: '#0f172a',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {activeItem.name}
                  </h2>

                  {activeItem.barcode && (
                    <div
                      style={{
                        fontSize: '13px',
                        color: '#64748b',
                        marginTop: '6px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        backgroundColor: '#ffffff',
                        display: 'inline-block',
                        padding: '2px 10px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      كود الصنف: {activeItem.barcode}
                    </div>
                  )}

                  {/* Highlights / Perks Pills */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        border: '1px solid #bfdbfe',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <AwardIcon size={12} color="#1d4ed8" />
                      <span>منتج أصلي ومضمون 100%</span>
                    </span>

                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: '#f0fdf4',
                        color: '#166534',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        border: '1px solid #bbf7d0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <TruckIcon size={12} color="#166534" />
                      <span>تسليم فوري من صالة العرض</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom: Price Mega Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '2px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px 28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
              }}
            >
              <div>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 700 }}>السعر السابق</span>
                <div
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: '#94a3b8',
                    textDecoration: 'line-through',
                    marginTop: '2px',
                  }}
                >
                  {activeItem.originalPrice.toFixed(2)} {currencyCode}
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: '#166534',
                    backgroundColor: '#dcfce7',
                    border: '1px solid #bbf7d0',
                    padding: '3px 12px',
                    borderRadius: '20px',
                  }}
                >
                  وفر {activeItem.savingAmount.toFixed(2)} {currencyCode}
                </span>
                <div
                  style={{
                    fontSize: '46px',
                    fontWeight: 900,
                    color: '#170e5e',
                    letterSpacing: '-1px',
                    marginTop: '2px',
                  }}
                >
                  {activeItem.promoPrice.toFixed(2)}{' '}
                  <span style={{ fontSize: '20px', fontWeight: 800 }}>{currencyCode}</span>
                </div>
              </div>

              <div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#170e5e',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 800,
                    padding: '12px 20px',
                    borderRadius: '10px',
                    boxShadow: '0 4px 12px rgba(23, 14, 94, 0.25)',
                  }}
                >
                  <PackageIcon size={16} color="#ffffff" />
                  <span>متوفر بصالة العرض</span>
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              fontSize: '18px',
              fontWeight: 700,
              color: '#64748b',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
            }}
          >
            جاري تحميل عروض ومنتجات صالة العرض...
          </div>
        )}

        {/* Left (in RTL): Upcoming Offers List + Showroom Perks + Storefront QR */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            justifyContent: 'space-between',
          }}
        >
          {/* Upcoming Deals Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <FlameIcon size={18} color="#ea580c" />
              <span>عروض إضافية بالمعرض</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>({promoItems.length} عرض متوفر)</span>
            </div>

            {promoItems
              .filter((_, idx) => idx !== currentIndex)
              .slice(0, 2)
              .map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    const foundIdx = promoItems.findIndex((p) => p.id === item.id);
                    if (foundIdx !== -1) setCurrentIndex(foundIdx);
                  }}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <TagIcon size={18} color="#170e5e" />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                        {item.name}
                      </h4>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{item.categoryName}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', textDecoration: 'line-through' }}>
                      {item.originalPrice.toFixed(2)} {currencyCode}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#170e5e' }}>
                      {item.promoPrice.toFixed(2)} {currencyCode}
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Showroom Perks Box (Fills Empty Space Professionally) */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#170e5e', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AwardIcon size={16} color="#170e5e" />
              <span>مزايا التسوق في صالة العرض</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>فحص وتجربة فورية</div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>معاينة المنتج قبل الشراء</div>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>دفع إلكتروني آمن</div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>InstaPay ومحافظ وفيزا</div>
              </div>
            </div>
          </div>

          {/* Storefront QR Code Card for Customers */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '4px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid #e2e8f0',
              }}
            >
              <img
                src={qrSvgUrl}
                alt="Storefront QR Code"
                style={{ width: '80px', height: '80px', display: 'block' }}
              />
            </div>

            <div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 900,
                  color: '#170e5e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <QrCodeIcon size={16} color="#170e5e" />
                <span>اطلب فورياً من هاتفك</span>
              </div>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: '11px',
                  color: '#64748b',
                  lineHeight: 1.5,
                }}
              >
                وجّه كاميرا هاتفك نحو رمز الـ QR لتصفح كامل الكتالوج والطلب والتوصيل بضغطة واحدة!
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Live Marquee Ticker Bar */}
      <footer
        style={{
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 -2px 10px rgba(15, 23, 42, 0.03)',
          zIndex: 20,
        }}
      >
        <div
          style={{
            backgroundColor: '#170e5e',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 900,
            padding: '5px 12px',
            borderRadius: '6px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>نشرة العروض</span>
        </div>

        {/* Marquee text */}
        <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <MarqueeTag
            behavior="scroll"
            direction="right"
            scrollamount="6"
            style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}
          >
            {customTickerText}
          </MarqueeTag>
        </div>

        {/* Slide Counter & Pause */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            style={{
              backgroundColor: isPaused ? '#fee2e2' : '#f1f5f9',
              color: isPaused ? '#dc2626' : '#334155',
              border: `1px solid ${isPaused ? '#fecaca' : '#cbd5e1'}`,
              padding: '5px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 700,
              transition: 'all 0.15s ease',
            }}
          >
            {isPaused ? 'استئناف' : 'إيقاف مؤقت'}
          </button>

          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
            {promoItems.length > 0 ? `${currentIndex + 1} / ${promoItems.length}` : '0/0'}
          </span>
        </div>
      </footer>

      {/* Settings Modal Drawer */}
      {showSettingsDrawer && (
        <div
          dir="rtl"
          style={{
            position: 'absolute',
            top: '70px',
            left: '28px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '20px',
            width: '340px',
            boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.15)',
            zIndex: 50,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 800, fontSize: '15px' }}>
              <SettingsIcon size={16} color="#170e5e" />
              <span>إعدادات شاشة العروض</span>
            </div>
            <button
              type="button"
              onClick={() => setShowSettingsDrawer(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <XIcon size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                سرعة تبديل الشرائح (ثواني):
              </label>
              <select
                value={slideIntervalSec}
                onChange={(e) => setSlideIntervalSec(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#f8fafc',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  fontWeight: 600,
                }}
              >
                <option value={5}>5 ثوانٍ (سريع)</option>
                <option value={8}>8 ثوانٍ (افتراضي - ممتاز)</option>
                <option value={12}>12 ثانية (متأنٍ)</option>
                <option value={20}>20 ثانية (بطيء)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                مصدر الأصناف المعروضة:
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setViewFilter('offers')}
                  style={{
                    flex: 1,
                    padding: '7px',
                    borderRadius: '6px',
                    border: `1px solid ${viewFilter === 'offers' ? '#170e5e' : '#cbd5e1'}`,
                    backgroundColor: viewFilter === 'offers' ? '#170e5e' : '#f8fafc',
                    color: viewFilter === 'offers' ? '#ffffff' : '#334155',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  العروض فقط
                </button>
                <button
                  type="button"
                  onClick={() => setViewFilter('all')}
                  style={{
                    flex: 1,
                    padding: '7px',
                    borderRadius: '6px',
                    border: `1px solid ${viewFilter === 'all' ? '#170e5e' : '#cbd5e1'}`,
                    backgroundColor: viewFilter === 'all' ? '#170e5e' : '#f8fafc',
                    color: viewFilter === 'all' ? '#ffffff' : '#334155',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  كل المنتجات
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                نص الشريط المتحرك السفلي:
              </label>
              <textarea
                value={customTickerText}
                onChange={(e) => setCustomTickerText(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#f8fafc',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  resize: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default DigitalSignagePage;
