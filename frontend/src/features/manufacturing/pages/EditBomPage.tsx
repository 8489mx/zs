import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';
import { ManufacturingLayout } from '@/features/manufacturing/components/ManufacturingLayout';
import { productsApi } from '@/features/products';
import { componentsApi, type ManufacturingComponent } from '@/features/manufacturing/api/components.api';
import { MANUFACTURING_UNITS, calculateConvertedCost } from '@/features/manufacturing/utils/units';
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
  query: string;
};

export default function EditBomPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [productQuery, setProductQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [components, setComponents] = useState<ManufacturingComponent[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [lines, setLines] = useState<BomLine[]>([
    { id: Date.now(), componentId: null, componentName: '', quantity: 1, unitName: 'kg', baseUnit: 'kg', baseCost: 0, expectedCost: 0, query: '' }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      productsApi.listAll(),
      componentsApi.list()
    ]).then(([prodRes, compRes]) => {
      setProducts(prodRes.products || []);
      setComponents(compRes);

      if (id) {
        bomsApi.list().then(bomsRes => {
          const bom = bomsRes.find((b: any) => String(b.id) === id);
          if (bom) {
            setSelectedProduct({ id: bom.product_id, name: bom.product_name } as Product);
            setProductQuery(bom.product_name);
            setQuantity(bom.quantity);
            setLines(bom.lines ? bom.lines.map((l: any) => {
              const comp = compRes.find(c => String(c.id) === String(l.componentId));
              return {
                id: Date.now() + Math.random(),
                componentId: l.componentId,
                componentName: comp ? comp.name : '',
                quantity: l.quantity,
                unitName: l.unitName,
                baseUnit: comp ? comp.baseUnit : '',
                baseCost: comp ? comp.costPerBaseUnit : 0,
                expectedCost: l.expectedCost,
                query: comp ? comp.name : ''
              };
            }) : []);
          }
        });
      }
    });
  }, [id]);

  const searchProductFilter = (option: Product, query: string) => {
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
    try {
      await bomsApi.update(id as string, {
        productId: Number(selectedProduct.id),
        quantity: quantity,
        lines: lines.map(l => ({
          componentId: Number(l.componentId),
          quantity: l.quantity,
          unitName: l.unitName,
          expectedCost: l.expectedCost,
        }))
      });
      alert('تم تحديث التركيبة بنجاح');
      navigate('/manufacturing/boms');
    } catch (e: any) {
      console.error(e);
      alert('حدث خطأ أثناء تحديث التركيبة. تأكد من أن الـ Backend يدعم عملية التحديث.');
    } finally {
      setIsSaving(false);
    }
  };

  const addLine = () => {
    setLines([...lines, { id: Date.now(), componentId: null, componentName: '', quantity: 1, unitName: 'kg', baseUnit: 'kg', baseCost: 0, expectedCost: 0, query: '' }]);
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
          if (!updated.unitName) updated.unitName = exactMatch.baseUnit;
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
      const unitName = component.baseUnit; 
      const expectedCost = calculateConvertedCost(baseCost, baseUnit, unitName, 1);
      
      return {
        ...l,
        componentId: component.id,
        componentName: component.name,
        baseUnit,
        baseCost,
        unitName,
        expectedCost,
        query: component.name
      };
    }));
  };

  const removeLine = (id: number) => {
    setLines(prevLines => prevLines.filter(l => l.id !== id));
  };

  const totalCost = lines.reduce((sum, line) => sum + (line.expectedCost * line.quantity), 0);

  return (
    <ManufacturingLayout
      breadcrumbs={[
        { label: 'التصنيع', to: '/manufacturing/boms' },
        { label: 'قوائم المكونات', to: '/manufacturing/boms' },
        { label: 'تعديل تركيبة منتج' }
      ]}
      title="تعديل تركيبة منتج (BOM)"
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
      <div className="purchase-prototype-grid">
        <div className="document-prototype-column">
          <div className="purchase-prototype-card">
            <h2 className="purchase-prototype-card-title">المنتج التام (الناتج)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', alignItems: 'end' }}>
              <Field label="اختر المنتج">
                <SearchableCombobox<Product>
                  value={productQuery}
                  onChange={setProductQuery}
                  options={products}
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
            </div>
          </div>

          <div className="purchase-prototype-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="purchase-prototype-card-title" style={{ margin: 0 }}>المكونات (المواد الخام)</h2>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 8px', color: '#6b7280', fontWeight: '500' }}>المكون</th>
                    <th style={{ padding: '12px 8px', color: '#6b7280', fontWeight: '500', width: '120px' }}>الكمية</th>
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
                        {((line.expectedCost || 0) * (line.quantity || 0)).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م
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
          </div>
        </div>

        <div className="document-prototype-column">
          <div className="purchase-prototype-card">
            <h2 className="purchase-prototype-card-title">ملخص التكلفة</h2>
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
                <span>إجمالي التكلفة</span>
                <span>{totalCost.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', color: '#059669', fontWeight: '500' }}>
                <span>تكلفة الوحدة الواحدة المنتجة</span>
                <span>{(totalCost / (quantity || 1)).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ManufacturingLayout>
  );
}
