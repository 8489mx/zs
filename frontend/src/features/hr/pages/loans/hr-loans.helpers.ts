export const monthNames = [
  'ط¸ظ¹ط¸â€ ط·آ§ط¸ظ¹ط·آ±',
  'ط¸ظ¾ط·آ¨ط·آ±ط·آ§ط¸ظ¹ط·آ±',
  'ط¸â€¦ط·آ§ط·آ±ط·آ³',
  'ط·آ£ط·آ¨ط·آ±ط¸ظ¹ط¸â€‍',
  'ط¸â€¦ط·آ§ط¸ظ¹ط¸ث†',
  'ط¸ظ¹ط¸ث†ط¸â€ ط¸ظ¹ط¸ث†',
  'ط¸ظ¹ط¸ث†ط¸â€‍ط¸ظ¹ط¸ث†',
  'ط·آ£ط·ط›ط·آ³ط·آ·ط·آ³',
  'ط·آ³ط·آ¨ط·ع¾ط¸â€¦ط·آ¨ط·آ±',
  'ط·آ£ط¸ئ’ط·ع¾ط¸ث†ط·آ¨ط·آ±',
  'ط¸â€ ط¸ث†ط¸ظ¾ط¸â€¦ط·آ¨ط·آ±',
  'ط·آ¯ط¸ظ¹ط·آ³ط¸â€¦ط·آ¨ط·آ±',
];

export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeArabicDigits(value: string) {
  return value
    .replace(/[\u0660-\u0669]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[\u06F0-\u06F9]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

export function normalizeNumericInput(value: string) {
  return normalizeArabicDigits(String(value || '').trim()).replace(/[ط·إ’,]/g, '.');
}

export function parsePositiveNumber(value: string) {
  const amount = Number(normalizeNumericInput(value));
  return Number.isFinite(amount) ? amount : 0;
}

export interface LoanDraft {
  employeeId: string;
  loanType: string;
  principalAmount: string;
  issueDate: string;
  repaymentMethod: 'next_payroll_full' | 'installments';
  installmentCount: string;
  firstDeductionMonth: string;
  firstDeductionYear: string;
  notes: string;
}

export function createInitialLoanDraft(): LoanDraft {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return {
    employeeId: '',
    loanType: 'advance',
    principalAmount: '',
    issueDate: todayDate(),
    repaymentMethod: 'next_payroll_full',
    installmentCount: '2',
    firstDeductionMonth: month,
    firstDeductionYear: String(now.getFullYear()),
    notes: '',
  };
}

export function money(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '0.00 ط·آ¬.ط¸â€¦';
  return `${amount.toFixed(2)} ط·آ¬.ط¸â€¦`;
}

export function fallbackText(value: unknown) {
  return String(value || '').trim() || 'أ¢â‚¬â€‌';
}

export function statusLabel(value: unknown) {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'pending') return 'ط¸â€ڑط¸ظ¹ط·آ¯ ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط·آ§ط·آ¬ط·آ¹ط·آ©';
  if (status === 'draft') return 'ط¸â€¦ط·آ³ط¸ث†ط·آ¯ط·آ©';
  if (status === 'new') return 'ط·آ¬ط·آ¯ط¸ظ¹ط·آ¯ط·آ©';
  if (status === 'approved') return 'ط¸â€¦ط·آ¹ط·ع¾ط¸â€¦ط·آ¯ط·آ©';
  if (status === 'disbursed') return 'ط¸â€¦ط·آµط·آ±ط¸ث†ط¸ظ¾ط·آ©';
  if (status === 'partially_repaid') return 'ط¸â€ ط·آ´ط·آ·ط·آ©';
  if (status === 'repaid' || status === 'paid') return 'ط¸â€¦ط¸ئ’ط·ع¾ط¸â€¦ط¸â€‍ط·آ©';
  if (status === 'cancelled') return 'ط¸â€¦ط¸â€‍ط·ط›ط·آ§ط·آ©';
  return 'ط·ط›ط¸ظ¹ط·آ± ط¸â€¦ط·آ­ط·آ¯ط·آ¯';
}

export function loanTypeLabel(value: unknown) {
  const loanType = String(value || '').trim().toLowerCase();
  if (loanType === 'advance') return 'ط·آ³ط¸â€‍ط¸ظ¾ط·آ©';
  if (loanType === 'loan') return 'ط¸â€ڑط·آ±ط·آ¶';
  return fallbackText(value);
}

export function repaymentModeLabel(value: unknown) {
  const mode = String(value || '').trim().toLowerCase();
  if (mode === 'deduct_next_salary') return 'ط·آ®ط·آµط¸â€¦ ط¸ئ’ط·آ§ط¸â€¦ط¸â€‍ ط¸â€¦ط¸â€  ط·آ§ط¸â€‍ط·آ±ط·آ§ط·ع¾ط·آ¨ ط·آ§ط¸â€‍ط¸â€ڑط·آ§ط·آ¯ط¸â€¦';
  if (mode === 'monthly_salary_installment') return 'ط·ع¾ط¸â€ڑط·آ³ط¸ظ¹ط·آ· ط·آ¹ط¸â€‍ط¸â€° ط·آ¯ط¸ظ¾ط·آ¹ط·آ§ط·ع¾';
  if (mode === 'manual_cash') return 'ط·آ³ط·آ¯ط·آ§ط·آ¯ ط¸ظ¹ط·آ¯ط¸ث†ط¸ظ¹';
  return fallbackText(value);
}

export function installmentStatusLabel(value: unknown) {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'pending') return 'ط¸â€ڑط·آ³ط·آ· ط¸â€¦ط·آ³ط·ع¾ط·آ­ط¸â€ڑ';
  if (status === 'partial') return 'ط¸â€ڑط·آ³ط·آ· ط¸â€¦ط·آ³ط·ع¾ط·آ­ط¸â€ڑ';
  if (status === 'paid') return 'ط¸â€¦ط·آ®ط·آµط¸ث†ط¸â€¦';
  if (status === 'cancelled') return 'ط¸â€¦ط¸â€‍ط·ط›ط¸ظ¹';
  return 'ط·ط›ط¸ظ¹ط·آ± ط¸â€¦ط·آ­ط·آ¯ط·آ¯';
}

export function employeeName(row: { displayName?: string; firstName?: string; lastName?: string }) {
  return fallbackText(row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim());
}

export function monthLabel(dateText?: string) {
  const text = String(dateText || '').trim();
  const match = text.match(/^(\d{4})-(\d{2})/);
  if (!match) return 'أ¢â‚¬â€‌';
  const monthIndex = Number(match[2]) - 1;
  const monthName = monthNames[monthIndex] || match[2];
  return `${monthName} ${match[1]}`;
}

export function addMonths(year: number, month: number, offset: number) {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

