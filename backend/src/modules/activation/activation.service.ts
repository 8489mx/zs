import { BadRequestException, ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kysely, Transaction } from '../../database/kysely';
import { createHash, createVerify } from 'crypto';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
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

@Injectable()
export class ActivationService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly configService: ConfigService,
  ) {}

  private get deploymentMode(): 'desktop' | 'server' {
    return this.configService.get<'desktop' | 'server'>('LICENSE_MODE') || 'desktop';
  }

  private get activationEnforced(): boolean {
    return this.deploymentMode === 'desktop' && this.configService.get<boolean>('ACTIVATION_ENFORCED') === true;
  }

  private async getSetting(key: string, executor: DbOrTx = this.db): Promise<string | null> {
    const row = await executor.selectFrom('settings').select(['value']).where('key', '=', key).executeTakeFirst();
    return row?.value ?? null;
  }

  private async setSetting(key: string, value: string, executor: DbOrTx = this.db): Promise<void> {
    await executor.insertInto('settings').values({ key, value } as any).onConflict((oc) => oc.column('key').doUpdateSet({ value } as any)).execute();
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
      throw new ForbiddenException('كود التفعيل لا يخص هذا الجهاز أو تم تغيير بصمة ويندوز/الجهاز.');
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
    if (!this.activationEnforced) return { ok: true, ...(await this.getStatus()) };
    const record = this.verifyCode(dto.activationCode);
    await this.setSetting('activation.license', JSON.stringify(record));
    return { ok: true, ...(await this.getStatus()) };
  }

  async initialize(dto: InitializeAppDto) {
    const status = await this.getStatus();
    if (status.activationRequired && !status.activated) {
      throw new ForbiddenException('فعّل البرنامج أولًا قبل التهيئة.');
    }
    const userCount = await this.getUserCount();
    if (userCount > 0) throw new ForbiddenException('تمت التهيئة الأولى مسبقًا.');

    assertStrongPassword(dto.adminPassword);
    const passwordRecord = await createPasswordRecord(dto.adminPassword);

    await this.db.transaction().execute(async (trx) => {
      if (await this.getUserCount(trx) > 0) throw new ForbiddenException('تمت التهيئة الأولى مسبقًا.');

      await this.setSetting('storeName', dto.storeName.trim(), trx);
      if (dto.theme?.trim()) await this.setSetting('theme', dto.theme.trim(), trx);

      const branch = await trx.insertInto('branches').values({
        name: dto.branchName.trim(),
        code: dto.branchCode?.trim() || '',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      } as any).returning(['id']).executeTakeFirstOrThrow();

      const location = await trx.insertInto('stock_locations').values({
        branch_id: Number(branch.id),
        name: dto.locationName.trim(),
        code: dto.locationCode?.trim() || '',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      } as any).returning(['id']).executeTakeFirstOrThrow();

      const user = await trx.insertInto('users').values({
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
      } as any).returning(['id']).executeTakeFirstOrThrow();

      await trx.insertInto('user_branches').values({
        user_id: Number(user.id),
        branch_id: Number(branch.id),
      } as any).onConflict((oc) => oc.columns(['user_id', 'branch_id']).doNothing()).execute();
      await this.setSetting('activation.initializedAt', new Date().toISOString(), trx);
      await this.setSetting('activation.primaryBranchId', String(branch.id), trx);
      await this.setSetting('activation.primaryLocationId', String(location.id), trx);
    });
    return { ok: true, ...(await this.getStatus()) };
  }

  async assertLoginAllowed(): Promise<void> {
    const status = await this.getStatus();
    if (status.activationRequired && !status.activated) {
      throw new UnauthorizedException('فعّل البرنامج أولًا قبل تسجيل الدخول.');
    }
  }
}
