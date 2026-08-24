import type { ManagedUserRecord } from '@/features/settings/api/settings.api';
import { downloadExcelFile, escapeHtml, printHtmlDocument } from '@/lib/browser';

export const DEFAULT_ADMIN_PERMS = [
  'dashboard','products','sales','purchases','inventory','suppliers','customers','accounts','accounting','returns','reports','audit','treasury','services','hr','hrEmployees','hrAttendance','hrContracts','hrLoans','hrPayrollView','hrPayrollManage','hrPayrollApprove','hrSalaryView','hrSalaryManage','settings','pricingCenterView','pricingCenterManage','canEditUsers','canManageUsers','canManageSettings','canManageBackups','canPrint','canDiscount','canEditPrice','canSellWholesale','canViewProfit','canDelete','canEditInvoices','canAdjustInventory','canManageBranchStock','cashDrawer','deliveryReps'
];
export const DEFAULT_OPERATOR_PERMS = [
  'dashboard','products','sales','purchases','inventory','suppliers','customers','accounts','accounting','returns','reports','treasury','services','hr','hrEmployees','hrAttendance','hrContracts','hrLoans','hrPayrollView','hrPayrollManage','settings','pricingCenterView','pricingCenterManage','cashDrawer','deliveryReps','canPrint','canDiscount','canEditPrice','canSellWholesale','canViewProfit','canEditInvoices','canAdjustInventory','canManageBranchStock','canManageSettings'
];
export const DEFAULT_CASHIER_PERMS = [
  'sales', 'cashDrawer', 'customers', 'suppliers', 'accounts', 'purchases', 'products', 'returns', 'deliveryReps', 'hr', 'hrAttendance', 'canPrint', 'services', 'treasury'
];

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
  accounting: 'المحاسبة',
  reports: 'التقارير',
  pricingCenterView: 'عرض مركز التسعير',
  pricingCenterManage: 'إدارة مركز التسعير',
  canPrint: 'الطباعة',
  canDiscount: 'تعديل الخصم',
  canEditPrice: 'تعديل السعر',
  canSellWholesale: 'البيع بسعر الجملة',
  canEditInvoices: 'تعديل الفواتير',
  canAdjustInventory: 'تعديل رصيد المخزون',
  canManageBranchStock: 'إدارة مخزون الفروع',
  settings: 'الإعدادات',
  canManageSettings: 'إدارة الإعدادات',
  canEditUsers: 'تعديل المستخدمين',
  canManageUsers: 'إدارة المستخدمين',
  canManageBackups: 'النسخ الاحتياطي والاسترداد',
  canViewProfit: 'عرض الأرباح',
  audit: 'سجل المراجعة',
  treasury: 'الخزينة',
  services: 'الخدمات',
  hr: 'الموارد البشرية',
  hrEmployees: 'ملفات الموظفين',
  hrAttendance: 'التحضير والانصراف',
  hrContracts: 'العقود',
  hrLoans: 'السلف والقروض',
  hrPayrollView: 'عرض مسير الرواتب',
  hrPayrollManage: 'إدارة مسير الرواتب',
  hrPayrollApprove: 'اعتماد مسير الرواتب',
  hrSalaryView: 'عرض بيانات الراتب',
  hrSalaryManage: 'إدارة بيانات الراتب',
  canDelete: 'الحذف',
  deliveryReps: 'إدارة المناديب',
};

export function getPermissionLabel(permission: string) {
  return PERMISSION_LABELS[permission] || permission;
}

export const PERMISSION_FEATURE_MAP: Record<string, string> = {
  // Catalog / Products
  products: 'catalog',
  pricingCenterView: 'catalog',
  pricingCenterManage: 'catalog',

  // Sales & POS
  sales: 'sales',
  returns: 'sales',
  canPrint: 'sales',
  canDiscount: 'sales',
  canEditPrice: 'sales',
  canSellWholesale: 'sales',
  canEditInvoices: 'sales',

  // Sessions & Cash Drawer
  cashDrawer: 'cashDrawer',
  treasury: 'cashDrawer',

  // Purchases & Suppliers
  purchases: 'purchases',
  suppliers: 'purchases',

  // Inventory
  inventory: 'inventory',
  canAdjustInventory: 'inventory',
  canManageBranchStock: 'inventory',

  // Reports & Auditing
  dashboard: 'reports',
  reports: 'reports',
  audit: 'reports',
  canViewProfit: 'reports',

  // Accounting & Accounts
  accounts: 'accounting',
  accounting: 'accounting',
  customers: 'accounting',
  services: 'accounting',

  // Human Resources
  hr: 'hr',
  hrEmployees: 'hr',
  hrAttendance: 'hr',
  hrContracts: 'hr',
  hrLoans: 'hr',
  hrPayrollView: 'hr',
  hrPayrollManage: 'hr',
  hrPayrollApprove: 'hr',
  hrSalaryView: 'hr',
  hrSalaryManage: 'hr',

  // Delivery Reps
  deliveryReps: 'deliveryReps',

  // Manufacturing
  manufacturing: 'manufacturing',

  // Core & System Management (Always Available to Tenant Admins)
  settings: 'core',
  canManageSettings: 'core',
  canEditUsers: 'core',
  canManageUsers: 'core',
  canManageBackups: 'core',
  canDelete: 'core',
};

export interface PermissionGroup {
  title: string;
  items: string[];
}

export const USER_PERMISSION_GROUPS: PermissionGroup[] = [
  { title: 'شاشات التشغيل اليومية', items: ['dashboard', 'sales', 'customers', 'cashDrawer', 'products', 'inventory', 'purchases', 'returns', 'suppliers', 'accounts', 'accounting', 'reports', 'pricingCenterView', 'deliveryReps'] },
  { title: 'الموارد البشرية', items: ['hr', 'hrEmployees', 'hrAttendance', 'hrContracts', 'hrLoans', 'hrPayrollView', 'hrPayrollManage', 'hrPayrollApprove'] },
  { title: 'تنفيذ العمليات', items: ['canPrint', 'canDiscount', 'canEditPrice', 'canSellWholesale', 'canEditInvoices', 'canAdjustInventory', 'canManageBranchStock', 'pricingCenterManage'] },
  { title: 'إدارة النظام', items: ['settings', 'canManageSettings', 'canEditUsers', 'canManageUsers', 'canManageBackups'] },
  { title: 'بيانات حساسة', items: ['canViewProfit', 'hrSalaryView', 'hrSalaryManage', 'audit', 'treasury', 'services', 'canDelete'] }
];

export function getFilteredPermissionGroups(tenantFeatures?: string[] | null): PermissionGroup[] {
  if (!tenantFeatures || !Array.isArray(tenantFeatures) || tenantFeatures.length === 0) {
    return USER_PERMISSION_GROUPS;
  }

  const enabledSet = new Set<string>([...tenantFeatures, 'core', 'sessions']);
  if (enabledSet.has('sessions')) enabledSet.add('cashDrawer');
  if (enabledSet.has('cashDrawer')) enabledSet.add('sessions');
  // If sales or catalog is enabled, allow customers if not strictly accounting
  if (enabledSet.has('sales') || enabledSet.has('catalog')) {
    enabledSet.add('sales_basic');
  }

  return USER_PERMISSION_GROUPS.map((group) => {
    const filteredItems = group.items.filter((itemKey) => {
      const requiredFeature = PERMISSION_FEATURE_MAP[itemKey];
      if (!requiredFeature || requiredFeature === 'core') return true;
      if (itemKey === 'customers' && (enabledSet.has('sales') || enabledSet.has('accounting'))) {
        return true;
      }
      return enabledSet.has(requiredFeature);
    });

    return {
      title: group.title,
      items: filteredItems,
    };
  }).filter((group) => group.items.length > 0);
}

export const USER_ROLE_TEMPLATES = {
  cashier: { label: 'كاشير', role: 'cashier', permissions: [...DEFAULT_CASHIER_PERMS] },
  owner: { label: 'مالك / مدير', role: 'admin', permissions: [...DEFAULT_ADMIN_PERMS] },
  inventory: { label: 'مسؤول مخزون', role: 'admin', permissions: ['dashboard','products','inventory','purchases','suppliers','reports','pricingCenterView','pricingCenterManage','canPrint','canAdjustInventory','canManageBranchStock'] },
  accountant: { label: 'محاسب', role: 'admin', permissions: ['dashboard','accounts','accounting','reports','customers','suppliers','treasury','canPrint','canViewProfit'] }
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
  downloadExcelFile(filename, ['name', 'username', 'role', 'status', 'defaultBranch', 'branches', 'permissions', 'failedLogins', 'lockedUntil', 'lastLoginAt'], users.map((user) => [
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

