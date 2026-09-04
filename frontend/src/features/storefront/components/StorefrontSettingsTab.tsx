import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storefrontApi } from '../api/storefront.api';
import { compressImage } from '@/shared/utils/image-compressor';
import { StorefrontProductStudio } from './StorefrontProductStudio';

export function StorefrontSettingsTab() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'settings' | 'images'>('settings');
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
    title: '',
    bio: '',
    announcement: '',
    bannerUrl: '',
    bannerUrls: [] as string[],
    bannerFit: 'contain' as 'contain' | 'cover',
    bannerPosition: 'center' as 'top' | 'center' | 'bottom',
    deliveryFee: 0,
    minOrder: 0,
    whatsappPhone: '',
    customDomain: '',
  });

  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);

  // Auto-cycle the settings preview carousel every 3.2 seconds
  useEffect(() => {
    if (formState.bannerUrls.length <= 1) return;
    const interval = setInterval(() => {
      setPreviewSlideIndex((prev) => (prev + 1) % formState.bannerUrls.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [formState.bannerUrls.length]);

  useEffect(() => {
    if (settingsQuery.data) {
      const urls = settingsQuery.data.bannerUrls && settingsQuery.data.bannerUrls.length > 0
        ? settingsQuery.data.bannerUrls
        : (settingsQuery.data.bannerUrl ? [settingsQuery.data.bannerUrl] : []);

      setFormState({
        enabled: settingsQuery.data.enabled,
        title: settingsQuery.data.title || '',
        bio: settingsQuery.data.bio || '',
        announcement: settingsQuery.data.announcement || '',
        bannerUrl: urls[0] || settingsQuery.data.bannerUrl || '',
        bannerUrls: urls,
        bannerFit: (settingsQuery.data.bannerFit || 'contain') as 'contain' | 'cover',
        bannerPosition: (settingsQuery.data.bannerPosition || 'center') as 'top' | 'center' | 'bottom',
        deliveryFee: settingsQuery.data.deliveryFee || 0,
        minOrder: settingsQuery.data.minOrder || 0,
        whatsappPhone: settingsQuery.data.whatsappPhone || '',
        customDomain: (settingsQuery.data as any).customDomain || '',
      });
    }
  }, [settingsQuery.data]);

  const updateMutation = useMutation({
    mutationFn: storefrontApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefront-admin-settings'] });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    },
  });

  const storeSlug = settingsQuery.data?.slug || 'default';
  const storeUrl = `${window.location.origin}/store/${storeSlug}`;

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
      return {
        ...prev,
        bannerUrls: nextUrls,
        bannerUrl: nextUrls[0] || '',
      };
    });
  };

  const handleMoveBanner = (index: number, direction: 'up' | 'down') => {
    setFormState((prev) => {
      const nextUrls = [...prev.bannerUrls];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= nextUrls.length) return prev;
      const temp = nextUrls[index];
      nextUrls[index] = nextUrls[targetIndex];
      nextUrls[targetIndex] = temp;
      return {
        ...prev,
        bannerUrls: nextUrls,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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

              {/* Store Title */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  اسم وعنوان المتجر:
                </label>
                <input
                  type="text"
                  value={formState.title}
                  onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                  placeholder="مثال: رجب العطار للأعشاب والزيوت"
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

                {/* Live Mini Preview of Rotating Carousel */}
                {formState.bannerUrls.length > 0 && (
                  <div
                    style={{
                      borderRadius: '8px',
                      overflow: 'hidden',
                      marginBottom: '10px',
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      position: 'relative',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div
                      style={{
                        height: '140px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f8fafc',
                      }}
                    >
                      <img
                        src={formState.bannerUrls[previewSlideIndex] || formState.bannerUrls[0]}
                        alt="معاينة حية للبنر"
                        style={{
                          width: '100%',
                          maxHeight: '140px',
                          objectFit: formState.bannerFit || 'contain',
                          objectPosition: formState.bannerPosition || 'center',
                          display: 'block',
                          transition: 'opacity 0.3s ease',
                        }}
                      />
                    </div>

                    {/* Live Preview Indicator Badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(15, 23, 42, 0.75)',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      {formState.bannerUrls.length > 1
                        ? `معاينة حية للسلايدر (${previewSlideIndex + 1} من ${formState.bannerUrls.length})`
                        : 'بانر فردي ثابت'}
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

                {/* Banner Fit & Position Controls */}
                {formState.bannerUrls.length > 0 && (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    marginBottom: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>طريقة العرض في المتجر:</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setFormState(prev => ({ ...prev, bannerFit: 'contain' }))}
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
                          احتواء كامل (بدون قص)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormState(prev => ({ ...prev, bannerFit: 'cover' }))}
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
                          ملء كامل الإطار (Cover)
                        </button>
                      </div>
                    </div>

                    {formState.bannerFit === 'cover' && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>محاذاة التركيز الرأسي:</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {(['top', 'center', 'bottom'] as const).map(pos => (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => setFormState(prev => ({ ...prev, bannerPosition: pos }))}
                              style={{
                                padding: '3px 8px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                borderRadius: '4px',
                                border: formState.bannerPosition === pos ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                                background: formState.bannerPosition === pos ? '#eff6ff' : '#ffffff',
                                color: formState.bannerPosition === pos ? '#170e5e' : '#64748b',
                                cursor: 'pointer',
                              }}
                            >
                              {pos === 'top' ? 'أعلى' : pos === 'bottom' ? 'أسفل' : 'وسط'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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

      {/* Tab 2: Product Studio in Full Width Grid */}
      {activeTab === 'images' && <StorefrontProductStudio slug={storeSlug} />}
    </div>
  );
}
