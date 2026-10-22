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
  payFrequency: 'monthly' | 'weekly' | 'biweekly' | 'daily';
  hourlyRate: string;
  expectedDailyHours: string;
  scheduledCheckInTime: string;
  scheduledCheckOutTime: string;
  graceMinutes: string;
  overtimePolicy: 'review_only' | 'disabled' | 'auto_approved';
  attendancePolicy: 'strict' | 'flexible';
  commissionType: string;
  commissionValue: string;
  commissionTarget: string;
  delayPolicy: string;
  hasSocialInsurance?: boolean;
  hasIncomeTax?: boolean;
  bankName?: string;
  bankAccountNumber?: string;
  iban?: string;
  bankSwiftCode?: string;
  annualLeaveBalance?: string;
  insuranceSalary?: string;
  notes: string;
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type ShiftPreset = {
  id: string;
  label: string;
  description: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  grace: string;
};

export const shiftPresets: ShiftPreset[] = [
  { id: 'morning', label: 'صباحي (9 ص - 5 م)', description: '9:00 ص إلى 5:00 م · 8 ساعات', checkIn: '09:00', checkOut: '17:00', hours: '8', grace: '15' },
  { id: 'evening', label: 'مسائي (2 م - 10 م)', description: '2:00 م إلى 10:00 م · 8 ساعات', checkIn: '14:00', checkOut: '22:00', hours: '8', grace: '15' },
  { id: 'full_day', label: 'دوام كامل (10 ص - 10 م)', description: '10:00 ص إلى 10:00 م · 12 ساعة', checkIn: '10:00', checkOut: '22:00', hours: '12', grace: '15' },
  { id: 'early', label: 'صباحي مبكر (8 ص - 4 م)', description: '8:00 ص إلى 4:00 م · 8 ساعات', checkIn: '08:00', checkOut: '16:00', hours: '8', grace: '15' },
  { id: 'night', label: 'ليلي (10 م - 6 ص)', description: '10:00 م إلى 6:00 ص · 8 ساعات', checkIn: '22:00', checkOut: '06:00', hours: '8', grace: '15' },
];

export const CONTRACT_TYPE_OPTIONS = [
  { value: 'عقد محدد المدة (سنة)', label: 'عقد محدد المدة (سنة)' },
  { value: 'عقد غير محدد المدة (دائم)', label: 'عقد غير محدد المدة (دائم)' },
  { value: 'عقد تحت الاختبار (3 أشهر)', label: 'عقد تحت الاختبار (3 أشهر)' },
  { value: 'عقد دوام جزئي (Part-time)', label: 'عقد دوام جزئي (Part-time)' },
  { value: 'عقد تدريب مهني', label: 'عقد تدريب مهني' },
  { value: 'عمل حر / استشاري (Freelance)', label: 'عمل حر / استشاري (Freelance)' },
  { value: 'عقد موسمي / مؤقت', label: 'عقد موسمي / مؤقت' },
];

export const POPULAR_BANKS = [
  { value: 'البنك الأهلي المصري (NBE)', label: 'البنك الأهلي المصري (NBE)' },
  { value: 'بنك مصر (Banque Misr)', label: 'بنك مصر (Banque Misr)' },
  { value: 'البنك التجاري الدولي (CIB)', label: 'البنك التجاري الدولي (CIB)' },
  { value: 'بنك QNB الأهلي', label: 'بنك QNB الأهلي' },
  { value: 'مصرف أبوظبي الإسلامي (ADIB)', label: 'مصرف أبوظبي الإسلامي (ADIB)' },
  { value: 'بنك الإسكندرية', label: 'بنك الإسكندرية' },
  { value: 'البنك العربي الأفريقي الدولي (AAIB)', label: 'البنك العربي الأفريقي الدولي (AAIB)' },
  { value: 'بنك فيصل الإسلامي المصري', label: 'بنك فيصل الإسلامي المصري' },
  { value: 'مصرف الراجحي', label: 'مصرف الراجحي' },
  { value: 'البنك الأهلي السعودي (SNB)', label: 'البنك الأهلي السعودي (SNB)' },
  { value: 'بنك الرياض', label: 'بنك الرياض' },
  { value: 'مصرف الإنماء', label: 'مصرف الإنماء' },
];

export interface RoleTemplate {
  label: string;
  departmentName: string;
  jobTitleName: string;
  compensationType: 'monthly' | 'hourly';
  baseSalary?: string;
  hourlyRate?: string;
  expectedDailyHours?: string;
  shiftPresetId: string;
  contractType: string;
}

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    label: 'كاشير (بالساعة)',
    departmentName: 'المبيعات ونقاط البيع',
    jobTitleName: 'كاشير',
    compensationType: 'hourly',
    hourlyRate: '30',
    expectedDailyHours: '8',
    shiftPresetId: 'morning',
    contractType: 'عقد محدد المدة (سنة)',
  },
  {
    label: 'بائع / ممثل مبيعات',
    departmentName: 'المبيعات',
    jobTitleName: 'ممثل مبيعات',
    compensationType: 'monthly',
    baseSalary: '6000',
    shiftPresetId: 'full_day',
    contractType: 'عقد محدد المدة (سنة)',
  },
  {
    label: 'عامل مخزن / مناولة',
    departmentName: 'المستودعات والمخازن',
    jobTitleName: 'عامل مخزن',
    compensationType: 'hourly',
    hourlyRate: '25',
    expectedDailyHours: '8',
    shiftPresetId: 'early',
    contractType: 'عقد محدد المدة (سنة)',
  },
  {
    label: 'محاسب مالي',
    departmentName: 'المالية والحسابات',
    jobTitleName: 'محاسب مالي',
    compensationType: 'monthly',
    baseSalary: '8000',
    shiftPresetId: 'morning',
    contractType: 'عقد غير محدد المدة (دائم)',
  },
  {
    label: 'خدمة عملاء',
    departmentName: 'خدمة العملاء',
    jobTitleName: 'أخصائي خدمة عملاء',
    compensationType: 'monthly',
    baseSalary: '5500',
    shiftPresetId: 'morning',
    contractType: 'عقد محدد المدة (سنة)',
  },
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
  hireDate: getTodayDateString(),
  status: 'active',
  contractType: 'عقد محدد المدة (سنة)',
  baseSalary: '',
  compensationType: 'monthly',
  payFrequency: 'monthly',
  hourlyRate: '',
  expectedDailyHours: '',
  scheduledCheckInTime: '09:00',
  scheduledCheckOutTime: '17:00',
  graceMinutes: '15',
  overtimePolicy: 'review_only',
  attendancePolicy: 'strict',
  commissionType: 'inherit',
  commissionValue: '',
  commissionTarget: '',
  delayPolicy: 'inherit',
  hasSocialInsurance: false,
  hasIncomeTax: false,
  bankName: '',
  bankAccountNumber: '',
  iban: '',
  bankSwiftCode: '',
  annualLeaveBalance: '21',
  insuranceSalary: '',
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
  const directId = objectValue(result, 'id');
  if (directId != null && String(directId).trim()) return String(directId);

  const rows = objectValue(result, 'rows');
  const cleanCreatedName = String(createdName || '').trim().toLowerCase();
  if (Array.isArray(rows) && cleanCreatedName) {
    const matchedRow = rows.find((row) => String(objectValue(row, 'name') || '').trim().toLowerCase() === cleanCreatedName);
    const rowId = objectValue(matchedRow, 'id');
    if (String(rowId || '').trim()) return String(rowId);
  }

  const candidates = [
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

export interface NationalIdInfo {
  isValid: boolean;
  birthDate?: string;
  birthDateFormatted?: string;
  gender?: 'ذكر' | 'أنثى';
  governorate?: string;
  error?: string;
}

const EGYPT_GOVERNORATES: Record<string, string> = {
  '01': 'القاهرة',
  '02': 'الإسكندرية',
  '03': 'بورسعيد',
  '04': 'السويس',
  '11': 'دمياط',
  '12': 'الدقهلية',
  '13': 'الشرقية',
  '14': 'القليوبية',
  '15': 'كفر الشيخ',
  '16': 'الغربية',
  '17': 'المنوفية',
  '18': 'البحيرة',
  '19': 'الإسماعيلية',
  '21': 'الجيزة',
  '22': 'بني سويف',
  '23': 'الفيوم',
  '24': 'المنيا',
  '25': 'أسيوط',
  '26': 'سوهاج',
  '27': 'قنا',
  '28': 'أسوان',
  '29': 'الأقصر',
  '31': 'البحر الأحمر',
  '32': 'الوادي الجديد',
  '33': 'مطروح',
  '34': 'شمال سيناء',
  '35': 'جنوب سيناء',
  '88': 'خارج جمهورية مصر',
};

export function parseEgyptianNationalId(id: string): NationalIdInfo {
  const cleanId = normalizeDigitsOnly(id);
  if (cleanId.length !== 14) {
    return { isValid: false };
  }
  const centuryDigit = cleanId[0];
  if (centuryDigit !== '2' && centuryDigit !== '3') {
    return { isValid: false, error: 'الرقم القومي غير مطابق (بداية القرن 2 أو 3)' };
  }
  const century = centuryDigit === '2' ? '19' : '20';
  const year = century + cleanId.substring(1, 3);
  const month = cleanId.substring(3, 5);
  const day = cleanId.substring(5, 7);
  const govCode = cleanId.substring(7, 9);
  const genderDigit = parseInt(cleanId[12], 10);

  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  const y = parseInt(year, 10);
  if (m < 1 || m > 12 || d < 1 || d > 31) {
    return { isValid: false, error: 'تاريخ الميلاد غير صحيح في الرقم القومي' };
  }
  const testDate = new Date(y, m - 1, d);
  if (testDate.getFullYear() !== y || testDate.getMonth() !== m - 1 || testDate.getDate() !== d) {
    return { isValid: false, error: 'تاريخ الميلاد غير مطابق لتقويم الأيام والشهور' };
  }

  const gender = genderDigit % 2 === 1 ? 'ذكر' : 'أنثى';
  const governorate = EGYPT_GOVERNORATES[govCode] || 'أخرى';
  const birthDate = `${year}-${month}-${day}`;
  const birthDateFormatted = `${day}/${month}/${year}`;

  return {
    isValid: true,
    birthDate,
    birthDateFormatted,
    gender,
    governorate,
  };
}

export function splitFullName(input: string): { firstName: string; lastName: string } {
  const trimmed = input.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) {
    return { firstName: trimmed, lastName: '' };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}
