import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';
import { DataTable } from '@/shared/components/data-table';
import { QueryFeedback } from '@/shared/components/query-feedback';
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
  });

  const plansQuery = useQuery({
    queryKey: ['saas-plans'],
    queryFn: () => saasAdminApi.listPlans(),
  });

  const createMutation = useMutation({
    mutationFn: () => saasAdminApi.createPlan({
      code: newPlan.code,
      name: newPlan.name,
      price: Number(newPlan.price),
      currency: newPlan.currency,
      billingPeriodMonths: Number(newPlan.billing_period_months),
      maxUsers: newPlan.max_users ? Number(newPlan.max_users) : null,
      maxBranches: newPlan.max_branches ? Number(newPlan.max_branches) : null,
    }),
    onSuccess: () => {
      setFeedback('تم حفظ الخطة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['saas-plans'] });
      setIsCreateModalOpen(false);
      setNewPlan({ code: '', name: '', price: 0, currency: 'EGP', billing_period_months: 12, max_users: 0, max_branches: 0 });
    },
    onError: (error: any) => {
      setFeedback(error.message || 'فشل حفظ الخطة');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

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

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    updateMutation.mutate({
      id: editingPlan.id,
      data: {
        code: editingPlan.code,
        name: editingPlan.name,
        price: Number(editingPlan.price),
        currency: editingPlan.currency,
        billingPeriodMonths: Number(editingPlan.billing_period_months),
        maxUsers: editingPlan.max_users ? Number(editingPlan.max_users) : null,
        maxBranches: editingPlan.max_branches ? Number(editingPlan.max_branches) : null,
        isActive: editingPlan.is_active,
      }
    });
  };

  const plans = plansQuery.data || [];

  return (
    <main className="document-prototype-column">
      <PageHeader 
        title="خطط الاشتراك (SaaS)" 
        description="إدارة باقات الاشتراك المتاحة للعملاء"
        actions={
          <button type="button" className="button" onClick={() => setIsCreateModalOpen(true)}>
            إضافة خطة جديدة
          </button>
        }
      />

      {feedback && (
        <div className="warning-box mb-4">
          {feedback}
        </div>
      )}

      <FormSection title="الخطط المتاحة">
        <QueryFeedback
          isLoading={plansQuery.isLoading}
          isError={plansQuery.isError}
          error={plansQuery.error}
          isEmpty={!plans.length}
          loadingText="جاري تحميل الخطط..."
          errorTitle="تعذر تحميل الخطط"
          emptyTitle="لا توجد خطط"
          emptyHint="قم بإنشاء خطة اشتراك جديدة."
        >
          <DataTable<SaasPlan>
            data={plans}
            getRowKey={(row) => row.id.toString()}
            columns={[
              {
                id: 'code',
                header: 'الكود',
                render: (row) => <span>{row.code}</span>,
              },
              {
                id: 'name',
                header: 'اسم الخطة',
                render: (row) => <strong>{row.name}</strong>,
              },
              {
                id: 'price',
                header: 'السعر',
                render: (row) => <span>{row.price} {row.currency}</span>,
              },
              {
                id: 'duration',
                header: 'المدة (أشهر)',
                render: (row) => <span>{row.billing_period_months}</span>,
              },
              {
                id: 'limits',
                header: 'الحدود (مستخدمين / فروع)',
                render: (row) => <span>{row.max_users || 'غير محدود'} / {row.max_branches || 'غير محدود'}</span>,
              },
              {
                id: 'status',
                header: 'الحالة',
                render: (row) => (
                  <span className={`badge ${row.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {row.is_active ? 'مفعلة' : 'معطلة'}
                  </span>
                ),
              },
              {
                id: 'actions',
                header: 'الإجراءات',
                render: (row) => (
                  <button type="button" className="button button-sm button-secondary" onClick={() => setEditingPlan(row)}>
                    تعديل
                  </button>
                ),
              },
            ]}
          />
        </QueryFeedback>
      </FormSection>

      {isCreateModalOpen ? (
        <div className="dialog-overlay" role="presentation">
          <div className="dialog-shell" role="dialog" aria-modal="true" aria-label="إضافة خطة جديدة">
            <FormSection title="إضافة خطة جديدة" actions={<button type="button" className="button button-secondary" onClick={() => setIsCreateModalOpen(false)}>إغلاق</button>}>
              <form onSubmit={handleCreate} className="stack gap-12">
                <Field label="الكود (إنجليزي)">
                  <input 
                    required 
                    value={newPlan.code} 
                    onChange={(e) => setNewPlan({ ...newPlan, code: e.target.value })} 
                    dir="ltr"
                    placeholder="e.g. BASIC"
                  />
                </Field>
                
                <Field label="اسم الخطة">
                  <input 
                    required 
                    value={newPlan.name} 
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} 
                    placeholder="e.g. الخطة الأساسية"
                  />
                </Field>

                <div className="grid-2">
                  <Field label="السعر">
                    <input 
                      required 
                      type="number"
                      min="0"
                      value={newPlan.price === 0 ? '' : newPlan.price} 
                      onChange={(e) => setNewPlan({ ...newPlan, price: Number(e.target.value) })} 
                    />
                  </Field>
                  
                  <Field label="العملة">
                    <select 
                      value={newPlan.currency} 
                      onChange={(e) => setNewPlan({ ...newPlan, currency: e.target.value })}
                    >
                      <option value="EGP">EGP</option>
                      <option value="USD">USD</option>
                      <option value="SAR">SAR</option>
                    </select>
                  </Field>
                </div>

                <Field label="فترة الاشتراك (بالأشهر)">
                  <input 
                    required 
                    type="number"
                    min="1"
                    value={newPlan.billing_period_months === 0 ? '' : newPlan.billing_period_months} 
                    onChange={(e) => setNewPlan({ ...newPlan, billing_period_months: Number(e.target.value) })} 
                  />
                </Field>

                <div className="grid-2">
                  <Field label="الحد الأقصى للمستخدمين (0 لغير محدود)">
                    <div className="stack gap-4">
                      <input 
                        type="number"
                        min="0"
                        value={newPlan.max_users === 0 ? '' : newPlan.max_users} 
                        onChange={(e) => setNewPlan({ ...newPlan, max_users: Number(e.target.value) })} 
                      />
                      <span className="muted small">اتركه 0 إذا كانت الخطة غير محدودة</span>
                    </div>
                  </Field>
                  
                  <Field label="الحد الأقصى للفروع (0 لغير محدود)">
                    <input 
                      type="number"
                      min="0"
                      value={newPlan.max_branches === 0 ? '' : newPlan.max_branches} 
                      onChange={(e) => setNewPlan({ ...newPlan, max_branches: Number(e.target.value) })} 
                    />
                  </Field>
                </div>

                <div className="actions">
                  <button type="submit" className="button" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ الخطة'}
                  </button>
                </div>
              </form>
            </FormSection>
          </div>
        </div>
      ) : null}

      {editingPlan ? (
        <div className="dialog-overlay" role="presentation">
          <div className="dialog-shell" role="dialog" aria-modal="true" aria-label="تعديل الخطة">
            <FormSection title="تعديل الخطة" actions={<button type="button" className="button button-secondary" onClick={() => setEditingPlan(null)}>إغلاق</button>}>
              <form onSubmit={handleUpdate} className="stack gap-12">
                <Field label="الكود (إنجليزي)">
                  <input 
                    required 
                    value={editingPlan.code} 
                    onChange={(e) => setEditingPlan({ ...editingPlan, code: e.target.value })} 
                    dir="ltr"
                    className="ltr-input"
                  />
                </Field>
                <Field label="اسم الخطة">
                  <input 
                    required 
                    value={editingPlan.name} 
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })} 
                  />
                </Field>
                
                <div className="row gap-12" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <Field label="السعر">
                    <input 
                      required 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={editingPlan.price} 
                      onChange={(e) => setEditingPlan({ ...editingPlan, price: Number(e.target.value) })} 
                    />
                  </Field>
                  <Field label="العملة">
                    <select value={editingPlan.currency} onChange={(e) => setEditingPlan({ ...editingPlan, currency: e.target.value })} dir="ltr">
                      <option value="EGP">EGP</option>
                      <option value="USD">USD</option>
                      <option value="SAR">SAR</option>
                      <option value="AED">AED</option>
                    </select>
                  </Field>
                </div>

                <Field label="فترة الاشتراك (بالأشهر)">
                  <input 
                    required 
                    type="number" 
                    min="1"
                    value={editingPlan.billing_period_months} 
                    onChange={(e) => setEditingPlan({ ...editingPlan, billing_period_months: Number(e.target.value) })} 
                  />
                </Field>

                <div className="row gap-12" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <Field label="أقصى عدد مستخدمين (اختياري)">
                    <input 
                      type="number" 
                      min="0"
                      value={editingPlan.max_users || ''} 
                      onChange={(e) => setEditingPlan({ ...editingPlan, max_users: e.target.value ? Number(e.target.value) : null })} 
                      placeholder="غير محدود"
                    />
                  </Field>
                  <Field label="أقصى عدد فروع (اختياري)">
                    <input 
                      type="number" 
                      min="0"
                      value={editingPlan.max_branches || ''} 
                      onChange={(e) => setEditingPlan({ ...editingPlan, max_branches: e.target.value ? Number(e.target.value) : null })} 
                      placeholder="غير محدود"
                    />
                  </Field>
                </div>

                <Field label="حالة الخطة">
                  <label className="row gap-8 align-center">
                    <input 
                      type="checkbox" 
                      checked={editingPlan.is_active} 
                      onChange={(e) => setEditingPlan({ ...editingPlan, is_active: e.target.checked })} 
                    />
                    مفعلة (تظهر للعملاء)
                  </label>
                </Field>

                <div className="actions pt-12" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <button type="submit" className="button button-primary" disabled={updateMutation.isPending}>
                    حفظ التعديلات
                  </button>
                </div>
              </form>
            </FormSection>
          </div>
        </div>
      ) : null}

    </main>
  );
}
