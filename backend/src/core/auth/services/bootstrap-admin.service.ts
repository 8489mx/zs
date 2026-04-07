import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kysely } from 'kysely';
import { createHash, randomBytes } from 'node:crypto';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';

function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(`${password}:${salt}`).digest('hex');
}

const SUPER_ADMIN_PERMISSIONS = [
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
  'audit',
  'treasury',
  'services',
  'settings',
  'cashDrawer',
  'canPrint',
  'canDiscount',
  'canEditPrice',
  'canViewProfit',
  'canDelete',
  'canEditInvoices',
  'canAdjustInventory',
  'canManageSettings',
  'canManageUsers',
  'canEditUsers',
  'canManageBackups',
];

@Injectable()
export class BootstrapAdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BootstrapAdminService.name);

  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly configService: ConfigService,
  ) {}

  private async ensureBootstrapUser(input: {
    username: string;
    password: string;
    role: 'super_admin' | 'admin';
    displayName: string;
    permissions: string[];
  }): Promise<void> {
    const existing = await this.db
      .selectFrom('users')
      .select('id')
      .where('username', '=', input.username)
      .limit(1)
      .executeTakeFirst();

    if (existing) {
      return;
    }

    const salt = randomBytes(16).toString('hex');
    const passwordHash = hashPassword(input.password, salt);

    await this.db
      .insertInto('users')
      .values({
        username: input.username,
        password_hash: passwordHash,
        password_salt: salt,
        role: input.role,
        is_active: true,
        permissions_json: JSON.stringify(input.permissions),
        branch_ids_json: JSON.stringify([]),
        default_branch_id: null,
        display_name: input.displayName,
        failed_login_count: 0,
        locked_until: null,
        last_login_at: null,
        must_change_password: true,
      })
      .onConflict((oc) => oc.column('username').doNothing())
      .execute();
  }

  async onApplicationBootstrap(): Promise<void> {
    const enableBootstrapAdmin = this.configService.get<boolean>('ENABLE_BOOTSTRAP_ADMIN') === true;
    if (!enableBootstrapAdmin) {
      this.logger.log('Bootstrap admin seeding is disabled for this environment');
      return;
    }

    const bootstrapSuperAdminUsername = this.configService.get<string>('DEFAULT_ADMIN_USERNAME') || 'admin';
    const bootstrapSuperAdminPassword = this.configService.get<string>('DEFAULT_ADMIN_PASSWORD') || 'ChangeMe123!';

    await this.ensureBootstrapUser({
      username: bootstrapSuperAdminUsername,
      password: bootstrapSuperAdminPassword,
      role: 'super_admin',
      displayName: 'Bootstrap Administrator',
      permissions: SUPER_ADMIN_PERMISSIONS,
    });

    this.logger.warn(
      `Bootstrap administrator '${bootstrapSuperAdminUsername}' is enabled. Rotate this password after first login.`,
    );
  }
}
