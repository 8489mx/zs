import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppToolbar } from '@/stores/toolbar-store';
import { PageHeader } from '@/shared/components/page-header';
import { StatsGrid } from '@/shared/components/stats-grid';
import { Button } from '@/shared/ui/button';
import { costCentersApi, type CostCenterRecord } from '../api/cost-centers.api';
import { PlusIcon } from '@/shared/components/icons/AppIcons';
import { CostCentersTable } from '../components/cost-centers/CostCentersTable';
import { CostCenterFormModal } from '../components/cost-centers/CostCenterFormModal';
import { CostCenterReportModal } from '../components/cost-centers/CostCenterReportModal';

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

        {/* Stats Strip */}
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

        {/* Main Table */}
        <CostCentersTable
          costCenters={filteredCenters}
          allCenters={costCenters}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          dimensionFilter={dimensionFilter}
          onDimensionFilterChange={setDimensionFilter}
          onEdit={handleOpenEdit}
          onOpenReport={(id) => setReportCenterId(id)}
          onDelete={(id, name) => {
            if (confirm(`هل أنت متأكد من حذف مركز التكلفة ${name}؟`)) {
              deleteMutation.mutate(id);
            }
          }}
        />
      </main>

      {/* Form Modal */}
      <CostCenterFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        isEditing={Boolean(editingCenter)}
        formData={formData}
        onChange={setFormData}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        availableParents={costCenters.filter((c) => !editingCenter || c.id !== editingCenter.id)}
      />

      {/* Report Modal */}
      <CostCenterReportModal
        centerId={reportCenterId}
        onClose={() => setReportCenterId(null)}
        reportData={reportData}
        isLoading={isReportLoading}
        fromDate={reportFromDate}
        toDate={reportToDate}
        onFromDateChange={setReportFromDate}
        onToDateChange={setReportToDate}
      />
    </div>
  );
}
