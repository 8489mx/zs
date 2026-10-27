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
    padding: '10px 12px',
    background: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    gap: '10px',
  };

  const selectorContainerStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '10px 12px',
    background: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    gap: '8px',
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

  const renderSwitch = (checked: boolean, onChange: () => void, ariaLabel?: string) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      className="pos-custom-toggle"
      onClick={onChange}
      style={{
        width: '42px',
        minWidth: '42px',
        maxWidth: '42px',
        height: '24px',
        minHeight: '24px',
        maxHeight: '24px',
        borderRadius: '999px',
        background: checked ? '#170e5e' : '#cbd5e1',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        padding: 0,
        margin: 0,
        boxSizing: 'border-box',
        transition: 'background-color 0.2s ease',
        flexShrink: 0,
        outline: 'none',
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '18px',
          height: '18px',
          minWidth: '18px',
          minHeight: '18px',
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          position: 'absolute',
          top: '3px',
          right: checked ? '3px' : '21px',
          transition: 'right 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />
    </button>
  );

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
        className="pos-customization-dialog-container"
        style={{
          padding: '14px 16px',
          background: '#ffffff',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          height: 'min(86vh, 660px)',
          maxHeight: '86vh',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '10px',
            borderBottom: '1px solid #f1f5f9',
            marginBottom: '10px',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#eef2ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <SlidersIcon size={16} color="#170e5e" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t('pos.customization_modal_title', 'تخصيص واجهة الكاشير')}
              </h3>
              <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#64748b', lineHeight: '1.35' }}>
                {t('pos.customization_modal_desc', 'تنسيق شاشات الموبايل وإظهار الأقسام لتوفير أقصى مساحة')}
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
              padding: '5px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            title={t('common.close', 'إغلاق')}
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Body Scrollable */}
        <div
          style={{
            flex: '1 1 0%',
            minHeight: 0,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            paddingRight: '2px',
            paddingLeft: '2px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
          className="pos-customization-dialog-body thin-scrollbar"
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
                {renderSwitch(draft.showSearchBar, () => handleToggle('showSearchBar'), t('pos.toggle_search_bar', 'مربع البحث ومسح الكاميرا'))}
              </div>

              {/* 2. Price Tier Toggle */}
              <div style={switchContainerStyle}>
                <div style={switchLabelStyle}>
                  <span style={titleStyle}>{t('pos.toggle_price_tier', 'شريط اختيار السعر (سعر القطاعي / سعر الجملة)')}</span>
                  <span style={descStyle}>{t('pos.toggle_price_tier_desc', 'عند إخفاء الشريط، سيُعتمد السعر الافتراضي المحدد أدناه تلقائياً')}</span>
                </div>
                {renderSwitch(draft.showPriceTierToggle, () => handleToggle('showPriceTierToggle'), t('pos.toggle_price_tier', 'شريط اختيار السعر'))}
              </div>

              {/* 2.5 Default Price Selection */}
              <div
                style={{
                  ...selectorContainerStyle,
                  background: '#ffffff',
                  borderColor: '#cbd5e1',
                  borderRight: '4px solid #170e5e',
                }}
              >
                <div style={switchLabelStyle}>
                  <span style={titleStyle}>{t('pos.default_price_tier', 'السعر الافتراضي للبيع بالكاشير')}</span>
                  <span style={descStyle}>{t('pos.default_price_tier_desc', 'السعر المعتمد تلقائياً عند فتح الكاشير أو عند إخفاء زري التبديل')}</span>
                </div>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '3px', width: '100%' }}>
                  <button
                    type="button"
                    className="pos-segmented-btn"
                    onClick={() => setDraft((p) => ({ ...p, defaultPriceType: 'retail' }))}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      minHeight: '28px',
                      height: '28px',
                      boxSizing: 'border-box',
                      background: draft.defaultPriceType === 'retail' ? '#0f172a' : 'transparent',
                      color: draft.defaultPriceType === 'retail' ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    {t('pos.retail_price', 'سعر القطاعي')}
                  </button>
                  <button
                    type="button"
                    className="pos-segmented-btn"
                    onClick={() => setDraft((p) => ({ ...p, defaultPriceType: 'wholesale' }))}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      minHeight: '28px',
                      height: '28px',
                      boxSizing: 'border-box',
                      background: draft.defaultPriceType === 'wholesale' ? '#dc2626' : 'transparent',
                      color: draft.defaultPriceType === 'wholesale' ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                      textAlign: 'center',
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
                {renderSwitch(draft.showCategories, () => handleToggle('showCategories'), t('pos.toggle_categories', 'شريط الأقسام والتصنيفات'))}
              </div>

              {/* 4. Quick Filters Bar */}
              <div style={switchContainerStyle}>
                <div style={switchLabelStyle}>
                  <span style={titleStyle}>{t('pos.toggle_quick_filters', 'شريط الفلاتر السريعة (الكل، المفضلة، بعروض، آخر استخدام)')}</span>
                  <span style={descStyle}>{t('pos.toggle_quick_filters_desc', 'أزرار التصفية السريعة للأصناف. إخفاؤها يرفع المنتجات للأعلى')}</span>
                </div>
                {renderSwitch(draft.showQuickFilters, () => handleToggle('showQuickFilters'), t('pos.toggle_quick_filters', 'شريط الفلاتر السريعة'))}
              </div>

              {/* 5. Desktop Card Layout Density */}
              <div style={selectorContainerStyle}>
                <div style={switchLabelStyle}>
                  <span style={titleStyle}>{t('pos.desktop_card_layout_density', 'نمط كروت الأصناف على الكمبيوتر')}</span>
                  <span style={descStyle}>{t('pos.desktop_card_layout_density_desc', 'معرض الصور يبرز صور المنتجات الكبيرة، والمضغوط يتيح رؤية أكبر عدد من الأصناف بدون سكرول')}</span>
                </div>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '3px', width: '100%' }}>
                  {[
                    { key: 'gallery', label: 'معرض صور' },
                    { key: 'compact', label: 'مضغوط' },
                    { key: 'comfortable', label: 'كروت موسعة' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      className="pos-segmented-btn"
                      onClick={() => setDraft((p) => ({ ...p, cardLayout: opt.key as any }))}
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: 'none',
                        minHeight: '28px',
                        height: '28px',
                        boxSizing: 'border-box',
                        background: draft.cardLayout === opt.key ? '#170e5e' : 'transparent',
                        color: draft.cardLayout === opt.key ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 6. Hide Out of Stock Items */}
              <div style={switchContainerStyle}>
                <div style={switchLabelStyle}>
                  <span style={titleStyle}>{t('pos.hide_out_of_stock_title', 'إخفاء الأصناف النافذة من العرض')}</span>
                  <span style={descStyle}>{t('pos.hide_out_of_stock_desc', 'إخفاء الأصناف التي انتهى رصيدها تلقائياً من شبكة الكاشير عند حظر البيع بالسالب')}</span>
                </div>
                {renderSwitch(draft.hideOutOfStockItems, () => handleToggle('hideOutOfStockItems'), t('pos.hide_out_of_stock_title', 'إخفاء الأصناف النافذة من العرض'))}
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
              <div style={selectorContainerStyle}>
                <div style={switchLabelStyle}>
                  <span style={titleStyle}>{t('pos.mobile_grid_cols', 'أعمدة عرض الأصناف على الموبايل')}</span>
                  <span style={descStyle}>
                    {t('pos.mobile_grid_cols_desc', '3 أعمدة مدمجة تتيح رؤية 9 إلى 12 صنفاً معاً على أجهزة')} <bdi dir="ltr">iMin / Sunmi</bdi>
                  </span>
                </div>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '3px', width: '100%' }}>
                  {[
                    { key: '2', label: 'عمودين' },
                    { key: '3', label: '3 أعمدة (موصى به)' },
                    { key: 'auto', label: 'تلقائي' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      className="pos-segmented-btn"
                      onClick={() => setDraft((p) => ({ ...p, mobileGridColumns: opt.key as any }))}
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: 'none',
                        minHeight: '28px',
                        height: '28px',
                        boxSizing: 'border-box',
                        background: draft.mobileGridColumns === opt.key ? '#170e5e' : 'transparent',
                        color: draft.mobileGridColumns === opt.key ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Card Layout Density */}
              <div style={selectorContainerStyle}>
                <div style={switchLabelStyle}>
                  <span style={titleStyle}>{t('pos.mobile_card_layout_density', 'نمط كروت الأصناف على الموبايل')}</span>
                  <span style={descStyle}>
                    {t('pos.mobile_card_layout_density_desc', 'الوضع المضغوط يجمع الأصناف لشاشات الهواتف وأجهزة')} <bdi dir="ltr">Sunmi</bdi>، {t('pos.mobile_card_layout_density_desc_tail', 'بينما معرض الصور يبرز صور المنتجات')}
                  </span>
                </div>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '3px', width: '100%' }}>
                  {[
                    { key: 'gallery', label: 'معرض صور' },
                    { key: 'compact', label: 'مضغوط' },
                    { key: 'comfortable', label: 'اعتيادي' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      className="pos-segmented-btn"
                      onClick={() => setDraft((p) => ({ ...p, mobileCardLayout: opt.key as any }))}
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: 'none',
                        minHeight: '28px',
                        height: '28px',
                        boxSizing: 'border-box',
                        background: draft.mobileCardLayout === opt.key ? '#170e5e' : 'transparent',
                        color: draft.mobileCardLayout === opt.key ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
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
                {renderSwitch(draft.autoHideBottomNav, () => handleToggle('autoHideBottomNav'), t('pos.toggle_auto_hide_nav', 'إخفاء شريط التنقل السفلي'))}
              </div>
            </div>
          </div>

          {/* Section 3: Checkout Experience & Handheld Settings */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
              <strong style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                {t('pos.checkout_experience_title', 'تجربة شاشة الدفع والأجهزة المحمولة')} (<bdi dir="ltr">iMin / Sunmi</bdi>)
              </strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Checkout Mode */}
              <div style={selectorContainerStyle}>
                <div style={switchLabelStyle}>
                  <span style={titleStyle}>{t('pos.checkout_mode', 'نمط نافذة الدفع الافتراضي')}</span>
                  <span style={descStyle}>{t('pos.checkout_mode_desc', 'الدفع السريع يوفر بلاطات لمس عملاقة ونقرة واحدة لإنهاء البيع (مثالي للخليج وأجهزة الكاشير المحمولة)')}</span>
                </div>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '3px', width: '100%' }}>
                  {[
                    { key: 'auto', label: 'تلقائي ذكي' },
                    { key: 'express', label: 'دفع سريع' },
                    { key: 'detailed', label: 'تفصيلي' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      className="pos-segmented-btn"
                      onClick={() => setDraft((p) => ({ ...p, checkoutMode: opt.key as any }))}
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: 'none',
                        minHeight: '28px',
                        height: '28px',
                        boxSizing: 'border-box',
                        background: draft.checkoutMode === opt.key ? '#170e5e' : 'transparent',
                        color: draft.checkoutMode === opt.key ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Payment Channel */}
              <div style={selectorContainerStyle}>
                <div style={switchLabelStyle}>
                  <span style={titleStyle}>{t('pos.default_payment_channel', 'وسيلة الدفع المحددة تلقائياً عند فتح الشاشة')}</span>
                  <span style={descStyle}>{t('pos.default_payment_channel_desc', 'في الكويت تفتح على K-NET كي نت، وفي السعودية على مدى، وفي مصر على نقدي أو كارت')}</span>
                </div>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '3px', width: '100%' }}>
                  {[
                    { key: 'auto', label: 'حسب الدولة' },
                    { key: 'card', label: 'بطاقة / KNET' },
                    { key: 'cash', label: 'نقدي كاش' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      className="pos-segmented-btn"
                      onClick={() => setDraft((p) => ({ ...p, defaultPaymentChannel: opt.key as any }))}
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: 'none',
                        minHeight: '28px',
                        height: '28px',
                        boxSizing: 'border-box',
                        background: draft.defaultPaymentChannel === opt.key ? '#170e5e' : 'transparent',
                        color: draft.defaultPaymentChannel === opt.key ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="pos-customization-footer"
          style={{
            flexShrink: 0,
            marginTop: '10px',
            paddingTop: '10px',
          }}
        >
          <Button
            type="button"
            variant="secondary"
            onClick={handleReset}
            style={{
              height: '32px',
              minHeight: '32px',
              maxHeight: '32px',
              padding: '0 8px',
              fontSize: '11px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <RotateCcwIcon size={12} />
            <span>{t('pos.reset_defaults', 'استعادة الافتراضي')}</span>
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'flex-end', minWidth: 0 }}>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              style={{
                height: '32px',
                minHeight: '32px',
                maxHeight: '32px',
                padding: '0 10px',
                fontSize: '11.5px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {t('common.cancel', 'إلغاء')}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleApply}
              style={{
                height: '32px',
                minHeight: '32px',
                maxHeight: '32px',
                background: '#170e5e',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                fontSize: '12px',
                fontWeight: 700,
                padding: '0 12px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <CheckCircleIcon size={14} />
              <span>{t('common.save_and_apply', 'حفظ وتطبيق')}</span>
            </Button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
