import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { SlidersIcon, XIcon, CheckCircleIcon, RotateCcwIcon } from '@/shared/components/icons/AppIcons';
import { usePosUiCustomization, type PosUiCustomization, DEFAULT_POS_UI_CUSTOMIZATION } from '@/features/pos/hooks/usePosUiCustomization';
import { toast } from '@/shared/components/system-alert';

interface PosCustomizationDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PosCustomizationDialog({ isOpen, onClose }: PosCustomizationDialogProps) {
  const { t } = useTranslation();
  const { customization, saveCustomization, resetCustomization } = usePosUiCustomization();
  const [draft, setDraft] = useState<PosUiCustomization>(customization);

  useEffect(() => {
    if (isOpen) {
      setDraft(customization);
    }
  }, [isOpen, customization]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof PosUiCustomization) => {
    setDraft((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleApply = async () => {
    await saveCustomization(draft);
    toast.success('تم تطبيق إعدادات واجهة الكاشير بنجاح');
    onClose();
  };

  const handleReset = async () => {
    await resetCustomization();
    setDraft(DEFAULT_POS_UI_CUSTOMIZATION);
  };

  const switchContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    background: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    gap: '12px',
  };

  const switchLabelStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    flex: 1,
  };

  const titleStyle = {
    fontSize: '13px',
    fontWeight: 700,
    color: '#0f172a',
  };

  const descStyle = {
    fontSize: '11px',
    color: '#64748b',
    lineHeight: '1.4',
  };

  const toggleButtonStyle = (isActive: boolean) => ({
    width: '42px',
    height: '24px',
    borderRadius: '12px',
    background: isActive ? '#170e5e' : '#cbd5e1',
    border: 'none',
    cursor: 'pointer',
    position: 'relative' as const,
    padding: '2px',
    transition: 'background-color 0.2s ease',
    flexShrink: 0,
  });

  const toggleThumbStyle = (isActive: boolean) => ({
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    position: 'absolute' as const,
    top: '2px',
    right: isActive ? '2px' : '20px',
    transition: 'right 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  });

  return (
    <DialogShell
      open={isOpen}
      onClose={onClose}
      width="min(640px, 95vw)"
      zIndex={1100}
      ariaLabel="تخصيص واجهة الكاشير"
    >
      <div
        dir="rtl"
        style={{
          padding: '22px 24px',
          background: '#ffffff',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '88vh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '16px',
            borderBottom: '1px solid #f1f5f9',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#eef2ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <SlidersIcon size={18} color="#170e5e" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: '#0f172a' }}>
                {t('pos.customization_modal_title', 'تخصيص واجهة الكاشير والشاشات المتنقلة')}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748b' }}>
                {t('pos.customization_modal_desc', 'إظهار وإخفاء الأقسام وتنسيق شبكة المنتجات لتوفير أكبر مساحة ممكنة')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: '#f8fafc',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={t('common.close', 'إغلاق')}
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Body Scrollable */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingRight: '2px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
          className="thin-scrollbar"
        >
          {/* Section 1: Main Screen Toggles */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
              <strong style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                {t('pos.customization_sections_title', 'عناصر شاشة البيع (إظهار / إخفاء)')}
              </strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* 1. Search Bar */}
              <div style={switchContainerStyle}>
                <div style={switchLabelStyle}>
                  <span style={titleStyle}>{t('pos.toggle_search_bar', 'مربع البحث السريع ومسح الكاميرا')}</span>
                  <span style={descStyle}>{t('pos.toggle_search_bar_desc', 'إخفاء حقل البحث يوفر مساحة رأسية كبيرة (الباركود يعمل بالماسح الخارجي)')}</span>
                </div>
                <button
                  type="button"
                  style={toggleButtonStyle(draft.showSearchBar)}
                  onClick={() => handleToggle('showSearchBar')}
                  aria-pressed={draft.showSearchBar}
                >
                  <div style={toggleThumbStyle(draft.showSearchBar)} />
                </button>
              </div>

              {/* 2. Price Tier Toggle */}
              <div style={switchContainerStyle}>
                <div style={switchLabelStyle}>
                  <span style={titleStyle}>{t('pos.toggle_price_tier', 'شريط اختيار السعر (سعر القطاعي / سعر الجملة)')}</span>
                  <span style={descStyle}>{t('pos.toggle_price_tier_desc', 'عند إخفاء الشريط، سيُعتمد السعر الافتراضي المحدد أدناه تلقائياً')}</span>
                </div>
                <button
                  type="button"
                  style={toggleButtonStyle(draft.showPriceTierToggle)}
                  onClick={() => handleToggle('showPriceTierToggle')}
                  aria-pressed={draft.showPriceTierToggle}
                >
                  <div style={toggleThumbStyle(draft.showPriceTierToggle)} />
                </button>
              </div>

              {/* 2.5 Default Price Selection */}
              <div
                style={{
                  ...switchContainerStyle,
                  background: '#ffffff',
                  borderColor: '#cbd5e1',
                  borderRight: '4px solid #170e5e',
                }}
              >
                <div style={switchLabelStyle}>
                  <span style={titleStyle}>{t('pos.default_price_tier', 'السعر الافتراضي للبيع بالكاشير')}</span>
                  <span style={descStyle}>{t('pos.default_price_tier_desc', 'السعر المعتمد تلقائياً عند فتح الكاشير أو عند إخفاء زري التبديل')}</span>
                </div>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '3px' }}>
                  <button
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, defaultPriceType: 'retail' }))}
                    style={{
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      background: draft.defaultPriceType === 'retail' ? '#0f172a' : 'transparent',
                      color: draft.defaultPriceType === 'retail' ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    {t('pos.retail_price', 'سعر القطاعي')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, defaultPriceType: 'wholesale' }))}
                    style={{
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      background: draft.defaultPriceType === 'wholesale' ? '#dc2626' : 'transparent',
                      color: draft.defaultPriceType === 'wholesale' ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    {t('pos.wholesale_price', 'سعر الجملة')}
                  </button>
                </div>
              </div>

              {/* 3. Categories Bar */}
              <div style={switchContainerStyle}>
                <div style={switchLabelStyle}>
                  <span style={titleStyle}>{t('pos.toggle_categories', 'شريط الأقسام والتصنيفات')}</span>
                  <span style={descStyle}>{t('pos.toggle_categories_desc', 'شريط التصنيفات (كل الأقسام، المأكولات، ...). إخفاؤه يعرض شبكة الأصناف مباشرة')}</span>
                </div>
                <button
                  type="button"
                  style={toggleButtonStyle(draft.showCategories)}
                  onClick={() => handleToggle('showCategories')}
                  aria-pressed={draft.showCategories}
                >
                  <div style={toggleThumbStyle(draft.showCategories)} />
                </button>
              </div>

              {/* 4. Quick Filters Bar */}
              <div style={switchContainerStyle}>
                <div style={switchLabelStyle}>
                  <span style={titleStyle}>{t('pos.toggle_quick_filters', 'شريط الفلاتر السريعة (الكل، المفضلة، بعروض، آخر استخدام)')}</span>
                  <span style={descStyle}>{t('pos.toggle_quick_filters_desc', 'أزرار التصفية السريعة للأصناف. إخفاؤها يرفع المنتجات للأعلى')}</span>
                </div>
                <button
                  type="button"
                  style={toggleButtonStyle(draft.showQuickFilters)}
                  onClick={() => handleToggle('showQuickFilters')}
                  aria-pressed={draft.showQuickFilters}
                >
                  <div style={toggleThumbStyle(draft.showQuickFilters)} />
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Mobile Handheld Optimization */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
              <strong style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                {t('pos.customization_mobile_title', 'شاشات الكاشير المتنقلة والموبايل (Handheld POS)')}
              </strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Columns on Mobile */}
              <div style={switchContainerStyle}>
                <div style={switchLabelStyle}>
                  <span style={titleStyle}>{t('pos.mobile_grid_cols', 'أعمدة عرض الأصناف على الموبايل')}</span>
                  <span style={descStyle}>{t('pos.mobile_grid_cols_desc', '3 أعمدة مدمجة تتيح رؤية 9 إلى 12 صنفاً معاً على أجهزة iMin / Sunmi')}</span>
                </div>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '3px' }}>
                  {[
                    { key: '2', label: 'عمودين' },
                    { key: '3', label: '3 أعمدة (موصى به)' },
                    { key: 'auto', label: 'تلقائي' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setDraft((p) => ({ ...p, mobileGridColumns: opt.key as any }))}
                      style={{
                        padding: '5px 10px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: 'none',
                        background: draft.mobileGridColumns === opt.key ? '#170e5e' : 'transparent',
                        color: draft.mobileGridColumns === opt.key ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Layout Density */}
              <div style={switchContainerStyle}>
                <div style={switchLabelStyle}>
                  <span style={titleStyle}>{t('pos.card_layout_density', 'نمط كروت الأصناف الافتراضي')}</span>
                  <span style={descStyle}>{t('pos.card_layout_density_desc', 'معرض الصور مثالي للعطور والمنتجات البصرية، والمضغوط للمخازن والسوبرماركت')}</span>
                </div>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '3px' }}>
                  {[
                    { key: 'gallery', label: 'معرض صور' },
                    { key: 'compact', label: 'مضغوط' },
                    { key: 'comfortable', label: 'اعتيادي' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setDraft((p) => ({ ...p, cardLayout: opt.key as any }))}
                      style={{
                        padding: '5px 10px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: 'none',
                        background: draft.cardLayout === opt.key ? '#170e5e' : 'transparent',
                        color: draft.cardLayout === opt.key ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto Hide Bottom Nav */}
              <div style={switchContainerStyle}>
                <div style={switchLabelStyle}>
                  <span style={titleStyle}>{t('pos.toggle_auto_hide_nav', 'إخفاء شريط التنقل السفلي وتثبيت السلة')}</span>
                  <span style={descStyle}>{t('pos.toggle_auto_hide_nav_desc', 'إخفاء شريط التنقل الرئيسي ليحل زر السلة مكانه بالأسفل لتوفير أقصى مساحة')}</span>
                </div>
                <button
                  type="button"
                  style={toggleButtonStyle(draft.autoHideBottomNav)}
                  onClick={() => handleToggle('autoHideBottomNav')}
                  aria-pressed={draft.autoHideBottomNav}
                >
                  <div style={toggleThumbStyle(draft.autoHideBottomNav)} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '16px',
            borderTop: '1px solid #f1f5f9',
            marginTop: '16px',
            gap: '10px',
          }}
        >
          <Button
            type="button"
            variant="secondary"
            onClick={handleReset}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
          >
            <RotateCcwIcon size={14} />
            <span>{t('pos.reset_defaults', 'استعادة الافتراضي')}</span>
          </Button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              style={{ fontSize: '12px' }}
            >
              {t('common.cancel', 'إلغاء')}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleApply}
              style={{
                background: '#170e5e',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px',
                fontWeight: 700,
                padding: '8px 20px',
              }}
            >
              <CheckCircleIcon size={15} />
              <span>{t('common.save_and_apply', 'حفظ وتطبيق')}</span>
            </Button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
