import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { SessionService } from '../../src/core/auth/services/session.service';

function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(`${password}:${salt}`).digest('hex');
}

type UserRow = {
  id: number;
  username: string;
  display_name?: string;
  default_branch_id?: number | null;
  password_hash: string;
  password_salt: string;
  role: string;
  permissions_json: string;
  is_active: boolean;
  locked_until: Date | null;
  failed_login_count: number;
  must_change_password?: boolean;
  last_login_at?: Date | null;
};

type SessionRow = {
  id: string;
  user_id: number;
  expires_at: Date;
  last_seen_at: Date;
  ip_address: string;
  user_agent: string;
  created_at?: Date;
};

type SettingRow = { key: string; value: string };
type UserBranchRow = { user_id: number; branch_id: number };

class FakeConfigService {
  constructor(private readonly values: Record<string, unknown>) {}
  get<T>(key: string): T | undefined {
    return this.values[key] as T | undefined;
  }
}

class FakeDb {
  constructor(
    public users: UserRow[],
    public sessions: SessionRow[] = [],
    public settings: SettingRow[] = [],
    public userBranches: UserBranchRow[] = [],
  ) {}

  selectFrom(table: string) {
    if (table === 'users') return new UsersSelectBuilder(this);
    if (table === 'settings') return new SettingsSelectBuilder(this);
    if (table === 'user_branches') return new UserBranchesSelectBuilder(this);
    throw new Error(`Unsupported select table: ${table}`);
  }

  insertInto(table: string) {
    if (table === 'sessions') return new SessionsInsertBuilder(this);
    throw new Error(`Unsupported insert table: ${table}`);
  }

  updateTable(table: string) {
    if (table === 'users') return new UsersUpdateBuilder(this);
    throw new Error(`Unsupported update table: ${table}`);
  }

  deleteFrom(table: string) {
    if (table === 'sessions') return new SessionsDeleteBuilder(this);
    throw new Error(`Unsupported delete table: ${table}`);
  }
}

class UsersSelectBuilder {
  private username?: string;
  private id?: number;
  constructor(private readonly db: FakeDb) {}
  select(_cols: string[]) { return this; }
  where(column: string, _op: string, value: string | number) {
    if (column === 'username') this.username = String(value);
    if (column === 'id') this.id = Number(value);
    return this;
  }
  async executeTakeFirst() {
    if (this.username != null) return this.db.users.find((row) => row.username === this.username) ?? undefined;
    if (this.id != null) return this.db.users.find((row) => row.id === this.id) ?? undefined;
    return undefined;
  }
}

class SettingsSelectBuilder {
  constructor(private readonly db: FakeDb) {}
  select(_cols: string[]) { return this; }
  async execute() { return this.db.settings; }
}

class UserBranchesSelectBuilder {
  private userId?: number;
  constructor(private readonly db: FakeDb) {}
  select(_cols: string[]) { return this; }
  where(column: string, _op: string, value: number) {
    if (column === 'user_id') this.userId = Number(value);
    return this;
  }
  async execute() {
    return this.db.userBranches.filter((row) => this.userId == null || row.user_id === this.userId);
  }
}

class SessionsInsertBuilder {
  private payload!: SessionRow;
  constructor(private readonly db: FakeDb) {}
  values(payload: SessionRow) { this.payload = payload; return this; }
  async execute() {
    this.db.sessions.push({ ...this.payload, created_at: new Date() });
  }
}

class UsersUpdateBuilder {
  private payload: Partial<UserRow> = {};
  private id!: number;
  constructor(private readonly db: FakeDb) {}
  set(payload: Partial<UserRow>) { this.payload = payload; return this; }
  where(column: string, _op: string, value: number) {
    if (column !== 'id') throw new Error(`Unsupported where on users update: ${column}`);
    this.id = Number(value);
    return this;
  }
  async execute() {
    const row = this.db.users.find((item) => item.id === this.id);
    if (!row) return;
    Object.assign(row, this.payload);
  }
}

class SessionsDeleteBuilder {
  private userId?: number;
  private sessionId?: string;
  private notSessionId?: string;
  constructor(private readonly db: FakeDb) {}
  where(column: string, op: string, value: string | number) {
    if (column === 'user_id') this.userId = Number(value);
    if (column === 'id' && op === '=') this.sessionId = String(value);
    if (column === 'id' && op === '!=') this.notSessionId = String(value);
    return this;
  }
  async executeTakeFirst() {
    const before = this.db.sessions.length;
    this.db.sessions = this.db.sessions.filter((row) => {
      if (this.userId != null && row.user_id !== this.userId) return true;
      if (this.sessionId != null && row.id !== this.sessionId) return true;
      if (this.notSessionId != null && row.id === this.notSessionId) return true;
      return false;
    });
    return { numDeletedRows: BigInt(before - this.db.sessions.length) };
  }
  async execute() {
    await this.executeTakeFirst();
  }
}

async function run(): Promise<void> {
  const salt = 'salt-1';
  const password = 'AdminStrong123!';
  const db = new FakeDb([
    {
      id: 1,
      username: 'admin',
      password_hash: hashPassword(password, salt),
      password_salt: salt,
      role: 'super_admin',
      display_name: 'Admin Root',
      default_branch_id: 7,
      permissions_json: JSON.stringify(['sales', 'reports']),
      is_active: true,
      locked_until: null,
      failed_login_count: 0,
      must_change_password: true,
      last_login_at: null,
    },
  ], [], [{ key: 'storeName', value: 'Z Systems' }], [{ user_id: 1, branch_id: 7 }, { user_id: 1, branch_id: 9 }]);

  const service = new SessionService(db as any, new FakeConfigService({ LOGIN_MAX_ATTEMPTS: 3, LOGIN_LOCKOUT_MINUTES: 15 }) as any);

  const invalid1 = await service.authenticate('admin', 'wrong-pass');
  assert.equal(invalid1, null);
  assert.equal(db.users[0].failed_login_count, 1);
  assert.equal(db.users[0].locked_until, null);

  await service.authenticate('admin', 'wrong-pass');
  assert.equal(db.users[0].failed_login_count, 2);

  await service.authenticate('admin', 'wrong-pass');
  assert.equal(db.users[0].failed_login_count, 0);
  assert.ok((db.users[0].locked_until as any) instanceof Date);

  db.users[0].locked_until = null;
  const oldHash = db.users[0].password_hash;
  const oldSalt = db.users[0].password_salt;
  const valid = await service.authenticate('admin', password, { ipAddress: '127.0.0.1', userAgent: 'spec' });
  assert.ok(valid);
  assert.equal(db.sessions.length, 1);
  assert.equal(db.users[0].failed_login_count, 0);
  assert.equal(valid?.auth.username, 'admin');
  assert.notEqual(db.users[0].password_hash, oldHash);
  assert.notEqual(db.users[0].password_salt, oldSalt);
  assert.ok(db.users[0].password_hash.startsWith('$2'));

  const loginPayload = await service.buildLoginPayload(valid!.auth);
  assert.equal((loginPayload.user as any).displayName, 'Admin Root');
  assert.deepEqual((loginPayload.user as any).branchIds, ['7', '9']);
  assert.equal((loginPayload.user as any).defaultBranchId, '7');
  assert.equal((loginPayload.mustChangePassword as any), true);

  const me = await service.buildMePayload(valid!.auth);
  assert.equal((me.user as any).displayName, 'Admin Root');
  assert.deepEqual((me.user as any).branchIds, ['7', '9']);
  assert.equal((me.user as any).defaultBranchId, '7');
  assert.equal((me.security as any).mustChangePassword, true);

  await assert.rejects(async () => {
    await service.changePassword(1, password, 'short');
  }, /PASSWORD_TOO_WEAK/);

  await service.changePassword(1, password, 'AdminEvenStronger123!');
}

run().then(() => {
  console.log('session-auth.spec: ok');
});
