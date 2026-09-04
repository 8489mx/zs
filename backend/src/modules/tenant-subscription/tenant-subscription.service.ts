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

  async getMySubscription(auth: AuthContext): Promise<Record<string, unknown>> {
    const tenantId = String(auth.tenantId || '').trim();
    if (!tenantId) {
      throw new NotFoundException('المنشأة غير محددة.');
    }

    const tenant = await this.db
      .selectFrom('tenants')
      .selectAll()
      .where('id', '=', tenantId)
      .executeTakeFirst();

    if (!tenant) {
      throw new NotFoundException('المنشأة غير موجودة.');
    }

    // 1. Get latest/active subscription
    const subscription = await this.db
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
      .where('s.tenant_id', '=', tenantId)
      .orderBy('s.created_at', 'desc')
      .executeTakeFirst();

    // 2. Resource usage calculation
    const [usersRes, branchesRes, locationsRes, productsRes, salesRes] = await Promise.all([
      this.db.selectFrom('users').select(sql<number>`count(*)::int`.as('count')).where('tenant_id', '=', tenantId).where('is_active', '=', true).executeTakeFirst(),
      this.db.selectFrom('branches').select(sql<number>`count(*)::int`.as('count')).where('tenant_id', '=', tenantId).where('is_active', '=', true).executeTakeFirst(),
      this.db.selectFrom('stock_locations').select(sql<number>`count(*)::int`.as('count')).where('tenant_id', '=', tenantId).where('is_active', '=', true).executeTakeFirst(),
      this.db.selectFrom('products').select(sql<number>`count(*)::int`.as('count')).where('tenant_id', '=', tenantId).executeTakeFirst(),
      this.db.selectFrom('sales').select(sql<number>`count(*)::int`.as('count')).where('tenant_id', '=', tenantId).executeTakeFirst(),
    ]);

    const activeUsersCount = usersRes?.count || 0;
    const activeBranchesCount = branchesRes?.count || 0;
    const activeLocationsCount = locationsRes?.count || 0;
    const totalProductsCount = productsRes?.count || 0;
    const totalSalesCount = salesRes?.count || 0;

    // 3. Available plans for upgrade/renewal
    const availablePlans = await this.db
      .selectFrom('saas_plans')
      .selectAll()
      .where('is_active', '=', true)
      .orderBy('price', 'asc')
      .execute();

    // 4. Payment receipts & history
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
      .where('p.tenant_id', '=', tenantId)
      .orderBy('p.paid_at', 'desc')
      .execute();

    // 5. Expiry & days calculation
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
        featurePlanId: p.feature_plan_id,
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
      const plan = await this.db.selectFrom('saas_plans').selectAll().where('id', '=', planId).executeTakeFirst();
      if (plan) return plan;
    }

    const allPlans = await this.db.selectFrom('saas_plans').selectAll().execute();
    if (allPlans.length > 0) {
      return (planId ? allPlans.find((p) => p.id === planId) : null) || allPlans[0];
    }

    const now = new Date();
    const seeded = await this.db
      .insertInto('saas_plans')
      .values([
        { code: 'basic', name: 'الباقة الأساسية', price: 3500, currency: 'EGP', billing_period_months: 12, max_users: 2, max_branches: 1, is_active: true, created_at: now, updated_at: now },
        { code: 'pro', name: 'الباقة الاحترافية', price: 7500, currency: 'EGP', billing_period_months: 12, max_users: 10, max_branches: 3, is_active: true, created_at: now, updated_at: now },
        { code: 'enterprise', name: 'باقة المؤسسات والتصنيع', price: 15000, currency: 'EGP', billing_period_months: 12, max_users: 999, max_branches: 999, is_active: true, created_at: now, updated_at: now },
      ] as any)
      .returningAll()
      .execute();

    return (planId ? seeded.find((p) => p.id === planId) : null) || seeded[1] || seeded[0];
  }

  async requestRenewal(dto: RequestRenewalDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const tenantId = String(auth.tenantId || '').trim();
    if (!tenantId) {
      throw new NotFoundException('المنشأة غير محددة.');
    }

    const plan = await this.resolvePlan(dto.planId);
    if (!plan) {
      throw new NotFoundException('الخطة غير موجودة.');
    }

    await this.audit.log(
      'طلب تجديد اشتراك',
      `قام المالك بطلب تجديد/ترقية الاشتراك إلى باقة: ${plan.name} (طريقة السداد المرجوة: ${dto.paymentMethod || 'غير محدد'})`,
      auth,
      { targetTenantId: tenantId },
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
    const tenantId = String(auth.tenantId || '').trim();
    if (!tenantId) {
      throw new NotFoundException('المنشأة غير محددة.');
    }

    const tenant = await this.db.selectFrom('tenants').selectAll().where('id', '=', tenantId).executeTakeFirst();
    if (!tenant) throw new NotFoundException('المنشأة غير موجودة.');

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
