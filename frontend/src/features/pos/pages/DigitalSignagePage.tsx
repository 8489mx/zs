import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/features/products/api/products.api';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { SignagePromoItem } from '../components/signage/types';
import { SignageHeader } from '../components/signage/SignageHeader';
import { SignageHeroCard } from '../components/signage/SignageHeroCard';
import { SignageSideDeck } from '../components/signage/SignageSideDeck';
import { SignageMarqueeFooter } from '../components/signage/SignageMarqueeFooter';
import { SignageSettingsDrawer } from '../components/signage/SignageSettingsDrawer';
import { SignageNavDrawer } from '../components/signage/SignageNavDrawer';

export function DigitalSignagePage() {
  const settingsQuery = useSettingsQuery();
  const settings = settingsQuery.data;

  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [slideIntervalSec, setSlideIntervalSec] = useState<number>(8);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);
  const [showNavDrawer, setShowNavDrawer] = useState<boolean>(false);
  const [customTickerText, setCustomTickerText] = useState<string>(
    'أهلاً بكم في صالة العرض • عروض وتخفيضات كبرى على مدار الأسبوع • امسح كود الـ QR للتسوق من هاتفك فورياً • نضمن لكم أعلى جودة بأفضل سعر'
  );
  const [viewFilter, setViewFilter] = useState<'offers' | 'all'>('offers');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  const handleGoBack = () => {
    navigate('/displays');
  };

  // Keyboard navigation & Esc listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' ||
        (e.altKey && e.key === 'Backspace') ||
        (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'))
      ) {
        if (showNavDrawer) {
          setShowNavDrawer(false);
        } else if (showSettingsDrawer) {
          setShowSettingsDrawer(false);
        } else if (!document.fullscreenElement) {
          handleGoBack();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showNavDrawer, showSettingsDrawer]);

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
      <SignageHeader
        storeName={storeName}
        currentTime={currentTime}
        currentDate={currentDate}
        progressPercent={progressPercent}
        onToggleFullscreen={handleToggleFullscreen}
        onToggleSettings={() => setShowSettingsDrawer((prev) => !prev)}
        onBack={handleGoBack}
        onToggleNavMenu={() => setShowNavDrawer((prev) => !prev)}
      />

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
        {activeItem ? (
          <SignageHeroCard
            activeItem={activeItem}
            currentIndex={currentIndex}
            totalItems={promoItems.length}
            currencyCode={currencyCode}
          />
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

        <SignageSideDeck
          promoItems={promoItems}
          currentIndex={currentIndex}
          onSelectItem={(idx) => setCurrentIndex(idx)}
          currencyCode={currencyCode}
          qrSvgUrl={qrSvgUrl}
        />
      </main>

      {/* Bottom Live Marquee Ticker Bar */}
      <SignageMarqueeFooter
        customTickerText={customTickerText}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused((prev) => !prev)}
        currentIndex={currentIndex}
        totalItems={promoItems.length}
      />

      {/* Settings Modal Drawer */}
      {showSettingsDrawer && (
        <SignageSettingsDrawer
          onClose={() => setShowSettingsDrawer(false)}
          slideIntervalSec={slideIntervalSec}
          onSlideIntervalChange={setSlideIntervalSec}
          viewFilter={viewFilter}
          onViewFilterChange={setViewFilter}
          customTickerText={customTickerText}
          onCustomTickerTextChange={setCustomTickerText}
        />
      )}

      {/* Quick Navigation Drawer */}
      <SignageNavDrawer
        isOpen={showNavDrawer}
        onClose={() => setShowNavDrawer(false)}
        onBack={handleGoBack}
        storeName={storeName}
      />
    </div>
  );
}

export default DigitalSignagePage;
