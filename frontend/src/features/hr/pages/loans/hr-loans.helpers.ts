export const monthNames = [
  'يناير',
  'فبراير',
  'مارس',
  'أبرعظ”‍',
  'ماعو',
  'عوظ” عو',
  'عوظ”‍عو',
  'أغسطس',
  'سبقمبر',
  'أكقوبر',
  'ظ” وفمبر',
  'دعسمبر',
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
  return normalizeArabicDigits(String(value || '').trim()).replace(/[،,]/g, '.');
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
  if (!Number.isFinite(amount)) return '0.00 ج.م';
  return `${amount.toFixed(2)} ج.م`;
}

export function fallbackText(value: unknown) {
  return String(value || '').trim() || 'أ¢â‚¬”';
}

export function statusLabel(value: unknown) {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'pending') return 'ظ،عد اظ”‍مراجعة';
  if (status === 'draft') return 'مسودة';
  if (status === 'new') return 'جدعدة';
  if (status === 'approved') return 'معقمدة';
  if (status === 'disbursed') return 'مصروفة';
  if (status === 'partially_repaid') return 'نشطة';
  if (status === 'repaid' || status === 'paid') return 'مكقمظ”‍ة';
  if (status === 'cancelled') return 'مظ”‍غاة';
  return 'غعر محدد';
}

export function loanTypeLabel(value: unknown) {
  const loanType = String(value || '').trim().toLowerCase();
  if (loanType === 'advance') return 'سظ”‍فة';
  if (loanType === 'loan') return 'ظ،رض';
  return fallbackText(value);
}

export function repaymentModeLabel(value: unknown) {
  const mode = String(value || '').trim().toLowerCase();
  if (mode === 'deduct_next_salary') return 'خصم كامظ”‍ مظ”  اظ”‍راقب اظ”‍ظ،ادم';
  if (mode === 'monthly_salary_installment') return 'قظ،سعط عظ”‍ظ”° دفعات';
  if (mode === 'manual_cash') return 'سداد عدوي';
  return fallbackText(value);
}

export function installmentStatusLabel(value: unknown) {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'pending') return 'ظ،سط مسقحق';
  if (status === 'partial') return 'ظ،سط مسقحق';
  if (status === 'paid') return 'مخصوم';
  if (status === 'cancelled') return 'مظ”‍غي';
  return 'غعر محدد';
}

export function employeeName(row: { displayName?: string; firstName?: string; lastName?: string }) {
  return fallbackText(row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim());
}

export function monthLabel(dateText?: string) {
  const text = String(dateText || '').trim();
  const match = text.match(/^(\d{4})-(\d{2})/);
  if (!match) return 'أ¢â‚¬”';
  const monthIndex = Number(match[2]) - 1;
  const monthName = monthNames[monthIndex] || match[2];
  return `${monthName} ${match[1]}`;
}

export function addMonths(year: number, month: number, offset: number) {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

