import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { createPasswordRecord } from '../utils/password-hasher';
import { assertStrongPassword } from '../utils/password-policy';
import { resolveTenantContext } from '../utils/tenant-context';

import { SUPER_ADMIN_PERMISSIONS } from '../constants/super-admin-permissions';

@Injectable()
export class BootstrapAdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BootstrapAdminService.name);

  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly configService: ConfigService,
  ) {}

  private async sanitizeSuperAdminRoles(): Promise<void> {
    try {
      const platformTenantId = String(this.configService.get<string>('PLATFORM_TENANT_ID') || 'zs').trim();
      const result = await sql`
        UPDATE users 
        SET role = 'admin'
        WHERE role = 'super_admin'
          AND tenant_id NOT IN ('zs', 'default', 'dev-tenant', ${platformTenantId});
      `.execute(this.db);

      const numUpdated = Number((result as any)?.numUpdatedRows || 0);
      if (numUpdated > 0) {
        this.logger.warn(`Security isolation: Sanitized ${numUpdated} user(s) from 'super_admin' to 'admin' (strictly permitted only in platform tenant).`);
      }
    } catch (error: any) {
      this.logger.debug?.(`Role sanitization skipped: ${error.message}`);
    }
  }

  private async ensureBootstrapUser(input: {
    username: string;
    password: string;
    role: 'super_admin' | 'admin';
    displayName: string;
    permissions: string[];
  }): Promise<void> {
    const scope = resolveTenantContext(this.configService);
    const existing = await this.db
      .selectFrom('users')
      .select('id')
      .where('username', '=', input.username)
      .limit(1)
      .executeTakeFirst();

    if (existing) {
      return;
    }

    const passwordRecord = await createPasswordRecord(input.password);

    const platformTenantId = String(this.configService.get<string>('PLATFORM_TENANT_ID') || 'zs').trim();
    const targetTenantId = input.role === 'super_admin' ? platformTenantId : scope.tenantId;
    const targetAccountId = input.role === 'super_admin' ? platformTenantId : scope.accountId;

    try {
      await this.db
        .insertInto('users')
        .values({
        username: input.username,
        password_hash: passwordRecord.hash,
        password_salt: passwordRecord.salt,
        role: input.role,
        is_active: true,
        permissions_json: JSON.stringify(input.permissions),
        default_branch_id: null,
        display_name: input.displayName,
        failed_login_count: 0,
        locked_until: null,
        last_login_at: null,
        must_change_password: true,
        tenant_id: targetTenantId,
        account_id: targetAccountId,
      })
      .execute();
    } catch (e: any) {
      if (e.code !== '23505') { // ignore unique violation
        throw e;
      }
    }
  }

  async onApplicationBootstrap(): Promise<void> {
    // Always sanitize super_admin roles on bootstrap to prevent unauthorized elevation in local/old databases
    await this.sanitizeSuperAdminRoles();

    const activationEnforced = this.configService.get<boolean>('ACTIVATION_ENFORCED') === true;
    const licenseMode = this.configService.get<string>('LICENSE_MODE') || 'desktop';
    if (licenseMode !== 'server' && activationEnforced) {
      this.logger.log('Bootstrap admin seeding is disabled while desktop activation is enforced');
      return;
    }

    const enableBootstrapAdmin = this.configService.get<boolean>('ENABLE_BOOTSTRAP_ADMIN') === true;
    if (!enableBootstrapAdmin) {
      this.logger.log('Bootstrap admin seeding is disabled for this environment');
      return;
    }

    const existingUser = await this.db
      .selectFrom('users')
      .select('id')
      .limit(1)
      .executeTakeFirst();

    if (existingUser) {
      this.logger.log('Bootstrap admin seeding is skipped because the system is already initialized');
      return;
    }

    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    const allowInProduction = this.configService.get<boolean>('ALLOW_BOOTSTRAP_ADMIN_IN_PRODUCTION') === true;
    const bootstrapSuperAdminUsername = (this.configService.get<string>('DEFAULT_ADMIN_USERNAME') || '').trim();
    const bootstrapSuperAdminPassword = this.configService.get<string>('DEFAULT_ADMIN_PASSWORD') || '';

    if (nodeEnv === 'production' && !allowInProduction) {
      throw new Error('Bootstrap admin seeding is blocked in production unless ALLOW_BOOTSTRAP_ADMIN_IN_PRODUCTION=true');
    }

    if (!bootstrapSuperAdminUsername) {
      throw new Error('Bootstrap admin seeding requires DEFAULT_ADMIN_USERNAME when ENABLE_BOOTSTRAP_ADMIN=true');
    }

    if (!bootstrapSuperAdminPassword) {
      throw new Error('Bootstrap admin seeding requires DEFAULT_ADMIN_PASSWORD when ENABLE_BOOTSTRAP_ADMIN=true');
    }

    if (bootstrapSuperAdminPassword === 'ChangeMe123!') {
      throw new Error('Bootstrap admin seeding refuses to start with the default administrator password');
    }

    assertStrongPassword(bootstrapSuperAdminPassword);

    await this.ensureBootstrapUser({
      username: bootstrapSuperAdminUsername,
      password: bootstrapSuperAdminPassword,
      role: 'super_admin',
      displayName: 'محمود زكريا',
      permissions: SUPER_ADMIN_PERMISSIONS,
    });

    this.logger.warn(
      `Bootstrap administrator '${bootstrapSuperAdminUsername}' was seeded for first-run setup.`,
    );
  }
}
