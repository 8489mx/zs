import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '@/lib/http';
import { DialogShell } from '@/shared/components/dialog-shell';
import { FormSection } from '@/shared/components/form-section';
import { Field } from '@/shared/ui/field';
import { saasAdminApi } from '@/features/saas-admin/api/saas-admin.api';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-message';

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

export function DeveloperActivationPanel() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  
  const [masterPassword, setMasterPassword] = useState('');
  const [planId, setPlanId] = useState('');
  const [extraFeatures, setExtraFeatures] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Listen for Ctrl+Alt+Shift+L
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.shiftKey && (e.code === 'KeyL' || e.key.toLowerCase() === 'l')) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const featurePlansQuery = useQuery({
    queryKey: ['saas-feature-plans'],
    queryFn: () => saasAdminApi.listFeaturePlans(),
    enabled: open,
  });
  const featurePlans = featurePlansQuery.data || [];

  const updateMutation = useMutation({
    mutationFn: () => http<{ ok: boolean }>('/api/developer/update-plan', { 
      method: 'POST', 
      body: JSON.stringify({ masterPassword, planId, extraFeatures }) 
    }),
    onSuccess: async () => {
      setSuccessMsg('تم تفعيل الباقة والميزات بنجاح!');
      setError('');
      setMasterPassword('');
      await queryClient.invalidateQueries({ queryKey: ['current-tenant'] });
      // Close after 2 seconds
      setTimeout(() => setOpen(false), 2000);
    },
    onError: (err) => {
      setError(getFriendlyApiErrorMessage(err, 'كلمة المرور غير صحيحة أو حدث خطأ'));
      setSuccessMsg('');
    },
  });

  if (!open) return null;

  const toggleFeature = (featId: string) => {
    setExtraFeatures(prev => 
      prev.includes(featId) ? prev.filter(f => f !== featId) : [...prev, featId]
    );
  };

  const selectedPlanFeatures = featurePlans.find(p => String(p.id) === planId)?.features || [];

  return (
    <DialogShell open={open} onClose={() => setOpen(false)} ariaLabel="إعدادات ترخيص النظام (وضع المطور)">
      <FormSection 
        title="إعدادات ترخيص النظام (للمطورين فقط)"
        actions={
          <>
            <button type="button" className="button button-secondary" onClick={() => setOpen(false)} disabled={updateMutation.isPending}>إغلاق</button>
            <button 
              type="button" 
              className="button button-primary" 
              onClick={() => updateMutation.mutate()} 
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'جاري التفعيل...' : 'تفعيل'}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          {error && <div className="warning-box">{error}</div>}
          {successMsg && <div className="success-box" style={{ background: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '4px' }}>{successMsg}</div>}
          
          <div className="grid-1">
            <Field label="كلمة مرور المطور (Master Password)">
              <input 
                type="password" 
                value={masterPassword} 
                onChange={(e) => setMasterPassword(e.target.value)} 
                placeholder="أدخل كلمة المرور السرية" 
              />
            </Field>
          </div>

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
            <h3 className="font-bold mb-3">الميزات الإضافية المستثناة:</h3>
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
