import { strict as assert } from 'node:assert';
import { BootstrapAdminService } from '../../src/core/auth/services/bootstrap-admin.service';
import { SessionService } from '../../src/core/auth/services/session.service';
import { createPasswordRecord } from '../../src/core/auth/utils/password-hasher';

class FakeConfigService {
  constructor(private readonly values: Record<string, unknown>) {}
  get<T>(key: string): T | undefined {
    return this.values[key] as T | undefined;
  }
}

class FakeUsersSelectBuilder {
  constructor(private readonly user: any) {}
  select() { return this; }
  where() { return this; }
  async executeTakeFirst() { return this.user; }
}

class FakeSettingsSelectBuilder {
  constructor(private readonly settings: Array<{ key: string; value: string; tenant_id?: string }>) {}
  select() { return this; }
  where() { return this; }
  async execute() { return this.settings; }
}

class FakeUserBranchesSelectBuilder {
  private userId: number | null = null;
  constructor(private readonly userBranches: Array<{ user_id: number; branch_id: number | string; tenant_id?: string }>) {}
  select() { return this; }
  where(column: string | unknown, _op?: string, value?: number) {
    if (column === 'user_id') this.userId = Number(value);
    return this;
  }
  async execute() {
    return this.userBranches.filter((row) => this.userId == null || row.user_id === this.userId);
  }
}

class FakeTenantsSelectBuilder {
  private id = '';
  constructor(private readonly tenants: Array<{ id: string; slug: string; business_name: string; status: string; trial_ends_at: Date | null; created_at: Date }>) {}
  select() { return this; }
  where(column: string, _op: string, value: string) {
    if (column === 'id') this.id = value;
    return this;
  }
  async executeTakeFirst() {
    return this.tenants.find((tenant) => tenant.id === this.id);
  }
}

class FakeDb {
  constructor(
    private readonly user: any,
    private readonly settings: Array<{ key: string; value: string; tenant_id?: string }> = [],
    private readonly userBranches: Array<{ user_id: number; branch_id: number | string; tenant_id?: string }> = [],
    private readonly tenants: Array<{ id: string; slug: string; business_name: string; status: string; trial_ends_at: Date | null; created_at: Date }> = [],
  ) {}
  selectFrom(table: string) {
    if (table === 'users') return new FakeUsersSelectBuilder(this.user);
    if (table === 'settings') return new FakeSettingsSelectBuilder(this.settings);
    if (table === 'user_branches') return new FakeUserBranchesSelectBuilder(this.userBranches);
    if (table === 'tenants') return new FakeTenantsSelectBuilder(this.tenants);
    throw new Error(`Unsupported table: ${table}`);
  }
}

class FakeBootstrapDb {
  constructor(private readonly hasUsers = false) {}

  insertInto() {
    return {
      values: () => ({
        onConflict: () => ({ execute: async () => ({}) }),
      }),
    };
  }

  selectFrom() {
    return {
      select: () => ({
        where: () => ({ limit: () => ({ executeTakeFirst: async () => undefined }) }),
        limit: () => ({ executeTakeFirst: async () => (this.hasUsers ? { id: 1 } : undefined) }),
      }),
    };
  }
}

async function runMePayloadSafety(): Promise<void> {
  const defaultPassword = 'ChangeMe123!';
  const passwordRecord = await createPasswordRecord(defaultPassword);
  const user = {
    id: 7,
    username: 'admin',
    role: 'super_admin',
    permissions_json: JSON.stringify(['settings']),
    must_change_password: true,
    password_salt: passwordRecord.salt,
    password_hash: passwordRecord.hash,
    tenant_id: 'tenant-test',
    account_id: 'account-test',
  };

  const service = new SessionService(
    new FakeDb(user, [{ key: 'theme', value: 'light', tenant_id: 'tenant-test' }], [], [
      { id: 'tenant-test', slug: 'tenant-test', business_name: 'Tenant Test', status: 'trial', trial_ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), created_at: new Date() },
    ]) as any,
    new FakeConfigService({ DEFAULT_ADMIN_USERNAME: 'admin', DEFAULT_ADMIN_PASSWORD: defaultPassword }) as any,
  );

  const payload = await service.buildMePayload({
    userId: 7,
    sessionId: 'sess-1',
    username: 'admin',
    role: 'super_admin',
    permissions: ['settings'],
    tenantId: 'tenant-test',
    accountId: 'account-test',
  });

  assert.equal((payload.security as any).usingDefaultAdminPassword, true);
  assert.equal((payload.settings as any).theme, 'light');
  assert.equal((payload.tenant as any).isTrial, true);
  assert.equal((payload.tenant as any).id, 'tenant-test');
}

async function runBootstrapGuardrails(): Promise<void> {
  const baseDb = new FakeBootstrapDb() as any;

  await assert.rejects(
    async () => {
      const service = new BootstrapAdminService(
        baseDb,
        new FakeConfigService({
          ENABLE_BOOTSTRAP_ADMIN: true,
          DEFAULT_ADMIN_USERNAME: 'admin',
          DEFAULT_ADMIN_PASSWORD: 'ChangeMe123!',
          NODE_ENV: 'development',
          ALLOW_BOOTSTRAP_ADMIN_IN_PRODUCTION: false,
        }) as any,
      );
      await service.onApplicationBootstrap();
    },
    /refuses to start with the default administrator password/,
  );

  await assert.rejects(
    async () => {
      const service = new BootstrapAdminService(
        baseDb,
        new FakeConfigService({
          ENABLE_BOOTSTRAP_ADMIN: true,
          DEFAULT_ADMIN_USERNAME: 'owner',
          DEFAULT_ADMIN_PASSWORD: 'VeryStrongAdminPass123!',
          NODE_ENV: 'production',
          ALLOW_BOOTSTRAP_ADMIN_IN_PRODUCTION: false,
        }) as any,
      );
      await service.onApplicationBootstrap();
    },
    /blocked in production/,
  );

  const service = new BootstrapAdminService(
    baseDb,
    new FakeConfigService({
      ENABLE_BOOTSTRAP_ADMIN: true,
      DEFAULT_ADMIN_USERNAME: 'owner',
      DEFAULT_ADMIN_PASSWORD: 'VeryStrongAdminPass123!',
      NODE_ENV: 'development',
      ALLOW_BOOTSTRAP_ADMIN_IN_PRODUCTION: false,
    }) as any,
  );

  await service.onApplicationBootstrap();

  const alreadyInitialized = new BootstrapAdminService(
    new FakeBootstrapDb(true) as any,
    new FakeConfigService({
      ENABLE_BOOTSTRAP_ADMIN: true,
      NODE_ENV: 'development',
      ALLOW_BOOTSTRAP_ADMIN_IN_PRODUCTION: false,
    }) as any,
  );

  await alreadyInitialized.onApplicationBootstrap();
}

Promise.all([runMePayloadSafety(), runBootstrapGuardrails()]).then(() => {
  console.log('bootstrap-admin-safety.spec: ok');
});
