import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { AsyncSearchableCombobox } from '@/shared/ui/async-searchable-combobox';
import { FormSection } from '@/shared/components/form-section';
import { QuickProductModal } from '@/shared/components/QuickProductModal';
import { ManufacturingLayout } from '@/features/manufacturing/components/ManufacturingLayout';
import { productsApi } from '@/features/products';
import { inventoryApi } from '@/shared/api/inventory.api';
import { componentsApi, type ManufacturingComponent } from '@/features/manufacturing/api/components.api';
import { calculateConvertedCost, findUnit } from '@/features/manufacturing/utils/units';
import { bomsApi } from '@/features/manufacturing/api/boms.api';
import type { Product } from '@/types/domain';
import { systemAlert } from '@/shared/components/system-alert';
import type { BomLine } from '@/features/manufacturing/components/boms/bom-types';
import { BomLinesTable } from '@/features/manufacturing/components/boms/BomLinesTable';
import { BomCostSummaryCard } from '@/features/manufacturing/components/boms/BomCostSummaryCard';

export default function NewBomPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [productQuery, setProductQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [components, setComponents] = useState<ManufacturingComponent[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [overheadCost, setOverheadCost] = useState(0);
  const [lines, setLines] = useState<BomLine[]>([
    { id: Date.now(), componentId: null, componentName: '', quantity: 1, unitName: 'kg', baseUnit: 'kg', baseCost: 0, expectedCost: 0, wastePercentage: 0, query: '' }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [quickModal, setQuickModal] = useState<{
    isOpen: boolean;
    name: string;
    itemType: 'product' | 'raw_material';
    lineId?: number;
  }>({ isOpen: false, name: '', itemType: 'product' });

  useEffect(() => {
    productsApi.listAll().then(res => setProducts(res.products || []));
    componentsApi.list().then(res => setComponents(res));
  }, []);

  const handleSave = async () => {
    if (!selectedProduct) return systemAlert('الرجاء اختيار المنتج التام');
    if (lines.some(l => !l.componentId)) return systemAlert('الرجاء اختيار مكونات التصنيع لجميع الأسطر');

    setIsSaving(true);
    try {
      await bomsApi.create({
        productId: Number(selectedProduct.id),
        quantity: quantity,
        overheadCost: overheadCost,
        lines: lines.map(l => {
          const unitDef = findUnit(l.unitName);
          return {
            componentProductId: Number(l.componentId),
            quantity: l.quantity,
            unitName: l.unitName,
            unitMultiplier: unitDef ? unitDef.multiplier : 1,
            expectedCost: l.expectedCost,
            wastePercentage: l.wastePercentage || 0,
          };
        })
      });
      systemAlert('تم حفظ التركيبة بنجاح');
      navigate('/manufacturing/boms');
    } catch (e) {
      console.error(e);
      systemAlert('حدث خطأ أثناء حفظ التركيبة');
    } finally {
      setIsSaving(false);
    }
  };

  const addLine = () => {
    setLines([...lines, { id: Date.now(), componentId: null, componentName: '', quantity: 1, unitName: 'kg', baseUnit: 'kg', baseCost: 0, expectedCost: 0, wastePercentage: 0, query: '' }]);
  };

  const updateLine = (id: number, key: keyof BomLine, value: any) => {
    setLines(prevLines => prevLines.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [key]: value };
      
      if (key === 'query') {
        const exactMatch = components.find(c => c.name === value);
        if (exactMatch && updated.componentId !== exactMatch.id) {
          updated.componentId = exactMatch.id;
          updated.componentName = exactMatch.name;
          updated.baseUnit = exactMatch.baseUnit;
          updated.baseCost = exactMatch.costPerBaseUnit;
          const matchedUnit = findUnit(exactMatch.baseUnit);
          if (!updated.unitName || updated.unitName !== matchedUnit?.id) {
            updated.unitName = matchedUnit ? matchedUnit.id : exactMatch.baseUnit;
          }
        } else if (!exactMatch && updated.componentId) {
          updated.componentId = null;
          updated.baseCost = 0;
          updated.expectedCost = 0;
        }
      }

      if (key === 'unitName' || key === 'baseCost' || key === 'baseUnit' || key === 'query') {
        updated.expectedCost = calculateConvertedCost(updated.baseCost, updated.baseUnit, updated.unitName, 1);
      }
      
      return updated;
    }));
  };

  const selectComponent = (id: number, component: ManufacturingComponent) => {
    setLines(prevLines => prevLines.map(l => {
      if (l.id !== id) return l;
      const baseCost = component.costPerBaseUnit;
      const baseUnit = component.baseUnit;
      const matchedUnit = findUnit(component.baseUnit);
      const unitName = matchedUnit ? matchedUnit.id : component.baseUnit; 
      const expectedCost = calculateConvertedCost(baseCost, baseUnit, unitName, 1);
      
      return {
        ...l,
        componentId: component.id,
        componentName: component.name,
        baseUnit,
        baseCost,
        unitName,
        expectedCost,
        wastePercentage: 0,
        query: component.name
      };
    }));
  };

  const removeLine = (id: number) => {
    setLines(prevLines => prevLines.filter(l => l.id !== id));
  };

  const unitCost = lines.reduce((sum, line) => {
    const wasteFactor = 1 / (1 - ((line.wastePercentage || 0) / 100));
    return sum + (line.expectedCost * line.quantity * wasteFactor);
  }, 0);
  const batchTotalCost = unitCost + (overheadCost || 0);
  const singleUnitTotalCost = batchTotalCost / (quantity || 1);

  const filteredProducts = products.filter(p => p.itemType !== 'raw_material');

  return (
    <ManufacturingLayout
      breadcrumbs={[
        { label: t('manufacturing.new_bom_page.s0', "التصنيع"), to: '/manufacturing/boms' },
        { label: t('manufacturing.new_bom_page.s1', "قوائم المكونات"), to: '/manufacturing/boms' },
        { label: t('manufacturing.new_bom_page.s2', "تركيبة منتج جديدة") }
      ]}
      title={t('manufacturing.new_bom_page.s3', "إنشاء تركيبة منتج (BOM)")}
      statusBadge={<span className="document-prototype-status-badge is-draft">{t('manufacturing.new_bom_page.s4', "مسودة")}</span>}
      actions={
        <>
          <Button 
            variant="secondary" 
            type="button" 
            className="purchase-prototype-toolbar-action purchase-prototype-toolbar-action-secondary" 
            style={{ color: 'var(--danger-color)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            onClick={() => navigate('/manufacturing/boms')}
          >
            {t('manufacturing.new_bom_page.s5', "إلغاء")}
          </Button>
          <Button 
            variant="primary" 
            type="button" 
            className="purchase-prototype-toolbar-action purchase-prototype-toolbar-action-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? t('manufacturing.new_bom_page.s6', "جاري الحفظ...") : t('manufacturing.new_bom_page.s7', "حفظ التركيبة")}
          </Button>
        </>
      }
    >
      <FormSection title={t('manufacturing.new_bom_page.s8', "المنتج التام (الناتج)")}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', alignItems: 'end' }}>
          <Field label={t('manufacturing.new_bom_page.s9', "اختر المنتج")}>
            <AsyncSearchableCombobox<Product>
              value={productQuery}
              onChange={setProductQuery}
              defaultOptions={filteredProducts}
              fetchOptions={async (q) => {
                const res = await inventoryApi.searchProducts(q);
                return res.filter(p => p.itemType !== 'raw_material');
              }}
              getLabel={(p) => p.name}
              onCreate={(q) => {
                setQuickModal({ isOpen: true, name: q, itemType: 'product' });
              }}
              onSelect={(p) => {
                setSelectedProduct(p);
                setProductQuery(p.name);
              }}
              createLabel={(q) => `إضافة منتج جديد: "${q}"`}
              placeholder={t('manufacturing.new_bom_page.s10', "ابحث عن منتج أو اكتب اسماً جديداً...")}
            />
          </Field>
          <Field label={t('manufacturing.new_bom_page.s11', "كمية الإنتاج (الافتراضية)")}>
            <input
              type="number"
              min="1"
              className="purchase-prototype-input"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </Field>
          <Field label={t('manufacturing.new_bom_page.s12', "تكلفة التشغيل (الإجمالية للكمية)")}>
            <input
              type="number"
              min="0"
              step="0.01"
              className="purchase-prototype-input"
              value={overheadCost}
              onChange={(e) => setOverheadCost(Number(e.target.value))}
            />
          </Field>
        </div>
      </FormSection>

      <BomLinesTable
        lines={lines}
        components={components}
        onAddLine={addLine}
        onUpdateLine={updateLine}
        onRemoveLine={removeLine}
        onSelectComponent={selectComponent}
        onQuickModalOpen={(name, lineId) => {
          setQuickModal({ isOpen: true, name, itemType: 'raw_material', lineId });
        }}
      />

      <BomCostSummaryCard
        linesCount={lines.length}
        quantity={quantity}
        batchTotalCost={batchTotalCost}
        singleUnitTotalCost={singleUnitTotalCost}
      />

      <QuickProductModal
        isOpen={quickModal.isOpen}
        onClose={() => setQuickModal({ ...quickModal, isOpen: false })}
        initialName={quickModal.name}
        itemType={quickModal.itemType}
        onSuccess={(newProduct) => {
          if (quickModal.itemType === 'product') {
            setProducts(prev => [...prev, newProduct]);
            setSelectedProduct(newProduct);
            setProductQuery(newProduct.name);
          } else if (quickModal.itemType === 'raw_material' && quickModal.lineId) {
            const newComp: ManufacturingComponent = {
              id: newProduct.id,
              name: newProduct.name,
              baseUnit: 'kg',
              costPerBaseUnit: 0,
              stock: 0
            };
            setComponents(prev => [...prev, newComp]);
            selectComponent(quickModal.lineId, newComp);
          }
        }}
      />
    </ManufacturingLayout>
  );
}
