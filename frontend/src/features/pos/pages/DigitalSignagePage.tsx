import { useTranslation } from 'react-i18next';
import { getGlobalSystemCurrency } from '@/lib/currencies';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/features/products/api/products.api';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { subscribeSignageOffersUpdate } from '@/features/pos/lib/pos-customer-display-bridge';
import { SignagePromoItem, SignageTheme } from '../components/signage/types';
import { useIsolatedDisplayLanguage } from '@/features/pos/hooks/useIsolatedDisplayLanguage';
import { SignageHeader } from '../components/signage/SignageHeader';
import { SignageHeroCard } from '../components/signage/SignageHeroCard';
import { SignageSideDeck } from '../components/signage/SignageSideDeck';
import { SignageMarqueeFooter } from '../components/signage/SignageMarqueeFooter';
import { SignageSettingsDrawer } from '../components/signage/SignageSettingsDrawer';
import { SignageNavDrawer } from '../components/signage/SignageNavDrawer';
import { SignageShowroomWelcome } from '../components/signage/SignageShowroomWelcome';

export function DigitalSignagePage() {
  const { currentLang, toggleLanguage } = useIsolatedDisplayLanguage('signage_ui_lang');
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const settingsQuery = useSettingsQuery();
  const settings = settingsQuery.data;

  const navigate = useNavigate();
  const [theme, setTheme] = useState<SignageTheme>(() => {
    return (localStorage.getItem('signage_theme') as SignageTheme) || 'dark';
  });

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('signage_theme', nextTheme);
      return nextTheme;
    });
  };

  const handleThemeChange = (newTheme: SignageTheme) => {
    setTheme(newTheme);
    localStorage.setItem('signage_theme', newTheme);
  };

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

  // Fetch products with Smart Fallback (background polling every 25s for standalone TV screens)
  const productsQuery = useQuery({
    queryKey: ['signage-products', viewFilter],
    queryFn: async () => {
      let res = await productsApi.listPage({
        page: 1,
        pageSize: 40,
        view: viewFilter === 'offers' ? 'offers' : 'all',
      });
      // Smart Fallback: If 'offers' filter returns empty, fallback to 'all' so the showroom screen is never dead!
      if (viewFilter === 'offers' && (!res.products || res.products.length === 0)) {
        const fallbackRes = await productsApi.listPage({
          page: 1,
          pageSize: 40,
          view: 'all',
        });
        if (fallbackRes.products && fallbackRes.products.length > 0) {
          return fallbackRes.products;
        }
      }
      return res.products || [];
    },
    refetchInterval: 25000,
  });

  // Real-time 0ms broadcast synchronization across tabs, windows, and monitors
  useEffect(() => {
    const unsubscribe = subscribeSignageOffersUpdate(() => {
      queryClient.invalidateQueries({ queryKey: ['signage-products'] });
    });
    return unsubscribe;
  }, [queryClient]);

  const rawProducts = productsQuery.data || [];

  // Transform products to promo items
  const promoItems: SignagePromoItem[] = useMemo(() => {
    if (!rawProducts.length) return [];

    const todayStr = new Date().toISOString().slice(0, 10);

    return rawProducts.map((p, idx) => {
      const retail = Number(p.retailPrice) || 0;
      const promotionalPrice = (p as any).promotionalPrice ? Number((p as any).promotionalPrice) : null;
      
      // Filter for active offers first, or fallback to first configured offer
      const activeOffers = (p.offers || []).filter((o: any) => (!o.to || o.to >= todayStr) && (!o.from || o.from <= todayStr));
      const firstOffer = activeOffers.length > 0 ? activeOffers[0] : (p.offers && p.offers.length > 0 ? p.offers[0] : null);
      const offerVal = firstOffer ? Number(firstOffer.value) : 0;
      let offerPrice: number | null = null;

      if (firstOffer && offerVal > 0) {
        if (firstOffer.type === 'percent') {
          offerPrice = Math.max(0, retail * (1 - offerVal / 100));
        } else if (firstOffer.type === 'fixed') {
          offerPrice = Math.max(0, retail - offerVal);
        } else if (firstOffer.type === 'price') {
          offerPrice = Math.max(0, offerVal);
        } else if (firstOffer.type === 'bundle') {
          const bundleQty = Math.max(1, Number(firstOffer.minQty || 1));
          offerPrice = Math.max(0, offerVal / bundleQty);
        } else if (firstOffer.type === 'bogo') {
          const buyQ = Math.max(1, Number(firstOffer.bogoBuyQty || 1));
          const getQ = Math.max(1, Number(firstOffer.bogoGetQty || 1));
          const discPct = Math.min(100, Math.max(0, Number(firstOffer.bogoDiscountPercent ?? 100)));
          const cycleTotalQty = buyQ + getQ;
          const origTotal = retail * cycleTotalQty;
          const savings = getQ * retail * (discPct / 100);
          offerPrice = cycleTotalQty > 0 ? Math.max(0, (origTotal - savings) / cycleTotalQty) : retail;
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

  // Safeguard index if item list shrinks
  useEffect(() => {
    if (currentIndex >= promoItems.length && promoItems.length > 0) {
      setCurrentIndex(0);
    }
  }, [promoItems.length, currentIndex]);

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
  const currencyCode = settings?.currency || getGlobalSystemCurrency();
  const storefrontUrl = typeof window !== 'undefined' ? `${window.location.origin}/storefront` : '';

  const isDark = theme === 'dark';

  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    storefrontUrl
  )}&bgcolor=ffffff&color=${isDark ? '0f172a' : '170e5e'}&margin=2`;

  return (
    <div
      dir="rtl"
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: isDark ? '#080c16' : '#f8fafc',
        backgroundImage: isDark
          ? 'radial-gradient(ellipse at 80% 10%, rgba(37, 99, 235, 0.12) 0%, transparent 60%), radial-gradient(ellipse at 20% 90%, rgba(99, 102, 241, 0.08) 0%, transparent 60%)'
          : 'none',
        color: isDark ? '#f8fafc' : '#0f172a',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        transition: 'background-color 0.2s ease',
      }}
    >
      {/* Top Header Bar */}
      <SignageHeader
        currentLang={currentLang}
        onToggleLanguage={toggleLanguage}
        storeName={storeName}
        currentTime={currentTime}
        currentDate={currentDate}
        progressPercent={progressPercent}
        onToggleFullscreen={handleToggleFullscreen}
        onToggleSettings={() => setShowSettingsDrawer((prev) => !prev)}
        onBack={handleGoBack}
        onToggleNavMenu={() => setShowNavDrawer((prev) => !prev)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
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
            theme={theme}
          />
        ) : productsQuery.isLoading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              fontSize: '18px',
              fontWeight: 800,
              color: isDark ? '#38bdf8' : '#170e5e',
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
              borderRadius: '24px',
              gap: '14px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: `3px solid ${isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(23, 14, 94, 0.15)'}`,
                borderTopColor: isDark ? '#38bdf8' : '#170e5e',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            <span>{t('pos.digital_signage_page.loading', 'جاري تجهيز وبث عروض صالة العرض...')}</span>
          </div>
        ) : (
          <SignageShowroomWelcome
            storeName={storeName}
            qrSvgUrl={qrSvgUrl}
            theme={theme}
            hasFilterOffers={viewFilter === 'offers'}
            onSwitchToAllProducts={() => setViewFilter('all')}
          />
        )}

        <SignageSideDeck
          promoItems={promoItems}
          currentIndex={currentIndex}
          onSelectItem={(idx) => setCurrentIndex(idx)}
          currencyCode={currencyCode}
          qrSvgUrl={qrSvgUrl}
          theme={theme}
        />
      </main>

      {/* Bottom Live Marquee Ticker Bar */}
      <SignageMarqueeFooter
        customTickerText={customTickerText}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused((prev) => !prev)}
        currentIndex={currentIndex}
        totalItems={promoItems.length}
        theme={theme}
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
          theme={theme}
          onThemeChange={handleThemeChange}
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
