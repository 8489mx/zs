import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { FormSection } from '@/shared/components/form-section';
import { Field } from '@/shared/ui/field';
import { saasAdminApi, SaasTenantRow } from '../api/saas-admin.api';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-message';

interface UpdateTenantPlanModalProps {
  tenant: SaasTenantRow | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

const AVAILABLE_FEATURES = [
  { id: 'catalog', name: 'المنتجات' },
  { id: 'sales', name: 'المبيعات' },
  { id: 'sessions', name: 'ورديات العمل' },
  { id: 'cashDrawer', name: 'صندوق الكاشير' },
  { id: 'purchases', name: 'المشتريات' },
  { id: 'inventory', name: 'المخزون المتقدم' },
  { id: 'reports', name: 'التقارير المتقدمة' },
  { id: 'hr', name: 'الموارد البشرية' },
  { id: 'manufacturing', name: 'التصنيع' },
  { id: 'accounting', name: 'الحسابات العامة' },
  { id: 'deliveryReps', name: 'مناديب التوصيل' },
  { id: 'taxIntegration', name: 'الربط الضريبي' },
];

export function UpdateTenantPlanModal({ tenant, onClose, onSuccess }: UpdateTenantPlanModalProps) {
  const queryClient = useQueryClient();
  const [planId, setPlanId] = useState<string>('');
  const [extraFeatures, setExtraFeatures] = useState<string[]>([]);
  const [error, setError] = useState('');

  const plansQuery = useQuery({
    queryKey: ['saas-plans'],
    queryFn: () => saasAdminApi.listPlans(),
  });
  const plans = plansQuery.data || [];

  useEffect(() => {
    if (tenant) {
      setPlanId(tenant.planId || '');
      setExtraFeatures(tenant.extraFeatures || []);
      setError('');
    }
  }, [tenant]);

  const updateMutation = useMutation({
    mutationFn: () => saasAdminApi.updateTenantPlan(tenant!.id, { planId: planId || undefined, extraFeatures }),
    onSuccess: async () => {
      onSuccess('تم تحديث الباقة والميزات بنجاح.');
      await queryClient.invalidateQueries({ queryKey: ['saas-admin-tenants'] });
      onClose();
    },
    onError: (err) => setError(getFriendlyApiErrorMessage(err, 'حدث خطأ أثناء تحديث الباقة.')),
  });

  if (!tenant) return null;

  const toggleFeature = (featId: string) => {
    setExtraFeatures(prev => 
      prev.includes(featId) ? prev.filter(f => f !== featId) : [...prev, featId]
    );
  };

  const selectedPlanFeatures = plans.find(p => String(p.id) === planId)?.features || [];

  return (
    <DialogShell open={true} onClose={onClose} ariaLabel="تحديث الباقة والميزات">
      <FormSection 
        title={`تحديث باقة النسخة: ${tenant.businessName || tenant.slug}`}
        actions={
          <>
            <button type="button" className="button button-secondary" onClick={onClose} disabled={updateMutation.isPending}>إلغاء</button>
            <button 
              type="button" 
              className="button button-primary" 
              onClick={() => updateMutation.mutate()} 
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          {error && <div className="warning-box">{error}</div>}
          
          <div className="grid-2">
            <Field label="الباقة الحالية">
              <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
                <option value="">-- بدون باقة --</option>
                <option value="plan_basic">الأساسية</option>
                <option value="plan_pro">الاحترافية</option>
                <option value="plan_ultimate">المتكاملة</option>
                {/* Fallback for plans from DB if any */}
                {plans.filter(p => !['plan_basic', 'plan_pro', 'plan_ultimate'].includes(String(p.id))).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <h3 className="font-bold mb-3">الميزات الإضافية المستثناة لهذه النسخة:</h3>
            <p className="muted small mb-4">هذه الميزات ستكون مفعلة للنسخة حتى لو لم تكن متوفرة في باقتها الأساسية.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {AVAILABLE_FEATURES.map((feat) => {
                const isIncludedInPlan = selectedPlanFeatures.includes(feat.id);
                return (
                  <label key={feat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isIncludedInPlan ? 'not-allowed' : 'pointer', opacity: isIncludedInPlan ? 0.6 : 1 }}>
                    <input 
                      type="checkbox" 
                      checked={isIncludedInPlan || extraFeatures.includes(feat.id)} 
                      onChange={() => toggleFeature(feat.id)}
                      disabled={isIncludedInPlan}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span>{feat.name} {isIncludedInPlan && <small className="muted">(متوفرة في الباقة)</small>}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </FormSection>
    </DialogShell>
  );
}
