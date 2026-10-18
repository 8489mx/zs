import { useTranslation } from 'react-i18next';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { XIcon } from '@/shared/components/icons/AppIcons';
import { translateUiText } from '@/lib/auto-translator';

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
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  if (!selectedPlan) return null;

  const planName = isEn ? translateUiText(selectedPlan.name) : selectedPlan.name;

  return (
    <DialogShell
      open={true}
      onClose={onClose}
      width="min(560px, 95vw)"
      ariaLabel={isEn ? 'Confirm Plan Subscription & Upgrade' : t('settings.subscription.upgrade_renewal_modal.s0', "تأكيد الاشتراك والترقية")}
    >
      <div dir={isEn ? 'ltr' : 'rtl'} style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="standard-dialog-header">
          <div className="standard-dialog-header-info">
            <h3 className="standard-dialog-title">{isEn ? 'Confirm Upgrade & Subscription' : t('settings.subscription.upgrade_renewal_modal.s1', "تأكيد الترقية والاشتراك")}</h3>
            <p className="standard-dialog-subtitle">{isEn ? 'Select your preferred payment method to activate immediately' : t('settings.subscription.upgrade_renewal_modal.s2', "اختيار وسيلة الدفع المناسبة وتفعيل الباقة مباشرة")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="standard-dialog-close-btn"
            aria-label={isEn ? 'Close' : t('settings.subscription.upgrade_renewal_modal.s3', "إغلاق")}
          >
            <XIcon size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Plan summary */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{planName}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>{isEn ? 'Duration: ' : t('settings.subscription.upgrade_renewal_modal.s4', "المدة:")} {isAnnual ? (isEn ? 'Annual (12 Months)' : t('settings.subscription.upgrade_renewal_modal.s5', "اشتراك سنوي (12 شهر)")) : (isEn ? 'Monthly' : t('settings.subscription.upgrade_renewal_modal.s6', "اشتراك شهري"))}</div>
            </div>
            <div style={{ textAlign: isEn ? 'right' : 'left' }}>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#170e5e' }}>{selectedPlan.price.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {selectedPlan.currency}</div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
              {isEn ? 'Payment & Activation Method:' : t('settings.subscription.upgrade_renewal_modal.s7', "طريقة الدفع والتفعيل:")}
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
                  textAlign: isEn ? 'left' : 'right',
                }}
              >
                {isEn ? 'Instant Online Payment (XPay)' : t('settings.subscription.upgrade_renewal_modal.s8', "الدفع الإلكتروني الفوري (XPay)")}
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
                  textAlign: isEn ? 'left' : 'right',
                }}
              >
                {isEn ? 'Credit Card / Visa (Paymob)' : t('settings.subscription.upgrade_renewal_modal.s9', "بطاقة بنكية / فيزا (Paymob)")}
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
                  textAlign: isEn ? 'left' : 'right',
                }}
              >
                {isEn ? 'InstaPay Bank Transfer' : t('settings.subscription.upgrade_renewal_modal.s10', "تحويل إنستاباي (InstaPay)")}
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
                  textAlign: isEn ? 'left' : 'right',
                }}
              >
                {isEn ? 'Vodafone Cash / E-Wallets' : t('settings.subscription.upgrade_renewal_modal.s11', "فودافون كاش / محافظ إلكترونية")}
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
                  textAlign: isEn ? 'left' : 'right',
                }}
              >
                {isEn ? 'Official Bank Wire' : t('settings.subscription.upgrade_renewal_modal.s12', "تحويل بنكي رسمي")}
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
                  textAlign: isEn ? 'left' : 'right',
                }}
              >
                {isEn ? 'Cash via Company Rep' : t('settings.subscription.upgrade_renewal_modal.s13', "نقداً عبر مندوب الشركة")}
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              {isEn ? 'Notes or Transfer Reference Number:' : t('settings.subscription.upgrade_renewal_modal.s14', "ملاحظات أو رقم مرجع التحويل:")}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder={isEn ? 'e.g. Transferred from 010xxxx or Ref #12345' : t('settings.subscription.upgrade_renewal_modal.s15', "مثال: تم التحويل من رقم 010xxxx...")}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
            />
          </div>

          <div className="standard-dialog-footer">
            <Button variant="secondary" onClick={onClose}>
              {isEn ? 'Cancel' : t('settings.subscription.upgrade_renewal_modal.s16', "إلغاء")}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isSubmitting}
              style={{ backgroundColor: '#170e5e', color: '#ffffff', fontWeight: 700 }}
            >
              {isSubmitting ? (isEn ? 'Processing...' : t('settings.subscription.upgrade_renewal_modal.s17', "جاري المعالجة...")) : (isEn ? 'Confirm Payment & Activate' : t('settings.subscription.upgrade_renewal_modal.s18', "تأكيد السداد والتفعيل"))}
            </Button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
