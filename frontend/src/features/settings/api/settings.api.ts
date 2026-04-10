import { http, resolveRequestUrl } from '@/lib/http';

const BACKUP_RESTORE_TIMEOUT_MS = 120_000;
import { unwrapArray, unwrapByKey, type PaginationMeta } from '@/lib/api/contracts';
import type { AppSettings, Branch, Location } from '@/types/domain';
import { buildQueryString } from '@/lib/query-string';

export interface ManagedUserRecord {
  id?: string | null;
  username: string;
  password?: string;
  role: 'super_admin' | 'admin' | 'cashier';
  permissions: string[];
  name: string;
  branchIds: string[];
  defaultBranchId: string;
  isActive?: boolean;
  mustChangePassword?: boolean;
  failedLoginCount?: number;
  lockedUntil?: string | null;
  lastLoginAt?: string | null;
}

export interface ManagedUsersSummary {
  totalItems: number;
  superAdmins: number;
  admins: number;
  cashiers: number;
  inactive: number;
  locked: number;
  activePrivilegedUsers: number;
}

export interface ManagedUsersQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  filter?: 'all' | 'super-admins' | 'admins' | 'cashiers' | 'inactive' | 'locked';
}

export interface BackupSnapshotRecord {
  id: string;
  createdAt: string;
  reason?: string | null;
  payload?: Record<string, unknown>;
}

interface ManagedUsersResponse {
  users?: ManagedUserRecord[];
  pagination?: PaginationMeta;
  summary?: ManagedUsersSummary;
}

function sanitizeUserPayload(payload: ManagedUserRecord) {
  const password = String(payload.password || '').trim();

  return {
    ...(payload.id ? { id: payload.id } : {}),
    username: String(payload.username || '').trim(),
    ...(password ? { password } : {}),
    role: payload.role === 'super_admin' ? 'super_admin' : payload.role === 'admin' ? 'admin' : 'cashier',
    permissions: Array.isArray(payload.permissions) ? payload.permissions.map((entry) => String(entry)).filter(Boolean) : [],
    name: String(payload.name || '').trim(),
    branchIds: Array.isArray(payload.branchIds) ? payload.branchIds.map((entry) => String(entry)).filter(Boolean) : [],
    defaultBranchId: String(payload.defaultBranchId || ''),
    isActive: payload.isActive !== false,
    mustChangePassword: payload.mustChangePassword === true,
  };
}

export const settingsApi = {
  settings: async () => unwrapByKey<AppSettings>(await http<AppSettings | { settings: AppSettings }>('/api/settings'), 'settings', {} as AppSettings),
  branches: async () => unwrapArray<Branch>(await http<Branch[] | { branches: Branch[] }>('/api/branches'), 'branches'),
  locations: async () => unwrapArray<Location>(await http<Location[] | { locations: Location[] }>('/api/locations'), 'locations'),
  update: (payload: unknown) => http<AppSettings>('/api/settings', { method: 'PUT', body: JSON.stringify(payload) }),
  createBranch: (payload: unknown) => http<{ ok: boolean; branchId: string; branches: Branch[] }>('/api/branches', { method: 'POST', body: JSON.stringify(payload) }),
  updateBranch: (branchId: string, payload: unknown) => http<{ ok: boolean; branchId: string; branches: Branch[] }>(`/api/branches/${branchId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteBranch: (branchId: string) => http<{ ok: boolean; removedBranchId: string; branches: Branch[] }>(`/api/branches/${branchId}`, { method: 'DELETE' }),
  createLocation: (payload: unknown) => http<{ ok: boolean; locationId: string; locations: Location[] }>('/api/locations', { method: 'POST', body: JSON.stringify(payload) }),
  updateLocation: (locationId: string, payload: unknown) => http<{ ok: boolean; locationId: string; locations: Location[] }>(`/api/locations/${locationId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteLocation: (locationId: string) => http<{ ok: boolean; removedLocationId: string; locations: Location[] }>(`/api/locations/${locationId}`, { method: 'DELETE' }),
  diagnostics: () => http<Record<string, unknown>>('/api/admin/diagnostics'),
  maintenanceReport: () => http<Record<string, unknown>>('/api/admin/maintenance-report'),
  launchReadiness: () => http<Record<string, unknown>>('/api/admin/launch-readiness'),
  operationalReadiness: () => http<Record<string, unknown>>('/api/admin/operational-readiness'),
  supportSnapshot: () => http<Record<string, unknown>>('/api/admin/support-snapshot'),
  uatReadiness: () => http<Record<string, unknown>>('/api/admin/uat-readiness'),
  cleanupExpiredSessions: () => http<Record<string, unknown>>('/api/admin/maintenance/cleanup-expired-sessions', { method: 'POST' }),
  reconcileBalances: () => http<Record<string, unknown>>('/api/admin/maintenance/reconcile-balances', { method: 'POST' }),
  reconcileCustomers: () => http<Record<string, unknown>>('/api/admin/maintenance/reconcile-customers', { method: 'POST' }),
  reconcileSuppliers: () => http<Record<string, unknown>>('/api/admin/maintenance/reconcile-suppliers', { method: 'POST' }),
  verifyBackup: (payload: unknown) => http<Record<string, unknown>>('/api/backup/verify', { method: 'POST', body: JSON.stringify(payload) }),
  restoreBackup: (payload: unknown, dryRun = false) => http<Record<string, unknown>>(`/api/backup/restore${dryRun ? '?dryRun=true' : ''}`, { method: 'POST', body: JSON.stringify(payload), timeoutMs: BACKUP_RESTORE_TIMEOUT_MS }),
  importProducts: (rows: unknown) => http<Record<string, unknown>>('/api/import/products', { method: 'POST', body: JSON.stringify({ rows }) }),
  importCustomers: (rows: unknown) => http<Record<string, unknown>>('/api/import/customers', { method: 'POST', body: JSON.stringify({ rows }) }),
  importSuppliers: (rows: unknown) => http<Record<string, unknown>>('/api/import/suppliers', { method: 'POST', body: JSON.stringify({ rows }) }),
  importOpeningStock: (rows: unknown) => http<Record<string, unknown>>('/api/import/opening-stock', { method: 'POST', body: JSON.stringify({ rows }) }),
  users: async () => unwrapArray<ManagedUserRecord>(await http<ManagedUserRecord[] | { users: ManagedUserRecord[] }>('/api/users'), 'users'),
  usersPage: async (params: ManagedUsersQueryParams = {}) => {
    const response = await http<ManagedUsersResponse>(`/api/users${buildQueryString(params as Record<string, string | number | undefined | null>)}`);
    return {
      rows: Array.isArray(response.users) ? response.users : [],
      pagination: response.pagination || {
        page: 1,
        pageSize: params.pageSize || 10,
        totalItems: Array.isArray(response.users) ? response.users.length : 0,
        totalPages: 1,
        rangeStart: Array.isArray(response.users) && response.users.length ? 1 : 0,
        rangeEnd: Array.isArray(response.users) ? response.users.length : 0,
      },
      summary: response.summary || { totalItems: 0, superAdmins: 0, admins: 0, cashiers: 0, inactive: 0, locked: 0, activePrivilegedUsers: 0 },
    };
  },
  listAllUsers: async (params: Omit<ManagedUsersQueryParams, 'page' | 'pageSize'> = {}) => {
    const firstPage = await settingsApi.usersPage({ ...params, page: 1, pageSize: 100 });
    const allRows = [...firstPage.rows];
    const totalPages = firstPage.pagination?.totalPages || 1;
    for (let page = 2; page <= totalPages; page += 1) {
      const nextPage = await settingsApi.usersPage({ ...params, page, pageSize: 100 });
      allRows.push(...nextPage.rows);
    }
    return { rows: allRows, summary: firstPage.summary, pagination: firstPage.pagination };
  },
  backupSnapshots: async () => unwrapArray<BackupSnapshotRecord>(await http<BackupSnapshotRecord[] | { snapshots: BackupSnapshotRecord[] }>('/api/backup-snapshots'), 'snapshots'),
  createUser: (payload: ManagedUserRecord) => http<{ ok: boolean; user: ManagedUserRecord | null; users: ManagedUserRecord[] }>('/api/users', { method: 'POST', body: JSON.stringify(sanitizeUserPayload(payload)) }),
  updateUser: (userId: string, payload: ManagedUserRecord) => http<{ ok: boolean; user: ManagedUserRecord | null; users: ManagedUserRecord[] }>(`/api/users/${userId}`, { method: 'PUT', body: JSON.stringify(sanitizeUserPayload(payload)) }),
  deleteUser: (userId: string) => http<{ ok: boolean; removedUserId: string; users: ManagedUserRecord[] }>(`/api/users/${userId}`, { method: 'DELETE' }),
  unlockUser: (userId: string) => http<{ ok: boolean; user: ManagedUserRecord | null; users: ManagedUserRecord[] }>(`/api/users/${userId}/unlock`, { method: 'POST' }),
  saveUsers: (users: ManagedUserRecord[]) => http<{ ok: boolean; users: ManagedUserRecord[] }>('/api/users', { method: 'PUT', body: JSON.stringify({ users: users.map(sanitizeUserPayload) }) }),
  backupDownloadUrl: () => resolveRequestUrl('/api/backup')
};
