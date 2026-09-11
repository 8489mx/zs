import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Field } from '@/shared/ui/field';
import { XIcon } from '@/shared/components/icons/AppIcons';
import { formatDate } from '@/lib/format';
import { saasAdminApi, SaasTenantRow } from '../api/saas-admin.api';

export interface CreateTrialTenantModalProps {
  open: boolean;
  onClose: () => void;
  featurePlans: any[];
  onShareWelcome: (data: { tenant: SaasTenantRow; temporaryPassword?: string; username: string }) => void;
  onSuccessFeedback?: (message: string) => void;
}

const INDUSTRY_MODE_OPTIONS = [
  { value: 'contracting', label: 'المقاولات والمشاريع الإنشائية والهندسية (ERP)', badge: 'مود المقاولات' },
  { value: 'maritime', label: 'الشحن البحري والتوكيلات اللوجستية والموانئ', badge: 'مود الشحن' },
  { value: 'supermarket', label: 'السوبرماركت والبقالة والمواد الغذائية', badge: 'كاشير وميزان' },
  { value: 'spices', label: 'العطارة والمحامص والمطاحن والبهارات', badge: 'خلطات وميزان' },
  { value: 'retail', label: 'التجزئة والمحلات والمتاجر العامة', badge: 'تجزئة سريعة' },
  { value: 'fashion', label: 'الملابس والأزياء والأحذية والشنط', badge: 'مقاسات وألوان' },
  { value: 'pharmacy', label: 'الصيدليات والمستلزمات الطبية والعلاجية', badge: 'تشغيلات FEFO' },
  { value: 'electronics', label: 'الموبايل والإلكترونيات ومراكز الصيانة', badge: 'صيانة وسيريال' },
  { value: 'restaurant', label: 'المطاعم والكافيهات والأغذية المجهزة', badge: 'طاولات ومطبخ KDS' },
  { value: 'services', label: 'الشركات والمكاتب الخدمية والاستشارية', badge: 'خدمات بلا مخزون' },
  { value: 'wholesale', label: 'تجارة الجملة والوكلاء والتوزيع المؤسسي', badge: 'موزعون وآجل' },
  { value: 'manufacturing', label: 'التصنيع الخفيف والمعامل والورش', badge: 'تكاليف و BOM' },
];

const initialForm = {
  slug: '',
  businessName: '',
  branchName: '',
  ownerName: '',
  ownerPhone: '',
  ownerEmail: '',
  activityType: 'التجزئة والمحلات والمتاجر العامة',
  businessIndustry: 'retail',
  username: '',
  password: '',
  days: '14',
  source: '',
  campaign: '',
  notes: '',
  featurePlanId: 'plan_ultimate',
};

export function CreateTrialTenantModal({
  open,
  onClose,
  featurePlans,
  onShareWelcome,
  onSuccessFeedback,
}: CreateTrialTenantModalProps) {
  const queryClient = useQueryClient();
  const [createForm, setCreateForm] = useState(initialForm);
  const [createResult, setCreateResult] = useState<{
    username: string;
    temporaryPassword?: string;
    trialEndsAt: string;
    tenantSlug: string;
    businessName?: string;
    fullTenant?: SaasTenantRow;
  } | null>(null);

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (onSuccessFeedback) onSuccessFeedback('تم نسخ النص إلى الحافظة بنجاح.');
    }
  };

  const createTrialMutation = useMutation({
    mutationFn: () => saasAdminApi.createTrialTenant({
      slug: createForm.slug.trim(),
      businessName: createForm.businessName.trim(),
      branchName: createForm.branchName?.trim() || undefined,
      ownerName: createForm.ownerName.trim(),
      ownerPhone: createForm.ownerPhone.trim(),
      ownerEmail: createForm.ownerEmail?.trim() || undefined,
      activityType: createForm.activityType?.trim() || undefined,
      businessIndustry: createForm.businessIndustry,
      username: createForm.username.trim() || 'admin',
      password: createForm.password || undefined,
      days: Number(createForm.days || 14),
      source: createForm.source || undefined,
      campaign: createForm.campaign || undefined,
      notes: createForm.notes || undefined,
      featurePlanId: createForm.featurePlanId || 'plan_ultimate',
    }),
    onSuccess: async (payload) => {
      void queryClient.invalidateQueries({ queryKey: ['saas-tenants'] });
      const fullTenantWithDetails: SaasTenantRow = {
        ...payload.tenant,
        ownerUsername: payload.owner.username,
        planName: payload.tenant.planName || (createForm.featurePlanId === 'plan_ultimate' ? 'المتكاملة' : createForm.featurePlanId === 'plan_pro' ? 'المتقدمة' : 'الأساسية'),
      } as any;
      setCreateResult({
        username: payload.owner.username,
        temporaryPassword: payload.owner.temporaryPassword,
        trialEndsAt: payload.tenant.trialEndsAt || '',
        tenantSlug: payload.tenant.slug,
        businessName: payload.tenant.businessName,
        fullTenant: fullTenantWithDetails,
      });
      if (onSuccessFeedback) onSuccessFeedback('تم إنشاء النسخة التجريبية بنجاح.');
      setCreateForm(initialForm);
    },
  });

  const handleClose = () => {
    setCreateResult(null);
    onClose();
  };

  if (!open) return null;

  return (
    <DialogShell
      open={open}
      onClose={handleClose}
      width="840px"
      shellClassName="saas-create-modal-shell"
      ariaLabel="إنشاء نسخة تجريبية جديدة"
    >
      <div className="dialog-card saas-compact-dialog-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              إنشاء نسخة تجريبية جديدة
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
              إدخال بيانات المنشأة والمالك لتوليد نسخة سحابية فورية بحساب كامل الصلاحيات.
            </p>
          </div>
          <button
            type="button"
            style={{
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#64748b',
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 700,
              lineHeight: 1,
            }}
            onClick={handleClose}
            title="إغلاق"
          >
            <XIcon size={14} />
          </button>
        </div>

        {createResult ? (
          <div className="saas-credentials-luxury-card">
            {/* 1. Header with Success Badge and Business Title */}
            <div className="saas-credentials-hero">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="saas-credentials-icon-box">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
                      تم تجهيز النسخة السحابية بنجاح
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                      المنشأة: <strong style={{ color: '#0f172a' }}>{createResult.businessName || createResult.tenantSlug}</strong>
                    </div>
                  </div>
                </div>
                <span className="tenant-status-pill trial" style={{ fontSize: '11px', padding: '3px 10px', fontWeight: 800 }}>
                  تجريبي • 14 يوماً
                </span>
              </div>
            </div>

            {/* 2. Credentials Grid */}
            <div className="saas-credentials-grid">
              {/* Slug */}
              <div className="saas-credential-box">
                <span className="saas-credential-label">المعرف السحابي (Slug)</span>
                <div className="saas-credential-content">
                  <code className="saas-credential-code">{createResult.tenantSlug}</code>
                  <button type="button" className="saas-copy-btn" onClick={() => copyToClipboard(createResult.tenantSlug || '')}>نسخ</button>
                </div>
              </div>

              {/* Username */}
              <div className="saas-credential-box">
                <span className="saas-credential-label">اسم مستخدم المالك (Super Admin)</span>
                <div className="saas-credential-content">
                  <code className="saas-credential-code">{createResult.username}</code>
                  <button type="button" className="saas-copy-btn" onClick={() => copyToClipboard(createResult.username || '')}>نسخ</button>
                </div>
              </div>

              {/* Temporary Password */}
              <div className="saas-credential-box" style={{ gridColumn: 'span 2' }}>
                <span className="saas-credential-label">كلمة المرور المؤقتة (Temporary Password)</span>
                <div className="saas-credential-content">
                  <code className="saas-credential-code password-highlight">{createResult.temporaryPassword}</code>
                  <button type="button" className="saas-copy-btn" onClick={() => copyToClipboard(createResult.temporaryPassword || '')}>نسخ كلمة المرور</button>
                </div>
              </div>

              {/* Expiry Date */}
              <div className="saas-credential-box" style={{ gridColumn: 'span 2' }}>
                <span className="saas-credential-label">تاريخ انتهاء الفترة التجريبية</span>
                <div className="saas-credential-content">
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                    {formatDate(createResult.trialEndsAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Action Bar */}
            <div className="saas-credentials-actions">
              {createResult.fullTenant && (
                <button
                  type="button"
                  className="saas-whatsapp-action-btn"
                  onClick={() => {
                    onShareWelcome({
                      tenant: {
                        ...createResult.fullTenant!,
                        ownerUsername: createResult.username,
                      },
                      temporaryPassword: createResult.temporaryPassword,
                      username: createResult.username,
                    });
                    handleClose();
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  <span>مشاركة رسالة الترحيب عبر واتساب</span>
                </button>
              )}

              <button
                type="button"
                className="saas-copy-all-btn"
                onClick={() => {
                  const allText = `بيانات الدخول للنسخة السحابية:\nاسم المنشأة: ${createResult.businessName || createResult.tenantSlug}\nالمعرف: ${createResult.tenantSlug}\nاسم المستخدم: ${createResult.username}\nكلمة المرور المؤقتة: ${createResult.temporaryPassword}\nصلاحية التجربة حتى: ${formatDate(createResult.trialEndsAt)}`;
                  copyToClipboard(allText);
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  <span>نسخ كامل البيانات</span>
                </span>
              </button>

              <button
                type="button"
                className="saas-close-action-btn"
                onClick={handleClose}
              >
                إغلاق
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); createTrialMutation.mutate(); }}>
            {/* 1. النشاط التجاري */}
            <div className="saas-modal-card">
              <div className="saas-modal-card-title">
                <span>1. بيانات النشاط التجاري</span>
              </div>
              <div className="saas-modal-grid-3">
                <Field label="اسم النشاط / المحل *">
                  <input
                    type="text"
                    required
                    value={createForm.businessName}
                    onChange={(e) => setCreateForm((s) => ({ ...s, businessName: e.target.value }))}
                    placeholder="مثال: سوبر ماركت النور"
                  />
                </Field>
                <Field label="المعرف السحابي (Slug - إنجليزي فقط) *">
                  <input
                    type="text"
                    required
                    value={createForm.slug}
                    onChange={(e) => setCreateForm((s) => ({ ...s, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))}
                    placeholder="مثال: al-nour-market"
                    dir="ltr"
                  />
                </Field>
                <Field label="نمط المنشأة والمود القطاعي (Vertical Mode) *">
                  <select
                    value={createForm.businessIndustry}
                    onChange={(e) => {
                      const val = e.target.value;
                      const found = INDUSTRY_MODE_OPTIONS.find((opt) => opt.value === val);
                      setCreateForm((s) => ({
                        ...s,
                        businessIndustry: val,
                        activityType: found ? found.label : s.activityType,
                      }));
                    }}
                    style={{
                      fontWeight: 700,
                      color: '#170e5e',
                      backgroundColor: '#f8fafc',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      fontSize: '13px',
                      width: '100%',
                    }}
                  >
                    {INDUSTRY_MODE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} — [{opt.badge}]
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="الوصف التجاري للنشاط">
                  <input
                    type="text"
                    value={createForm.activityType}
                    onChange={(e) => setCreateForm((s) => ({ ...s, activityType: e.target.value }))}
                    placeholder="مثال: مقاولات عامة وتطوير عقاري، سوبرماركت..."
                  />
                </Field>
                <Field label="اسم الفرع الأولي (اختياري)">
                  <input
                    type="text"
                    value={createForm.branchName}
                    onChange={(e) => setCreateForm((s) => ({ ...s, branchName: e.target.value }))}
                    placeholder="مثال: فرع التعاونيات (افتراضي: الفرع الرئيسي)"
                  />
                </Field>
              </div>
            </div>

            {/* 2. بيانات المالك والدخول */}
            <div className="saas-modal-card">
              <div className="saas-modal-card-title">
                <span>2. بيانات المالك وحساب الإدارة</span>
              </div>
              <div className="saas-modal-grid-3">
                <Field label="اسم المالك *">
                  <input
                    type="text"
                    required
                    value={createForm.ownerName}
                    onChange={(e) => setCreateForm((s) => ({ ...s, ownerName: e.target.value }))}
                    placeholder="مثال: محمد أحمد"
                  />
                </Field>
                <Field label="رقم هاتف المالك *">
                  <input
                    type="text"
                    required
                    value={createForm.ownerPhone}
                    onChange={(e) => setCreateForm((s) => ({ ...s, ownerPhone: e.target.value }))}
                    placeholder="مثال: 01018017523"
                    dir="auto"
                  />
                </Field>
                <Field label="البريد الإلكتروني (اختياري)">
                  <input
                    type="email"
                    value={createForm.ownerEmail}
                    onChange={(e) => setCreateForm((s) => ({ ...s, ownerEmail: e.target.value }))}
                    placeholder="owner@example.com"
                    dir="ltr"
                  />
                </Field>
              </div>
              <div className="saas-modal-grid-2" style={{ marginTop: '6px' }}>
                <Field label="اسم المستخدم">
                  <input
                    type="text"
                    value={createForm.username}
                    onChange={(e) => setCreateForm((s) => ({ ...s, username: e.target.value }))}
                    placeholder="افتراضي: admin"
                    dir="ltr"
                  />
                </Field>
                <Field label="كلمة المرور">
                  <input
                    type="text"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((s) => ({ ...s, password: e.target.value }))}
                    placeholder="فارغ = توليد تلقائي"
                    dir="ltr"
                  />
                </Field>
              </div>
            </div>

            {/* 3 & 4. باقة التجربة والمتابعة */}
            <div className="saas-modal-dual-cards">
              <div className="saas-modal-card">
                <div className="saas-modal-card-title">
                  <span>3. باقة التجربة والميزات</span>
                </div>
                <Field label="خطة الميزات المفعلة للنسخة *">
                  <select
                    value={createForm.featurePlanId}
                    onChange={(e) => setCreateForm((s) => ({ ...s, featurePlanId: e.target.value }))}
                    style={{ fontWeight: 700, width: '100%' }}
                  >
                    <option value="plan_ultimate">المتكاملة (الباقة الشاملة - كافة الميزات)</option>
                    <option value="plan_pro">الاحترافية (المبيعات، المخازن، الحسابات)</option>
                    <option value="plan_basic">الأساسية (نقطة البيع، الكاشير، المخزون)</option>
                    {(featurePlans || [])
                      .filter((p: any) => !['plan_ultimate', 'plan_pro', 'plan_basic'].includes(p.id))
                      .map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                  </select>
                </Field>
                <div style={{ marginTop: '6px' }}>
                  <Field label="مدة التجربة (أيام)">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={createForm.days}
                      onChange={(e) => setCreateForm((s) => ({ ...s, days: e.target.value }))}
                    />
                  </Field>
                </div>
              </div>

              <div className="saas-modal-card">
                <div className="saas-modal-card-title">
                  <span>4. إعدادات التجربة والمتابعة</span>
                </div>
                <div className="saas-modal-grid-2">
                  <Field label="المصدر / القناة">
                    <input
                      type="text"
                      value={createForm.source}
                      onChange={(e) => setCreateForm((s) => ({ ...s, source: e.target.value }))}
                      placeholder="مثال: فيسبوك، إحالة عميل..."
                    />
                  </Field>
                  <Field label="اسم الحملة الإعلانية">
                    <input
                      type="text"
                      value={createForm.campaign}
                      onChange={(e) => setCreateForm((s) => ({ ...s, campaign: e.target.value }))}
                      placeholder="اختياري"
                    />
                  </Field>
                </div>
                <div style={{ marginTop: '6px' }}>
                  <Field label="ملاحظات إضافية">
                    <input
                      type="text"
                      value={createForm.notes}
                      onChange={(e) => setCreateForm((s) => ({ ...s, notes: e.target.value }))}
                      placeholder="أي ملاحظات خاصة بالتسجيل أو المتابعة"
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                className="button button-secondary"
                onClick={handleClose}
                style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: 700, fontSize: '13px' }}
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
                  fontSize: '13px',
                }}
                disabled={createTrialMutation.isPending || !createForm.businessName || !createForm.slug || !createForm.ownerPhone}
              >
                {createTrialMutation.isPending ? 'جاري إنشاء النسخة...' : 'إنشاء النسخة التجريبية'}
              </button>
            </div>
          </form>
        )}
      </div>
    </DialogShell>
  );
}
