import { useTranslation } from 'react-i18next';
import { useState, useId } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { AlertTriangleIcon, LockIcon, CheckCircleIcon, EyeIcon } from '@/shared/components/icons/AppIcons';
import { saasAdminApi, type SaasTenantRow } from '../api/saas-admin.api';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-message';

function EyeOffIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

interface DeleteTenantModalProps {
  tenant: SaasTenantRow;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function DeleteTenantModal({ tenant, onClose, onSuccess }: DeleteTenantModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const uniqueFieldId = useId();

  const [slugConfirmation, setSlugConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const targetSlug = String(tenant.slug || '').trim().toLowerCase();
  const isSlugMatched = slugConfirmation.trim().toLowerCase() === targetSlug;
  const isFormValid = isSlugMatched && password.trim().length > 0;

  const deleteMutation = useMutation({
    mutationFn: () => saasAdminApi.deleteTenant(tenant.id, {
      superAdminPassword: password.trim(),
    }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['saas-admin-tenants'] });
      onSuccess(res.message || t('saas_admin.delete_tenant_modal.success_msg', 'تم حذف النسخة وجميع بياناتها وسجلاتها نهائياً بنجاح!'));
      onClose();
    },
    onError: (err) => {
      setErrorMessage(getFriendlyApiErrorMessage(err, t('saas_admin.delete_tenant_modal.error_msg', 'فشل حذف النسخة. تأكد من صحة كلمة مرور السوبر أدمن.')));
    },
  });

  return (
    <StandardDialog
      open={true}
      onClose={onClose}
      title={t('saas_admin.delete_tenant_modal.title', "حذف النسخة نهائياً")}
      subtitle={t('saas_admin.delete_tenant_modal.subtitle', "إجراء أمني فائق الحساسية لإسقاط نسخة المشترك وقواعد بياناتها")}
      width="min(580px, 95vw)"
      minHeight="auto"
      bodyStyle={{
        padding: '18px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        textAlign: 'right',
        direction: 'rtl',
      }}
      footerActions={(
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={deleteMutation.isPending}
            style={{ minWidth: '85px', height: '36px' }}
          >
            {t('common.cancel', "تراجع")}
          </Button>

          <button
            type="button"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending || !isFormValid}
            style={{
              height: '36px',
              padding: '0 18px',
              borderRadius: '7px',
              border: 'none',
              background: isFormValid && !deleteMutation.isPending ? '#dc2626' : '#94a3b8',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: isFormValid && !deleteMutation.isPending ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background-color 0.15s ease',
            }}
          >
            <LockIcon size={14} />
            <span>
              {deleteMutation.isPending
                ? t('saas_admin.delete_tenant_modal.deleting', "جاري الحذف النهائي وقواعد البيانات...")
                : t('saas_admin.delete_tenant_modal.confirm_btn', "تأكيد الحذف النهائي وإسقاط النسخة")}
            </span>
          </button>
        </div>
      )}
    >
      {/* Decoy fields to catch browser password manager autofill */}
      <div style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1, pointerEvents: 'none', overflow: 'hidden' }} aria-hidden="true">
        <input type="text" name="decoy_username_prevent_fill" tabIndex={-1} autoComplete="off" defaultValue="" />
        <input type="password" name="decoy_password_prevent_fill" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div style={{
          padding: '10px 14px',
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          color: '#b91c1c',
          fontSize: '12.5px',
          fontWeight: 600,
          textAlign: 'right',
        }}>
          {errorMessage}
        </div>
      )}

      {/* Critical Danger Warning Banner */}
      <div style={{
        background: '#fff1f2',
        border: '1px solid #fecdd3',
        borderRight: '4px solid #e11d48',
        borderRadius: '8px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        textAlign: 'right',
      }}>
        <div style={{ fontSize: '13px', color: '#9f1239', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertTriangleIcon size={16} />
          <span>{t('saas_admin.delete_tenant_modal.warning_title', "تحذير أمني صارم: هذا الإجراء لا يمكن التراجع عنه مطلقاً!")}</span>
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: '#be123c', lineHeight: 1.55 }}>
          {t('saas_admin.delete_tenant_modal.warning_body', "سيتم مسح النسخة بالكامل وإسقاط قاعدة بياناتها، السجلات المحاسبية، الفواتير، المخزون، وحسابات المستخدمين نهائياً.")}
        </p>
      </div>

      {/* Target Tenant Summary Card */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        textAlign: 'right',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span style={{ color: '#64748b', fontSize: '12px' }}>{t('saas_admin.delete_tenant_modal.name_label', "اسم المنشأة:")} </span>
            <strong style={{ color: '#0f172a', fontSize: '13.5px', marginRight: '4px' }}>
              {tenant.businessName || tenant.slug}
            </strong>
          </div>
          <span style={{
            background: '#fee2e2',
            color: '#b91c1c',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
          }}>
            {tenant.status === 'active' ? 'نسخة مفعلة' : tenant.status === 'trial' ? 'نسخة تجريبية' : tenant.status}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px dashed #e2e8f0' }}>
          <span style={{ color: '#64748b', fontSize: '12px' }}>{t('saas_admin.delete_tenant_modal.slug_label', "معرّف النسخة (Slug):")} </span>
          <code style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            padding: '3px 8px',
            borderRadius: '5px',
            color: '#0f172a',
            fontWeight: 800,
            fontSize: '12.5px',
            fontFamily: 'monospace',
            letterSpacing: '0.3px',
          }}>
            {tenant.slug}
          </code>
        </div>
      </div>

      {/* Step 1: Confirmation Slug Input */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        textAlign: 'right',
      }}>
        <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#f1f5f9',
            color: '#0f172a',
            fontSize: '11px',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            1
          </span>
          <span>{t('saas_admin.delete_tenant_modal.step1_label', "تأكيد كتابة معرّف النسخة (Slug):")}</span>
        </label>

        <div style={{ fontSize: '11.5px', color: '#64748b' }}>
          {t('saas_admin.delete_tenant_modal.step1_subtext', "لتأكيد نية الحذف، اكتب المعرّف التالي بالضبط:")}{' '}
          <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{tenant.slug}</strong>
        </div>

        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={slugConfirmation}
            onChange={(e) => setSlugConfirmation(e.target.value)}
            placeholder={tenant.slug}
            autoComplete="off"
            spellCheck={false}
            dir="ltr"
            style={{
              width: '100%',
              height: '36px',
              padding: '0 12px',
              borderRadius: '6px',
              border: isSlugMatched ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
              fontSize: '13px',
              fontFamily: 'monospace',
              background: isSlugMatched ? '#f0fdf4' : '#ffffff',
              textAlign: 'left',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
          {isSlugMatched && (
            <span style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
            }}>
              <CheckCircleIcon size={16} />
            </span>
          )}
        </div>
      </div>

      {/* Step 2: Super Admin Password Verification */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        textAlign: 'right',
      }}>
        <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#fee2e2',
            color: '#dc2626',
            fontSize: '11px',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            2
          </span>
          <span>{t('saas_admin.delete_tenant_modal.step2_label', "كلمة مرور السوبر أدمن (إدخال يدوي إلزامي):")}</span>
        </label>

        <div style={{ fontSize: '11.5px', color: '#64748b' }}>
          {t('saas_admin.delete_tenant_modal.step2_subtext', "أدخل كلمة مرور حساب السوبر أدمن لتفويض عملية الحذف نهائياً (محظور التعبئة التلقائية).")}
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            id={`sec_admin_pw_${uniqueFieldId}`}
            name={`admin_manual_confirm_${uniqueFieldId}`}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            placeholder={t('saas_admin.delete_tenant_modal.password_placeholder', "أدخل كلمة مرور حساب السوبر أدمن")}
            style={{
              width: '100%',
              height: '36px',
              padding: '0 36px 0 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              background: '#ffffff',
              boxSizing: 'border-box',
              outline: 'none',
              textAlign: 'right',
            }}

          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            aria-label={showPassword ? t('common.hide', "إخفاء كلمة المرور") : t('common.show', "إظهار كلمة المرور")}
            style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
            }}
          >
            {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
          </button>
        </div>
      </div>
    </StandardDialog>
  );
}
