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

  const featurePlansQuery = useQuery({
    queryKey: ['saas-feature-plans'],
    queryFn: () => saasAdminApi.listFeaturePlans(),
  });
  const featurePlans = featurePlansQuery.data || [];

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
      onSuccess('تم تحديث الخطة والميزات بنجاح.');
      await queryClient.invalidateQueries({ queryKey: ['saas-admin-tenants'] });
      onClose();
    },
    onError: (err) => setError(getFriendlyApiErrorMessage(err, 'حدث خطأ أثناء التحديث.')),
  });

  if (!tenant) return null;

  const toggleFeature = (featId: string) => {
    setExtraFeatures(prev => {
      const isBaseIncluded = selectedPlanFeatures.includes(featId);
      
      if (isBaseIncluded) {
        // If it's in the base plan, we negate it to exclude it
        if (prev.includes(`-${featId}`)) {
          return prev.filter(f => f !== `-${featId}`); // Re-include it
        } else {
          return [...prev, `-${featId}`]; // Exclude it
        }
      } else {
        // Normal extra feature logic
        if (prev.includes(featId)) {
          return prev.filter(f => f !== featId);
        } else {
          return [...prev, featId];
        }
      }
    });
  };

  const selectedPlanFeatures = featurePlans.find(p => String(p.id) === planId)?.features || [];

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
            <Field label="الباقة (الميزات الأساسية)">
              <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
                <option value="">-- بدون باقة --</option>
                {featurePlans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <h3 className="font-bold mb-3">الميزات الإضافية والمستثناة لهذه النسخة:</h3>
            <p className="muted small mb-4">يمكنك تفعيل ميزات إضافية أو استثناء ميزات أساسية من الباقة المختارة.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {AVAILABLE_FEATURES.map((feat) => {
                const isBaseIncluded = selectedPlanFeatures.includes(feat.id);
                const isExcluded = extraFeatures.includes(`-${feat.id}`);
                const isExtraIncluded = extraFeatures.includes(feat.id);
                
                const isChecked = (isBaseIncluded && !isExcluded) || isExtraIncluded;

                return (
                  <label key={feat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', opacity: isExcluded ? 0.6 : 1 }}>
                    <input 
                      type="checkbox" 
                      checked={isChecked} 
                      onChange={() => toggleFeature(feat.id)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span>
                      {feat.name}{' '}
                      {isBaseIncluded && !isExcluded && <small className="muted">(متوفرة في الباقة)</small>}
                      {isBaseIncluded && isExcluded && <small style={{ color: 'var(--danger, #dc2626)' }}>(مستثناة من الباقة)</small>}
                    </span>
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
