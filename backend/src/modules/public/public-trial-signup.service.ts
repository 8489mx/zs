import { BadRequestException, Inject, Injectable, TooManyRequestsException } from '@nestjs/common';
import { Kysely, sql } from '../../database/kysely';
import { Database } from '../../database/database.types';
import { KYSELY_DB } from '../../database/database.constants';
import { InMemoryRateLimitService } from '../../common/security/in-memory-rate-limit.service';
import { TrialTenantProvisioningService } from '../saas-admin/trial-tenant-provisioning.service';
import { PublicTrialSignupDto } from './dto/public-trial-signup.dto';
import { TrialSignupMailService } from './trial-signup-mail.service';

@Injectable()
export class PublicTrialSignupService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly rateLimit: InMemoryRateLimitService,
    private readonly provisioning: TrialTenantProvisioningService,
    private readonly mail: TrialSignupMailService,
  ) {}

  private normalizeEmail(value: unknown): string {
    return String(value || '').trim().toLowerCase();
  }

  private normalizePhone(value: unknown): string {
    return this.provisioning.normalizePhoneDigits(value);
  }

  private async guardRateLimit(ip: string, email: string, phone: string): Promise<void> {
    const checks = [
      this.rateLimit.hit(`trial-signup:ip:${ip}`, 10, 3600),
      this.rateLimit.hit(`trial-signup:email:${email}`, 5, 3600),
      this.rateLimit.hit(`trial-signup:phone:${phone}`, 5, 3600),
    ];
    const results = await Promise.all(checks);
    if (results.some((entry) => !entry.allowed)) {
      throw new TooManyRequestsException('تم تجاوز عدد المحاولات المسموح به. حاول مرة أخرى لاحقًا.');
    }
  }

  private async assertNotDuplicateRecent(email: string, phone: string): Promise<void> {
    const existingTenant = await this.db
      .selectFrom('tenants')
      .select(['id'])
      .where((eb) => eb.or([
        eb(sql<string>`LOWER(COALESCE(owner_email, ''))`, '=', email),
        eb('owner_phone', '=', phone),
      ]))
      .executeTakeFirst();

    if (existingTenant) {
      throw new BadRequestException('يوجد طلب سابق بنفس البريد أو رقم الهاتف. تواصل مع الدعم إذا احتجت المساعدة.');
    }

    const existingRecentSignup = await this.db
      .selectFrom('trial_signups as ts')
      .innerJoin('tenants as t', 't.id', 'ts.tenant_id')
      .select(['ts.id'])
      .where('ts.created_at', '>=', sql<Date>`now() - interval '30 days'`)
      .where((eb) => eb.or([
        eb(sql<string>`LOWER(COALESCE(t.owner_email, ''))`, '=', email),
        eb('t.owner_phone', '=', phone),
      ]))
      .executeTakeFirst();

    if (existingRecentSignup) {
      throw new BadRequestException('يوجد طلب تجربة سابق لنفس البيانات. راجع بريدك الإلكتروني أو تواصل مع الدعم.');
    }
  }

  async signup(payload: PublicTrialSignupDto, ip: string): Promise<Record<string, unknown>> {
    if (String(payload.honeypot || '').trim()) {
      throw new BadRequestException('تعذر تنفيذ الطلب.');
    }

    const email = this.normalizeEmail(payload.ownerEmail);
    const phone = this.normalizePhone(payload.ownerPhone);

    await this.guardRateLimit(ip, email, phone);
    await this.assertNotDuplicateRecent(email, phone);

    const provisioned = await this.provisioning.createTrialTenant(
      {
        businessName: String(payload.businessName || '').trim(),
        ownerName: String(payload.businessName || '').trim(),
        ownerPhone: phone,
        ownerEmail: email,
        days: 14,
        source: 'public-trial-signup',
      },
      { enforceStrongProvidedPassword: false },
    );

    const isProduction = String(process.env.NODE_ENV || '').trim() === 'production';
    const debugCredentialsEnabled = String(process.env.PUBLIC_TRIAL_DEBUG_CREDENTIALS || '').trim().toLowerCase() === 'true';

    try {
      await this.mail.sendTrialCredentials({
        businessName: provisioned.tenant.businessName,
        ownerEmail: email,
        username: provisioned.owner.username,
        temporaryPassword: provisioned.owner.temporaryPassword,
      });
    } catch {
      if (isProduction) {
        await this.db.transaction().execute(async (trx) => {
          await trx.deleteFrom('users').where('tenant_id', '=', provisioned.tenant.id).execute();
          await trx.deleteFrom('trial_signups').where('tenant_id', '=', provisioned.tenant.id).execute();
          await trx.deleteFrom('tenants').where('id', '=', provisioned.tenant.id).execute();
        });
        throw new BadRequestException('تعذر إرسال بيانات الدخول حاليًا. يرجى المحاولة مرة أخرى أو التواصل مع الدعم.');
      }
    }

    const response: Record<string, unknown> = {
      ok: true,
      message: 'تم إنشاء نسختك التجريبية بنجاح. أرسلنا بيانات الدخول على بريدك الإلكتروني.',
    };

    if (!isProduction && debugCredentialsEnabled) {
      response.debug = {
        username: provisioned.owner.username,
        temporaryPassword: provisioned.owner.temporaryPassword,
        trialEndsAt: provisioned.tenant.trialEndsAt,
      };
    }

    return response;
  }
}
