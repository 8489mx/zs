import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CustomerDisplayPayload } from '@/features/pos/types/pos-customer-display.types';
import {
  getCustomerDisplayInitialState,
  subscribeCustomerDisplayState,
} from '@/features/pos/lib/pos-customer-display-bridge';
import { buildQrSvg } from '@/lib/qrcode';
import {
  TagIcon,
  AwardIcon,
  CreditCardIcon,
  TruckIcon,
} from '@/shared/components/icons/AppIcons';
import { CfdHeader } from '../components/customer-display/CfdHeader';
import { CfdIdleView, type PromotionItem } from '../components/customer-display/CfdIdleView';
import { CfdScanningView } from '../components/customer-display/CfdScanningView';
import { CfdCompletedView } from '../components/customer-display/CfdCompletedView';

const DEFAULT_PROMOTIONS: PromotionItem[] = [
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
  const navigate = useNavigate();
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

  // 1. Subscribe to POS real-time updates
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

  // 4. Auto-revert completed screen back to idle after 12 seconds
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

  // Keyboard shortcuts for exiting fullscreen or returning to displays
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' ||
        (e.altKey && e.key === 'Backspace') ||
        (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'))
      ) {
        if (!document.fullscreenElement) {
          navigate('/displays');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const qrSvg = useMemo(() => {
    if (!payload.payment?.qrData) return '';
    return buildQrSvg(payload.payment.qrData, {
      size: 160,
      quietZone: 1,
      color: '#170e5e',
      bgColor: '#ffffff',
    });
  }, [payload.payment?.qrData]);

  const storefrontUrl = typeof window !== 'undefined' ? `${window.location.origin}/storefront` : '';
  const loyaltyQrSvg = useMemo(() => {
    return buildQrSvg(storefrontUrl || 'https://z-systems.app', {
      size: 140,
      quietZone: 1,
      color: '#170e5e',
      bgColor: '#ffffff',
    });
  }, [storefrontUrl]);

  const latestItemKey = useMemo(() => {
    if (!payload.items || payload.items.length === 0) return null;
    return payload.items[payload.items.length - 1]?.id;
  }, [payload.items]);

  return (
    <div className="cfd-container" dir="rtl">
      <CfdHeader
        storeName={payload.storeName}
        branchName={payload.branchName}
        currentTime={currentTime}
        currentDate={currentDate}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onBack={() => navigate('/displays')}
      />

      <main className="cfd-main">
        {payload.status === 'idle' && (
          <CfdIdleView
            storeName={payload.storeName}
            promotions={DEFAULT_PROMOTIONS}
            promoIndex={promoIndex}
            setPromoIndex={setPromoIndex}
            loyaltyQrSvg={loyaltyQrSvg}
          />
        )}

        {(payload.status === 'scanning' || payload.status === 'payment') && (
          <CfdScanningView
            payload={payload}
            latestItemKey={latestItemKey}
            qrSvg={qrSvg}
          />
        )}

        {payload.status === 'completed' && (
          <CfdCompletedView payload={payload} />
        )}
      </main>
    </div>
  );
}

export default CustomerFacingDisplayPage;
