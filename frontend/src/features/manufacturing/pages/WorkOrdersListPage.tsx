import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { http } from '@/lib/http';
import { useAuthStore } from '@/stores/auth-store';
import { ManufacturingLayout } from '@/features/manufacturing/components/ManufacturingLayout';
import { workOrdersApi, type WorkOrderRecord, type WorkOrderOperationInput } from '@/features/manufacturing/api/work-orders.api';
import { workCentersApi, type WorkCenterRecord } from '@/features/manufacturing/api/work-centers.api';
import { WorkOrdersGroupedList } from '../components/work-orders/WorkOrdersGroupedList';
import { CompleteWorkOrderModal } from '../components/work-orders/CompleteWorkOrderModal';
import { UnbuildOrdersModal } from '../components/work-orders/UnbuildOrdersModal';

export default function WorkOrdersListPage() {
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState<WorkOrderRecord[]>([]);
  const [workCenters, setWorkCenters] = useState<WorkCenterRecord[]>([]);
  const [completingOrder, setCompletingOrder] = useState<WorkOrderRecord | null>(null);
  const [operations, setOperations] = useState<WorkOrderOperationInput[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Unbuild Orders state
  const [isUnbuildModalOpen, setIsUnbuildModalOpen] = useState(false);
  const [unbuildOrders, setUnbuildOrders] = useState<any[]>([]);
  const [boms, setBoms] = useState<any[]>([]);

  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [userFilter, setUserFilter] = useState('all');
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const currentUser = useAuthStore((s) => s.user);
  const currentUserName = currentUser?.displayName || currentUser?.username || 'مدير النظام';

  const loadAll = () => {
    http<{ users: any[] }>('/api/users')
      .then((res) => {
        if (res.users) {
          setUsers(res.users.map((u) => ({ id: u.id, name: u.displayName || u.username })));
        }
      })
      .catch(() => {});

    http<{ boms: any[] }>('/api/manufacturing/boms')
      .then((res) => setBoms(res.boms || []))
      .catch(() => {});

    workCentersApi.list().then(setWorkCenters).catch(() => {});

    workOrdersApi
      .list()
      .then(setWorkOrders)
      .catch((e) => console.error('Failed to load work orders', e))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleConfirmCompletion = async () => {
    if (!completingOrder) return;
    setIsCompleting(true);
    try {
      await workOrdersApi.complete(completingOrder.id, {
        operations: operations.length > 0 ? operations : undefined,
      });
      setCompletingOrder(null);
      setOperations([]);
      loadAll();
    } catch (err) {
      console.error('Failed to complete work order', err);
    } finally {
      setIsCompleting(false);
    }
  };

  const getFilteredOrders = () => {
    return workOrders
      .filter((wo) => {
        if (userFilter !== 'all') {
          let isMatch = false;
          if (wo.created_by_id && String(wo.created_by_id) === String(userFilter)) {
            isMatch = true;
          }
          if (!isMatch) {
            const selectedUserName = users.find((u) => String(u.id) === String(userFilter))?.name;
            if (wo.created_by === selectedUserName) {
              isMatch = true;
            }
          }
          if (!isMatch) return false;
        }

        if (dateFilter !== 'all' && (wo.start_date || (wo as any).created_at)) {
          const orderDate = new Date((wo.start_date || (wo as any).created_at) as string);
          const today = new Date();
          const diffTime = Math.abs(today.getTime() - orderDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (dateFilter === 'today' && diffDays > 1) return false;
          if (dateFilter === 'week' && diffDays > 7) return false;
          if (dateFilter === 'month' && diffDays > 30) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = a.start_date || (a as any).created_at ? new Date((a.start_date || (a as any).created_at) as string).getTime() : 0;
        const dateB = b.start_date || (b as any).created_at ? new Date((b.start_date || (b as any).created_at) as string).getTime() : 0;
        return dateB - dateA;
      });
  };

  const filteredOrders = getFilteredOrders();

  const groupedOrders = filteredOrders.reduce((groups, order) => {
    const dateVal = order.start_date || (order as any).created_at;
    const dateStr = dateVal ? new Date(dateVal).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) : 'تاريخ غير محدد';
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(order);
    return groups;
  }, {} as Record<string, WorkOrderRecord[]>);

  return (
    <ManufacturingLayout
      breadcrumbs={[
        { label: 'التصنيع', to: '/manufacturing/work-orders' },
        { label: 'أوامر الإنتاج' },
      ]}
      title="أوامر الإنتاج"
      actions={
        <div className="actions compact-actions" style={{ display: 'flex', gap: '8px' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              workOrdersApi.listUnbuild().then(setUnbuildOrders).catch(() => {});
              setIsUnbuildModalOpen(true);
            }}
          >
            أوامر التفكيك (Unbuild)
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate('/manufacturing/work-orders/new')}
          >
            + أمر إنتاج
          </Button>
        </div>
      }
    >
      <section className="document-prototype-section">
        <div className="section-header-compact-row">
          <h3 className="document-prototype-section-title">أوامر الشغل</h3>
        </div>
        <div className="work-orders-filters-row" style={{ padding: '12px 14px', borderBottom: '1px solid #e5e7eb', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
          <div style={{ margin: 0 }}>
            <Field label="الفترة الزمنية">
              <select className="purchase-prototype-field-input" value={dateFilter} onChange={(e) => setDateFilter(e.target.value as any)}>
                <option value="all">كل الأوقات</option>
                <option value="today">اليوم</option>
                <option value="week">هذا الأسبوع</option>
                <option value="month">هذا الشهر</option>
              </select>
            </Field>
          </div>

          <div style={{ margin: 0 }}>
            <Field label="المستخدم (المنفذ)">
              <select className="purchase-prototype-field-input" value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
                <option value="all">كل المستخدمين</option>
                {users.map((u) => (
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
            <WorkOrdersGroupedList
              groupedOrders={groupedOrders}
              dateFilter={dateFilter}
              currentUser={currentUser}
              currentUserName={currentUserName}
              onCompleteOrder={(order) => {
                setCompletingOrder(order);
                setOperations([]);
              }}
            />
          )}
        </div>
      </section>

      {/* Complete Order Modal */}
      <CompleteWorkOrderModal
        order={completingOrder}
        onClose={() => setCompletingOrder(null)}
        workCenters={workCenters}
        operations={operations}
        onOperationsChange={setOperations}
        onConfirm={handleConfirmCompletion}
        isCompleting={isCompleting}
      />

      {/* Unbuild Modal */}
      <UnbuildOrdersModal
        isOpen={isUnbuildModalOpen}
        onClose={() => setIsUnbuildModalOpen(false)}
        boms={boms}
        unbuildOrders={unbuildOrders}
        onReloadUnbuild={() => workOrdersApi.listUnbuild().then(setUnbuildOrders).catch(() => {})}
      />
    </ManufacturingLayout>
  );
}
