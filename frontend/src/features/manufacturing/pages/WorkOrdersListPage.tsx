import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { Card } from '@/shared/ui/card';
import { http } from '@/lib/http';
import { ManufacturingLayout } from '@/features/manufacturing/components/ManufacturingLayout';

type WorkOrderRecord = {
  id: string;
  doc_no: string;
  bom_id: string;
  product_name: string;
  status: 'draft' | 'in_progress' | 'done' | 'cancelled';
  quantity_to_produce: number;
  produced_quantity: number;
  start_date: string | null;
  end_date: string | null;
  total_cost: number;
};

type Column<T> = { key: string; header: ReactNode; cell: (row: T) => ReactNode; className?: string };

const statusLabels: Record<string, string> = {
  'draft': 'مسودة',
  'in_progress': 'قيد التنفيذ',
  'done': 'مكتمل',
  'cancelled': 'ملغى'
};

const statusColors: Record<string, string> = {
  'draft': '#6b7280',
  'in_progress': '#3b82f6',
  'done': '#10b981',
  'cancelled': '#ef4444'
};

export default function WorkOrdersListPage() {
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState<WorkOrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    http<{ workOrders: WorkOrderRecord[] }>('/api/manufacturing/work-orders')
      .then(res => setWorkOrders(res.workOrders || []))
      .finally(() => setIsLoading(false));
  }, []);

  const columns: Column<WorkOrderRecord>[] = [
    { key: 'doc_no', header: 'رقم الأمر', cell: (row) => <span style={{ fontWeight: '500', color: '#111827' }}>{row.doc_no || `#${row.id}`}</span> },
    { key: 'product_name', header: 'المنتج التام', cell: (row) => row.product_name },
    { key: 'quantity_to_produce', header: 'الكمية المطلوبة', cell: (row) => Number(row.quantity_to_produce).toLocaleString('ar-EG', { maximumFractionDigits: 2 }) },
    { key: 'produced_quantity', header: 'الكمية المنتجة', cell: (row) => Number(row.produced_quantity).toLocaleString('ar-EG', { maximumFractionDigits: 2 }) },
    { key: 'total_cost', header: 'التكلفة الإجمالية', cell: (row) => Number(row.total_cost).toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }) },
    { key: 'start_date', header: 'تاريخ البدء', cell: (row) => row.start_date ? new Date(row.start_date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }) : '-' },
    { key: 'status', header: 'الحالة', cell: (row) => {
      const val = row.status;
      return <span style={{ 
        padding: '4px 8px', 
        borderRadius: '999px', 
        backgroundColor: `${statusColors[val]}15`, 
        color: statusColors[val],
        fontSize: '13px',
        fontWeight: '500'
      }}>{statusLabels[val] || val}</span>;
    }},
    { key: 'actions', header: '', cell: (row) => {
      if (row.status !== 'draft' && row.status !== 'in_progress') return null;
      return (
        <Button 
          variant="secondary" 
          onClick={() => {
            if (confirm('هل أنت متأكد من إنهاء أمر الإنتاج وسحب المواد من المخزن وإضافة المنتج التام؟')) {
              http(`/api/manufacturing/work-orders/${row.id}/complete`, { method: 'PATCH', body: JSON.stringify({}) })
                .then(() => {
                  alert('تم إنهاء أمر الإنتاج بنجاح');
                  setWorkOrders(workOrders.map(wo => wo.id === row.id ? { ...wo, status: 'done' } : wo));
                })
                .catch(() => alert('حدث خطأ أثناء إنهاء الأمر'));
            }
          }}
        >
          إنهاء وتأكيد
        </Button>
      );
    }}
  ];

  return (
    <ManufacturingLayout
      breadcrumbs={[
        { label: 'التصنيع', to: '/manufacturing/work-orders' },
        { label: 'أوامر الإنتاج' }
      ]}
      title="أوامر الإنتاج"
      actions={
        <Button 
          type="button" 
          className="purchase-prototype-toolbar-action purchase-prototype-toolbar-action-primary" 
          onClick={() => navigate('/manufacturing/work-orders/new')}
        >
          <span>إضافة أمر إنتاج</span>
        </Button>
      }
    >
        <Card className="workspace-panel">
          <div className="page-stack">
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>جاري التحميل...</div>
          ) : workOrders.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
               لا توجد أوامر إنتاج مسجلة بعد.
               <br />
               <Button variant="secondary" style={{ marginTop: '16px' }} onClick={() => navigate('/manufacturing/work-orders/new')}>إنشاء أول أمر إنتاج</Button>
            </div>
          ) : (
            <DataTable 
              rows={workOrders} 
              columns={columns} 
              rowKey={(r) => r.id}
            />
          )}
          </div>
        </Card>
    </ManufacturingLayout>
  );
}
