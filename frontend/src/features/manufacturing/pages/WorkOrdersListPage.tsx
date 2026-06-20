import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { Card } from '@/shared/ui/card';
import { Field } from '@/shared/ui/field';
import { http } from '@/lib/http';
import { useAuthStore } from '@/stores/auth-store';
import { ManufacturingLayout } from '@/features/manufacturing/components/ManufacturingLayout';

import { workOrdersApi, type WorkOrderRecord } from '@/features/manufacturing/api/work-orders.api';

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
  
  const [dateFilter, setDateFilter] = useState<'all'|'today'|'week'|'month'>('all');
  const [userFilter, setUserFilter] = useState('all');
  const [users, setUsers] = useState<{id: string, name: string}[]>([]);
  const currentUser = useAuthStore(s => s.user);
  const currentUserName = currentUser?.displayName || currentUser?.username || 'مدير النظام';

  useEffect(() => {
    http<{ users: any[] }>('/api/users')
      .then(res => {
        if (res.users) {
          setUsers(res.users.map(u => ({ id: u.id, name: u.displayName || u.username })));
        }
      })
      .catch(() => {});

    workOrdersApi.list()
      .then(setWorkOrders)
      .catch(e => console.error('Failed to load work orders', e))
      .finally(() => setIsLoading(false));
  }, []);

  const getFilteredOrders = () => {
    return workOrders.filter(wo => {
      // User filter
      if (userFilter !== 'all') {
        let isMatch = false;
        if (wo.created_by_id && String(wo.created_by_id) === String(userFilter)) {
          isMatch = true;
        }
        
        // Fallback: Check by name if ID didn't match (handles mock mismatches or old records)
        if (!isMatch) {
          const selectedUserName = users.find(u => String(u.id) === String(userFilter))?.name;
          if (wo.created_by === selectedUserName) {
            isMatch = true;
          }
        }
        
        if (!isMatch) return false;
      }
      
      // Date filter
      if (dateFilter !== 'all' && wo.start_date) {
        const orderDate = new Date(wo.start_date);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - orderDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (dateFilter === 'today' && diffDays > 1) return false;
        if (dateFilter === 'week' && diffDays > 7) return false;
        if (dateFilter === 'month' && diffDays > 30) return false;
      }
      
      return true;
    }).sort((a, b) => {
      // Sort newest first
      const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
      const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
      return dateB - dateA;
    });
  };

  const filteredOrders = getFilteredOrders();

  const columns: Column<WorkOrderRecord>[] = [
    { key: 'doc_no', header: 'رقم الأمر', cell: (row) => <span style={{ fontWeight: '500', color: '#111827' }}>{row.doc_no || `#${row.id}`}</span> },
    { key: 'product_name', header: 'المنتج التام', cell: (row) => row.product_name },
    { key: 'created_by', header: 'بواسطة', cell: (row) => <span style={{ color: '#6b7280' }}>{row.created_by_id && row.created_by_id === currentUser?.id ? currentUserName : row.created_by}</span> },
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
              workOrdersApi.complete(row.id, {})
                .then(() => {
                  alert('تم إنهاء أمر الإنتاج بنجاح');
                  setWorkOrders(workOrders.map(wo => wo.id === row.id ? { ...wo, status: 'done' } : wo));
                })
                .catch((e: any) => alert(e?.message || 'حدث خطأ أثناء إنهاء الأمر'));
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
        <Card className="document-prototype-section">
          <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ margin: 0, minWidth: '200px' }}>
              <Field label="الفترة الزمنية">
                <select className="purchase-prototype-field-input" value={dateFilter} onChange={e => setDateFilter(e.target.value as any)}>
                  <option value="all">كل الأوقات</option>
                  <option value="today">اليوم</option>
                  <option value="week">هذا الأسبوع</option>
                  <option value="month">هذا الشهر</option>
                </select>
              </Field>
            </div>
            
            <div style={{ margin: 0, minWidth: '200px' }}>
              <Field label="المستخدم (المنفذ)">
                <select className="purchase-prototype-field-input" value={userFilter} onChange={e => setUserFilter(e.target.value)}>
                  <option value="all">كل المستخدمين</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
          <div className="page-stack">
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>جاري التحميل...</div>
          ) : workOrders.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
               لا توجد أوامر إنتاج مطابقة للبحث.
               <br />
               <Button variant="secondary" style={{ marginTop: '16px' }} onClick={() => navigate('/manufacturing/work-orders/new')}>إنشاء أول أمر إنتاج</Button>
            </div>
          ) : (
            <DataTable 
              rows={filteredOrders} 
              columns={columns} 
              rowKey={(r) => r.id}
            />
          )}
          </div>
        </Card>
    </ManufacturingLayout>
  );
}
