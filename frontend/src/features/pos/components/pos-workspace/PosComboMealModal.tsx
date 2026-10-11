import { useState, useMemo } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { formatCurrency } from '@/lib/format';
import { CheckCircleIcon, PlusCircleIcon, SlidersIcon } from '@/shared/components/icons/AppIcons';
import type { PosCartItem } from '@/features/pos/types/pos.types';

interface ComboOption {
  id: string;
  name: string;
  priceDelta: number;
}

interface PosComboMealModalProps {
  open: boolean;
  onClose: () => void;
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
  products,
  onAddComboToCart,
}: PosComboMealModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

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

  // Available Main Entrees (Products from catalog or category)
  const mainEntrees = useMemo(() => {
    if (!products.length) return [];
    return products.slice(0, 30);
  }, [products]);

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
    // Reset state
    setCurrentStep(1);
    setComboNotes('');
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="معالج وجبات الكومبو السريعة (Combo Meal Builder)"
      subtitle="بناء وجبة متكاملة خطوة بخطوة: الصنف الرئيسي ➔ الطبق الجانبي ➔ المشروب"
      width="880px"
      contentStyle={{ padding: '16px 20px', minHeight: '480px', maxHeight: '80vh', overflowY: 'auto' }}
    >
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Step Progress Indicators */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            style={{
              background: currentStep === 1 ? '#170e5e' : currentStep > 1 ? '#e0e7ff' : '#f8fafc',
              color: currentStep === 1 ? '#ffffff' : currentStep > 1 ? '#3730a3' : '#64748b',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '8px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            1. الصنف الرئيسي (البرجر/الساندوتش)
          </button>
          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            style={{
              background: currentStep === 2 ? '#170e5e' : currentStep > 2 ? '#e0e7ff' : '#f8fafc',
              color: currentStep === 2 ? '#ffffff' : currentStep > 2 ? '#3730a3' : '#64748b',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '8px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            2. الصنف الجانبي (البطاطس والمقبلات)
          </button>
          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            style={{
              background: currentStep === 3 ? '#170e5e' : '#f8fafc',
              color: currentStep === 3 ? '#ffffff' : '#64748b',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '8px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            3. المشروب والملاحظات
          </button>
        </div>

        {/* STEP 1: MAIN ENTREE */}
        {currentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
              اختر الصنف الرئيسي للوجبة:
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                gap: '10px',
                maxHeight: '260px',
                overflowY: 'auto',
                padding: '4px',
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
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      borderRadius: '10px',
                      padding: '12px 10px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '80px',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{prod.name}</div>
                    <div style={{ fontSize: '13px', fontWeight: 900, color: '#170e5e', marginTop: '6px' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
              اختر الصنف الجانبي (بطاطس ومقبلات):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
              {defaultSides.map((side) => {
                const isSelected = selectedSide.id === side.id;
                return (
                  <button
                    key={side.id}
                    type="button"
                    onClick={() => setSelectedSide(side)}
                    style={{
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      borderRadius: '10px',
                      padding: '14px 12px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{side.name}</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: side.priceDelta > 0 ? '#ea580c' : '#16a34a' }}>
                      {side.priceDelta > 0 ? `+ ${formatCurrency(side.priceDelta)}` : 'مشمول بالوجبة (0 ج.م)'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: DRINK & NOTES */}
        {currentStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
              اختر المشروب المنعش:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
              {defaultDrinks.map((drink) => {
                const isSelected = selectedDrink.id === drink.id;
                return (
                  <button
                    key={drink.id}
                    type="button"
                    onClick={() => setSelectedDrink(drink)}
                    style={{
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      borderRadius: '10px',
                      padding: '14px 12px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{drink.name}</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: drink.priceDelta > 0 ? '#ea580c' : '#16a34a' }}>
                      {drink.priceDelta > 0 ? `+ ${formatCurrency(drink.priceDelta)}` : 'مشمول بالوجبة (0 ج.م)'}
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: '8px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                ملاحظات وتخصيص الوجبة (اختياري)
              </label>
              <input
                type="text"
                placeholder="مثال: بدون بصل / صوص باربيكيو جانبي / بدون ثلج في المشروب"
                value={comboNotes}
                onChange={(e) => setComboNotes(e.target.value)}
                style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '12.5px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {/* Live Summary Card */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>مكونات الوجبة المختارة:</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {selectedMain?.name || '—'} + {selectedSide.name} + {selectedDrink.name}
            </div>
          </div>

          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>إجمالي سعر الوجبة:</div>
            <div style={{ fontSize: '17px', fontWeight: 900, color: '#170e5e' }}>
              {formatCurrency(totalComboPrice)}
            </div>
          </div>
        </div>

        {/* Navigation & Confirmation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => (s - 1) as any)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ← الخطوة السابقة
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => (s + 1) as any)}
                style={{
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 20px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                الخطوة التالية →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmCombo}
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 24px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircleIcon size={14} color="#ffffff" />
                <span>إضافة وجبة الكومبو للسلة</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </StandardDialog>
  );
}
