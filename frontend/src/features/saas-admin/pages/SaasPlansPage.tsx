import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';
import { DataTable } from '@/shared/components/data-table';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { StatsGrid } from '@/shared/components/stats-grid';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Field } from '@/shared/ui/field';
import { saasAdminApi, SaasPlan } from '../api/saas-admin.api';

export function SaasPlansPage() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SaasPlan | null>(null);

  const [newPlan, setNewPlan] = useState({
    code: '',
    name: '',
    price: 0,
    currency: 'EGP',
    billing_period_months: 12,
    max_users: 0,
    max_branches: 0,
    feature_plan_id: '',
  });

  const plansQuery = useQuery({
    queryKey: ['saas-plans'],
    queryFn: () => saasAdminApi.listPlans(),
  });

  const featurePlansQuery = useQuery({
    queryKey: ['saas-feature-plans'],
    queryFn: () => saasAdminApi.listFeaturePlans(),
  });

  const createMutation = useMutation({
    mutationFn: () => saasAdminApi.createPlan({
      code: newPlan.code.trim().toUpperCase(),
      name: newPlan.name.trim(),
      price: Number(newPlan.price),
      currency: newPlan.currency,
      billingPeriodMonths: Number(newPlan.billing_period_months),
      maxUsers: newPlan.max_users ? Number(newPlan.max_users) : null,
      maxBranches: newPlan.max_branches ? Number(newPlan.max_branches) : null,
      featurePlanId: newPlan.feature_plan_id || null,
    }),
    onSuccess: () => {
      setFeedback('تم حفظ الخطة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['saas-plans'] });
      setIsCreateModalOpen(false);
      setNewPlan({ code: '', name: '', price: 0, currency: 'EGP', billing_period_months: 12, max_users: 0, max_branches: 0, feature_plan_id: '' });
    },
    onError: (error: any) => {
      setFeedback(error.message || 'فشل حفظ الخطة');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: number; data: any }) => saasAdminApi.updatePlan(input.id, input.data),
    onSuccess: () => {
      setFeedback('تم التعديل بنجاح');
      queryClient.invalidateQueries({ queryKey: ['saas-plans'] });
      setEditingPlan(null);
    },
    onError: (error: any) => {
      setFeedback(error.message || 'فشل التعديل');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    updateMutation.mutate({
      id: editingPlan.id,
      data: {
        code: editingPlan.code.trim().toUpperCase(),
        name: editingPlan.name.trim(),
        price: Number(editingPlan.price),
        currency: editingPlan.currency,
        billingPeriodMonths: Number(editingPlan.billing_period_months),
        maxUsers: editingPlan.max_users ? Number(editingPlan.max_users) : null,
        maxBranches: editingPlan.max_branches ? Number(editingPlan.max_branches) : null,
        featurePlanId: editingPlan.feature_plan_id || null,
        isActive: editingPlan.is_active,
      }
    });
  };

  const plans = plansQuery.data || [];

  const stats = useMemo(() => {
    const total = plans.length;
    const active = plans.filter((p) => p.is_active).length;
    const annual = plans.filter((p) => p.billing_period_months === 12).length;
    const monthly = plans.filter((p) => p.billing_period_months === 1).length;
    return [
      { key: 'total', label: 'إجمالي الباقات', value: total },
      { key: 'active', label: 'باقات مفعلة', value: active },
      { key: 'annual', label: 'باقات سنوية (12 شهراً)', value: annual },
      { key: 'monthly', label: 'باقات شهرية', value: monthly },
    ];
  }, [plans]);

  const togglePlanActive = (plan: SaasPlan) => {
    updateMutation.mutate({
      id: plan.id,
      data: {
        code: plan.code,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        billingPeriodMonths: plan.billing_period_months,
        maxUsers: plan.max_users,
        maxBranches: plan.max_branches,
        featurePlanId: plan.feature_plan_id,
        isActive: !plan.is_active,
      }
    });
  };

  return (
    <div className="page-stack page-shell saas-plans-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '32px' }}>
        <PageHeader 
          title="خطط وباقات الاشتراك (SaaS Plans)" 
          description="إدارة باقات وأسعار الاشتراكات وحدود الفروع والمستخدمين المتاحة للعملاء."
          badge={<span className="nav-pill" style={{ background: '#f8fafc', color: '#0f172a', borderColor: '#e2e8f0', fontWeight: 800 }}>SaaS Admin</span>}
          actions={
            <button 
              type="button" 
              className="button" 
              style={{
                background: '#0f172a',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontWeight: 800,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => setIsCreateModalOpen(true)}
            >
              <span>+</span>
              <span>إضافة باقة جديدة</span>
            </button>
          }
        />

        {feedback && (
          <div className="success-box mb-4" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '12px 16px', borderRadius: '8px', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{feedback}</span>
            <button type="button" onClick={() => setFeedback('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#065f46', fontWeight: 800 }}>✕</button>
          </div>
        )}

        {/* KPI Stats Grid */}
        <StatsGrid items={stats} />

        <FormSection title="الخطط والباقات المتاحة">
          <QueryFeedback
            isLoading={plansQuery.isLoading}
            isError={plansQuery.isError}
            error={plansQuery.error}
            isEmpty={!plans.length}
            loadingText="جاري تحميل الخطط..."
            errorTitle="تعذر تحميل الخطط"
            emptyTitle="لا توجد خطط مسجلة"
            emptyHint="قم بإنشاء خطة اشتراك جديدة لتفعيلها للعملاء."
          >
            <DataTable<SaasPlan>
              data={plans}
              getRowKey={(row) => row.id.toString()}
              columns={[
                {
                  id: 'code',
                  header: 'كود الباقة',
                  align: 'center',
                  sortable: true,
                  sortValue: (row) => row.code,
                  render: (row) => (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span className="tenant-slug-badge" style={{ fontWeight: 800, color: '#0f172a' }}>
                        {row.code}
                      </span>
                    </div>
                  ),
                },
                {
                  id: 'name',
                  header: 'اسم الباقة',
                  align: 'center',
                  sortable: true,
                  sortValue: (row) => row.name,
                  render: (row) => (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{row.name}</strong>
                    </div>
                  ),
                },
                {
                  id: 'price',
                  header: 'السعر والعملة',
                  align: 'center',
                  sortable: true,
                  sortValue: (row) => row.price,
                  render: (row) => (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span style={{ fontWeight: 800, color: '#059669', fontSize: '13px' }}>
                        {row.price.toLocaleString('ar-EG')} {row.currency}
                      </span>
                    </div>
                  ),
                },
                {
                  id: 'duration',
                  header: 'المدة',
                  align: 'center',
                  sortable: true,
                  sortValue: (row) => row.billing_period_months,
                  render: (row) => (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 600 }}>
                        {row.billing_period_months === 12 ? 'سنة واحدة (12 شهر)' : row.billing_period_months === 1 ? 'شهر واحد' : `${row.billing_period_months} أشهر`}
                      </span>
                    </div>
                  ),
                },
                {
                  id: 'limits',
                  header: 'حدود المستخدمين والفروع',
                  align: 'center',
                  render: (row) => (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '12px', color: '#475569' }}>
                      <span>{row.max_users ? `${row.max_users} مستخدم` : 'مستخدمين غير محدود'}</span>
                      <span style={{ color: '#cbd5e1' }}>•</span>
                      <span>{row.max_branches ? `${row.max_branches} فرع` : 'فروع غير محدودة'}</span>
                    </div>
                  ),
                },
                {
                  id: 'status',
                  header: 'الحالة',
                  align: 'center',
                  sortable: true,
                  sortValue: (row) => (row.is_active ? 1 : 0),
                  render: (row) => (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span className={`tenant-status-pill ${row.is_active ? 'active' : 'expired'}`}>
                        {row.is_active ? 'مفعلة' : 'معطلة'}
                      </span>
                    </div>
                  ),
                },
                {
                  id: 'actions',
                  header: 'الإجراءات',
                  align: 'center',
                  render: (row) => (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                      <button 
                        type="button" 
                        className="button button-secondary"
                        style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 700, borderRadius: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a' }}
                        onClick={() => setEditingPlan(row)}
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        style={{
                          padding: '4px 10px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          borderRadius: '6px',
                          background: row.is_active ? '#fff1f2' : '#f0fdf4',
                          border: row.is_active ? '1px solid #fecdd3' : '1px solid #bbf7d0',
                          color: row.is_active ? '#be123c' : '#15803d',
                        }}
                        onClick={() => togglePlanActive(row)}
                        title={row.is_active ? 'تعطيل الباقة' : 'تفعيل الباقة'}
                      >
                        {row.is_active ? 'تعطيل' : 'تفعيل'}
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          </QueryFeedback>
        </FormSection>
      </main>

      {/* ========================================================
          CREATE NEW PLAN MODAL
          ======================================================== */}
      {isCreateModalOpen && (
        <DialogShell
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          width="640px"
          ariaLabel="إضافة باقة جديدة"
        >
          <div className="dialog-card" style={{ padding: '6px 0' }} dir="rtl">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                  📦
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                    إضافة باقة اشتراك جديدة
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    تحديد السعر ومدة الاشتراك وحدود الاستخدام للباقة السحابية.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="dialog-shell-close-btn"
                onClick={() => setIsCreateModalOpen(false)}
                title="إغلاق"
                style={{ background: 'transparent', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate}>
              {/* القسم 1: المعرف والاسم */}
              <div className="saas-modal-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                <div className="saas-modal-card-title" style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
                  <span>1. بيانات الباقة الأساسية</span>
                </div>
                <div className="saas-modal-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <Field label="كود الباقة (إنجليزي) *">
                    <input 
                      required 
                      value={newPlan.code} 
                      onChange={(e) => setNewPlan({ ...newPlan, code: e.target.value })} 
                      dir="ltr"
                      placeholder="مثال: BASIC, PRO, ENTERPRISE"
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                  </Field>
                  <Field label="اسم الباقة بالعربية *">
                    <input 
                      required 
                      value={newPlan.name} 
                      onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} 
                      placeholder="مثال: الباقة الأساسية"
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                  </Field>
                </div>
              </div>

              {/* القسم 2: التسعير والمدة */}
              <div className="saas-modal-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                <div className="saas-modal-card-title" style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
                  <span>2. التسعير وفترة الفوترة</span>
                </div>
                <div className="saas-modal-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <Field label="السعر *">
                    <input 
                      required 
                      type="number"
                      min="0"
                      value={newPlan.price === 0 ? '' : newPlan.price} 
                      onChange={(e) => setNewPlan({ ...newPlan, price: Number(e.target.value) })} 
                      placeholder="0.00"
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                  </Field>
                  <Field label="العملة">
                    <select 
                      value={newPlan.currency} 
                      onChange={(e) => setNewPlan({ ...newPlan, currency: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    >
                      <option value="EGP">EGP (جنيه)</option>
                      <option value="USD">USD (دولار)</option>
                      <option value="SAR">SAR (ريال)</option>
                      <option value="AED">AED (درهم)</option>
                    </select>
                  </Field>
                  <Field label="فترة الفوترة (أشهر)">
                    <select
                      value={newPlan.billing_period_months}
                      onChange={(e) => setNewPlan({ ...newPlan, billing_period_months: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    >
                      <option value={1}>شهر واحد (1)</option>
                      <option value={3}>3 أشهر</option>
                      <option value={6}>6 أشهر</option>
                      <option value={12}>سنة كاملة (12)</option>
                      <option value={24}>سنتان (24)</option>
                    </select>
                  </Field>
                </div>
              </div>

              {/* القسم 3: الحدود والميزات */}
              <div className="saas-modal-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                <div className="saas-modal-card-title" style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
                  <span>3. الحدود والميزات المرتبطة</span>
                </div>
                <div className="saas-modal-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <Field label="الحد الأقصى للمستخدمين (0 = غير محدود)">
                    <input 
                      type="number"
                      min="0"
                      value={newPlan.max_users === 0 ? '' : newPlan.max_users} 
                      onChange={(e) => setNewPlan({ ...newPlan, max_users: Number(e.target.value) })} 
                      placeholder="0 لغير محدود"
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                  </Field>
                  <Field label="الحد الأقصى للفروع (0 = غير محدود)">
                    <input 
                      type="number"
                      min="0"
                      value={newPlan.max_branches === 0 ? '' : newPlan.max_branches} 
                      onChange={(e) => setNewPlan({ ...newPlan, max_branches: Number(e.target.value) })} 
                      placeholder="0 لغير محدود"
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                  </Field>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <Field label="باقة الميزات الافتراضية (اختياري)">
                    <select
                      value={newPlan.feature_plan_id}
                      onChange={(e) => setNewPlan({ ...newPlan, feature_plan_id: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    >
                      <option value="">-- بدون ربط (يتم تحديد الميزات يدوياً) --</option>
                      {featurePlansQuery.data?.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: 700 }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button"
                  style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    fontWeight: 800,
                    padding: '8px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  disabled={createMutation.isPending || !newPlan.code || !newPlan.name}
                >
                  {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ الباقة'}
                </button>
              </div>
            </form>
          </div>
        </DialogShell>
      )}

      {/* ========================================================
          EDIT PLAN MODAL
          ======================================================== */}
      {editingPlan && (
        <DialogShell
          open={Boolean(editingPlan)}
          onClose={() => setEditingPlan(null)}
          width="640px"
          ariaLabel="تعديل باقة الاشتراك"
        >
          <div className="dialog-card" style={{ padding: '6px 0' }} dir="rtl">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                  ✏️
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                    تعديل باقة الاشتراك: {editingPlan.name}
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    تحديث التسعير وفترة الفوترة وحدود النسخ الشاغلة.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="dialog-shell-close-btn"
                onClick={() => setEditingPlan(null)}
                title="إغلاق"
                style={{ background: 'transparent', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate}>
              {/* القسم 1: المعرف والاسم */}
              <div className="saas-modal-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                <div className="saas-modal-card-title" style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
                  <span>1. بيانات الباقة الأساسية</span>
                </div>
                <div className="saas-modal-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <Field label="كود الباقة (إنجليزي) *">
                    <input 
                      required 
                      value={editingPlan.code} 
                      onChange={(e) => setEditingPlan({ ...editingPlan, code: e.target.value })} 
                      dir="ltr"
                      placeholder="مثال: BASIC, PRO"
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                  </Field>
                  <Field label="اسم الباقة بالعربية *">
                    <input 
                      required 
                      value={editingPlan.name} 
                      onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })} 
                      placeholder="مثال: الباقة الأساسية"
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                  </Field>
                </div>
              </div>

              {/* القسم 2: التسعير والمدة */}
              <div className="saas-modal-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                <div className="saas-modal-card-title" style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
                  <span>2. التسعير وفترة الفوترة</span>
                </div>
                <div className="saas-modal-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <Field label="السعر *">
                    <input 
                      required 
                      type="number"
                      min="0"
                      value={editingPlan.price} 
                      onChange={(e) => setEditingPlan({ ...editingPlan, price: Number(e.target.value) })} 
                      placeholder="0.00"
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                  </Field>
                  <Field label="العملة">
                    <select 
                      value={editingPlan.currency} 
                      onChange={(e) => setEditingPlan({ ...editingPlan, currency: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    >
                      <option value="EGP">EGP (جنيه)</option>
                      <option value="USD">USD (دولار)</option>
                      <option value="SAR">SAR (ريال)</option>
                      <option value="AED">AED (درهم)</option>
                    </select>
                  </Field>
                  <Field label="فترة الفوترة (أشهر)">
                    <select
                      value={editingPlan.billing_period_months}
                      onChange={(e) => setEditingPlan({ ...editingPlan, billing_period_months: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    >
                      <option value={1}>شهر واحد (1)</option>
                      <option value={3}>3 أشهر</option>
                      <option value={6}>6 أشهر</option>
                      <option value={12}>سنة كاملة (12)</option>
                      <option value={24}>سنتان (24)</option>
                    </select>
                  </Field>
                </div>
              </div>

              {/* القسم 3: الحدود والميزات */}
              <div className="saas-modal-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                <div className="saas-modal-card-title" style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
                  <span>3. الحدود والميزات والخطة</span>
                </div>
                <div className="saas-modal-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <Field label="أقصى عدد مستخدمين (0 = غير محدود)">
                    <input 
                      type="number"
                      min="0"
                      value={editingPlan.max_users || 0} 
                      onChange={(e) => setEditingPlan({ ...editingPlan, max_users: Number(e.target.value) })} 
                      placeholder="0 لغير محدود"
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                  </Field>
                  <Field label="أقصى عدد فروع (0 = غير محدود)">
                    <input 
                      type="number"
                      min="0"
                      value={editingPlan.max_branches || 0} 
                      onChange={(e) => setEditingPlan({ ...editingPlan, max_branches: Number(e.target.value) })} 
                      placeholder="0 لغير محدود"
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                  </Field>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <Field label="باقة الميزات المرتبطة">
                    <select
                      value={editingPlan.feature_plan_id || ''}
                      onChange={(e) => setEditingPlan({ ...editingPlan, feature_plan_id: e.target.value || null })}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    >
                      <option value="">-- بدون ربط --</option>
                      {featurePlansQuery.data?.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="edit_is_active"
                    checked={editingPlan.is_active}
                    onChange={(e) => setEditingPlan({ ...editingPlan, is_active: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="edit_is_active" style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
                    مفعلة ومتاحة لاشتراكات العملاء
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setEditingPlan(null)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: 700 }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button"
                  style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    fontWeight: 800,
                    padding: '8px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  disabled={updateMutation.isPending || !editingPlan.code || !editingPlan.name}
                >
                  {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </DialogShell>
      )}
    </div>
  );
}
