import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { Card } from '@/shared/ui/card';

import { ManufacturingLayout } from '@/features/manufacturing/components/ManufacturingLayout';

type BomRecord = {
  id: string;
  product_name: string;
  quantity: number;
  expected_cost: number;
  is_active: boolean;
  created_at: string;
};

type Column<T> = { key: string; header: ReactNode; cell: (row: T) => ReactNode; className?: string };

export default function BomsListPage() {
  const navigate = useNavigate();
  const [boms, setBoms] = useState<BomRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load BOMs directly from localStorage for prototype
    const existingStr = localStorage.getItem('mock_boms');
    if (existingStr) {
      try {
        setBoms(JSON.parse(existingStr));
      } catch (e) {
        console.error('Failed to parse mock_boms', e);
      }
    }
    setIsLoading(false);
  }, []);

  const columns: Column<BomRecord>[] = [
    { key: 'id', header: 'رقم التركيبة', cell: (row) => <span style={{ fontWeight: '500', color: '#111827' }}>#{row.id}</span> },
    { key: 'product_name', header: 'المنتج التام', cell: (row) => row.product_name },
    { key: 'quantity', header: 'الكمية المنتجة', cell: (row) => Number(row.quantity).toLocaleString('ar-EG', { maximumFractionDigits: 2 }) },
    { key: 'expected_cost', header: 'التكلفة المتوقعة', cell: (row) => Number(row.expected_cost).toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }) },
    { key: 'created_at', header: 'تاريخ الإنشاء', cell: (row) => new Date(row.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }) },
    { key: 'is_active', header: 'الحالة', cell: (row) => row.is_active ? <span style={{ color: '#10b981', fontWeight: '500' }}>نشط</span> : <span style={{ color: '#ef4444', fontWeight: '500' }}>غير نشط</span> },
    { key: 'actions', header: '', cell: (row) => (
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button variant="secondary" onClick={() => navigate(`/manufacturing/boms/${row.id}/edit`)} style={{ padding: '4px 8px', fontSize: '12px' }}>
          تعديل
        </Button>
        <Button variant="danger" onClick={() => handleDelete(row.id)} style={{ padding: '4px 8px', fontSize: '12px' }}>
          حذف
        </Button>
      </div>
    )}
  ];

  const handleDelete = (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه التركيبة؟')) return;
    const existingStr = localStorage.getItem('mock_boms');
    if (existingStr) {
      try {
        const parsed = JSON.parse(existingStr);
        const filtered = parsed.filter((b: any) => b.id !== id);
        localStorage.setItem('mock_boms', JSON.stringify(filtered));
        setBoms(filtered);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <ManufacturingLayout
      breadcrumbs={[
        { label: 'التصنيع', to: '/manufacturing/boms' },
        { label: 'قوائم المكونات' }
      ]}
      title="قوائم المكونات (BOMs)"
      actions={
        <Button 
          type="button" 
          className="purchase-prototype-toolbar-action purchase-prototype-toolbar-action-primary" 
          onClick={() => navigate('/manufacturing/boms/new')}
        >
          <span>إضافة تركيبة جديدة</span>
        </Button>
      }
    >
        <Card className="document-prototype-section">
          <div className="page-stack">
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>جاري التحميل...</div>
          ) : boms.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
               لا توجد تركيبات مسجلة بعد.
               <br />
               <Button variant="secondary" style={{ marginTop: '16px' }} onClick={() => navigate('/manufacturing/boms/new')}>إضافة أول تركيبة</Button>
            </div>
          ) : (
            <DataTable 
              rows={boms} 
              columns={columns} 
              rowKey={(r) => r.id}
            />
          )}
          </div>
        </Card>
    </ManufacturingLayout>
  );
}
