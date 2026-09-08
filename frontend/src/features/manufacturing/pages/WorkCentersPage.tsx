import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { ManufacturingLayout } from '@/features/manufacturing/components/ManufacturingLayout';
import { workCentersApi, type WorkCenterRecord, type UpsertWorkCenterPayload } from '@/features/manufacturing/api/work-centers.api';
import { systemAlert } from '@/shared/components/system-alert';
import { SearchIcon, PlusIcon } from '@/shared/components/icons/AppIcons';
import { WorkCenterModal } from '../components/work-centers/WorkCenterModal';
import { WorkCentersStats } from '../components/work-centers/WorkCentersStats';

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
      } else {
        await workCentersApi.create(payload);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      systemAlert(err?.message || 'تعذر حفظ مركز العمل');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف مركز العمل هذا؟')) return;
    try {
      await workCentersApi.delete(id);
      loadData();
    } catch (err: any) {
      systemAlert(err?.message || 'تعذر حذف مركز العمل');
    }
  };

  const filteredWorkCenters = useMemo(() => {
    return workCenters.filter((wc) => {
      const matchesSearch =
        wc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wc.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || wc.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [workCenters, searchQuery, statusFilter]);

  const columns: Column<WorkCenterRecord>[] = [
    {
      key: 'code',
      header: 'الكود',
      cell: (row) => <span style={{ fontWeight: 700, color: '#170e5e', fontFamily: 'monospace' }}>{row.code}</span>,
    },
    {
      key: 'name',
      header: 'اسم مركز العمل / الماكينة',
      cell: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.name}</div>
          {row.notes && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{row.notes}</div>}
        </div>
      ),
    },
    {
      key: 'cost',
      header: 'تكلفة الساعة',
      cell: (row) => (
        <span style={{ fontWeight: 600, color: '#0f172a' }}>
          {Number(row.cost_per_hour).toLocaleString('ar-EG')} ج.م
        </span>
      ),
    },
    {
      key: 'capacity',
      header: 'الطاقة بالساعة',
      cell: (row) => <span>{row.capacity} وحدة</span>,
    },
    {
      key: 'efficiency',
      header: 'كفاءة التشغيل',
      cell: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '48px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, Number(row.time_efficiency) || 0)}%`, height: '100%', background: '#10b981' }} />
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600 }}>{row.time_efficiency}%</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      cell: (row) => (
        <span
          style={{
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700,
            background: `${statusColors[row.status] || '#64748b'}15`,
            color: statusColors[row.status] || '#64748b',
          }}
        >
          {statusLabels[row.status] || row.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'الإجراءات',
      cell: (row) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <Button variant="secondary" onClick={() => openEditModal(row)} style={{ padding: '4px 8px', fontSize: '12px' }}>
            تعديل
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleDelete(row.id)}
            style={{ padding: '4px 8px', fontSize: '12px', color: '#ef4444', borderColor: '#fecaca' }}
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
        { label: 'مراكز العمل' },
      ]}
      title="مراكز العمل وخطوط الإنتاج (Work Centers)"
      actions={
        <Button
          variant="primary"
          onClick={openCreateModal}
          style={{ backgroundColor: '#170e5e', color: '#ffffff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <PlusIcon size={16} />
          <span>إضافة مركز عمل</span>
        </Button>
      }
    >

      {/* KPI Stats */}
      <WorkCentersStats workCenters={workCenters} />

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: '#ffffff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { key: 'all', label: 'الكل' },
            { key: 'active', label: 'النشطة' },
            { key: 'maintenance', label: 'تحت الصيانة' },
            { key: 'inactive', label: 'المعطلة' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key as any)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                border: statusFilter === tab.key ? '1px solid #170e5e' : '1px solid #cbd5e1',
                background: statusFilter === tab.key ? '#170e5e' : '#ffffff',
                color: statusFilter === tab.key ? '#ffffff' : '#64748b',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <SearchIcon size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="بحث بالرمز أو الاسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '6px 32px 6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          />
        </div>
      </div>

      {/* Data Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <DataTable
          columns={columns}
          rows={filteredWorkCenters}
          rowKey={(row) => String(row.id)}
          empty={isLoading ? 'جاري التحميل...' : 'لا توجد مراكز عمل مطابقة للبحث.'}
        />
      </div>

      {/* Create / Edit Modal */}
      <WorkCenterModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingId={editingId}
        formCode={formCode}
        setFormCode={setFormCode}
        formName={formName}
        setFormName={setFormName}
        formCostPerHour={formCostPerHour}
        setFormCostPerHour={setFormCostPerHour}
        formCapacity={formCapacity}
        setFormCapacity={setFormCapacity}
        formTimeEfficiency={formTimeEfficiency}
        setFormTimeEfficiency={setFormTimeEfficiency}
        formStatus={formStatus}
        setFormStatus={setFormStatus}
        formNotes={formNotes}
        setFormNotes={setFormNotes}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </ManufacturingLayout>
  );
}
