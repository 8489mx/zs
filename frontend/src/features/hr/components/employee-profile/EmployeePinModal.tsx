import React from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';

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
  return (
    <DialogShell
      open={open}
      onClose={onClose}
      width="400px"
      ariaLabel="تعديل رمز الدخول السريع (PIN)"
      showCloseButton={true}
    >
      <div className="dialog-card" style={{ padding: '20px', direction: 'rtl' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          تعيين رمز الدخول السريع (PIN)
        </h3>
        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '14px', lineHeight: 1.5 }}>
          يُستخدم هذا الرمز المكون من 4 إلى 6 أرقام لتسجيل حضور الموظف سريعاً من الهاتف أو الدخول لبوابة الخدمة الذاتية.
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            رمز الـ PIN الجديد (أرقام فقط)
          </label>
          <input
            type="password"
            maxLength={6}
            value={pinCodeInput}
            onChange={(e) => setPinCodeInput(e.target.value.replace(/\D/g, ''))}
            placeholder="مثال: 1234"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '1.1rem',
              letterSpacing: '4px',
              textAlign: 'center',
              fontWeight: 800,
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={onSave} disabled={isSubmitting || pinCodeInput.trim().length < 4}>
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ الرمز'}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
