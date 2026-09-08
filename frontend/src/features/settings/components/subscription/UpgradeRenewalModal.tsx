import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { XIcon } from '@/shared/components/icons/AppIcons';

interface UpgradeRenewalModalProps {
  selectedPlan: { id: number; name: string; price: number; currency: string } | null;
  onClose: () => void;
  isAnnual: boolean;
  paymentMethod: 'xpay' | 'paymob' | 'instapay' | 'vodafone_cash' | 'bank_transfer' | 'cash';
  onPaymentMethodChange: (val: any) => void;
  notes: string;
  onNotesChange: (val: string) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function UpgradeRenewalModal({
  selectedPlan,
  onClose,
  isAnnual,
  paymentMethod,
  onPaymentMethodChange,
  notes,
  onNotesChange,
  onConfirm,
  isSubmitting,
}: UpgradeRenewalModalProps) {
  if (!selectedPlan) return null;

  return (
    <DialogShell
      open={true}
      onClose={onClose}
      width="min(560px, 95vw)"
      ariaLabel="تأكيد الاشتراك والترقية"
    >
      <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="standard-dialog-header">
          <div className="standard-dialog-header-info">
            <h3 className="standard-dialog-title">تأكيد الترقية والاشتراك</h3>
            <p className="standard-dialog-subtitle">اختيار وسيلة الدفع المناسبة وتفعيل الباقة مباشرة</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="standard-dialog-close-btn"
            aria-label="إغلاق"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Plan summary */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{selectedPlan.name}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>المدة: {isAnnual ? 'اشتراك سنوي (12 شهر)' : 'اشتراك شهري'}</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#170e5e' }}>{selectedPlan.price.toLocaleString('ar-EG')} {selectedPlan.currency}</div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
              طريقة الدفع والتفعيل:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => onPaymentMethodChange('xpay')}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: paymentMethod === 'xpay' ? '2px solid #170e5e' : '1px solid #cbd5e1',
                  backgroundColor: paymentMethod === 'xpay' ? '#f0f9ff' : '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'right',
                }}
              >
                الدفع الإلكتروني الفوري (XPay)
              </button>
              <button
                type="button"
                onClick={() => onPaymentMethodChange('paymob')}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: paymentMethod === 'paymob' ? '2px solid #170e5e' : '1px solid #cbd5e1',
                  backgroundColor: paymentMethod === 'paymob' ? '#f0f9ff' : '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'right',
                }}
              >
                بطاقة بنكية / فيزا (Paymob)
              </button>
              <button
                type="button"
                onClick={() => onPaymentMethodChange('instapay')}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: paymentMethod === 'instapay' ? '2px solid #170e5e' : '1px solid #cbd5e1',
                  backgroundColor: paymentMethod === 'instapay' ? '#f0f9ff' : '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'right',
                }}
              >
                تحويل إنستاباي (InstaPay)
              </button>
              <button
                type="button"
                onClick={() => onPaymentMethodChange('vodafone_cash')}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: paymentMethod === 'vodafone_cash' ? '2px solid #170e5e' : '1px solid #cbd5e1',
                  backgroundColor: paymentMethod === 'vodafone_cash' ? '#f0f9ff' : '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'right',
                }}
              >
                فودافون كاش / محافظ إلكترونية
              </button>
              <button
                type="button"
                onClick={() => onPaymentMethodChange('bank_transfer')}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: paymentMethod === 'bank_transfer' ? '2px solid #170e5e' : '1px solid #cbd5e1',
                  backgroundColor: paymentMethod === 'bank_transfer' ? '#f0f9ff' : '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'right',
                }}
              >
                تحويل بنكي رسمي
              </button>
              <button
                type="button"
                onClick={() => onPaymentMethodChange('cash')}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: paymentMethod === 'cash' ? '2px solid #170e5e' : '1px solid #cbd5e1',
                  backgroundColor: paymentMethod === 'cash' ? '#f0f9ff' : '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'right',
                }}
              >
                نقداً عبر مندوب الشركة
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              ملاحظات أو رقم مرجع التحويل:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="مثال: تم التحويل من رقم 010xxxx..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
            />
          </div>

          <div className="standard-dialog-footer">
            <Button variant="secondary" onClick={onClose}>
              إلغاء
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isSubmitting}
              style={{ backgroundColor: '#170e5e', color: '#ffffff', fontWeight: 700 }}
            >
              {isSubmitting ? 'جاري المعالجة...' : 'تأكيد السداد والتفعيل'}
            </Button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
