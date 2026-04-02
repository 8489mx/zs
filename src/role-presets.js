const DAILY_SCREEN_PERMISSIONS = Object.freeze([
  'dashboard',
  'products',
  'sales',
  'purchases',
  'inventory',
  'suppliers',
  'customers',
  'accounts',
  'returns',
  'reports',
  'cashDrawer',
]);

const EXECUTION_PERMISSIONS = Object.freeze([
  'canPrint',
  'canDiscount',
  'canEditPrice',
  'canEditInvoices',
  'canAdjustInventory',
]);

const SENSITIVE_PERMISSIONS = Object.freeze([
  'canViewProfit',
  'audit',
  'treasury',
  'services',
  'settings',
  'canEditUsers',
  'canManageUsers',
  'canManageSettings',
  'canManageBackups',
  'canDelete',
]);

const ROLE_PRESETS = Object.freeze({
  super_admin: Object.freeze({
    role: 'super_admin',
    label: 'سوبر أدمن',
    permissions: [...DAILY_SCREEN_PERMISSIONS, ...EXECUTION_PERMISSIONS, ...SENSITIVE_PERMISSIONS],
  }),
  owner: Object.freeze({
    role: 'admin',
    label: 'مالك / مدير',
    permissions: [
      'dashboard','products','sales','purchases','inventory','suppliers','customers','accounts','returns','reports',
      'treasury','settings','cashDrawer','canPrint','canDiscount','canEditPrice','canViewProfit','canEditInvoices','canAdjustInventory','canManageSettings'
    ],
  }),
  cashier: Object.freeze({
    role: 'cashier',
    label: 'كاشير',
    permissions: ['dashboard', 'sales', 'customers', 'cashDrawer'],
  }),
  inventory: Object.freeze({
    role: 'admin',
    label: 'مسؤول مخزون',
    permissions: ['dashboard','products','inventory','purchases','suppliers','reports','canPrint','canAdjustInventory'],
  }),
  accountant: Object.freeze({
    role: 'admin',
    label: 'محاسب',
    permissions: ['dashboard','accounts','reports','customers','suppliers','treasury','canPrint','canViewProfit'],
  }),
});

function getRolePreset(key) {
  return ROLE_PRESETS[key] || null;
}

module.exports = {
  DAILY_SCREEN_PERMISSIONS,
  EXECUTION_PERMISSIONS,
  SENSITIVE_PERMISSIONS,
  ROLE_PRESETS,
  getRolePreset,
};
