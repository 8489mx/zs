import type { HrAttendanceException } from '@/types/domain';

export type DraftRow = {
  employeeId: string;
  status: string;
  checkInAt: string;
  checkOutAt: string;
  notes: string;
};

export type ExceptionFilter = 'all' | 'needs_action' | 'overtime' | 'deduction';

export type ManualAttendancePrompt = {
  rowId: string;
  employeeId: number;
  workDate: string;
  type: 'check_in' | 'check_out';
  defaultTime: string;
} | null;

export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeArabicDigits(value: string) {
  return String(value || '')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

export function normalizeTime(value: string) {
  const normalized = normalizeArabicDigits(String(value || '').trim());
  const match = normalized.match(/^(\d{1,2}):(\d{1,2})/);
  if (!match) return '';
  const hh = String(Math.max(0, Math.min(23, Number(match[1])))).padStart(2, '0');
  const mm = String(Math.max(0, Math.min(59, Number(match[2])))).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function toDateTime(workDate: string, timeValue: string) {
  if (!workDate || !timeValue) return undefined;
  const safeTime = normalizeTime(timeValue);
  if (!safeTime) return undefined;
  const localDate = new Date(`${workDate}T${safeTime}:00`);
  return !isNaN(localDate.getTime()) ? localDate.toISOString() : `${workDate}T${safeTime}:00`;
}

export function exceptionTypeLabel(value: string) {
  switch (value) {
    case 'early_check_in': return 'حضور مبكر';
    case 'late_check_in': return 'تأخير';
    case 'early_check_out': return 'انصراف مبكر';
    case 'late_check_out': return 'انصراف متأخر';
    case 'missing_check_in': return 'حضور غير مسجل';
    case 'missing_check_out': return 'انصراف غير مسجل';
    case 'extra_hours': return 'ساعات إضافية';
    case 'absent': return 'غياب';
    default: return value || 'غير محدد';
  }
}

export function exceptionStatusLabel(value: string) {
  switch (value) {
    case 'pending': return 'في انتظار المراجعة';
    case 'approved': return 'معتمد';
    case 'skipped': return 'غير معتمد';
    case 'auto_calculated': return 'محسوب تلقائيًا';
    case 'needs_review': return 'يحتاج مراجعة';
    default: return value || 'غير محدد';
  }
}

export function isOvertimeException(type: string) {
  return type === 'early_check_in' || type === 'late_check_out' || type === 'extra_hours';
}

export function isDeductionException(type: string) {
  return type === 'late_check_in' || type === 'early_check_out' || type === 'missing_check_in' || type === 'missing_check_out' || type === 'absent';
}

export function isActionableException(row: HrAttendanceException) {
  const status = String(row.status || '').toLowerCase();
  return status === 'pending' || status === 'needs_review';
}

export function filterExceptions(rows: HrAttendanceException[], filter: ExceptionFilter) {
  if (filter === 'needs_action') return rows.filter(isActionableException);
  if (filter === 'overtime') return rows.filter((row) => isOvertimeException(row.exceptionType));
  if (filter === 'deduction') return rows.filter((row) => isDeductionException(row.exceptionType));
  return rows;
}
