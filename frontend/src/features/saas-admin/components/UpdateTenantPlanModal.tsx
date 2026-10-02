import { XIcon, ShieldCheckIcon } from '@/shared/components/icons/AppIcons';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { saasAdminApi, SaasTenantRow } from '../api/saas-admin.api';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-message';
import { STANDARD_TIER_FEATURES } from '@/shared/system/DeveloperActivationPanel';

import {
  SYSTEM_VERTICAL_OPTIONS,
  normalizeVerticalKey,
  getPlansForVertical,
  getSystemVertical,
} from '@/shared/verticals/vertical-catalog';

interface UpdateTenantPlanModalProps {
  tenant: SaasTenantRow | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

const VERTICAL_MODE_OPTIONS = SYSTEM_VERTICAL_OPTIONS.map((v) => ({
  value: v.key,
  label: v.label,
  hint: `[${v.badge}]`,
}));

const AVAILABLE_FEATURES = [
  { id: 'catalog', name: 'المنتجات والأصناف' },
  { id: 'sales', name: 'المبيعات ونقاط البيع' },
  { id: 'sessions', name: 'ورديات العمل' },
  { id: 'cashDrawer', name: 'صندوق الكاشير والخزينة' },
  { id: 'purchases', name: 'المشتريات والموردين' },
  { id: 'inventory', name: 'المخزون المتقدم والجرد' },
  { id: 'reports', name: 'التقارير المتقدمة وسجل النشاط' },
  { id: 'hr', name: 'الموارد البشرية والرواتب' },
  { id: 'deliveryReps', name: 'مناديب التوصيل وسيارات الفان' },
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
  const [activityType, setActivityType] = useState<string>('retail');
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
      const raw = String(tenant.activityType || '').toLowerCase();
      const norm = normalizeVerticalKey(raw);
      setActivityType(norm);
      setExtraFeatures(tenant.extraFeatures || []);
      setError('');
    }
  }, [tenant]);

  const updateMutation = useMutation({
    mutationFn: () => saasAdminApi.updateTenantPlan(tenant!.id, {
      planId: planId || undefined,
      extraFeatures,
      activityType,
    }),
    onSuccess: async () => {
      onSuccess('تم تحديث نمط المنشأة والباقة والميزات بنجاح.');
      await queryClient.invalidateQueries({ queryKey: ['saas-admin-tenants'] });
      await queryClient.invalidateQueries({ queryKey: ['saas-tenants'] });
      onClose();
    },
    onError: (err) => setError(getFriendlyApiErrorMessage(err, 'حدث خطأ أثناء التحديث.')),
  });

  if (!tenant) return null;

  const currentVertical = getSystemVertical(activityType);
  const authorizedPlans = getPlansForVertical(activityType, featurePlans);

  const planOptions = [
    { value: '', label: '-- بدون باقة --' },
    ...authorizedPlans.map((p) => ({
      value: p.value,
      label: p.label,
      hint: p.badge ? `[${p.badge}]` : undefined,
    })),
  ];

  // Preserve legacy plan if tenant had one previously not matching current band
  if (planId && !planOptions.some((o) => o.value === planId)) {
    const legacyPlan = featurePlans.find((p: any) => String(p.id) === planId);
    planOptions.push({
      value: planId,
      label: legacyPlan ? `${legacyPlan.name} (باقة مسجلة حالياً)` : `${planId} (باقة مسجلة حالياً)`,
    });
  }

  const handleVerticalChange = (newVerticalKey: string) => {
    setActivityType(newVerticalKey);
    const validPlans = getPlansForVertical(newVerticalKey, featurePlans);
    const isValid = validPlans.some((p) => p.value === planId);
    if (!isValid) {
      const rec = validPlans.find((p) => p.isRecommended) || validPlans[1] || validPlans[0];
      if (rec) {
        setPlanId(rec.value);
        setExtraFeatures([]);
      }
    }
  };

  const toggleFeature = (featId: string) => {
    setExtraFeatures(prev => {
      const isBaseIncluded = selectedPlanFeatures.includes(featId);
      
      if (isBaseIncluded) {
        if (prev.includes(`-${featId}`)) {
          return prev.filter(f => f !== `-${featId}`);
        } else {
          return [...prev, `-${featId}`];
        }
      } else {
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
    <DialogShell open={true} onClose={onClose} width="min(940px, 95vw)" ariaLabel="تحديث الباقة والمود القطاعي">
      <div className="dialog-card" dir="rtl" style={{ maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexShrink: 0 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#170c5c' }}>
              تحديث نمط المنشأة وباقة النسخة
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
              المنشأة: <strong style={{ color: '#0f172a' }}>{tenant.businessName || tenant.slug}</strong> ({tenant.slug})
            </p>
          </div>
          <button
            type="button"
            className="dialog-shell-close-btn"
            onClick={onClose}
            title="إغلاق"
          ><XIcon size={15} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: 1, paddingInlineEnd: '4px' }}>
          {error && <div className="warning-box">{error}</div>}

          {/* تنبيه إرشادي يوضح خصائص النمط النشط وعزله الصارم */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderInlineStart: '4px solid #170e5e',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '12px',
              lineHeight: 1.6,
              color: '#334155',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#170e5e', marginBottom: '4px' }}>
              <ShieldCheckIcon size={15} color="#170e5e" />
              <span>دستور العزل والأنماط المؤسسية المعتمد ({currentVertical.groupLabel})</span>
            </div>
            <div>
              <strong>النمط المختار:</strong> {currentVertical.label} — <em>[{currentVertical.badge}]</em><br />
              <strong>الأقسام والصلاحيات:</strong> {currentVertical.description}<br />
              <span style={{ color: '#059669', fontWeight: 600 }}>
                {currentVertical.band === 5
                  ? 'يتم عزل هذا القطاع عزلاً تاماً (حجب نقاط بيع التجزئة، موازين الباركود، والمتجر السحابي على الكمبيوتر والموبايل).'
                  : currentVertical.key === 'wholesale'
                  ? 'يتم حجب كاشير التجزئة السريع وتفعيل أسطول التوزيع الفان والمبيعات الآجلة.'
                  : 'تقتصر خيارات الباقات تلقائياً على باقات ومستويات هذا النمط التشغيلي مع تفعيل نقطة البيع والكاشير السريع.'}
              </span>
            </div>
          </div>

          {/* 1. نمط المنشأة والمود القطاعي */}
          <Field label="نمط المنشأة والمود القطاعي (Vertical Mode) *">
            <CustomSelect
              value={activityType}
              onChange={(val) => handleVerticalChange(val)}
              options={VERTICAL_MODE_OPTIONS}
              style={{ height: '38px', fontWeight: 700, color: '#170e5e' }}
            />
          </Field>

          {/* 2. باقة الاشتراك */}
          <Field label="باقة الاشتراك والترخيص المتوافقة مع النمط (Feature Plan) *">
            <CustomSelect
              value={planId}
              onChange={(val) => {
                setPlanId(val);
                setExtraFeatures([]);
              }}
              options={planOptions}
              style={{ height: '38px', fontWeight: 700, color: '#170e5e' }}
            />
          </Field>

          {/* 3. الميزات الإضافية */}
          <div style={{ marginTop: '6px' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '13.5px', fontWeight: 800, color: '#1e293b' }}>
              الميزات الإضافية والمستثناة:
            </h4>
            <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#64748b' }}>
              يمكنك تفعيل ميزات إضافية يدوياً، أو استثناء ميزات متوفرة في الباقة المختارة.
            </p>
            
            <div 
              className="thin-scrollbar"
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
                gap: '8px',
                maxHeight: '260px',
                overflowY: 'auto',
                padding: '6px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
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
                      gap: '8px', 
                      cursor: 'pointer', 
                      opacity: isExcluded ? 0.6 : 1, 
                      padding: '8px 10px', 
                      background: isChecked ? '#f0fdf4' : '#ffffff', 
                      borderRadius: '8px', 
                      border: `1px solid ${isChecked ? '#bbf7d0' : '#e2e8f0'}`,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={isChecked} 
                      onChange={() => toggleFeature(feat.id)}
                      style={{ width: '15px', height: '15px', margin: 0, flexShrink: 0 }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: isChecked ? '#065f46' : '#334155' }}>
                        {feat.name}
                      </span>
                      {isBaseIncluded && !isExcluded && <span style={{ fontSize: '10.5px', color: '#10b981', fontWeight: 600 }}>(متوفرة في الباقة)</span>}
                      {isBaseIncluded && isExcluded && <span style={{ fontSize: '10.5px', color: '#ef4444', fontWeight: 600 }}>(مستثناة من الباقة)</span>}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
          <button type="button" className="button button-secondary" onClick={onClose} disabled={updateMutation.isPending}>إلغاء</button>
          <button 
            type="button" 
            className="button button-primary" 
            onClick={() => updateMutation.mutate()} 
            disabled={updateMutation.isPending}
            style={{ fontWeight: 800, background: '#170e5e', color: '#ffffff' }}
          >
            {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
        </div>
      </div>
    </DialogShell>
  );
}
