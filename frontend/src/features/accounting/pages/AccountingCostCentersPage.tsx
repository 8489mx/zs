import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppToolbar } from '@/stores/toolbar-store';
import { PageHeader } from '@/shared/components/page-header';
import { StatsGrid } from '@/shared/components/stats-grid';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { DialogShell } from '@/shared/components/dialog-shell';
import { formatCurrency, formatDateOnly } from '@/lib/format';
import { costCentersApi, type CostCenterRecord } from '../api/cost-centers.api';
import { PlusIcon, Trash2Icon, SearchIcon, FileTextIcon } from '@/shared/components/icons/AppIcons';

const COST_CENTER_DIMENSIONS: Record<string, { label: string; color: string; bg: string }> = {
  branch: { label: 'فروع ومواقع', color: '#170e5e', bg: 'rgba(23, 14, 94, 0.08)' },
  project: { label: 'مشاريع ومقاولات', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.08)' },
  department: { label: 'أقسام داخلية', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.08)' },
  fleet: { label: 'أسطول وسيارات', color: '#d97706', bg: 'rgba(217, 119, 6, 0.08)' },
  operational: { label: 'تشغيلي عام', color: '#475569', bg: 'rgba(71, 85, 105, 0.08)' },
};

export function AccountingCostCentersPage() {
  const queryClient = useQueryClient();

  useAppToolbar([
    { label: 'المالية والمحاسبة', to: '/accounting' },
    { label: 'مراكز التكلفة' },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [dimensionFilter, setDimensionFilter] = useState<string>('all');
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<CostCenterRecord | null>(null);
  const [reportCenterId, setReportCenterId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    dimension: 'operational',
    budgetAmount: '' as string | number,
    parentId: '' as string,
    description: '',
    isActive: true,
  });

  // Report Date Filter State
  const [reportFromDate, setReportFromDate] = useState('');
  const [reportToDate, setReportToDate] = useState('');

  // 1. Fetch Cost Centers
  const { data: costCenters = [], isLoading } = useQuery({
    queryKey: ['accounting-cost-centers'],
    queryFn: costCentersApi.list,
  });

  // 2. Fetch Cost Center Report
  const { data: reportData, isLoading: isReportLoading } = useQuery({
    queryKey: ['accounting-cost-center-report', reportCenterId, reportFromDate, reportToDate],
    queryFn: () => costCentersApi.getReport(reportCenterId!, { fromDate: reportFromDate, toDate: reportToDate }),
    enabled: Boolean(reportCenterId),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: costCentersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-cost-centers'] });
      setIsFormOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      alert(err.message || 'فشل إضافة مركز التكلفة');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => costCentersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-cost-centers'] });
      setIsFormOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      alert(err.message || 'فشل تحديث مركز التكلفة');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: costCentersApi.delete,
    onSuccess: (res) => {
      alert(res.message || 'تمت العملية بنجاح');
      queryClient.invalidateQueries({ queryKey: ['accounting-cost-centers'] });
    },
    onError: (err: any) => {
      alert(err.message || 'فشل حذف مركز التكلفة');
    },
  });

  const resetForm = () => {
    setFormData({ code: '', name: '', dimension: 'operational', budgetAmount: '', parentId: '', description: '', isActive: true });
    setEditingCenter(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    // Auto-suggest next code
    const count = costCenters.length + 1;
    setFormData({
      code: `CC-${String(count).padStart(3, '0')}`,
      name: '',
      dimension: 'operational',
      budgetAmount: '',
      parentId: '',
      description: '',
      isActive: true,
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (center: CostCenterRecord) => {
    setEditingCenter(center);
    setFormData({
      code: center.code,
      name: center.name,
      dimension: center.dimension || 'operational',
      budgetAmount: center.budgetAmount ? String(center.budgetAmount) : '',
      parentId: center.parentId ? String(center.parentId) : '',
      description: center.description || '',
      isActive: center.isActive,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      alert('يرجى كتابة كود واسم مركز التكلفة.');
      return;
    }

    const payload = {
      code: formData.code.trim(),
      name: formData.name.trim(),
      dimension: formData.dimension || 'operational',
      budgetAmount: formData.budgetAmount ? Number(formData.budgetAmount) : 0,
      parentId: formData.parentId ? Number(formData.parentId) : null,
      description: formData.description.trim() || undefined,
      isActive: formData.isActive,
    };

    if (editingCenter) {
      updateMutation.mutate({ id: editingCenter.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Filtered List
  const filteredCenters = useMemo(() => {
    return costCenters.filter((c) => {
      const matchesSearch =
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' ? true : statusFilter === 'active' ? c.isActive : !c.isActive;

      const matchesDimension =
        dimensionFilter === 'all' ? true : (c.dimension || 'operational') === dimensionFilter;

      return matchesSearch && matchesStatus && matchesDimension;
    });
  }, [costCenters, searchQuery, statusFilter, dimensionFilter]);

  const activeCount = costCenters.filter((c) => c.isActive).length;
  const rootCount = costCenters.filter((c) => !c.parentId).length;

  return (
    <div className="page-stack page-shell cost-centers-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <PageHeader
          title="مراكز التكلفة المحاسبية (Cost Centers)"
          description="دليل شجري لإدارة وتتبع مراكز التكلفة والفروع والمشاريع، وحساب الأرباح والمصروفات المستقلة"
          badge={<span className="nav-pill">دليل تحليلي</span>}
          actions={
            <div className="actions compact-actions page-header-actions">
              <Button
                variant="primary"
                onClick={handleOpenCreate}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <PlusIcon size={16} />
                <span>إضافة مركز تكلفة جديد</span>
              </Button>
            </div>
          }
        />

        {/* Metric Cards Strip */}
        <div style={{ marginBottom: '16px' }}>
          <StatsGrid
            items={[
              {
                key: 'total',
                label: 'إجمالي مراكز التكلفة',
                value: `${costCenters.length} مركز`,
              },
              {
                key: 'active',
                label: 'المراكز النشطة',
                value: `${activeCount} مركز نشط`,
              },
              {
                key: 'roots',
                label: 'المراكز الرئيسية (الجذور)',
                value: `${rootCount} مركز رئيسي`,
              },
            ]}
          />
        </div>

        {/* Main Workspace Panel */}
        <section className="document-prototype-section workspace-panel">
          <div className="section-header-compact-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 className="document-prototype-section-title" style={{ margin: 0 }}>شجرة ومراكز التكلفة</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>عرض وتصفية مراكز التكلفة والأبعاد التحليلية</p>
            </div>
          </div>
        {/* Filters Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                <SearchIcon size={15} />
              </span>
              <input
                type="text"
                placeholder="بحث بالكود أو الاسم أو الوصف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 32px 7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '3px' }}>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                style={{
                  border: 'none',
                  background: statusFilter === 'all' ? '#ffffff' : 'transparent',
                  color: statusFilter === 'all' ? '#0f172a' : '#64748b',
                  boxShadow: statusFilter === 'all' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                الكل ({costCenters.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                style={{
                  border: 'none',
                  background: statusFilter === 'active' ? '#ffffff' : 'transparent',
                  color: statusFilter === 'active' ? '#059669' : '#64748b',
                  boxShadow: statusFilter === 'active' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                النشطة ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('inactive')}
                style={{
                  border: 'none',
                  background: statusFilter === 'inactive' ? '#ffffff' : 'transparent',
                  color: statusFilter === 'inactive' ? '#ef4444' : '#64748b',
                  boxShadow: statusFilter === 'inactive' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                المعطلة ({costCenters.length - activeCount})
              </button>
            </div>

            <select
              value={dimensionFilter}
              onChange={(e) => setDimensionFilter(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                fontWeight: 700,
                color: '#334155',
                background: '#ffffff',
                outline: 'none',
              }}
            >
              <option value="all">كافة أبعاد التحليل ({costCenters.length})</option>
              {Object.entries(COST_CENTER_DIMENSIONS).map(([key, dim]) => (
                <option key={key} value={key}>
                  {dim.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cost Centers Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
                <th style={{ padding: '10px 14px' }}>كود المركز</th>
                <th style={{ padding: '10px 14px' }}>اسم مركز التكلفة</th>
                <th style={{ padding: '10px 14px' }}>البُعد التحليلي</th>
                <th style={{ padding: '10px 14px' }}>الموازنة التقديرية</th>
                <th style={{ padding: '10px 14px' }}>المركز الأب (الرئيسي)</th>
                <th style={{ padding: '10px 14px' }}>الحالة</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                    جاري تحميل مراكز التكلفة...
                  </td>
                </tr>
              ) : filteredCenters.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    لا توجد مراكز تكلفة مسجلة مطابقة للبحث. يمكنك إضافة مركز تكلفة جديد بنقرة زر أعلاه.
                  </td>
                </tr>
              ) : (
                filteredCenters.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                      {row.code}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                      {row.name}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          color: (COST_CENTER_DIMENSIONS[row.dimension || 'operational'] || COST_CENTER_DIMENSIONS.operational).color,
                          backgroundColor: (COST_CENTER_DIMENSIONS[row.dimension || 'operational'] || COST_CENTER_DIMENSIONS.operational).bg,
                        }}
                      >
                        {(COST_CENTER_DIMENSIONS[row.dimension || 'operational'] || COST_CENTER_DIMENSIONS.operational).label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: row.budgetAmount && row.budgetAmount > 0 ? '#170e5e' : '#94a3b8' }}>
                      {row.budgetAmount && row.budgetAmount > 0 ? formatCurrency(row.budgetAmount) : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>
                      {row.parentName ? (
                        <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontSize: '11.5px', color: '#334155' }}>
                          {row.parentName}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: row.isActive ? '#ecfdf5' : '#fef2f2',
                          color: row.isActive ? '#059669' : '#dc2626',
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: row.isActive ? '#10b981' : '#ef4444' }} />
                        {row.isActive ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setReportCenterId(row.id)}
                          title="عرض تقرير أرباح وخسائر المركز"
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#170e5e',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <FileTextIcon size={13} />
                          <span>كشف الحساب</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(row)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#0f172a',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          تعديل
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`هل أنت متأكد من رغبتك في حذف أو تعطيل مركز التكلفة: ${row.name}؟`)) {
                              deleteMutation.mutate(row.id);
                            }
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #fee2e2',
                            background: '#fff5f5',
                            color: '#dc2626',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2Icon size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>

      {/* Add / Edit Cost Center Modal */}
      <DialogShell
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        ariaLabel={editingCenter ? 'تعديل مركز تكلفة' : 'إضافة مركز تكلفة جديد'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '320px', maxWidth: '480px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#170e5e' }}>
              {editingCenter ? 'تعديل مركز تكلفة' : 'إضافة مركز تكلفة جديد'}
            </h3>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: '#94a3b8' }}
            >
              ✕
            </button>
          </div>
          <Field label="كود مركز التكلفة *" hint="مثال: CC-101 أو CC-RYD">
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </Field>

          <Field label="اسم مركز التكلفة *" hint="مثال: فرع الرياض، أسطول السيارات، قسم التسويق">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="البُعد التحليلي *" hint="تصنيف المركز (معيار Odoo)">
              <select
                value={formData.dimension}
                onChange={(e) => setFormData({ ...formData, dimension: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                {Object.entries(COST_CENTER_DIMENSIONS).map(([key, dim]) => (
                  <option key={key} value={key}>
                    {dim.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="الموازنة التقديرية (Budget)" hint="سقف الميزانية المخطط">
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={formData.budgetAmount}
                onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </Field>
          </div>

          <Field label="المركز الأب (اختياري)" hint="اتركه فارغاً إذا كان مركزاً رئيسياً">
            <select
              value={formData.parentId}
              onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="">— مركز رئيسي مستقل —</option>
              {costCenters
                .filter((c) => !editingCenter || c.id !== editingCenter.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
            </select>
          </Field>

          <Field label="الوصف والملاحظات">
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </Field>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <input
              type="checkbox"
              id="isActiveToggle"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <label htmlFor="isActiveToggle" style={{ fontSize: '13px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
              مركز تكلفة نشط (جاهز لاستقبال قيود وحركات)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <Button variant="secondary" type="button" onClick={() => setIsFormOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              style={{ background: '#170e5e', color: '#ffffff' }}
            >
              {createMutation.isPending || updateMutation.isPending ? 'جاري الحفظ...' : editingCenter ? 'حفظ التعديلات' : 'إنشاء مركز التكلفة'}
            </Button>
          </div>
        </form>
      </DialogShell>

      {/* Cost Center Report / Statement Modal */}
      <DialogShell
        open={Boolean(reportCenterId)}
        onClose={() => {
          setReportCenterId(null);
          setReportFromDate('');
          setReportToDate('');
        }}
        ariaLabel={`كشف حساب وأرباح وخسائر مركز التكلفة: ${reportData?.costCenter.name || ''} (${reportData?.costCenter.code || ''})`}
      >
        <div style={{ width: '100%', maxWidth: '820px', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#170e5e' }}>
              {`كشف حساب وأرباح وخسائر مركز التكلفة: ${reportData?.costCenter.name || ''} (${reportData?.costCenter.code || ''})`}
            </h3>
            <button
              type="button"
              onClick={() => {
                setReportCenterId(null);
                setReportFromDate('');
                setReportToDate('');
              }}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: '#94a3b8' }}
            >
              ✕
            </button>
          </div>
          {/* Date Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>من تاريخ:</span>
              <input
                type="date"
                value={reportFromDate}
                onChange={(e) => setReportFromDate(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>إلى تاريخ:</span>
              <input
                type="date"
                value={reportToDate}
                onChange={(e) => setReportToDate(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
            </div>
            {(reportFromDate || reportToDate) && (
              <button
                type="button"
                onClick={() => {
                  setReportFromDate('');
                  setReportToDate('');
                }}
                style={{ border: 'none', background: 'transparent', color: '#ef4444', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
              >
                تصفير الفلترة
              </button>
            )}
          </div>

          {/* Report Financial Summary Strip */}
          {reportData && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>إجمالي الإيرادات</div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#059669', marginTop: '2px' }}>
                  {formatCurrency(reportData.summary.totalRevenues)}
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>إجمالي المصروفات</div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#dc2626', marginTop: '2px' }}>
                  {formatCurrency(reportData.summary.totalExpenses)}
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>صافي أرباح المركز</div>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 900,
                    color: reportData.summary.netProfit >= 0 ? '#059669' : '#dc2626',
                    marginTop: '2px',
                  }}
                >
                  {formatCurrency(reportData.summary.netProfit)}
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>إجمالي الحركات (السطور)</div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                  {reportData.summary.linesCount}
                </div>
              </div>
            </div>
          )}

          {/* Budget vs Actual Monitoring Card (Odoo Standard) */}
          {reportData && reportData.summary.budgetAmount > 0 && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#170e5e' }}>تتبع الموازنة المعتمدة (Budget vs Actual)</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      color: reportData.summary.utilizationRate > 100 ? '#b91c1c' : reportData.summary.utilizationRate > 80 ? '#b45309' : '#047857',
                      backgroundColor: reportData.summary.utilizationRate > 100 ? '#fee2e2' : reportData.summary.utilizationRate > 80 ? '#fef3c7' : '#d1fae5',
                    }}
                  >
                    نسبة الاستهلاك: {reportData.summary.utilizationRate}%
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  الموازنة المعتمدة: <strong style={{ color: '#0f172a' }}>{formatCurrency(reportData.summary.budgetAmount)}</strong> | 
                  المصروف الفعلي: <strong style={{ color: '#dc2626' }}>{formatCurrency(reportData.summary.totalExpenses)}</strong> | 
                  {reportData.summary.variance >= 0 ? (
                    <span>المتبقي: <strong style={{ color: '#059669' }}>{formatCurrency(reportData.summary.variance)}</strong></span>
                  ) : (
                    <span>تجاوز الميزانية: <strong style={{ color: '#dc2626' }}>{formatCurrency(Math.abs(reportData.summary.variance))}</strong></span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(reportData.summary.utilizationRate, 100)}%`,
                    height: '100%',
                    borderRadius: '999px',
                    background: reportData.summary.utilizationRate > 100 ? '#ef4444' : reportData.summary.utilizationRate > 80 ? '#f59e0b' : '#10b981',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              {reportData.summary.utilizationRate > 100 && (
                <div style={{ fontSize: '11.5px', color: '#b91c1c', background: '#fef2f2', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                  تنبيه: تخطى هذا المركز سقف موازنته المعتمدة بمقدار {formatCurrency(Math.abs(reportData.summary.variance))}.
                </div>
              )}
            </div>
          )}

          {/* Lines Table */}
          <div style={{ maxHeight: '380px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, borderBottom: '1.5px solid #e2e8f0' }}>
                <tr style={{ color: '#475569', fontWeight: 800 }}>
                  <th style={{ padding: '8px 10px' }}>التاريخ</th>
                  <th style={{ padding: '8px 10px' }}>رقم القيد</th>
                  <th style={{ padding: '8px 10px' }}>الحساب</th>
                  <th style={{ padding: '8px 10px' }}>بيان البند</th>
                  <th style={{ padding: '8px 10px' }}>مدين</th>
                  <th style={{ padding: '8px 10px' }}>دائن</th>
                </tr>
              </thead>
              <tbody>
                {isReportLoading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '25px', textAlign: 'center', color: '#64748b' }}>
                      جاري استخراج كشف الحساب...
                    </td>
                  </tr>
                ) : !reportData || reportData.lines.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                      لا توجد حركات محاسبية مسجلة لمركز التكلفة هذا خلال الفترة المحددة.
                    </td>
                  </tr>
                ) : (
                  reportData.lines.map((line) => (
                    <tr key={line.lineId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>{formatDateOnly(line.entryDate)}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, fontFamily: 'monospace' }}>{line.entryNo}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ fontWeight: 700 }}>{line.accountName}</span>
                        <span style={{ fontSize: '10.5px', color: '#64748b', marginInlineStart: '4px' }}>({line.accountCode})</span>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#334155' }}>{line.lineDescription || line.entryDescription || '—'}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: line.debit > 0 ? '#0f172a' : '#94a3b8' }}>
                        {line.debit > 0 ? formatCurrency(line.debit) : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: line.credit > 0 ? '#0f172a' : '#94a3b8' }}>
                        {line.credit > 0 ? formatCurrency(line.credit) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <Button variant="secondary" onClick={() => setReportCenterId(null)}>
              إغلاق
            </Button>
          </div>
        </div>
      </DialogShell>
    </div>
  );
}
