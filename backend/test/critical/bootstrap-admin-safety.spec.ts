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

class FakeDb {
  constructor(private readonly user: any, private readonly settings: Array<{ key: string; value: string }> = []) {}
  selectFrom(table: string) {
    if (table === 'users') {
      return {
        select: () => ({
          where: () => ({ executeTakeFirst: async () => this.user }),
        }),
      };
    }
    if (table === 'settings') {
      return {
        select: () => ({ execute: async () => this.settings }),
      };
    }
    throw new Error(`Unsupported table: ${table}`);
  }
}

class FakeBootstrapDb {
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
  };

  const service = new SessionService(
    new FakeDb(user, [{ key: 'theme', value: 'light' }]) as any,
    new FakeConfigService({ DEFAULT_ADMIN_USERNAME: 'admin', DEFAULT_ADMIN_PASSWORD: defaultPassword }) as any,
  );

  const payload = await service.buildMePayload({
    userId: 7,
    sessionId: 'sess-1',
    username: 'admin',
    role: 'super_admin',
    permissions: ['settings'],
  });

  assert.equal((payload.security as any).usingDefaultAdminPassword, true);
  assert.equal((payload.settings as any).theme, 'light');
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
}

Promise.all([runMePayloadSafety(), runBootstrapGuardrails()]).then(() => {
  console.log('bootstrap-admin-safety.spec: ok');
});
