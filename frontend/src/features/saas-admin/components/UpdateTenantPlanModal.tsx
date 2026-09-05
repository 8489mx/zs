import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Field } from '@/shared/ui/field';
import { saasAdminApi, SaasTenantRow } from '../api/saas-admin.api';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-message';

import { STANDARD_TIER_FEATURES } from '@/shared/system/DeveloperActivationPanel';

interface UpdateTenantPlanModalProps {
  tenant: SaasTenantRow | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

const AVAILABLE_FEATURES = [
  { id: 'catalog', name: 'المنتجات والأصناف' },
  { id: 'sales', name: 'المبيعات ونقاط البيع' },
  { id: 'sessions', name: 'ورديات العمل' },
  { id: 'cashDrawer', name: 'صندوق الكاشير والخزينة' },
  { id: 'purchases', name: 'المشتريات والموردين' },
  { id: 'inventory', name: 'المخزون المتقدم والجرد' },
  { id: 'reports', name: 'التقارير المتقدمة وسجل النشاط' },
  { id: 'hr', name: 'الموارد البشرية والرواتب' },
  { id: 'deliveryReps', name: 'مناديب التوصيل' },
  { id: 'loyalty', name: 'محرك نقاط وولاء العملاء' },
  { id: 'maintenance', name: 'إدارة الصيانة وتتبع السيريال (IMEI)' },
  { id: 'clothing', name: 'المتغيرات والمقاسات والألوان' },
  { id: 'restaurant', name: 'المطاعم والكافيهات والطاولات' },
  { id: 'accounting', name: 'الحسابات العامة وشجرة الحسابات' },
  { id: 'fixed_assets', name: 'إدارة وإهلاك الأصول الثابتة' },
  { id: 'installments', name: 'مبيعات وجدولة التقسيط' },
  { id: 'taxIntegration', name: 'الربط الضريبي والفاتورة الإلكترونية' },
  { id: 'vat_declaration', name: 'الإقرار الضريبي (ن10 و ZATCA)' },
  { id: 'manufacturing', name: 'التصنيع وقوائم المواد وأوامر الإنتاج' },
  { id: 'import', name: 'الاستيراد والشراكة والحاويات' },
  { id: 'pharmacy', name: 'الصيدليات والأدوية والروشتات' },
  { id: 'storefront', name: 'المتجر الإلكتروني وطلبات الأونلاين' },
];

export function UpdateTenantPlanModal({ tenant, onClose, onSuccess }: UpdateTenantPlanModalProps) {
  const queryClient = useQueryClient();
  const [planId, setPlanId] = useState<string>('');
  const [extraFeatures, setExtraFeatures] = useState<string[]>([]);
  const [error, setError] = useState('');

  const featurePlansQuery = useQuery({
    queryKey: ['saas-feature-plans'],
    queryFn: () => saasAdminApi.listFeaturePlans(),
    staleTime: 0,
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

  const selectedPlanFeatures = STANDARD_TIER_FEATURES[planId]
    || featurePlans.find(p => String(p.id) === planId)?.features 
    || [];

  return (
    <DialogShell open={true} onClose={onClose} width="700px" ariaLabel="تحديث الباقة والميزات">
      <div className="dialog-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              تحديث باقة النسخة
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
              {tenant.businessName || tenant.slug}
            </p>
          </div>
          <button
            type="button"
            className="dialog-shell-close-btn"
            onClick={onClose}
            title="إغلاق"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {error && <div className="warning-box">{error}</div>}
          
          <Field label="الباقة (الميزات الأساسية)">
            <select value={planId} onChange={(e) => {
              setPlanId(e.target.value);
              setExtraFeatures([]);
            }}>
              <option value="">-- بدون باقة --</option>
              {(featurePlans.length > 0 ? featurePlans : [
                { id: 'plan_basic', name: 'الأساسية' },
                { id: 'plan_pro', name: 'الاحترافية' },
                { id: 'plan_ultimate', name: 'المتكاملة' },
                { id: 'plan_omnichannel', name: 'باقة التجارة الشاملة (Omnichannel Enterprise)' },
              ]).map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>

          <div style={{ marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14.5px', fontWeight: 800, color: '#1e293b' }}>
              الميزات الإضافية والمستثناة:
            </h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: '#64748b' }}>
              يمكنك تفعيل ميزات إضافية، أو استثناء ميزات أساسية متوفرة في الباقة المختارة.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
              {AVAILABLE_FEATURES.map((feat) => {
                const isBaseIncluded = selectedPlanFeatures.includes(feat.id);
                const isExcluded = extraFeatures.includes(`-${feat.id}`);
                const isExtraIncluded = extraFeatures.includes(feat.id);
                
                const isChecked = (isBaseIncluded && !isExcluded) || isExtraIncluded;

                return (
                  <label 
                    key={feat.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px', 
                      cursor: 'pointer', 
                      opacity: isExcluded ? 0.6 : 1, 
                      padding: '10px 12px', 
                      background: isChecked ? '#f0fdf4' : '#f8fafc', 
                      borderRadius: '8px', 
                      border: `1px solid ${isChecked ? '#bbf7d0' : '#e2e8f0'}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={isChecked} 
                      onChange={() => toggleFeature(feat.id)}
                      style={{ width: '16px', height: '16px', margin: 0, flexShrink: 0 }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: isChecked ? '#065f46' : '#334155' }}>
                        {feat.name}
                      </span>
                      {isBaseIncluded && !isExcluded && <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>(متوفرة في الباقة)</span>}
                      {isBaseIncluded && isExcluded && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>(مستثناة من الباقة)</span>}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" className="button button-secondary" onClick={onClose} disabled={updateMutation.isPending}>إلغاء</button>
          <button 
            type="button" 
            className="button button-primary" 
            onClick={() => updateMutation.mutate()} 
            disabled={updateMutation.isPending}
            style={{ fontWeight: 800 }}
          >
            {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
        </div>
      </div>
    </DialogShell>
  );
}
