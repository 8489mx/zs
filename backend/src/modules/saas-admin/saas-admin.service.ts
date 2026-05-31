import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely, sql } from '../../database/kysely';
import { Database } from '../../database/database.types';
import { KYSELY_DB } from '../../database/database.constants';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { AuditService } from '../../core/audit/audit.service';
import { CreateTrialTenantDto, ExtendTrialDto, ListSaasTenantsQueryDto, TenantStatusActionDto } from './dto/saas-admin.dto';
import { TrialTenantProvisioningService } from './trial-tenant-provisioning.service';

type TenantStatus = 'trial' | 'active' | 'expired' | 'suspended';

@Injectable()
export class SaasAdminService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly audit: AuditService,
    private readonly provisioning: TrialTenantProvisioningService,
  ) {}

  private assertPlatformAccess(auth: AuthContext): void {
    const platformTenantId = String(process.env.PLATFORM_TENANT_ID || '').trim();
    const tenantId = String(auth.tenantId || '').trim();
    const isAllowedTenant = tenantId === 'default' || (platformTenantId ? tenantId === platformTenantId : false);
    if (auth.role !== 'super_admin' || !tenantId || !isAllowedTenant) {
      throw new ForbiddenException('غير مسموح: هذه الشاشة مخصصة لمسؤول المنصة فقط.');
    }
  }

  private getPlatformTenantId(): string {
    return String(process.env.PLATFORM_TENANT_ID || 'default').trim() || 'default';
  }

  private assertNotPlatformTenantTarget(targetTenantId: string): void {
    const platformTenantId = this.getPlatformTenantId();
    if (String(targetTenantId || '').trim() === platformTenantId) {
      throw new ForbiddenException('لا يمكن تعديل حالة نسخة المنصة من هذه الصفحة.');
    }
  }

  private normalizeRequired(value: unknown, message: string): string {
    const normalized = String(value || '').trim();
    if (!normalized) throw new BadRequestException(message);
    return normalized;
  }

  private normalizeOptional(value: unknown): string | null {
    const normalized = String(value || '').trim();
    return normalized || null;
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private trialDaysRemaining(trialEndsAt: Date | null): number | null {
    if (!trialEndsAt) return null;
    const diffMs = trialEndsAt.getTime() - Date.now();
    return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  }

  async listTenants(query: ListSaasTenantsQueryDto, auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertPlatformAccess(auth);
    const status = String(query.status || '').trim();
    const search = String(query.search || '').trim().toLowerCase();

    let listQuery = this.db
      .selectFrom('tenants as t')
      .leftJoin('users as u', 'u.tenant_id', 't.id')
      .select((eb) => [
        't.id',
        't.slug',
        't.business_name',
        't.owner_name',
        't.owner_phone',
        't.owner_email',
        't.activity_type',
        't.status',
        't.trial_starts_at',
        't.trial_ends_at',
        't.activated_at',
        't.created_at',
        't.updated_at',
        eb.fn.count<number>('u.id').as('users_count'),
        eb.fn.sum<number>(eb.case().when('u.is_active', '=', true).then(1).else(0).end()).as('active_users_count'),
      ])
      .groupBy([
        't.id',
        't.slug',
        't.business_name',
        't.owner_name',
        't.owner_phone',
        't.owner_email',
        't.activity_type',
        't.status',
        't.trial_starts_at',
        't.trial_ends_at',
        't.activated_at',
        't.created_at',
        't.updated_at',
      ])
      .orderBy('t.created_at desc');

    if (status) {
      listQuery = listQuery.where('t.status', '=', status as TenantStatus);
    }

    if (search) {
      listQuery = listQuery.where((eb) => eb.or([
        eb(sql<string>`LOWER(t.slug)`, 'like', `%${search}%`),
        eb(sql<string>`LOWER(t.business_name)`, 'like', `%${search}%`),
        eb(sql<string>`LOWER(t.owner_name)`, 'like', `%${search}%`),
        eb(sql<string>`LOWER(t.owner_phone)`, 'like', `%${search}%`),
        eb(sql<string>`LOWER(COALESCE(t.owner_email, ''))`, 'like', `%${search}%`),
      ]));
    }

    const rows = await listQuery.execute();
    const tenants = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      businessName: row.business_name,
      ownerName: row.owner_name,
      ownerPhone: row.owner_phone,
      ownerEmail: row.owner_email || '',
      activityType: row.activity_type || '',
      status: row.status,
      trialStartsAt: row.trial_starts_at ? new Date(row.trial_starts_at).toISOString() : null,
      trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at).toISOString() : null,
      activatedAt: row.activated_at ? new Date(row.activated_at).toISOString() : null,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      trialDaysRemaining: this.trialDaysRemaining(row.trial_ends_at ? new Date(row.trial_ends_at) : null),
      usersCount: Number(row.users_count || 0),
      activeUsersCount: Number(row.active_users_count || 0),
    }));

    return { tenants };
  }

  async getTenantById(id: string, auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertPlatformAccess(auth);
    const tenantId = String(id || '').trim();
    const tenant = await this.db
      .selectFrom('tenants')
      .selectAll()
      .where('id', '=', tenantId)
      .executeTakeFirst();
    if (!tenant) throw new NotFoundException('النسخة غير موجودة.');

    const usersSummary = await this.db
      .selectFrom('users')
      .select((eb) => [
        eb.fn.countAll<number>().as('users_count'),
        eb.fn.sum<number>(eb.case().when('is_active', '=', true).then(1).else(0).end()).as('active_users_count'),
      ])
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    return {
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        businessName: tenant.business_name,
        ownerName: tenant.owner_name,
        ownerPhone: tenant.owner_phone,
        ownerEmail: tenant.owner_email || '',
        activityType: tenant.activity_type || '',
        status: tenant.status,
        trialStartsAt: tenant.trial_starts_at ? new Date(tenant.trial_starts_at).toISOString() : null,
        trialEndsAt: tenant.trial_ends_at ? new Date(tenant.trial_ends_at).toISOString() : null,
        activatedAt: tenant.activated_at ? new Date(tenant.activated_at).toISOString() : null,
        createdAt: tenant.created_at ? new Date(tenant.created_at).toISOString() : null,
        updatedAt: tenant.updated_at ? new Date(tenant.updated_at).toISOString() : null,
        trialDaysRemaining: this.trialDaysRemaining(tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : null),
        usersCount: Number(usersSummary?.users_count || 0),
        activeUsersCount: Number(usersSummary?.active_users_count || 0),
      },
    };
  }

  async createTrialTenant(payload: CreateTrialTenantDto, auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertPlatformAccess(auth);

    const result = await this.provisioning.createTrialTenant(
      {
        slug: this.normalizeRequired(payload.slug, 'اسم النسخة مطلوب.'),
        businessName: this.normalizeRequired(payload.businessName, 'اسم النشاط مطلوب.'),
        ownerName: this.normalizeRequired(payload.ownerName, 'اسم المالك مطلوب.'),
        ownerPhone: this.normalizeRequired(payload.ownerPhone, 'رقم الهاتف مطلوب.'),
        ownerEmail: this.normalizeOptional(payload.ownerEmail),
        activityType: this.normalizeOptional(payload.activityType),
        username: this.normalizeRequired(payload.username, 'اسم المستخدم مطلوب.'),
        password: this.normalizeOptional(payload.password),
        days: payload.days,
        source: this.normalizeOptional(payload.source),
        campaign: this.normalizeOptional(payload.campaign),
        notes: this.normalizeOptional(payload.notes),
      },
      {
        enforceStrongProvidedPassword: true,
        strictProvidedSlug: true,
        strictProvidedUsername: true,
      },
    );

    await this.audit.log('إنشاء نسخة تجريبية', `تم إنشاء نسخة تجريبية: ${result.tenant.slug} (${result.tenant.id})`, auth);
    return result;
  }

  private async getTenantForMutation(id: string) {
    const tenant = await this.db.selectFrom('tenants').selectAll().where('id', '=', id).executeTakeFirst();
    if (!tenant) throw new NotFoundException('النسخة غير موجودة.');
    return tenant;
  }

  async activateTenant(id: string, auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertPlatformAccess(auth);
    const tenant = await this.getTenantForMutation(id);
    this.assertNotPlatformTenantTarget(tenant.id);
    const now = new Date();
    await this.db.updateTable('tenants').set({ status: 'active', activated_at: now, updated_at: now } as any).where('id', '=', tenant.id).execute();
    await this.audit.log('تفعيل نسخة', `تم تفعيل النسخة: ${tenant.slug} (${tenant.id})`, auth);
    return { ok: true };
  }

  async suspendTenant(id: string, body: TenantStatusActionDto, auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertPlatformAccess(auth);
    const tenant = await this.getTenantForMutation(id);
    this.assertNotPlatformTenantTarget(tenant.id);
    const now = new Date();
    await this.db.updateTable('tenants').set({ status: 'suspended', updated_at: now } as any).where('id', '=', tenant.id).execute();
    const note = [this.normalizeOptional(body.reason), this.normalizeOptional(body.notes)].filter(Boolean).join(' - ');
    await this.audit.log('إيقاف نسخة', `تم إيقاف النسخة: ${tenant.slug} (${tenant.id})${note ? ` | ${note}` : ''}`, auth);
    return { ok: true };
  }

  async expireTenant(id: string, body: TenantStatusActionDto, auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertPlatformAccess(auth);
    const tenant = await this.getTenantForMutation(id);
    this.assertNotPlatformTenantTarget(tenant.id);
    const now = new Date();
    const currentEndsAt = tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : now;
    const trialEndsAt = currentEndsAt > now ? now : currentEndsAt;
    await this.db
      .updateTable('tenants')
      .set({ status: 'expired', trial_ends_at: trialEndsAt, updated_at: now } as any)
      .where('id', '=', tenant.id)
      .execute();
    const note = [this.normalizeOptional(body.reason), this.normalizeOptional(body.notes)].filter(Boolean).join(' - ');
    await this.audit.log('إنهاء نسخة', `تم إنهاء النسخة: ${tenant.slug} (${tenant.id})${note ? ` | ${note}` : ''}`, auth);
    return { ok: true };
  }

  async extendTrial(id: string, body: ExtendTrialDto, auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertPlatformAccess(auth);
    const tenant = await this.getTenantForMutation(id);
    this.assertNotPlatformTenantTarget(tenant.id);
    const days = Number(body.days);
    if (!Number.isFinite(days) || days < 1 || days > 365) {
      throw new BadRequestException('عدد الأيام يجب أن يكون بين 1 و 365.');
    }

    const now = new Date();
    const baseline = tenant.trial_ends_at && new Date(tenant.trial_ends_at) > now ? new Date(tenant.trial_ends_at) : now;
    const nextTrialEnd = this.addDays(baseline, days);
    await this.db
      .updateTable('tenants')
      .set({
        status: 'trial',
        trial_ends_at: nextTrialEnd,
        updated_at: now,
      } as any)
      .where('id', '=', tenant.id)
      .execute();
    await this.audit.log('تمديد نسخة تجريبية', `تم تمديد النسخة ${tenant.slug} (${tenant.id}) لمدة ${days} يوم`, auth);

    return { ok: true, trialEndsAt: nextTrialEnd.toISOString(), daysAdded: days };
  }
}
