import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';
import { FormSection } from '@/shared/components/form-section';
import { ManufacturingLayout } from '@/features/manufacturing/components/ManufacturingLayout';
import { productsApi } from '@/features/products';
import { componentsApi, type ManufacturingComponent } from '@/features/manufacturing/api/components.api';
import { MANUFACTURING_UNITS, calculateConvertedCost, findUnit } from '@/features/manufacturing/utils/units';
import { bomsApi } from '@/features/manufacturing/api/boms.api';
import type { Product } from '@/types/domain';

type BomLine = {
  id: number;
  componentId: string | null;
  componentName: string;
  quantity: number;
  unitName: string; // The selected unit
  baseUnit: string; // The component's base unit
  baseCost: number; // The component's base cost
  expectedCost: number; // Calculated cost per 1 selected unit
  wastePercentage: number;
  query: string;
};

export default function NewBomPage() {
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

  useEffect(() => {
    productsApi.listAll().then(res => setProducts(res.products || []));
    componentsApi.list().then(res => setComponents(res));
  }, []);

  const searchProductFilter = (option: Product, query: string) => {
    if (option.itemType === 'raw_material') return false;
    return option.name.toLowerCase().includes(query.toLowerCase());
  };

  const searchComponentFilter = (option: ManufacturingComponent, query: string) => {
    return option.name.toLowerCase().includes(query.toLowerCase());
  };

  const handleSave = async () => {
    if (!selectedProduct) return alert('الرجاء اختيار المنتج التام');
    if (lines.some(l => !l.componentId)) return alert('الرجاء اختيار مكونات التصنيع لجميع الأسطر');

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
      alert('تم حفظ التركيبة بنجاح');
      navigate('/manufacturing/boms');
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء حفظ التركيبة');
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
      
      // If user typed a query, let's see if it exactly matches a component
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
          // They modified the text so it no longer matches, clear the component
          updated.componentId = null;
          updated.baseCost = 0;
          updated.expectedCost = 0;
        }
      }

      // Auto-calculate expected cost per selected unit if unit or component changes
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
      // Default selected unit to the component's base unit ID
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
        { label: 'التصنيع', to: '/manufacturing/boms' },
        { label: 'قوائم المكونات', to: '/manufacturing/boms' },
        { label: 'تركيبة منتج جديدة' }
      ]}
      title="إنشاء تركيبة منتج (BOM)"
      statusBadge={<span className="document-prototype-status-badge is-draft">مسودة</span>}
      actions={
        <>
          <Button 
            variant="secondary" 
            type="button" 
            className="purchase-prototype-toolbar-action purchase-prototype-toolbar-action-secondary" 
            style={{ color: 'var(--danger-color)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            onClick={() => navigate('/manufacturing/boms')}
          >
            إلغاء
          </Button>
          <Button 
            variant="primary" 
            type="button" 
            className="purchase-prototype-toolbar-action purchase-prototype-toolbar-action-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'جاري الحفظ...' : 'حفظ التركيبة'}
          </Button>
        </>
      }
    >
        <FormSection title="المنتج التام (الناتج)">
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', alignItems: 'end' }}>
              <Field label="اختر المنتج">
                <SearchableCombobox<Product>
                  value={productQuery}
                  onChange={setProductQuery}
                  options={filteredProducts}
                  getLabel={(p) => p.name}
                  search={searchProductFilter}
                  onSelect={(p) => {
                    setSelectedProduct(p);
                    setProductQuery(p.name);
                  }}
                  createLabel={(q) => `إضافة منتج "${q}"`}
                  placeholder="ابحث عن منتج..."
                />
              </Field>
              <Field label="كمية الإنتاج (الافتراضية)">
                <input
                  type="number"
                  min="1"
                  className="purchase-prototype-input"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </Field>
              <Field label="تكلفة التشغيل (الإجمالية للكمية)">
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

        <FormSection title="المكونات (المواد الخام)">
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 8px', color: '#6b7280', fontWeight: '500' }}>المكون</th>
                    <th style={{ padding: '12px 8px', color: '#6b7280', fontWeight: '500', width: '120px' }}>الكمية</th>
                    <th style={{ padding: '12px 8px', color: '#6b7280', fontWeight: '500', width: '120px' }}>نسبة الهالك (%)</th>
                    <th style={{ padding: '12px 8px', color: '#6b7280', fontWeight: '500', width: '150px' }}>الوحدة</th>
                    <th style={{ padding: '12px 8px', color: '#6b7280', fontWeight: '500', width: '150px' }}>التكلفة (للوحدة)</th>
                    <th style={{ padding: '12px 8px', color: '#6b7280', fontWeight: '500', width: '150px' }}>الإجمالي</th>
                    <th style={{ padding: '12px 8px', width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px' }}>
                        <SearchableCombobox<ManufacturingComponent>
                          value={line.query}
                          onChange={(q) => updateLine(line.id, 'query', q)}
                          options={components}
                          getLabel={(c) => c.name}
                          createLabel={(q) => `إضافة "${q}"`}
                          search={searchComponentFilter}
                          onSelect={(comp) => selectComponent(line.id, comp)}
                          placeholder="ابحث عن مكون..."
                          className="purchase-prototype-inline-combobox"
                          inputClassName="purchase-prototype-field-input purchase-prototype-combobox-input purchase-prototype-combobox-input-inline"
                        />
                        {line.query && !line.componentId && (
                          <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                            هذا المكون غير مسجل بالأسعار!
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="number"
                          className="purchase-prototype-input"
                          min="0"
                          step="any"
                          value={line.quantity || ''}
                          onChange={(e) => updateLine(line.id, 'quantity', Number(e.target.value))}
                          style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="number"
                          className="purchase-prototype-input"
                          min="0"
                          max="99"
                          step="any"
                          value={line.wastePercentage || ''}
                          onChange={(e) => updateLine(line.id, 'wastePercentage', Number(e.target.value))}
                          style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                          placeholder="%"
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <select
                          className="purchase-prototype-input"
                          value={line.unitName}
                          onChange={(e) => updateLine(line.id, 'unitName', e.target.value)}
                          style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                        >
                          {MANUFACTURING_UNITS.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="number"
                          className="purchase-prototype-input"
                          min="0"
                          step="any"
                          value={line.expectedCost ?? ''}
                          onChange={(e) => updateLine(line.id, 'expectedCost', Number(e.target.value))}
                          style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#f9fafb' }}
                          readOnly
                          title="يتم حسابه تلقائياً بناءً على سعر الوحدة الأساسية"
                        />
                      </td>
                      <td style={{ padding: '8px', fontWeight: '500' }}>
                        {((line.expectedCost || 0) * (line.quantity || 0) * (1 / (1 - ((line.wastePercentage || 0) / 100)))).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <Button 
                          variant="secondary" 
                          onClick={() => removeLine(line.id)}
                          style={{ color: '#ef4444', padding: '6px' }}
                          title="حذف السطر"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                          </svg>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {lines.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
                لم يتم إضافة أي مكونات. اضغط على "إضافة مكون" للبدء.
              </div>
            )}
            <div style={{ marginTop: '16px' }}>
              <Button type="button" variant="secondary" onClick={addLine}>
                + إضافة مكون
              </Button>
            </div>
        </FormSection>

        <FormSection title="ملخص التكلفة">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                <span>عدد المكونات</span>
                <span>{lines.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                <span>كمية الإنتاج</span>
                <span>{quantity}</span>
              </div>
              <div style={{ height: '1px', backgroundColor: '#e5e7eb' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 'bold', color: '#111827' }}>
                <span>إجمالي التكلفة للكمية ({quantity})</span>
                <span>{batchTotalCost.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', color: '#059669', fontWeight: '500' }}>
                <span>تكلفة الوحدة الواحدة المنتجة</span>
                <span>{singleUnitTotalCost.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م</span>
              </div>
            </div>
        </FormSection>
    </ManufacturingLayout>
  );
}
