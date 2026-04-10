import assert from 'node:assert/strict';
import {
  ensureUsersPayload,
  filterUsers,
  mapUserRow,
  normalizeBranchIds,
  normalizeUserId,
  normalizeUserListQuery,
  summarizeUsers,
} from '../../src/modules/users/helpers/users.helper';

const baseUsers = [
  {
    id: '1',
    username: 'admin',
    role: 'admin',
    permissions: ['canManageUsers'],
    name: 'Admin User',
    branchIds: ['1'],
    defaultBranchId: '1',
    isActive: true,
    mustChangePassword: false,
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: null,
  },
  {
    id: '2',
    username: 'cashier',
    role: 'cashier',
    permissions: [],
    name: 'Cashier User',
    branchIds: ['2'],
    defaultBranchId: '2',
    isActive: false,
    mustChangePassword: true,
    failedLoginCount: 2,
    lockedUntil: null,
    lastLoginAt: null,
  },
];

(() => {
  const normalized = normalizeUserListQuery({ search: ' Admin ', role: 'admin', includeInactive: 'false' });
  assert.deepEqual(normalized, {
    search: 'admin',
    role: 'admin',
    includeInactive: false,
  });
})();

(() => {
  const mapped = mapUserRow(
    {
      id: 4,
      username: 'mona',
      role: 'admin',
      permissions_json: '["a","b"]',
      display_name: 'Mona',
      default_branch_id: 3,
      is_active: 1,
      must_change_password: 0,
      failed_login_count: '5',
      locked_until: '2026-01-01T00:00:00Z',
      last_login_at: '2026-01-02T00:00:00Z',
    },
    ['1', '3'],
  );

  assert.equal(mapped.id, '4');
  assert.equal(mapped.name, 'Mona');
  assert.deepEqual(mapped.permissions, ['a', 'b']);
  assert.equal(mapped.defaultBranchId, '3');
  assert.equal(mapped.isActive, true);
  assert.equal(mapped.failedLoginCount, 5);
})();

(() => {
  const filtered = filterUsers(baseUsers, {
    search: 'cash',
    role: 'cashier',
    includeInactive: true,
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.username, 'cashier');
})();

(() => {
  const filtered = filterUsers(baseUsers, {
    search: '',
    role: '',
    includeInactive: false,
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.username, 'admin');
})();

(() => {
  const summary = summarizeUsers(baseUsers);
  assert.deepEqual(summary, {
    total: 2,
    active: 1,
    inactive: 1,
  });
})();

(() => {
  assert.deepEqual(normalizeBranchIds(['1', '2', '2', 'x', '0', '-1']), [1, 2]);
  assert.equal(normalizeUserId('7'), 7);
  assert.equal(normalizeUserId('x'), 0);
})();

(() => {
  ensureUsersPayload([{ username: 'a' }]);
  assert.throws(() => ensureUsersPayload({ users: [] }), /users payload must be an array/);
})();

console.log('users.helper.spec passed');
