import { useState, useEffect, type ReactNode } from 'react';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { FormSection } from '@/shared/components/form-section';
import { Field } from '@/shared/ui/field';
import { componentsApi, type ManufacturingComponent } from '@/features/manufacturing/api/components.api';
import { MANUFACTURING_UNITS } from '@/features/manufacturing/utils/units';
import { ManufacturingLayout } from '@/features/manufacturing/components/ManufacturingLayout';

type Column<T> = { key: string; header: ReactNode; cell: (row: T) => ReactNode; className?: string };

export default function ManufacturingComponentsPage() {
  const [components, setComponents] = useState<ManufacturingComponent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create/Edit mode state
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingComponent, setEditingComponent] = useState<ManufacturingComponent | null>(null);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newBaseUnit, setNewBaseUnit] = useState('kg');
  const [newCost, setNewCost] = useState('');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadComponents();
  }, []);

  const loadComponents = () => {
    setIsLoading(true);
    componentsApi.list()
      .then(res => setComponents(res))
      .finally(() => setIsLoading(false));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newBaseUnit || !newCost) return;
    
    // Duplicate check for new components
    if (!editingComponent) {
      const isDuplicate = components.some(c => c.name.trim().toLowerCase() === newName.trim().toLowerCase());
      if (isDuplicate) {
        return alert(`المكون "${newName}" مسجل مسبقاً! يرجى اختيار اسم آخر أو تعديل المكون الحالي.`);
      }
    }
    
    try {
      if (editingComponent) {
        await componentsApi.update(editingComponent.id, {
          name: newName,
          code: newCode,
          baseUnit: newBaseUnit,
          costPerBaseUnit: Number(newCost)
        });
      } else {
        await componentsApi.create({
          name: newName,
          code: newCode,
          baseUnit: newBaseUnit,
          costPerBaseUnit: Number(newCost),
          stock: 0
        });
      }
      setIsFormVisible(false);
      setEditingComponent(null);
      setNewName('');
      setNewCode('');
      setNewBaseUnit('kg');
      setNewCost('');
      loadComponents();
    } catch (error) {
      alert('حدث خطأ أثناء الحفظ');
    }
  };

  const startEdit = (comp: ManufacturingComponent) => {
    setEditingComponent(comp);
    setNewName(comp.name);
    setNewCode(comp.code || '');
    setNewBaseUnit(comp.baseUnit);
    setNewCost(String(comp.costPerBaseUnit));
    setIsFormVisible(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المكون؟')) return;
    try {
      await componentsApi.delete(id);
      loadComponents();
    } catch (error) {
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const columns: Column<ManufacturingComponent>[] = [
    { key: 'code', header: 'الكود', cell: (row) => row.code || '-' },
    { key: 'name', header: 'اسم المكون', cell: (row) => <strong style={{ color: '#111827' }}>{row.name}</strong> },
    { key: 'baseUnit', header: 'الوحدة الأساسية', cell: (row) => {
      const u = MANUFACTURING_UNITS.find(u => u.id === row.baseUnit || u.name === row.baseUnit);
      return u ? u.name : row.baseUnit;
    }},
    { key: 'cost', header: 'التكلفة للوحدة', cell: (row) => `${Number(row.costPerBaseUnit).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} جنيه` },
    { key: 'stock', header: 'المخزون الحالي', cell: (row) => Number(row.stock).toLocaleString('ar-EG', { maximumFractionDigits: 2 }) },
    { key: 'actions', header: '', cell: (row) => (
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button variant="secondary" onClick={() => startEdit(row)} style={{ padding: '4px 8px', fontSize: '12px' }}>
          تعديل
        </Button>
        <Button variant="danger" onClick={() => handleDelete(row.id)} style={{ padding: '4px 8px', fontSize: '12px' }}>
          حذف
        </Button>
      </div>
    )}
  ];

  const filteredComponents = components.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.code && c.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <ManufacturingLayout
      breadcrumbs={[
        { label: 'التصنيع', to: '/manufacturing/work-orders' },
        { label: 'مكونات التصنيع' }
      ]}
      title="مكونات التصنيع (المواد الخام)"
      actions={
        <Button 
          type="button" 
          className="purchase-prototype-toolbar-action purchase-prototype-toolbar-action-primary" 
          onClick={() => {
            setEditingComponent(null);
            setNewName('');
            setNewCode('');
            setNewBaseUnit('kg');
            setNewCost('');
            setIsFormVisible(!isFormVisible);
          }}
        >
          <span>{isFormVisible ? 'إلغاء' : 'إضافة مكون جديد'}</span>
        </Button>
      }
    >
      <div className="page-stack">
        {isFormVisible && (
          <div className="document-prototype-section card" style={{ padding: '24px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>
              {editingComponent ? 'تعديل مكون: ' + editingComponent.name : 'إضافة مكون جديد'}
            </h3>
            <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
              <Field label="اسم المكون *">
                <input list="components-list" required className="purchase-prototype-field-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="مثال: سكر، دقيق..." />
                <datalist id="components-list">
                  {components.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </Field>
              <Field label="الكود">
                <input className="purchase-prototype-field-input" value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="اختياري" />
              </Field>
              <Field label="الوحدة الأساسية للتسعير *">
                <select required className="purchase-prototype-field-input" value={newBaseUnit} onChange={e => setNewBaseUnit(e.target.value)}>
                  {MANUFACTURING_UNITS.filter(u => u.isBase || u.category === 'weight' || u.category === 'volume').map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="التكلفة للوحدة الأساسية (جنيه) *">
                <input required type="number" min="0" step="any" className="purchase-prototype-field-input" value={newCost} onChange={e => setNewCost(e.target.value)} />
              </Field>
              <Button type="submit" variant="primary" style={{ height: '36px' }}>
                {editingComponent ? 'تحديث المكون' : 'حفظ المكون'}
              </Button>
            </form>
          </div>
        )}

        <FormSection title="قائمة المكونات" className="document-prototype-section">
          <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
            <input 
              type="search" 
              placeholder="بحث في المكونات (بالاسم أو الكود)..." 
              className="purchase-prototype-field-input"
              style={{ width: '100%', maxWidth: '400px' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>جاري التحميل...</div>
          ) : filteredComponents.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
               لا توجد مكونات تطابق بحثك.
               <br />
               <Button variant="secondary" style={{ marginTop: '16px' }} onClick={() => setIsFormVisible(true)}>إضافة مكون جديد</Button>
            </div>
          ) : (
            <DataTable 
              rows={filteredComponents} 
              columns={columns} 
              rowKey={(r) => r.id}
            />
          )}
        </FormSection>
      </div>
    </ManufacturingLayout>
  );
}
