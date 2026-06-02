export interface EmployeeDraft {
  employeeNo: string;
  firstName: string;
  lastName: string;
  mobile: string;
  nationalId: string;
  departmentId: string;
  jobTitleId: string;
  positionId: string;
  hireDate: string;
  status: 'active' | 'inactive';
  contractType: string;
  baseSalary: string;
  compensationType: 'monthly' | 'hourly';
  hourlyRate: string;
  expectedDailyHours: string;
  scheduledCheckInTime: string;
  scheduledCheckOutTime: string;
  graceMinutes: string;
  overtimePolicy: 'review_only' | 'disabled' | 'auto_approved';
  notes: string;
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
  { label: 'وردية النشاط الأساسية', description: '10:00 صباحًا إلى 10:00 مساءً · 12 ساعة', checkIn: '10:00', checkOut: '22:00', hours: '12', grace: '15' },
  { label: 'وردية صباحية', description: '9:00 صباحًا إلى 5:00 مساءً · 8 ساعات', checkIn: '09:00', checkOut: '17:00', hours: '8', grace: '15' },
  { label: 'وردية مسائية', description: '2:00 ظهرًا إلى 10:00 مساءً · 8 ساعات', checkIn: '14:00', checkOut: '22:00', hours: '8', grace: '15' },
];

export const initialDraft: EmployeeDraft = {
  employeeNo: '',
  firstName: '',
  lastName: '',
  mobile: '',
  nationalId: '',
  departmentId: '',
  jobTitleId: '',
  positionId: '',
  hireDate: '',
  status: 'active',
  contractType: '',
  baseSalary: '',
  compensationType: 'monthly',
  hourlyRate: '',
  expectedDailyHours: '',
  scheduledCheckInTime: '',
  scheduledCheckOutTime: '',
  graceMinutes: '',
  overtimePolicy: 'review_only',
  notes: '',
};

export function normalizeArabicDigits(value: string) {
  return String(value || '')
    .replace(/[\u0660-\u0669]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[\u06F0-\u06F9]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

export function normalizeNumberText(value: string) {
  return normalizeArabicDigits(value).replace(/[،,]/g, '.').trim();
}

export function normalizeDigitsOnly(value: string) {
  return normalizeArabicDigits(value).replace(/\D/g, '');
}

export function normalizePhone(value: string) {
  return normalizeArabicDigits(value).replace(/\s+/g, '').trim();
}

export function toId(value: string) {
  const numeric = Number(normalizeDigitsOnly(value || ''));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

export function objectValue(value: unknown, key: string) {
  if (!value || typeof value !== 'object') return undefined;
  return (value as Record<string, unknown>)[key];
}

export function createdMasterId(result: unknown, createdName?: string) {
  const rows = objectValue(result, 'rows');
  const cleanCreatedName = String(createdName || '').trim();
  if (Array.isArray(rows) && cleanCreatedName) {
    const matchedRow = rows.find((row) => String(objectValue(row, 'name') || '').trim() === cleanCreatedName);
    const rowId = objectValue(matchedRow, 'id');
    if (String(rowId || '').trim()) return String(rowId);
  }

  const candidates = [
    objectValue(result, 'id'),
    objectValue(objectValue(result, 'row'), 'id'),
    objectValue(objectValue(result, 'item'), 'id'),
    objectValue(objectValue(result, 'department'), 'id'),
    objectValue(objectValue(result, 'jobTitle'), 'id'),
    objectValue(objectValue(result, 'position'), 'id'),
  ];
  const value = candidates.find((entry) => String(entry || '').trim());
  return value == null ? '' : String(value);
}

export function getCreatedEmployeeId(result: unknown, draft: EmployeeDraft, firstName: string) {
  const responseRows = ((result as { employees?: Array<{ id?: string | number; firstName?: string; lastName?: string; employeeNo?: string }> })?.employees || []);
  const lastName = String(draft.lastName || '').trim();
  const employeeNo = String(draft.employeeNo || '').trim();
  const matched = responseRows.find((row) => {
    const sameFirst = String(row.firstName || '').trim() === firstName;
    const sameLast = String(row.lastName || '').trim() === lastName;
    const sameNo = employeeNo && String(row.employeeNo || '').trim() === employeeNo;
    return sameNo || (sameFirst && sameLast);
  });
  return matched?.id != null ? String(matched.id) : '';
}
