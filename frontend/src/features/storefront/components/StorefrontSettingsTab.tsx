import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { buildStorePublicUrl, storePublicUrlParts } from '@/lib/store-public-url';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storefrontApi } from '../api/storefront.api';
import { compressImage } from '@/shared/utils/image-compressor';
import { toast } from '@/shared/components/system-alert';
import { StorefrontProductStudio } from './StorefrontProductStudio';
import { StorefrontCouponsManager } from './StorefrontCouponsManager';
import { StorefrontDeliveryZonesManager } from './StorefrontDeliveryZonesManager';
import { StorefrontPaymentGatewaysManager } from './StorefrontPaymentGatewaysManager';
import { BostaSettingsCard } from './BostaSettingsCard';
import { GccShippingSettingsCard } from './GccShippingSettingsCard';
import type { StorefrontMidBanner } from '../types/storefront.types';
import {
  CheckIcon,
  XIcon,
  LightbulbIcon,
  TruckIcon,
  Trash2Icon,
  QrCodeIcon,
  CopyIcon,
  PlusCircleIcon,
  LayersIcon,
  TrendingUpIcon,
  UploadIcon,
} from '@/shared/components/icons/AppIcons';
import { TableQrPrintDialog } from '@/features/pos';

function parsePosition(posStr?: string): { x: number; y: number } {
  if (!posStr) return { x: 50, y: 50 };
  if (posStr === 'top') return { x: 50, y: 0 };
  if (posStr === 'bottom') return { x: 50, y: 100 };
  if (posStr === 'center') return { x: 50, y: 50 };
  const parts = posStr.trim().split(/\s+/);
  if (parts.length === 2) {
    const x = parseFloat(parts[0]);
    const y = parseFloat(parts[1]);
    return {
      x: isNaN(x) ? 50 : x,
      y: isNaN(y) ? 50 : y,
    };
  }
  return { x: 50, y: 50 };
}

export function StorefrontSettingsTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'settings' | 'coupons' | 'zones' | 'payments' | 'images' | 'bosta' | 'gcc-shipping'>('settings');
  const [copySuccess, setCopySuccess] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [bannerCompressFeedback, setBannerCompressFeedback] = useState('');
  const [isCompressingBanner, setIsCompressingBanner] = useState(false);
  const [isQrPrintOpen, setIsQrPrintOpen] = useState(false);
  const [copiedPromptKey, setCopiedPromptKey] = useState<'ar' | 'en' | null>(null);

  const analyticsQuery = useQuery({
    queryKey: ['storefront-admin-analytics'],
    queryFn: storefrontApi.getAnalytics,
    refetchInterval: 30 * 1000,
  });

  const aiPromptTemplateAr =
    'صمم بنر إعلاني سينمائي فائق العرض (Ultra-Wide Panoramic Store Banner) بنسبة 4:1 وأبعاد دقيقة 1920x480 بكسل (أو 1600x400 بكسل) لمتجر إلكتروني فاخر [اكتب اسم ونشاط متجرك هنا].\n' +
    'شروط توزيع العناصر والتكوين البصري لملء المتجر دون أي قص:\n' +
    '1. أبعاد التصميم: نسبة العرض إلى الارتفاع 4:1 شريطي بانورامي (مقاس 1920×480 بكسل للبنر كامل الشاشة، أو 1400×350 بكسل للبانرات الفاصلة بين الأقسام).\n' +
    '2. منطقة الأمان المركزية (60%): ضع اسم المتجر، الشعار، عبارات العرض الترويجي، والمنتجات الرئيسية حصرياً في الـ 60% الوسطى من الكادر.\n' +
    '3. امتداد الأطراف (20% يميناً و 20% يساراً): اجعل الحواف الجانبية مجرد خلفية ممتدة متجانسة بتدرج لوني وإضاءة استوديو ناعمة بدون أي نصوص أو منتجات مقطوعة لتملأ الشاشة بسلاسة وتتوافق تماماً مع الهواتف والشاشات العريضة دون أي قص.';

  const aiPromptTemplateEn =
    'Ultra-wide cinematic commercial e-commerce panoramic header banner, exact aspect ratio 4:1, 1920x480 resolution, for [Your Store Name / Business Type]. Luxury modern commercial branding, clean studio lighting, hyper-realistic, 8k render. CRITICAL COMPOSITION RULES: Place all hero products, promotional copy, branding, and logos strictly inside the central 60% horizontal safe zone. The left 20% and right 20% edges must be seamless ambient extending background gradient with atmospheric lighting and zero cut-off text or cropped objects at the borders. Works perfectly for full-bleed screens and responsive mobile viewports. --ar 4:1';

  const handleCopyPrompt = (type: 'ar' | 'en') => {
    const textToCopy = type === 'ar' ? aiPromptTemplateAr : aiPromptTemplateEn;
    navigator.clipboard.writeText(textToCopy);
    setCopiedPromptKey(type);
    setTimeout(() => setCopiedPromptKey(null), 3000);
  };

  const settingsQuery = useQuery({
    queryKey: ['storefront-admin-settings'],
    queryFn: storefrontApi.getSettings,
  });

  const [formState, setFormState] = useState({
    enabled: true,
    slug: '',
    title: '',
    address: '',
    bio: '',
    logoUrl: '',
    announcement: '',
    bannerUrl: '',
    bannerUrls: [] as string[],
    bannerFit: 'contain' as 'contain' | 'cover',
    bannerPosition: 'center' as string,
    bannerPositions: [] as string[],
    bannerIntervalSeconds: 4,
    smartDealsEnabled: false,
    freeShippingEnabled: false,
    freeShippingMinOrder: 500,
    deliveryFee: 0,
    minOrder: 0,
    whatsappPhone: '',
    customDomain: '',
    brandColor: '#170e5e',
    brandSecondaryColor: '#f59e0b',
    brandSurfaceColor: '#f8fafc',
    themePreset: 'royal_navy',
    pickupEnabled: true,
    metaPixelId: '',
    ga4Id: '',
    tiktokPixelId: '',
    snapchatPixelId: '',
    allowOutOfStockOrders: true,
    showOutOfStockProducts: true,
    heroBannerFullBleed: true,
    midBannersEnabled: true,
    midBanners: [] as StorefrontMidBanner[],
  });

  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [isPreviewHovered, setIsPreviewHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; initX: number; initY: number } | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-cycle the settings preview carousel, pausing when hovered or dragging
  useEffect(() => {
    if (formState.bannerUrls.length <= 1 || isPreviewHovered || isDragging) return;
    const intervalMs = Math.max(1500, (formState.bannerIntervalSeconds || 4) * 1000);
    const interval = setInterval(() => {
      setPreviewSlideIndex((prev) => (prev + 1) % formState.bannerUrls.length);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [formState.bannerUrls.length, formState.bannerIntervalSeconds, isPreviewHovered, isDragging]);

  // Ensure dragging is released if pointer leaves window or gesture ends
  useEffect(() => {
    const handleGlobalPointerRelease = () => {
      if (isDragging) {
        setIsDragging(false);
        dragStartRef.current = null;
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerRelease);
    window.addEventListener('pointercancel', handleGlobalPointerRelease);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerRelease);
      window.removeEventListener('pointercancel', handleGlobalPointerRelease);
    };
  }, [isDragging]);

  useEffect(() => {
    if (settingsQuery.data) {
      const urls = settingsQuery.data.bannerUrls && settingsQuery.data.bannerUrls.length > 0
        ? settingsQuery.data.bannerUrls
        : (settingsQuery.data.bannerUrl ? [settingsQuery.data.bannerUrl] : []);

      let initialTitle = settingsQuery.data.title || '';
      let initialAddress = settingsQuery.data.address || '';
      const bName = (settingsQuery.data as any).businessName || '';
      if (!initialAddress && bName && initialTitle.startsWith(bName) && initialTitle.length > bName.length) {
        initialAddress = initialTitle.slice(bName.length).trim().replace(/^[-–—:]\s*/, '');
        initialTitle = bName;
      }

      setFormState({
        enabled: settingsQuery.data.enabled,
        slug: settingsQuery.data.slug || '',
        title: initialTitle,
        address: initialAddress,
        bio: settingsQuery.data.bio || '',
        logoUrl: (settingsQuery.data as any)?.logoUrl || (settingsQuery.data as any)?.logo_url || '',
        announcement: settingsQuery.data.announcement || '',
        bannerUrl: urls[0] || settingsQuery.data.bannerUrl || '',
        bannerUrls: urls,
        bannerFit: (settingsQuery.data.bannerFit || 'contain') as 'contain' | 'cover',
        bannerPosition: settingsQuery.data.bannerPosition || 'center',
        bannerPositions: settingsQuery.data.bannerPositions || [],
        bannerIntervalSeconds: settingsQuery.data.bannerIntervalSeconds || 4,
        smartDealsEnabled: Boolean(settingsQuery.data.smartDealsEnabled),
        freeShippingEnabled: Boolean(settingsQuery.data.freeShippingEnabled),
        freeShippingMinOrder: settingsQuery.data.freeShippingMinOrder !== undefined && settingsQuery.data.freeShippingMinOrder !== null ? Number(settingsQuery.data.freeShippingMinOrder) : 500,
        deliveryFee: settingsQuery.data.deliveryFee || 0,
        minOrder: settingsQuery.data.minOrder || 0,
        whatsappPhone: settingsQuery.data.whatsappPhone || '',
        customDomain: (settingsQuery.data as any).customDomain || '',
        brandColor: settingsQuery.data.brandColor || '#170e5e',
        brandSecondaryColor: (settingsQuery.data as any).brandSecondaryColor || '#f59e0b',
        brandSurfaceColor: (settingsQuery.data as any).brandSurfaceColor || '#f8fafc',
        themePreset: (settingsQuery.data as any).themePreset || 'royal_navy',
        pickupEnabled: settingsQuery.data.pickupEnabled !== false,
        metaPixelId: settingsQuery.data.metaPixelId || '',
        ga4Id: settingsQuery.data.ga4Id || '',
        tiktokPixelId: settingsQuery.data.tiktokPixelId || '',
        snapchatPixelId: settingsQuery.data.snapchatPixelId || '',
        allowOutOfStockOrders: (settingsQuery.data as any).allowOutOfStockOrders !== false,
        showOutOfStockProducts: (settingsQuery.data as any).showOutOfStockProducts !== false,
        heroBannerFullBleed: (settingsQuery.data as any).heroBannerFullBleed !== false,
        midBannersEnabled: (settingsQuery.data as any).midBannersEnabled !== false,
        midBanners: (settingsQuery.data as any).midBanners || [],
      });
    }
  }, [settingsQuery.data]);

  const currentSlidePosition =
    formState.bannerPositions?.[previewSlideIndex] ||
    formState.bannerPosition ||
    '50% 50%';

  const currentCoords = parsePosition(currentSlidePosition);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initX: currentCoords.x,
      initY: currentCoords.y,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const rect = previewContainerRef.current?.getBoundingClientRect();
    const width = rect?.width || 400;
    const height = rect?.height || 160;

    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;

    const sensitivity = 1.15;
    const nextX = Math.min(100, Math.max(0, dragStartRef.current.initX - ((dx / width) * 100 * sensitivity)));
    const nextY = Math.min(100, Math.max(0, dragStartRef.current.initY - ((dy / height) * 100 * sensitivity)));

    const newPos = `${Math.round(nextX)}% ${Math.round(nextY)}%`;

    setFormState((prev) => {
      const updatedPositions = [...(prev.bannerPositions || [])];
      while (updatedPositions.length < prev.bannerUrls.length) {
        updatedPositions.push('50% 50%');
      }
      updatedPositions[previewSlideIndex] = newPos;
      return {
        ...prev,
        bannerPosition: newPos,
        bannerPositions: updatedPositions,
      };
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      dragStartRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleSetExactPosition = (posStr: string) => {
    setFormState((prev) => {
      const updatedPositions = [...(prev.bannerPositions || [])];
      while (updatedPositions.length < prev.bannerUrls.length) {
        updatedPositions.push('50% 50%');
      }
      updatedPositions[previewSlideIndex] = posStr;
      return {
        ...prev,
        bannerPosition: posStr,
        bannerPositions: updatedPositions,
      };
    });
  };

  const updateMutation = useMutation({
    mutationFn: storefrontApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefront-admin-settings'] });
      setSavedSuccess(true);
      toast.success(t('storefront.storefront_settings_tab.save_success', 'تم حفظ وتطبيق كافة إعدادات المتجر بنجاح!'));
      setTimeout(() => setSavedSuccess(false), 3500);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر حفظ إعدادات المتجر، يرجى المحاولة مرة أخرى.');
    },
  });

  const storeSlug = settingsQuery.data?.slug || 'default';
  const storeUrl = buildStorePublicUrl(storeSlug);
  const slugUrlParts = storePublicUrlParts();

  const handleCopy = () => {
    navigator.clipboard.writeText(storeUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingBanner(true);
      setBannerCompressFeedback('جاري ضغط بنر المتجر بتقنية WebP السريعة...');

      const res = await compressImage(file, {
        maxWidth: 1600,
        maxHeight: 480,
        initialQuality: 0.82,
        maxSizeKb: 65,
      });

      setFormState((prev) => {
        const nextUrls = [...prev.bannerUrls, res.dataUrl];
        return {
          ...prev,
          bannerUrls: nextUrls,
          bannerUrl: nextUrls[0] || '',
        };
      });

      setBannerCompressFeedback(
        `تم إضافة البنر بنجاح (${res.originalSizeKb}KB → ${res.compressedSizeKb}KB، وفر ${res.compressionRatio}%)`
      );
      setIsCompressingBanner(false);
      e.target.value = '';
    } catch (err: any) {
      setBannerCompressFeedback(`فشل ضغط البنر: ${err.message || 'خطأ غير متوقع'}`);
      setIsCompressingBanner(false);
    }
  };

  const [isCompressingLogo, setIsCompressingLogo] = useState(false);
  const [logoCompressFeedback, setLogoCompressFeedback] = useState<string | null>(null);

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingLogo(true);
      setLogoCompressFeedback('جاري ضغط ومعالجة الشعار...');

      const res = await compressImage(file, {
        maxWidth: 360,
        maxHeight: 360,
        initialQuality: 0.88,
        maxSizeKb: 40,
      });

      setFormState((prev) => ({
        ...prev,
        logoUrl: res.dataUrl,
      }));

      setLogoCompressFeedback(`تم تجهيز الشعار بنجاح (${res.compressedSizeKb}KB)`);
      setIsCompressingLogo(false);
      e.target.value = '';
    } catch (err: any) {
      setLogoCompressFeedback(`فشل ضغط الشعار: ${err.message || 'خطأ غير متوقع'}`);
      setIsCompressingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setFormState((prev) => ({
      ...prev,
      logoUrl: '',
    }));
    setLogoCompressFeedback(null);
  };

  const handleRemoveBanner = (index: number) => {
    setFormState((prev) => {
      const nextUrls = prev.bannerUrls.filter((_, idx) => idx !== index);
      const nextPositions = (prev.bannerPositions || []).filter((_, idx) => idx !== index);
      return {
        ...prev,
        bannerUrls: nextUrls,
        bannerPositions: nextPositions,
        bannerUrl: nextUrls[0] || '',
      };
    });
    setPreviewSlideIndex((prev) => Math.max(0, Math.min(prev, formState.bannerUrls.length - 2)));
  };

  const handleMoveBanner = (index: number, direction: 'up' | 'down') => {
    setFormState((prev) => {
      const nextUrls = [...prev.bannerUrls];
      const nextPositions = [...(prev.bannerPositions || [])];
      while (nextPositions.length < nextUrls.length) {
        nextPositions.push('50% 50%');
      }
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= nextUrls.length) return prev;

      const tempUrl = nextUrls[index];
      nextUrls[index] = nextUrls[targetIndex];
      nextUrls[targetIndex] = tempUrl;

      const tempPos = nextPositions[index];
      nextPositions[index] = nextPositions[targetIndex];
      nextPositions[targetIndex] = tempPos;

      return {
        ...prev,
        bannerUrls: nextUrls,
        bannerPositions: nextPositions,
        bannerUrl: nextUrls[0] || '',
      };
    });
  };

  const catalogQuery = useQuery({
    queryKey: ['storefront-catalog', formState.slug || storeSlug],
    queryFn: () => storefrontApi.getCatalog(formState.slug || storeSlug),
    enabled: Boolean(formState.slug || storeSlug),
    staleTime: 60 * 1000,
  });
  const categories = catalogQuery.data?.categories || [];

  const [compressingMidBannerIdx, setCompressingMidBannerIdx] = useState<number | null>(null);

  const handleMidBannerFileChange = async (index: number, file: File) => {
    try {
      setCompressingMidBannerIdx(index);
      const res = await compressImage(file, {
        maxWidth: 1600,
        maxHeight: 480,
        initialQuality: 0.85,
        maxSizeKb: 75,
      });

      setFormState((prev) => {
        const next = [...(prev.midBanners || [])];
        if (next[index]) {
          next[index] = { ...next[index], imageUrl: res.dataUrl };
        }
        return { ...prev, midBanners: next };
      });
      setCompressingMidBannerIdx(null);
    } catch (err: any) {
      alert(`فشل ضغط البنر: ${err.message || 'خطأ غير متوقع'}`);
      setCompressingMidBannerIdx(null);
    }
  };

  const handleAddMidBanner = () => {
    setFormState((prev) => {
      const current = prev.midBanners || [];
      const newBanner: StorefrontMidBanner = {
        id: `mid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        imageUrl: '',
        title: '',
        subtitle: '',
        badge: '',
        linkType: 'category',
        categoryId: categories[0]?.id ? Number(categories[0].id) : undefined,
        customUrl: '',
        slot: current.length === 0 ? 'after_deals' : current.length === 1 ? 'after_row_1' : current.length === 2 ? 'after_row_2' : 'bottom',
        isEnabled: true,
      };
      return {
        ...prev,
        midBanners: [...current, newBanner],
      };
    });
  };

  const handleUpdateMidBanner = (index: number, updates: Partial<StorefrontMidBanner>) => {
    setFormState((prev) => {
      const next = [...(prev.midBanners || [])];
      if (next[index]) {
        next[index] = { ...next[index], ...updates };
      }
      return { ...prev, midBanners: next };
    });
  };

  const handleRemoveMidBanner = (index: number) => {
    setFormState((prev) => {
      const next = (prev.midBanners || []).filter((_, idx) => idx !== index);
      return { ...prev, midBanners: next };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formState);
  };

  if (settingsQuery.isLoading) {
    return <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>{t('storefront.storefront_settings_tab.s0', "جاري تحميل إعدادات المتجر...")}</div>;
  }

  return (
    <div className="storefront-tab-root" style={{ width: '100%', direction: 'rtl' }}>
      {/* Top Store URL Card - Compact ERP Style */}
      <div
        className="storefront-link-banner"
        style={{
          background: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '10px 16px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
              {t('storefront.storefront_settings_tab.s1', "رابط المتجر الإلكتروني الخاص بنشاطك:")}
            </span>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                background: '#f0f3ff',
                color: '#170e5e',
                padding: '1px 8px',
                borderRadius: '999px',
                border: '1px solid #d8e0fc',
              }}
            >
              {t('storefront.storefront_settings_tab.s2', "مباشر ومفعل")}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                background: '#f8fafc',
                color: '#334155',
                padding: '1px 8px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
              }}
            >
              {t('storefront.storefront_settings_tab.s3', "معرّف النسخة (Slug):")} <strong style={{ color: '#170e5e', fontFamily: 'monospace' }}>{storeSlug}</strong>
            </span>
          </div>
          <div className="storefront-link-url" style={{ fontSize: '13px', fontFamily: 'monospace', direction: 'ltr', color: '#170e5e', fontWeight: 700, wordBreak: 'break-all' }}>
            {storeUrl}
          </div>
        </div>

        <div className="storefront-link-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setIsQrPrintOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              background: '#170e5e',
              border: '1px solid #170e5e',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            title={t('storefront.storefront_settings_tab.s4', "طباعة وتجهيز ستيكرات وستاندات كروت الـ QR لطاولات الصالة")}
          >
            <QrCodeIcon size={13} color="#ffffff" />
            <span>{t('storefront.storefront_settings_tab.s5', "طباعة QR للطاولات")}</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
          >
            {copySuccess ? t('storefront.storefront_settings_tab.s6', "تم النسخ") : t('storefront.storefront_settings_tab.s7', "نسخ الرابط")}
          </button>
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 12px',
              borderRadius: '6px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              fontSize: '12px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <span>{t('storefront.storefront_settings_tab.s8', "معاينة المتجر ↗")}</span>
          </a>
        </div>
      </div>

      {/* Executive E-Commerce Operations & Hub Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #170e5e 0%, #2e1065 100%)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          color: '#ffffff',
          boxShadow: '0 2px 8px rgba(23, 14, 94, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <TrendingUpIcon size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>مركز عمليات وطلبات المتجر الإلكتروني (E-Commerce Operations)</span>
              <span style={{ fontSize: '10.5px', fontWeight: 700, background: '#10b981', color: '#ffffff', padding: '1px 7px', borderRadius: '4px' }}>
                مباشر ومربوط بالمخزن
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.82)', marginTop: '2px' }}>
              متابعة وتجهيز الطلبات، بوالص بوسطة وسمسا، رادار السلات المتروكة، ومؤشرات الأداء اللحظية
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {(analyticsQuery.data?.pendingOrders ?? 0) > 0 && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                background: '#ef4444',
                color: '#ffffff',
                padding: '3px 8px',
                borderRadius: '6px',
              }}
            >
              {analyticsQuery.data?.pendingOrders} طلبات جديدة بحاجة للمراجعة
            </span>
          )}

          <button
            type="button"
            onClick={() => navigate('/online-orders')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#ffffff',
              color: '#170e5e',
              border: 'none',
              borderRadius: '6px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <span>فتح لوحة القيادة ومتابعة الطلبات</span>
            <span style={{ fontSize: '13px' }}>←</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs - Compact */}
      <div
        className="filter-chip-row storefront-sub-tabs"
        style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '14px',
          overflowX: 'auto',
          maxWidth: '100%',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          paddingBottom: '4px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            border: activeTab === 'settings' ? '1px solid #170e5e' : '1px solid #e2e8f0',
            background: activeTab === 'settings' ? '#170e5e' : '#ffffff',
            color: activeTab === 'settings' ? '#ffffff' : '#475569',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            userSelect: 'none',
            transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
          }}
        >
          <span className="sf-tab-full">{t('storefront.storefront_settings_tab.s9', "بيانات المتجر والبنر")}</span>
          <span className="sf-tab-short">{t('storefront.storefront_settings_tab.s10', "البيانات والبنر")}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('coupons')}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            border: activeTab === 'coupons' ? '1px solid #170e5e' : '1px solid #e2e8f0',
            background: activeTab === 'coupons' ? '#170e5e' : '#ffffff',
            color: activeTab === 'coupons' ? '#ffffff' : '#475569',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            userSelect: 'none',
            transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
          }}
        >
          <span className="sf-tab-full">{t('storefront.storefront_settings_tab.s11', "كوبونات الخصم والعروض")}</span>
          <span className="sf-tab-short">{t('storefront.storefront_settings_tab.s12', "الكوبونات والعروض")}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('zones')}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            border: activeTab === 'zones' ? '1px solid #170e5e' : '1px solid #e2e8f0',
            background: activeTab === 'zones' ? '#170e5e' : '#ffffff',
            color: activeTab === 'zones' ? '#ffffff' : '#475569',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            userSelect: 'none',
            transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
          }}
        >
          <span className="sf-tab-full">{t('storefront.storefront_settings_tab.s13', "مناطق وأسعار التوصيل")}</span>
          <span className="sf-tab-short">{t('storefront.storefront_settings_tab.s14', "مناطق التوصيل")}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            border: activeTab === 'payments' ? '1px solid #170e5e' : '1px solid #e2e8f0',
            background: activeTab === 'payments' ? '#170e5e' : '#ffffff',
            color: activeTab === 'payments' ? '#ffffff' : '#475569',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            userSelect: 'none',
            transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
          }}
        >
          <span className="sf-tab-full">{t('storefront.storefront_settings_tab.s15', "بوابات الدفع الإلكتروني")}</span>
          <span className="sf-tab-short">{t('storefront.storefront_settings_tab.s16', "بوابات الدفع")}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('images')}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            border: activeTab === 'images' ? '1px solid #170e5e' : '1px solid #e2e8f0',
            background: activeTab === 'images' ? '#170e5e' : '#ffffff',
            color: activeTab === 'images' ? '#ffffff' : '#475569',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            userSelect: 'none',
            transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
          }}
        >
          <span className="sf-tab-full">{t('storefront.storefront_settings_tab.s17', "استوديو صور الأصناف")}</span>
          <span className="sf-tab-short">{t('storefront.storefront_settings_tab.s18', "صور المنتجات")}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bosta')}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            border: activeTab === 'bosta' ? '1px solid #170e5e' : '1px solid #e2e8f0',
            background: activeTab === 'bosta' ? '#170e5e' : '#ffffff',
            color: activeTab === 'bosta' ? '#ffffff' : '#475569',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            userSelect: 'none',
            transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
          }}
        >
          {t('storefront.storefront_settings_tab.s19', "شحن بوسطة")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('gcc-shipping')}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            border: activeTab === 'gcc-shipping' ? '1px solid #170e5e' : '1px solid #e2e8f0',
            background: activeTab === 'gcc-shipping' ? '#170e5e' : '#ffffff',
            color: activeTab === 'gcc-shipping' ? '#ffffff' : '#475569',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            userSelect: 'none',
            transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
          }}
        >
          <span className="sf-tab-full">{t('storefront.storefront_settings_tab.s20', "شحن خليجي (أرامكس / سمسا)")}</span>
          <span className="sf-tab-short">{t('storefront.storefront_settings_tab.s21', "شحن خليجي")}</span>
        </button>
      </div>

      {savedSuccess && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '8px 14px',
            color: '#166534',
            fontSize: '12.5px',
            fontWeight: 700,
            marginBottom: '14px',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <CheckIcon size={16} />
          <span>{t('storefront.storefront_settings_tab.s22', "تم حفظ وتحديث إعدادات المتجر الإلكتروني بنجاح!")}</span>
        </div>
      )}

      {/* Tab 1: Symmetrical 2-Column Cards - Compact & Proportional to Image 1 */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div
            className="storefront-settings-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
              marginBottom: '14px',
            }}
          >
            {/* Card 1: الهوية وبيانات المتجر */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                  {t('storefront.storefront_settings_tab.s23', "الهوية وبيانات المتجر")}
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  {t('storefront.storefront_settings_tab.s24', "الاسم والشعار والوصف الظاهر لزبائنك")}
                </span>
              </div>

              {/* Store Title (Brand Name) */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  {t('storefront.storefront_settings_tab.s25', "اسم المتجر (البراند التجاري):")}
                </label>
                <input
                  type="text"
                  value={formState.title}
                  onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                  placeholder={t('storefront.storefront_settings_tab.s26', "مثال: المهندس")}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '12.5px',
                    background: '#ffffff',
                    fontFamily: 'inherit',
                    fontWeight: 700,
                  }}
                />
              </div>

              {/* Store Logo Upload Field */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  {formState.logoUrl ? (
                    <img
                      src={formState.logoUrl}
                      alt={t('storefront.storefront_settings_tab.s27', "شعار المتجر")}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(135deg, var(--storefront-primary-color, #170e5e) 0%, #312e81 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '20px',
                      }}
                    >
                      {formState.title.trim().charAt(0) || t('storefront.storefront_settings_tab.s28', "م")}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                      {t('storefront.storefront_settings_tab.s29', "شعار المتجر (اللوجو):")}
                    </label>
                    {formState.logoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: '0 4px',
                        }}
                      >
                        {t('storefront.storefront_settings_tab.s30', "إزالة الشعار")}
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        background: 'var(--storefront-primary-color, #170e5e)',
                        color: '#ffffff',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: isCompressingLogo ? 'wait' : 'pointer',
                        boxShadow: '0 1px 3px rgba(23, 14, 94, 0.2)',
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        disabled={isCompressingLogo}
                        onChange={handleLogoFileChange}
                      />
                      <span>{isCompressingLogo ? t('storefront.storefront_settings_tab.s31', "جاري المعالجة...") : (formState.logoUrl ? t('storefront.storefront_settings_tab.s32', "تغيير الشعار") : t('storefront.storefront_settings_tab.s33', "رفع الشعار +"))}</span>
                    </label>
                    <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                      {t('storefront.storefront_settings_tab.s34', "صورة مربعة (PNG أو WebP) بخلفية بيضاء أو شفافة")}
                    </span>
                  </div>
                  {logoCompressFeedback && (
                    <div style={{ fontSize: '10.5px', color: '#16a34a', fontWeight: 700, marginTop: '4px' }}>
                      {logoCompressFeedback}
                    </div>
                  )}
                </div>
              </div>

              {/* Store Address / Location Subtitle */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', gap: '6px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
                    {t('storefront.storefront_settings_tab.s35', "عنوان أو مقر المتجر:")}
                  </label>
                  <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 500 }}>{t('storefront.storefront_settings_tab.s36', "(سطر فرعي بالهيدر)")}</span>
                </div>
                <input
                  type="text"
                  value={formState.address}
                  onChange={(e) => setFormState({ ...formState, address: e.target.value })}
                  placeholder={t('storefront.storefront_settings_tab.s37', "مثال: تعاونيات الزهور - عمارة الفسطاط")}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '12.5px',
                    background: '#ffffff',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Store Slug */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  {t('storefront.storefront_settings_tab.s38', "معرّف المتجر في الرابط (Slug):")}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', direction: 'ltr', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                  <span className="storefront-slug-prefix" style={{ padding: '6px 12px', background: '#f8fafc', color: '#170e5e', fontSize: '13px', borderRight: '1.5px solid #cbd5e1', fontWeight: 800, userSelect: 'none', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'monospace' }}>
                    {slugUrlParts.prefix}
                  </span>
                  <input
                    type="text"
                    value={formState.slug}
                    onChange={(e) => {
                      const clean = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                      setFormState({ ...formState, slug: clean });
                    }}
                    placeholder="almhnds"
                    style={{
                      flex: 1,
                      minWidth: '60px',
                      padding: '6px 10px',
                      border: 'none',
                      outline: 'none',
                      fontSize: '12.5px',
                      background: 'transparent',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: '#170e5e',
                    }}
                  />
                  {slugUrlParts.suffix && (
                    <span className="storefront-slug-prefix" style={{ padding: '6px 12px', background: '#f8fafc', color: '#170e5e', fontSize: '13px', borderLeft: '1.5px solid #cbd5e1', fontWeight: 800, userSelect: 'none', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'monospace' }}>
                      {slugUrlParts.suffix}
                    </span>
                  )}
                </div>
                <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b', marginTop: '3px' }}>
                  {t('storefront.storefront_settings_tab.s39', "يُستخدم في رابط متجرك المباشر (أحرف إنجليزية وأرقام فقط)")}
                </span>
              </div>

              {/* Store Bio */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  {t('storefront.storefront_settings_tab.s40', "نبذة تعريفية بالمتجر (الوصف):")}
                </label>
                <input
                  type="text"
                  value={formState.bio}
                  onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
                  placeholder={t('storefront.storefront_settings_tab.s41', "مثال: أفضل منتجات العطارة والزيوت الطبيعية 100%")}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '12.5px',
                    background: '#ffffff',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Announcement Bar */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  {t('storefront.storefront_settings_tab.s42', "الشريط الإعلاني العلوي (رسالة العروض):")}
                </label>
                <input
                  type="text"
                  value={formState.announcement}
                  onChange={(e) => setFormState({ ...formState, announcement: e.target.value })}
                  placeholder={t('storefront.storefront_settings_tab.s43', "مثال: توصيل سريع • شحن مجاني للطلبات فوق 500 جنيه")}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '12.5px',
                    background: '#ffffff',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* WhatsApp Phone */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  {t('storefront.storefront_settings_tab.s44', "رقم واتساب المخصص لاستقبال الطلبات:")}
                </label>
                <input
                  type="tel"
                  value={formState.whatsappPhone}
                  onChange={(e) => setFormState({ ...formState, whatsappPhone: e.target.value })}
                  placeholder={t('storefront.storefront_settings_tab.s45', "مثال: 01012345678")}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '12.5px',
                    background: '#ffffff',
                    fontFamily: 'inherit',
                    direction: 'ltr',
                    textAlign: 'right',
                  }}
                />
              </div>

              {/* 3-Color Premium Theme Customization Studio */}
              <div
                style={{
                  gridColumn: '1 / -1',
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  marginTop: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {t('storefront.storefront_settings_tab.s46', "تخصيص هوية وألوان المتجر البريميوم (3-Color Luxury Identity)")}
                    </h3>
                    <p style={{ fontSize: '11.5px', color: '#64748b', margin: '3px 0 0 0' }}>
                      {t('storefront.storefront_settings_tab.s47', "اختر لوحة ألوان متناسقة جاهزة بنقرة واحدة، أو خصص الألوان الثلاثة (الأساسي، العروض، الأسطح) لتعكس هويتك التجارية بدقة وفخامة.")}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: formState.brandColor,
                      background: '#ffffff',
                      border: `1px solid #cbd5e1`,
                      padding: '3px 10px',
                      borderRadius: '20px',
                    }}
                  >
                    {t('storefront.storefront_settings_tab.s48', "النمط المختار:")} {formState.themePreset || 'custom'}
                  </span>
                </div>

                {/* 1. Curated Luxury Palettes (One-Click) */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                    {t('storefront.storefront_settings_tab.s49', "لوحات ألوان بريميوم جاهزة ومعتمدة:")}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                    {[
                      {
                        id: 'royal_navy',
                        name: t('storefront.storefront_settings_tab.s50', "الكحلي الملكي"),
                        primary: '#170e5e',
                        secondary: '#f59e0b',
                        surface: '#f8fafc',
                      },
                      {
                        id: 'imperial_emerald',
                        name: t('storefront.storefront_settings_tab.s51', "الزمردي الإمبراطوري"),
                        primary: '#065f46',
                        secondary: '#d97706',
                        surface: '#f0fdf4',
                      },
                      {
                        id: 'velvet_boutique',
                        name: t('storefront.storefront_settings_tab.s52', "البوتيك المخملي"),
                        primary: '#881337',
                        secondary: '#e11d48',
                        surface: '#fff1f2',
                      },
                      {
                        id: 'italian_roast',
                        name: t('storefront.storefront_settings_tab.s53', "القهوة الإيطالية"),
                        primary: '#451a03',
                        secondary: '#d97706',
                        surface: '#faf8f5',
                      },
                      {
                        id: 'modern_obsidian',
                        name: t('storefront.storefront_settings_tab.s54', "الفحمي العصري"),
                        primary: '#0f172a',
                        secondary: '#2563eb',
                        surface: '#f1f5f9',
                      },
                      {
                        id: 'royal_amethyst',
                        name: t('storefront.storefront_settings_tab.s55', "الأرجواني الفاخر"),
                        primary: '#581c87',
                        secondary: '#06b6d4',
                        surface: '#faf5ff',
                      },
                    ].map((palette) => {
                      const isSelected = formState.themePreset === palette.id ||
                        (formState.brandColor === palette.primary && formState.brandSecondaryColor === palette.secondary);
                      return (
                        <button
                          key={palette.id}
                          type="button"
                          onClick={() => {
                            setFormState({
                              ...formState,
                              brandColor: palette.primary,
                              brandSecondaryColor: palette.secondary,
                              brandSurfaceColor: palette.surface,
                              themePreset: palette.id,
                            });
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: '10px',
                            background: isSelected ? '#ffffff' : '#f1f5f9',
                            border: isSelected ? `2px solid ${palette.primary}` : '1px solid #e2e8f0',
                            boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            textAlign: 'right',
                          }}
                        >
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b' }}>
                            {palette.name}
                          </span>
                          <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                            <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: palette.primary, border: '1px solid rgba(0,0,0,0.1)' }} />
                            <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: palette.secondary, border: '1px solid rgba(0,0,0,0.1)' }} />
                            <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: palette.surface, border: '1px solid rgba(0,0,0,0.15)' }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Three Granular Color Controls & Interactive Live Mockup */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', alignItems: 'center' }}>
                  {/* Left: The 3 Color Pickers */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Primary Color */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#0f172a' }}>
                          {t('storefront.storefront_settings_tab.s56', "1. اللون الأساسي (Primary Color):")}
                        </span>
                        <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                          {t('storefront.storefront_settings_tab.s57', "للهيدر، أزرار الشراء وسلة التسوق")}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="color"
                          value={formState.brandColor || '#170e5e'}
                          onChange={(e) => setFormState({ ...formState, brandColor: e.target.value, themePreset: 'custom' })}
                          style={{ width: '32px', height: '28px', padding: 0, border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', background: 'none' }}
                        />
                        <input
                          type="text"
                          value={formState.brandColor || '#170e5e'}
                          onChange={(e) => setFormState({ ...formState, brandColor: e.target.value, themePreset: 'custom' })}
                          style={{ width: '74px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', direction: 'ltr', textAlign: 'center' }}
                        />
                      </div>
                    </div>

                    {/* Secondary / Deals Color */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#0f172a' }}>
                          {t('storefront.storefront_settings_tab.s58', "2. لون التمييز والعروض (Accent / Deals):")}
                        </span>
                        <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                          {t('storefront.storefront_settings_tab.s59', "شارات الخصومات وأشرطة التوفير")}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="color"
                          value={formState.brandSecondaryColor || '#f59e0b'}
                          onChange={(e) => setFormState({ ...formState, brandSecondaryColor: e.target.value, themePreset: 'custom' })}
                          style={{ width: '32px', height: '28px', padding: 0, border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', background: 'none' }}
                        />
                        <input
                          type="text"
                          value={formState.brandSecondaryColor || '#f59e0b'}
                          onChange={(e) => setFormState({ ...formState, brandSecondaryColor: e.target.value, themePreset: 'custom' })}
                          style={{ width: '74px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', direction: 'ltr', textAlign: 'center' }}
                        />
                      </div>
                    </div>

                    {/* Surface / Background Color */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#0f172a' }}>
                          {t('storefront.storefront_settings_tab.s60', "3. لون الأسطح والخلفيات (Surface Tint):")}
                        </span>
                        <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                          {t('storefront.storefront_settings_tab.s61', "خلفيات المتجر وبطاقات التصنيفات")}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="color"
                          value={formState.brandSurfaceColor || '#f8fafc'}
                          onChange={(e) => setFormState({ ...formState, brandSurfaceColor: e.target.value, themePreset: 'custom' })}
                          style={{ width: '32px', height: '28px', padding: 0, border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', background: 'none' }}
                        />
                        <input
                          type="text"
                          value={formState.brandSurfaceColor || '#f8fafc'}
                          onChange={(e) => setFormState({ ...formState, brandSurfaceColor: e.target.value, themePreset: 'custom' })}
                          style={{ width: '74px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', direction: 'ltr', textAlign: 'center' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Live Interactive Storefront Preview Card */}
                  <div
                    style={{
                      background: formState.brandSurfaceColor || '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '12px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {t('storefront.storefront_settings_tab.s62', "معاينة المتجر الحية (Live Preview)")}
                      </span>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                    </div>

                    {/* Mini Header Mockup */}
                    <div
                      style={{
                        background: formState.brandColor || '#170e5e',
                        color: '#ffffff',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: '11.5px', fontWeight: 900 }}>
                        {formState.title || t('storefront.storefront_settings_tab.s63', "متجري الإلكتروني")}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          background: formState.brandSecondaryColor || '#f59e0b',
                          color: '#ffffff',
                          padding: '2px 6px',
                          borderRadius: '12px',
                        }}
                      >
                        {t('storefront.storefront_settings_tab.s64', "السلة (1)")}
                      </span>
                    </div>

                    {/* Mini Product Card Mockup */}
                    <div
                      style={{
                        background: '#ffffff',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                            {t('storefront.storefront_settings_tab.s65', "منتج تجريبي")}
                          </span>
                          <span
                            style={{
                              fontSize: '9.5px',
                              fontWeight: 800,
                              background: formState.brandSecondaryColor || '#f59e0b',
                              color: '#ffffff',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            {t('storefront.storefront_settings_tab.s66', "خصم 20%")}
                          </span>
                        </div>
                        <div style={{ fontSize: '11.5px', marginTop: '2px' }}>
                          <strong style={{ color: formState.brandColor || '#170e5e', fontWeight: 900 }}>
                            {t('storefront.storefront_settings_tab.s67', "160 ج")}
                          </strong>{' '}
                          <span style={{ fontSize: '10px', color: '#94a3b8', textDecoration: 'line-through' }}>
                            {t('storefront.storefront_settings_tab.s68', "200 ج")}
                          </span>
                        </div>
                      </div>
                      <span
                        style={{
                          background: formState.brandColor || '#170e5e',
                          color: '#ffffff',
                          fontSize: '10.5px',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '6px',
                        }}
                      >
                        {t('storefront.storefront_settings_tab.s69', "أضف للسلة")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pickup / Click & Collect Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  gap: '10px',
                  minWidth: 0,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block' }}>
                    {t('storefront.storefront_settings_tab.s70', "تفعيل استلام الطلبات من الفرع (Click & Collect)")}
                  </span>
                  <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                    {t('storefront.storefront_settings_tab.s71', "يتيح للزبائن اختيار استلام طلبهم ذاتياً من مقركم بدون مصاريف توصيل")}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formState.pickupEnabled}
                  onChange={(e) => setFormState({ ...formState, pickupEnabled: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: '#170e5e', cursor: 'pointer', flexShrink: 0 }}
                />
              </div>

              {/* Custom Domain Section */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                    {t('storefront.storefront_settings_tab.s72', "الدومين المخصص لمتجرك (Custom Domain):")}
                  </label>
                  <span style={{ fontSize: '10.5px', background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    {t('storefront.storefront_settings_tab.s73', "ميزة متقدمة")}
                  </span>
                </div>
                <input
                  type="text"
                  value={formState.customDomain}
                  onChange={(e) => setFormState({ ...formState, customDomain: e.target.value })}
                  placeholder={t('storefront.storefront_settings_tab.s74', "مثال: store.mybrand.com")}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '12.5px',
                    background: '#ffffff',
                    fontFamily: 'monospace',
                    direction: 'ltr',
                    textAlign: 'left',
                    boxSizing: 'border-box',
                    marginBottom: '8px',
                  }}
                />
                <div style={{ fontSize: '11.5px', color: '#64748b', lineHeight: 1.6, marginTop: '4px' }}>
                  <span>{t('storefront.storefront_settings_tab.s75', "لربط دومينك الخاص (مثل store.mybrand.com)، أضف سجل")} <strong>CNAME</strong> {t('storefront.storefront_settings_tab.s76', "في لوحة تحكم نطاقك يوجه إلى:")}</span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '4px 0', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '5px' }}>
                    <code style={{ color: '#170e5e', fontWeight: 800, fontFamily: 'monospace', direction: 'ltr' }}>
                      {formState.slug ? `${formState.slug.trim().toLowerCase()}.zsystemai.com` : 'cname.zsystemai.com'}
                    </code>
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#16a34a', fontWeight: 600 }}>
                    يعمل متجرك افتراضياً ومباشرة على السب دومين: https://{formState.slug ? formState.slug.trim().toLowerCase() : (storeSlug || 'yourstore')}.zsystemai.com
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: إعدادات التشغيل والتوصيل وبنر الواجهة */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                  {t('storefront.storefront_settings_tab.s77', "التشغيل والتوصيل وبنر الواجهة")}
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  {t('storefront.storefront_settings_tab.s78', "إعدادات التوصيل وتخصيص البنر")}
                </span>
              </div>

              {/* Enable Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  gap: '10px',
                  minWidth: 0,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block' }}>
                    {t('storefront.storefront_settings_tab.s79', "تفعيل استقبال الطلبات أونلاين")}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {t('storefront.storefront_settings_tab.s80', "إتاحة أو إيقاف استقبال طلبات الشراء")}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formState.enabled}
                  onChange={(e) => setFormState({ ...formState, enabled: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: '#170e5e', cursor: 'pointer', flexShrink: 0 }}
                />
              </div>

              {/* Smart Deals Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: formState.smartDealsEnabled ? '1.5px solid #170e5e' : '1px solid #e2e8f0',
                  transition: 'all 0.15s ease',
                  gap: '10px',
                  minWidth: 0,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block' }}>
                    {t('storefront.storefront_settings_tab.s81', "تفعيل العروض التسويقية الذكية (Smart Deals)")}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {t('storefront.storefront_settings_tab.s82', "توليد شارات وتخفيضات شكلية على الأصناف المميزة لإعطاء مظهر تسويقي جذاب للمتجر")}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formState.smartDealsEnabled}
                  onChange={(e) => setFormState({ ...formState, smartDealsEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#170e5e', cursor: 'pointer', flexShrink: 0 }}
                />
              </div>

              {/* Show Out Of Stock Products (Coming Soon) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: formState.showOutOfStockProducts ? '1.5px solid #170e5e' : '1px solid #e2e8f0',
                  transition: 'all 0.15s ease',
                  gap: '10px',
                  minWidth: 0,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block' }}>
                    {t('storefront.storefront_settings_tab.s83', "إظهار المنتجات المنتهية من المخزون (بوسم \"ستتوفر قريباً\")")}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {t('storefront.storefront_settings_tab.s84', "عند التفعيل: تظهر الأصناف المنتهية بشارة \"ستتوفر قريباً\" وزر غير متاح للطلب. عند التعطيل: تُخفى تلقائياً من المتجر لتسهيل تجربة الشراء (موصى به).")}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formState.showOutOfStockProducts}
                  onChange={(e) => setFormState({ ...formState, showOutOfStockProducts: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#170e5e', cursor: 'pointer', flexShrink: 0 }}
                />
              </div>

              {/* Allow Out Of Stock / Unlimited Stock for Kitchen & Food */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: formState.allowOutOfStockOrders ? '1.5px solid #170e5e' : '1px solid #e2e8f0',
                  transition: 'all 0.15s ease',
                  gap: '10px',
                  minWidth: 0,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block' }}>
                    {t('storefront.storefront_settings_tab.s85', "السماح بالطلب دون التقيد بالرصيد المخزني (مناسب للمطاعم وتجهيز الوجبات)")}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {t('storefront.storefront_settings_tab.s86', "إظهار الوجبات والأصناف بحالة \"متوفر\" وزر \"أضف للسلة\" مفعل دائماً حتى لو كان رصيد المخزن 0")}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formState.allowOutOfStockOrders}
                  onChange={(e) => setFormState({ ...formState, allowOutOfStockOrders: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#170e5e', cursor: 'pointer', flexShrink: 0 }}
                />
              </div>

              {/* Delivery Fee & Min Order */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px', minWidth: 0 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    {t('storefront.storefront_settings_tab.s87', "رسوم التوصيل (")}{getGlobalCurrencySymbol()}):
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formState.deliveryFee}
                    onChange={(e) => setFormState({ ...formState, deliveryFee: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '12.5px',
                      background: '#ffffff',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    {t('storefront.storefront_settings_tab.s88', "الحد الأدنى للطلب (")}{getGlobalCurrencySymbol()}):
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formState.minOrder}
                    onChange={(e) => setFormState({ ...formState, minOrder: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '12.5px',
                      background: '#ffffff',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              {/* Delivery Zones Shortcut Tip */}
              <div
                style={{
                  background: '#f0f3ff',
                  border: '1px solid #d8e0fc',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  flexWrap: 'wrap',
                  minWidth: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: '1 1 180px' }}>
                  <LightbulbIcon size={14} color="#170e5e" />
                  <span style={{ fontSize: '11px', color: '#170e5e', fontWeight: 600 }}>
                    {t('storefront.storefront_settings_tab.s89', "هل تريد تحديد أسعار دليفري مختلفة لكل حي أو محافظة تخدمها؟")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('zones')}
                  style={{
                    background: '#170e5e',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '5px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {t('storefront.storefront_settings_tab.s90', "إدارة مصفوفة المناطق ↗")}
                </button>
              </div>

              {/* Automatic Free Shipping Threshold Rule */}
              <div
                style={{
                  background: formState.freeShippingEnabled ? '#f0fdf4' : '#f8fafc',
                  border: formState.freeShippingEnabled ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                  minWidth: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', minWidth: 0 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                      <TruckIcon size={15} color="#170e5e" />
                      <span>{t('storefront.storefront_settings_tab.s91', "تفعيل الشحن المجاني التلقائي (Free Shipping Rule)")}</span>
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '1px' }}>
                      {t('storefront.storefront_settings_tab.s92', "إلغاء رسوم التوصيل تلقائياً عندما يتجاوز إجمالي مشتريات الزبون حداً معيناً")}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formState.freeShippingEnabled}
                    onChange={(e) => setFormState({ ...formState, freeShippingEnabled: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#170e5e', cursor: 'pointer', flexShrink: 0 }}
                  />
                </div>

                {formState.freeShippingEnabled && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                      paddingTop: '6px',
                      borderTop: '1px dashed #bbf7d0',
                      minWidth: 0,
                    }}
                  >
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#166534' }}>
                      {t('storefront.storefront_settings_tab.s93', "شحن مجاني عند الطلب بمبلغ (")}{getGlobalCurrencySymbol()}{t('storefront.storefront_settings_tab.s94', ") أو أكثر:")}
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="number"
                        min="1"
                        value={formState.freeShippingMinOrder}
                        onChange={(e) =>
                          setFormState({ ...formState, freeShippingMinOrder: Math.max(1, Number(e.target.value)) })
                        }
                        style={{
                          width: '90px',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          border: '1.5px solid #86efac',
                          fontSize: '12.5px',
                          fontWeight: 800,
                          color: '#166534',
                          background: '#ffffff',
                          textAlign: 'center',
                        }}
                      />
                      <span style={{ fontSize: '11px', color: '#15803d' }}>
                        {t('storefront.storefront_settings_tab.s95', "(مثال: 500 جنيه)")}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-Banner Carousel Manager (Slider / GIF-like Auto Rotation) */}
              <div
                style={{
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  background: '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                      {t('storefront.storefront_settings_tab.s96', "سلايدر بنرات العروض (متحرك تلقائياً):")}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {t('storefront.storefront_settings_tab.s97', "أضف صورة أو أكثر لتقلب تلقائياً كـ GIF في واجهة المتجر")}
                    </span>
                  </div>
                  {formState.bannerUrls.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormState((prev) => ({ ...prev, bannerUrls: [], bannerUrl: '' }))}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '2px 6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Trash2Icon size={12} color="#ef4444" />
                      <span>{t('storefront.storefront_settings_tab.s98', "حذف الكل")}</span>
                    </button>
                  )}
                </div>

                {/* Multi-Slide Selector Bar (when multiple slides) */}
                {formState.bannerUrls.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                      {t('storefront.storefront_settings_tab.s99', "اختر الشريحة لتعديل موضعها:")}
                    </span>
                    {formState.bannerUrls.map((_, idx) => (
                      <button
                        key={`select-slide-${idx}`}
                        type="button"
                        onClick={() => setPreviewSlideIndex(idx)}
                        style={{
                          padding: '3px 9px',
                          borderRadius: '5px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: previewSlideIndex === idx ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                          background: previewSlideIndex === idx ? '#170e5e' : '#ffffff',
                          color: previewSlideIndex === idx ? '#ffffff' : '#475569',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {t('storefront.storefront_settings_tab.s100', "شريحة #")}{idx + 1}
                      </button>
                    ))}
                  </div>
                )}

                {/* Interactive Facebook-Style Drag-to-Position Canvas */}
                {formState.bannerUrls.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <div
                      ref={previewContainerRef}
                      onMouseEnter={() => setIsPreviewHovered(true)}
                      onMouseLeave={() => setIsPreviewHovered(false)}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '4 / 1',
                        minHeight: '130px',
                        maxHeight: '200px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        border: '2px dashed #2563eb', // Dashed guide frame
                        background: '#0f172a',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        touchAction: 'none',
                        boxShadow: '0 2px 10px rgba(37, 99, 235, 0.14)',
                        userSelect: 'none',
                      }}
                    >
                      {/* Ambient Blurred Backdrop Layer */}
                      {formState.bannerFit === 'contain' && (
                        <div
                          aria-hidden="true"
                          style={{
                            position: 'absolute',
                            inset: '-20px',
                            backgroundImage: `url(${formState.bannerUrls[previewSlideIndex] || formState.bannerUrls[0]})`,
                            backgroundSize: 'cover',
                            backgroundPosition: currentSlidePosition,
                            filter: 'blur(28px) saturate(1.3) brightness(0.65)',
                            transform: 'scale(1.2)',
                            pointerEvents: 'none',
                            zIndex: 1,
                          }}
                        />
                      )}

                      {/* Foreground Image Layer with Object Position */}
                      <img
                        src={formState.bannerUrls[previewSlideIndex] || formState.bannerUrls[0]}
                        alt={t('storefront.storefront_settings_tab.s101', "معاينة حية للبنر")}
                        draggable={false}
                        style={{
                          position: 'relative',
                          zIndex: 2,
                          width: '100%',
                          height: '100%',
                          objectFit: formState.bannerFit || 'cover',
                          objectPosition: currentSlidePosition,
                          display: 'block',
                          pointerEvents: 'none',
                          transition: isDragging ? 'none' : 'object-position 0.15s ease',
                          filter: formState.bannerFit === 'contain' ? 'drop-shadow(0 4px 18px rgba(0,0,0,0.45))' : 'none',
                        }}
                      />

                      {/* Viewport Boundary & Dashed Guidelines Overlay */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          pointerEvents: 'none',
                          border: '1px solid rgba(255, 255, 255, 0.35)',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          padding: '8px',
                        }}
                      >
                        {/* Top Overlay Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div
                            style={{
                              background: 'rgba(15, 23, 42, 0.88)',
                              color: '#ffffff',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: '6px',
                              backdropFilter: 'blur(4px)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                            }}
                          >
                            <span>{t('storefront.storefront_settings_tab.s102', "اسحب الصورة بالماوس لضبط موضع الظهور")}</span>
                          </div>

                          <div
                            style={{
                              background: isDragging ? '#16a34a' : 'rgba(15, 23, 42, 0.88)',
                              color: '#ffffff',
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backdropFilter: 'blur(4px)',
                              transition: 'background 0.2s',
                            }}
                          >
                            {isDragging ? t('storefront.storefront_settings_tab.s103', "جاري التحريك...") : (
                              formState.bannerUrls.length > 1
                                ? `شريحة ${previewSlideIndex + 1} من ${formState.bannerUrls.length}`
                                : t('storefront.storefront_settings_tab.s104', "شريحة رئيسية")
                            )}
                          </div>
                        </div>

                        {/* Bottom Overlay: Coordinate Readout */}
                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                          <div
                            style={{
                              background: 'rgba(15, 23, 42, 0.82)',
                              color: '#ffffff',
                              fontSize: '10px',
                              fontFamily: 'monospace',
                              direction: 'ltr',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backdropFilter: 'blur(4px)',
                            }}
                          >
                            {t('storefront.storefront_settings_tab.s105', "الموضع: أفقي")} {Math.round(currentCoords.x)}{t('storefront.storefront_settings_tab.s106', "% | رأسي")} {Math.round(currentCoords.y)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Alignment Presets & Center Reset */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', padding: '6px 4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => handleSetExactPosition('50% 50%')}
                          style={{
                            padding: '3px 8px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#170e5e',
                            cursor: 'pointer',
                          }}
                        >
                          {t('storefront.storefront_settings_tab.s107', "⟲ توسيط للمنتصف (50% 50%)")}
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>{t('storefront.storefront_settings_tab.s108', "محاذاة سريعة:")}</span>
                        <button
                          type="button"
                          onClick={() => handleSetExactPosition('50% 0%')}
                          style={{
                            padding: '2px 6px',
                            fontSize: '10px',
                            fontWeight: 700,
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            color: '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          {t('storefront.storefront_settings_tab.s109', "أعلى")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetExactPosition('50% 100%')}
                          style={{
                            padding: '2px 6px',
                            fontSize: '10px',
                            fontWeight: 700,
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            color: '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          {t('storefront.storefront_settings_tab.s110', "أسفل")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetExactPosition('100% 50%')}
                          style={{
                            padding: '2px 6px',
                            fontSize: '10px',
                            fontWeight: 700,
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            color: '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          {t('storefront.storefront_settings_tab.s111', "يمين")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetExactPosition('0% 50%')}
                          style={{
                            padding: '2px 6px',
                            fontSize: '10px',
                            fontWeight: 700,
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            color: '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          {t('storefront.storefront_settings_tab.s112', "يسار")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Slide Auto-Slide Duration Setting */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                      {t('storefront.storefront_settings_tab.s113', "سرعة تقليب الشرائح تلقائياً:")}
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                      {t('storefront.storefront_settings_tab.s114', "يقف التقليب تلقائياً بمجرد وقوف الماوس فوق البنر")}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', minWidth: 0 }}>
                    {[2, 3, 4, 5, 7, 10].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setFormState((prev) => ({ ...prev, bannerIntervalSeconds: sec }))}
                        style={{
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '5px',
                          border: formState.bannerIntervalSeconds === sec ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                          background: formState.bannerIntervalSeconds === sec ? '#170e5e' : '#ffffff',
                          color: formState.bannerIntervalSeconds === sec ? '#ffffff' : '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        {sec} {t('storefront.storefront_settings_tab.s115', "ث")}
                      </button>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginInlineStart: '4px' }}>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={formState.bannerIntervalSeconds || 4}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            bannerIntervalSeconds: Math.max(1, Number(e.target.value)),
                          }))
                        }
                        style={{
                          width: '42px',
                          padding: '3px 4px',
                          borderRadius: '5px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '11px',
                          fontWeight: 700,
                          textAlign: 'center',
                          direction: 'ltr',
                        }}
                      />
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>{t('storefront.storefront_settings_tab.s116', "ث")}</span>
                    </div>
                  </div>
                </div>

                {/* Banner Fit Mode Setting */}
                {formState.bannerUrls.length > 0 && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      minWidth: 0,
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                      {t('storefront.storefront_settings_tab.s117', "طريقة ملء إطار البنر:")}
                    </span>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', minWidth: 0 }}>
                      <button
                        type="button"
                        onClick={() => setFormState((prev) => ({ ...prev, bannerFit: 'cover' }))}
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '5px',
                          border: formState.bannerFit === 'cover' ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                          background: formState.bannerFit === 'cover' ? '#eff6ff' : '#ffffff',
                          color: formState.bannerFit === 'cover' ? '#170e5e' : '#64748b',
                          cursor: 'pointer',
                        }}
                      >
                        <span className="banner-fit-full">{t('storefront.storefront_settings_tab.s118', "ملء كامل الإطار (Cover - مفضل للسحب)")}</span>
                        <span className="banner-fit-short">{t('storefront.storefront_settings_tab.s119', "ملء الإطار (Cover)")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormState((prev) => ({ ...prev, bannerFit: 'contain' }))}
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '5px',
                          border: formState.bannerFit === 'contain' ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                          background: formState.bannerFit === 'contain' ? '#eff6ff' : '#ffffff',
                          color: formState.bannerFit === 'contain' ? '#170e5e' : '#64748b',
                          cursor: 'pointer',
                        }}
                      >
                        <span className="banner-fit-full">{t('storefront.storefront_settings_tab.s120', "احتواء كامل (Contain)")}</span>
                        <span className="banner-fit-short">{t('storefront.storefront_settings_tab.s121', "احتواء (Contain)")}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Hero Banner Width Mode Setting (Full-Bleed vs Contained) */}
                {formState.bannerUrls.length > 0 && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      minWidth: 0,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', display: 'block' }}>
                        عرض البنر العلوي في واجهة المتجر:
                      </span>
                      <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                        الامتداد السينمائي بكامل حواف الشاشة (Full-Bleed) يعطي فخامة المتاجر العالمية
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', minWidth: 0 }}>
                      <button
                        type="button"
                        onClick={() => setFormState((prev) => ({ ...prev, heroBannerFullBleed: true }))}
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '5px',
                          border: formState.heroBannerFullBleed !== false ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                          background: formState.heroBannerFullBleed !== false ? '#eff6ff' : '#ffffff',
                          color: formState.heroBannerFullBleed !== false ? '#170e5e' : '#64748b',
                          cursor: 'pointer',
                        }}
                      >
                        عرض كامل بحواف الشاشة (Full-Bleed)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormState((prev) => ({ ...prev, heroBannerFullBleed: false }))}
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '5px',
                          border: formState.heroBannerFullBleed === false ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                          background: formState.heroBannerFullBleed === false ? '#eff6ff' : '#ffffff',
                          color: formState.heroBannerFullBleed === false ? '#170e5e' : '#64748b',
                          cursor: 'pointer',
                        }}
                      >
                        داخل كادر مدمج (Contained)
                      </button>
                    </div>
                  </div>
                )}

                {/* List of Configured Slides */}
                {formState.bannerUrls.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>
                      {t('storefront.storefront_settings_tab.s122', "الشرائح المضافة (")}{formState.bannerUrls.length}):
                    </span>
                    {formState.bannerUrls.map((url, idx) => (
                      <div
                        key={`${url}-${idx}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img
                            src={url}
                            alt={`شريحة ${idx + 1}`}
                            style={{
                              width: '50px',
                              height: '28px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                            }}
                          />
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0f172a' }}>
                            {t('storefront.storefront_settings_tab.s123', "شريحة #")}{idx + 1} {idx === 0 ? t('storefront.storefront_settings_tab.s124', "(الرئيسية الأولى)") : ''}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveBanner(idx, 'up')}
                              title={t('storefront.storefront_settings_tab.s125', "نقل للأعلى")}
                              style={{
                                padding: '2px 6px',
                                fontSize: '11px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                cursor: 'pointer',
                              }}
                            >
                              ▲
                            </button>
                          )}
                          {idx < formState.bannerUrls.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoveBanner(idx, 'down')}
                              title={t('storefront.storefront_settings_tab.s126', "نقل للأسفل")}
                              style={{
                                padding: '2px 6px',
                                fontSize: '11px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                cursor: 'pointer',
                              }}
                            >
                              ▼
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveBanner(idx)}
                            title={t('storefront.storefront_settings_tab.s127', "حذف هذه الشريحة")}
                            style={{
                              padding: '2px 6px',
                              fontSize: '11px',
                              borderRadius: '4px',
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              color: '#b91c1c',
                              fontWeight: 700,
                              cursor: 'pointer',
                              marginInlineStart: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <XIcon size={12} color="#b91c1c" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Design Guidelines Helper Box */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '12px',
                  fontSize: '11.5px',
                  color: '#334155',
                  lineHeight: '1.6',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                    <LightbulbIcon size={14} color="#f59e0b" />
                    <span>{t('storefront.storefront_settings_tab.s128', "دليل التصميم الاحترافي للبنر بالذكاء الاصطناعي (ChatGPT / Midjourney / DALL-E):")}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                    <div>
                      • <strong>بنر الهيرو كامل الشاشة (Full-Bleed):</strong> المقاس الذهبي هو <strong>1920 × 480</strong> بكسل (أو <strong>1920 × 400</strong>) بنسبة <strong>4:1</strong>. هذا المقاس يملأ نافذة المتصفح بنقاء استثنائي وفخامة تضاهي كبرى المتاجر العالمية دون أي بكسلة على الشاشات الكبيرة.
                    </div>
                    <div>
                      • <strong>بنر الهيرو المدمج (Contained):</strong> المقاس المعتمد <strong>1600 × 400</strong> أو <strong>1440 × 360</strong> بكسل بنسبة <strong>4:1</strong> ليطابق عرض كادر المتجر بدقة دون أي زوائد.
                    </div>
                    <div>
                      • <strong>البانرات الفاصلة بين الأقسام (Mid-Page Promos):</strong> المقاس الموصى به <strong>1400 × 350</strong> بكسل (أو <strong>1200 × 300</strong>) بنسبة <strong>4:1</strong> لملء الفواصل الإعلانية بين صفوف المنتجات بوضوح وسرعة تحميل فائقة.
                    </div>
                    <div>
                      • <strong>قاعدة منطقة الأمان (Safe Zone 60% بالمنتصف):</strong> احرص دائماً على حصر اسم المتجر، الشعار، عبارات العرض، والمنتجات في <strong>الـ 60% الوسطى فقط</strong>، مع ترك الـ 20% يميناً ويساراً كخلفية ممتدة وإضاءة ناعمة، لضمان ظهور البنر متجاوباً ومتكاملاً على شاشات الموبايل والحواسيب دون أي قص للحروف أو المنتجات.
                    </div>
                  </div>

                  {/* Dual Prompt Cards (Arabic for ChatGPT & English for Midjourney) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Arabic Prompt Card (ChatGPT / DALL-E) */}
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '8px 10px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#170e5e' }}>{t('storefront.storefront_settings_tab.s140', "صيغة شات جي بي تي (ChatGPT / DALL-E بالعربية):")}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyPrompt('ar')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: copiedPromptKey === 'ar' ? '#ecfdf5' : '#f1f5f9',
                            color: copiedPromptKey === 'ar' ? '#059669' : '#1e293b',
                            border: copiedPromptKey === 'ar' ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
                            borderRadius: '5px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {copiedPromptKey === 'ar' ? <CheckIcon size={12} color="#059669" /> : <CopyIcon size={12} color="#475569" />}
                          <span>{copiedPromptKey === 'ar' ? t('storefront.storefront_settings_tab.s141', "تم نسخ الصيغة العربية!") : t('storefront.storefront_settings_tab.s142', "نسخ برومبت ChatGPT")}</span>
                        </button>
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: '#475569',
                        background: '#f8fafc',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px dashed #e2e8f0',
                        userSelect: 'all',
                        whiteSpace: 'pre-line',
                        wordBreak: 'break-word',
                      }}>
                        {aiPromptTemplateAr}
                      </div>
                    </div>

                    {/* English Prompt Card (Midjourney / FLUX / DALL-E) */}
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '8px 10px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#170e5e' }}>{t('storefront.storefront_settings_tab.s143', "صيغة Midjourney / FLUX (باللغة الإنجليزية للأبعاد الدقيقة):")}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyPrompt('en')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: copiedPromptKey === 'en' ? '#ecfdf5' : '#f1f5f9',
                            color: copiedPromptKey === 'en' ? '#059669' : '#1e293b',
                            border: copiedPromptKey === 'en' ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
                            borderRadius: '5px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {copiedPromptKey === 'en' ? <CheckIcon size={12} color="#059669" /> : <CopyIcon size={12} color="#475569" />}
                          <span>{copiedPromptKey === 'en' ? 'Copied Prompt!' : t('storefront.storefront_settings_tab.s144', "نسخ برومبت Midjourney")}</span>
                        </button>
                      </div>
                      <div style={{
                        fontSize: '10.5px',
                        direction: 'ltr',
                        fontFamily: 'monospace',
                        color: '#334155',
                        background: '#f8fafc',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px dashed #e2e8f0',
                        userSelect: 'all',
                        wordBreak: 'break-word',
                      }}>
                        {aiPromptTemplateEn}
                      </div>
                    </div>
                  </div>
                </div>

                {bannerCompressFeedback && (
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#047857',
                      background: '#ecfdf5',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      marginBottom: '8px',
                    }}
                  >
                    {bannerCompressFeedback}
                  </div>
                )}

                {/* Add New Banner Button */}
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 16px',
                    borderRadius: '6px',
                    background: '#170e5e',
                    border: '1px solid #170e5e',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: isCompressingBanner ? 'wait' : 'pointer',
                    boxShadow: '0 1px 3px rgba(23, 14, 94, 0.2)',
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={isCompressingBanner}
                    onChange={handleBannerFileChange}
                  />
                  <span>
                    {isCompressingBanner
                      ? t('storefront.storefront_settings_tab.s145', "جاري الضغط والمعالجة...")
                      : formState.bannerUrls.length > 0
                      ? t('storefront.storefront_settings_tab.s146', "إضافة صورة شريحة أخرى +")
                      : t('storefront.storefront_settings_tab.s147', "رفع صورة بنر أولى +")}
                  </span>
                </label>
              </div>
            </div>

            {/* Card 2.5: بانرات التصفح الإعلانية الفاصلة بين الأقسام (Mid-Page Promos) */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                gridColumn: '1 / -1',
              }}
            >
              <div
                style={{
                  borderBottom: '1px solid #f1f5f9',
                  paddingBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <LayersIcon size={16} color="#170e5e" />
                    <span>بانرات التصفح الإعلانية الفاصلة بين الأقسام (Mid-Page Promos)</span>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '1px 7px' }}>
                      المقاس الموصى به: 1400 × 350 بكسل (4:1)
                    </span>
                  </h3>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    فواصل إعلانية جذابة تفصل بين صفوف وأقسام المنتجات لكسر الملل وتوجيه الزبائن لأقسام وعروض محددة
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      background: '#f8fafc',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#0f172a',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formState.midBannersEnabled}
                      onChange={(e) => setFormState({ ...formState, midBannersEnabled: e.target.checked })}
                      style={{ width: '15px', height: '15px', accentColor: '#170e5e', cursor: 'pointer' }}
                    />
                    <span>تفعيل البانرات الفاصلة</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMidBanner}
                    style={{
                      background: '#170e5e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <PlusCircleIcon size={14} color="#ffffff" />
                    <span>إضافة بنر فاصل جديد</span>
                  </button>
                </div>
              </div>

              {/* Banners List */}
              {(!formState.midBanners || formState.midBanners.length === 0) ? (
                <div
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px dashed #cbd5e1',
                  }}
                >
                  <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                    لم يتم إضافة أي بنرات فاصلة حتى الآن. يمكنك إضافة بنرات شريطية جذابة تفصل بين الرفوف مثل المتاجر العالمية.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddMidBanner}
                    style={{
                      background: '#ffffff',
                      color: '#170e5e',
                      border: '1px solid #170e5e',
                      borderRadius: '6px',
                      padding: '5px 14px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <PlusCircleIcon size={14} color="#170e5e" />
                    <span>إضافة أول بنر إعلاني فاصل</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {formState.midBanners.map((banner, index) => (
                    <div
                      key={banner.id || `mid-${index}`}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      {/* Banner Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, background: '#170e5e', color: '#ffffff', padding: '2px 8px', borderRadius: '4px' }}>
                            بنر #{index + 1}
                          </span>
                          <span style={{ fontSize: '11.5px', color: '#0f172a', fontWeight: 700 }}>
                            {banner.title || 'بنر إعلاني فاصل (بدون عنوان)'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={banner.isEnabled !== false}
                              onChange={(e) => handleUpdateMidBanner(index, { isEnabled: e.target.checked })}
                              style={{ width: '14px', height: '14px', accentColor: '#170e5e' }}
                            />
                            <span>مفعل</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveMidBanner(index)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '2px 6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <Trash2Icon size={12} color="#ef4444" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </div>

                      {/* Content Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', alignItems: 'start' }}>
                        {/* Image Preview & Upload */}
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                            صورة البنر (نسبة 4:1 أو عريضة):
                          </label>
                          <div
                            style={{
                              width: '100%',
                              aspectRatio: '3.6 / 1',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              border: '1px dashed #cbd5e1',
                              background: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                              marginBottom: '6px',
                            }}
                          >
                            {banner.imageUrl ? (
                              <img
                                src={banner.imageUrl}
                                alt="معاينة البنر"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>لا توجد صورة بعد</span>
                            )}
                          </div>
                          <label
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              width: '100%',
                              padding: '5px 8px',
                              borderRadius: '5px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#170e5e',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                            }}
                          >
                            <UploadIcon size={12} color="#170e5e" />
                            <span>
                              {compressingMidBannerIdx === index
                                ? 'جاري ضغط ومعالجة الصورة...'
                                : banner.imageUrl
                                ? 'تغيير صورة البنر'
                                : 'رفع صورة البنر (WebP)'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              disabled={compressingMidBannerIdx === index}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleMidBannerFileChange(index, f);
                              }}
                            />
                          </label>
                        </div>

                        {/* Text Fields */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                              عنوان البنر (اختياري لو مدمج بالتصميم):
                            </label>
                            <input
                              type="text"
                              value={banner.title || ''}
                              placeholder="مثال: عروض كروت الشاشة والجيمنج"
                              onChange={(e) => handleUpdateMidBanner(index, { title: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                borderRadius: '5px',
                                border: '1px solid #cbd5e1',
                                fontSize: '11.5px',
                                boxSizing: 'border-box',
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                              نص توضيحي فرعي (اختياري):
                            </label>
                            <input
                              type="text"
                              value={banner.subtitle || ''}
                              placeholder="مثال: خصم 15% على كروت الشاشة المستعملة الأصلية بضمان معتمد"
                              onChange={(e) => handleUpdateMidBanner(index, { subtitle: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                borderRadius: '5px',
                                border: '1px solid #cbd5e1',
                                fontSize: '11.5px',
                                boxSizing: 'border-box',
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                              شارة صغيرة (Badge):
                            </label>
                            <input
                              type="text"
                              value={banner.badge || ''}
                              placeholder="مثال: عرض محدود، جديد، حصرى"
                              onChange={(e) => handleUpdateMidBanner(index, { badge: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                borderRadius: '5px',
                                border: '1px solid #cbd5e1',
                                fontSize: '11.5px',
                                boxSizing: 'border-box',
                              }}
                            />
                          </div>
                        </div>

                        {/* Slot & Link Action */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                              موضع الظهور في الصفحة:
                            </label>
                            <select
                              value={banner.slot || 'after_deals'}
                              onChange={(e) => handleUpdateMidBanner(index, { slot: e.target.value as any })}
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                borderRadius: '5px',
                                border: '1px solid #cbd5e1',
                                fontSize: '11.5px',
                                background: '#ffffff',
                                boxSizing: 'border-box',
                              }}
                            >
                              <option value="after_deals">بعد صف العروض الحصرية الأولى</option>
                              <option value="after_row_1">بعد أول قسم منتجات</option>
                              <option value="after_row_2">بعد ثاني قسم منتجات</option>
                              <option value="bottom">في نهاية الصفحة قبل الفوتر</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                              نوع الرابط عند نقر الزبون:
                            </label>
                            <select
                              value={banner.linkType || 'category'}
                              onChange={(e) => handleUpdateMidBanner(index, { linkType: e.target.value as any })}
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                borderRadius: '5px',
                                border: '1px solid #cbd5e1',
                                fontSize: '11.5px',
                                background: '#ffffff',
                                boxSizing: 'border-box',
                              }}
                            >
                              <option value="category">الانتقال لتصنيف / قسم محدد</option>
                              <option value="deals">الانتقال للعروض والتخفيضات (Smart Deals)</option>
                              <option value="url">رابط خارجي مخصص</option>
                              <option value="none">بدون رابط (صورة للعرض فقط)</option>
                            </select>
                          </div>

                          {banner.linkType === 'category' && (
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                                اختر القسم المرتبط بالبنر:
                              </label>
                              <select
                                value={banner.categoryId || ''}
                                onChange={(e) => handleUpdateMidBanner(index, { categoryId: Number(e.target.value) || undefined })}
                                style={{
                                  width: '100%',
                                  padding: '5px 8px',
                                  borderRadius: '5px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '11.5px',
                                  background: '#ffffff',
                                  boxSizing: 'border-box',
                                }}
                              >
                                <option value="">-- اختر قسماً --</option>
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {banner.linkType === 'url' && (
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                                الرابط المخصص:
                              </label>
                              <input
                                type="text"
                                value={banner.customUrl || ''}
                                placeholder="https://..."
                                onChange={(e) => handleUpdateMidBanner(index, { customUrl: e.target.value })}
                                style={{
                                  width: '100%',
                                  padding: '5px 8px',
                                  borderRadius: '5px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '11.5px',
                                  direction: 'ltr',
                                  boxSizing: 'border-box',
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card 3: أكواد البيكسل والتتبع الإعلاني */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                gridColumn: '1 / -1',
              }}
            >
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                    {t('storefront.storefront_settings_tab.s148', "أكواد البيكسل والتتبع الإعلاني (Marketing & Conversion Pixels)")}
                  </h3>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {t('storefront.storefront_settings_tab.s149', "تتبع الزيارات وإتمام عمليات الشراء تلقائياً على المنصات الإعلانية العالمية")}
                  </span>
                </div>
                <span style={{ fontSize: '10.5px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  {t('storefront.storefront_settings_tab.s150', "تتبع تلقائي للأحداث")}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Meta / Facebook Pixel */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    {t('storefront.storefront_settings_tab.s151', "معرف بيكسل فيسبوك / ميتا (Meta Pixel ID):")}
                  </label>
                  <input
                    type="text"
                    value={formState.metaPixelId}
                    onChange={(e) => setFormState({ ...formState, metaPixelId: e.target.value.trim() })}
                    placeholder={t('storefront.storefront_settings_tab.s152', "مثال: 123456789012345")}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      direction: 'ltr',
                      textAlign: 'left',
                    }}
                  />
                  <span style={{ fontSize: '10px', color: '#64748b' }}>{t('storefront.storefront_settings_tab.s153', "يتتبع أحداث ViewContent و InitiateCheckout و Purchase")}</span>
                </div>

                {/* Google Analytics 4 */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    {t('storefront.storefront_settings_tab.s154', "معرف جوجل أناليتكس 4 (GA4 Measurement ID):")}
                  </label>
                  <input
                    type="text"
                    value={formState.ga4Id}
                    onChange={(e) => setFormState({ ...formState, ga4Id: e.target.value.trim().toUpperCase() })}
                    placeholder={t('storefront.storefront_settings_tab.s155', "مثال: G-XXXXXXXXXX")}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      direction: 'ltr',
                      textAlign: 'left',
                    }}
                  />
                  <span style={{ fontSize: '10px', color: '#64748b' }}>{t('storefront.storefront_settings_tab.s156', "إحصائيات متقدمة لحركة الزوار والتجارة الإلكترونية")}</span>
                </div>

                {/* TikTok Pixel */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    {t('storefront.storefront_settings_tab.s157', "معرف بيكسل تيك توك (TikTok Pixel ID):")}
                  </label>
                  <input
                    type="text"
                    value={formState.tiktokPixelId}
                    onChange={(e) => setFormState({ ...formState, tiktokPixelId: e.target.value.trim() })}
                    placeholder={t('storefront.storefront_settings_tab.s158', "مثال: C9XXXXXX123456")}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      direction: 'ltr',
                      textAlign: 'left',
                    }}
                  />
                  <span style={{ fontSize: '10px', color: '#64748b' }}>{t('storefront.storefront_settings_tab.s159', "تتبع حملات تيك توك الإعلانية ومعدل التحويل")}</span>
                </div>

                {/* Snapchat Pixel */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    {t('storefront.storefront_settings_tab.s160', "معرف بيكسل سناب شات (Snapchat Pixel ID):")}
                  </label>
                  <input
                    type="text"
                    value={formState.snapchatPixelId}
                    onChange={(e) => setFormState({ ...formState, snapchatPixelId: e.target.value.trim() })}
                    placeholder={t('storefront.storefront_settings_tab.s161', "مثال: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx")}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      direction: 'ltr',
                      textAlign: 'left',
                    }}
                  />
                  <span style={{ fontSize: '10px', color: '#64748b' }}>{t('storefront.storefront_settings_tab.s162', "تتبع حملات سناب شات الإعلانية ومشتريات المتجر")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Save Action Button with Direct Visual Feedback & Animations */}
          <div style={{ width: '100%', marginTop: '8px' }}>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: '8px',
                background: savedSuccess ? '#16a34a' : updateMutation.isPending ? '#334155' : '#170e5e',
                color: '#ffffff',
                fontSize: '13.5px',
                fontWeight: 800,
                border: 'none',
                cursor: updateMutation.isPending ? 'wait' : 'pointer',
                boxShadow: savedSuccess
                  ? '0 2px 10px rgba(22, 163, 74, 0.35)'
                  : '0 2px 6px rgba(23, 14, 94, 0.25)',
                transition: 'all 0.25s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transform: savedSuccess ? 'scale(1.008)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!savedSuccess && !updateMutation.isPending) e.currentTarget.style.background = '#110a47';
              }}
              onMouseLeave={(e) => {
                if (!savedSuccess && !updateMutation.isPending) e.currentTarget.style.background = '#170e5e';
              }}
            >
              {updateMutation.isPending ? (
                <span>{t('storefront.storefront_settings_tab.s163', "جاري الحفظ والمعالجة...")}</span>
              ) : savedSuccess ? (
                <>
                  <CheckIcon size={18} color="#ffffff" />
                  <span>تم حفظ وتطبيق كافة إعدادات المتجر بنجاح!</span>
                </>
              ) : (
                <span>{t('storefront.storefront_settings_tab.s164', "حفظ إعدادات المتجر")}</span>
              )}
            </button>

            {savedSuccess && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: '8px',
                  color: '#15803d',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  marginTop: '8px',
                  boxShadow: '0 1px 4px rgba(22, 163, 74, 0.12)',
                }}
              >
                <CheckIcon size={16} color="#16a34a" />
                <span>تم تحديث وحفظ بيانات وهوية المتجر بنجاح! التغييرات مفعلة مباشرة الآن.</span>
              </div>
            )}
          </div>
        </form>
      )}

      {/* Tab 2: Coupons Manager */}
      {activeTab === 'coupons' && <StorefrontCouponsManager />}

      {/* Tab 3: Delivery Zones Matrix */}
      {activeTab === 'zones' && <StorefrontDeliveryZonesManager />}

      {/* Tab 4: Online Payment Gateways */}
      {activeTab === 'payments' && <StorefrontPaymentGatewaysManager />}

      {/* Tab 5: Product Studio in Full Width Grid */}
      {activeTab === 'images' && <StorefrontProductStudio slug={storeSlug} />}

      {/* Tab 6: Bosta Shipping Gateway */}
      {activeTab === 'bosta' && <BostaSettingsCard />}

      {/* Tab 7: GCC Shipping Gateways (Aramex & SMSA Express) */}
      {activeTab === 'gcc-shipping' && <GccShippingSettingsCard />}

      <TableQrPrintDialog
        open={isQrPrintOpen}
        onClose={() => setIsQrPrintOpen(false)}
        slug={storeSlug}
      />
    </div>
  );
}
