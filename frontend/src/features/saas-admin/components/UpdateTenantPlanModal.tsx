import { XIcon, ShieldCheckIcon } from '@/shared/components/icons/AppIcons';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { saasAdminApi, SaasTenantRow } from '../api/saas-admin.api';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-message';
import { STANDARD_TIER_FEATURES } from '@/shared/system/DeveloperActivationPanel';

interface UpdateTenantPlanModalProps {
  tenant: SaasTenantRow | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

const VERTICAL_MODE_OPTIONS = [
  { value: 'wholesale', label: 'تجارة الجملة والوكلاء والتوزيع المؤسسي — [سيارات الفان والمناديب]', hint: 'إخفاء الكاشير وتفعيل أسطول الفان والمناديب' },
  { value: 'retail', label: 'التجزئة والمحلات والمتاجر العامة — [كاشير ونقاط بيع]', hint: 'نقاط البيع السريعة والباركود' },
  { value: 'contracting', label: 'المقاولات العامة والتطوير العقاري — [مشاريع ومستخلصات]', hint: 'المستخلصات وبنود المقايسة' },
  { value: 'maritime', label: 'الشحن والخدمات اللوجستية والموانئ — [حاويات وخطوط]', hint: 'تتبع الحاويات وأوامر الشحن' },
  { value: 'restaurant', label: 'المطاعم والكافيهات والأغذية — [طاولات ومطبخ KDS]', hint: 'شاشات المطبخ والطاولات' },
  { value: 'supermarket', label: 'السوبرماركت والبقالة — [ميزان وباركود وزني]', hint: 'ميزان إلكتروني وباركود' },
  { value: 'manufacturing', label: 'التصنيع الخفيف والورش — [أوامر تشغيل و BOM]', hint: 'قوائم المكونات وتكاليف الإنتاج' },
  { value: 'import_export', label: 'الاستيراد والتصدير — [شحنات وتكاليف جمركية]', hint: 'تكاليف الشحنات والجمارك' },
  { value: 'pharmacy', label: 'الصيدليات والمستلزمات الطبية — [تشغيلات FEFO]', hint: 'تواريخ الصلاحية والروشتات' },
  { value: 'services', label: 'الشركات الخدمية والاستشارية — [خدمات بلا مخزون]', hint: 'عقود خدمات ومتابعة عملاء' },
];

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
  const [activityType, setActivityType] = useState<string>('wholesale');
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
      if (raw.includes('wholesale') || raw.includes('توزيع') || raw.includes('فان') || raw.includes('جمل')) {
        setActivityType('wholesale');
      } else if (raw.includes('contracting') || raw.includes('مقاولات')) {
        setActivityType('contracting');
      } else if (raw.includes('maritime') || raw.includes('شحن')) {
        setActivityType('maritime');
      } else if (raw.includes('restaurant') || raw.includes('مطعم')) {
        setActivityType('restaurant');
      } else if (raw.includes('supermarket') || raw.includes('سوبر')) {
        setActivityType('supermarket');
      } else if (raw.includes('manufacturing') || raw.includes('تصنيع')) {
        setActivityType('manufacturing');
      } else if (raw.includes('import')) {
        setActivityType('import_export');
      } else if (raw.includes('pharmacy') || raw.includes('صيدل')) {
        setActivityType('pharmacy');
      } else if (raw.includes('service') || raw.includes('خدم')) {
        setActivityType('services');
      } else {
        setActivityType('retail');
      }
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

  const planOptions = [
    { value: '', label: '-- بدون باقة --' },
    ...(featurePlans.length > 0
      ? featurePlans.map((p: any) => ({ value: String(p.id), label: p.name }))
      : [
          { value: 'plan_basic', label: 'الأساسية' },
          { value: 'plan_pro', label: 'الاحترافية' },
          { value: 'plan_ultimate', label: 'المتكاملة (موصى بها للتوزيع والمقاولات)' },
          { value: 'plan_omnichannel', label: 'باقة التجارة الشاملة (Omnichannel Enterprise)' },
        ]),
  ];

  return (
    <DialogShell open={true} onClose={onClose} width="720px" ariaLabel="تحديث الباقة والمود القطاعي">
      <div className="dialog-card" dir="rtl">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && <div className="warning-box">{error}</div>}

          {/* تنبيه إرشادي يوضح الفرق بين الباقة والمود القطاعي */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderInlineStart: '4px solid #170e5e',
              borderRadius: '8px',
              padding: '12px 14px',
              fontSize: '12px',
              lineHeight: 1.6,
              color: '#334155',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#170e5e', marginBottom: '2px' }}>
              <ShieldCheckIcon size={15} color="#170e5e" />
              <span>توجيه إداري: الفرق بين نمط النشاط (المود القطاعي) والباقة</span>
            </div>
            <div>
              <strong>المود القطاعي:</strong> يحدد واجهة النظام والأقسام المتاحة (مثال: اختيار <em>تجارة الجملة والتوزيع</em> يُخفي الكاشير ويفعّل أسطول سيارات الفان وإدارة المناديب تلقائياً).<br />
              <strong>الباقة:</strong> رخصة سعة الحساب (الباقة الموصى بها للتوزيع هي <strong>المتكاملة</strong> أو <strong>التجارة الشاملة</strong>).
            </div>
          </div>

          {/* 1. نمط المنشأة والمود القطاعي */}
          <Field label="نمط المنشأة والمود القطاعي (Vertical Mode) *">
            <CustomSelect
              value={activityType}
              onChange={(val) => setActivityType(val)}
              options={VERTICAL_MODE_OPTIONS}
              style={{ height: '38px', fontWeight: 700, color: '#170e5e' }}
            />
          </Field>

          {/* 2. باقة الاشتراك */}
          <Field label="باقة الاشتراك والترخيص (Feature Plan) *">
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
          <div style={{ marginTop: '10px' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '13.5px', fontWeight: 800, color: '#1e293b' }}>
              الميزات الإضافية والمستثناة:
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#64748b' }}>
              يمكنك تفعيل ميزات إضافية يدوياً، أو استثناء ميزات متوفرة في الباقة المختارة.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px' }}>
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
                      background: isChecked ? '#f0fdf4' : '#f8fafc', 
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
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
