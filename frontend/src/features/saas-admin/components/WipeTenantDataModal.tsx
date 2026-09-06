import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { XIcon, Trash2Icon, ShieldCheckIcon } from '@/shared/components/icons/AppIcons';
import { saasAdminApi, type SaasTenantRow } from '../api/saas-admin.api';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-message';

interface WipeTenantDataModalProps {
  tenant: SaasTenantRow;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function WipeTenantDataModal({ tenant, onClose, onSuccess }: WipeTenantDataModalProps) {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const wipeMutation = useMutation({
    mutationFn: () => saasAdminApi.wipeTenantData(tenant.id, {
      superAdminPassword: password.trim(),
    }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['saas-admin-tenants'] });
      onSuccess(res.message || 'تم تصفير قاعدة بيانات المشترك بنجاح وإعادتها فارغة للبدء الفعلي!');
      onClose();
    },
    onError: (err) => {
      setErrorMessage(getFriendlyApiErrorMessage(err, 'فشل تصفير قاعدة البيانات. تأكد من صحة كلمة مرور السوبر أدمن.'));
    },
  });

  return (
    <DialogShell
      open={true}
      onClose={onClose}
      width="540px"
      ariaLabel="تصفير قاعدة بيانات المشترك"
    >
      <div className="dialog-card" dir="rtl" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #fee2e2', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2Icon size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#991b1b' }}>
                تصفير قاعدة بيانات المشترك (Factory Reset)
              </h3>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                النسخة: <strong style={{ color: '#0f172a' }}>{tenant.businessName || tenant.slug}</strong> ({tenant.slug})
              </div>
            </div>
          </div>
          <button
            type="button"
            className="dialog-shell-close-btn"
            onClick={onClose}
            style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b' }}
          >
            <XIcon size={14} />
          </button>
        </div>

        {errorMessage && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '12.5px', fontWeight: 600 }}>
            {errorMessage}
          </div>
        )}

        {/* Warning Banner */}
        <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <strong style={{ fontSize: '13px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheckIcon size={16} />
            تأكيد التصفير النهائي للبدء الفعلي بالمتجر
          </strong>
          <p style={{ margin: 0, fontSize: '12px', color: '#b45309', lineHeight: 1.6 }}>
            سيتم مسح وتصفير كافة البيانات التشغيلية (الأصناف، المبيعات، المشتريات، حركات المخزون، ديون العملاء والموردين، والورديات) وإعادة المتجر أبيض نظيف 100% ليقوم العميل بإدخال بياناته الحقيقية.
          </p>
          <div style={{ fontSize: '11.5px', color: '#78350f', marginTop: '4px', fontWeight: 600 }}>
            ملاحظة: سيتم الاحتفاظ بحساب المالك، بيانات الفرع، وخطة الاشتراك كما هي دون أي مساس.
          </div>
        </div>

        {/* Super Admin Password Field */}
        <div>
          <Field label="أدخل كلمة مرور السوبر أدمن لتأكيد الإجراء *">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="كلمة مرور حساب السوبر أدمن للمنصة"
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                style={{
                  position: 'absolute',
                  left: '10px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {showPassword ? 'إخفاء' : 'إظهار'}
              </button>
            </div>
          </Field>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={wipeMutation.isPending}>
            إلغاء
          </Button>
          <Button
            type="button"
            onClick={() => wipeMutation.mutate()}
            disabled={wipeMutation.isPending || !password.trim()}
            style={{ background: '#dc2626', color: '#ffffff', fontWeight: 800 }}
          >
            {wipeMutation.isPending ? 'جاري تصفير البيانات...' : 'تأكيد تصفير المتجر'}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
