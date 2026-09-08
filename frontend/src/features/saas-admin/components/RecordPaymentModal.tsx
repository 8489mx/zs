import { DialogShell } from '@/shared/components/dialog-shell';
import { Field } from '@/shared/ui/field';
import { XIcon } from '@/shared/components/icons/AppIcons';

interface RecordPaymentModalProps {
  tenant: { id: string; name?: string } | null;
  onClose: () => void;
  amount: number | '';
  onChangeAmount: (val: number | '') => void;
  currency: string;
  onChangeCurrency: (val: string) => void;
  method: string;
  onChangeMethod: (val: string) => void;
  reference: string;
  onChangeReference: (val: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function RecordPaymentModal({
  tenant,
  onClose,
  amount,
  onChangeAmount,
  currency,
  onChangeCurrency,
  method,
  onChangeMethod,
  reference,
  onChangeReference,
  onSubmit,
  isPending,
}: RecordPaymentModalProps) {
  if (!tenant) return null;

  return (
    <DialogShell
      open={Boolean(tenant)}
      onClose={onClose}
      width="520px"
      ariaLabel="تسجيل دفعة يدوية"
    >
      <div className="dialog-card" dir="rtl" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                تسجيل دفعة مالية يدوية
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
          <div className="saas-modal-grid-2">
            <Field label="المبلغ *">
              <input
                type="number"
                min="0"
                required
                value={amount}
                onChange={(e) => onChangeAmount(Number(e.target.value))}
                placeholder="0.00"
              />
            </Field>
            <Field label="العملة">
              <select value={currency} onChange={(e) => onChangeCurrency(e.target.value)}>
                <option value="EGP">EGP (جنيه)</option>
                <option value="USD">USD (دولار)</option>
                <option value="SAR">SAR (ريال)</option>
              </select>
            </Field>
          </div>
          <Field label="طريقة الدفع">
            <select value={method} onChange={(e) => onChangeMethod(e.target.value)}>
              <option value="cash">نقدي (Cash)</option>
              <option value="transfer">تحويل بنكي / محفظة إلكترونية</option>
              <option value="card">بطاقة ائتمان (Card)</option>
            </select>
          </Field>
          <Field label="رقم المرجع / الإيصال (اختياري)">
            <input
              type="text"
              value={reference}
              onChange={(e) => onChangeReference(e.target.value)}
              placeholder="رقم الحوالة أو الإيصال"
            />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            <button type="button" className="button button-secondary" onClick={onClose}>إلغاء</button>
            <button
              type="button"
              className="button"
              style={{ background: '#0f172a', color: '#ffffff', fontWeight: 800 }}
              onClick={onSubmit}
              disabled={isPending || !amount}
            >
              حفظ الدفعة
            </button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
