import { useState, useEffect, useRef } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { contractingApi } from '../api/contracting.api';
import { MasterBoqItem, MasterBoqTrade, ContractingBoqItem } from '../contracting.types';

const EMPTY_ITEMS: any[] = [];

/**
 * دالة تنظيف وتوحيد المدخلات الرقمية:
 * تحوّل الأرقام العربية الشرقية (٠-٩) والفارسية تلقائياً إلى أرقام قياسية (0-9)
 * وتسمح فقط بالأرقام وعلامة عشرية واحدة، وتدعم الفاصلة العربية (،) كنقطة عشرية.
 */
export function cleanNumberInput(val: string): string {
  if (!val) return '';
  const normalized = val
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[،,]/g, '.');
  const cleaned = normalized.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }
  return cleaned;
}

export const TRADE_PREFIXES: Record<string, string> = {
  civil_concrete: 'CIV',
  masonry_insulation: 'MAS',
  finishes: 'FIN',
  doors_windows_facades: 'FAC',
  steel_structures: 'STL',
  electrical: 'ELE',
  smart_systems_elv: 'ELV',
  plumbing: 'PLM',
  hvac_firefighting: 'HVAC',
  landscape_infrastructure: 'INF',
};

export const DEFAULT_TRADE_MARGINS: Record<string, number> = {
  civil_concrete: 25,
  masonry_insulation: 30,
  finishes: 30,
  doors_windows_facades: 30,
  steel_structures: 25,
  electrical: 33,
  smart_systems_elv: 32,
  plumbing: 30,
  hvac_firefighting: 30,
  landscape_infrastructure: 30,
};

export const TRADE_LABELS: Record<string, string> = {
  civil_concrete: 'الأعمال المدنية والخرسانات',
  masonry_insulation: 'أعمال المباني والعزل',
  finishes: 'أعمال التشطيبات والديكور',
  doors_windows_facades: 'النجارة والألوميتال والواجهات',
  steel_structures: 'الإنشاءات المعدنية',
  electrical: 'أعمال الكهرباء والإنارة',
  smart_systems_elv: 'التيار الخفيف والسمارت',
  plumbing: 'الأعمال الصحية والسباكة',
  hvac_firefighting: 'التكييف ومكافحة الحريق',
  landscape_infrastructure: 'الموقع العام واللاندسكيب',
  earthworks: 'أعمال الحفر والردم',
  concrete: 'الخرسانات المسلحة',
  masonry: 'أعمال المباني',
  mep: 'الكهروميكانيك',
  other: 'أعمال عامة',
};

export function calculatePriceFromMargin(costNum: number, marginPercent: number): number {
  if (costNum <= 0) return 0;
  if (marginPercent <= 0) return costNum;
  if (marginPercent >= 99) return Math.round(costNum * 100 * 100) / 100;
  return Math.round((costNum / (1 - marginPercent / 100)) * 100) / 100;
}

export function calculateMarginFromPrice(costNum: number, priceNum: number): number {
  if (priceNum <= 0 || costNum <= 0) return 0;
  return Math.round(((priceNum - costNum) / priceNum) * 100);
}

export function getNextItemCode(tradeCategory: string, existingItems: any[] = []): string {
  const prefix = TRADE_PREFIXES[tradeCategory] || tradeCategory.slice(0, 3).toUpperCase();
  
  const tradeItems = existingItems.filter(
    (item) => (item.tradeCategory === tradeCategory || item.category === tradeCategory || (item.itemCode && item.itemCode.toUpperCase().startsWith(prefix)))
  );

  let maxNum = 0;
  for (const it of tradeItems) {
    const code = it.itemCode || it.item_code || '';
    const match = code.match(/-(\d+)$/);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `${prefix}-${String(nextNum).padStart(3, '0')}`;
}

export interface UniversalBoqItemModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  onCreated?: () => void;
  mode?: 'master' | 'project';
  projectId?: string;
  projectName?: string;
  initialItem?: MasterBoqItem | ContractingBoqItem | any | null;
  trades?: MasterBoqTrade[];
  existingItems?: any[];
  initialTradeCategory?: string;
}

export function UniversalBoqItemModal({
  open,
  onClose,
  onSaved,
  onCreated,
  mode = 'master',
  projectId,
  projectName,
  initialItem,
  trades: passedTrades,
  existingItems = EMPTY_ITEMS,
  initialTradeCategory,
}: UniversalBoqItemModalProps) {
  const [internalTrades, setInternalTrades] = useState<MasterBoqTrade[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const trades = passedTrades && passedTrades.length > 0 ? passedTrades : internalTrades;
  const hasInitializedRef = useRef(false);

  // Load trades if not passed
  useEffect(() => {
    if (!open) return;
    if (!passedTrades || passedTrades.length === 0) {
      contractingApi.getMasterBoqTrades()
        .then((data) => setInternalTrades(data || []))
        .catch(() => { /* fallback */ });
    }
  }, [open, passedTrades]);

  // Form State
  const [formData, setFormData] = useState({
    tradeCategory: 'civil_concrete',
    itemCode: '',
    name: '',
    description: '',
    unit: 'm2',
    contractQty: '',
    standardCost: '',
    standardPrice: '',
    notes: '',
  });

  const [marginPercent, setMarginPercent] = useState<string>('30');

  useEffect(() => {
    if (!open) {
      hasInitializedRef.current = false;
      return;
    }

    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    if (initialItem) {
      const cat = initialItem.tradeCategory || initialItem.category || 'civil_concrete';
      const code = initialItem.itemCode || initialItem.item_code || '';
      const name = initialItem.name || initialItem.description || '';
      const desc = initialItem.description || '';
      const unit = initialItem.unit || 'm2';
      const cost = Number(initialItem.standardCost ?? initialItem.estimatedUnitCost ?? 0);
      const price = Number(initialItem.standardPrice ?? initialItem.unitPrice ?? 0);
      const rawQty = initialItem.contractQty ?? initialItem.revisedQty ?? 0;
      const qtyNum = Number(rawQty);
      // إذا كانت الكمية صفرية أو غير محددة، نترك الخانة فارغة لتمكين المستخدم من الكتابة فوراً بدون الحاجة لمسح الصفر
      const qty = qtyNum > 0 ? String(qtyNum) : '';
      const notes = initialItem.notes || '';

      const computedMargin = price > 0 && cost > 0
        ? calculateMarginFromPrice(cost, price)
        : (DEFAULT_TRADE_MARGINS[cat] ?? 30);

      setFormData({
        tradeCategory: cat,
        itemCode: code,
        name,
        description: desc,
        unit,
        contractQty: qty,
        standardCost: cost > 0 ? String(cost) : '',
        standardPrice: price > 0 ? String(price) : '',
        notes,
      });
      setMarginPercent(String(computedMargin));
    } else {
      const initialCat = initialTradeCategory || (trades[0]?.tradeCategory || 'civil_concrete');
      const autoCode = getNextItemCode(initialCat, existingItems);
      const defaultMargin = DEFAULT_TRADE_MARGINS[initialCat] ?? 30;

      setFormData({
        tradeCategory: initialCat,
        itemCode: autoCode,
        name: '',
        description: '',
        unit: 'm2',
        contractQty: '',
        standardCost: '',
        standardPrice: '',
        notes: '',
      });
      setMarginPercent(String(defaultMargin));
    }
    setErrorMsg(null);
  }, [open, initialItem]);

  const handleTradeCategoryChange = (newCat: string) => {
    const nextCode = !initialItem ? getNextItemCode(newCat, existingItems) : formData.itemCode;
    const suggestedMargin = DEFAULT_TRADE_MARGINS[newCat] ?? 30;

    if (!initialItem) {
      setMarginPercent(String(suggestedMargin));
      const costNum = Number(formData.standardCost);
      let newPrice = formData.standardPrice;
      if (!isNaN(costNum) && costNum > 0) {
        newPrice = String(calculatePriceFromMargin(costNum, suggestedMargin));
      }
      setFormData((prev) => ({
        ...prev,
        tradeCategory: newCat,
        itemCode: nextCode,
        standardPrice: newPrice,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        tradeCategory: newCat,
        itemCode: nextCode,
      }));
    }
  };

  const handleCostChange = (val: string) => {
    const cleaned = cleanNumberInput(val);
    const costNum = Number(cleaned);
    const marginNum = Number(marginPercent);
    let newPrice = formData.standardPrice;

    if (!isNaN(costNum) && costNum > 0 && !isNaN(marginNum) && marginNum >= 0 && marginNum < 100) {
      newPrice = String(calculatePriceFromMargin(costNum, marginNum));
    } else if (!cleaned || costNum === 0) {
      newPrice = '';
    }

    setFormData((prev) => ({
      ...prev,
      standardCost: cleaned,
      standardPrice: newPrice,
    }));
  };

  const handleMarginChange = (val: string) => {
    const cleaned = cleanNumberInput(val);
    setMarginPercent(cleaned);
    const marginNum = Number(cleaned);
    const costNum = Number(formData.standardCost);

    if (!isNaN(costNum) && costNum > 0 && !isNaN(marginNum) && marginNum >= 0 && marginNum < 100) {
      const calculated = calculatePriceFromMargin(costNum, marginNum);
      setFormData((prev) => ({
        ...prev,
        standardPrice: String(calculated),
      }));
    }
  };

  const handlePriceChange = (val: string) => {
    const cleaned = cleanNumberInput(val);
    const priceNum = Number(cleaned);
    const costNum = Number(formData.standardCost);

    if (!isNaN(costNum) && costNum > 0 && !isNaN(priceNum) && priceNum > 0) {
      const computedMargin = calculateMarginFromPrice(costNum, priceNum);
      setMarginPercent(String(computedMargin));
    }

    setFormData((prev) => ({
      ...prev,
      standardPrice: cleaned,
    }));
  };

  const cost = Number(formData.standardCost || 0);
  const price = Number(formData.standardPrice || 0);
  const contractQty = Number(formData.contractQty || 0);
  const totalContractVal = contractQty * price;
  const totalCostVal = contractQty * cost;
  const totalProfitVal = totalContractVal - totalCostVal;
  const effectiveMargin = price > 0 ? Math.round(((price - cost) / price) * 100) : 0;
  const currentSuggestedMargin = DEFAULT_TRADE_MARGINS[formData.tradeCategory] ?? 30;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.itemCode.trim() || !formData.name.trim()) {
      setErrorMsg('كود البند ومسمى البند مطلوبان');
      return;
    }
    if (mode === 'project' && contractQty <= 0) {
      setErrorMsg('يرجى تحديد كمية تعاقدية صالحة أكبر من الصفر');
      return;
    }
    if (price <= 0) {
      setErrorMsg('يرجى إدخال سعر فئة / بيع صالح أكبر من الصفر');
      return;
    }

    const tradeObj = trades.find((t) => t.tradeCategory === formData.tradeCategory);
    const tradeNameAr = tradeObj ? tradeObj.tradeNameAr : (TRADE_LABELS[formData.tradeCategory] || formData.tradeCategory);

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      if (mode === 'project') {
        if (!projectId) {
          throw new Error('معرف المشروع غير محدد');
        }
        if (initialItem) {
          await contractingApi.updateBoqItem(initialItem.id, {
            description: formData.name.trim() + (formData.description.trim() ? ` - ${formData.description.trim()}` : ''),
            category: formData.tradeCategory,
            unit: formData.unit.trim(),
            contractQty,
            unitPrice: price,
            estimatedUnitCost: cost,
            notes: formData.notes.trim() || undefined,
          });
        } else {
          await contractingApi.createBoqItem(projectId, {
            itemCode: formData.itemCode.trim(),
            description: formData.name.trim() + (formData.description.trim() ? ` - ${formData.description.trim()}` : ''),
            category: formData.tradeCategory,
            unit: formData.unit.trim(),
            contractQty,
            unitPrice: price,
            estimatedUnitCost: cost,
            notes: formData.notes.trim() || undefined,
          });
        }
      } else {
        // Master BOQ mode
        if (initialItem) {
          await contractingApi.updateMasterBoqItem(initialItem.id, {
            tradeCategory: formData.tradeCategory,
            tradeNameAr,
            name: formData.name.trim(),
            description: formData.description.trim() || formData.name.trim(),
            unit: formData.unit.trim(),
            standardCost: cost,
            standardPrice: price,
          });
        } else {
          await contractingApi.createMasterBoqItem({
            tradeCategory: formData.tradeCategory,
            tradeNameAr,
            itemCode: formData.itemCode.trim(),
            name: formData.name.trim(),
            description: formData.description.trim() || formData.name.trim(),
            unit: formData.unit.trim(),
            standardCost: cost,
            standardPrice: price,
          });
        }
      }

      onSaved?.();
      onCreated?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل في حفظ بند المقايسة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogTitle = mode === 'project'
    ? (initialItem ? 'تعديل بند في مقايسة المشروع' : 'إضافة بند جديد لجدول الكميات والمقايسة (BOQ)')
    : (initialItem ? 'تعديل بند مرجعي' : 'إضافة بند مرجعي جديد لبنك البنود');

  const dialogSubtitle = mode === 'project'
    ? (projectName ? `المشروع: ${projectName}` : 'تحديد مواصفات البند والكميات التعاقدية وسعر الفئة والتكلفة التقديرية')
    : 'حفظ البند في مكتبة البنود العامة لشركتك لاستيراده بضغطة زر في أي مشروع قادم';

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={dialogTitle}
      subtitle={dialogSubtitle}
      width="min(780px, 95vw)"
      footer={
        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitText={initialItem ? 'حفظ التعديلات' : mode === 'project' ? 'إضافة البند للمقايسة' : 'إضافة إلى بنك البنود'}
          isSubmitting={isSubmitting}
        />
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              fontSize: 'var(--font-body)',
              fontWeight: 600,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* سطر التصنيف والتكويد ووحدة القياس */}
        <div style={{ display: 'grid', gridTemplateColumns: mode === 'project' ? '1.2fr 1fr 1fr 1fr' : '1.2fr 1fr 1fr', gap: '12px' }}>
          <Field label="التخصص الإنشائي / التصنيف">
            <select
              value={formData.tradeCategory}
              onChange={(e) => handleTradeCategoryChange(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 10px',
                fontSize: 'var(--font-body)',
                background: '#ffffff',
                fontWeight: 600,
                color: '#0f172a',
              }}
            >
              {trades.length > 0 ? (
                trades.map((t) => (
                  <option key={t.tradeCategory} value={t.tradeCategory}>
                    {t.tradeNameAr}
                  </option>
                ))
              ) : (
                Object.entries(TRADE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))
              )}
            </select>
          </Field>

          <Field
            label="كود البند"
            hint={!initialItem ? 'توليد تلقائي متسلسل' : 'كود البند المسجل'}
          >
            <input
              type="text"
              value={formData.itemCode}
              disabled={Boolean(initialItem)}
              onChange={(e) => setFormData({ ...formData, itemCode: e.target.value.toUpperCase() })}
              placeholder="مثال: MAS-007"
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 10px',
                fontSize: 'var(--font-body)',
                fontFamily: 'monospace',
                fontWeight: 700,
                color: '#170e5e',
                background: initialItem ? '#f8fafc' : '#f0f9ff',
              }}
            />
          </Field>

          <Field label="وحدة القياس">
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 10px',
                fontSize: 'var(--font-body)',
                background: '#ffffff',
                fontWeight: 600,
              }}
            >
              <option value="m2">متر مسطح (m2)</option>
              <option value="m3">متر مكعب (m3)</option>
              <option value="m">متر طولي (m)</option>
              <option value="point">نقطة (point)</option>
              <option value="set">طقم / لوحة (set)</option>
              <option value="item">عدد (item)</option>
              <option value="ton">طن (ton)</option>
              <option value="kg">كيلوجرام (kg)</option>
              <option value="ls">مقطوعية (ls)</option>
            </select>
          </Field>

          {mode === 'project' && (
            <Field label="الكمية التعاقدية *" hint="المحصورة من اللوحات">
              <input
                type="text"
                inputMode="decimal"
                required
                autoFocus={Boolean(initialItem && (!initialItem.contractQty || Number(initialItem.contractQty) === 0))}
                value={formData.contractQty}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const cleaned = cleanNumberInput(e.target.value);
                  setFormData((prev) => ({ ...prev, contractQty: cleaned }));
                }}
                placeholder="0.00"
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 10px',
                  fontSize: 'var(--font-body)',
                  fontWeight: 700,
                  color: '#0f172a',
                  background: '#ffffff',
                }}
              />
            </Field>
          )}
        </div>

        {/* مسمى البند */}
        <Field label="مسمى البند والمواصفة الفنية التعاقدية *">
          <input
            dir="auto"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="مثال: مباني من الطوب الأسمنتي المصمت سمك 25 سم لقصية الردم"
            style={{
              width: '100%',
              height: '38px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              padding: '0 10px',
              fontSize: 'var(--font-body)',
              fontWeight: 600,
            }}
          />
        </Field>

        {/* بيان الأعمال والمواصفات الفنية التفصيلية */}
        <Field label="بيان الأعمال والشروط والمواصفات المعتمدة" hint="المواصفات القياسية للبند واشتراطات الكود">
          <textarea
            dir="auto"
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="بيان تفصيلي بالأعمال والاشتراطات والمواد المستعملة وطريقة التنفيذ والاختبار..."
            style={{
              width: '100%',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              padding: '8px 10px',
              fontSize: 'var(--font-body)',
              fontFamily: 'inherit',
            }}
          />
        </Field>

        {/* كارت التسعير التلقائي وهامش الربح الذكي (نفس الكارت الموحد) */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b' }}>
              التسعير وهامش الربح للوحدة (Pricing & Margin)
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#4338ca',
                background: '#e0e7ff',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              احتساب تلقائي فوري
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1.1fr', gap: '12px' }}>
            {/* 1. سعر التكلفة المرجعية */}
            <Field label="التكلفة التقديرية للوحدة" hint="خامات + مصنعية ومعدات">
              <input
                type="text"
                inputMode="decimal"
                value={formData.standardCost}
                onFocus={(e) => e.target.select()}
                onChange={(e) => handleCostChange(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 10px',
                  fontSize: 'var(--font-body)',
                  fontWeight: 600,
                  background: '#ffffff',
                }}
              />
            </Field>

            {/* 2. خانة هامش الربح (%) في المنتصف بين التكلفة والبيع */}
            <Field
              label="هامش الربح (%)"
              hint={`المقترح: ${currentSuggestedMargin}%`}
            >
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  inputMode="decimal"
                  value={marginPercent}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleMarginChange(e.target.value)}
                  placeholder={String(currentSuggestedMargin)}
                  style={{
                    width: '100%',
                    height: '38px',
                    borderRadius: '8px',
                    border: '1px solid #94a3b8',
                    padding: '0 28px 0 10px',
                    fontSize: 'var(--font-body)',
                    fontWeight: 700,
                    color: '#0f172a',
                    background: '#ffffff',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 'var(--font-body)',
                    fontWeight: 700,
                    color: '#64748b',
                    pointerEvents: 'none',
                  }}
                >
                  %
                </span>
              </div>
            </Field>

            {/* 3. سعر الفئة للعميل / سعر البيع المقترح */}
            <Field label={mode === 'project' ? 'سعر الفئة للعميل (ج.م) *' : 'سعر البيع المقترح *'} hint="يُحسب تلقائياً من الهامش">
              <input
                type="text"
                inputMode="decimal"
                value={formData.standardPrice}
                onFocus={(e) => e.target.select()}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #170e5e',
                  padding: '0 10px',
                  fontSize: 'var(--font-body)',
                  fontWeight: 800,
                  color: '#170e5e',
                  background: '#ffffff',
                }}
              />
            </Field>
          </div>

          {/* شريط المؤشرات المالية اللحظية */}
          {price > 0 && cost > 0 && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: 'var(--font-micro)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#475569' }}>
                  صافي ربح الوحدة: <strong style={{ color: '#170e5e' }}>{(price - cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> ج.م / {formData.unit}
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    color: effectiveMargin >= 25 ? '#15803d' : effectiveMargin > 0 ? '#b45309' : '#b91c1c',
                    background: effectiveMargin >= 25 ? '#dcfce7' : effectiveMargin > 0 ? '#fef3c7' : '#fee2e2',
                    padding: '3px 8px',
                    borderRadius: '4px',
                  }}
                >
                  الهامش الإجمالي الفعلي: {effectiveMargin}%
                </span>
              </div>

              {mode === 'project' && contractQty > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px dashed #e2e8f0',
                    paddingTop: '6px',
                    marginTop: '2px',
                  }}
                >
                  <span style={{ color: '#475569' }}>
                    إجمالي قيمة البند للمشروع: <strong style={{ color: '#170e5e' }}>{totalContractVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> ج.م
                  </span>
                  <span style={{ color: '#059669', fontWeight: 700 }}>
                    إجمالي أرباح البند المتوقعة: +{totalProfitVal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {mode === 'project' && (
          <Field label="ملاحظات وشروط إضافية (اختياري)">
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="أي اشتراطات خاصة بالاستلام أو الدفعات..."
              style={{
                width: '100%',
                height: '36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 10px',
                fontSize: 'var(--font-body)',
              }}
            />
          </Field>
        )}
      </form>
    </StandardDialog>
  );
}
