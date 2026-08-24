import { useState, useEffect } from 'react';
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
  
  // Real-time catalog stats
  const [stats, setStats] = useState<{ total: number; withIcon: number; withoutIcon: number } | null>(null);

  const sampleIcons = ['tea-bag', 'coffee-beans', 'tshirt', 'perfume-spray', 'pill-capsule', 'smartphone', 'cooking-oil', 'cart-shopping'];
  const currentColor = getEffectiveIconColor(settings);
  const isLoading = isBulkLoading || internalLoading;

  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    productsApi.listAll()
      .then(({ products }) => {
        if (!isMounted) return;
        const total = products.length;
        const withIcon = products.filter((p) => Boolean(p.icon)).length;
        setStats({
          total,
          withIcon,
          withoutIcon: total - withIcon,
        });
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [open, statusMessage]);

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
          text: 'تم الفحص: جميع أصناف المنظومة مضبوطة ولديها أيقونات متوافقة بالفعل.'
        });
        return;
      }

      const res = await productsApi.bulkUpdateIcons(updates);
      await invalidateCatalogDomain(queryClient, { includeProducts: true });
      await queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      setStatusMessage({
        type: 'success',
        text: `تم بنجاح تعيين الأيقونات تلقائياً لعدد (${res.updated || updates.length}) صنف.`
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'حدث خطأ أثناء تنفيذ الضبط التلقائي، يرجى المحاولة ثانية.'
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
          text: 'جميع الأصناف في المنظومة خالية من الأيقونات بالفعل.'
        });
        return;
      }

      await productsApi.bulkUpdateIcons(updates);
      await invalidateCatalogDomain(queryClient, { includeProducts: true });
      await queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      setStatusMessage({
        type: 'success',
        text: `تم بنجاح تفريغ الأيقونات لعدد (${updates.length}) صنف والعودة للحالة النقية بدون أيقونات.`
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
      width="min(660px, 95vw)"
    >
      {/* Luxury Header */}
      <div
        style={{
          padding: '18px 22px 14px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.12)',
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
              <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
              <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
              <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
              استوديو ومظهر أيقونات الأصناف
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
              التحكم الشامل في ألوان الهوية البصرية وخيارات الإسناد الذكي والتفريغ
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: 'none',
            background: '#f1f5f9',
            color: '#64748b',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '12px',
            transition: 'background 0.15s ease',
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '16px 22px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Enterprise Catalog Stats Row */}
        {stats && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              padding: '8px 10px',
              background: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>إجمالي الأصناف</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{stats.total}</div>
            </div>
            <div style={{ textAlign: 'center', borderInlineStart: '1px solid #e2e8f0', borderInlineEnd: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>مُعيّن لها أيقونة</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#15803d' }}>{stats.withIcon}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>بدون أيقونة</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#475569' }}>{stats.withoutIcon}</div>
            </div>
          </div>
        )}

        {/* Status Toast Banner */}
        {statusMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: statusMessage.type === 'success' ? '#f0fdf4' : statusMessage.type === 'info' ? '#f0f9ff' : '#fef2f2',
              color: statusMessage.type === 'success' ? '#166534' : statusMessage.type === 'info' ? '#0369a1' : '#991b1b',
              border: `1px solid ${statusMessage.type === 'success' ? '#bbf7d0' : statusMessage.type === 'info' ? '#bae6fd' : '#fecaca'}`,
            }}
          >
            <span>{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit', padding: '0 4px' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Ultra-Clean Segmented Control */}
        <div
          style={{
            display: 'flex',
            padding: '3px',
            background: '#f1f5f9',
            borderRadius: '9px',
            gap: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            style={{
              flex: 1,
              padding: '7px 12px',
              borderRadius: '7px',
              fontSize: '0.82rem',
              fontWeight: activeTab === 'theme' ? 700 : 600,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'theme' ? '#ffffff' : 'transparent',
              color: activeTab === 'theme' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'theme' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 2a7 7 0 0 0 0 14v6"/>
            </svg>
            <span>ألوان وسمات الأيقونات</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            style={{
              flex: 1,
              padding: '7px 12px',
              borderRadius: '7px',
              fontSize: '0.82rem',
              fontWeight: activeTab === 'manage' ? 700 : 600,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'manage' ? '#ffffff' : 'transparent',
              color: activeTab === 'manage' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'manage' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>إدارة وضبط الأيقونات</span>
          </button>
        </div>

        {/* TAB 1: Theme & Color Styling */}
        {activeTab === 'theme' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Live Preview Slate */}
            <div
              style={{
                background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569' }}>معاينة مباشرة لهوية الأيقونات في المنظومة:</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: currentColor, background: '#ffffff', padding: '2px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', fontFamily: 'monospace' }}>
                  {currentColor}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  padding: '4px 2px',
                }}
              >
                {sampleIcons.map((iconId) => (
                  <div
                    key={iconId}
                    style={{
                      width: '40px',
                      height: '40px',
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
                    <ProductIcon name={iconId} size={20} color={currentColor} />
                  </div>
                ))}
              </div>
            </div>

            {/* Presets Grid */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                اختر سمة ولون الأيقونات لجميع الشاشات:
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(138px, 1fr))',
                  gap: '7px',
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
                        gap: '8px',
                        padding: '9px 10px',
                        borderRadius: '8px',
                        border: isSelected ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                        background: isSelected ? '#ffffff' : '#fafafa',
                        cursor: 'pointer',
                        textAlign: 'start',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 1px 4px rgba(15, 23, 42, 0.08)' : 'none',
                      }}
                    >
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: preset.color,
                          border: '2px solid #ffffff',
                          boxShadow: '0 0 0 1px #cbd5e1',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: '0.76rem', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#0f172a' : '#475569' }}>
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
                  padding: '10px 12px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <input
                  type="color"
                  value={settings.customColor}
                  onChange={(e) => settings.update({ customColor: e.target.value })}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>كود اللون المخصص:</div>
                  <input
                    type="text"
                    value={settings.customColor}
                    onChange={(e) => settings.update({ customColor: e.target.value })}
                    style={{
                      marginTop: '3px',
                      padding: '3px 8px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.78rem',
                      fontFamily: 'monospace',
                      width: '95px',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Visibility Toggle Row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                background: '#fafafa',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>إظهار الأيقونات في الشاشات</div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '1px' }}>
                  إمكانية إخفاء الأيقونات من شاشات الكاشير وجداول الأصناف بنقرة واحدة
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px', cursor: 'pointer', flexShrink: 0 }}>
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
                    borderRadius: '22px',
                    transition: '0.2s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      content: '',
                      height: '16px',
                      width: '16px',
                      left: '3px',
                      bottom: '3px',
                      background: 'white',
                      borderRadius: '50%',
                      transition: '0.2s',
                      transform: settings.showIcons ? 'translateX(18px)' : 'translateX(0)',
                    }}
                  />
                </span>
              </label>
            </div>
          </div>
        )}

        {/* TAB 2: Smart Operations & Bulk Management */}
        {activeTab === 'manage' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Action Row 1: Smart AI Auto-Assign */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '9px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/>
                    <path d="m14 7 3 3"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>الضبط والتعيين الذكي للأصناف</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                    تحليل أسماء الأصناف وتعيين الأيقونة المتوافقة تلقائياً لكافة الأصناف
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={isLoading}
                onClick={handleInternalAutoAssign}
                style={{
                  padding: '7px 14px',
                  borderRadius: '7px',
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.1)',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/>
                </svg>
                <span>{isLoading ? 'جارٍ الضبط...' : 'بدء الضبط الذكي'}</span>
              </button>
            </div>

            {/* Action Row 2: Bulk Clear */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                border: '1px solid #fee2e2',
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '9px',
                      background: '#fff1f2',
                      color: '#e11d48',
                      border: '1px solid #ffe4e6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#991b1b' }}>تفريغ وإلغاء جميع الأيقونات</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                      مسح الأيقونات المعينة لجميع المنتجات والعودة للحالة النقية بدون أيقونات
                    </div>
                  </div>
                </div>

                {!showClearConfirm && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setShowClearConfirm(true)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '7px',
                      background: '#ffffff',
                      color: '#dc2626',
                      border: '1px solid #fca5a5',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                    </svg>
                    <span>إلغاء وتفريغ الكل</span>
                  </button>
                )}
              </div>

              {/* Inline Confirmation Bar */}
              {showClearConfirm && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '10px 12px',
                    background: '#fff1f2',
                    borderRadius: '8px',
                    border: '1px solid #fecdd3',
                  }}
                >
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#991b1b' }}>
                    تأكيد: هل ترغب بالتأكيد في تفريغ وإزالة الأيقونات من كافة الأصناف؟
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => {
                        setShowClearConfirm(false);
                        handleInternalClearIcons();
                      }}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        background: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.76rem',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isLoading ? 'جارٍ المسح...' : 'نعم، أفرغ الآن'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(false)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        background: '#ffffff',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        fontWeight: 600,
                        fontSize: '0.76rem',
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
