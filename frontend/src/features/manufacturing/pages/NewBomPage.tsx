import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';
import { productsApi } from '@/features/products/api/products.api';
import { http } from '@/lib/http';
import type { Product } from '@/types/domain';

type BomLine = {
  id: number;
  productId: string | null;
  productName: string;
  quantity: number;
  unitName: string;
  unitMultiplier: number;
  expectedCost: number;
  query: string;
};

export default function NewBomPage() {
  const navigate = useNavigate();
  const [productQuery, setProductQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [lines, setLines] = useState<BomLine[]>([
    { id: Date.now(), productId: null, productName: '', quantity: 1, unitName: 'قطعة', unitMultiplier: 1, expectedCost: 0, query: '' }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    productsApi.listAll().then(res => setProducts(res.products || []));
  }, []);

  const searchProductFilter = (option: Product, query: string) => {
    return option.name.toLowerCase().includes(query.toLowerCase());
  };

  const handleSave = async () => {
    if (!selectedProduct) return alert('الرجاء اختيار المنتج التام');
    if (lines.some(l => !l.productId)) return alert('الرجاء اختيار مكونات التصنيع');

    setIsSaving(true);
    try {
      await http('/api/manufacturing/boms', {
        method: 'POST',
        body: JSON.stringify({
          productId: Number(selectedProduct.id),
          quantity: quantity,
          lines: lines.map(l => ({
            componentProductId: Number(l.productId),
            quantity: l.quantity,
            unitName: l.unitName,
            unitMultiplier: l.unitMultiplier,
            expectedCost: l.expectedCost,
          }))
        })
      });
      alert('تم حفظ التركيبة بنجاح');
      navigate('/products');
    } catch {
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  const addLine = () => {
    setLines([...lines, { id: Date.now(), productId: null, productName: '', quantity: 1, unitName: 'قطعة', unitMultiplier: 1, expectedCost: 0, query: '' }]);
  };

  const updateLine = (id: number, key: keyof BomLine, value: any) => {
    setLines(lines.map(l => l.id === id ? { ...l, [key]: value } : l));
  };

  const removeLine = (id: number) => {
    setLines(lines.filter(l => l.id !== id));
  };

  const totalCost = lines.reduce((sum, line) => sum + (line.expectedCost * line.quantity), 0);

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
          >
            <span aria-hidden="true" className="purchase-prototype-save-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
            </span>
            <span>إلغاء المسودة</span>
          </Button>
          <Button 
            variant="secondary" 
            type="button" 
            className={`purchase-prototype-toolbar-action purchase-prototype-toolbar-action-secondary`} 
          >
              <span aria-hidden="true" className="purchase-prototype-save-icon">
                <svg viewBox="0 0 24 24" role="img" focusable="false" aria-hidden="true">
                  <path d="M5 3.75h10.4L19 7.35V20.25H5V3.75Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M7.2 3.75v5.1h6.8v-5.1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M8 20.25v-5.4h8v5.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </span>
              <span>حفظ كمسودة</span>
          </Button>
          <Button 
            type="button" 
            className="purchase-prototype-toolbar-action purchase-prototype-toolbar-action-primary" 
            onClick={handleSave} 
            disabled={isSaving}
          >
            <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التركيبة'}</span>
          </Button>
        </>
      }
      onBack={() => navigate('/manufacturing/boms')}
      onSearchChange={() => {}}
    >
        <section className="document-prototype-section" style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <h3 className="document-prototype-section-title" style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#111827' }}>المنتج التام</h3>
          <div className="document-prototype-grid compact-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <SearchableCombobox
              label="المنتج (الصنف النهائي)"
              placeholder="ابحث عن المنتج..."
              value={productQuery}
              onChange={setProductQuery}
              options={products}
              search={searchProductFilter}
              getLabel={(p) => p.name}
              onSelect={(p) => {
                setSelectedProduct(p);
                setProductQuery(p.name);
              }}
              createLabel={(q) => `إضافة ${q}`}
            />
            <Field
              label="كمية الإنتاج الافتراضية"
            >
              <input 
                type="number"
                min="0.001"
                step="any"
                className="purchase-prototype-input"
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </Field>
          </div>
        </section>

        <section className="document-prototype-section" style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="document-prototype-section-title" style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', margin: 0 }}>مكونات التصنيع (المواد الخام)</h3>
           </div>
           
           <div className="document-items-table-wrapper" style={{ overflowX: 'auto' }}>
              <table className="document-items-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 8px', color: '#6b7280', fontSize: '14px' }}>المكون (الخامة)</th>
                    <th style={{ padding: '12px 8px', color: '#6b7280', fontSize: '14px', width: '150px' }}>الكمية المطلوبة</th>
                    <th style={{ padding: '12px 8px', color: '#6b7280', fontSize: '14px', width: '150px' }}>الوحدة</th>
                    <th style={{ padding: '12px 8px', color: '#6b7280', fontSize: '14px', width: '150px' }}>التكلفة المتوقعة للوحدة</th>
                    <th style={{ padding: '12px 8px', color: '#6b7280', fontSize: '14px', width: '150px' }}>الإجمالي</th>
                    <th style={{ padding: '12px 8px', width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '8px' }}>
                        <SearchableCombobox
                          placeholder="ابحث عن خامة..."
                          value={line.query}
                          onChange={(val) => updateLine(line.id, 'query', val)}
                          options={products}
                          search={searchProductFilter}
                          getLabel={(p) => p.name}
                          onSelect={(p) => {
                            updateLine(line.id, 'productId', p.id);
                            updateLine(line.id, 'productName', p.name);
                            updateLine(line.id, 'query', p.name);
                            updateLine(line.id, 'expectedCost', p.costPrice || 0);
                          }}
                          createLabel={(q) => `إضافة ${q}`}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="number"
                          className="purchase-prototype-input"
                          min="0.001"
                          step="any"
                          value={line.quantity || ''}
                          onChange={(e) => updateLine(line.id, 'quantity', Number(e.target.value))}
                          style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="text"
                          className="purchase-prototype-input"
                          value={line.unitName}
                          onChange={(e) => updateLine(line.id, 'unitName', e.target.value)}
                          style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="number"
                          className="purchase-prototype-input"
                          min="0"
                          step="any"
                          value={line.expectedCost || ''}
                          onChange={(e) => updateLine(line.id, 'expectedCost', Number(e.target.value))}
                          style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                        />
                      </td>
                      <td style={{ padding: '8px', verticalAlign: 'middle', fontWeight: '500' }}>
                        {(line.quantity * line.expectedCost).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px', verticalAlign: 'middle', textAlign: 'center' }}>
                         <button type="button" onClick={() => removeLine(line.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '16px 8px' }}>
                <Button type="button" variant="secondary" onClick={addLine}>
                   + إضافة مكون
                </Button>
              </div>
           </div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <div style={{ width: '300px', backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '16px' }}>
               <span style={{ color: '#6b7280' }}>إجمالي التكلفة المتوقعة</span>
               <span style={{ fontWeight: 'bold' }}>{totalCost.toFixed(2)} ج.م</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
               <span style={{ color: '#6b7280' }}>تكلفة الوحدة الواحدة</span>
               <span style={{ fontWeight: 'bold' }}>{(totalCost / (quantity || 1)).toFixed(2)} ج.م</span>
             </div>
          </div>
        </div>
    </ManufacturingLayout>
  );
}
