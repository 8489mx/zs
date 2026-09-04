import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Field } from '@/shared/ui/field';
import { saasAdminApi, SaasTenantRow } from '../api/saas-admin.api';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-message';

interface EditTenantSlugModalProps {
  tenant: SaasTenantRow | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export function EditTenantSlugModal({ tenant, onClose, onSuccess }: EditTenantSlugModalProps) {
  const queryClient = useQueryClient();
  const [newSlug, setNewSlug] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (tenant) {
      setNewSlug(tenant.slug || '');
      setError('');
    }
  }, [tenant]);

  const updateMutation = useMutation({
    mutationFn: (slug: string) => saasAdminApi.updateTenantSlug(tenant!.id, slug),
    onSuccess: async (res) => {
      onSuccess(res.message || 'تم تحديث معرّف النسخة بنجاح.');
      await queryClient.invalidateQueries({ queryKey: ['saas-admin-tenants'] });
      onClose();
    },
    onError: (err: any) => {
      setError(getFriendlyApiErrorMessage(err, 'تعذر تحديث معرّف النسخة'));
    },
  });

  if (!tenant) return null;

  const currentSlug = tenant.slug || '';
  const cleanInput = newSlug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const hasChanged = cleanInput !== currentSlug && cleanInput.length >= 3;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanged) return;
    setError('');
    updateMutation.mutate(cleanInput);
  };

  return (
    <DialogShell
      open={Boolean(tenant)}
      onClose={onClose}
      width="520px"
      ariaLabel="تعديل معرّف النسخة (Slug)"
    >
      <div className="dialog-card" dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              تعديل معرّف النسخة (Slug)
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
              تعديل الرابط الفريد لنشاط: {tenant.businessName || tenant.ownerName}
            </p>
          </div>
          <button type="button" className="dialog-shell-close-btn" onClick={onClose} title="إغلاق">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-sm rounded-lg border border-rose-200">
            {error}
          </div>
        )}

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">المعرّف الحالي:</span>
            <span className="font-mono font-bold text-slate-800 bg-white px-2.5 py-0.5 rounded border border-slate-200">
              {currentSlug}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>رابط المتجر الحالي:</span>
            <span className="font-mono text-indigo-700 font-semibold" dir="ltr">
              /st/{currentSlug}
            </span>
          </div>
        </div>

        <Field label="معرّف النسخة الجديد (Slug)" hint="أحرف إنجليزية صغيرة، أرقام، وشرطات فقط بدون مسافات (مثلاً: al-mohandes)">
          <div className="relative">
            <input
              type="text"
              value={newSlug}
              onChange={(e) => {
                setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                setError('');
              }}
              placeholder="مثال: al-mohandes"
              className="w-full text-left font-mono font-bold tracking-wide rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              dir="ltr"
              autoFocus
            />
          </div>
        </Field>

        {cleanInput && cleanInput !== currentSlug && (
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1">
            <span className="text-xs font-bold text-indigo-900">معاينة الرابط الجديد للعميل:</span>
            <div className="text-xs font-mono font-bold text-indigo-700 break-all" dir="ltr">
              {window.location.origin}/st/{cleanInput}
            </div>
          </div>
        )}

        <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200 leading-relaxed">
          ⚠️ <strong>تنبيه:</strong> تغيير المعرّف سيؤدي إلى تغيير رابط المتجر الإلكتروني للعميل فوراً. أي روابط قديمة أرسلها العميل لزبائنه ستحتاج إلى التحديث للرابط الجديد.
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={!hasChanged || updateMutation.isPending}
            className="px-5 py-2 text-sm font-bold text-white bg-[#170e5e] hover:bg-[#110a47] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
          >
            {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ المعرّف الجديد'}
          </button>
        </div>
      </form>
      </div>
    </DialogShell>
  );
}
