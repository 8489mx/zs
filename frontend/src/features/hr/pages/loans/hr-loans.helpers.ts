export const monthNames = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
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
  return String(value || '').trim() || '—';
}

export function statusLabel(value: unknown) {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'pending') return 'قيد المراجعة';
  if (status === 'draft') return 'مسودة';
  if (status === 'new') return 'جديدة';
  if (status === 'approved') return 'معتمدة';
  if (status === 'disbursed' || status === 'paid') return 'مصروفة';
  if (status === 'partially_repaid') return 'مسددة جزئيًا';
  if (status === 'repaid') return 'مكتملة';
  if (status === 'cancelled') return 'ملغاة';
  return 'غير محدد';
}

export function loanTypeLabel(value: unknown) {
  const loanType = String(value || '').trim().toLowerCase();
  if (loanType === 'advance') return 'سلفة';
  if (loanType === 'loan') return 'قرض';
  return fallbackText(value);
}

export function repaymentModeLabel(value: unknown) {
  const mode = String(value || '').trim().toLowerCase();
  if (mode === 'deduct_next_salary') return 'خصم كامل من الراتب القادم';
  if (mode === 'monthly_salary_installment') return 'تقسيط على دفعات';
  if (mode === 'manual_cash') return 'سداد يدوي';
  return fallbackText(value);
}

export function installmentStatusLabel(value: unknown) {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'pending') return 'قسط مستحق';
  if (status === 'partial') return 'قسط جزئي';
  if (status === 'paid') return 'مخصوم';
  if (status === 'cancelled') return 'ملغي';
  return 'غير محدد';
}

export function employeeName(row: { displayName?: string; firstName?: string; lastName?: string }) {
  return fallbackText(row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim());
}

export function monthLabel(dateText?: string) {
  const text = String(dateText || '').trim();
  const match = text.match(/^(\d{4})-(\d{2})/);
  if (!match) return '—';
  const monthIndex = Number(match[2]) - 1;
  const monthName = monthNames[monthIndex] || match[2];
  return `${monthName} ${match[1]}`;
}

export function addMonths(year: number, month: number, offset: number) {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}