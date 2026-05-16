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
  return normalizeArabicDigits(value).replace(/[طŒ,]/g, '.').trim();
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

export function getCreatedEmployeeId(
  result: unknown,
  draft: EmployeeDraft,
  firstName: string,
) {
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
