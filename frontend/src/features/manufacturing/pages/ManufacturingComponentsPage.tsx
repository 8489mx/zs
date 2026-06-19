import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { Card } from '@/shared/ui/card';
import { Field } from '@/shared/ui/field';
import { componentsApi, type ManufacturingComponent } from '@/features/manufacturing/api/components.api';
import { MANUFACTURING_UNITS } from '@/features/manufacturing/utils/units';
import { ManufacturingLayout } from '@/features/manufacturing/components/ManufacturingLayout';

type Column<T> = { key: string; header: ReactNode; cell: (row: T) => ReactNode; className?: string };

export default function ManufacturingComponentsPage() {
  const navigate = useNavigate();
  const [components, setComponents] = useState<ManufacturingComponent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create mode state
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newBaseUnit, setNewBaseUnit] = useState('kg');
  const [newCost, setNewCost] = useState('');
  const [newStock, setNewStock] = useState('');

  useEffect(() => {
    loadComponents();
  }, []);

  const loadComponents = () => {
    setIsLoading(true);
    componentsApi.list()
      .then(res => setComponents(res))
      .finally(() => setIsLoading(false));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newBaseUnit || !newCost) return;
    
    try {
      await componentsApi.create({
        name: newName,
        code: newCode,
        baseUnit: newBaseUnit,
        costPerBaseUnit: Number(newCost),
        stock: Number(newStock) || 0
      });
      setIsCreating(false);
      setNewName('');
      setNewCode('');
      setNewBaseUnit('kg');
      setNewCost('');
      setNewStock('');
      loadComponents();
    } catch (error) {
      alert('حدث خطأ أثناء إضافة المكون');
    }
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
      <Button variant="danger" onClick={() => handleDelete(row.id)} style={{ padding: '4px 8px', fontSize: '12px' }}>
        حذف
      </Button>
    )}
  ];

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
          onClick={() => setIsCreating(!isCreating)}
        >
          <span>{isCreating ? 'إلغاء' : 'إضافة مكون جديد'}</span>
        </Button>
      }
    >
      <div className="page-stack">
        {isCreating && (
          <Card className="workspace-panel" style={{ padding: '24px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>إضافة مكون جديد</h3>
            <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
              <Field label="اسم المكون *">
                <input required className="purchase-prototype-field-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="مثال: سكر، دقيق..." />
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
              <Field label="المخزون الافتتاحي">
                <input type="number" min="0" step="any" className="purchase-prototype-field-input" value={newStock} onChange={e => setNewStock(e.target.value)} />
              </Field>
              <Button type="submit" variant="primary" style={{ height: '36px' }}>حفظ المكون</Button>
            </form>
          </Card>
        )}

        <Card className="workspace-panel">
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>جاري التحميل...</div>
          ) : components.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
               لا توجد مكونات تصنيع مسجلة بعد.
               <br />
               <Button variant="secondary" style={{ marginTop: '16px' }} onClick={() => setIsCreating(true)}>إضافة أول مكون</Button>
            </div>
          ) : (
            <DataTable 
              rows={components} 
              columns={columns} 
              rowKey={(r) => r.id}
            />
          )}
        </Card>
      </div>
    </ManufacturingLayout>
  );
}
