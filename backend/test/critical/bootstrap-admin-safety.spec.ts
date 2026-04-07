import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { SessionService } from '../../src/core/auth/services/session.service';

function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(`${password}:${salt}`).digest('hex');
}

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

async function run(): Promise<void> {
  const salt = 'salt-2';
  const defaultPassword = 'ChangeMe123!';
  const user = {
    id: 7,
    username: 'admin',
    role: 'super_admin',
    permissions_json: JSON.stringify(['settings']),
    must_change_password: true,
    password_salt: salt,
    password_hash: hashPassword(defaultPassword, salt),
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

run().then(() => {
  console.log('bootstrap-admin-safety.spec: ok');
});
