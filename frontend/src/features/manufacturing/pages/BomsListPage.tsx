import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { Card } from '@/shared/ui/card';
import { http } from '@/lib/http';
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
    http<{ boms: BomRecord[] }>('/api/manufacturing/boms')
      .then(res => setBoms(res.boms || []))
      .catch(() => {
        const existingStr = localStorage.getItem('mock_boms');
        if (existingStr) {
          setBoms(JSON.parse(existingStr));
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const columns: Column<BomRecord>[] = [
    { key: 'id', header: 'رقم التركيبة', cell: (row) => <span style={{ fontWeight: '500', color: '#111827' }}>#{row.id}</span> },
    { key: 'product_name', header: 'المنتج التام', cell: (row) => row.product_name },
    { key: 'quantity', header: 'الكمية المنتجة', cell: (row) => Number(row.quantity).toLocaleString('ar-EG', { maximumFractionDigits: 2 }) },
    { key: 'expected_cost', header: 'التكلفة المتوقعة', cell: (row) => Number(row.expected_cost).toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }) },
    { key: 'created_at', header: 'تاريخ الإنشاء', cell: (row) => new Date(row.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }) },
    { key: 'is_active', header: 'الحالة', cell: (row) => row.is_active ? <span style={{ color: '#10b981', fontWeight: '500' }}>نشط</span> : <span style={{ color: '#ef4444', fontWeight: '500' }}>غير نشط</span> }
  ];

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
        <Card className="workspace-panel">
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
