import { DialogShell } from '@/shared/components/dialog-shell';
import { Field } from '@/shared/ui/field';
import { XIcon } from '@/shared/components/icons/AppIcons';

interface UpgradeTenantModalProps {
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

export function UpgradeTenantModal({
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
}: UpgradeTenantModalProps) {
  if (!tenant) return null;

  return (
    <DialogShell
      open={Boolean(tenant)}
      onClose={onClose}
      width="520px"
      ariaLabel="تفعيل أو ترقية الخطة"
    >
      <div className="dialog-card" dir="rtl" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                تفعيل / ترقية الاشتراك
              </h3>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                النسخة: <strong style={{ color: '#0f172a' }}>{tenant.name}</strong>
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
          <Field label="الخطة / الباقة المستهدفة *">
            <select value={planId} onChange={(e) => onChangePlanId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">-- اختر الباقة --</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="مدة الاشتراك">
            <select value={duration} onChange={(e) => onChangeDuration(Number(e.target.value))}>
              <option value={1}>شهر واحد</option>
              <option value={3}>3 أشهر</option>
              <option value={6}>6 أشهر</option>
              <option value={12}>سنة واحدة</option>
              <option value={60}>5 سنوات (شامل / مدى الحياة)</option>
            </select>
          </Field>
          <div className="saas-modal-grid-2">
            <Field label="المبلغ المدفوع (اختياري)">
              <input
                type="number"
                min="0"
                value={paymentAmount}
                onChange={(e) => onChangePaymentAmount(Number(e.target.value))}
                placeholder="المبلغ المحصل"
              />
            </Field>
            <Field label="طريقة الدفع">
              <select value={paymentMethod} onChange={(e) => onChangePaymentMethod(e.target.value)}>
                <option value="cash">نقدي (Cash)</option>
                <option value="transfer">تحويل بنكي / فودافون كاش</option>
                <option value="card">بطاقة دفع (Card)</option>
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
              تأكيد التفعيل والترقية
            </button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
