import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { saasAdminApi, type SaasPlan } from '@/features/saas-admin/api/saas-admin.api';
import { PageHeader } from '@/shared/components/page-header';
import { StatsGrid } from '@/shared/components/stats-grid';
import { Button } from '@/shared/ui/button';
import { DataTable, type DataTableColumn } from '@/shared/components/data-table';
import { PlusIcon } from '@/shared/components/icons/AppIcons';
import { CreateSaasPlanModal } from '../components/CreateSaasPlanModal';
import { EditSaasPlanModal } from '../components/EditSaasPlanModal';

export function SaasPlansPage() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SaasPlan | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [newPlan, setNewPlan] = useState({
    code: '',
    name: '',
    price: 0,
    currency: 'EGP',
    billing_period_months: 1,
    max_users: 0,
    max_branches: 0,
    feature_plan_id: '',
    is_active: true,
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['saas-plans'],
    queryFn: saasAdminApi.getPlans,
  });

  const featurePlansQuery = useQuery({
    queryKey: ['saas-feature-plans'],
    queryFn: saasAdminApi.getFeaturePlans,
  });

  const createMutation = useMutation({
    mutationFn: saasAdminApi.createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-plans'] });
      setFeedback('تم إنشاء باقة الاشتراك بنجاح.');
      setIsCreateModalOpen(false);
      setNewPlan({
        code: '',
        name: '',
        price: 0,
        currency: 'EGP',
        billing_period_months: 1,
        max_users: 0,
        max_branches: 0,
        feature_plan_id: '',
        is_active: true,
      });
      setTimeout(() => setFeedback(''), 4000);
    },
    onError: (err: any) => {
      setFeedback(err?.response?.data?.message || 'تعذر حفظ الباقة.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      saasAdminApi.updatePlan(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-plans'] });
      setFeedback('تم تحديث بيانات الباقة بنجاح.');
      setEditingPlan(null);
      setTimeout(() => setFeedback(''), 4000);
    },
    onError: (err: any) => {
      setFeedback(err?.response?.data?.message || 'تعذر تعديل الباقة.');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      saasAdminApi.updatePlan(id, { isActive: is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-plans'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => saasAdminApi.deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-plans'] });
      setFeedback('تم حذف الباقة بنجاح.');
      setTimeout(() => setFeedback(''), 4000);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      code: newPlan.code,
      name: newPlan.name,
      price: newPlan.price,
      currency: newPlan.currency,
      billingPeriodMonths: newPlan.billing_period_months,
      maxUsers: newPlan.max_users || null,
      maxBranches: newPlan.max_branches || null,
      featurePlanId: newPlan.feature_plan_id || null,
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    updateMutation.mutate({
      id: editingPlan.id,
      payload: {
        code: editingPlan.code,
        name: editingPlan.name,
        price: editingPlan.price,
        currency: editingPlan.currency,
        billingPeriodMonths: editingPlan.billing_period_months,
        maxUsers: editingPlan.max_users,
        maxBranches: editingPlan.max_branches,
        featurePlanId: editingPlan.feature_plan_id || undefined,
        isActive: editingPlan.is_active,
      },
    });
  };

  const filteredPlans = useMemo(() => {
    if (!searchQuery.trim()) return plans;
    const q = searchQuery.trim().toLowerCase();
    return plans.filter((p) => 
      p.code?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q) ||
      p.feature_plan_name?.toLowerCase().includes(q)
    );
  }, [plans, searchQuery]);

  const stats = useMemo(() => [
    { key: 'total_plans', label: 'إجمالي الباقات المعرفة', value: String(plans.length) },
    { key: 'active_plans', label: 'الباقات المفعلة للبيع', value: String(plans.filter((p) => p.is_active).length) },
    { key: 'total_subscribers', label: 'إجمالي المنشآت المشتركة', value: `${plans.reduce((acc, p) => acc + (Number(p.subscribers_count) || 0), 0)} منشأة` },
    { key: 'feature_plans', label: 'حزم الميزات المرتبطة', value: `${featurePlansQuery.data?.length || 0} حزمة` },
  ], [plans, featurePlansQuery.data]);

  const columns: DataTableColumn<SaasPlan>[] = [
    {
      id: 'code',
      header: 'كود الباقة',
      render: (row: SaasPlan) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#170e5e', fontSize: '13px' }}>
          {row.code}
        </span>
      ),
      sortable: true,
    },
    {
      id: 'name',
      header: 'اسم الباقة',
      render: (row: SaasPlan) => (
        <div>
          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>{row.name}</div>
          {row.feature_plan_name && (
            <div style={{ fontSize: '11px', color: '#6366f1', marginTop: '2px' }}>
              باقة ميزات: {row.feature_plan_name}
            </div>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      id: 'price',
      header: 'السعر وفترة الفوترة',
      render: (row: SaasPlan) => (
        <div>
          <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>
            {row.price} {row.currency}
          </span>
          <span style={{ fontSize: '11px', color: '#64748b', marginRight: '4px' }}>
            / {row.billing_period_months === 1 ? 'شهر' : `${row.billing_period_months} أشهر`}
          </span>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'limits',
      header: 'الحدود المسموحة',
      render: (row: SaasPlan) => (
        <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
          <div>مستخدمين: {row.max_users === 0 || row.max_users === null ? 'غير محدود' : row.max_users}</div>
          <div>فروع: {row.max_branches === 0 || row.max_branches === null ? 'غير محدود' : row.max_branches}</div>
        </div>
      ),
    },
    {
      id: 'subscribers_count',
      header: 'المشتركين',
      render: (row: SaasPlan) => (
        <span className="badge badge-gray" style={{ fontWeight: 700, fontSize: '11px', padding: '3px 8px', borderRadius: '6px' }}>
          {row.subscribers_count || 0} منشأة
        </span>
      ),
      sortable: true,
    },
    {
      id: 'is_active',
      header: 'الحالة',
      render: (row: SaasPlan) => (
        <button
          type="button"
          onClick={() => toggleMutation.mutate({ id: row.id, is_active: !row.is_active })}
          className={`badge ${row.is_active ? 'badge-success' : 'badge-danger'}`}
          style={{ cursor: 'pointer', border: 'none', padding: '3px 8px', fontSize: '11px', fontWeight: 700, borderRadius: '6px' }}
          title="انقر لتغيير حالة التفعيل"
        >
          {row.is_active ? 'مفعلة' : 'معطلة'}
        </button>
      ),
    },
    {
      id: 'actions',
      header: 'الإجراءات',
      render: (row: SaasPlan) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setEditingPlan(row)}
            style={{ fontSize: '12px', padding: '4px 10px', minHeight: '28px' }}
          >
            تعديل
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              if (window.confirm(`هل أنت متأكد من حذف الباقة "${row.name}"؟`)) {
                deleteMutation.mutate(row.id);
              }
            }}
            style={{ fontSize: '12px', padding: '4px 10px', minHeight: '28px' }}
            disabled={(row.subscribers_count || 0) > 0}
            title={(row.subscribers_count || 0) > 0 ? 'لا يمكن حذف باقة لها مشتركون حاليون' : ''}
          >
            حذف
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-stack page-shell saas-plans-workspace" dir="rtl">
      <div className="document-prototype-column" style={{ paddingBottom: '32px' }}>
        <PageHeader
          title="باقات الاشتراكات السحابية (SaaS Plans)"
          description="تحديد باقات الأسعار وفترات الفوترة وحدود المستخدمين والفروع للمشتركين في المنصة."
          badge={<span className="nav-pill" style={{ background: '#ede9fe', color: '#6d28d9', borderColor: '#c4b5fd' }}>SaaS Admin</span>}
          actions={
            <Button
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <PlusIcon size={16} />
              إضافة باقة جديدة
            </Button>
          }
        />

        <StatsGrid items={stats} />

        {feedback && (
          <div style={{ padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', color: '#1e40af', fontSize: '13px' }}>
            {feedback}
          </div>
        )}

        <section className="document-prototype-section">
          <div className="section-header-compact-row" style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
              قائمة باقات الأسعار المتاحة للمستأجرين ({filteredPlans.length})
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="بحث بكود الباقة أو الاسم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  width: '240px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <DataTable
              getRowKey={(row) => String(row.id)}
              columns={columns}
              data={filteredPlans}
              loading={isLoading}
              emptyMessage="لا توجد باقات اشتراك مضافة حتى الآن"
            />
          </div>
        </section>

        <CreateSaasPlanModal
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          newPlan={newPlan}
          setNewPlan={setNewPlan}
          onSubmit={handleCreate}
          isPending={createMutation.isPending}
          featurePlans={featurePlansQuery.data || []}
        />

        <EditSaasPlanModal
          editingPlan={editingPlan}
          setEditingPlan={setEditingPlan}
          onSubmit={handleUpdate}
          isPending={updateMutation.isPending}
          featurePlans={featurePlansQuery.data || []}
        />
      </div>
    </div>
  );
}

export default SaasPlansPage;
