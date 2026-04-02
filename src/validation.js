function toFiniteNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeText(value, maxLength = 5000) {
  return String(value == null ? '' : value).trim().slice(0, maxLength);
}

function validateSettingsPayload(input) {
  const payload = input || {};
  const lowStockThreshold = Math.max(0, toFiniteNumber(payload.lowStockThreshold, 5));
  const paperSize = payload.paperSize === 'receipt' ? 'receipt' : 'a4';
  const accentColor = /^#[0-9a-fA-F]{6}$/.test(String(payload.accentColor || '').trim())
    ? String(payload.accentColor).trim()
    : '#2563eb';
  const autoBackup = String(payload.autoBackup || 'on').toLowerCase() === 'off' ? 'off' : 'on';
  const hasManagerPin = Object.prototype.hasOwnProperty.call(payload, 'managerPin');
  const managerPinRaw = hasManagerPin ? normalizeText(payload.managerPin, 20) : '';
  const managerPin = managerPinRaw === '' ? '' : managerPinRaw;
  if (hasManagerPin && managerPin && !/^\d{4,10}$/.test(managerPin)) {
    const err = new Error('Manager PIN must be 4 to 10 digits');
    err.statusCode = 400;
    throw err;
  }
  const taxRate = Math.max(0, toFiniteNumber(payload.taxRate, 0));
  const taxMode = String(payload.taxMode || 'exclusive').toLowerCase() === 'inclusive' ? 'inclusive' : 'exclusive';
  const currentBranchId = normalizeText(payload.currentBranchId, 40);
  const currentLocationId = normalizeText(payload.currentLocationId, 40);
  if (currentLocationId && !currentBranchId) {
    const err = new Error('يجب اختيار الفرع الحالي قبل الموقع الحالي');
    err.statusCode = 400;
    throw err;
  }
  return {
    storeName: normalizeText(payload.storeName, 120) || 'Z Systems',
    phone: normalizeText(payload.phone, 40),
    address: normalizeText(payload.address, 300),
    lowStockThreshold,
    invoiceFooter: normalizeText(payload.invoiceFooter, 500),
    invoiceQR: normalizeText(payload.invoiceQR, 2000),
    logoData: normalizeText(payload.logoData, 200000),
    paperSize,
    ...(hasManagerPin ? { managerPin } : {}),
    autoBackup,
    brandName: normalizeText(payload.brandName, 120) || 'Z Systems',
    accentColor,
    taxNumber: normalizeText(payload.taxNumber, 60),
    taxRate,
    taxMode,
    currentBranchId,
    currentLocationId
  };
}

function parseDateRange(query = {}) {
  const toIso = (value, fallback) => {
    if (!value) return fallback;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
  };
  const now = new Date();
  const fromDefault = new Date(now);
  fromDefault.setDate(now.getDate() - 30);
  const from = toIso(query.from, fromDefault.toISOString());
  const to = toIso(query.to, now.toISOString());
  if (new Date(from).getTime() > new Date(to).getTime()) {
    const err = new Error('Invalid report range');
    err.statusCode = 400;
    throw err;
  }
  return { from, to };
}

function validateUsersPayload(users) {
  if (!Array.isArray(users)) {
    const err = new Error('Invalid users payload');
    err.statusCode = 400;
    throw err;
  }
  const cleaned = users.map((user) => ({
    id: user.id == null ? null : Number(user.id),
    username: normalizeText(user.username, 50),
    password: String(user.password || ''),
    role: user.role === 'super_admin' ? 'super_admin' : user.role === 'admin' ? 'admin' : 'cashier',
    permissions: Array.isArray(user.permissions) ? user.permissions.map((p) => normalizeText(p, 80)).filter(Boolean) : [],
    name: normalizeText(user.name, 120),
    branchIds: Array.isArray(user.branchIds) ? user.branchIds.map((b) => normalizeText(b, 40)).filter(Boolean) : [],
    defaultBranchId: normalizeText(user.defaultBranchId, 40),
    isActive: user.isActive !== false,
    mustChangePassword: user.mustChangePassword === true
  }));
  if (cleaned.some((user) => !user.username)) {
    const err = new Error('Each user must have a username');
    err.statusCode = 400;
    throw err;
  }
  const seenUsernames = new Set();
  for (const user of cleaned) {
    const normalizedUsername = String(user.username || '').trim().toLowerCase();
    if (seenUsernames.has(normalizedUsername)) {
      const err = new Error('Usernames must be unique (case-insensitive)');
      err.statusCode = 400;
      throw err;
    }
    seenUsernames.add(normalizedUsername);
  }
  const activeAdmins = cleaned.filter((user) => (user.role === 'super_admin' || user.role === 'admin') && user.isActive);
  if (!activeAdmins.length) {
    const err = new Error('At least one active admin user is required');
    err.statusCode = 400;
    throw err;
  }
  return cleaned;
}

function validatePasswordChangePayload(input, minLength = 10) {
  const payload = input || {};
  const currentPassword = String(payload.currentPassword || '');
  const newPassword = String(payload.newPassword || '');
  const requiredLength = Math.max(8, Number(minLength || 10));
  if (!newPassword || newPassword.length < requiredLength) {
    const err = new Error(`New password must be at least ${requiredLength} characters`);
    err.statusCode = 400;
    throw err;
  }
  return { currentPassword, newPassword };
}

module.exports = {
  validateSettingsPayload,
  parseDateRange,
  validateUsersPayload,
  validatePasswordChangePayload,
};


function validateDefaultAdminPassword(password, minLength = 10) {
  const value = String(password || '').trim();
  if (!value) return '';
  if (value.length < Number(minLength || 10)) {
    const err = new Error(`DEFAULT_ADMIN_PASSWORD must be at least ${Number(minLength || 10)} characters long`);
    err.statusCode = 500;
    throw err;
  }
  return value;
}

function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/$/, '').toLowerCase();
}

module.exports = { ...module.exports, validateDefaultAdminPassword, normalizeOrigin };
