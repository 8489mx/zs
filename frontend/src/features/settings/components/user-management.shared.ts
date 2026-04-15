import type { ManagedUserRecord } from '@/features/settings/api/settings.api';
import { downloadCsvFile, escapeHtml, printHtmlDocument } from '@/lib/browser';

export const DEFAULT_ADMIN_PERMS = [
  'dashboard','products','sales','purchases','inventory','suppliers','customers','accounts','returns','reports','audit','treasury','services','settings','pricingCenterView','pricingCenterManage','canEditUsers','canManageUsers','canManageSettings','canManageBackups','canPrint','canDiscount','canEditPrice','canViewProfit','canDelete','canEditInvoices','canAdjustInventory','cashDrawer'
];
export const DEFAULT_OPERATOR_PERMS = [
  'dashboard','products','sales','purchases','inventory','suppliers','customers','accounts','returns','reports','treasury','settings','pricingCenterView','pricingCenterManage','cashDrawer','canPrint','canDiscount','canEditPrice','canViewProfit','canEditInvoices','canAdjustInventory','canManageSettings'
];
export const DEFAULT_CASHIER_PERMS = ['dashboard', 'sales', 'customers', 'cashDrawer'];

export const PERMISSION_LABELS: Record<string, string> = {
  dashboard: 'الشاشة الرئيسية',
  sales: 'سجل الفواتير',
  customers: 'العملاء',
  cashDrawer: 'وردية الكاشير',
  products: 'الأصناف',
  inventory: 'المخزون',
  purchases: 'المشتريات',
  returns: 'المرتجعات',
  suppliers: 'الموردون',
  accounts: 'الحسابات',
  reports: 'التقارير',
  pricingCenterView: 'عرض مركز التسعير',
  pricingCenterManage: 'إدارة مركز التسعير',
  canPrint: 'الطباعة',
  canDiscount: 'تعديل الخصم',
  canEditPrice: 'تعديل السعر',
  canEditInvoices: 'تعديل الفواتير',
  canAdjustInventory: 'تعديل رصيد المخزون',
  settings: 'الإعدادات',
  canManageSettings: 'إدارة الإعدادات',
  canEditUsers: 'تعديل المستخدمين',
  canManageUsers: 'إدارة المستخدمين',
  canManageBackups: 'النسخ الاحتياطي والاسترداد',
  canViewProfit: 'عرض الأرباح',
  audit: 'سجل المراجعة',
  treasury: 'الخزينة',
  services: 'الخدمات',
  canDelete: 'الحذف',
};

export function getPermissionLabel(permission: string) {
  return PERMISSION_LABELS[permission] || permission;
}

export const USER_PERMISSION_GROUPS = [
  { title: 'شاشات التشغيل اليومية', items: ['dashboard', 'sales', 'customers', 'cashDrawer', 'products', 'inventory', 'purchases', 'returns', 'suppliers', 'accounts', 'reports', 'pricingCenterView'] },
  { title: 'تنفيذ العمليات', items: ['canPrint', 'canDiscount', 'canEditPrice', 'canEditInvoices', 'canAdjustInventory', 'pricingCenterManage'] },
  { title: 'إدارة النظام', items: ['settings', 'canManageSettings', 'canEditUsers', 'canManageUsers', 'canManageBackups'] },
  { title: 'بيانات حساسة', items: ['canViewProfit', 'audit', 'treasury', 'services', 'canDelete'] }
] as const;

export const USER_ROLE_TEMPLATES = {
  cashier: { label: 'كاشير', role: 'cashier', permissions: ['dashboard', 'sales', 'customers', 'cashDrawer'] },
  owner: { label: 'مالك / مدير', role: 'admin', permissions: [...DEFAULT_OPERATOR_PERMS] },
  inventory: { label: 'مسؤول مخزون', role: 'admin', permissions: ['dashboard','products','inventory','purchases','suppliers','reports','pricingCenterView','pricingCenterManage','canPrint','canAdjustInventory'] },
  accountant: { label: 'محاسب', role: 'admin', permissions: ['dashboard','accounts','reports','customers','suppliers','treasury','canPrint','canViewProfit'] }
} as const;

export function blankUserDraft(role: 'super_admin' | 'admin' | 'cashier' = 'cashier'): ManagedUserRecord {
  return {
    id: null,
    username: '',
    password: '',
    role,
    permissions: role === 'super_admin' ? [...DEFAULT_ADMIN_PERMS] : role === 'admin' ? [...DEFAULT_OPERATOR_PERMS] : [...DEFAULT_CASHIER_PERMS],
    name: '',
    branchIds: [],
    defaultBranchId: '',
    isActive: true,
    mustChangePassword: true,
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: null
  };
}

export function normalizeUserRecord(user: Partial<ManagedUserRecord> | null | undefined): ManagedUserRecord {
  const role = user?.role === 'super_admin' ? 'super_admin' : user?.role === 'admin' ? 'admin' : 'cashier';
  const fallback = blankUserDraft(role);
  return {
    ...fallback,
    ...user,
    id: user?.id ? String(user.id) : null,
    username: String(user?.username || ''),
    password: typeof user?.password === 'string' ? user.password : '',
    role,
    permissions: Array.isArray(user?.permissions) && user.permissions.length
      ? Array.from(new Set((user.permissions || []).map((permission) => String(permission)).filter(Boolean)))
      : role === 'super_admin'
        ? [...DEFAULT_ADMIN_PERMS]
        : role === 'admin'
          ? [...DEFAULT_OPERATOR_PERMS]
          : [...DEFAULT_CASHIER_PERMS],
    name: String(user?.name || user?.username || ''),
    branchIds: Array.isArray(user?.branchIds) ? (user.branchIds || []).map((branchId) => String(branchId)).filter(Boolean) : [],
    defaultBranchId: String(user?.defaultBranchId || ''),
    isActive: user?.isActive !== false,
    mustChangePassword: user?.mustChangePassword === true,
    failedLoginCount: Number(user?.failedLoginCount || 0),
    lockedUntil: user?.lockedUntil || null,
    lastLoginAt: user?.lastLoginAt || null
  };
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('ar-EG');
}

export function exportUsersCsv(filename: string, users: ManagedUserRecord[]) {
  downloadCsvFile(filename, ['name', 'username', 'role', 'status', 'defaultBranch', 'branches', 'permissions', 'failedLogins', 'lockedUntil', 'lastLoginAt'], users.map((user) => [
    user.name || '',
    user.username || '',
    user.role === 'super_admin' ? 'super_admin' : user.role === 'admin' ? 'admin' : 'cashier',
    user.isActive === false ? 'inactive' : 'active',
    user.defaultBranchId || '',
    (user.branchIds || []).join(' | '),
    (user.permissions || []).join(' | '),
    Number(user.failedLoginCount || 0),
    user.lockedUntil || '',
    user.lastLoginAt || ''
  ]));
}

export function printUsersList(title: string, users: ManagedUserRecord[]) {
  const rows = users.map((user) => `
    <tr>
      <td>${escapeHtml(String(user.name || ''))}</td>
      <td>${escapeHtml(String(user.username || ''))}</td>
      <td>${escapeHtml(user.role === 'super_admin' ? 'سوبر أدمن' : user.role === 'admin' ? 'مدير نظام' : 'كاشير')}</td>
      <td>${escapeHtml(user.isActive === false ? 'موقوف' : 'نشط')}</td>
      <td>${escapeHtml(String(user.defaultBranchId || ''))}</td>
      <td>${escapeHtml(String((user.permissions || []).length))}</td>
      <td>${escapeHtml(formatDateTime(user.lastLoginAt))}</td>
    </tr>
  `).join('');
  printHtmlDocument(title, `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th>الاسم</th>
          <th>المستخدم</th>
          <th>الدور</th>
          <th>الحالة</th>
          <th>الفرع الافتراضي</th>
          <th>عدد الصلاحيات</th>
          <th>آخر دخول</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `);
}
