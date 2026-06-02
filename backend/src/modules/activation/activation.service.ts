import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createVerify } from 'crypto';
import { Kysely, Transaction, sql } from '../../database/kysely';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { AppError } from '../../common/errors/app-error';
import { getMachineFingerprint } from './utils/machine-fingerprint';
import { ActivateAppDto } from './dto/activate-app.dto';
import { InitializeAppDto } from './dto/initialize-app.dto';
import { createPasswordRecord } from '../../core/auth/utils/password-hasher';
import { assertStrongPassword } from '../../core/auth/utils/password-policy';
import { SUPER_ADMIN_PERMISSIONS } from '../../core/auth/constants/super-admin-permissions';

interface LicensePayload {
  machineId: string;
  machineHash?: string;
  customerName: string;
  issuedAt: string;
  expiresAt?: string | null;
  mode?: 'desktop' | 'server';
}

interface ActivationRecord {
  machineHash: string;
  machineId: string;
  customerName: string | null;
  activatedAt: string;
  expiresAt: string | null;
  mode: 'desktop' | 'server';
  signature: string;
}

type DbOrTx = Kysely<Database> | Transaction<Database>;
type PortableScope = { tenantId: string; accountId: string };

@Injectable()
export class ActivationService {
  private readonly logger = new Logger(ActivationService.name);
  private readonly columnExistsCache = new Map<string, boolean>();

  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly configService: ConfigService,
  ) {}

  private get deploymentMode(): 'desktop' | 'server' {
    return this.configService.get<'desktop' | 'server'>('LICENSE_MODE') || 'desktop';
  }

  private get appMode(): string {
    return String(this.configService.get<string>('APP_MODE') || '').trim().toUpperCase();
  }

  private get isCloudSaasMode(): boolean {
    return this.appMode === 'CLOUD_SAAS';
  }

  private get activationEnforced(): boolean {
    return this.deploymentMode === 'desktop' && this.configService.get<boolean>('ACTIVATION_ENFORCED') === true;
  }

  private getPortableScope(): PortableScope {
    const tenantId = String(
      process.env.TENANT_ID
      || this.configService.get<string>('TENANT_ID')
      || process.env.PLATFORM_TENANT_ID
      || this.configService.get<string>('PLATFORM_TENANT_ID')
      || 'local-tenant',
    ).trim() || 'local-tenant';
    const accountId = String(
      process.env.ACCOUNT_ID
      || this.configService.get<string>('ACCOUNT_ID')
      || tenantId,
    ).trim() || tenantId;

    return { tenantId, accountId };
  }

  private async columnExists(table: string, column: string, executor: DbOrTx = this.db): Promise<boolean> {
    const cacheKey = `${table}.${column}`;
    const cached = this.columnExistsCache.get(cacheKey);
    if (cached != null) return cached;

    const result = await sql<{ exists: boolean }>`
      select exists (
        select 1
        from information_schema.columns
        where table_schema = current_schema()
          and table_name = ${table}
          and column_name = ${column}
      ) as exists
    `.execute(executor);

    const exists = Boolean(result.rows[0]?.exists);
    this.columnExistsCache.set(cacheKey, exists);
    return exists;
  }

  private sanitizeError(error: unknown): Record<string, unknown> {
    const candidate = (error ?? {}) as Record<string, unknown>;
    const stack = typeof candidate.stack === 'string' ? candidate.stack : '';
    return {
      name: typeof candidate.name === 'string' ? candidate.name : 'Error',
      message: typeof candidate.message === 'string' ? candidate.message : 'Unknown error',
      code: typeof candidate.code === 'string' ? candidate.code : undefined,
      constraint: typeof candidate.constraint === 'string' ? candidate.constraint : undefined,
      table: typeof candidate.table === 'string' ? candidate.table : undefined,
      column: typeof candidate.column === 'string' ? candidate.column : undefined,
      stackFirstLine: stack ? stack.split('\n')[0]?.trim() : undefined,
    };
  }

  private async getSetting(key: string, executor: DbOrTx = this.db): Promise<string | null> {
    const settingsScoped = await this.columnExists('settings', 'tenant_id', executor);
    let query = executor.selectFrom('settings').select(['value']).where('key', '=', key);
    if (settingsScoped) {
      const scope = this.getPortableScope();
      query = query.where('tenant_id' as never, '=', scope.tenantId as never);
    }
    const row = await query.executeTakeFirst();
    return row?.value ?? null;
  }

  private async setSetting(key: string, value: string, executor: DbOrTx = this.db): Promise<void> {
    const settingsScoped = await this.columnExists('settings', 'tenant_id', executor);
    if (!settingsScoped) {
      await executor
        .insertInto('settings')
        .values({ key, value } as any)
        .onConflict((oc) => oc.column('key').doUpdateSet({ value } as any))
        .execute();
      return;
    }

    const scope = this.getPortableScope();
    const settingsHaveAccountId = await this.columnExists('settings', 'account_id', executor);
    const insertValues: Record<string, unknown> = {
      key,
      value,
      tenant_id: scope.tenantId,
    };
    if (settingsHaveAccountId) insertValues.account_id = scope.accountId;

    const updateValues: Record<string, unknown> = { value };
    if (settingsHaveAccountId) updateValues.account_id = scope.accountId;

    await executor
      .insertInto('settings')
      .values(insertValues as any)
      .onConflict((oc) => oc.columns(['tenant_id', 'key'] as never).doUpdateSet(updateValues as any))
      .execute();
  }

  private async getUserCount(executor: DbOrTx = this.db): Promise<number> {
    const row = await executor.selectFrom('users').select((eb) => eb.fn.countAll<number>().as('count')).executeTakeFirstOrThrow();
    return Number(row.count || 0);
  }

  private parseActivationRecord(value: string | null): ActivationRecord | null {
    if (!value) return null;
    try {
      return JSON.parse(value) as ActivationRecord;
    } catch {
      return null;
    }
  }

  private async readActivationRecord(): Promise<ActivationRecord | null> {
    return this.parseActivationRecord(await this.getSetting('activation.license'));
  }

  private verifyCode(activationCode: string): ActivationRecord {
    const [payloadBase64, signatureBase64] = String(activationCode || '').trim().split('.');
    if (!payloadBase64 || !signatureBase64) throw new BadRequestException('كود التفعيل غير صالح.');
    const publicKey = (this.configService.get<string>('ACTIVATION_PUBLIC_KEY') || '').trim();
    if (!publicKey) throw new BadRequestException('المفتاح العام للتفعيل غير مضبوط.');
    const verify = createVerify('RSA-SHA256');
    verify.update(payloadBase64);
    verify.end();
    const ok = verify.verify(publicKey, Buffer.from(signatureBase64, 'base64url'));
    if (!ok) throw new BadRequestException('تعذر التحقق من كود التفعيل.');
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8')) as LicensePayload;
    const machine = getMachineFingerprint();
    const machineMatches = payload.machineId === machine.machineId;
    const hashMatches = !payload.machineHash || payload.machineHash === machine.fingerprintHash;
    if (!machineMatches || !hashMatches) {
      throw new ForbiddenException('كود التفعيل لا يخص هذا الجهاز او تم تغيير بصمة ويندوز او الجهاز.');
    }
    return {
      machineHash: payload.machineHash || machine.fingerprintHash,
      machineId: machine.machineId,
      customerName: payload.customerName || null,
      activatedAt: new Date().toISOString(),
      expiresAt: payload.expiresAt || null,
      mode: payload.mode === 'server' ? 'server' : 'desktop',
      signature: signatureBase64,
    };
  }

  private isLicenseExpired(record: ActivationRecord | null): boolean {
    if (!record?.expiresAt) return false;
    return new Date(record.expiresAt).getTime() < Date.now();
  }

  async getStatus() {
    if (this.isCloudSaasMode) {
      return {
        deploymentMode: this.deploymentMode,
        activationRequired: false,
        activated: true,
        setupRequired: false,
        machineId: null,
        customerName: null,
        activatedAt: null,
        expiresAt: null,
      };
    }

    const machine = getMachineFingerprint();
    const record = await this.readActivationRecord();
    const users = await this.getUserCount();
    const activated = !this.activationEnforced || (!!record && !this.isLicenseExpired(record));
    return {
      deploymentMode: this.deploymentMode,
      activationRequired: this.activationEnforced,
      activated,
      setupRequired: activated && users === 0,
      machineId: machine.machineId,
      customerName: record?.customerName || null,
      activatedAt: record?.activatedAt || null,
      expiresAt: record?.expiresAt || null,
    };
  }

  async activate(dto: ActivateAppDto) {
    if (this.isCloudSaasMode) {
      throw new ForbiddenException('Activation endpoints are disabled in CLOUD_SAAS mode.');
    }
    if (!this.activationEnforced) return { ok: true, ...(await this.getStatus()) };
    const record = this.verifyCode(dto.activationCode);
    await this.setSetting('activation.license', JSON.stringify(record));
    return { ok: true, ...(await this.getStatus()) };
  }

  async initialize(dto: InitializeAppDto) {
    if (this.isCloudSaasMode) {
      throw new ForbiddenException('Legacy activation initialize is disabled in CLOUD_SAAS mode.');
    }
    const status = await this.getStatus();
    if (status.activationRequired && !status.activated) {
      throw new ForbiddenException('فعل البرنامج اولا قبل التهيئة.');
    }
    const userCount = await this.getUserCount();
    if (userCount > 0) throw new ForbiddenException('تمت التهيئة الاولى مسبقا.');

    assertStrongPassword(dto.adminPassword);
    const passwordRecord = await createPasswordRecord(dto.adminPassword);
    const scope = this.getPortableScope();

    try {
      await this.db.transaction().execute(async (trx) => {
        if (await this.getUserCount(trx) > 0) {
          throw new ForbiddenException('تمت التهيئة الاولى مسبقا.');
        }

        await this.setSetting('storeName', dto.storeName.trim(), trx);
        if (dto.theme?.trim()) await this.setSetting('theme', dto.theme.trim(), trx);

        const now = new Date();

        const branchesScoped = await this.columnExists('branches', 'tenant_id', trx);
        const branchesHaveAccountId = branchesScoped && await this.columnExists('branches', 'account_id', trx);
        const branchValues: Record<string, unknown> = {
          name: dto.branchName.trim(),
          code: dto.branchCode?.trim() || '',
          is_active: true,
          created_at: now,
          updated_at: now,
        };
        if (branchesScoped) branchValues.tenant_id = scope.tenantId;
        if (branchesHaveAccountId) branchValues.account_id = scope.accountId;

        const branch = await trx
          .insertInto('branches')
          .values(branchValues as any)
          .returning(['id'])
          .executeTakeFirstOrThrow();

        const locationsScoped = await this.columnExists('stock_locations', 'tenant_id', trx);
        const locationsHaveAccountId = locationsScoped && await this.columnExists('stock_locations', 'account_id', trx);
        const locationValues: Record<string, unknown> = {
          branch_id: Number(branch.id),
          name: dto.locationName.trim(),
          code: dto.locationCode?.trim() || '',
          is_active: true,
          created_at: now,
          updated_at: now,
        };
        if (locationsScoped) locationValues.tenant_id = scope.tenantId;
        if (locationsHaveAccountId) locationValues.account_id = scope.accountId;

        const location = await trx
          .insertInto('stock_locations')
          .values(locationValues as any)
          .returning(['id'])
          .executeTakeFirstOrThrow();

        const usersScoped = await this.columnExists('users', 'tenant_id', trx);
        const usersHaveAccountId = usersScoped && await this.columnExists('users', 'account_id', trx);
        const userValues: Record<string, unknown> = {
          username: dto.adminUsername.trim(),
          password_hash: passwordRecord.hash,
          password_salt: passwordRecord.salt,
          role: 'super_admin',
          is_active: true,
          permissions_json: JSON.stringify(SUPER_ADMIN_PERMISSIONS),
          default_branch_id: Number(branch.id),
          display_name: dto.adminDisplayName.trim(),
          failed_login_count: 0,
          locked_until: null,
          last_login_at: null,
          must_change_password: false,
        };
        if (usersScoped) userValues.tenant_id = scope.tenantId;
        if (usersHaveAccountId) userValues.account_id = scope.accountId;

        const user = await trx
          .insertInto('users')
          .values(userValues as any)
          .returning(['id'])
          .executeTakeFirstOrThrow();

        const userBranchesScoped = await this.columnExists('user_branches', 'tenant_id', trx);
        const userBranchesHaveAccountId = userBranchesScoped && await this.columnExists('user_branches', 'account_id', trx);
        const userBranchValues: Record<string, unknown> = {
          user_id: Number(user.id),
          branch_id: Number(branch.id),
        };
        if (userBranchesScoped) userBranchValues.tenant_id = scope.tenantId;
        if (userBranchesHaveAccountId) userBranchValues.account_id = scope.accountId;

        await trx
          .insertInto('user_branches')
          .values(userBranchValues as any)
          .onConflict((oc) => oc.columns(['user_id', 'branch_id'] as never).doNothing())
          .execute();

        await this.setSetting('activation.initializedAt', now.toISOString(), trx);
        await this.setSetting('activation.primaryBranchId', String(branch.id), trx);
        await this.setSetting('activation.primaryLocationId', String(location.id), trx);
      });
    } catch (error) {
      this.logger.error(
        '[activation-initialize] portable setup failed',
        JSON.stringify({ scope, error: this.sanitizeError(error) }),
      );

      if (error instanceof ForbiddenException || error instanceof BadRequestException || error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        'تعذر اكمال التهيئة الاولى. تاكد من اكتمال تجهيز قاعدة البيانات المحلية ثم حاول مرة اخرى.',
        'ACTIVATION_INITIALIZE_FAILED',
        400,
      );
    }

    return { ok: true, ...(await this.getStatus()) };
  }

  async assertLoginAllowed(): Promise<void> {
    const status = await this.getStatus();
    if (status.activationRequired && !status.activated) {
      throw new UnauthorizedException('فعل البرنامج اولا قبل تسجيل الدخول.');
    }
  }
}
