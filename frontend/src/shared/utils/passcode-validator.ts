/**
 * Shared client-side passcode validator for Delivery Reps, Employees, and Portals.
 * Validates against trivial repeated or sequential patterns, short length, and phone suffix.
 */
export interface PasscodeValidationResult {
  valid: boolean;
  error?: string;
}

const TRIVIAL_PATTERNS = new Set([
  '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
  '1234', '2345', '3456', '4567', '5678', '6789', '0123',
  '4321', '5432', '6543', '7654', '8765', '9876', '3210',
  '1212', '2121', '1122', '2211', '123123',
  '000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999',
  '123456', '654321', '12345678', '87654321',
  'password', 'admin', '12345',
]);

export function validatePasscode(
  passcode: string,
  options?: { phone?: string; identifier?: string },
): PasscodeValidationResult {
  const trimmed = String(passcode || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'يرجى إدخال رمز الدخول السري أو كلمة المرور' };
  }

  if (trimmed.length < 4) {
    return { valid: false, error: 'يجب ألا يقل الرمز أو كلمة المرور عن 4 خانات' };
  }

  // Trivial repeated digits (e.g. 0000, 1111, 999999)
  if (/^(\d)\1+$/.test(trimmed)) {
    return { valid: false, error: 'الرمز ضعيف جداً (أرقام مكررة). يرجى اختيار رمز أو كلمة مرور غير متوقعة' };
  }

  // Blacklist trivial patterns
  if (TRIVIAL_PATTERNS.has(trimmed.toLowerCase())) {
    return { valid: false, error: 'الرمز سهل التخمين وبديهي (مثل 1234 أو 0000). يرجى تعيين رمز أو كلمة مرور قوية' };
  }

  // Suffix of phone number
  if (options?.phone) {
    const cleanDigits = String(options.phone).replace(/\D/g, '');
    if (cleanDigits.length >= 4) {
      const last4 = cleanDigits.slice(-4);
      const last6 = cleanDigits.length >= 6 ? cleanDigits.slice(-6) : null;
      if (trimmed === last4 || (last6 && trimmed === last6)) {
        return { valid: false, error: 'لا يمكن استخدام أرقام مطابقة لنهاية رقم الهاتف كرمز دخول' };
      }
    }
  }

  return { valid: true };
}
