import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { EyeIcon, EyeOffIcon } from '@/shared/components/icons/AppIcons';
import { validatePasscode } from '@/shared/utils/passcode-validator';

interface EmployeePinModalProps {
  open: boolean;
  onClose: () => void;
  pinCodeInput: string;
  setPinCodeInput: (v: string) => void;
  onSave: () => void;
  isSubmitting: boolean;
}

export function EmployeePinModal({
  open,
  onClose,
  pinCodeInput,
  setPinCodeInput,
  onSave,
  isSubmitting,
}: EmployeePinModalProps) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSave = () => {
    const check = validatePasscode(pinCodeInput);
    if (!check.valid) {
      setValidationError(check.error || 'رمز الدخول غير صالح');
      return;
    }
    setValidationError('');
    onSave();
  };

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      width="440px"
      ariaLabel={t('hr.employee_profile.employee_pin_modal.s0', "تعديل كلمة المرور أو رمز الدخول السريع")}
      showCloseButton={true}
    >
      <div className="dialog-card" style={{ padding: '20px', direction: 'rtl' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          {t('hr.employee_profile.employee_pin_modal.s1', "تعيين كلمة المرور / الرمز السري")}
        </h3>
        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '14px', lineHeight: 1.5 }}>
          {t('hr.employee_profile.employee_pin_modal.s2', "يُستخدم هذا الرمز أو كلمة المرور لتسجيل حضور الموظف من الهاتف (Mobile Punch) وللدخول إلى بوابة الخدمة الذاتية (ESS).")}
        </p>

        {validationError && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '8px 12px',
              marginBottom: '12px',
              fontSize: '12px',
              color: '#dc2626',
              fontWeight: 600,
            }}
          >
            {validationError}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
              {t('hr.employee_profile.employee_pin_modal.s3', "كلمة المرور / الرمز السري الجديد")}
            </label>
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
              }}
            >
              {showPassword ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
              <span>{showPassword ? 'إخفاء' : 'إظهار'}</span>
            </button>
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            maxLength={64}
            value={pinCodeInput}
            onChange={(e) => {
              setPinCodeInput(e.target.value);
              if (validationError) setValidationError('');
            }}
            placeholder={t('hr.employee_profile.employee_pin_modal.s4', "أدخل كلمة مرور قوية أو رمز أرقام")}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              direction: 'ltr',
              textAlign: 'left',
              boxSizing: 'border-box',
            }}
          />
          <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            يمكنك كتابة كلمة مرور حقيقية بأحرف وأرقام، أو رمز PIN قوي لا يقل عن 4 أرقام (يُمنع 0000 أو 1234).
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {t('hr.employee_profile.employee_pin_modal.s5', "إلغاء")}
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSubmitting || pinCodeInput.trim().length < 4}>
            {isSubmitting ? t('hr.employee_profile.employee_pin_modal.s6', "جاري الحفظ...") : t('hr.employee_profile.employee_pin_modal.s7', "حفظ الرمز")}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
