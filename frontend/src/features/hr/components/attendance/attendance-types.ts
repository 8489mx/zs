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
  employeeName?: string;
  employeeNo?: string;
  scheduledTime?: string;
} | null;

export function todayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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

export function toCheckOutDateTime(workDate: string, checkIn: string, checkOut: string) {
  if (!checkOut) return undefined;
  const start = normalizeTime(checkIn), end = normalizeTime(checkOut);
  if (!start || !end || end > start) return toDateTime(workDate, checkOut);
  const date = new Date(workDate + 'T12:00:00');
  date.setDate(date.getDate() + 1);
  const nextDay = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return toDateTime(nextDay, checkOut);
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

export function calculateAttendancePayableMinutes(row: {
  compensationType?: string;
  actualMinutes: number;
  expectedDailyHours?: number | null;
  scheduledCheckInTime?: string | null;
  scheduledCheckOutTime?: string | null;
  overtimePolicy?: string | null;
  approvedOvertimeMinutes?: number | null;
  pendingOvertimeMinutes?: number | null;
}): {
  payableMinutes: number;
  baseMinutes: number;
  approvedOvertimeMinutes: number;
  pendingOvertimeMinutes: number;
  isCapped: boolean;
} {
  const actual = Math.max(0, Math.floor(Number(row.actualMinutes || 0)));
  if (actual === 0 || row.compensationType !== 'hourly') {
    return { payableMinutes: 0, baseMinutes: 0, approvedOvertimeMinutes: 0, pendingOvertimeMinutes: 0, isCapped: false };
  }

  let expected = 8 * 60;
  if (row.expectedDailyHours != null && Number(row.expectedDailyHours) > 0) {
    expected = Math.round(Number(row.expectedDailyHours) * 60);
  } else if (row.scheduledCheckInTime && row.scheduledCheckOutTime) {
    const [ih, im] = row.scheduledCheckInTime.slice(0, 5).split(':').map(Number);
    const [oh, om] = row.scheduledCheckOutTime.slice(0, 5).split(':').map(Number);
    if ([ih, im, oh, om].every(Number.isFinite)) {
      const shift = (oh * 60 + om) <= (ih * 60 + im)
        ? (oh * 60 + om) + 1440 - (ih * 60 + im)
        : (oh * 60 + om) - (ih * 60 + im);
      if (shift > 0 && shift <= 1440) expected = shift;
    }
  }

  const policy = String(row.overtimePolicy || 'review_only').toLowerCase();
  const approved = Math.max(0, Math.floor(Number(row.approvedOvertimeMinutes || 0)));

  if (actual <= expected) {
    return {
      payableMinutes: actual,
      baseMinutes: actual,
      approvedOvertimeMinutes: 0,
      pendingOvertimeMinutes: 0,
      isCapped: false,
    };
  }

  const baseMinutes = expected;
  const extraMinutes = actual - expected;

  if (policy === 'auto_approved') {
    return {
      payableMinutes: actual,
      baseMinutes,
      approvedOvertimeMinutes: extraMinutes,
      pendingOvertimeMinutes: 0,
      isCapped: false,
    };
  }

  if (policy === 'disabled') {
    return {
      payableMinutes: baseMinutes,
      baseMinutes,
      approvedOvertimeMinutes: 0,
      pendingOvertimeMinutes: 0,
      isCapped: true,
    };
  }

  const validApproved = Math.min(extraMinutes, approved);
  const unapproved = extraMinutes - validApproved;
  const pending = Number(row.pendingOvertimeMinutes || 0) || Math.max(0, unapproved);

  return {
    payableMinutes: baseMinutes + validApproved,
    baseMinutes,
    approvedOvertimeMinutes: validApproved,
    pendingOvertimeMinutes: pending,
    isCapped: unapproved > 0,
  };
}

