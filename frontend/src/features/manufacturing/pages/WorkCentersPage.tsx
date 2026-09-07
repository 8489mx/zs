import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { Field } from '@/shared/ui/field';
import { ManufacturingLayout } from '@/features/manufacturing/components/ManufacturingLayout';
import { workCentersApi, type WorkCenterRecord, type UpsertWorkCenterPayload } from '@/features/manufacturing/api/work-centers.api';
import { systemAlert } from '@/shared/components/system-alert';
import { PackageIcon, CheckCircleIcon, AlertTriangleIcon, SearchIcon } from '@/shared/components/icons/AppIcons';

type Column<T> = { key: string; header: ReactNode; cell: (row: T) => ReactNode; className?: string };

const statusLabels: Record<string, string> = {
  active: 'نشط',
  maintenance: 'تحت الصيانة',
  inactive: 'معطل',
};

const statusColors: Record<string, string> = {
  active: '#10b981',
  maintenance: '#f59e0b',
  inactive: '#6b7280',
};

export default function WorkCentersPage() {
  const [workCenters, setWorkCenters] = useState<WorkCenterRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'maintenance' | 'inactive'>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCostPerHour, setFormCostPerHour] = useState<number | string>(0);
  const [formCapacity, setFormCapacity] = useState<number | string>(1);
  const [formTimeEfficiency, setFormTimeEfficiency] = useState<number | string>(100);
  const [formStatus, setFormStatus] = useState<'active' | 'maintenance' | 'inactive'>('active');
  const [formNotes, setFormNotes] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await workCentersApi.list();
      setWorkCenters(data);
    } catch (err: any) {
      systemAlert(err?.message || 'تعذر تحميل مراكز العمل');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFormCode(`WC-${Math.floor(100 + Math.random() * 900)}`);
    setFormName('');
    setFormCostPerHour(50);
    setFormCapacity(1);
    setFormTimeEfficiency(100);
    setFormStatus('active');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (wc: WorkCenterRecord) => {
    setEditingId(wc.id);
    setFormCode(wc.code);
    setFormName(wc.name);
    setFormCostPerHour(wc.cost_per_hour);
    setFormCapacity(wc.capacity);
    setFormTimeEfficiency(wc.time_efficiency);
    setFormStatus(wc.status);
    setFormNotes(wc.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim()) {
      systemAlert('يرجى كتابة رمز واسم مركز العمل');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: UpsertWorkCenterPayload = {
        code: formCode.trim(),
        name: formName.trim(),
        costPerHour: Number(formCostPerHour) || 0,
        capacity: Number(formCapacity) || 1,
        timeEfficiency: Number(formTimeEfficiency) || 100,
        status: formStatus,
        notes: formNotes.trim() || undefined,
      };

      if (editingId) {
        await workCentersApi.update(editingId, payload);
        systemAlert('تم تحديث بيانات مركز العمل بنجاح');
      } else {
        await workCentersApi.create(payload);
        systemAlert('تم إنشاء مركز العمل بنجاح');
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      systemAlert(err?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (wc: WorkCenterRecord) => {
    if (!confirm(`هل أنت متأكد من حذف مركز العمل "${wc.name}" (${wc.code})؟`)) {
      return;
    }

    try {
      await workCentersApi.delete(wc.id);
      systemAlert('تم حذف مركز العمل بنجاح');
      loadData();
    } catch (err: any) {
      systemAlert(err?.message || 'تعذر حذف مركز العمل، قد يكون مرتبطاً بأوامر إنتاج سابقة');
    }
  };

  const filteredWorkCenters = useMemo(() => {
    return workCenters.filter((wc) => {
      if (statusFilter !== 'all' && wc.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = wc.code.toLowerCase().includes(q);
        const matchName = wc.name.toLowerCase().includes(q);
        const matchNotes = (wc.notes || '').toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchNotes) return false;
      }
      return true;
    });
  }, [workCenters, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = workCenters.length;
    const active = workCenters.filter((w) => w.status === 'active').length;
    const maintenance = workCenters.filter((w) => w.status === 'maintenance').length;
    const avgCost = total > 0 ? workCenters.reduce((sum, w) => sum + Number(w.cost_per_hour || 0), 0) / total : 0;
    const avgEfficiency = total > 0 ? workCenters.reduce((sum, w) => sum + Number(w.time_efficiency || 100), 0) / total : 100;
    return { total, active, maintenance, avgCost, avgEfficiency };
  }, [workCenters]);

  const columns: Column<WorkCenterRecord>[] = [
    {
      key: 'code',
      header: 'رمز المركز',
      cell: (row) => (
        <span style={{ fontWeight: 600, color: '#170e5e', fontFamily: 'monospace', fontSize: '13px' }}>
          {row.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'اسم مركز العمل / الماكينة',
      cell: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#111827' }}>{row.name}</div>
          {row.notes && <div style={{ fontSize: '12px', color: '#6b7280' }}>{row.notes}</div>}
        </div>
      ),
    },
    {
      key: 'cost_per_hour',
      header: 'تكلفة التشغيل / ساعة',
      cell: (row) => (
        <span style={{ fontWeight: 600, color: '#111827' }}>
          {Number(row.cost_per_hour).toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
        </span>
      ),
    },
    {
      key: 'capacity',
      header: 'الطاقة الإنتاجية',
      cell: (row) => (
        <span style={{ color: '#374151' }}>
          {Number(row.capacity).toLocaleString('ar-EG')} وحدات/ساعة
        </span>
      ),
    },
    {
      key: 'time_efficiency',
      header: 'كفاءة التشغيل',
      cell: (row) => (
        <span style={{ fontWeight: 500, color: Number(row.time_efficiency) >= 90 ? '#10b981' : '#f59e0b' }}>
          {Number(row.time_efficiency).toFixed(0)}%
        </span>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      cell: (row) => (
        <span
          style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: '999px',
            backgroundColor: `${statusColors[row.status] || '#6b7280'}18`,
            color: statusColors[row.status] || '#6b7280',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {statusLabels[row.status] || row.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => openEditModal(row)} style={{ fontSize: '12px', padding: '4px 10px' }}>
            تعديل
          </Button>
          <Button
            variant="danger"
            onClick={() => handleDelete(row)}
            style={{ fontSize: '12px', padding: '4px 8px' }}
          >
            حذف
          </Button>
        </div>
      ),
    },
  ];

  return (
    <ManufacturingLayout
      breadcrumbs={[
        { label: 'التصنيع', to: '/manufacturing/work-orders' },
        { label: 'مراكز العمل والماكينات' },
      ]}
      title="مراكز العمل وخطوط الإنتاج (Work Centers & Routing)"
      actions={
        <Button
          type="button"
          variant="primary"
          onClick={openCreateModal}
          style={{ backgroundColor: '#170e5e', color: '#ffffff', fontWeight: 600 }}
        >
          + مركز عمل جديد
        </Button>
      }
    >
      {/* Enterprise KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ background: '#eef2ff', padding: '8px', borderRadius: '8px', color: '#170e5e' }}>
              <PackageIcon size={20} />
            </div>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>إجمالي خطوط ومراكز العمل</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>{stats.total}</div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ background: '#ecfdf5', padding: '8px', borderRadius: '8px', color: '#10b981' }}>
              <CheckCircleIcon size={20} />
            </div>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>مراكز جاهزة ونشطة</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>{stats.active}</div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ background: '#fffbeb', padding: '8px', borderRadius: '8px', color: '#f59e0b' }}>
              <AlertTriangleIcon size={20} />
            </div>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>تحت الصيانة الدورية</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>{stats.maintenance}</div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>متوسط تكلفة الساعة التشغيلية</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#170e5e' }}>
            {stats.avgCost.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 1 })}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            متوسط كفاءة الأداء: {stats.avgEfficiency.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Main Section */}
      <section
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        {/* Filters */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '260px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder="بحث بالرمز أو اسم مركز العمل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 36px 8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                }}
              />
              <div style={{ position: 'absolute', right: '10px', top: '10px', color: '#9ca3af' }}>
                <SearchIcon size={16} />
              </div>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="all">كل الحالات</option>
              <option value="active">نشط فقط</option>
              <option value="maintenance">تحت الصيانة</option>
              <option value="inactive">معطل</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>جاري تحميل مراكز العمل...</div>
        ) : filteredWorkCenters.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
              لا توجد مراكز عمل مطابقة
            </div>
            <p style={{ fontSize: '13px', margin: 0, marginBottom: '16px' }}>
              يمكنك إضافة مراكز العمل وخطوط الإنتاج والماكينات لحساب تكلفة التشغيل بالساعة بدقة معيارية مثل أودو 17.
            </p>
            <Button
              variant="secondary"
              onClick={openCreateModal}
              style={{ borderColor: '#170e5e', color: '#170e5e' }}
            >
              إضافة أول مركز عمل
            </Button>
          </div>
        ) : (
          <DataTable
            rows={filteredWorkCenters}
            columns={columns}
            rowKey={(row) => String(row.id)}
          />
        )}
      </section>

      {/* Create / Edit Modal */}
      {isModalOpen && (
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
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              animation: 'fadeIn 0.15s ease-out',
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
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                {editingId ? 'تعديل مركز العمل' : 'إضافة مركز عمل / ماكينة جديدة'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
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

            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <Field label="رمز المركز (الكود)">
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="مثال: WC-101"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                    }}
                  />
                </Field>

                <Field label="اسم مركز العمل / الماكينة">
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="مثال: ماكينة تعبئة وتغليف آلي"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                    }}
                  />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <Field label="تكلفة تشغيل الساعة (ج.م/ساعة)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formCostPerHour}
                    onChange={(e) => setFormCostPerHour(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                    }}
                  />
                </Field>

                <Field label="طاقة الإنتاج بالساعة">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    required
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                    }}
                  />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <Field label="كفاءة التشغيل القياسية (%)">
                  <input
                    type="number"
                    min="10"
                    max="100"
                    required
                    value={formTimeEfficiency}
                    onChange={(e) => setFormTimeEfficiency(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                    }}
                  />
                </Field>

                <Field label="الحالة التشغيلية">
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <option value="active">جاهز ونشط</option>
                    <option value="maintenance">تحت الصيانة</option>
                    <option value="inactive">معطل وموقوف</option>
                  </select>
                </Field>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <Field label="ملاحظات أو مواصفات فنية">
                  <textarea
                    rows={3}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="مواصفات الماكينة أو أي تعليمات تشغيل..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                      resize: 'vertical',
                    }}
                  />
                </Field>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  style={{ backgroundColor: '#170e5e', color: '#ffffff', fontWeight: 600 }}
                >
                  {isSubmitting ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة مركز العمل'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ManufacturingLayout>
  );
}
