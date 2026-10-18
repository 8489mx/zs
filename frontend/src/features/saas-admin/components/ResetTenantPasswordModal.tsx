import { useTranslation } from 'react-i18next';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Field } from '@/shared/ui/field';
import { XIcon } from '@/shared/components/icons/AppIcons';

interface ResetTenantPasswordModalProps {
  tenant: { id: string; name: string } | null;
  password: string;
  onChangePassword: (val: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function ResetTenantPasswordModal({
  tenant,
  password,
  onChangePassword,
  onClose,
  onSubmit,
  isPending,
}: ResetTenantPasswordModalProps) {
  const { t } = useTranslation();
  if (!tenant) return null;

  return (
    <DialogShell
      open={Boolean(tenant)}
      onClose={onClose}
      width="480px"
      ariaLabel={t('saas_admin.reset_tenant_password_modal.s0', "إعادة تعيين كلمة مرور مالك النسخة")}
    >
      <div className="dialog-card" dir="rtl" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              {t('saas_admin.reset_tenant_password_modal.s1', "إعادة تعيين كلمة مرور مالك النسخة")}
            </h3>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              {t('saas_admin.reset_tenant_password_modal.s2', "المنشأة:")} <strong style={{ color: '#0f172a' }}>{tenant.name}</strong>
            </div>
          </div>
          <button
            type="button"
            className="dialog-shell-close-btn"
            onClick={onClose}
            style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b' }}
          >
            <XIcon size={14} />
          </button>
        </div>
        <div className="stack gap-12">
          <Field label={t('saas_admin.reset_tenant_password_modal.s3', "كلمة المرور الجديدة")}>
            <input
              type="text"
              value={password}
              onChange={(e) => onChangePassword(e.target.value)}
              placeholder={t('saas_admin.reset_tenant_password_modal.s4', "اكتب كلمة مرور جديدة أو اتركها فارغة للتوليد التلقائي")}
              style={{ width: '100%' }}
            />
          </Field>
          <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
            {t('saas_admin.reset_tenant_password_modal.s5', "في حال ترك الحقل فارغاً، سيقوم النظام تلقائياً بتوليد كلمة مرور مؤقتة قوية وعرضها لك لنسخها ومشاركتها مع العميل.")}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button type="button" className="button button-secondary" onClick={onClose}>{t('saas_admin.reset_tenant_password_modal.s6', "إلغاء")}</button>
            <button
              type="button"
              className="button"
              onClick={onSubmit}
              disabled={isPending}
            >
              {t('saas_admin.reset_tenant_password_modal.s7', "تأكيد وإعادة التعيين")}
            </button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
