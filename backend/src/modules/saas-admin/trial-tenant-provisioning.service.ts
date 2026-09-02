import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { Kysely, sql } from '../../database/kysely';
import { Database } from '../../database/database.types';
import { KYSELY_DB } from '../../database/database.constants';
import { createPasswordRecord } from '../../core/auth/utils/password-hasher';
import { DEFAULT_TRIAL_DAYS } from './trial.constants';
import { formatBranchStockLocationName } from '../../common/utils/branch-stock.util';

export type TrialTenantProvisioningInput = {
  slug?: string;
  businessName: string;
  branchName?: string | null;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string | null;
  activityType?: string | null;
  username?: string;
  password?: string | null;
  days?: number;
  source?: string | null;
  campaign?: string | null;
  notes?: string | null;
  featurePlanId?: string | null;
  saasPlanId?: number | null;
};

export type TrialTenantProvisioningResult = {
  tenant: {
    id: string;
    slug: string;
    businessName: string;
    ownerName: string;
    ownerPhone: string;
    ownerEmail: string;
    activityType: string;
    status: 'trial';
    trialStartsAt: string;
    trialEndsAt: string;
    activatedAt: null;
    createdAt: string;
    updatedAt: string;
    trialDaysRemaining: number;
  };
  owner: {
    username: string;
    temporaryPassword: string;
    mustChangePassword: true;
  };
};

@Injectable()
export class TrialTenantProvisioningService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private normalizeRequired(value: unknown, message: string): string {
    const normalized = String(value || '').trim();
    if (!normalized) throw new BadRequestException(message);
    return normalized;
  }

  private normalizeOptional(value: unknown): string | null {
    const normalized = String(value || '').trim();
    return normalized || null;
  }

  normalizePhoneDigits(value: unknown): string {
    return String(value || '')
      .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
      .replace(/\s+/g, '')
      .trim();
  }

  normalizeSlugBase(value: unknown, isFallback = false): string {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

    if (!normalized || normalized.length < 3) {
      if (isFallback) {
        return `store-${Math.floor(10000 + Math.random() * 90000)}`;
      }
      throw new BadRequestException('المعرف (Slug) غير صالح. يجب كتابته بحروف إنجليزية أو أرقام فقط.');
    }
    if (normalized.length > 60) {
      if (isFallback) {
        return normalized.slice(0, 60).replace(/-+$/g, '');
      }
      throw new BadRequestException('المعرف (Slug) يجب ألا يتجاوز 60 حرفًا.');
    }

    return normalized;
  }

  private async makeUniqueSlug(base: string, trx: Kysely<Database>): Promise<string> {
    let candidate = base;
    let suffix = 2;
    while (true) {
      const row = await trx.selectFrom('tenants').select('id').where('slug', '=', candidate).executeTakeFirst();
      if (!row) return candidate;
      candidate = `${base}-${suffix++}`;
      if (candidate.length > 60) {
        candidate = `${base.slice(0, 54)}-${suffix++}`;
      }
    }
  }

  private async makeUniqueUsername(base: string, trx: Kysely<Database>): Promise<string> {
    const baseName = String(base || '').trim();
    let candidate = baseName;
    let suffix = 1;
    while (true) {
      const row = await trx
        .selectFrom('users')
        .select('id')
        .where(sql<string>`LOWER(username)`, '=', candidate.toLowerCase())
        .executeTakeFirst();
      if (!row) return candidate;
      candidate = `${baseName}${suffix++}`;
    }
  }

  private assertStrongTrialPassword(password: string): void {
    if (String(password || '').trim().length < 1) {
      throw new BadRequestException('كلمة المرور لا يمكن أن تكون فارغة.');
    }
  }

  private generatePassword(): string {
    return `Trial-${randomBytes(9).toString('base64url')}@Zs1`;
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private defaultPermissions(): string[] {
    return [
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
      'canManageBranchStock',
      'canManageSettings',
      'canManageUsers',
      'canEditUsers',
      'canManageBackups',
    ];
  }

  private trialDaysRemaining(trialEndsAt: Date): number {
    const diffMs = trialEndsAt.getTime() - Date.now();
    return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  }

  async createTrialTenant(
    payload: TrialTenantProvisioningInput,
    options?: {
      enforceStrongProvidedPassword?: boolean;
      strictProvidedSlug?: boolean;
      strictProvidedUsername?: boolean;
    },
  ): Promise<TrialTenantProvisioningResult> {
    const businessName = this.normalizeRequired(payload.businessName, 'اسم النشاط مطلوب.');
    const ownerName = this.normalizeRequired(payload.ownerName, 'اسم المالك مطلوب.');
    const ownerPhone = this.normalizeRequired(this.normalizePhoneDigits(payload.ownerPhone), 'رقم الهاتف مطلوب.');
    const ownerEmail = this.normalizeOptional(payload.ownerEmail);
    const activityType = this.normalizeOptional(payload.activityType);
    const days = Number.isFinite(Number(payload.days)) ? Math.max(1, Math.min(365, Number(payload.days))) : DEFAULT_TRIAL_DAYS;
    const providedSlug = this.normalizeOptional(payload.slug);
    const providedUsername = this.normalizeOptional(payload.username);
    const providedPassword = this.normalizeOptional(payload.password);
    const now = new Date();
    const expiresAt = this.addDays(now, days);

    const result = await this.db.transaction().execute(async (trx) => {
      const slugBase = providedSlug ? this.normalizeSlugBase(providedSlug, false) : this.normalizeSlugBase(businessName, true);
      let slug = await this.makeUniqueSlug(slugBase, trx);
      if (providedSlug && options?.strictProvidedSlug) {
        const exists = await trx.selectFrom('tenants').select('id').where('slug', '=', slugBase).executeTakeFirst();
        if (exists) throw new BadRequestException('اسم النسخة مستخدم بالفعل.');
        slug = slugBase;
      }
      const usernameBase = String(providedUsername || businessName).trim();
      let username = await this.makeUniqueUsername(usernameBase, trx);
      if (providedUsername && options?.strictProvidedUsername) {
        const exists = await trx
          .selectFrom('users')
          .select('id')
          .where(sql<string>`LOWER(username)`, '=', usernameBase.toLowerCase())
          .executeTakeFirst();
        if (exists) throw new BadRequestException('اسم المستخدم مستخدم بالفعل.');
        username = usernameBase;
      }
      const temporaryPassword = providedPassword || this.generatePassword();
      if (providedPassword && options?.enforceStrongProvidedPassword !== false) {
        this.assertStrongTrialPassword(temporaryPassword);
      }

      const tenantId = randomUUID();
      const signupId = randomUUID();
      const accountId = `${tenantId}:main`;
      const passwordRecord = await createPasswordRecord(temporaryPassword);

      // Resolve feature plan id: if provided use it, otherwise default to 'plan_ultimate' (the comprehensive plan with all features)
      let featurePlanId = this.normalizeOptional(payload.featurePlanId);
      if (!featurePlanId) {
        const ultimatePlan = await trx.selectFrom('plans').select('id').where('id', '=', 'plan_ultimate').executeTakeFirst();
        if (ultimatePlan) {
          featurePlanId = ultimatePlan.id;
        } else {
          const firstPlan = await trx.selectFrom('plans').select('id').orderBy('created_at', 'desc').executeTakeFirst();
          featurePlanId = firstPlan?.id || null;
        }
      }

      await trx
        .insertInto('tenants')
        .values({
          id: tenantId,
          slug,
          business_name: businessName,
          owner_name: ownerName,
          owner_phone: ownerPhone,
          owner_email: ownerEmail,
          activity_type: activityType,
          status: 'trial',
          plan_id: featurePlanId,
          trial_starts_at: now,
          trial_ends_at: expiresAt,
          created_at: now,
          updated_at: now,
        } as any)
        .execute();

      // Create trial subscription record
      let saasPlan = payload.saasPlanId 
        ? await trx.selectFrom('saas_plans').selectAll().where('id', '=', payload.saasPlanId).executeTakeFirst()
        : null;

      if (!saasPlan && featurePlanId) {
        saasPlan = await trx.selectFrom('saas_plans').selectAll().where('feature_plan_id', '=', featurePlanId).executeTakeFirst();
      }
      if (!saasPlan) {
        saasPlan = await trx.selectFrom('saas_plans').selectAll().where('is_active', '=', true).orderBy('price', 'desc').executeTakeFirst();
      }

      if (saasPlan) {
        await trx
          .insertInto('tenant_subscriptions')
          .values({
            tenant_id: tenantId,
            plan_id: saasPlan.id,
            status: 'trial',
            starts_at: now,
            ends_at: expiresAt,
            grace_ends_at: null,
            auto_renew: false,
            created_at: now,
            updated_at: now,
          } as any)
          .execute();
      }

      await trx
        .insertInto('trial_signups')
        .values({
          id: signupId,
          tenant_id: tenantId,
          source: this.normalizeOptional(payload.source),
          campaign: this.normalizeOptional(payload.campaign),
          utm_source: null,
          utm_campaign: null,
          notes: this.normalizeOptional(payload.notes),
          created_at: now,
        } as any)
        .execute();

      // 1. Create Default Primary Branch
      const branchName = payload.branchName?.trim() || 'الفرع الرئيسي';
      const branch = await trx
        .insertInto('branches')
        .values({
          tenant_id: tenantId,
          account_id: accountId,
          name: branchName,
          code: 'MAIN',
          sales_stock_mode: 'single_location',
          allow_external_sales_stock: false,
          is_active: true,
        } as any)
        .returning(['id'])
        .executeTakeFirstOrThrow();

      const branchId = Number(branch.id);

      // 2. Create Default Primary Stock Location (e.g. "رصيد الفرع الرئيسي")
      const locationName = formatBranchStockLocationName(branchName);
      const location = await trx
        .insertInto('stock_locations')
        .values({
          tenant_id: tenantId,
          account_id: accountId,
          branch_id: branchId,
          name: locationName,
          code: 'WH-MAIN',
          location_type: 'branch_stock',
          is_active: true,
        } as any)
        .returning(['id'])
        .executeTakeFirstOrThrow();

      const locationId = Number(location.id);

      await trx
        .updateTable('branches')
        .set({ default_stock_location_id: locationId })
        .where('id', '=', branchId)
        .execute();

      // 3. Create Super Admin User with default branch
      const user = await trx
        .insertInto('users')
        .values({
          username,
          password_hash: passwordRecord.hash,
          password_salt: passwordRecord.salt,
          role: 'super_admin',
          is_active: true,
          permissions_json: JSON.stringify(this.defaultPermissions()),
          default_branch_id: branchId,
          display_name: ownerName,
          failed_login_count: 0,
          locked_until: null,
          last_login_at: null,
          must_change_password: true,
          tenant_id: tenantId,
          account_id: accountId,
        } as any)
        .returning(['id'])
        .executeTakeFirstOrThrow();

      // 4. Link user to primary branch
      await trx
        .insertInto('user_branches')
        .values({
          tenant_id: tenantId,
          account_id: accountId,
          user_id: Number(user.id),
          branch_id: branchId,
        } as any)
        .onConflict((oc) => oc.columns(['user_id', 'branch_id'] as never).doNothing())
        .execute();

      // 5. Seed Default Business and Store Settings
      const defaultSettings = [
        { key: 'storeName', value: businessName },
        { key: 'companyName', value: businessName },
        { key: 'business_name', value: businessName },
        { key: 'store_name', value: businessName },
        { key: 'phone', value: ownerPhone },
        { key: 'ownerName', value: ownerName },
        { key: 'email', value: ownerEmail || '' },
        { key: 'activityType', value: activityType || 'تجارة عامة ومتنوعة (افتراضي)' },
        { key: 'currency', value: 'EGP' },
        { key: 'uiLanguage', value: 'ar' },
        { key: 'language', value: 'ar' },
        { key: 'timezone', value: 'Africa/Cairo' },
        { key: 'dateFormat', value: 'dd/MM/yyyy' },
        { key: 'timeFormat', value: '12h' },
        { key: 'paperSize', value: 'receipt' },
        { key: 'defaultPosMode', value: 'touch' },
        { key: 'theme', value: 'light' },
        { key: 'primaryBranchId', value: String(branchId) },
        { key: 'primaryLocationId', value: String(locationId) },
        { key: 'defaultStockLocationId', value: String(locationId) },
        { key: 'currentLocationId', value: String(locationId) },
        { key: 'taxRate', value: 0 },
        { key: 'taxMode', value: 'exclusive' },
        { key: 'taxNumber', value: '' },
      ];

      for (const s of defaultSettings) {
        await sql`
          INSERT INTO settings (key, value, tenant_id, account_id)
          VALUES (${s.key}, ${JSON.stringify(s.value)}, ${tenantId}, ${accountId})
          ON CONFLICT (tenant_id, key)
          DO UPDATE SET value = EXCLUDED.value, account_id = EXCLUDED.account_id
        `.execute(trx);
      }

      return {
        tenantId,
        slug,
        username,
        temporaryPassword,
      };
    });

    return {
      tenant: {
        id: result.tenantId,
        slug: result.slug,
        businessName,
        ownerName,
        ownerPhone,
        ownerEmail: ownerEmail || '',
        activityType: activityType || '',
        status: 'trial',
        trialStartsAt: now.toISOString(),
        trialEndsAt: expiresAt.toISOString(),
        activatedAt: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        trialDaysRemaining: this.trialDaysRemaining(expiresAt),
      },
      owner: {
        username: result.username,
        temporaryPassword: result.temporaryPassword,
        mustChangePassword: true,
      },
    };
  }
}
