import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import { RestaurantOperationsDialog } from './RestaurantOperationsDialog';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import {
  LayersIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  UtensilsIcon,
  SearchIcon,
} from '@/shared/components/icons/AppIcons';

interface ComboOption {
  id: string;
  name: string;
  priceDelta: number;
}

interface PosComboMealModalProps {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  products: any[];
  onAddComboToCart: (comboItem: {
    productId: number;
    productName: string;
    price: number;
    modifiers: Array<{ name: string; price: number }>;
    notes?: string;
  }) => void;
}

export function PosComboMealModal({
  open,
  onClose,
  onBack,
  products,
  onAddComboToCart,
}: PosComboMealModalProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [mainSearch, setMainSearch] = useState('');

  // Step 1: Main Entree Selection
  const [selectedMain, setSelectedMain] = useState<any>(null);

  // Step 2: Side Item Selection
  const defaultSides: ComboOption[] = [
    { id: 'side-fries-regular', name: 'بطاطس مقلية كلاسيك', priceDelta: 0 },
    { id: 'side-fries-cheese', name: 'بطاطس مقلية بالجبنة الشيدر', priceDelta: 12 },
    { id: 'side-onion-rings', name: 'حلقات بصل مقرمشة (6 قطع)', priceDelta: 15 },
    { id: 'side-coleslaw', name: 'سلطة كول سلو طازجة', priceDelta: 8 },
    { id: 'side-wedges', name: 'بطاطس ويدجز مبهرة', priceDelta: 10 },
  ];
  const [selectedSide, setSelectedSide] = useState<ComboOption>(defaultSides[0]);

  // Step 3: Drink Selection
  const defaultDrinks: ComboOption[] = [
    { id: 'drink-cola', name: 'كوكاكولا / بيبسي عادي', priceDelta: 0 },
    { id: 'drink-diet', name: 'كوكاكولا / بيبسي دايت (بدون سكر)', priceDelta: 0 },
    { id: 'drink-7up', name: 'سفن أب / سبرايت ليمون', priceDelta: 0 },
    { id: 'drink-water', name: 'مياه معدنية طبيعية', priceDelta: 0 },
    { id: 'drink-orange-fresh', name: 'عصير برتقال فريش طبيعي', priceDelta: 15 },
    { id: 'drink-iced-tea', name: 'شاي مثلج بالخوخ (آيس تي)', priceDelta: 12 },
  ];
  const [selectedDrink, setSelectedDrink] = useState<ComboOption>(defaultDrinks[0]);

  const [comboNotes, setComboNotes] = useState('');

  // Available Main Entrees
  const mainEntrees = useMemo(() => {
    if (!products.length) return [];
    if (!mainSearch.trim()) return products.slice(0, 36);
    const q = mainSearch.toLowerCase().trim();
    return products.filter((p: any) => String(p?.name || '').toLowerCase().includes(q)).slice(0, 36);
  }, [products, mainSearch]);

  // Set initial main when opening
  if (!selectedMain && mainEntrees.length > 0) {
    setSelectedMain(mainEntrees[0]);
  }

  const basePrice = Number(selectedMain?.price || selectedMain?.retail_price || 0);
  const totalComboPrice = basePrice + selectedSide.priceDelta + selectedDrink.priceDelta;

  const handleConfirmCombo = () => {
    if (!selectedMain) return;

    const modifiers = [
      { name: `طبق جانبي: ${selectedSide.name}`, price: selectedSide.priceDelta },
      { name: `مشروب: ${selectedDrink.name}`, price: selectedDrink.priceDelta },
    ];

    onAddComboToCart({
      productId: selectedMain.id,
      productName: `وجبة كومبو (${selectedMain.name})`,
      price: basePrice,
      modifiers,
      notes: comboNotes.trim() || undefined,
    });

    onClose();
    setCurrentStep(1);
    setComboNotes('');
  };

  return (
    <RestaurantOperationsDialog
      open={open}
      onClose={onClose}
      onBack={onBack}
      title={t('pos.pos_workspace.pos_combo_meal_modal.s0', "معالج وجبات الكومبو السريعة (Combo Meal Builder)")}
      subtitle={t('pos.pos_workspace.pos_combo_meal_modal.s1', "بناء وجبة متكاملة خطوة بخطوة: الصنف الرئيسي ➔ الطبق الجانبي ➔ المشروب")}
      icon={<LayersIcon size={18} color="#170e5e" />}
      footerNote={t('pos.pos_workspace.pos_combo_meal_modal.s2', "تُجمع بنود الوجبة في صنف واحد موحد بالسلة مع تفاصيل المكونات والإضافات للطلب والمطبخ")}
      scrollableBody={false}
      bodyStyle={{
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        boxSizing: 'border-box',
      }}
      footerActions={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '10px' }}>
          <div>
            {currentStep > 1 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentStep((s) => (s - 1) as any)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '34px',
                  minHeight: '34px',
                  padding: '0 14px',
                  fontSize: '12px',
                }}
              >
                <ArrowRightIcon size={14} />
                <span>{t('pos.pos_workspace.pos_combo_meal_modal.s3', "الخطوة السابقة")}</span>
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              style={{ height: '34px', minHeight: '34px', padding: '0 14px', fontSize: '12px' }}
            >
              {t('pos.pos_workspace.pos_combo_meal_modal.s4', "إلغاء")}
            </Button>
            {currentStep < 3 ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => setCurrentStep((s) => (s + 1) as any)}
                disabled={!selectedMain}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '34px',
                  minHeight: '34px',
                  padding: '0 18px',
                  fontSize: '12px',
                  fontWeight: 800,
                  backgroundColor: '#170e5e',
                }}
              >
                <span>{t('pos.pos_workspace.pos_combo_meal_modal.s5', "الخطوة التالية")}</span>
                <ArrowLeftIcon size={14} />
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmCombo}
                disabled={!selectedMain}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '34px',
                  minHeight: '34px',
                  padding: '0 20px',
                  fontSize: '12px',
                  fontWeight: 800,
                  backgroundColor: '#16a34a',
                }}
              >
                <CheckCircleIcon size={14} color="#ffffff" />
                <span>{t('pos.pos_workspace.pos_combo_meal_modal.s6', "إضافة وجبة الكومبو بالسلة (")}{formatCurrency(totalComboPrice)})</span>
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', boxSizing: 'border-box' }}>
        {/* Step Progress Indicators */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', flexShrink: 0 }}>
          {[
            { step: 1, title: t('pos.pos_workspace.pos_combo_meal_modal.s7', "1. الصنف الرئيسي (البرجر/الساندوتش)"), desc: selectedMain ? selectedMain.name : t('pos.pos_workspace.pos_combo_meal_modal.s8', "اختر الصنف") },
            { step: 2, title: t('pos.pos_workspace.pos_combo_meal_modal.s9', "2. الصنف الجانبي (البطاطس والمقبلات)"), desc: selectedSide.name },
            { step: 3, title: t('pos.pos_workspace.pos_combo_meal_modal.s10', "3. المشروب والملاحظات"), desc: selectedDrink.name },
          ].map((s) => {
            const isActive = currentStep === s.step;
            const isCompleted = currentStep > s.step;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => setCurrentStep(s.step as any)}
                style={{
                  background: isActive ? '#170e5e' : isCompleted ? '#eef2ff' : '#f8fafc',
                  color: isActive ? '#ffffff' : isCompleted ? '#170e5e' : '#64748b',
                  border: isActive ? '1.5px solid #170e5e' : isCompleted ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  textAlign: 'right',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{s.title}</span>
                  {isCompleted && <CheckCircleIcon size={13} color="#170e5e" />}
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 500,
                    color: isActive ? '#cbd5e1' : '#64748b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {s.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* STEP 1: MAIN ENTREE */}
        {currentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
                {t('pos.pos_workspace.pos_combo_meal_modal.s11', "اختر الصنف الرئيسي للوجبة (")}{mainEntrees.length} {t('pos.pos_workspace.pos_combo_meal_modal.s12', "صنف متاح):")}
              </div>
              <div style={{ position: 'relative', width: '220px' }}>
                <input
                  type="text"
                  placeholder={t('pos.pos_workspace.pos_combo_meal_modal.s13', "بحث في الأصناف...")}
                  value={mainSearch}
                  onChange={(e) => setMainSearch(e.target.value)}
                  style={{
                    width: '100%',
                    height: '30px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 26px 0 8px',
                    fontSize: '11.5px',
                    boxSizing: 'border-box',
                  }}
                />
                <SearchIcon size={13} color="#94a3b8" style={{ position: 'absolute', right: '8px', top: '9px' }} />
              </div>
            </div>

            <div
              className="thin-scrollbar"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '8px',
                maxHeight: '235px',
                height: '235px',
                overflowY: 'auto',
                padding: '2px',
                boxSizing: 'border-box',
              }}
            >
              {mainEntrees.map((prod) => {
                const isSelected = selectedMain?.id === prod.id;
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => setSelectedMain(prod)}
                    style={{
                      background: isSelected ? '#eef2ff' : '#ffffff',
                      border: isSelected ? '2px solid #170e5e' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      textAlign: 'right',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '70px',
                      boxSizing: 'border-box',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(23, 14, 94, 0.08)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {prod.name}
                      </span>
                      {isSelected && <CheckCircleIcon size={14} color="#170e5e" />}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 900, color: '#170e5e', marginTop: '4px' }}>
                      {formatCurrency(prod.price || prod.retail_price || 0)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: SIDE DISH */}
        {currentStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0 }}>
            <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
              {t('pos.pos_workspace.pos_combo_meal_modal.s14', "اختر الصنف الجانبي (بطاطس ومقبلات):")}
            </div>
            <div
              className="thin-scrollbar"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                gap: '10px',
                maxHeight: '235px',
                height: '235px',
                overflowY: 'auto',
                padding: '2px',
                boxSizing: 'border-box',
              }}
            >
              {defaultSides.map((side) => {
                const isSelected = selectedSide.id === side.id;
                return (
                  <button
                    key={side.id}
                    type="button"
                    onClick={() => setSelectedSide(side)}
                    style={{
                      background: isSelected ? '#eef2ff' : '#ffffff',
                      border: isSelected ? '2px solid #170e5e' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      textAlign: 'right',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '75px',
                      boxSizing: 'border-box',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(23, 14, 94, 0.08)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>{side.name}</span>
                      {isSelected && <CheckCircleIcon size={14} color="#170e5e" />}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: side.priceDelta > 0 ? '#ea580c' : '#16a34a', marginTop: '4px' }}>
                      {side.priceDelta > 0 ? `+ ${formatCurrency(side.priceDelta)}` : t('pos.pos_workspace.pos_combo_meal_modal.s15', "مشمول بالوجبة (0 ج.م)")}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: DRINK & NOTES */}
        {currentStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0 }}>
            <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
              {t('pos.pos_workspace.pos_combo_meal_modal.s16', "اختر المشروب المنعش وتفضيلات التحضير:")}
            </div>
            <div
              className="thin-scrollbar"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                gap: '8px',
                maxHeight: '170px',
                height: '170px',
                overflowY: 'auto',
                padding: '2px',
                boxSizing: 'border-box',
              }}
            >
              {defaultDrinks.map((drink) => {
                const isSelected = selectedDrink.id === drink.id;
                return (
                  <button
                    key={drink.id}
                    type="button"
                    onClick={() => setSelectedDrink(drink)}
                    style={{
                      background: isSelected ? '#eef2ff' : '#ffffff',
                      border: isSelected ? '2px solid #170e5e' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      textAlign: 'right',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '65px',
                      boxSizing: 'border-box',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(23, 14, 94, 0.08)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>{drink.name}</span>
                      {isSelected && <CheckCircleIcon size={14} color="#170e5e" />}
                    </div>
                    <div style={{ fontSize: '11.5px', fontWeight: 800, color: drink.priceDelta > 0 ? '#ea580c' : '#16a34a', marginTop: '3px' }}>
                      {drink.priceDelta > 0 ? `+ ${formatCurrency(drink.priceDelta)}` : t('pos.pos_workspace.pos_combo_meal_modal.s17', "مشمول بالوجبة (0 ج.م)")}
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: '2px' }}>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                {t('pos.pos_workspace.pos_combo_meal_modal.s18', "ملاحظات وتخصيص الوجبة للمطبخ (اختياري):")}
              </label>
              <input
                type="text"
                placeholder={t('pos.pos_workspace.pos_combo_meal_modal.s19', "مثال: بدون بصل / صوص باربيكيو جانبي / بدون ثلج في المشروب")}
                value={comboNotes}
                onChange={(e) => setComboNotes(e.target.value)}
                style={{
                  width: '100%',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  padding: '0 10px',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                  background: '#ffffff',
                }}
              />
            </div>
          </div>
        )}

        {/* Live Summary Card */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <UtensilsIcon size={16} color="#170e5e" />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>{t('pos.pos_workspace.pos_combo_meal_modal.s20', "مكونات الوجبة المختارة:")}</div>
              <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedMain?.name || '—'} + {selectedSide.name} + {selectedDrink.name}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'left', flexShrink: 0 }}>
            <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>{t('pos.pos_workspace.pos_combo_meal_modal.s21', "إجمالي سعر الوجبة:")}</div>
            <div style={{ fontSize: '17px', fontWeight: 900, color: '#170e5e' }}>
              {formatCurrency(totalComboPrice)}
            </div>
          </div>
        </div>
      </div>
    </RestaurantOperationsDialog>
  );
}
