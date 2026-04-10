import { AppError } from '../../../common/errors/app-error';

export type UserQueryInput = Record<string, unknown>;

export interface UserListQuery {
  search: string;
  role: string;
  includeInactive: boolean;
}

export interface UserRowLike {
  id: number | string;
  username: string;
  role: string;
  permissions_json?: string | null;
  display_name?: string | null;
  default_branch_id?: number | string | null;
  is_active?: boolean | number | null;
  must_change_password?: boolean | number | null;
  failed_login_count?: number | string | null;
  locked_until?: Date | string | null;
  last_login_at?: Date | string | null;
}

export interface UserViewModel {
  id: string;
  username: string;
  role: string;
  permissions: string[];
  name: string;
  branchIds: string[];
  defaultBranchId: string;
  isActive: boolean;
  mustChangePassword: boolean;
  failedLoginCount: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
}

function safeJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

export function normalizeUserListQuery(query: UserQueryInput): UserListQuery {
  return {
    search: String(query.search || '').trim().toLowerCase(),
    role: String(query.role || '').trim(),
    includeInactive: String(query.includeInactive || 'true') !== 'false',
  };
}

export function mapUserRow(row: UserRowLike, branchIds: string[]): UserViewModel {
  return {
    id: String(row.id),
    username: row.username,
    role: row.role,
    permissions: safeJsonArray(String(row.permissions_json || '[]')),
    name: row.display_name || row.username,
    branchIds,
    defaultBranchId: row.default_branch_id ? String(row.default_branch_id) : '',
    isActive: Boolean(row.is_active),
    mustChangePassword: Boolean(row.must_change_password),
    failedLoginCount: Number(row.failed_login_count || 0),
    lockedUntil: row.locked_until instanceof Date ? row.locked_until.toISOString() : row.locked_until || null,
    lastLoginAt: row.last_login_at instanceof Date ? row.last_login_at.toISOString() : row.last_login_at || null,
  };
}

export function filterUsers(users: UserViewModel[], normalizedQuery: UserListQuery): UserViewModel[] {
  let filtered = users;

  if (!normalizedQuery.includeInactive) {
    filtered = filtered.filter((row) => row.isActive === true);
  }

  if (normalizedQuery.role) {
    filtered = filtered.filter((row) => String(row.role) === normalizedQuery.role);
  }

  if (normalizedQuery.search) {
    filtered = filtered.filter((row) => {
      const username = String(row.username || '').toLowerCase();
      const name = String(row.name || '').toLowerCase();
      return username.includes(normalizedQuery.search) || name.includes(normalizedQuery.search);
    });
  }

  return filtered;
}

export function summarizeUsers(users: UserViewModel[]): { total: number; active: number; inactive: number } {
  const active = users.filter((row) => row.isActive).length;
  return {
    total: users.length,
    active,
    inactive: users.length - active,
  };
}

export function normalizeBranchIds(branchIds: string[] | undefined): number[] {
  return Array.from(
    new Set(
      (branchIds ?? [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  );
}

export function normalizeUserId(value: string | number | undefined): number {
  const id = Number(value || 0);
  return Number.isInteger(id) && id > 0 ? id : 0;
}

export function ensureUsersPayload(usersPayload: unknown): asserts usersPayload is Array<Record<string, unknown>> {
  if (!Array.isArray(usersPayload)) {
    throw new AppError('users payload must be an array', 'USERS_PAYLOAD_INVALID', 400);
  }
}
