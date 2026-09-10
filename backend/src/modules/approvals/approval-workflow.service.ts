import { Inject, Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { KYSELY_DB } from '../../database/database.constants';
import { Kysely, sql } from '../../database/kysely';
import { Database } from '../../database/database.types';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';
import { WhatsAppGatewayService } from '../settings/services/whatsapp-gateway.service';

export interface CreateApprovalRuleDto {
  module: 'purchase_orders' | 'purchases' | 'expenses' | 'treasury_transactions';
  minAmount: number;
  maxAmount?: number | null;
  tierLevel?: number;
  requiredRole?: string;
  approverUserId?: number | null;
  notes?: string | null;
}

export interface ApprovalRequestFilter {
  status?: string;
  module?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ApprovalWorkflowService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly whatsappService: WhatsAppGatewayService,
  ) {}

  async getRules(auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    return await this.db
      .selectFrom('approval_rules')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('module', 'asc')
      .orderBy('min_amount', 'asc')
      .orderBy('tier_level', 'asc')
      .execute();
  }

  async createRule(dto: CreateApprovalRuleDto, auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    if (!dto.module) throw new BadRequestException('الموديول مطلوب.');
    const minAmount = Number(dto.minAmount ?? 0);
    const maxAmount = dto.maxAmount !== undefined && dto.maxAmount !== null ? Number(dto.maxAmount) : null;
    const tierLevel = Math.max(1, Number(dto.tierLevel ?? 1));
    const requiredRole = dto.requiredRole || 'admin';

    const result = await this.db
      .insertInto('approval_rules')
      .values({
        tenant_id: tenantId,
        module: dto.module,
        min_amount: minAmount,
        max_amount: maxAmount,
        tier_level: tierLevel,
        required_role: requiredRole,
        approver_user_id: dto.approverUserId ?? null,
        notes: dto.notes ?? null,
        is_active: true,
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow();

    return { ok: true, rule: result };
  }

  async updateRule(id: string, dto: Partial<CreateApprovalRuleDto> & { isActive?: boolean }, auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    const updateData: any = { updated_at: sql`NOW()` };
    if (dto.minAmount !== undefined) updateData.min_amount = Number(dto.minAmount);
    if (dto.maxAmount !== undefined) updateData.max_amount = dto.maxAmount === null ? null : Number(dto.maxAmount);
    if (dto.tierLevel !== undefined) updateData.tier_level = Number(dto.tierLevel);
    if (dto.requiredRole !== undefined) updateData.required_role = dto.requiredRole;
    if (dto.approverUserId !== undefined) updateData.approver_user_id = dto.approverUserId;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const result = await this.db
      .updateTable('approval_rules')
      .set(updateData)
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .executeTakeFirst();

    if (!result) throw new NotFoundException('قاعدة الموافقة غير موجودة.');
    return { ok: true, rule: result };
  }

  async deleteRule(id: string, auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    const deleted = await this.db
      .deleteFrom('approval_rules')
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .executeTakeFirst();

    if (!deleted) throw new NotFoundException('قاعدة الموافقة غير موجودة.');
    return { ok: true };
  }

  /**
   * Evaluates if a transaction requires an approval workflow and creates a request if so.
   */
  async checkAndInitiateApproval(params: {
    module: string;
    recordId: number | string;
    recordRef: string;
    amount: number;
    currency?: string;
    notes?: string;
  }, auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    const amount = Number(params.amount || 0);

    // Find active matching rules for this module and amount range
    const rules = await this.db
      .selectFrom('approval_rules')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('module', '=', params.module)
      .where('is_active', '=', true)
      .where('min_amount', '<=', amount)
      .where((eb) =>
        eb.or([
          eb('max_amount', 'is', null),
          eb('max_amount', '>=', amount),
        ])
      )
      .orderBy('tier_level', 'asc')
      .execute();

    if (rules.length === 0) {
      return { requiresApproval: false };
    }

    const maxTier = Math.max(...rules.map((r) => Number(r.tier_level || 1)));

    const createdRequest = await this.db
      .insertInto('approval_requests')
      .values({
        tenant_id: tenantId,
        module: params.module,
        record_id: String(params.recordId),
        record_ref: params.recordRef || `${params.module}-${params.recordId}`,
        amount: amount,
        currency: params.currency || 'EGP',
        current_tier: 1,
        max_tier: maxTier,
        status: 'pending',
        requested_by: auth.userId || 0,
        requested_by_name: auth.username || 'مستخدم النظام',
        notes: params.notes || null,
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow();

    // Log request creation
    await this.db
      .insertInto('approval_request_logs')
      .values({
        tenant_id: tenantId,
        request_id: String(createdRequest.id),
        tier_level: 1,
        action: 'initiated',
        action_by: auth.userId || 0,
        action_by_name: auth.username || 'مستخدم النظام',
        action_role: auth.role || 'user',
        notes: `تم إنشاء طلب اعتماد للمستوى 1 من إجمالي ${maxTier} مستويات.`,
      } as any)
      .execute();

    // Fire and forget WhatsApp alert to manager if phone setting exists
    this.sendPendingAlertWhatsApp(tenantId, params.recordRef, amount, params.module).catch(() => {});

    return {
      requiresApproval: true,
      requestId: createdRequest.id,
      currentTier: 1,
      maxTier,
      status: 'pending',
    };
  }

  private async sendPendingAlertWhatsApp(tenantId: string, recordRef: string, amount: number, module: string) {
    try {
      const managerPhoneSetting = await this.db
        .selectFrom('settings')
        .select(['value'])
        .where('tenant_id', '=', tenantId)
        .where('key', 'in', ['daily_digest_phone', 'whatsapp_gateway_manager_phone', 'owner_phone'])
        .executeTakeFirst();

      if (!managerPhoneSetting?.value) return;

      const moduleLabels: Record<string, string> = {
        purchase_orders: 'أمر شراء',
        purchases: 'فاتورة مشتريات',
        expenses: 'مصروف نقدي',
        treasury_transactions: 'حركة خزينة',
      };

      const moduleName = moduleLabels[module] || module;
      const text = `🔔 *تنبيه طلب اعتماد معلق (Z-Systems Approval)*:\n` +
        `يوجد طلب اعتماد معلق لـ ${moduleName} رقم (${recordRef}) بقيمة ${amount.toLocaleString('ar-EG')} ج.م يتطلب مراجعتك واعتمادك في النظام.`;

      await this.whatsappService.sendRawMessage(tenantId, managerPhoneSetting.value, text);
    } catch {
      // Non-blocking alert
    }
  }

  async getRequests(filter: ApprovalRequestFilter, auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    const limit = Math.min(100, Math.max(1, Number(filter.page ? filter.limit || 25 : 50)));
    const offset = Math.max(0, (Number(filter.page || 1) - 1) * limit);

    let query = this.db
      .selectFrom('approval_requests')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    if (filter.status) {
      query = query.where('status', '=', filter.status);
    }
    if (filter.module) {
      query = query.where('module', '=', filter.module);
    }

    const items = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute();

    const countQuery = await this.db
      .selectFrom('approval_requests')
      .select(sql<number>`count(*)::int`.as('total'))
      .where('tenant_id', '=', tenantId)
      .$if(Boolean(filter.status), (qb) => qb.where('status', '=', filter.status!))
      .$if(Boolean(filter.module), (qb) => qb.where('module', '=', filter.module!))
      .executeTakeFirst();

    return {
      items,
      total: countQuery?.total || items.length,
      page: Number(filter.page || 1),
      limit,
    };
  }

  async getPendingCount(auth: AuthContext): Promise<{ count: number }> {
    const { tenantId } = requireTenantScope(auth);
    const res = await this.db
      .selectFrom('approval_requests')
      .select(sql<number>`count(*)::int`.as('count'))
      .where('tenant_id', '=', tenantId)
      .where('status', '=', 'pending')
      .executeTakeFirst();

    return { count: res?.count || 0 };
  }

  async getRequestDetails(id: string, auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    const request = await this.db
      .selectFrom('approval_requests')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .executeTakeFirst();

    if (!request) throw new NotFoundException('طلب الاعتماد غير موجود.');

    const logs = await this.db
      .selectFrom('approval_request_logs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('request_id', '=', id)
      .orderBy('created_at', 'asc')
      .execute();

    // Fetch corresponding matching rules for this request
    const rules = await this.db
      .selectFrom('approval_rules')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('module', '=', request.module)
      .where('is_active', '=', true)
      .orderBy('tier_level', 'asc')
      .execute();

    return { request, logs, rules };
  }

  async approveRequest(id: string, notes: string, auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    const request = await this.db
      .selectFrom('approval_requests')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .executeTakeFirst();

    if (!request) throw new NotFoundException('طلب الاعتماد غير موجود.');
    if (request.status !== 'pending') {
      throw new BadRequestException(`لا يمكن اعتماد هذا الطلب لأن حالته الحالية هي: ${request.status}`);
    }

    const currentTier = Number(request.current_tier || 1);
    const maxTier = Number(request.max_tier || 1);

    // Record log
    await this.db
      .insertInto('approval_request_logs')
      .values({
        tenant_id: tenantId,
        request_id: String(request.id),
        tier_level: currentTier,
        action: 'approved',
        action_by: auth.userId || 0,
        action_by_name: auth.username || 'المسؤول',
        action_role: auth.role || 'admin',
        notes: notes || `تمت الموافقة على المستوى ${currentTier}.`,
      } as any)
      .execute();

    let newStatus = 'pending';
    let nextTier = currentTier;

    if (currentTier >= maxTier) {
      // Completed all approval tiers!
      newStatus = 'approved';
      await this.db
        .updateTable('approval_requests')
        .set({
          status: 'approved',
          updated_at: sql`NOW()`,
        } as any)
        .where('id', '=', request.id as any)
        .where('tenant_id', '=', tenantId)
        .execute();

      // Execute document lifecycle transition hook
      await this.applyApprovalToDocument(tenantId, request.module, request.record_id);
    } else {
      // Advance to next tier
      nextTier = currentTier + 1;
      await this.db
        .updateTable('approval_requests')
        .set({
          current_tier: nextTier,
          updated_at: sql`NOW()`,
        } as any)
        .where('id', '=', request.id as any)
        .where('tenant_id', '=', tenantId)
        .execute();
    }

    return {
      ok: true,
      requestId: request.id,
      status: newStatus,
      currentTier: nextTier,
      maxTier,
      isFullyApproved: newStatus === 'approved',
    };
  }

  async rejectRequest(id: string, reason: string, auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    if (!reason?.trim()) {
      throw new BadRequestException('سبب الرفض إلزامي لتوثيقه في السجل.');
    }

    const request = await this.db
      .selectFrom('approval_requests')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .executeTakeFirst();

    if (!request) throw new NotFoundException('طلب الاعتماد غير موجود.');
    if (request.status !== 'pending') {
      throw new BadRequestException(`لا يمكن رفض هذا الطلب لأن حالته الحالية هي: ${request.status}`);
    }

    // Log rejection
    await this.db
      .insertInto('approval_request_logs')
      .values({
        tenant_id: tenantId,
        request_id: String(request.id),
        tier_level: Number(request.current_tier || 1),
        action: 'rejected',
        action_by: auth.userId || 0,
        action_by_name: auth.username || 'المسؤول',
        action_role: auth.role || 'admin',
        notes: reason,
      } as any)
      .execute();

    await this.db
      .updateTable('approval_requests')
      .set({
        status: 'rejected',
        updated_at: sql`NOW()`,
      } as any)
      .where('id', '=', request.id as any)
      .where('tenant_id', '=', tenantId)
      .execute();

    // Update document status to rejected
    await this.applyRejectionToDocument(tenantId, request.module, request.record_id);

    return { ok: true, status: 'rejected' };
  }

  private async applyApprovalToDocument(tenantId: string, module: string, recordId: string | number) {
    try {
      const idNum = Number(recordId);
      if (module === 'purchase_orders') {
        await this.db
          .updateTable('purchase_orders' as any)
          .set({ status: 'approved' } as any)
          .where('tenant_id', '=', tenantId)
          .where('id', '=', idNum as any)
          .execute();
      } else if (module === 'purchases') {
        await this.db
          .updateTable('purchases')
          .set({ lifecycle_status: 'approved' } as any)
          .where('tenant_id', '=', tenantId)
          .where('id', '=', idNum as any)
          .execute();
      }
    } catch {
      // Document update resilience
    }
  }

  private async applyRejectionToDocument(tenantId: string, module: string, recordId: string | number) {
    try {
      const idNum = Number(recordId);
      if (module === 'purchase_orders') {
        await this.db
          .updateTable('purchase_orders' as any)
          .set({ status: 'rejected' } as any)
          .where('tenant_id', '=', tenantId)
          .where('id', '=', idNum as any)
          .execute();
      } else if (module === 'purchases') {
        await this.db
          .updateTable('purchases')
          .set({ lifecycle_status: 'rejected' } as any)
          .where('tenant_id', '=', tenantId)
          .where('id', '=', idNum as any)
          .execute();
      }
    } catch {
      // Document update resilience
    }
  }
}
