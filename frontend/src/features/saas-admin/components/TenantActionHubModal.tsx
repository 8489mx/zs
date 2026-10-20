import { useTranslation } from 'react-i18next';
import { XIcon } from '@/shared/components/icons/AppIcons';
import { DialogShell } from '@/shared/components/dialog-shell';
import { SaasTenantRow } from '../api/saas-admin.api';

interface TenantActionHubModalProps {
  tenant: SaasTenantRow;
  platformTenantId: string;
  currentTenantId: string;
  onClose: () => void;
  onImpersonate: (id: string, name: string) => void;
  onShowDetails: (id: string) => void;
  onShowSubscriptions: (row: SaasTenantRow) => void;
  onShareWelcome: (row: SaasTenantRow) => void;
  onUpgrade: (row: SaasTenantRow) => void;
  onUpdatePlan: (row: SaasTenantRow) => void;
  onRenew: (row: SaasTenantRow) => void;
  onRecordPayment: (row: SaasTenantRow) => void;
  onExtendTrial: (id: string) => void;
  onEditSlug: (row: SaasTenantRow) => void;
  onResetPassword: (row: SaasTenantRow) => void;
  onUnlockOwner: (id: string) => void;
  onSuspend: (id: string) => void;
  onExpire: (id: string) => void;
  onDelete: (row: SaasTenantRow) => void;
  onSeedDemo?: (row: SaasTenantRow) => void;
  onWipeData?: (row: SaasTenantRow) => void;
}

export function TenantActionHubModal({
  tenant,
  platformTenantId: _platformTenantId,
  currentTenantId: _currentTenantId,
  onClose,
  onImpersonate: _onImpersonate,
  onShowDetails,
  onShowSubscriptions,
  onShareWelcome,
  onUpgrade: _onUpgrade,
  onUpdatePlan,
  onRenew,
  onRecordPayment,
  onExtendTrial,
  onEditSlug,
  onResetPassword,
  onUnlockOwner,
  onSuspend,
  onExpire,
  onDelete,
  onSeedDemo,
  onWipeData,
}: TenantActionHubModalProps) {
  const { t } = useTranslation();
  const isTrial = tenant.status === 'trial';
  const isActive = tenant.status === 'active';

  return (
    <DialogShell
      open={true}
      onClose={onClose}
      width="min(880px, 95vw)"
      ariaLabel={t('saas_admin.tenant_action_hub_modal.s0', "مركز إجراءات المشترك")}
    >
      <div className="dialog-card" dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '88vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#170e5e',
              fontWeight: 800,
              fontSize: '16px',
              flexShrink: 0,
            }}>
              {tenant.slug === 'zs' ? (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="m9 12 2 2 4-4"/>
                </svg>
              ) : (
                (tenant.businessName || tenant.slug).charAt(0).toUpperCase()
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                  {tenant.businessName || tenant.slug}
                </h3>
                <span className={`tenant-status-pill ${tenant.status}`} style={{ fontSize: '11px', padding: '1px 8px' }}>
                  {tenant.status === 'active' ? t('saas_admin.tenant_action_hub_modal.s1', "مفعلة") : tenant.status === 'trial' ? t('saas_admin.tenant_action_hub_modal.s2', "تجريبية") : tenant.status === 'expired' ? t('saas_admin.tenant_action_hub_modal.s3', "منتهية") : t('saas_admin.tenant_action_hub_modal.s4', "موقوفة")}
                </span>
              </div>
              <div style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>{t('saas_admin.tenant_action_hub_modal.s5', "المعرف:")} <strong style={{ color: '#0f172a' }}>{tenant.slug}</strong></span>
                <span>•</span>
                <span>{t('saas_admin.tenant_action_hub_modal.s6', "المالك:")} <strong style={{ color: '#0f172a' }}>{tenant.ownerName}</strong> ({tenant.ownerPhone || '-'})</span>
                {tenant.ownerUsername && (
                  <>
                    <span>•</span>
                    <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1px 7px', borderRadius: '5px', color: '#170e5e', fontWeight: 700 }}>
                      {t('saas_admin.tenant_action_hub_modal.s7', "اسم الدخول:")} <code style={{ fontFamily: 'monospace' }}>{tenant.ownerUsername}</code>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="dialog-shell-close-btn"
            onClick={onClose}
            title={t('saas_admin.tenant_action_hub_modal.s8', "إغلاق")}
          ><XIcon size={15} /></button>
        </div>

        {/* Section 1: الاشتراكات والفوترة */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px',
          }}>
            <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
              {t('saas_admin.tenant_action_hub_modal.s9', "الاشتراكات والفوترة")}
            </span>
            <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 500 }}>
              {t('saas_admin.tenant_action_hub_modal.s9_sub', "إدارة التجديدات، الباقات، والإيصالات المالية")}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
          }}>
            {/* تجديد الاشتراك */}
            <button
              type="button"
              className="saas-action-card-btn"
              onClick={() => { onClose(); onRenew(tenant); }}
            >
              <div className="saas-action-card-icon" style={{ background: '#f8fafc', color: '#170e5e', border: '1px solid #e2e8f0' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
                </svg>
              </div>
              <div className="saas-action-card-info">
                <strong className="saas-action-card-title">{t('saas_admin.tenant_action_hub_modal.s10', "تجديد الاشتراك")}</strong>
                <span className="saas-action-card-sub">{t('saas_admin.tenant_action_hub_modal.s11', "تمديد فترة الصلاحية لعدة أشهر أو سنة")}</span>
              </div>
            </button>

            {/* سجل الاشتراكات والمدفوعات */}
            <button
              type="button"
              className="saas-action-card-btn"
              onClick={() => { onClose(); onShowSubscriptions(tenant); }}
            >
              <div className="saas-action-card-icon" style={{ background: '#f8fafc', color: '#170e5e', border: '1px solid #e2e8f0' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <div className="saas-action-card-info">
                <strong className="saas-action-card-title">{t('saas_admin.tenant_action_hub_modal.s12', "سجل الاشتراكات والإيصالات")}</strong>
                <span className="saas-action-card-sub">{t('saas_admin.tenant_action_hub_modal.s13', "فواتير العميل السابقة وطباعة إيصال سداد")}</span>
              </div>
            </button>

            {/* تعديل الباقة والنشاط والترقية */}
            <button
              type="button"
              className="saas-action-card-btn"
              onClick={() => { onClose(); onUpdatePlan(tenant); }}
              style={{ borderInlineStart: '3px solid #170e5e' }}
            >
              <div className="saas-action-card-icon" style={{ background: '#f8fafc', color: '#170e5e', border: '1px solid #e2e8f0' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="21" x2="4" y2="14"/>
                  <line x1="4" y1="10" x2="4" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12" y2="3"/>
                  <line x1="20" y1="21" x2="20" y2="16"/>
                  <line x1="20" y1="12" x2="20" y2="3"/>
                  <line x1="1" y1="14" x2="7" y2="14"/>
                  <line x1="9" y1="8" x2="15" y2="8"/>
                  <line x1="17" y1="16" x2="23" y2="16"/>
                </svg>
              </div>
              <div className="saas-action-card-info">
                <strong className="saas-action-card-title">{t('saas_admin.tenant_action_hub_modal.plan_upgrade_title', "تعديل الباقة والنشاط والترقية")}</strong>
                <span className="saas-action-card-sub">{t('saas_admin.tenant_action_hub_modal.plan_upgrade_sub', "تحديد النشاط التشغيلي، ترقية باقة الميزات، وتمديد فترة الاشتراك")}</span>
              </div>
            </button>

            {/* تسجيل دفعة مالية */}
            <button
              type="button"
              className="saas-action-card-btn"
              onClick={() => { onClose(); onRecordPayment(tenant); }}
            >
              <div className="saas-action-card-icon" style={{ background: '#f8fafc', color: '#170e5e', border: '1px solid #e2e8f0' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <div className="saas-action-card-info">
                <strong className="saas-action-card-title">{t('saas_admin.tenant_action_hub_modal.s18', "تسجيل دفعة مالية")}</strong>
                <span className="saas-action-card-sub">{t('saas_admin.tenant_action_hub_modal.s19', "سداد نقدي، تحويل بنكي أو محفظة إلكترونية")}</span>
              </div>
            </button>

            {/* مشاركة بيانات الدخول عبر واتساب */}
            <button
              type="button"
              className="saas-action-card-btn"
              onClick={() => { onClose(); onShareWelcome(tenant); }}
            >
              <div className="saas-action-card-icon" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #dcfce7' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
              </div>
              <div className="saas-action-card-info">
                <strong className="saas-action-card-title">{t('saas_admin.tenant_action_hub_modal.s20', "مشاركة الدخول عبر واتساب")}</strong>
                <span className="saas-action-card-sub">{t('saas_admin.tenant_action_hub_modal.s21', "إرسال رسالة ترحيبية وبيانات الدخول للعميل")}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Section 2: إدارة الحساب والأمان */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px',
          }}>
            <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
              {t('saas_admin.tenant_action_hub_modal.s22', "إدارة الحساب والأمان")}
            </span>
            <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 500 }}>
              {t('saas_admin.tenant_action_hub_modal.s22_sub', "التحكم في وصول المستخدمين، الروابط، وكلمات المرور")}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
          }}>
            {/* سجل النشاط والتفاصيل */}
            <button
              type="button"
              className="saas-action-card-btn"
              onClick={() => { onClose(); onShowDetails(tenant.id); }}
            >
              <div className="saas-action-card-icon" style={{ background: '#f8fafc', color: '#170e5e', border: '1px solid #e2e8f0' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <div className="saas-action-card-info">
                <strong className="saas-action-card-title">{t('saas_admin.tenant_action_hub_modal.s23', "سجل النشاط والتفاصيل")}</strong>
                <span className="saas-action-card-sub">{t('saas_admin.tenant_action_hub_modal.s24', "استعراض سجل الأحداث والعمليات للنسخة")}</span>
              </div>
            </button>

            {/* تعديل معرّف النسخة (Slug) */}
            <button
              type="button"
              className="saas-action-card-btn"
              onClick={() => { onClose(); onEditSlug(tenant); }}
            >
              <div className="saas-action-card-icon" style={{ background: '#f8fafc', color: '#170e5e', border: '1px solid #e2e8f0' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </div>
              <div className="saas-action-card-info">
                <strong className="saas-action-card-title">{t('saas_admin.tenant_action_hub_modal.s25', "تعديل معرّف النسخة (Slug)")}</strong>
                <span className="saas-action-card-sub">
                  {t('saas_admin.tenant_action_hub_modal.s26', "تغيير الرابط الفريد الحالي: (")}{tenant.slug})
                </span>
              </div>
            </button>

            {/* إعادة تعيين كلمة المرور */}
            <button
              type="button"
              className="saas-action-card-btn"
              onClick={() => { onClose(); onResetPassword(tenant); }}
            >
              <div className="saas-action-card-icon" style={{ background: '#f8fafc', color: '#170e5e', border: '1px solid #e2e8f0' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2l-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l-1.5-1.5L8 9 2 15v7h7l6-6 1.5 1.5L18 16l1.5-1.5L18 13l3.5-3.5a2.12 2.12 0 0 0 0-3l-2-2a2.12 2.12 0 0 0-3 0z"/>
                  <circle cx="7.5" cy="16.5" r="1.5"/>
                </svg>
              </div>
              <div className="saas-action-card-info">
                <strong className="saas-action-card-title">{t('saas_admin.tenant_action_hub_modal.s27', "إعادة تعيين كلمة المرور")}</strong>
                <span className="saas-action-card-sub">
                  {t('saas_admin.tenant_action_hub_modal.s28', "توليد كلمة سر جديدة للحساب")} {tenant.ownerUsername ? `(${tenant.ownerUsername})` : ''}
                </span>
              </div>
            </button>

            {/* تمديد التجربة (للنسخ التجريبية فقط) */}
            {isTrial && (
              <button
                type="button"
                className="saas-action-card-btn"
                onClick={() => { onClose(); onExtendTrial(tenant.id); }}
              >
                <div className="saas-action-card-icon" style={{ background: '#f8fafc', color: '#170e5e', border: '1px solid #e2e8f0' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div className="saas-action-card-info">
                  <strong className="saas-action-card-title">{t('saas_admin.tenant_action_hub_modal.s29', "تمديد التجربة (+7 أيام)")}</strong>
                  <span className="saas-action-card-sub">{t('saas_admin.tenant_action_hub_modal.s30', "إضافة أسبوع تجريبي مجاني للعميل")}</span>
                </div>
              </button>
            )}

            {/* فك قفل حساب المالك */}
            <button
              type="button"
              className="saas-action-card-btn"
              onClick={() => { onClose(); onUnlockOwner(tenant.id); }}
            >
              <div className="saas-action-card-icon" style={{ background: '#f8fafc', color: '#170e5e', border: '1px solid #e2e8f0' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                </svg>
              </div>
              <div className="saas-action-card-info">
                <strong className="saas-action-card-title">{t('saas_admin.tenant_action_hub_modal.s31', "فك قفل حساب المالك")}</strong>
                <span className="saas-action-card-sub">
                  {t('saas_admin.tenant_action_hub_modal.s32', "إلغاء الحظر الأمني للمستخدم")} {tenant.ownerUsername ? `(${tenant.ownerUsername})` : ''}
                </span>
              </div>
            </button>

            {/* إيقاف / إنهاء الصلاحية */}
            {isActive || isTrial ? (
              <button
                type="button"
                className="saas-action-card-btn"
                onClick={() => { onClose(); onSuspend(tenant.id); }}
              >
                <div className="saas-action-card-icon" style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fef3c7' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="10" y1="15" x2="10" y2="9"/>
                    <line x1="14" y1="15" x2="14" y2="9"/>
                  </svg>
                </div>
                <div className="saas-action-card-info">
                  <strong className="saas-action-card-title">{t('saas_admin.tenant_action_hub_modal.s33', "إيقاف النسخة مؤقتاً")}</strong>
                  <span className="saas-action-card-sub">{t('saas_admin.tenant_action_hub_modal.s34', "تعطيل دخول المستخدمين حتى إعادة التفعيل")}</span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                className="saas-action-card-btn"
                onClick={() => { onClose(); onExpire(tenant.id); }}
              >
                <div className="saas-action-card-icon" style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <rect x="9" y="9" width="6" height="6"/>
                  </svg>
                </div>
                <div className="saas-action-card-info">
                  <strong className="saas-action-card-title">{t('saas_admin.tenant_action_hub_modal.s35', "إنهاء الصلاحية")}</strong>
                  <span className="saas-action-card-sub">{t('saas_admin.tenant_action_hub_modal.s36', "وسم النسخة كمنتهية الصلاحية")}</span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Section 3: إدارة دورة حياة بيانات المشترك */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px',
          }}>
            <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
              {t('saas_admin.tenant_action_hub_modal.s37', "إدارة دورة حياة بيانات المشترك")}
            </span>
            <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 500 }}>
              {t('saas_admin.tenant_action_hub_modal.s37_sub', "تهيئة بيانات التجربة أو تصفير الحساب للعمل الفعلي")}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
          }}>
            {/* سكب بيانات تجريبية */}
            <button
              type="button"
              className="saas-action-card-btn"
              onClick={() => { onClose(); onSeedDemo?.(tenant); }}
            >
              <div className="saas-action-card-icon" style={{ background: '#f8fafc', color: '#170e5e', border: '1px solid #e2e8f0' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <div className="saas-action-card-info">
                <strong className="saas-action-card-title">{t('saas_admin.tenant_action_hub_modal.s38', "سكب بيانات تجريبية")}</strong>
                <span className="saas-action-card-sub">{t('saas_admin.tenant_action_hub_modal.s39', "توليد أصناف ومبيعات تجريبية حسب نشاط المشترك")}</span>
              </div>
            </button>

            {/* تصفير قاعدة بيانات المشترك */}
            <button
              type="button"
              className="saas-action-card-btn"
              onClick={() => { onClose(); onWipeData?.(tenant); }}
            >
              <div className="saas-action-card-icon" style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #ffe4e6' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </div>
              <div className="saas-action-card-info">
                <strong className="saas-action-card-title" style={{ color: '#be123c' }}>{t('saas_admin.tenant_action_hub_modal.s40', "تصفير قاعدة البيانات (Factory Reset)")}</strong>
                <span className="saas-action-card-sub">{t('saas_admin.tenant_action_hub_modal.s41', "إعادة النسخة بيضاء 0% لبدء العمل الفعلي للعميل")}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Section 4: منطقة الخطر (حذف نهائي) */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #fee2e2',
          borderRadius: '10px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <div>
            <strong style={{ color: '#991b1b', fontSize: '13px', display: 'block' }}>
              {t('saas_admin.tenant_action_hub_modal.s42', "حذف النسخة نهائياً (Danger Zone)")}
            </strong>
            <span style={{ color: '#64748b', fontSize: '11.5px' }}>
              {t('saas_admin.tenant_action_hub_modal.s43', "سيتم حذف كافة البيانات وقواعد البيانات الخاصة بهذه النسخة ولا يمكن التراجع عن هذا الإجراء.")}
            </span>
          </div>

          <button
            type="button"
            className="button"
            style={{
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              borderRadius: '6px',
            }}
            onClick={() => {
              onClose();
              onDelete(tenant);
            }}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
            <span>{t('saas_admin.tenant_action_hub_modal.s44', "حذف نهائي")}</span>
          </button>
        </div>
      </div>
    </DialogShell>
  );
}
