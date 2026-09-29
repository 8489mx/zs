import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import {
  ArCollectionsQueryDto,
  CreateCollectionLogDto,
  RecordPromiseToPayDto,
  ToggleCreditBlockDto,
  UpdateDunningLevelDto,
} from '../dto/ar-collections.dto';
import {
  evaluateCustomerDunning,
  renderDunningMessage,
  buildWhatsAppCollectionUrl,
  type DunningLevel,
  type CustomerDunningInput,
} from '../engines/ar-dunning.engine';

@Injectable()
export class ArCollectionsService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private assertCollectionsAccess(auth: AuthContext): void {
    if (
      auth.role === 'super_admin' ||
      auth.role === 'admin' ||
      auth.permissions.includes('accounting') ||
      auth.permissions.includes('sales') ||
      auth.permissions.includes('crm')
    ) {
      return;
    }
    throw new ForbiddenException('Missing required permissions for AR Collections & Dunning Hub');
  }

  private toMoney(value: unknown): number {
    const n = Number(value || 0);
    return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
  }

  /**
   * Retrieves high-level KPIs for the collections dashboard
   */
  async getOverview(auth: AuthContext): Promise<{
    totalOverdue: number;
    openCasesCount: number;
    escalatedCasesCount: number;
    promisedPaymentsCount: number;
    promisedAmountToday: number;
    creditBlockedCount: number;
  }> {
    this.assertCollectionsAccess(auth);
    const scope = requireTenantScope(auth);
    const tenantId = scope.tenantId;

    const casesStats = await (this.db as any)
      .selectFrom('ar_collection_cases')
      .select([
        sql<number>`COALESCE(SUM(CASE WHEN status IN ('open', 'promised_to_pay', 'escalated') THEN total_overdue ELSE 0 END), 0)`.as('total_overdue'),
        sql<number>`COUNT(CASE WHEN status IN ('open', 'promised_to_pay', 'escalated') THEN 1 END)`.as('open_cases_count'),
        sql<number>`COUNT(CASE WHEN status = 'escalated' OR oldest_overdue_days >= 30 THEN 1 END)`.as('escalated_cases_count'),
        sql<number>`COUNT(CASE WHEN status = 'promised_to_pay' AND promised_payment_date IS NOT NULL THEN 1 END)`.as('promised_count'),
        sql<number>`COALESCE(SUM(CASE WHEN promised_payment_date = CURRENT_DATE THEN promised_amount ELSE 0 END), 0)`.as('promised_amount_today'),
      ])
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    const blockedStats = await (this.db as any)
      .selectFrom('customers')
      .select([
        sql<number>`COUNT(*)`.as('blocked_count'),
      ])
      .where('tenant_id', '=', tenantId)
      .where('is_credit_blocked', '=', true)
      .executeTakeFirst();

    return {
      totalOverdue: this.toMoney(casesStats?.total_overdue),
      openCasesCount: Number(casesStats?.open_cases_count || 0),
      escalatedCasesCount: Number(casesStats?.escalated_cases_count || 0),
      promisedPaymentsCount: Number(casesStats?.promised_count || 0),
      promisedAmountToday: this.toMoney(casesStats?.promised_amount_today),
      creditBlockedCount: Number(blockedStats?.blocked_count || 0),
    };
  }

  /**
   * Lists collection cases with customer and level details
   */
  async getCases(auth: AuthContext, query: ArCollectionsQueryDto): Promise<{
    cases: any[];
    totalCount: number;
  }> {
    this.assertCollectionsAccess(auth);
    const scope = requireTenantScope(auth);
    const tenantId = scope.tenantId;

    let baseQuery = (this.db as any)
      .selectFrom('ar_collection_cases as c')
      .innerJoin('customers as cust', 'cust.id', 'c.customer_id')
      .leftJoin('ar_dunning_levels as lvl', 'lvl.id', 'c.current_level_id')
      .leftJoin('users as u', 'u.id', 'c.assigned_collector_id')
      .select([
        'c.id',
        'c.tenant_id',
        'c.customer_id',
        'c.total_overdue',
        'c.oldest_overdue_days',
        'c.status',
        'c.promised_payment_date',
        'c.promised_amount',
        'c.last_contact_date',
        'c.next_followup_date',
        'c.notes',
        'c.updated_at',
        'cust.name as customer_name',
        'cust.phone as customer_phone',
        'cust.balance as customer_balance',
        'cust.credit_limit as customer_credit_limit',
        'cust.is_credit_blocked',
        'cust.credit_block_reason',
        'lvl.id as level_id',
        'lvl.level_name',
        'lvl.level_order',
        'lvl.days_past_due as level_days_past_due',
        'lvl.auto_block_sales as level_auto_block_sales',
        'lvl.action_type as level_action_type',
        'lvl.template_text as level_template_text',
        'u.name as collector_name',
      ])
      .where('c.tenant_id', '=', tenantId);

    if (query.status && query.status !== 'all') {
      baseQuery = baseQuery.where('c.status', '=', query.status);
    }
    if (query.levelId) {
      baseQuery = baseQuery.where('c.current_level_id', '=', query.levelId);
    }
    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      baseQuery = baseQuery.where((eb: any) =>
        eb.or([
          eb('cust.name', 'ilike', term),
          eb('cust.phone', 'ilike', term),
          eb('c.notes', 'ilike', term),
        ]),
      );
    }

    const countRes = await (this.db as any)
      .selectFrom('ar_collection_cases as c')
      .innerJoin('customers as cust', 'cust.id', 'c.customer_id')
      .where('c.tenant_id', '=', tenantId)
      .select(sql<number>`COUNT(*)`.as('total'))
      .executeTakeFirst();

    const limit = query.limit || 50;
    const offset = query.offset || 0;

    const rawCases = await baseQuery
      .orderBy('c.total_overdue', 'desc')
      .orderBy('c.oldest_overdue_days', 'desc')
      .limit(limit)
      .offset(offset)
      .execute();

    // Enrich with dynamic WhatsApp URL
    const enriched = rawCases.map((item: any) => {
      let whatsAppUrl: string | undefined;
      let reminderMessage: string | undefined;

      if (item.level_template_text && Number(item.total_overdue) > 0) {
        reminderMessage = renderDunningMessage(item.level_template_text, {
          customerName: item.customer_name,
          totalOverdue: Number(item.total_overdue),
          daysOverdue: Number(item.oldest_overdue_days),
        });
        whatsAppUrl = buildWhatsAppCollectionUrl(item.customer_phone, reminderMessage);
      }

      return {
        ...item,
        total_overdue: this.toMoney(item.total_overdue),
        customer_balance: this.toMoney(item.customer_balance),
        customer_credit_limit: this.toMoney(item.customer_credit_limit),
        promised_amount: item.promised_amount ? this.toMoney(item.promised_amount) : null,
        reminderMessage,
        whatsAppUrl,
      };
    });

    return {
      cases: enriched,
      totalCount: Number(countRes?.total || 0),
    };
  }

  /**
   * Retrieves single case details including unpaid invoices and full interaction history
   */
  async getCaseDetails(auth: AuthContext, caseId: string): Promise<any> {
    this.assertCollectionsAccess(auth);
    const scope = requireTenantScope(auth);
    const tenantId = scope.tenantId;

    const caseRecord = await (this.db as any)
      .selectFrom('ar_collection_cases as c')
      .innerJoin('customers as cust', 'cust.id', 'c.customer_id')
      .leftJoin('ar_dunning_levels as lvl', 'lvl.id', 'c.current_level_id')
      .leftJoin('users as u', 'u.id', 'c.assigned_collector_id')
      .select([
        'c.id',
        'c.tenant_id',
        'c.customer_id',
        'c.total_overdue',
        'c.oldest_overdue_days',
        'c.status',
        'c.promised_payment_date',
        'c.promised_amount',
        'c.last_contact_date',
        'c.next_followup_date',
        'c.notes',
        'c.created_at',
        'c.updated_at',
        'cust.name as customer_name',
        'cust.phone as customer_phone',
        'cust.address as customer_address',
        'cust.balance as customer_balance',
        'cust.credit_limit as customer_credit_limit',
        'cust.is_credit_blocked',
        'cust.credit_block_reason',
        'lvl.id as level_id',
        'lvl.level_name',
        'lvl.level_order',
        'lvl.days_past_due as level_days_past_due',
        'lvl.auto_block_sales as level_auto_block_sales',
        'lvl.action_type as level_action_type',
        'lvl.template_text as level_template_text',
        'u.name as collector_name',
      ])
      .where('c.id', '=', caseId)
      .where('c.tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!caseRecord) {
      throw new NotFoundException('Collection case not found');
    }

    // Fetch customer's open sales invoices
    const sales = await (this.db as any)
      .selectFrom('sales')
      .select(['id', 'doc_no', 'invoice_number', 'total', 'paid_amount', 'created_at', 'status'])
      .where('tenant_id', '=', tenantId)
      .where('customer_id', '=', caseRecord.customer_id)
      .where('status', '!=', 'cancelled')
      .where(sql<boolean>`total > COALESCE(paid_amount, 0)`)
      .orderBy('created_at', 'asc')
      .execute();

    // Fetch interaction logs
    const logs = await (this.db as any)
      .selectFrom('ar_collection_logs as l')
      .leftJoin('users as u', 'u.id', 'l.created_by')
      .select([
        'l.id',
        'l.interaction_type',
        'l.result_status',
        'l.details',
        'l.promised_date',
        'l.promised_amount',
        'l.created_at',
        'u.name as created_by_name',
      ])
      .where('l.case_id', '=', caseId)
      .where('l.tenant_id', '=', tenantId)
      .orderBy('l.created_at', 'desc')
      .execute();

    let reminderMessage: string | undefined;
    let whatsAppUrl: string | undefined;

    if (caseRecord.level_template_text && Number(caseRecord.total_overdue) > 0) {
      reminderMessage = renderDunningMessage(caseRecord.level_template_text, {
        customerName: caseRecord.customer_name,
        totalOverdue: Number(caseRecord.total_overdue),
        daysOverdue: Number(caseRecord.oldest_overdue_days),
      });
      whatsAppUrl = buildWhatsAppCollectionUrl(caseRecord.customer_phone, reminderMessage);
    }

    return {
      case: {
        ...caseRecord,
        total_overdue: this.toMoney(caseRecord.total_overdue),
        customer_balance: this.toMoney(caseRecord.customer_balance),
        customer_credit_limit: this.toMoney(caseRecord.customer_credit_limit),
        promised_amount: caseRecord.promised_amount ? this.toMoney(caseRecord.promised_amount) : null,
        reminderMessage,
        whatsAppUrl,
      },
      invoices: sales.map((s: any) => ({
        ...s,
        total: this.toMoney(s.total),
        paid_amount: this.toMoney(s.paid_amount),
        unpaid_amount: this.toMoney(Math.max(0, Number(s.total || 0) - Number(s.paid_amount || 0))),
      })),
      logs: logs.map((l: any) => ({
        ...l,
        promised_amount: l.promised_amount ? this.toMoney(l.promised_amount) : null,
      })),
    };
  }

  /**
   * Full tenant synchronization: Evaluates all customer balances and open credit sales,
   * generates or updates cases, elevates dunning tiers, and executes automated credit blocks.
   */
  async syncCollections(auth: AuthContext): Promise<{
    scannedCustomers: number;
    activeCases: number;
    creditBlockedCount: number;
    settledCasesCount: number;
  }> {
    this.assertCollectionsAccess(auth);
    const scope = requireTenantScope(auth);
    const tenantId = scope.tenantId;

    // 1. Fetch or ensure dunning levels
    let levels = await (this.db as any)
      .selectFrom('ar_dunning_levels')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('level_order', 'asc')
      .execute();

    if (!levels.length) {
      // Seed default levels on the fly if not yet present
      const defaultLevels = [
        {
          id: `lvl_1_${tenantId}`,
          tenant_id: tenantId,
          level_order: 1,
          level_name: 'تذكير ودي (Friendly Reminder)',
          days_past_due: 7,
          auto_block_sales: false,
          action_type: 'whatsapp',
          template_text: 'مرحباً {customer_name}، نود تذكيركم بلطف بوجود رصيد مستحق بقيمة {total_overdue} ج.م تجاوز موعد استحقاقه منذ {days_overdue} يوماً. شاكرين حسن تعاونكم.',
        },
        {
          id: `lvl_2_${tenantId}`,
          tenant_id: tenantId,
          level_order: 2,
          level_name: 'إشعار رسمي بالسداد (Formal Notice)',
          days_past_due: 15,
          auto_block_sales: false,
          action_type: 'whatsapp',
          template_text: 'إشعار سداد رسمي: السيد {customer_name}، نرجو التكرم بسرعة سداد المديونية المتأخرة وقدرها {total_overdue} ج.م لتجنب تعليق التسهيلات الائتمانية.',
        },
        {
          id: `lvl_3_${tenantId}`,
          tenant_id: tenantId,
          level_order: 3,
          level_name: 'إنذار تعليق البيع الآجل (Credit Hold Warning)',
          days_past_due: 30,
          auto_block_sales: true,
          action_type: 'manual_call',
          template_text: 'إنذار إداري عاجل: تم إيقاف المبيعات الآجلة مؤقتاً لوجود متأخرات بقيمة {total_overdue} ج.م متأخرة منذ {days_overdue} يوماً. يرجى مراجعة إدارة التحصيل فوراً.',
        },
        {
          id: `lvl_4_${tenantId}`,
          tenant_id: tenantId,
          level_order: 4,
          level_name: 'إشعار تصعيد قانوني (Legal Escalation)',
          days_past_due: 60,
          auto_block_sales: true,
          action_type: 'legal',
          template_text: 'إشعار أخير قبل اتخاذ الإجراءات القانونية: السيد {customer_name}، نظراً لعدم الاستجابة للمطالبات السابقة بخصوص المبلغ المستحق {total_overdue} ج.م، سيتم تحويل الملف للشؤون القانونية خلال 48 ساعة.',
        },
      ];

      for (const dl of defaultLevels) {
        await (this.db as any)
          .insertInto('ar_dunning_levels')
          .values(dl)
          .onConflict((oc: any) => oc.column('id').doNothing())
          .execute();
      }

      levels = defaultLevels;
    }

    // 2. Fetch all customers with positive balance
    const customers = await (this.db as any)
      .selectFrom('customers')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('is_active', '=', true)
      .execute();

    // 3. Fetch existing collection cases for tenant
    const existingCases = await (this.db as any)
      .selectFrom('ar_collection_cases')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .execute();

    const caseByCustomer = new Map<number, any>();
    for (const ec of existingCases) {
      caseByCustomer.set(Number(ec.customer_id), ec);
    }

    // 4. Fetch open unpaid sales
    const unpaidSales = await (this.db as any)
      .selectFrom('sales')
      .select(['id', 'customer_id', 'total', 'paid_amount', 'created_at', 'status'])
      .where('tenant_id', '=', tenantId)
      .where('customer_id', 'is not', null)
      .where('status', '!=', 'cancelled')
      .where(sql<boolean>`total > COALESCE(paid_amount, 0)`)
      .orderBy('created_at', 'asc')
      .execute();

    const salesByCustomer = new Map<number, any[]>();
    for (const s of unpaidSales) {
      const cId = Number(s.customer_id);
      if (!salesByCustomer.has(cId)) salesByCustomer.set(cId, []);
      salesByCustomer.get(cId)!.push(s);
    }

    let activeCasesCount = 0;
    let creditBlockedCount = 0;
    let settledCasesCount = 0;

    for (const cust of customers) {
      const cId = Number(cust.id);
      const balance = Number(cust.balance || 0);
      const currentCase = caseByCustomer.get(cId);
      const custInvoices = salesByCustomer.get(cId) || [];

      const evalInput: CustomerDunningInput = {
        customerId: cId,
        customerName: cust.name,
        phone: cust.phone,
        balance,
        creditLimit: cust.credit_limit,
        isCreditBlocked: Boolean(cust.is_credit_blocked),
        invoices: custInvoices.map((inv: any) => ({
          id: inv.id,
          createdAt: inv.created_at,
          total: Number(inv.total),
          paidAmount: Number(inv.paid_amount || 0),
        })),
        currentCase: currentCase
          ? {
              status: currentCase.status,
              promisedPaymentDate: currentCase.promised_payment_date,
              promisedAmount: currentCase.promised_amount ? Number(currentCase.promised_amount) : null,
            }
          : null,
      };

      const evalResult = evaluateCustomerDunning(evalInput, levels as DunningLevel[]);

      if (evalResult.totalOverdue > 0) {
        activeCasesCount++;
        const caseId = currentCase?.id || `case_${randomUUID()}`;

        // Upsert case
        await (this.db as any)
          .insertInto('ar_collection_cases')
          .values({
            id: caseId,
            tenant_id: tenantId,
            customer_id: cId,
            current_level_id: evalResult.activeDunningLevel?.id || null,
            total_overdue: evalResult.totalOverdue,
            oldest_overdue_days: evalResult.oldestOverdueDays,
            status: evalResult.recommendedStatus,
            updated_at: new Date(),
          })
          .onConflict((oc: any) =>
            oc.columns(['tenant_id', 'customer_id']).doUpdateSet({
              current_level_id: evalResult.activeDunningLevel?.id || null,
              total_overdue: evalResult.totalOverdue,
              oldest_overdue_days: evalResult.oldestOverdueDays,
              status: evalResult.recommendedStatus,
              updated_at: new Date(),
            }),
          )
          .execute();

        // Enforce automated credit block if qualified and not already blocked
        if (evalResult.shouldBlockCredit && !cust.is_credit_blocked) {
          creditBlockedCount++;
          await (this.db as any)
            .updateTable('customers')
            .set({
              is_credit_blocked: true,
              credit_block_reason: evalResult.creditBlockReason,
              credit_blocked_at: new Date(),
            })
            .where('id', '=', cId)
            .where('tenant_id', '=', tenantId)
            .execute();

          // Log the automated block action
          await (this.db as any)
            .insertInto('ar_collection_logs')
            .values({
              id: `log_${randomUUID()}`,
              tenant_id: tenantId,
              case_id: caseId,
              interaction_type: 'level_escalation',
              result_status: 'credit_blocked',
              details: evalResult.creditBlockReason,
              created_by: null,
              created_at: new Date(),
            })
            .execute();
        }
      } else if (currentCase && currentCase.status !== 'settled') {
        // Customer paid their balance -> Settle case
        settledCasesCount++;
        await (this.db as any)
          .updateTable('ar_collection_cases')
          .set({
            status: 'settled',
            total_overdue: 0,
            oldest_overdue_days: 0,
            updated_at: new Date(),
          })
          .where('id', '=', currentCase.id)
          .where('tenant_id', '=', tenantId)
          .execute();

        // If customer was credit-blocked, automatically unblock them
        if (cust.is_credit_blocked) {
          await (this.db as any)
            .updateTable('customers')
            .set({
              is_credit_blocked: false,
              credit_block_reason: null,
              credit_blocked_at: null,
            })
            .where('id', '=', cId)
            .where('tenant_id', '=', tenantId)
            .execute();

          await (this.db as any)
            .insertInto('ar_collection_logs')
            .values({
              id: `log_${randomUUID()}`,
              tenant_id: tenantId,
              case_id: currentCase.id,
              interaction_type: 'unblock_credit',
              result_status: 'settled',
              details: 'تم سداد كامل المديونية المتأخرة وإلغاء حظر البيع الآجل تلقائياً',
              created_by: null,
              created_at: new Date(),
            })
            .execute();
        }
      }
    }

    return {
      scannedCustomers: customers.length,
      activeCases: activeCasesCount,
      creditBlockedCount,
      settledCasesCount,
    };
  }

  /**
   * Logs a follow-up interaction (call, visit, whatsapp, note)
   */
  async logInteraction(
    auth: AuthContext,
    caseId: string,
    dto: CreateCollectionLogDto,
  ): Promise<any> {
    this.assertCollectionsAccess(auth);
    const scope = requireTenantScope(auth);
    const tenantId = scope.tenantId;

    const caseRecord = await (this.db as any)
      .selectFrom('ar_collection_cases')
      .selectAll()
      .where('id', '=', caseId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!caseRecord) {
      throw new NotFoundException('Collection case not found');
    }

    const logId = `log_${randomUUID()}`;
    await (this.db as any)
      .insertInto('ar_collection_logs')
      .values({
        id: logId,
        tenant_id: tenantId,
        case_id: caseId,
        interaction_type: dto.interactionType,
        result_status: dto.resultStatus,
        details: dto.details || null,
        promised_date: dto.promisedDate || null,
        promised_amount: dto.promisedAmount || null,
        created_by: auth.userId || null,
        created_at: new Date(),
      })
      .execute();

    // Update case record with contact date and potential promise / followup dates
    const updates: Record<string, any> = {
      last_contact_date: new Date(),
      updated_at: new Date(),
    };

    if (dto.promisedDate) {
      updates.promised_payment_date = dto.promisedDate;
      updates.promised_amount = dto.promisedAmount || null;
      updates.status = 'promised_to_pay';
    }

    if (dto.nextFollowupDate) {
      updates.next_followup_date = dto.nextFollowupDate;
    }

    if (dto.resultStatus === 'escalated') {
      updates.status = 'escalated';
    } else if (dto.resultStatus === 'settled') {
      updates.status = 'settled';
    }

    await (this.db as any)
      .updateTable('ar_collection_cases')
      .set(updates)
      .where('id', '=', caseId)
      .where('tenant_id', '=', tenantId)
      .execute();

    return { success: true, logId };
  }

  /**
   * Records a concrete Promise to Pay from customer
   */
  async recordPromiseToPay(
    auth: AuthContext,
    caseId: string,
    dto: RecordPromiseToPayDto,
  ): Promise<any> {
    this.assertCollectionsAccess(auth);
    const scope = requireTenantScope(auth);
    const tenantId = scope.tenantId;

    const caseRecord = await (this.db as any)
      .selectFrom('ar_collection_cases')
      .selectAll()
      .where('id', '=', caseId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!caseRecord) {
      throw new NotFoundException('Collection case not found');
    }

    // 1. Update case status and promise date
    await (this.db as any)
      .updateTable('ar_collection_cases')
      .set({
        status: 'promised_to_pay',
        promised_payment_date: dto.promisedDate,
        promised_amount: dto.promisedAmount,
        last_contact_date: new Date(),
        updated_at: new Date(),
      })
      .where('id', '=', caseId)
      .where('tenant_id', '=', tenantId)
      .execute();

    // 2. Insert interaction log
    const logId = `log_${randomUUID()}`;
    await (this.db as any)
      .insertInto('ar_collection_logs')
      .values({
        id: logId,
        tenant_id: tenantId,
        case_id: caseId,
        interaction_type: 'promise_to_pay',
        result_status: 'promise_to_pay',
        details: dto.notes || `تعهد العميل بسداد مبلغ ${dto.promisedAmount} ج.م بتاريخ ${dto.promisedDate}`,
        promised_date: dto.promisedDate,
        promised_amount: dto.promisedAmount,
        created_by: auth.userId || null,
        created_at: new Date(),
      })
      .execute();

    return { success: true, logId };
  }

  /**
   * Manually blocks or unblocks credit sales for a customer under collection
   */
  async toggleCreditBlock(
    auth: AuthContext,
    caseId: string,
    dto: ToggleCreditBlockDto,
  ): Promise<any> {
    this.assertCollectionsAccess(auth);
    const scope = requireTenantScope(auth);
    const tenantId = scope.tenantId;

    const caseRecord = await (this.db as any)
      .selectFrom('ar_collection_cases')
      .selectAll()
      .where('id', '=', caseId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!caseRecord) {
      throw new NotFoundException('Collection case not found');
    }

    const cId = Number(caseRecord.customer_id);

    await (this.db as any)
      .updateTable('customers')
      .set({
        is_credit_blocked: dto.block,
        credit_block_reason: dto.block ? (dto.reason || 'إيقاف يدوي من مسؤول التحصيل') : null,
        credit_blocked_at: dto.block ? new Date() : null,
        credit_blocked_by: dto.block ? auth.userId : null,
      })
      .where('id', '=', cId)
      .where('tenant_id', '=', tenantId)
      .execute();

    // Log the manual block action
    const logId = `log_${randomUUID()}`;
    await (this.db as any)
      .insertInto('ar_collection_logs')
      .values({
        id: logId,
        tenant_id: tenantId,
        case_id: caseId,
        interaction_type: dto.block ? 'block_credit' : 'unblock_credit',
        result_status: dto.block ? 'credit_blocked' : 'credit_unblocked',
        details: dto.reason || (dto.block ? 'تم إيقاف البيع الآجل يدوياً' : 'تم رفع حظر البيع الآجل يدوياً'),
        created_by: auth.userId || null,
        created_at: new Date(),
      })
      .execute();

    return { success: true, isCreditBlocked: dto.block };
  }

  /**
   * Retrieves configured dunning levels
   */
  async getDunningLevels(auth: AuthContext): Promise<any[]> {
    this.assertCollectionsAccess(auth);
    const scope = requireTenantScope(auth);
    const tenantId = scope.tenantId;

    return (this.db as any)
      .selectFrom('ar_dunning_levels')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('level_order', 'asc')
      .execute();
  }

  /**
   * Updates an individual dunning level configuration
   */
  async updateDunningLevel(
    auth: AuthContext,
    levelId: string,
    dto: UpdateDunningLevelDto,
  ): Promise<any> {
    this.assertCollectionsAccess(auth);
    const scope = requireTenantScope(auth);
    const tenantId = scope.tenantId;

    const existing = await (this.db as any)
      .selectFrom('ar_dunning_levels')
      .selectAll()
      .where('id', '=', levelId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('Dunning level not found');
    }

    const updates: Record<string, any> = { updated_at: new Date() };
    if (dto.levelName !== undefined) updates.level_name = dto.levelName;
    if (dto.daysPastDue !== undefined) updates.days_past_due = dto.daysPastDue;
    if (dto.autoBlockSales !== undefined) updates.auto_block_sales = dto.autoBlockSales;
    if (dto.actionType !== undefined) updates.action_type = dto.actionType;
    if (dto.templateText !== undefined) updates.template_text = dto.templateText;

    await (this.db as any)
      .updateTable('ar_dunning_levels')
      .set(updates)
      .where('id', '=', levelId)
      .where('tenant_id', '=', tenantId)
      .execute();

    return { success: true };
  }
}
