import type { AuditLog } from '@/types/domain';

export type AuditActivityType =
  | 'auth'
  | 'import'
  | 'inventory'
  | 'sales'
  | 'purchases'
  | 'hr'
  | 'settings'
  | 'backup'
  | 'sensitive'
  | 'general';

type ActivityMeta = {
  type: AuditActivityType;
  label: string;
  badgeClass: string;
};

const ACTION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /(login|user login|تسجيل دخول)/i, label: 'تسجيل دخول' },
  { pattern: /(logout|تسجيل خروج)/i, label: 'تسجيل خروج' },
  { pattern: /(password change|change password|تغيير كلمة المرور)/i, label: 'تغيير كلمة المرور' },
  { pattern: /(upsert hr attendance record|attendance record|attendance)/i, label: 'تسجيل أو تعديل حضور موظف' },
  { pattern: /(import.+products|استيراد.+أصناف|استيراد أصناف)/i, label: 'استيراد أصناف' },
  { pattern: /(import.+customers|استيراد.+عملاء|استيراد عملاء)/i, label: 'استيراد عملاء' },
  { pattern: /(import.+suppliers|استيراد.+موردين|استيراد موردين)/i, label: 'استيراد موردين' },
  { pattern: /(opening stock|opening inventory|استيراد.+افتتاحي|استيراد مخزون افتتاحي)/i, label: 'استيراد مخزون افتتاحي' },
  { pattern: /(import.+employees|استيراد.+موظفين|استيراد موظفين)/i, label: 'استيراد موظفين' },
  { pattern: /(backup created|نسخ احتياطي|backup)/i, label: 'نسخة احتياطية' },
  { pattern: /(branch created|إضافة فرع)/i, label: 'إضافة فرع' },
  { pattern: /(location created|إضافة مخزن)/i, label: 'إضافة مخزن' },
  { pattern: /(settings updated|تعديل الإعدادات|update settings)/i, label: 'تعديل الإعدادات' },
];

const TYPE_META: Record<AuditActivityType, ActivityMeta> = {
  auth: { type: 'auth', label: 'دخول وخروج', badgeClass: 'audit-badge-auth' },
  import: { type: 'import', label: 'استيراد', badgeClass: 'audit-badge-import' },
  inventory: { type: 'inventory', label: 'مخزون', badgeClass: 'audit-badge-inventory' },
  sales: { type: 'sales', label: 'مبيعات', badgeClass: 'audit-badge-sales' },
  purchases: { type: 'purchases', label: 'مشتريات', badgeClass: 'audit-badge-purchases' },
  hr: { type: 'hr', label: 'موظفين', badgeClass: 'audit-badge-hr' },
  settings: { type: 'settings', label: 'إعدادات', badgeClass: 'audit-badge-settings' },
  backup: { type: 'backup', label: 'نسخ احتياطي', badgeClass: 'audit-badge-backup' },
  sensitive: { type: 'sensitive', label: 'عمليات حساسة', badgeClass: 'audit-badge-sensitive' },
  general: { type: 'general', label: 'عام', badgeClass: 'audit-badge-general' },
};

function readCombinedText(row: AuditLog): string {
  return `${String(row.action || '')} ${String(row.detailsSummary || '')} ${String(row.details || '')}`.toLowerCase();
}

export function getAuditActionLabel(action: string): string {
  const raw = String(action || '').trim();
  if (!raw) return 'عملية';
  const mapped = ACTION_PATTERNS.find((entry) => entry.pattern.test(raw));
  return mapped?.label || raw;
}

function detectType(row: AuditLog): AuditActivityType {
  const text = readCombinedText(row);

  if (/(login|logout|session|تسجيل دخول|تسجيل خروج)/i.test(text)) return 'auth';
  if (/(import|استيراد|csv|excel)/i.test(text)) return 'import';
  if (/(backup|نسخ احتياطي)/i.test(text)) return 'backup';
  if (/(attendance|موظف|hr|حضور|انصراف)/i.test(text)) return 'hr';
  if (/(settings|إعدادات|branch|location|فرع|مخزن)/i.test(text)) return 'settings';
  if (/(delete|remove|cancel|revoke|reset|sensitive|حذف|إلغاء|إبطال)/i.test(text)) return 'sensitive';
  if (/(inventory|stock|مخزون|جرد|صنف|تالف)/i.test(text)) return 'inventory';
  if (/(purchase|supplier|مشتريات|مورد)/i.test(text)) return 'purchases';
  if (/(sale|invoice|customer|مبيعات|فاتورة|عميل)/i.test(text)) return 'sales';
  return 'general';
}

export function getAuditActivityMeta(row: AuditLog): ActivityMeta {
  return TYPE_META[detectType(row)];
}

export function normalizeAuditDetailText(detailText: string): string {
  const raw = String(detailText || '').trim();
  if (!raw) return '—';

  const attendanceMatch = raw.match(/attendance record saved for employee\s*#?(\d+)\s*on\s*([0-9-]+)\s*by\s*([A-Za-z0-9_.-]+)/i);
  if (attendanceMatch) {
    const [, employeeId, date, actor] = attendanceMatch;
    return `تم تسجيل حضور الموظف رقم ${employeeId} بتاريخ ${date} بواسطة ${actor}`;
  }

  return raw
    .replace(/Upsert HR attendance record/gi, 'تسجيل أو تعديل حضور موظف')
    .replace(/Attendance record saved/gi, 'تم تسجيل الحضور')
    .replace(/\s+by\s+/gi, ' بواسطة ');
}

export function normalizeAuditUserDisplay(row: AuditLog): string {
  const display = String(row.createdByName || row.createdBy || '').trim();
  return display || '—';
}

