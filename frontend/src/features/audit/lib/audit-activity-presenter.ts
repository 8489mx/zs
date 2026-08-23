import type { AuditLog } from '@/types/domain';

export type AuditActivityType =
  | 'auth'
  | 'import'
  | 'inventory'
  | 'sales'
  | 'purchases'
  | 'maintenance'
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
  { pattern: /(failed login|تسجيل دخول فاشل)/i, label: 'تسجيل دخول فاشل' },
  { pattern: /(password change|change password|تغيير كلمة المرور)/i, label: 'تغيير كلمة المرور' },
  
  // Maintenance tickets
  { pattern: /(update ticket status|تحديث حالة التذكرة|تحديث حالة تذكرة)/i, label: 'تحديث حالة تذكرة الصيانة' },
  { pattern: /(create maintenance ticket|إنشاء تذكرة صيانة|إضافة تذكرة صيانة)/i, label: 'إنشاء تذكرة صيانة' },
  { pattern: /(update maintenance ticket|تعديل تذكرة صيانة)/i, label: 'تعديل تذكرة صيانة' },
  { pattern: /(delete maintenance ticket|حذف تذكرة صيانة)/i, label: 'حذف تذكرة صيانة' },
  { pattern: /(add ticket part|إضافة قطعة غيار)/i, label: 'إضافة قطعة غيار لتذكرة' },
  { pattern: /(remove ticket part|حذف قطعة غيار من تذكرة)/i, label: 'حذف قطعة غيار من تذكرة' },

  // Addons
  { pattern: /(create addon|إضافة ملحق)/i, label: 'إضافة ملحق' },
  { pattern: /(update addon|تعديل ملحق)/i, label: 'تعديل ملحق' },
  { pattern: /(delete addon|حذف ملحق)/i, label: 'حذف ملحق' },

  // HR & Attendance
  { pattern: /(bulk import hr attendance|استيراد حضور جماعي)/i, label: 'استيراد حضور جماعي' },
  { pattern: /(upsert hr attendance record|attendance record|حضور موظف)/i, label: 'تسجيل أو تعديل حضور موظف' },
  { pattern: /(save hr attendance day|حفظ حضور)/i, label: 'حفظ حضور اليوم' },
  { pattern: /(cancel hr attendance checkout|إلغاء انصراف)/i, label: 'إلغاء تسجيل انصراف' },
  { pattern: /(new attendance session for hr employee|جلسة حضور)/i, label: 'جلسة حضور جديدة' },
  { pattern: /(create quick cash advance|quick cash advance|سلفة نقدية سريعة)/i, label: 'سلفة نقدية سريعة' },
  { pattern: /(create hr employee loan|إنشاء سلفة)/i, label: 'إنشاء سلفة موظف' },
  { pattern: /(update hr employee loan|تعديل سلفة)/i, label: 'تعديل سلفة موظف' },
  { pattern: /(approve hr employee loan|اعتماد سلفة)/i, label: 'اعتماد سلفة موظف' },
  { pattern: /(pay hr employee loan|صرف سلفة)/i, label: 'صرف سلفة موظف' },
  { pattern: /(repay hr employee loan|سداد سلفة)/i, label: 'سداد سلفة موظف' },
  { pattern: /(create hr payroll run|إعداد مسير)/i, label: 'إعداد مسير الرواتب' },
  { pattern: /(recalculate hr payroll run|إعادة احتساب مسير)/i, label: 'إعادة احتساب مسير الرواتب' },
  { pattern: /(apply hr attendance deductions|تطبيق خصومات)/i, label: 'تطبيق خصومات الحضور' },
  { pattern: /(review hr payroll run|مراجعة مسير)/i, label: 'مراجعة مسير الرواتب' },
  { pattern: /(approve hr payroll run|اعتماد مسير)/i, label: 'اعتماد مسير الرواتب' },
  { pattern: /(pay hr payroll run|صرف مسير)/i, label: 'صرف مسير الرواتب' },
  { pattern: /(cancel hr payroll run|إلغاء مسير)/i, label: 'إلغاء مسير الرواتب' },
  { pattern: /(update hr payroll item|تعديل بند مسير)/i, label: 'تعديل بند مسير' },
  { pattern: /(create hr payroll adjustment|إضافة تسوية مسير)/i, label: 'إضافة تسوية لمسير الرواتب' },
  { pattern: /(delete hr payroll adjustment|حذف تسوية مسير)/i, label: 'حذف تسوية مسير الرواتب' },
  { pattern: /(create hr leave request|طلب إجازة)/i, label: 'تقديم طلب إجازة' },
  { pattern: /(approve hr leave request|اعتماد إجازة)/i, label: 'الموافقة على الإجازة' },
  { pattern: /(reject hr leave request|رفض إجازة)/i, label: 'رفض طلب الإجازة' },
  { pattern: /(cancel hr leave request|إلغاء إجازة)/i, label: 'إلغاء طلب الإجازة' },
  { pattern: /(create hr employee|إضافة موظف)/i, label: 'إضافة موظف جديد' },
  { pattern: /(update hr employee|تعديل موظف)/i, label: 'تعديل بيانات موظف' },
  { pattern: /(deactivate hr employee|تعطيل حساب موظف|تعطيل موظف)/i, label: 'تعطيل حساب موظف' },
  { pattern: /(end of service|إنهاء خدمة)/i, label: 'إنهاء خدمة موظف' },
  { pattern: /(hr employee contact|بيانات اتصال)/i, label: 'تحديث بيانات اتصال موظف' },
  { pattern: /(hr employee document|مستندات موظف)/i, label: 'تحديث وثائق موظف' },
  { pattern: /(hr employment contract|عقد عمل)/i, label: 'تحديث عقد عمل' },
  { pattern: /(hr compensation|بيانات راتب)/i, label: 'تحديث راتب موظف' },
  { pattern: /(hr employee adjustment|تسوية موظف)/i, label: 'تسوية لموظف' },
  { pattern: /(hr employee asset|عهدة موظف)/i, label: 'تحديث عهدة موظف' },
  { pattern: /(hr leave type|نوع إجازة)/i, label: 'تحديث نوع إجازة' },

  // Import
  { pattern: /(import.+products|استيراد.+أصناف|استيراد أصناف)/i, label: 'استيراد أصناف' },
  { pattern: /(import.+customers|استيراد.+عملاء|استيراد عملاء)/i, label: 'استيراد عملاء' },
  { pattern: /(import.+suppliers|استيراد.+موردين|استيراد موردين)/i, label: 'استيراد موردين' },
  { pattern: /(opening stock|opening inventory|استيراد.+افتتاحي|استيراد مخزون افتتاحي)/i, label: 'استيراد مخزون افتتاحي' },
  { pattern: /(import.+employees|استيراد.+موظفين|استيراد موظفين)/i, label: 'استيراد موظفين' },

  // Categories & Inventory
  { pattern: /(إضافة تصنيف|create category)/i, label: 'إضافة تصنيف' },
  { pattern: /(تعديل تصنيف|update category)/i, label: 'تعديل تصنيف' },
  { pattern: /(حذف تصنيف|delete category)/i, label: 'حذف تصنيف' },
  { pattern: /(نقل أصناف|transfer products)/i, label: 'نقل أصناف بين التصنيفات' },
  { pattern: /(إضافة صنف|create product)/i, label: 'إضافة صنف' },
  { pattern: /(تعديل صنف|update product)/i, label: 'تعديل صنف' },
  { pattern: /(حذف صنف|delete product)/i, label: 'حذف صنف' },
  { pattern: /(جلسة جرد مخزون|inventory session)/i, label: 'جلسة جرد مخزون' },
  { pattern: /(اعتماد جلسة جرد|post inventory)/i, label: 'اعتماد جلسة جرد' },
  { pattern: /(تسجيل تالف|damaged stock)/i, label: 'تسجيل تالف' },
  { pattern: /(نقل قسم|transfer department)/i, label: 'نقل أرصدة قسم' },

  // Delivery
  { pattern: /(إضافة مندوب توصيل|create delivery rep)/i, label: 'إضافة مندوب توصيل' },
  { pattern: /(تعديل مندوب توصيل|update delivery rep)/i, label: 'تعديل مندوب توصيل' },
  { pattern: /(حذف مندوب توصيل|delete delivery rep)/i, label: 'حذف مندوب توصيل' },
  { pattern: /(تسوية طلب توصيل|settle delivery order)/i, label: 'تسوية طلب توصيل' },
  { pattern: /(تسوية كل الطلبات|settle all delivery orders)/i, label: 'تسوية كل طلبات التوصيل' },

  // System & Settings
  { pattern: /(backup created|نسخ احتياطي|backup)/i, label: 'نسخة احتياطية' },
  { pattern: /(branch created|إضافة فرع)/i, label: 'إضافة فرع' },
  { pattern: /(location created|إضافة مخزن)/i, label: 'إضافة مخزن' },
  { pattern: /(settings updated|تعديل الإعدادات|update settings)/i, label: 'تعديل الإعدادات' },
];

const TYPE_META: Record<AuditActivityType, ActivityMeta> = {
  auth: { type: 'auth', label: 'دخول وخروج', badgeClass: 'audit-badge-auth' },
  maintenance: { type: 'maintenance', label: 'صيانة', badgeClass: 'audit-badge-maintenance' },
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

const STATUS_DICTIONARY: Record<string, string> = {
  received: 'تم الاستلام',
  inspecting: 'قيد الفحص والتسعير',
  in_progress: 'قيد الصيانة والإصلاح',
  repaired: 'تم الإصلاح وجاهز للتسليم',
  delivered: 'تم التسليم للعميل',
  unrepairable: 'غير قابل للإصلاح',
  cancelled: 'ملغاة',
  canceled: 'ملغاة',
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
  if (/(maintenance|ticket|صيانة|تذكرة)/i.test(text)) return 'maintenance';
  if (/(import|استيراد|csv|excel)/i.test(text)) return 'import';
  if (/(backup|نسخ احتياطي)/i.test(text)) return 'backup';
  if (/(attendance|موظف|hr|حضور|انصراف|سلفة|رواتب|payroll|leave|إجازة)/i.test(text)) return 'hr';
  if (/(settings|إعدادات|branch|location|فرع|مخزن)/i.test(text)) return 'settings';
  if (/(delete|remove|حذف|إلغاء|إبطال|revoke)/i.test(text)) return 'sensitive';
  if (/(inventory|stock|مخزون|جرد|صنف|تالف|category|تصنيف)/i.test(text)) return 'inventory';
  if (/(purchase|supplier|مشتريات|مورد)/i.test(text)) return 'purchases';
  if (/(sale|invoice|customer|مبيعات|فاتورة|عميل|مندوب)/i.test(text)) return 'sales';
  return 'general';
}

export function getAuditActivityMeta(row: AuditLog): ActivityMeta {
  return TYPE_META[detectType(row)];
}

export function normalizeAuditDetailText(detailText: string): string {
  const raw = String(detailText || '').trim();
  if (!raw) return '—';

  // 1. Maintenance ticket status change
  const ticketStatusMatch = raw.match(/Updated ticket\s+([A-Za-z0-9_-]+)\s+status to\s+([A-Za-z0-9_]+)/i);
  if (ticketStatusMatch) {
    const [, ticketNo, status] = ticketStatusMatch;
    const statusAr = STATUS_DICTIONARY[status.toLowerCase()] || status;
    return `تم تغيير حالة التذكرة ${ticketNo} إلى "${statusAr}"`;
  }

  // 2. Maintenance ticket created
  const ticketCreateMatch = raw.match(/Created ticket\s+([A-Za-z0-9_-]+)\s+for\s+(.+)/i);
  if (ticketCreateMatch) {
    const [, ticketNo, customer] = ticketCreateMatch;
    return `تم إنشاء تذكرة الصيانة ${ticketNo} للعميل: ${customer}`;
  }

  // 3. Maintenance ticket updated
  const ticketUpdateMatch = raw.match(/Updated ticket\s+([A-Za-z0-9_-]+)$/i);
  if (ticketUpdateMatch) {
    const [, ticketNo] = ticketUpdateMatch;
    return `تم تعديل بيانات تذكرة الصيانة ${ticketNo}`;
  }

  // 4. Maintenance ticket deleted
  const ticketDeleteMatch = raw.match(/Deleted ticket ID\s+(\d+)\s+and restored\s+(\d+)\s+parts to stock/i);
  if (ticketDeleteMatch) {
    const [, id, count] = ticketDeleteMatch;
    return `تم حذف تذكرة الصيانة #${id} واسترجاع ${count} قطعة غيار إلى المخزون`;
  }

  // 5. Addon operations
  const addonCreatedMatch = raw.match(/Created addon\s+(.+)/i);
  if (addonCreatedMatch) return `تم إنشاء ملحق جديد: ${addonCreatedMatch[1]}`;
  const addonUpdatedMatch = raw.match(/Updated addon\s+(.+)/i);
  if (addonUpdatedMatch) return `تم تعديل بيانات الملحق #${addonUpdatedMatch[1]}`;
  const addonDeletedMatch = raw.match(/Deleted addon\s+(.+)/i);
  if (addonDeletedMatch) return `تم حذف الملحق #${addonDeletedMatch[1]}`;

  // 6. HR Attendance record saved
  const attendanceMatch = raw.match(/attendance record saved for employee\s*#?(\d+)\s*on\s*([0-9-]+)\s*by\s*([A-Za-z0-9_.-]+)/i);
  if (attendanceMatch) {
    const [, employeeId, date, actor] = attendanceMatch;
    return `تم تسجيل حضور الموظف رقم ${employeeId} بتاريخ ${date} بواسطة ${actor}`;
  }

  // 7. HR Loans
  const loanMatch = raw.match(/Employee loan\s*#?(\d+)\s*(created|updated|approved|disbursed|repayment recorded)\s*by\s*(.+)/i);
  if (loanMatch) {
    const [, id, action, actor] = loanMatch;
    const actionMap: Record<string, string> = {
      created: 'إنشاء',
      updated: 'تعديل',
      approved: 'اعتماد',
      disbursed: 'صرف',
      'repayment recorded': 'سداد',
    };
    return `تم ${actionMap[action.toLowerCase()] || action} سلفة الموظف #${id} بواسطة ${actor}`;
  }

  // 8. Quick cash advance
  const advanceMatch = raw.match(/Cash advance of\s*([\d.]+)\s*for employee\s*#?(\d+)\s*by\s*(.+)/i);
  if (advanceMatch) {
    const [, amount, empId, actor] = advanceMatch;
    return `تم تسجيل سلفة نقدية بقيمة ${amount} للموظف #${empId} بواسطة ${actor}`;
  }

  // 9. HR Leaves
  const leaveMatch = raw.match(/Leave request\s*#?(\d+)\s*(created|approved|rejected|cancelled)\s*by\s*(.+)/i);
  if (leaveMatch) {
    const [, id, action, actor] = leaveMatch;
    const actionMap: Record<string, string> = {
      created: 'تقديم',
      approved: 'الموافقة على',
      rejected: 'رفض',
      cancelled: 'إلغاء',
    };
    return `تم ${actionMap[action.toLowerCase()] || action} طلب الإجازة #${id} بواسطة ${actor}`;
  }

  // 10. HR Payroll run
  const payrollPrepMatch = raw.match(/Payroll run\s*(\S+)\s*prepared by\s*(.+)/i);
  if (payrollPrepMatch) {
    const [, period, actor] = payrollPrepMatch;
    return `تم إعداد مسير رواتب شهر ${period} بواسطة ${actor}`;
  }

  const payrollMatch = raw.match(/Payroll run\s*#?(\d+)\s*(recalculated|reviewed|approved|paid|cancelled)\s*by\s*(.+)/i);
  if (payrollMatch) {
    const [, id, action, actor] = payrollMatch;
    const actionMap: Record<string, string> = {
      recalculated: 'إعادة احتساب',
      reviewed: 'مراجعة',
      approved: 'اعتماد',
      paid: 'صرف',
      cancelled: 'إلغاء',
    };
    return `تم ${actionMap[action.toLowerCase()] || action} مسير الرواتب #${id} بواسطة ${actor}`;
  }

  // General string cleanup & translation replacements
  return raw
    .replace(/Upsert HR attendance record/gi, 'تسجيل أو تعديل حضور موظف')
    .replace(/Attendance record saved for employee\s*#?(\d+)\s*on\s*([0-9-]+)/gi, 'تسجيل حضور الموظف رقم $1 بتاريخ $2')
    .replace(/Attendance saved for\s*([0-9-]+)/gi, 'حفظ الحضور لتاريخ $1')
    .replace(/Imported\s*(\d+)\s*attendance records/gi, 'استيراد $1 سجل حضور')
    .replace(/Checkout cancelled for employee\s*#?(\d+)\s*on\s*([0-9-]+)/gi, 'إلغاء تسجيل انصراف الموظف #$1 لتاريخ $2')
    .replace(/New session started for employee\s*#?(\d+)\s*on\s*([0-9-]+)/gi, 'بدء جلسة حضور جديدة للموظف #$1 بتاريخ $2')
    .replace(/Ended service for employee\s*#?(\d+)\s*on\s*([0-9-]+)/gi, 'إنهاء خدمة الموظف #$1 بتاريخ $2')
    .replace(/Employee\s*(.+)\s*saved/gi, 'تم حفظ بيانات الموظف $1')
    .replace(/Employee\s*#?(\d+)\s*deactivated/gi, 'تم تعطيل حساب الموظف #$1')
    .replace(/saved by/gi, 'تم الحفظ بواسطة')
    .replace(/deactivated by/gi, 'تم التعطيل بواسطة')
    .replace(/cancelled by/gi, 'تم الإلغاء بواسطة')
    .replace(/approved by/gi, 'تم الاعتماد بواسطة')
    .replace(/created by/gi, 'تم الإنشاء بواسطة')
    .replace(/updated by/gi, 'تم التحديث بواسطة')
    .replace(/\s+by\s+/gi, ' بواسطة ');
}

export function normalizeAuditUserDisplay(row: AuditLog): string {
  const display = String(row.createdByName || row.createdBy || '').trim();
  return display || '—';
}

