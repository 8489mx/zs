import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import {
  ICON_COLOR_PRESETS,
  useProductIconSettings,
  getEffectiveIconColor,
} from './product-icon-theme';
import { ProductIcon } from './product-svg-catalog';
import { productsApi } from '@/features/products/api/products.api';
import { guessProductIcon } from '@/features/products/lib/product-smart-matcher';
import { invalidateCatalogDomain } from '@/app/query-invalidation';

interface ProductIconStudioModalProps {
  open: boolean;
  onClose: () => void;
  onBulkAutoAssign?: () => void;
  onBulkClearIcons?: () => void;
  isBulkLoading?: boolean;
}

export function ProductIconStudioModal({
  open,
  onClose,
  onBulkAutoAssign,
  onBulkClearIcons,
  isBulkLoading = false,
}: ProductIconStudioModalProps) {
  const queryClient = useQueryClient();
  const settings = useProductIconSettings();
  const [activeTab, setActiveTab] = useState<'theme' | 'manage'>('theme');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const sampleIcons = ['tea-bag', 'coffee-beans', 'tshirt', 'perfume-spray', 'pill-capsule', 'smartphone', 'cooking-oil', 'cart-shopping'];
  const currentColor = getEffectiveIconColor(settings);
  const isLoading = isBulkLoading || internalLoading;

  async function handleInternalAutoAssign() {
    if (onBulkAutoAssign) {
      onBulkAutoAssign();
      return;
    }
    try {
      setInternalLoading(true);
      setStatusMessage(null);
      const { products } = await productsApi.listAll();
      const updates: Array<{ id: number; icon: string }> = [];

      for (const p of products) {
        const guessed = guessProductIcon(p.name);
        if (guessed && (!p.icon || p.icon !== guessed)) {
          updates.push({ id: Number(p.id), icon: guessed });
        }
      }

      if (updates.length === 0) {
        setStatusMessage({
          type: 'info',
          text: 'تم الفحص: جميع الأصناف مضبوطة ولديها أيقونات متطابقة بالفعل.'
        });
        return;
      }

      const res = await productsApi.bulkUpdateIcons(updates);
      await invalidateCatalogDomain(queryClient, { includeProducts: true });
      await queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      setStatusMessage({
        type: 'success',
        text: `تم بنجاح ضبط وتعيين الأيقونات لعدد (${res.updated || updates.length}) صنف تلقائياً.`
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'حدث خطأ أثناء ضبط الأيقونات، يرجى إعادة المحاولة.'
      });
    } finally {
      setInternalLoading(false);
    }
  }

  async function handleInternalClearIcons() {
    if (onBulkClearIcons) {
      onBulkClearIcons();
      return;
    }
    try {
      setInternalLoading(true);
      setStatusMessage(null);
      const { products } = await productsApi.listAll();
      const updates = products
        .filter((p) => Boolean(p.icon))
        .map((p) => ({ id: Number(p.id), icon: '' }));

      if (updates.length === 0) {
        setStatusMessage({
          type: 'info',
          text: 'جميع الأصناف في النظام خالية من الأيقونات بالفعل.'
        });
        return;
      }

      await productsApi.bulkUpdateIcons(updates);
      await invalidateCatalogDomain(queryClient, { includeProducts: true });
      await queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      setStatusMessage({
        type: 'success',
        text: `تم بنجاح تفريغ وإزالة الأيقونات لعدد (${updates.length}) صنف والعودة للحالة بدون أيقونات.`
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'حدث خطأ أثناء تفريغ الأيقونات، يرجى إعادة المحاولة.'
      });
    } finally {
      setInternalLoading(false);
    }
  }

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      ariaLabel="استوديو وتخصيص أيقونات الأصناف"
      width="min(680px, 95vw)"
    >
      <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
              <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
              <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
              <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>استوديو وتخصيص أيقونات الأصناف</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>التحكم في سمة الألوان وخيارات العرض والإزالة الشاملة للأيقونات</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ border: 'none', background: '#f1f5f9', color: '#64748b', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 800 }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Status Message */}
        {statusMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              fontWeight: 600,
              background: statusMessage.type === 'success' ? '#f0fdf4' : statusMessage.type === 'info' ? '#eff6ff' : '#fef2f2',
              color: statusMessage.type === 'success' ? '#15803d' : statusMessage.type === 'info' ? '#1d4ed8' : '#b91c1c',
              border: `1px solid ${statusMessage.type === 'success' ? '#bbf7d0' : statusMessage.type === 'info' ? '#bfdbfe' : '#fecaca'}`,
            }}
          >
            <span>{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'theme' ? '#ffffff' : 'transparent',
              color: activeTab === 'theme' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'theme' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 2a7 7 0 0 0 0 14v6"/>
            </svg>
            <span>ألوان وسمات الأيقونات</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'manage' ? '#ffffff' : 'transparent',
              color: activeTab === 'manage' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'manage' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>إدارة وضبط الأيقونات</span>
          </button>
        </div>

        {activeTab === 'theme' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Live Preview Box */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>معاينة حية للمظهر في النظام:</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: currentColor, background: '#ffffff', padding: '2px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontFamily: 'monospace' }}>
                  {currentColor}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  overflowX: 'auto',
                  padding: '4px 2px',
                }}
              >
                {sampleIcons.map((iconId) => (
                  <div
                    key={iconId}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '8px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      flexShrink: 0,
                    }}
                  >
                    <ProductIcon name={iconId} size={22} color={currentColor} />
                  </div>
                ))}
              </div>
            </div>

            {/* Presets Grid */}
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                اختر سمة الألوان لجميع الأيقونات:
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '8px',
                }}
              >
                {ICON_COLOR_PRESETS.map((preset) => {
                  const isSelected = settings.themeId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => settings.update({ themeId: preset.id })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid #0f172a' : '1px solid #e2e8f0',
                        background: isSelected ? '#f8fafc' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'start',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: preset.color,
                          border: '2px solid #ffffff',
                          boxShadow: '0 0 0 1px #cbd5e1',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: '0.78rem', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#0f172a' : '#475569' }}>
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Color Input */}
            {settings.themeId === 'custom' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <input
                  type="color"
                  value={settings.customColor}
                  onChange={(e) => settings.update({ customColor: e.target.value })}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>كود اللون المخصص:</div>
                  <input
                    type="text"
                    value={settings.customColor}
                    onChange={(e) => settings.update({ customColor: e.target.value })}
                    style={{
                      marginTop: '4px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace',
                      width: '110px',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Visibility Toggle */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>إظهار الأيقونات في الشاشات</div>
                <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                  تفعيل أو إخفاء عرض الأيقونات في شاشات الكاشير وجداول الأصناف دون مسحها
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.showIcons}
                  onChange={(e) => settings.update({ showIcons: e.target.checked })}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: settings.showIcons ? '#0f172a' : '#cbd5e1',
                    borderRadius: '24px',
                    transition: '0.2s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      content: '',
                      height: '18px',
                      width: '18px',
                      left: '3px',
                      bottom: '3px',
                      background: 'white',
                      borderRadius: '50%',
                      transition: '0.2s',
                      transform: settings.showIcons ? 'translateX(20px)' : 'translateX(0)',
                    }}
                  />
                </span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'manage' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Auto Assign Card */}
            <div
              style={{
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/>
                    <path d="m14 7 3 3"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>الضبط والتعيين الذكي التلقائي</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>
                    تحليل أسماء كافة الأصناف في المنظومة وتعيين الأيقونة المناسبة لكل صنف تلقائياً.
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleInternalAutoAssign}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  alignSelf: 'flex-start',
                }}
              >
                {isLoading ? 'جارٍ المعالجة...' : 'تنفيذ الضبط الذكي لكافة الأصناف'}
              </button>
            </div>

            {/* Clear All Icons Card */}
            <div
              style={{
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid #fee2e2',
                background: '#fffbfb',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#991b1b' }}>إزالة وتفريغ الأيقونات من قاعدة البيانات</div>
                  <div style={{ fontSize: '0.78rem', color: '#b91c1c', marginTop: '3px' }}>
                    مسح كافة الأيقونات المعينة من جميع المنتجات والعودة للحالة بدون أيقونات.
                  </div>
                </div>
              </div>

              {!showClearConfirm ? (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setShowClearConfirm(true)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    alignSelf: 'flex-start',
                  }}
                >
                  إلغاء وتفريغ جميع الأيقونات
                </button>
              ) : (
                <div
                  style={{
                    background: '#ffffff',
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid #fca5a5',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#991b1b' }}>
                    تأكيد: هل ترغب بالتأكيد في تفريغ وإزالة الأيقونات من كافة الأصناف في النظام؟
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => {
                        setShowClearConfirm(false);
                        handleInternalClearIcons();
                      }}
                      style={{
                        padding: '6px 16px',
                        borderRadius: '6px',
                        background: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isLoading ? 'جارٍ المسح...' : 'نعم، قم بالإزالة الآن'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(false)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        background: '#f1f5f9',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      تراجع
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DialogShell>
  );
}
