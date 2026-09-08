import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { CalendarIcon } from '@/shared/components/icons/AppIcons';
import { DataTable } from '@/shared/ui/data-table';
import { Field } from '@/shared/ui/field';
import { http } from '@/lib/http';
import { useAuthStore } from '@/stores/auth-store';
import { ManufacturingLayout } from '@/features/manufacturing/components/ManufacturingLayout';

import { workOrdersApi, type WorkOrderRecord, type WorkOrderOperationInput } from '@/features/manufacturing/api/work-orders.api';
import { workCentersApi, type WorkCenterRecord } from '@/features/manufacturing/api/work-centers.api';

import { systemAlert } from '@/shared/components/system-alert';

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
  const [workCenters, setWorkCenters] = useState<WorkCenterRecord[]>([]);
  const [completingOrder, setCompletingOrder] = useState<WorkOrderRecord | null>(null);
  const [operations, setOperations] = useState<WorkOrderOperationInput[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Unbuild Orders state
  const [isUnbuildModalOpen, setIsUnbuildModalOpen] = useState(false);
  const [unbuildOrders, setUnbuildOrders] = useState<any[]>([]);
  const [boms, setBoms] = useState<any[]>([]);
  const [selectedBomId, setSelectedBomId] = useState<number>(0);
  const [unbuildQty, setUnbuildQty] = useState<number>(1);
  const [unbuildNotes, setUnbuildNotes] = useState<string>('');
  const [isSubmittingUnbuild, setIsSubmittingUnbuild] = useState(false);
  
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

    http<{ boms: any[] }>('/api/manufacturing/boms')
      .then(res => setBoms(res.boms || []))
      .catch(() => {});

    workCentersApi.list()
      .then(setWorkCenters)
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
      if (dateFilter !== 'all' && (wo.start_date || wo.created_at)) {
        const orderDate = new Date((wo.start_date || wo.created_at) as string);
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
      const dateA = (a.start_date || a.created_at) ? new Date((a.start_date || a.created_at) as string).getTime() : 0;
      const dateB = (b.start_date || b.created_at) ? new Date((b.start_date || b.created_at) as string).getTime() : 0;
      return dateB - dateA;
    });
  };

  const filteredOrders = getFilteredOrders();

  const groupedOrders = filteredOrders.reduce((groups, order) => {
    const dateVal = order.start_date || order.created_at;
    const dateStr = dateVal ? new Date(dateVal).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) : 'تاريخ غير محدد';
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(order);
    return groups;
  }, {} as Record<string, WorkOrderRecord[]>);

  const columns: Column<WorkOrderRecord>[] = [
    { key: 'doc_no', header: 'رقم الأمر', cell: (row) => <span style={{ fontWeight: '500', color: '#111827' }}>{row.doc_no || `#${row.id}`}</span> },
    { key: 'product_name', header: 'المنتج التام', cell: (row) => {
      const isAuto = String(row.notes || '').includes('إنتاج تلقائي');
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{row.product_name}</span>
          {isAuto && <span style={{ fontSize: '11px', background: '#f3f4f6', color: '#4b5563', padding: '2px 6px', borderRadius: '4px' }}>آلي</span>}
        </div>
      );
    }},
    { key: 'created_by', header: 'بواسطة', cell: (row) => <span style={{ color: '#6b7280' }}>{row.created_by_id && row.created_by_id === currentUser?.id ? currentUserName : row.created_by}</span> },
    { key: 'quantity_to_produce', header: 'الكمية المطلوبة', cell: (row) => Number(row.quantity_to_produce).toLocaleString('ar-EG', { maximumFractionDigits: 2 }) },
    { key: 'produced_quantity', header: 'الكمية المنتجة', cell: (row) => Number(row.produced_quantity).toLocaleString('ar-EG', { maximumFractionDigits: 2 }) },
    { key: 'total_cost', header: 'التكلفة الإجمالية', cell: (row) => Number(row.total_cost).toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }) },
    { key: 'start_date', header: 'التاريخ', cell: (row) => (row.start_date || row.createdAt) ? new Date((row.start_date || row.createdAt) as string).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-' },
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
            setCompletingOrder(row);
            setOperations([]);
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
                <select className="purchase-prototype-field-input" value={dateFilter} onChange={e => setDateFilter(e.target.value as any)}>
                  <option value="all">كل الأوقات</option>
                  <option value="today">اليوم</option>
                  <option value="week">هذا الأسبوع</option>
                  <option value="month">هذا الشهر</option>
                </select>
              </Field>
            </div>
            
            <div style={{ margin: 0 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.entries(groupedOrders).map(([dateLabel, orders]) => {
                const autoCount = orders.filter(o => String(o.note || '').includes('إنتاج تلقائي')).length;
                const manualCount = orders.length - autoCount;
                return (
                  <details key={dateLabel} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }} open={dateFilter === 'today' || dateLabel === new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}>
                    <summary style={{ padding: '16px', background: '#f9fafb', cursor: 'pointer', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CalendarIcon size={18} color="#475569" />
                        <span>{dateLabel}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '13px', fontWeight: 'normal', color: '#6b7280' }}>
                        <span>إجمالي {orders.length} أمر</span>
                        {autoCount > 0 && <span>({autoCount} آلي)</span>}
                        {manualCount > 0 && <span>({manualCount} يدوي)</span>}
                      </div>
                    </summary>
                    <div style={{ borderTop: '1px solid #e5e7eb' }}>
                      <DataTable 
                        rows={orders} 
                        columns={columns} 
                        rowKey={(r) => String(r.id)}
                      />
                    </div>
                  </details>
                );
              })}
            </div>
          )}
          </div>
        </section>

      {/* Complete Work Order Modal with Machine Routing */}
      {completingOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          dir="rtl"
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                  إنهاء أمر الإنتاج {completingOrder.doc_no || `#${completingOrder.id}`}
                </h3>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  {completingOrder.product_name} — الكمية: {Number(completingOrder.quantity_to_produce).toLocaleString('ar-EG')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompletingOrder(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '14px',
                  marginBottom: '20px',
                  fontSize: '13px',
                  color: '#334155',
                  lineHeight: '1.6',
                }}
              >
                عند تأكيد الإنهاء، سيتم سحب المواد الخام من المخزن، وإيداع المنتج التام في مخزن الإنتاج.
                كما يمكنك اختياريّاً تسجيل خطوط الإنتاج والماكينات (Work Centers) المستهلكة لحساب تكلفة التشغيل بالساعة بدقة معيارية مثل أودو 17.
              </div>

              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>
                  تشغيل الماكينات ومراكز العمل (Work Centers Routing)
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const defaultCenter = workCenters[0];
                    setOperations([
                      ...operations,
                      {
                        workCenterId: defaultCenter ? defaultCenter.id : 0,
                        operationName: 'تشغيل خط الإنتاج',
                        durationHours: 1,
                        notes: '',
                      },
                    ]);
                  }}
                  style={{ fontSize: '12px' }}
                >
                  + إضافة عملية ماكينة
                </Button>
              </div>

              {operations.length === 0 ? (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '8px',
                    color: '#64748b',
                    fontSize: '13px',
                    marginBottom: '16px',
                  }}
                >
                  لم يتم إضافة عمليات ماكينات. سيتم احتساب تكلفة الخامات والتكاليف غير المباشرة فقط.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  {operations.map((op, idx) => {
                    const center = workCenters.find((w) => w.id === op.workCenterId);
                    const hourlyRate = center ? Number(center.cost_per_hour || 0) : 0;
                    const lineCost = (Number(op.durationHours) || 0) * hourlyRate;

                    return (
                      <div
                        key={idx}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '12px',
                          display: 'grid',
                          gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr auto',
                          gap: '10px',
                          alignItems: 'end',
                        }}
                      >
                        <Field label="مركز العمل / الماكينة">
                          <select
                            value={op.workCenterId}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const newOps = [...operations];
                              newOps[idx].workCenterId = val;
                              setOperations(newOps);
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid #d1d5db',
                              fontSize: '13px',
                              backgroundColor: '#fff',
                            }}
                          >
                            <option value={0}>اختر مركز العمل...</option>
                            {workCenters.map((wc) => (
                              <option key={wc.id} value={wc.id}>
                                {wc.name} ({Number(wc.cost_per_hour)} ج.م/س)
                              </option>
                            ))}
                          </select>
                        </Field>

                        <Field label="اسم العملية">
                          <input
                            type="text"
                            value={op.operationName}
                            onChange={(e) => {
                              const newOps = [...operations];
                              newOps[idx].operationName = e.target.value;
                              setOperations(newOps);
                            }}
                            placeholder="مثال: تغليف، تقطيع..."
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid #d1d5db',
                              fontSize: '13px',
                            }}
                          />
                        </Field>

                        <Field label="المدة (ساعة)">
                          <input
                            type="number"
                            min="0.1"
                            step="0.25"
                            value={op.durationHours}
                            onChange={(e) => {
                              const newOps = [...operations];
                              newOps[idx].durationHours = Number(e.target.value);
                              setOperations(newOps);
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid #d1d5db',
                              fontSize: '13px',
                            }}
                          />
                        </Field>

                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                            التكلفة المحسوبة
                          </label>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: '#170e5e', padding: '6px 0' }}>
                            {lineCost.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                          </div>
                        </div>

                        <Button
                          variant="danger"
                          onClick={() => {
                            setOperations(operations.filter((_, i) => i !== idx));
                          }}
                          style={{ padding: '6px', fontSize: '12px' }}
                        >
                          حذف
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {operations.length > 0 && (
                <div
                  style={{
                    background: '#f1f5f9',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    إجمالي تكلفة ساعات تشغيل الماكينات:
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#170e5e' }}>
                    {operations
                      .reduce((sum, op) => {
                        const center = workCenters.find((w) => w.id === op.workCenterId);
                        const rate = center ? Number(center.cost_per_hour || 0) : 0;
                        return sum + (Number(op.durationHours) || 0) * rate;
                      }, 0)
                      .toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                  </span>
                </div>
              )}
            </div>

            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                background: '#ffffff',
              }}
            >
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCompletingOrder(null)}
                disabled={isCompleting}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={isCompleting}
                onClick={async () => {
                  setIsCompleting(true);
                  try {
                    const validOps = operations.filter((op) => op.workCenterId > 0 && op.durationHours > 0);
                    await workOrdersApi.complete(completingOrder.id, {
                      operations: validOps.length > 0 ? validOps : undefined,
                    });
                    systemAlert('تم إنهاء أمر الإنتاج وترحيل التكاليف والمخزون بنجاح');
                    setWorkOrders(
                      workOrders.map((wo) =>
                        wo.id === completingOrder.id ? { ...wo, status: 'done' } : wo
                      )
                    );
                    setCompletingOrder(null);
                  } catch (e: any) {
                    systemAlert(e?.message || 'حدث خطأ أثناء إنهاء أمر الإنتاج');
                  } finally {
                    setIsCompleting(false);
                  }
                }}
                style={{ backgroundColor: '#170e5e', color: '#ffffff', fontWeight: 600 }}
              >
                {isCompleting ? 'جاري الإنهاء والترحيل...' : 'تأكيد الإنهاء والترحيل المخزني'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Unbuild Orders Dialog */}
      {isUnbuildModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '20px',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '850px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              direction: 'rtl',
            }}
          >
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  أوامر التفكيك واسترجاع المواد الخام (Unbuild Orders)
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  تفكيك المنتج التام وإعادة المكونات الخام للمخزن وعكس القيود المحاسبية مثل أودو 18
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUnbuildModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {/* Form to create Unbuild Order */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '20px',
                }}
              >
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                  إنشاء أمر تفكيك جديد
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: '12px', alignItems: 'end' }}>
                  <Field label="المنتج وشجرة المكونات (BOM) *">
                    <select
                      value={selectedBomId}
                      onChange={(e) => setSelectedBomId(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        fontSize: '13px',
                        backgroundColor: '#fff',
                      }}
                    >
                      <option value={0}>اختر شجرة المكونات...</option>
                      {boms.map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.product_name} (معيار: {b.quantity} قطعة)
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="الكمية المراد تفكيكها *">
                    <input
                      type="number"
                      min="1"
                      value={unbuildQty}
                      onChange={(e) => setUnbuildQty(Math.max(1, Number(e.target.value)))}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        fontSize: '13px',
                      }}
                    />
                  </Field>

                  <Field label="ملاحظات / سبب التفكيك">
                    <input
                      type="text"
                      placeholder="مثال: عيب صناعي، استرداد خامات..."
                      value={unbuildNotes}
                      onChange={(e) => setUnbuildNotes(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        fontSize: '13px',
                      }}
                    />
                  </Field>

                  <Button
                    type="button"
                    variant="primary"
                    disabled={isSubmittingUnbuild || !selectedBomId || unbuildQty <= 0}
                    onClick={async () => {
                      const targetBom = boms.find((b: any) => b.id === selectedBomId);
                      if (!targetBom) {
                        systemAlert('يرجى اختيار شجرة المكونات أولاً');
                        return;
                      }
                      setIsSubmittingUnbuild(true);
                      try {
                        const res = await workOrdersApi.createUnbuild({
                          bomId: selectedBomId,
                          productId: Number(targetBom.product_id),
                          quantity: unbuildQty,
                          notes: unbuildNotes.trim() || undefined,
                        });
                        systemAlert(res.message || 'تم تفكيك المنتج بنجاح');
                        setSelectedBomId(0);
                        setUnbuildQty(1);
                        setUnbuildNotes('');
                        const updated = await workOrdersApi.listUnbuild();
                        setUnbuildOrders(updated);
                        // Refresh work orders too
                        const freshOrders = await workOrdersApi.list();
                        setWorkOrders(freshOrders);
                      } catch (err: any) {
                        systemAlert(err?.message || 'فشل تنفيذ أمر التفكيك');
                      } finally {
                        setIsSubmittingUnbuild(false);
                      }
                    }}
                    style={{ backgroundColor: '#170e5e', color: '#fff', fontSize: '13px', height: '34px' }}
                  >
                    {isSubmittingUnbuild ? 'جاري التفكيك...' : 'تفكيك واسترجاع المواد'}
                  </Button>
                </div>
              </div>

              {/* Previous Unbuild Orders List */}
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                سجل أوامر التفكيك السابقة
              </h4>
              {unbuildOrders.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                  لا توجد أوامر تفكيك مسجلة حتى الآن.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#475569' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>رقم الأمر</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>المنتج المفكك</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>الكمية</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>التكلفة المستعادة</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unbuildOrders.map((ub: any) => (
                      <tr key={ub.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#170e5e' }}>{ub.unbuild_number}</td>
                        <td style={{ padding: '8px 12px' }}>{ub.product_name}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 'bold' }}>{ub.quantity}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{Number(ub.total_cost || 0).toLocaleString()} ج.م</td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{ub.created_at ? String(ub.created_at).slice(0, 10) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div
              style={{
                padding: '12px 24px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                background: '#ffffff',
              }}
            >
              <Button type="button" variant="secondary" onClick={() => setIsUnbuildModalOpen(false)}>
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}
    </ManufacturingLayout>
  );
}
