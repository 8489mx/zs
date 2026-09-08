import { DialogShell } from '@/shared/components/dialog-shell';
import { Field } from '@/shared/ui/field';
import { XIcon } from '@/shared/components/icons/AppIcons';

interface RenewTenantModalProps {
  tenant: { id: string; name?: string } | null;
  onClose: () => void;
  plans: any[];
  planId: number | '';
  onChangePlanId: (val: number | '') => void;
  duration: number;
  onChangeDuration: (val: number) => void;
  paymentAmount: number | '';
  onChangePaymentAmount: (val: number | '') => void;
  paymentMethod: string;
  onChangePaymentMethod: (val: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function RenewTenantModal({
  tenant,
  onClose,
  plans,
  planId,
  onChangePlanId,
  duration,
  onChangeDuration,
  paymentAmount,
  onChangePaymentAmount,
  paymentMethod,
  onChangePaymentMethod,
  onSubmit,
  isPending,
}: RenewTenantModalProps) {
  if (!tenant) return null;

  return (
    <DialogShell
      open={Boolean(tenant)}
      onClose={onClose}
      width="520px"
      ariaLabel="تجديد الاشتراك"
    >
      <div className="dialog-card" dir="rtl" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                تجديد اشتراك النسخة
              </h3>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                المنشأة: <strong style={{ color: '#0f172a' }}>{tenant.name}</strong>
              </div>
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
          <Field label="الخطة / الباقة *">
            <select value={planId} onChange={(e) => onChangePlanId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">-- اختر الباقة للتجديد --</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="مدة التجديد (أشهر)">
            <select value={duration} onChange={(e) => onChangeDuration(Number(e.target.value))}>
              <option value={1}>شهر واحد</option>
              <option value={3}>3 أشهر</option>
              <option value={6}>6 أشهر</option>
              <option value={12}>سنة واحدة</option>
            </select>
          </Field>
          <div className="saas-modal-grid-2">
            <Field label="المبلغ المدفوع (اختياري)">
              <input
                type="number"
                min="0"
                value={paymentAmount}
                onChange={(e) => onChangePaymentAmount(Number(e.target.value))}
                placeholder="0.00"
              />
            </Field>
            <Field label="طريقة الدفع">
              <select value={paymentMethod} onChange={(e) => onChangePaymentMethod(e.target.value)}>
                <option value="cash">نقدي</option>
                <option value="transfer">تحويل بنكي / محفظة</option>
                <option value="card">بطاقة</option>
              </select>
            </Field>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            <button type="button" className="button button-secondary" onClick={onClose}>إلغاء</button>
            <button
              type="button"
              className="button"
              style={{ background: '#0f172a', color: '#ffffff', fontWeight: 800 }}
              onClick={onSubmit}
              disabled={isPending || !planId}
            >
              تأكيد التجديد
            </button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
