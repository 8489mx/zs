import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { AuditService } from '../../core/audit/audit.service';
import { RequestRenewalDto } from './dto/tenant-subscription.dto';

@Injectable()
export class TenantSubscriptionService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly audit: AuditService,
  ) {}

  private async ensureTenant(tenantId: string, auth: AuthContext): Promise<{
    id: string;
    slug: string;
    business_name: string;
    owner_name: string;
    owner_phone: string;
    owner_email?: string | null;
    status: string;
    trial_starts_at: Date | string | null;
    trial_ends_at: Date | string | null;
    created_at: Date | string;
  }> {
    const normalizedTenantId = tenantId.trim() || 'default';

    const existingTenant = await this.db
      .selectFrom('tenants')
      .selectAll()
      .where('id', '=', normalizedTenantId)
      .executeTakeFirst();

    if (existingTenant) {
      return existingTenant as any;
    }

    // Auto-heal / provision tenant record from settings or auth context
    const settingsRows = await this.db
      .selectFrom('settings')
      .select(['key', 'value'])
      .where(sql<boolean>`tenant_id = ${normalizedTenantId}`)
      .execute()
      .catch(() => []);

    const settingsMap: Record<string, string> = {};
    for (const row of settingsRows) {
      try {
        settingsMap[row.key] = typeof row.value === 'string' ? JSON.parse(row.value) : String(row.value);
      } catch {
        settingsMap[row.key] = String(row.value || '');
      }
    }

    const businessName = settingsMap.storeName || settingsMap.companyName || 'المنشأة الرئيسية';
    const ownerPhone = settingsMap.phone || '';
    const ownerName = auth.role === 'super_admin' ? 'مدير المنظومة' : 'مسؤول النظام';
    const now = new Date();
    const tenYearsLater = new Date(now);
    tenYearsLater.setFullYear(tenYearsLater.getFullYear() + 10);

    try {
      await this.db
        .insertInto('tenants')
        .values({
          id: normalizedTenantId,
          slug: normalizedTenantId,
          business_name: businessName,
          owner_name: ownerName,
          owner_phone: ownerPhone,
          owner_email: '',
          status: 'active',
          trial_starts_at: now,
          trial_ends_at: tenYearsLater,
          activated_at: now,
          created_at: now,
          updated_at: now,
        } as any)
        .onConflict((oc) => oc.column('id').doNothing())
        .execute();

      const created = await this.db
        .selectFrom('tenants')
        .selectAll()
        .where('id', '=', normalizedTenantId)
        .executeTakeFirst();

      if (created) return created as any;
    } catch {
      // Fallback synthetic tenant object
    }

    return {
      id: normalizedTenantId,
      slug: normalizedTenantId,
      business_name: businessName,
      owner_name: ownerName,
      owner_phone: ownerPhone,
      status: 'active',
      trial_starts_at: now,
      trial_ends_at: tenYearsLater,
      created_at: now,
    };
  }

  private async ensureStandardPlans(): Promise<Array<any>> {
    let plans = await this.db
      .selectFrom('saas_plans')
      .selectAll()
      .where('is_active', '=', true)
      .orderBy('price', 'asc')
      .execute()
      .catch(() => []);

    const hasBasic = plans.some((p) => p.code === 'basic');
    const hasPro = plans.some((p) => p.code === 'pro');
    const hasEnterprise = plans.some((p) => p.code === 'enterprise');

    if (!hasBasic || !hasPro || !hasEnterprise) {
      const now = new Date();
      const missingPlans = [];
      if (!hasBasic) {
        missingPlans.push({
          code: 'basic',
          name: 'الباقة الأساسية',
          price: 3500,
          currency: 'EGP',
          billing_period_months: 12,
          max_users: 2,
          max_branches: 1,
          is_active: true,
          created_at: now,
          updated_at: now,
        });
      }
      if (!hasPro) {
        missingPlans.push({
          code: 'pro',
          name: 'الباقة الاحترافية',
          price: 7500,
          currency: 'EGP',
          billing_period_months: 12,
          max_users: 10,
          max_branches: 3,
          is_active: true,
          created_at: now,
          updated_at: now,
        });
      }
      if (!hasEnterprise) {
        missingPlans.push({
          code: 'enterprise',
          name: 'باقة المؤسسات والتصنيع',
          price: 15000,
          currency: 'EGP',
          billing_period_months: 12,
          max_users: 999,
          max_branches: 999,
          is_active: true,
          created_at: now,
          updated_at: now,
        });
      }

      try {
        await this.db
          .insertInto('saas_plans')
          .values(missingPlans as any)
          .onConflict((oc) => oc.column('code').doNothing())
          .execute();

        plans = await this.db
          .selectFrom('saas_plans')
          .selectAll()
          .where('is_active', '=', true)
          .orderBy('price', 'asc')
          .execute();
      } catch {
        // ignore if conflict or constraint
      }
    }

    if (plans.length === 0) {
      return [
        { id: 1, code: 'basic', name: 'الباقة الأساسية', price: 3500, currency: 'EGP', billing_period_months: 12, max_users: 2, max_branches: 1 },
        { id: 2, code: 'pro', name: 'الباقة الاحترافية', price: 7500, currency: 'EGP', billing_period_months: 12, max_users: 10, max_branches: 3 },
        { id: 3, code: 'enterprise', name: 'باقة المؤسسات والتصنيع', price: 15000, currency: 'EGP', billing_period_months: 12, max_users: 999, max_branches: 999 },
      ];
    }

    return plans;
  }

  async getMySubscription(auth: AuthContext): Promise<Record<string, unknown>> {
    const tenantId = String(auth.tenantId || '').trim() || 'default';
    const tenant = await this.ensureTenant(tenantId, auth);
    const availablePlans = await this.ensureStandardPlans();

    // 1. Get latest/active subscription
    let subscription = await this.db
      .selectFrom('tenant_subscriptions as s')
      .leftJoin('saas_plans as p', 's.plan_id', 'p.id')
      .select([
        's.id',
        's.status',
        's.starts_at',
        's.ends_at',
        's.grace_ends_at',
        's.auto_renew',
        's.created_at',
        'p.id as plan_id',
        'p.name as plan_name',
        'p.code as plan_code',
        'p.price as plan_price',
        'p.currency as plan_currency',
        'p.billing_period_months',
        'p.max_users',
        'p.max_branches',
      ])
      .where('s.tenant_id', '=', tenant.id)
      .orderBy('s.created_at', 'desc')
      .executeTakeFirst()
      .catch(() => undefined);

    // Auto-create active subscription for main tenant if none exists
    if (!subscription) {
      const defaultPlan = availablePlans.find((p: any) => p.code === 'pro') || availablePlans[0];
      const now = new Date();
      const tenYearsLater = new Date(now);
      tenYearsLater.setFullYear(tenYearsLater.getFullYear() + 10);

      try {
        if (defaultPlan?.id) {
          const insertedSub = await this.db
            .insertInto('tenant_subscriptions')
            .values({
              tenant_id: tenant.id,
              plan_id: defaultPlan.id,
              status: 'active',
              starts_at: now,
              ends_at: tenYearsLater,
              grace_ends_at: null,
              auto_renew: false,
              created_at: now,
              updated_at: now,
            } as any)
            .returningAll()
            .executeTakeFirst();

          if (insertedSub) {
            subscription = {
              id: insertedSub.id,
              status: insertedSub.status,
              starts_at: insertedSub.starts_at,
              ends_at: insertedSub.ends_at,
              grace_ends_at: insertedSub.grace_ends_at,
              auto_renew: insertedSub.auto_renew,
              created_at: insertedSub.created_at,
              plan_id: defaultPlan.id,
              plan_name: defaultPlan.name,
              plan_code: defaultPlan.code,
              plan_price: defaultPlan.price,
              plan_currency: defaultPlan.currency,
              billing_period_months: defaultPlan.billing_period_months,
              max_users: defaultPlan.max_users,
              max_branches: defaultPlan.max_branches,
            } as any;
          }
        }
      } catch {
        // ignore
      }

      if (!subscription) {
        subscription = {
          id: 1,
          status: 'active',
          starts_at: now,
          ends_at: tenYearsLater,
          grace_ends_at: null,
          auto_renew: false,
          created_at: now,
          plan_id: defaultPlan?.id || 1,
          plan_name: defaultPlan?.name || 'الباقة الاحترافية',
          plan_code: defaultPlan?.code || 'pro',
          plan_price: defaultPlan?.price || 7500,
          plan_currency: defaultPlan?.currency || 'EGP',
          billing_period_months: 12,
          max_users: defaultPlan?.max_users || 10,
          max_branches: defaultPlan?.max_branches || 3,
        } as any;
      }
    }

    // 2. Resource usage calculation
    const [usersRes, branchesRes, locationsRes, productsRes, salesRes] = await Promise.all([
      this.db.selectFrom('users').select(sql<number>`count(*)::int`.as('count')).where('tenant_id', '=', tenant.id).where('is_active', '=', true).executeTakeFirst().catch(() => ({ count: 1 })),
      this.db.selectFrom('branches').select(sql<number>`count(*)::int`.as('count')).where('tenant_id', '=', tenant.id).where('is_active', '=', true).executeTakeFirst().catch(() => ({ count: 1 })),
      this.db.selectFrom('stock_locations').select(sql<number>`count(*)::int`.as('count')).where('tenant_id', '=', tenant.id).where('is_active', '=', true).executeTakeFirst().catch(() => ({ count: 1 })),
      this.db.selectFrom('products').select(sql<number>`count(*)::int`.as('count')).where('tenant_id', '=', tenant.id).executeTakeFirst().catch(() => ({ count: 0 })),
      this.db.selectFrom('sales').select(sql<number>`count(*)::int`.as('count')).where('tenant_id', '=', tenant.id).executeTakeFirst().catch(() => ({ count: 0 })),
    ]);

    const activeUsersCount = usersRes?.count || 0;
    const activeBranchesCount = branchesRes?.count || 0;
    const activeLocationsCount = locationsRes?.count || 0;
    const totalProductsCount = productsRes?.count || 0;
    const totalSalesCount = salesRes?.count || 0;

    // 3. Payment receipts & history
    const payments = await this.db
      .selectFrom('tenant_subscription_payments as p')
      .leftJoin('tenant_subscriptions as s', 'p.subscription_id', 's.id')
      .leftJoin('saas_plans as pl', 's.plan_id', 'pl.id')
      .select([
        'p.id',
        'p.amount',
        'p.currency',
        'p.method',
        'p.reference',
        'p.paid_at',
        'p.created_at',
        'pl.name as plan_name',
        's.starts_at',
        's.ends_at',
      ])
      .where('p.tenant_id', '=', tenant.id)
      .orderBy('p.paid_at', 'desc')
      .execute()
      .catch(() => []);

    // 4. Expiry & days calculation
    const now = new Date();
    let daysRemaining: number | null = null;
    let isExpiringSoon = false;
    let isExpired = false;

    if (tenant.status === 'trial' && tenant.trial_ends_at) {
      const diff = new Date(tenant.trial_ends_at).getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
      isExpiringSoon = daysRemaining <= 5 && daysRemaining > 0;
      isExpired = daysRemaining === 0;
    } else if (subscription?.ends_at) {
      const diff = new Date(subscription.ends_at).getTime() - now.getTime();
      daysRemaining = Math.ceil(diff / (24 * 60 * 60 * 1000));
      isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;
      isExpired = daysRemaining <= 0;
    }

    return {
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        businessName: tenant.business_name,
        ownerName: tenant.owner_name,
        ownerPhone: tenant.owner_phone,
        status: tenant.status,
        trialStartsAt: tenant.trial_starts_at,
        trialEndsAt: tenant.trial_ends_at,
        createdAt: tenant.created_at,
      },
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        startsAt: subscription.starts_at,
        endsAt: subscription.ends_at,
        graceEndsAt: subscription.grace_ends_at,
        autoRenew: subscription.auto_renew,
        planId: subscription.plan_id,
        planName: subscription.plan_name,
        planCode: subscription.plan_code,
        planPrice: subscription.plan_price,
        planCurrency: subscription.plan_currency,
        billingPeriodMonths: subscription.billing_period_months,
      } : null,
      usage: {
        users: {
          current: activeUsersCount,
          max: subscription?.max_users || (tenant.status === 'trial' ? 5 : null),
        },
        branches: {
          current: activeBranchesCount,
          max: subscription?.max_branches || (tenant.status === 'trial' ? 2 : null),
        },
        locations: {
          current: activeLocationsCount,
        },
        products: {
          current: totalProductsCount,
        },
        sales: {
          current: totalSalesCount,
        },
      },
      statusMeta: {
        daysRemaining,
        isExpiringSoon,
        isExpired,
      },
      availablePlans: availablePlans.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        price: p.price,
        currency: p.currency,
        billingPeriodMonths: p.billing_period_months,
        maxUsers: p.max_users,
        maxBranches: p.max_branches,
        featurePlanId: (p as any).feature_plan_id,
      })),
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        method: p.method,
        reference: p.reference,
        paidAt: p.paid_at,
        planName: p.plan_name,
        startsAt: p.starts_at,
        endsAt: p.ends_at,
      })),
    };
  }

  async resolvePlan(planId?: number) {
    if (planId) {
      const plan = await this.db.selectFrom('saas_plans').selectAll().where('id', '=', planId).executeTakeFirst().catch(() => undefined);
      if (plan) return plan;
    }

    const plans = await this.ensureStandardPlans();
    return (planId ? plans.find((p) => p.id === planId) : null) || plans[1] || plans[0];
  }

  async requestRenewal(dto: RequestRenewalDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const tenantId = String(auth.tenantId || '').trim() || 'default';
    const tenant = await this.ensureTenant(tenantId, auth);

    const plan = await this.resolvePlan(dto.planId);
    if (!plan) {
      throw new NotFoundException('الخطة غير موجودة.');
    }

    await this.audit.log(
      'طلب تجديد اشتراك',
      `قام المالك بطلب تجديد/ترقية الاشتراك إلى باقة: ${plan.name} (طريقة السداد المرجوة: ${dto.paymentMethod || 'غير محدد'})`,
      auth,
      { targetTenantId: tenant.id },
    );

    return {
      ok: true,
      message: 'تم استلام طلب التجديد بنجاح. سيتم التواصل لتأكيد السداد وتفعيل الباقة، أو الدفع مباشرة فور تفعيل بوابة الدفع.',
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
      },
    };
  }

  async initiateOnlinePayment(
    dto: { planId: number; billingPeriodMonths?: number; gateway?: string; redirectUrl?: string },
    paymentManager: any,
    auth: AuthContext,
  ): Promise<Record<string, unknown>> {
    const tenantId = String(auth.tenantId || '').trim() || 'default';
    const tenant = await this.ensureTenant(tenantId, auth);

    const plan = await this.resolvePlan(dto.planId);
    if (!plan) throw new NotFoundException('الخطة غير موجودة.');

    const durationMonths = dto.billingPeriodMonths || plan.billing_period_months || 12;
    const isYearly = durationMonths >= 12;
    const amount = isYearly ? plan.price : Math.round(plan.price / 10);

    const gatewayName = dto.gateway || 'xpay';
    const result = await paymentManager.initiatePayment(gatewayName, {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      businessName: tenant.business_name,
      ownerName: tenant.owner_name,
      ownerPhone: tenant.owner_phone,
      ownerEmail: tenant.owner_email || undefined,
      planId: plan.id,
      planName: plan.name,
      amount,
      currency: plan.currency || 'EGP',
      durationMonths,
      redirectUrl: dto.redirectUrl,
    });

    return result;
  }
}
