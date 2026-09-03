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
    deliveryFee: 0,
    minOrder: 0,
    whatsappPhone: '',
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setFormState({
        enabled: settingsQuery.data.enabled,
        title: settingsQuery.data.title || '',
        bio: settingsQuery.data.bio || '',
        announcement: settingsQuery.data.announcement || '',
        bannerUrl: settingsQuery.data.bannerUrl || '',
        deliveryFee: settingsQuery.data.deliveryFee || 0,
        minOrder: settingsQuery.data.minOrder || 0,
        whatsappPhone: settingsQuery.data.whatsappPhone || '',
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
      setBannerCompressFeedback('جاري ضغط بنر المتجر بتقنية WebP...');

      const res = await compressImage(file, {
        maxWidth: 1280,
        maxHeight: 480,
        initialQuality: 0.78,
        maxSizeKb: 45,
      });

      setFormState((prev) => ({ ...prev, bannerUrl: res.dataUrl }));
      setBannerCompressFeedback(
        `✓ تم ضغط البنر (${res.originalSizeKb}KB → ${res.compressedSizeKb}KB، وفر ${res.compressionRatio}%)`
      );
      setIsCompressingBanner(false);
    } catch (err: any) {
      alert(`فشل ضغط البنر: ${err.message || 'خطأ غير متوقع'}`);
      setIsCompressingBanner(false);
    }
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

              {/* Banner Upload Box - Compact */}
              <div
                style={{
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  background: '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0f172a' }}>
                    صورة بنر واجهة المتجر:
                  </span>
                  {formState.bannerUrl && (
                    <button
                      type="button"
                      onClick={() => setFormState((prev) => ({ ...prev, bannerUrl: '' }))}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      حذف البنر ✕
                    </button>
                  )}
                </div>

                {formState.bannerUrl && (
                  <div style={{ borderRadius: '6px', overflow: 'hidden', marginBottom: '8px', maxHeight: '80px' }}>
                    <img
                      src={formState.bannerUrl}
                      alt="بنر المتجر"
                      style={{ width: '100%', maxHeight: '80px', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                )}

                {bannerCompressFeedback && (
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#047857',
                      background: '#ecfdf5',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      marginBottom: '6px',
                    }}
                  >
                    {bannerCompressFeedback}
                  </div>
                )}

                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: isCompressingBanner ? 'wait' : 'pointer',
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={isCompressingBanner}
                    onChange={handleBannerFileChange}
                  />
                  <span>{isCompressingBanner ? 'جاري الضغط...' : formState.bannerUrl ? 'تغيير صورة البنر' : 'رفع صورة بنر جديدة'}</span>
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
