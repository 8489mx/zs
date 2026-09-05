import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storefrontApi } from '../api/storefront.api';
import { compressImage } from '@/shared/utils/image-compressor';
import { StorefrontProductStudio } from './StorefrontProductStudio';
import { StorefrontCouponsManager } from './StorefrontCouponsManager';
import { StorefrontDeliveryZonesManager } from './StorefrontDeliveryZonesManager';
import { StorefrontPaymentGatewaysManager } from './StorefrontPaymentGatewaysManager';
import { BostaSettingsCard } from './BostaSettingsCard';

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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'settings' | 'coupons' | 'zones' | 'payments' | 'images' | 'bosta'>('settings');
  const [copySuccess, setCopySuccess] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [bannerCompressFeedback, setBannerCompressFeedback] = useState('');
  const [isCompressingBanner, setIsCompressingBanner] = useState(false);

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
      });
    }
  }, [settingsQuery.data]);

  const currentSlidePosition =
    formState.bannerPositions?.[previewSlideIndex] ||
    formState.bannerPosition ||
    '50% 50%';

  const currentCoords = parsePosition(currentSlidePosition);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initX: currentCoords.x,
      initY: currentCoords.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
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
      setTimeout(() => setSavedSuccess(false), 3000);
    },
  });

  const storeSlug = settingsQuery.data?.slug || 'default';
  const storeUrl = `${window.location.origin}/st/${storeSlug}`;

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
        maxWidth: 1280,
        maxHeight: 480,
        initialQuality: 0.78,
        maxSizeKb: 45,
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
        `✓ تم إضافة البنر بنجاح (${res.originalSizeKb}KB → ${res.compressedSizeKb}KB، وفر ${res.compressionRatio}%)`
      );
      setIsCompressingBanner(false);
      e.target.value = '';
    } catch (err: any) {
      alert(`فشل ضغط البنر: ${err.message || 'خطأ غير متوقع'}`);
      setIsCompressingBanner(false);
    }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formState);
  };

  if (settingsQuery.isLoading) {
    return <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>جاري تحميل إعدادات المتجر...</div>;
  }

  return (
    <div style={{ width: '100%', direction: 'rtl' }}>
      {/* Top Store URL Card - Compact ERP Style */}
      <div
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
              رابط المتجر الإلكتروني الخاص بنشاطك:
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
              مباشر ومفعل
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
              معرّف النسخة (Slug): <strong style={{ color: '#170e5e', fontFamily: 'monospace' }}>{storeSlug}</strong>
            </span>
          </div>
          <div style={{ fontSize: '13px', fontFamily: 'monospace', direction: 'ltr', color: '#170e5e', fontWeight: 700 }}>
            {storeUrl}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
            {copySuccess ? 'تم النسخ! ✓' : 'نسخ الرابط'}
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
            <span>معاينة المتجر ↗</span>
          </a>
        </div>
      </div>

      {/* Sub-Navigation Tabs - Compact */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '14px',
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
            transition: 'all 0.15s ease',
          }}
        >
          بيانات المتجر والبنر
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
            transition: 'all 0.15s ease',
          }}
        >
          كوبونات الخصم والعروض 🏷️
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
            transition: 'all 0.15s ease',
          }}
        >
          مناطق وأسعار التوصيل 🚚
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
            transition: 'all 0.15s ease',
          }}
        >
          بوابات الدفع الإلكتروني 💳
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
            transition: 'all 0.15s ease',
          }}
        >
          استوديو صور الأصناف
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
            transition: 'all 0.15s ease',
          }}
        >
          شحن بوسطة 📦
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
          }}
        >
          ✓ تم حفظ وتحديث إعدادات المتجر الإلكتروني بنجاح!
        </div>
      )}

      {/* Tab 1: Symmetrical 2-Column Cards - Compact & Proportional to Image 1 */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div
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
                  الهوية وبيانات المتجر
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  الاسم والشعار والوصف الظاهر لزبائنك
                </span>
              </div>

              {/* Store Title (Brand Name) */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  اسم المتجر (البراند التجاري):
                </label>
                <input
                  type="text"
                  value={formState.title}
                  onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                  placeholder="مثال: المهندس"
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

              {/* Store Address / Location Subtitle */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
                    عنوان أو مقر المتجر:
                  </label>
                  <span style={{ fontSize: '10.5px', color: '#64748b' }}>📍 يظهر كسطر فرعي بالهيدر</span>
                </div>
                <input
                  type="text"
                  value={formState.address}
                  onChange={(e) => setFormState({ ...formState, address: e.target.value })}
                  placeholder="مثال: تعاونيات الزهور - عمارة الفسطاط"
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
                  معرّف المتجر في الرابط (Slug):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', direction: 'ltr', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                  <span style={{ padding: '6px 10px', background: '#f8fafc', color: '#64748b', fontSize: '12px', borderRight: '1px solid #cbd5e1', fontWeight: 600, userSelect: 'none' }}>
                    {window.location.origin}/st/
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
                </div>
                <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b', marginTop: '3px' }}>
                  يُستخدم في رابط متجرك المباشر (أحرف إنجليزية وأرقام فقط)
                </span>
              </div>

              {/* Store Bio */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  نبذة تعريفية بالمتجر (الوصف):
                </label>
                <input
                  type="text"
                  value={formState.bio}
                  onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
                  placeholder="مثال: أفضل منتجات العطارة والزيوت الطبيعية 100%"
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
                  الشريط الإعلاني العلوي (رسالة العروض):
                </label>
                <input
                  type="text"
                  value={formState.announcement}
                  onChange={(e) => setFormState({ ...formState, announcement: e.target.value })}
                  placeholder="مثال: توصيل سريع • شحن مجاني للطلبات فوق 500 جنيه"
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
                  رقم واتساب المخصص لاستقبال الطلبات:
                </label>
                <input
                  type="tel"
                  value={formState.whatsappPhone}
                  onChange={(e) => setFormState({ ...formState, whatsappPhone: e.target.value })}
                  placeholder="مثال: 01012345678"
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

              {/* Custom Domain Section */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                    الدومين المخصص لمتجرك (Custom Domain):
                  </label>
                  <span style={{ fontSize: '10.5px', background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    ميزة متقدمة
                  </span>
                </div>
                <input
                  type="text"
                  value={formState.customDomain}
                  onChange={(e) => setFormState({ ...formState, customDomain: e.target.value })}
                  placeholder="مثال: store.mybrand.com"
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
                <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
                  لربط دومينك الخاص، أضف سجل <strong>CNAME</strong> في لوحة تحكم نطاقك يوجه إلى:
                  <code style={{ background: '#e2e8f0', padding: '2px 5px', borderRadius: '4px', margin: '0 4px', color: '#0f172a' }}>
                    92-5-178-54.sslip.io
                  </code>
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
                  التشغيل والتوصيل وبنر الواجهة
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  إعدادات التوصيل وتخصيص البنر
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
                }}
              >
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block' }}>
                    تفعيل استقبال الطلبات أونلاين
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    إتاحة أو إيقاف استقبال طلبات الشراء
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formState.enabled}
                  onChange={(e) => setFormState({ ...formState, enabled: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: '#170e5e', cursor: 'pointer' }}
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
                }}
              >
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block' }}>
                    تفعيل العروض التسويقية الذكية (Smart Deals)
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    توليد شارات وتخفيضات شكلية على الأصناف المميزة لإعطاء مظهر تسويقي جذاب للمتجر
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formState.smartDealsEnabled}
                  onChange={(e) => setFormState({ ...formState, smartDealsEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#170e5e', cursor: 'pointer' }}
                />
              </div>

              {/* Delivery Fee & Min Order */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    رسوم التوصيل (ج.م):
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
                    الحد الأدنى للطلب (ج.م):
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
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px' }}>💡</span>
                  <span style={{ fontSize: '11px', color: '#170e5e', fontWeight: 600 }}>
                    هل تريد تحديد أسعار دليفري مختلفة لكل حي أو محافظة تخدمها؟
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
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  إدارة مصفوفة المناطق ↗
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
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>🚚</span>
                      <span>تفعيل الشحن المجاني التلقائي (Free Shipping Rule)</span>
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '1px' }}>
                      إلغاء رسوم التوصيل تلقائياً عندما يتجاوز إجمالي مشتريات الزبون حداً معيناً
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formState.freeShippingEnabled}
                    onChange={(e) => setFormState({ ...formState, freeShippingEnabled: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#170e5e', cursor: 'pointer' }}
                  />
                </div>

                {formState.freeShippingEnabled && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      paddingTop: '6px',
                      borderTop: '1px dashed #bbf7d0',
                    }}
                  >
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#166534', whiteSpace: 'nowrap' }}>
                      شحن مجاني عند الطلب بمبلغ (ج.م) أو أكثر:
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formState.freeShippingMinOrder}
                      onChange={(e) =>
                        setFormState({ ...formState, freeShippingMinOrder: Math.max(1, Number(e.target.value)) })
                      }
                      style={{
                        width: '100px',
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
                      (مثال: 500 جنيه)
                    </span>
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
                      سلايدر بنرات العروض (متحرك تلقائياً):
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      أضف صورة أو أكثر لتقلب تلقائياً كـ GIF في واجهة المتجر
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
                      }}
                    >
                      حذف الكل ✕
                    </button>
                  )}
                </div>

                {/* Multi-Slide Selector Bar (when multiple slides) */}
                {formState.bannerUrls.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                      اختر الشريحة لتعديل موضعها:
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
                        شريحة #{idx + 1}
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
                        height: '160px',
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
                      {/* Image Layer with Object Position */}
                      <img
                        src={formState.bannerUrls[previewSlideIndex] || formState.bannerUrls[0]}
                        alt="معاينة حية للبنر"
                        draggable={false}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: formState.bannerFit || 'cover',
                          objectPosition: currentSlidePosition,
                          display: 'block',
                          pointerEvents: 'none',
                          transition: isDragging ? 'none' : 'object-position 0.15s ease',
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
                            <span>✋</span>
                            <span>اسحب الصورة بالماوس لضبط موضع الظهور (مثل فيسبوك)</span>
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
                            {isDragging ? 'جاري التحريك...' : (
                              formState.bannerUrls.length > 1
                                ? `شريحة ${previewSlideIndex + 1} من ${formState.bannerUrls.length}`
                                : 'شريحة رئيسية'
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
                            الموضع: أفقي {Math.round(currentCoords.x)}% | رأسي {Math.round(currentCoords.y)}%
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
                          ⟲ توسيط للمنتصف (50% 50%)
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>محاذاة سريعة:</span>
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
                          أعلى
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
                          أسفل
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
                          يمين
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
                          يسار
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
                      سرعة تقليب الشرائح تلقائياً:
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                      يقف التقليب تلقائياً بمجرد وقوف الماوس فوق البنر
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
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
                        {sec} ث
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
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>ث</span>
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
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                      طريقة ملء إطار البنر:
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
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
                        ملء كامل الإطار (Cover - مفضل للسحب)
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
                        احتواء كامل (Contain)
                      </button>
                    </div>
                  </div>
                )}

                {/* List of Configured Slides */}
                {formState.bannerUrls.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>
                      الشرائح المضافة ({formState.bannerUrls.length}):
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
                            شريحة #{idx + 1} {idx === 0 ? '(الرئيسية الأولى)' : ''}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveBanner(idx, 'up')}
                              title="نقل للأعلى"
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
                              title="نقل للأسفل"
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
                            title="حذف هذه الشريحة"
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
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Design Guidelines Helper Box */}
                <div style={{
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  marginBottom: '10px',
                  fontSize: '11px',
                  color: '#0369a1',
                  lineHeight: '1.5',
                }}>
                  <div style={{ fontWeight: 800, marginBottom: '2px' }}>
                    المقاس الموصى به لتصميم البنر بالذكاء الاصطناعي (AI):
                  </div>
                  <div>
                    • النسبة الذهبية: <strong>4:1 أو 16:5</strong> (المقاس: <strong>1280 × 320 بكسل</strong> أو <strong>1600 × 400</strong>).
                  </div>
                  <div>
                    • نصيحة: اطلب من الـ AI ترك هامش أمان 15% حول الحواف لضمان ظهور النصوص والشعار كاملة.
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
                      ? 'جاري الضغط والمعالجة...'
                      : formState.bannerUrls.length > 0
                      ? 'إضافة صورة شريحة أخرى +'
                      : 'رفع صورة بنر أولى +'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Save Action Button matching Image 1 exact height & proportions */}
          <div style={{ width: '100%', marginTop: '6px' }}>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              style={{
                width: '100%',
                padding: '9px 16px',
                borderRadius: '6px',
                background: '#170e5e',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: updateMutation.isPending ? 'wait' : 'pointer',
                boxShadow: '0 1px 3px rgba(23, 14, 94, 0.2)',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#110a47')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#170e5e')}
            >
              {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ إعدادات المتجر'}
            </button>
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
    </div>
  );
}
