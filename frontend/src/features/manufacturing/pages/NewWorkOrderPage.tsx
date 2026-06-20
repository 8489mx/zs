import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';

import { http } from '@/lib/http';

type BomOption = {
  id: string;
  name: string;
  productName: string;
  expectedCost: number;
};

type LocationOption = {
  id: string;
  name: string;
};

import { ManufacturingLayout } from '@/features/manufacturing/components/ManufacturingLayout';

export default function NewWorkOrderPage() {
  const navigate = useNavigate();
  const [boms, setBoms] = useState<BomOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  
  const [bomQuery, setBomQuery] = useState('');
  const [selectedBom, setSelectedBom] = useState<BomOption | null>(null);
  
  const [quantity, setQuantity] = useState(1);
  
  const [sourceQuery, setSourceQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<LocationOption | null>(null);
  
  const [destQuery, setDestQuery] = useState('');
  const [selectedDest, setSelectedDest] = useState<LocationOption | null>(null);

  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    http<{ boms: any[] }>('/api/manufacturing/boms')
    .then(data => {
      if (data.boms) {
        setBoms(data.boms.map((b: any) => ({
          id: String(b.id),
          name: `وصفة: ${b.product_name} - ${b.quantity} قطعة`,
          productName: b.product_name,
          expectedCost: b.expected_cost
        })));
      }
    })
    .catch(() => {
      const existingStr = localStorage.getItem('mock_boms');
      if (existingStr) {
        const parsed = JSON.parse(existingStr);
        setBoms(parsed.map((b: any) => ({
          id: String(b.id),
          name: `وصفة: ${b.product_name} - ${b.quantity} قطعة`,
          productName: b.product_name,
          expectedCost: b.expected_cost
        })));
      }
    });

    http<{ locations: any[] }>('/api/locations')
    .then(data => {
      if (data.locations) {
        setLocations(data.locations.map((l: any) => ({
          id: String(l.id),
          name: l.name
        })));
      }
    });
  }, []);

  const handleSave = async () => {
    if (!selectedBom) return alert('الرجاء اختيار التركيبة');
    if (!selectedSource || !selectedDest) return alert('الرجاء تحديد المخازن');

    setIsSaving(true);
    try {
      await http('/api/manufacturing/work-orders', {
        method: 'POST',
        body: JSON.stringify({
          bomId: Number(selectedBom.id),
          quantityToProduce: quantity,
          sourceLocationId: Number(selectedSource.id),
          destinationLocationId: Number(selectedDest.id),
          note
        })
      });
      alert('تم إنشاء أمر الإنتاج بنجاح');
      navigate('/products');
    } catch {
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ManufacturingLayout
      breadcrumbs={[
        { label: 'التصنيع', to: '/manufacturing/work-orders' },
        { label: 'أوامر الإنتاج', to: '/manufacturing/work-orders' },
        { label: 'أمر إنتاج جديد' }
      ]}
      title="أمر إنتاج جديد"
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
            <span>{isSaving ? 'جاري الحفظ...' : 'تأكيد أمر الإنتاج'}</span>
          </Button>
        </>
      }
      onBack={() => navigate('/manufacturing/work-orders')}
      onSearchChange={() => {}}
    >
        <section className="document-prototype-section" style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <h3 className="document-prototype-section-title" style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#111827' }}>التفاصيل الأساسية</h3>
          <div className="document-prototype-grid compact-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <SearchableCombobox
              label="التركيبة (BOM)"
              placeholder="اختر التركيبة..."
              value={bomQuery}
              onChange={setBomQuery}
              options={boms}
              search={(opt, q) => opt.name.toLowerCase().includes(q.toLowerCase())}
              getLabel={(o) => o.name}
              onSelect={(o) => { setSelectedBom(o); setBomQuery(o.name); }}
              createLabel={(q) => `إضافة ${q}`}
            />
            <Field label="الكمية المراد إنتاجها">
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

        <section className="document-prototype-section" style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <h3 className="document-prototype-section-title" style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#111827' }}>توجيهات المخازن</h3>
          <div className="document-prototype-grid compact-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '16px' }}>
            <SearchableCombobox
              label="مخزن السحب (المواد الخام)"
              placeholder="اختر المخزن..."
              value={sourceQuery}
              onChange={setSourceQuery}
              options={locations}
              search={(opt, q) => opt.name.toLowerCase().includes(q.toLowerCase())}
              getLabel={(o) => o.name}
              onSelect={(o) => { setSelectedSource(o); setSourceQuery(o.name); }}
              createLabel={(q) => `إضافة ${q}`}
            />
            <SearchableCombobox
              label="مخزن الإضافة (المنتج التام)"
              placeholder="اختر المخزن..."
              value={destQuery}
              onChange={setDestQuery}
              options={locations}
              search={(opt, q) => opt.name.toLowerCase().includes(q.toLowerCase())}
              getLabel={(o) => o.name}
              onSelect={(o) => { setSelectedDest(o); setDestQuery(o.name); }}
              createLabel={(q) => `إضافة ${q}`}
            />
          </div>
        </section>

        <section className="document-prototype-section" style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 className="document-prototype-section-title" style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#111827' }}>ملاحظات</h3>
          <textarea
            className="purchase-prototype-input"
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="اكتب ملاحظات حول أمر الإنتاج..."
            style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '4px', resize: 'vertical' }}
          />
        </section>
    </ManufacturingLayout>
  );
}
