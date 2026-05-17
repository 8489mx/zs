import type { HrEmployee } from '@/types/domain';

export interface EmployeeEditDraft {
  employeeNo: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  departmentId: string;
  jobTitleId: string;
  positionId: string;
  hireDate: string;
  status: 'active' | 'inactive';
  notes: string;
  compensationType: 'monthly' | 'hourly';
  hourlyRate: string;
  expectedDailyHours: string;
  scheduledCheckInTime: string;
  scheduledCheckOutTime: string;
  graceMinutes: string;
  overtimePolicy: 'review_only' | 'disabled' | 'auto_approved';
}

export type ShiftPreset = {
  label: string;
  description: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  grace: string;
};

export const shiftPresets: ShiftPreset[] = [
  { label: 'وردية المحل الأساسية', description: '10:00 صباحًا إلى 10:00 مساءً · 12 ساعة', checkIn: '10:00', checkOut: '22:00', hours: '12', grace: '15' },
  { label: 'وردية صباحية', description: '9:00 صباحًا إلى 5:00 مساءً · 8 ساعات', checkIn: '09:00', checkOut: '17:00', hours: '8', grace: '15' },
  { label: 'وردية مسائية', description: '2:00 ظهرًا إلى 10:00 مساءً · 8 ساعات', checkIn: '14:00', checkOut: '22:00', hours: '8', grace: '15' },
];

export const initialDraft: EmployeeEditDraft = {
  employeeNo: '',
  firstName: '',
  lastName: '',
  nationalId: '',
  departmentId: '',
  jobTitleId: '',
  positionId: '',
  hireDate: '',
  status: 'active',
  notes: '',
  compensationType: 'monthly',
  hourlyRate: '',
  expectedDailyHours: '',
  scheduledCheckInTime: '',
  scheduledCheckOutTime: '',
  graceMinutes: '',
  overtimePolicy: 'review_only',
};

export function normalizeArabicDigits(value: string) {
  return String(value || '')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

export function normalizeDigitsOnly(value: string) {
  return normalizeArabicDigits(value).replace(/\D/g, '');
}

export function normalizeNumberText(value: string) {
  return normalizeArabicDigits(value).replace(/[،,]/g, '.').trim();
}

export function toId(value: string) {
  const normalized = normalizeDigitsOnly(value);
  return normalized ? Number(normalized) : undefined;
}

export function getEmployeeRef(employee: HrEmployee | undefined, key: string) {
  if (!employee) return '';
  const value = (employee as HrEmployee & Record<string, unknown>)[key];
  return value == null ? '' : String(value);
}
