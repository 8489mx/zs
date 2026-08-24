import { useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import {
  ICON_COLOR_PRESETS,
  useProductIconSettings,
  getEffectiveIconColor,
} from './product-icon-theme';
import { ProductIcon } from './product-svg-catalog';

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
  const settings = useProductIconSettings();
  const [activeTab, setActiveTab] = useState<'theme' | 'manage'>('theme');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const sampleIcons = ['tea-bag', 'coffee-beans', 'tshirt', 'perfume-spray', 'pill-capsule', 'smartphone', 'cooking-oil', 'cart-shopping'];

  const currentColor = getEffectiveIconColor(settings);

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      ariaLabel="استوديو وتخصيص أيقونات الأصناف"
      width="min(680px, 95vw)"
    >
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            🎨
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>استوديو وتخصيص أيقونات الأصناف</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>التحكم الكامل في ألوان ومظهر الأيقونات وخيارات الإلغاء والتفريغ</p>
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

      <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'theme' ? '#170c5c' : '#f8fafc',
              color: activeTab === 'theme' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease',
            }}
          >
            🎨 ألوان وسمات الأيقونات
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'manage' ? '#170c5c' : '#f8fafc',
              color: activeTab === 'manage' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease',
            }}
          >
            ⚙️ إدارة وضبط الأيقونات
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
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>معاينة حية للمظهر في النظام:</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: currentColor, background: '#ffffff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  {currentColor}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  overflowX: 'auto',
                  padding: '6px 2px',
                }}
              >
                {sampleIcons.map((iconId) => (
                  <div
                    key={iconId}
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '10px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      flexShrink: 0,
                    }}
                  >
                    <ProductIcon name={iconId} size={24} color={currentColor} />
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
                  gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
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
                        gap: '8px',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid #170c5c' : '1px solid #e2e8f0',
                        background: isSelected ? '#f1f5f9' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'start',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
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
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>اختر لونك المخصص:</div>
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
                      width: '100px',
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
                padding: '14px',
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
                    background: settings.showIcons ? '#16a34a' : '#cbd5e1',
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
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid #bfdbfe',
                background: '#eff6ff',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e40af' }}>🪄 الضبط والتعيين الذكي التلقائي</div>
                <div style={{ fontSize: '0.78rem', color: '#3b82f6', marginTop: '3px' }}>
                  يقوم الذكاء الاصطناعي بتحليل أسماء كافة الأصناف في النظام وتعيين الأيقونة المناسبة لكل صنف تلقائياً.
                </div>
              </div>
              <button
                type="button"
                disabled={isBulkLoading}
                onClick={onBulkAutoAssign}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#1d4ed8',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: isBulkLoading ? 'not-allowed' : 'pointer',
                  alignSelf: 'flex-start',
                }}
              >
                {isBulkLoading ? 'جارٍ الضبط والمعالجة...' : '🚀 تنفيذ الضبط الذكي لكافة الأصناف الآن'}
              </button>
            </div>

            {/* Clear All Icons Card */}
            <div
              style={{
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid #fecaca',
                background: '#fef2f2',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#991b1b' }}>🗑️ إزالة وتفريغ الأيقونات من قاعدة البيانات</div>
                <div style={{ fontSize: '0.78rem', color: '#b91c1c', marginTop: '3px' }}>
                  يقوم بمسح جميع الأيقونات المعينة من كافة الأصناف وإرجاع المنتجات بدون أيقونات.
                </div>
              </div>

              {!showClearConfirm ? (
                <button
                  type="button"
                  disabled={isBulkLoading}
                  onClick={() => setShowClearConfirm(true)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: isBulkLoading ? 'not-allowed' : 'pointer',
                    alignSelf: 'flex-start',
                  }}
                >
                  إلغاء وتفريغ جميع الأيقونات
                </button>
              ) : (
                <div
                  style={{
                    background: '#ffffff',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #fca5a5',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#991b1b' }}>
                    ⚠️ هل أنت متأكد من رغبتك في تفريغ وإزالة الأيقونات من جميع الأصناف في النظام؟
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      disabled={isBulkLoading}
                      onClick={() => {
                        setShowClearConfirm(false);
                        if (onBulkClearIcons) onBulkClearIcons();
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        background: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: isBulkLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isBulkLoading ? 'جارٍ المسح...' : 'نعم، قم بالإزالة الآن'}
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
