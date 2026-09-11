import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { KYSELY_DB } from '../../database/database.constants';
import { Kysely, sql } from '../../database/kysely';
import { Database } from '../../database/database.types';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';
import {
  CreateProjectDto,
  UpdateProjectDto,
  CreateBoqItemDto,
  UpdateBoqItemDto,
  CreateChangeOrderDto,
  UpdateChangeOrderStatusDto,
  CreateIpcInvoiceDto,
  CreateSubcontractDto,
  CreateDailyLogDto,
  CreateRfiDto,
  AnswerRfiDto,
  CreateScheduleTaskDto,
  UpdateScheduleTaskDto,
  CreateMaterialRequisitionDto,
} from './dto/contracting.dto';
import { ContractingProjectSummary } from './contracting.types';

@Injectable()
export class ContractingService {
  private readonly logger = new Logger(ContractingService.name);

  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
  ) {}

  // ==========================================================================
  // 1. Projects Management
  // ==========================================================================

  async getProjects(auth: AuthContext, query?: { status?: string; search?: string }) {
    const { tenantId } = requireTenantScope(auth);
    let q = this.db
      .selectFrom('contracting_projects')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    if (query?.status && query.status !== 'all') {
      q = q.where('status', '=', query.status as any);
    }

    if (query?.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where((eb) =>
        eb.or([
          eb('name', 'ilike', s),
          eb('code', 'ilike', s),
          eb('client_name', 'ilike', s),
        ])
      );
    }

    const projects = await q.orderBy('created_at', 'desc').execute();

    // Map projects with summarized financial metrics
    return Promise.all(
      projects.map(async (p) => {
        return this.enrichProjectMetrics(tenantId, p);
      })
    );
  }

  async getProjectById(auth: AuthContext, id: string): Promise<ContractingProjectSummary> {
    const { tenantId } = requireTenantScope(auth);
    const p = await this.db
      .selectFrom('contracting_projects')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .executeTakeFirst();

    if (!p) {
      throw new NotFoundException(`مشروع المقاولات برقم ${id} غير موجود`);
    }

    return this.enrichProjectMetrics(tenantId, p);
  }

  async createProject(auth: AuthContext, dto: CreateProjectDto) {
    const { tenantId } = requireTenantScope(auth);

    // 1. Generate code if not supplied
    let projectCode = dto.code ? dto.code.trim().toUpperCase() : '';
    if (!projectCode) {
      const year = new Date().getFullYear();
      const countRes = await this.db
        .selectFrom('contracting_projects')
        .select(sql<number>`count(*)::int`.as('count'))
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();
      const count = (countRes?.count || 0) + 1;
      projectCode = `PRJ-${year}-${String(count).padStart(3, '0')}`;
    }

    // 2. Resolve or create Cost Center automatically (dimension = 'project')
    let costCenterId = dto.costCenterId ? Number(dto.costCenterId) : null;
    if (!costCenterId) {
      try {
        const ccCode = `CC-${projectCode}`;
        const ccName = `مشروع: ${dto.name.trim()}`;
        const [insertedCc] = await (this.db as any)
          .insertInto('cost_centers')
          .values({
            tenant_id: tenantId,
            code: ccCode,
            name: ccName,
            dimension: 'project',
            budget_amount: Number(dto.contractValue || 0),
            is_active: true,
          })
          .returning(['id'])
          .execute();
        if (insertedCc) {
          costCenterId = Number(insertedCc.id);
        }
      } catch (err) {
        this.logger.warn(`Could not auto-create cost center for project ${projectCode}: ${err}`);
      }
    }

    // 3. Resolve client name if clientId is provided
    let clientName = dto.clientName || '';
    if (dto.clientId && !clientName) {
      const client = await (this.db as any)
        .selectFrom('customers')
        .select('name')
        .where('tenant_id', '=', tenantId)
        .where('id', '=', dto.clientId)
        .executeTakeFirst();
      if (client) clientName = client.name;
    }

    const [created] = await this.db
      .insertInto('contracting_projects')
      .values({
        tenant_id: tenantId,
        code: projectCode,
        name: dto.name.trim(),
        client_id: dto.clientId ? Number(dto.clientId) : null,
        client_name: clientName,
        status: 'planning',
        contract_value: Number(dto.contractValue || 0),
        revised_contract_value: Number(dto.contractValue || 0),
        down_payment_amount: Number(dto.downPaymentAmount || 0),
        down_payment_recovered: 0,
        retention_percent: dto.retentionPercent !== undefined ? Number(dto.retentionPercent) : 5.0,
        retention_total_held: 0,
        retention_released: 0,
        start_date: dto.startDate || null,
        expected_end_date: dto.expectedEndDate || null,
        actual_end_date: null,
        site_location_id: dto.siteLocationId ? Number(dto.siteLocationId) : null,
        cost_center_id: costCenterId,
        project_manager: dto.projectManager || null,
        location_address: dto.locationAddress || null,
        notes: dto.notes || null,
      })
      .returningAll()
      .execute();

    return this.enrichProjectMetrics(tenantId, created);
  }

  async updateProject(auth: AuthContext, id: string, dto: UpdateProjectDto) {
    const { tenantId } = requireTenantScope(auth);
    const existing = await this.db
      .selectFrom('contracting_projects')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException(`مشروع المقاولات برقم ${id} غير موجود`);
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date(),
    };

    if (dto.name !== undefined) updatePayload.name = dto.name.trim();
    if (dto.status !== undefined) updatePayload.status = dto.status;
    if (dto.contractValue !== undefined) {
      updatePayload.contract_value = Number(dto.contractValue);
      // Recalculate revised value with approved change orders
      const coSum = await this.db
        .selectFrom('contracting_change_orders')
        .select(sql<number>`COALESCE(SUM(cost_impact), 0)`.as('sum'))
        .where('tenant_id', '=', tenantId)
        .where('project_id', '=', id as any)
        .where('status', '=', 'approved')
        .executeTakeFirst();
      updatePayload.revised_contract_value = Number(dto.contractValue) + Number(coSum?.sum || 0);
    }
    if (dto.downPaymentAmount !== undefined) updatePayload.down_payment_amount = Number(dto.downPaymentAmount);
    if (dto.retentionPercent !== undefined) updatePayload.retention_percent = Number(dto.retentionPercent);
    if (dto.startDate !== undefined) updatePayload.start_date = dto.startDate;
    if (dto.expectedEndDate !== undefined) updatePayload.expected_end_date = dto.expectedEndDate;
    if (dto.actualEndDate !== undefined) updatePayload.actual_end_date = dto.actualEndDate;
    if (dto.siteLocationId !== undefined) updatePayload.site_location_id = dto.siteLocationId;
    if (dto.costCenterId !== undefined) updatePayload.cost_center_id = dto.costCenterId;
    if (dto.projectManager !== undefined) updatePayload.project_manager = dto.projectManager;
    if (dto.locationAddress !== undefined) updatePayload.location_address = dto.locationAddress;
    if (dto.notes !== undefined) updatePayload.notes = dto.notes;

    const [updated] = await this.db
      .updateTable('contracting_projects')
      .set(updatePayload)
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .execute();

    return this.enrichProjectMetrics(tenantId, updated);
  }

  async deleteProject(auth: AuthContext, id: string) {
    const { tenantId } = requireTenantScope(auth);
    // Check if there are approved invoices
    const hasApprovedInvoices = await this.db
      .selectFrom('contracting_invoices')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', id as any)
      .where('status', 'in', ['approved', 'paid'])
      .executeTakeFirst();

    if (hasApprovedInvoices) {
      throw new BadRequestException('لا يمكن حذف هذا المشروع لوجود مستخلصات معتمدة مسجلة عليه.');
    }

    await this.db
      .deleteFrom('contracting_projects')
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .execute();

    return { success: true, message: 'تم حذف المشروع وجميع بنوده بنجاح' };
  }

  // ==========================================================================
  // 2. BOQ (Bill of Quantities / Schedule of Values - SOV)
  // ==========================================================================

  async getBoqItems(auth: AuthContext, projectId: string) {
    const { tenantId } = requireTenantScope(auth);
    return await this.db
      .selectFrom('contracting_boq_items')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .orderBy('item_code', 'asc')
      .execute();
  }

  async createBoqItem(auth: AuthContext, projectId: string, dto: CreateBoqItemDto) {
    const { tenantId } = requireTenantScope(auth);
    const contractQty = Number(dto.contractQty || 0);
    const unitPrice = Number(dto.unitPrice || 0);
    const totalPrice = contractQty * unitPrice;
    const estimatedUnitCost = Number(dto.estimatedUnitCost || 0);

    const [item] = await this.db
      .insertInto('contracting_boq_items')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        item_code: dto.itemCode.trim(),
        description: dto.description.trim(),
        category: dto.category || 'general',
        unit: dto.unit || 'm3',
        contract_qty: contractQty,
        revised_qty: contractQty,
        unit_price: unitPrice,
        total_price: totalPrice,
        estimated_unit_cost: estimatedUnitCost,
        executed_qty: 0,
        notes: dto.notes || null,
      })
      .returningAll()
      .execute();

    return item;
  }

  async batchCreateBoqItems(auth: AuthContext, projectId: string, items: CreateBoqItemDto[]) {
    const { tenantId } = requireTenantScope(auth);
    if (!items || items.length === 0) {
      return { success: true, count: 0, items: [] };
    }

    const project = await this.db
      .selectFrom('contracting_projects')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('id', '=', projectId as any)
      .executeTakeFirst();

    if (!project) {
      throw new NotFoundException(`المشروع برقم ${projectId} غير موجود`);
    }

    // Get existing item codes to avoid collisions
    const existing = await this.db
      .selectFrom('contracting_boq_items')
      .select('item_code')
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .execute();
    const existingCodes = new Set(existing.map((e) => e.item_code.toUpperCase()));

    const insertedItems: any[] = [];

    for (let i = 0; i < items.length; i++) {
      const dto = items[i];
      let itemCode = (dto.itemCode || `ITEM-${String(i + 1).padStart(3, '0')}`).trim().toUpperCase();
      if (existingCodes.has(itemCode)) {
        itemCode = `${itemCode}-${i + 1}`;
      }
      existingCodes.add(itemCode);

      const contractQty = Number(dto.contractQty || 0);
      const unitPrice = Number(dto.unitPrice || 0);
      const totalPrice = contractQty * unitPrice;
      const estimatedUnitCost = Number(dto.estimatedUnitCost || 0);

      const [item] = await this.db
        .insertInto('contracting_boq_items')
        .values({
          tenant_id: tenantId,
          project_id: projectId as any,
          item_code: itemCode,
          description: (dto.description || `بند عمل ${itemCode}`).trim(),
          category: dto.category || 'general',
          unit: dto.unit || 'm3',
          contract_qty: contractQty,
          revised_qty: contractQty,
          unit_price: unitPrice,
          total_price: totalPrice,
          estimated_unit_cost: estimatedUnitCost,
          executed_qty: 0,
          notes: dto.notes || null,
        })
        .returningAll()
        .execute();

      if (item) insertedItems.push(item);
    }

    return {
      success: true,
      count: insertedItems.length,
      items: insertedItems,
    };
  }

  async updateBoqItem(auth: AuthContext, id: string, dto: UpdateBoqItemDto) {
    const { tenantId } = requireTenantScope(auth);
    const existing = await this.db
      .selectFrom('contracting_boq_items')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException(`بند المقايسة برقم ${id} غير موجود`);
    }

    const contractQty = dto.contractQty !== undefined ? Number(dto.contractQty) : Number(existing.contract_qty);
    const unitPrice = dto.unitPrice !== undefined ? Number(dto.unitPrice) : Number(existing.unit_price);
    const totalPrice = contractQty * unitPrice;

    const [updated] = await this.db
      .updateTable('contracting_boq_items')
      .set({
        description: dto.description !== undefined ? dto.description.trim() : existing.description,
        category: dto.category !== undefined ? dto.category : existing.category,
        unit: dto.unit !== undefined ? dto.unit : existing.unit,
        contract_qty: contractQty,
        revised_qty: contractQty,
        unit_price: unitPrice,
        total_price: totalPrice,
        estimated_unit_cost: dto.estimatedUnitCost !== undefined ? Number(dto.estimatedUnitCost) : existing.estimated_unit_cost,
        notes: dto.notes !== undefined ? dto.notes : existing.notes,
        updated_at: new Date(),
      })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .execute();

    return updated;
  }

  async deleteBoqItem(auth: AuthContext, id: string) {
    const { tenantId } = requireTenantScope(auth);
    await this.db
      .deleteFrom('contracting_boq_items')
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .execute();

    return { success: true };
  }

  // ==========================================================================
  // 3. Change Orders (أوامر التغيير والملحقات)
  // ==========================================================================

  async getChangeOrders(auth: AuthContext, projectId: string) {
    const { tenantId } = requireTenantScope(auth);
    return await this.db
      .selectFrom('contracting_change_orders')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .orderBy('created_at', 'desc')
      .execute();
  }

  async createChangeOrder(auth: AuthContext, projectId: string, dto: CreateChangeOrderDto) {
    const { tenantId } = requireTenantScope(auth);
    const countRes = await this.db
      .selectFrom('contracting_change_orders')
      .select(sql<number>`count(*)::int`.as('count'))
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .executeTakeFirst();
    const count = (countRes?.count || 0) + 1;
    const coNum = `CO-${projectId.slice(-4).toUpperCase()}-${String(count).padStart(3, '0')}`;

    const [co] = await this.db
      .insertInto('contracting_change_orders')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        change_order_number: coNum,
        title: dto.title.trim(),
        reason: dto.reason || 'client_request',
        impact_type: dto.impactType || 'cost_and_time',
        cost_impact: Number(dto.costImpact || 0),
        time_impact_days: Number(dto.timeImpactDays || 0),
        status: 'draft',
        notes: dto.notes || null,
      })
      .returningAll()
      .execute();

    return co;
  }

  async updateChangeOrderStatus(auth: AuthContext, id: string, dto: UpdateChangeOrderStatusDto) {
    const { tenantId } = requireTenantScope(auth);
    const co = await this.db
      .selectFrom('contracting_change_orders')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .executeTakeFirst();

    if (!co) {
      throw new NotFoundException(`أمر التغيير برقم ${id} غير موجود`);
    }

    const [updated] = await this.db
      .updateTable('contracting_change_orders')
      .set({
        status: dto.status,
        approved_by: dto.status === 'approved' ? (auth.username || 'الإدارة') : null,
        approved_at: dto.status === 'approved' ? new Date() : null,
        notes: dto.notes ? `${co.notes || ''}\n${dto.notes}`.trim() : co.notes,
        updated_at: new Date(),
      })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .execute();

    // If approved, update project revised contract value & timeline
    if (dto.status === 'approved') {
      const project = await this.db
        .selectFrom('contracting_projects')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('id', '=', co.project_id)
        .executeTakeFirst();

      if (project) {
        const approvedSum = await this.db
          .selectFrom('contracting_change_orders')
          .select(sql<number>`COALESCE(SUM(cost_impact), 0)`.as('sum'))
          .where('tenant_id', '=', tenantId)
          .where('project_id', '=', co.project_id)
          .where('status', '=', 'approved')
          .executeTakeFirst();

        const newRevisedValue = Number(project.contract_value) + Number(approvedSum?.sum || 0);

        await this.db
          .updateTable('contracting_projects')
          .set({
            revised_contract_value: newRevisedValue,
            updated_at: new Date(),
          })
          .where('tenant_id', '=', tenantId)
          .where('id', '=', co.project_id)
          .execute();
      }
    }

    return updated;
  }

  // ==========================================================================
  // 4. Progress Billing / IPC Invoices (المستخلصات التراكمية AIA G702 / G703)
  // ==========================================================================

  async getInvoices(auth: AuthContext, projectId: string, type: 'client' | 'subcontractor' = 'client') {
    const { tenantId } = requireTenantScope(auth);
    return await this.db
      .selectFrom('contracting_invoices')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .where('ipc_type', '=', type)
      .orderBy('sequence_order', 'asc')
      .execute();
  }

  async getInvoiceById(auth: AuthContext, id: string) {
    const { tenantId } = requireTenantScope(auth);
    const invoice = await this.db
      .selectFrom('contracting_invoices')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .executeTakeFirst();

    if (!invoice) {
      throw new NotFoundException(`المستخلص برقم ${id} غير موجود`);
    }

    const items = await this.db
      .selectFrom('contracting_invoice_items')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('invoice_id', '=', id as any)
      .execute();

    const project = await this.db
      .selectFrom('contracting_projects')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', invoice.project_id)
      .executeTakeFirst();

    return {
      ...invoice,
      project,
      items,
    };
  }

  async createInvoice(auth: AuthContext, projectId: string, dto: CreateIpcInvoiceDto) {
    const { tenantId } = requireTenantScope(auth);

    const project = await this.db
      .selectFrom('contracting_projects')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', projectId as any)
      .executeTakeFirst();

    if (!project) {
      throw new NotFoundException(`المشروع برقم ${projectId} غير موجود`);
    }

    // Determine sequence order & IPC number
    const ipcType = dto.ipcType || 'client';
    const countRes = await this.db
      .selectFrom('contracting_invoices')
      .select(sql<number>`count(*)::int`.as('count'))
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .where('ipc_type', '=', ipcType)
      .executeTakeFirst();

    const seq = dto.sequenceOrder || (countRes?.count || 0) + 1;
    const prefix = ipcType === 'client' ? 'IPC' : 'SUB-IPC';
    const ipcNumber = `${prefix}-${project.code}-${String(seq).padStart(2, '0')}`;

    // Calculate totals across items
    let currentTotal = 0;
    let storedMaterialsTotal = 0;
    let previousTotal = 0;

    const processedItems = dto.items.map((item) => {
      const prevQty = Number(item.previousQty || 0);
      const currQty = Number(item.currentQty || 0);
      const storedQty = Number(item.storedMaterialsQty || 0);
      const cumQty = prevQty + currQty;
      const unitPrice = Number(item.unitPrice || 0);

      const currAmount = currQty * unitPrice;
      const prevAmount = prevQty * unitPrice;
      const storedAmount = storedQty * unitPrice;

      currentTotal += currAmount;
      storedMaterialsTotal += storedAmount;
      previousTotal += prevAmount;

      return {
        boq_item_id: item.boqItemId ? (item.boqItemId as any) : null,
        description: item.description.trim(),
        unit: item.unit || 'm3',
        unit_price: unitPrice,
        previous_qty: prevQty,
        current_qty: currQty,
        stored_materials_qty: storedQty,
        cumulative_qty: cumQty,
        completion_percent: 0,
        current_total: currAmount,
        cumulative_total: prevAmount + currAmount + storedAmount,
        notes: item.notes || null,
      };
    });

    const cumulativeAmount = previousTotal + currentTotal + storedMaterialsTotal;

    // Deductions
    const advRecoveryPercent = dto.advanceRecoveryPercent !== undefined
      ? Number(dto.advanceRecoveryPercent)
      : (Number(project.down_payment_amount) > 0 ? 10.0 : 0.0);

    const retentionPercent = dto.retentionPercent !== undefined
      ? Number(dto.retentionPercent)
      : Number(project.retention_percent || 5.0);

    const workThisPeriod = currentTotal + storedMaterialsTotal;
    const advanceRecoveryAmount = (workThisPeriod * advRecoveryPercent) / 100;
    const retentionHeldAmount = (workThisPeriod * retentionPercent) / 100;
    const otherDeductions = Number(dto.otherDeductions || 0);

    const netPayable = Math.max(0, workThisPeriod - advanceRecoveryAmount - retentionHeldAmount - otherDeductions);

    // Insert Invoice Header
    const [invoice] = await this.db
      .insertInto('contracting_invoices')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        ipc_number: ipcNumber,
        ipc_type: ipcType,
        subcontractor_id: dto.subcontractorId ? Number(dto.subcontractorId) : null,
        subcontractor_name: dto.subcontractorName || '',
        sequence_order: seq,
        period_start: dto.periodStart || null,
        period_end: dto.periodEnd || null,
        previous_amount: previousTotal,
        current_amount: currentTotal,
        stored_materials_amount: storedMaterialsTotal,
        cumulative_amount: cumulativeAmount,
        advance_recovery_amount: advanceRecoveryAmount,
        retention_held_amount: retentionHeldAmount,
        other_deductions: otherDeductions,
        net_payable: netPayable,
        status: 'draft',
        notes: dto.notes || null,
      })
      .returningAll()
      .execute();

    // Insert Invoice Line Items
    if (processedItems.length > 0) {
      await this.db
        .insertInto('contracting_invoice_items')
        .values(
          processedItems.map((pi) => ({
            ...pi,
            tenant_id: tenantId,
            invoice_id: invoice.id,
          }))
        )
        .execute();
    }

    return this.getInvoiceById(auth, invoice.id);
  }

  async approveInvoice(auth: AuthContext, id: string) {
    const { tenantId } = requireTenantScope(auth);
    const invoice = await this.db
      .selectFrom('contracting_invoices')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .executeTakeFirst();

    if (!invoice) {
      throw new NotFoundException(`المستخلص برقم ${id} غير موجود`);
    }

    if (invoice.status === 'approved' || invoice.status === 'paid') {
      return this.getInvoiceById(auth, id);
    }

    // 1. Mark as approved
    const [approved] = await this.db
      .updateTable('contracting_invoices')
      .set({
        status: 'approved',
        approved_by: auth.username || 'المعتمد',
        approved_at: new Date(),
        updated_at: new Date(),
      })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .execute();

    // 2. Update BOQ items executed_qty
    const items = await this.db
      .selectFrom('contracting_invoice_items')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('invoice_id', '=', id as any)
      .execute();

    for (const item of items) {
      if (item.boq_item_id) {
        await this.db
          .updateTable('contracting_boq_items')
          .set({
            executed_qty: item.cumulative_qty,
            updated_at: new Date(),
          })
          .where('tenant_id', '=', tenantId)
          .where('id', '=', item.boq_item_id as any)
          .execute();
      }
    }

    // 3. Update Project cumulative retentions and recovered down payments
    const project = await this.db
      .selectFrom('contracting_projects')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', invoice.project_id)
      .executeTakeFirst();

    if (project && invoice.ipc_type === 'client') {
      const totalRetention = Number(project.retention_total_held) + Number(invoice.retention_held_amount);
      const totalRecovered = Number(project.down_payment_recovered) + Number(invoice.advance_recovery_amount);

      await this.db
        .updateTable('contracting_projects')
        .set({
          retention_total_held: totalRetention,
          down_payment_recovered: totalRecovered,
          status: project.status === 'planning' ? 'active' : project.status,
          updated_at: new Date(),
        })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', invoice.project_id)
        .execute();
    }

    return this.getInvoiceById(auth, id);
  }

  async postInvoiceJournalEntry(auth: AuthContext, invoiceId: string) {
    const { tenantId, accountId } = requireTenantScope(auth);
    const invoice = await this.db
      .selectFrom('contracting_invoices')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', invoiceId as any)
      .executeTakeFirst();

    if (!invoice) {
      throw new NotFoundException(`المستخلص برقم ${invoiceId} غير موجود`);
    }

    if (invoice.journal_entry_id) {
      const existingJe = await (this.db as any)
        .selectFrom('journal_entries')
        .select(['id', 'entry_no'])
        .where('tenant_id', '=', tenantId)
        .where('id', '=', invoice.journal_entry_id)
        .executeTakeFirst();
      if (existingJe) {
        return {
          success: true,
          journalEntryId: Number(existingJe.id),
          entryNo: existingJe.entry_no,
          message: 'تم ترحيل هذا المستخلص مسبقاً',
        };
      }
    }

    const project = await this.db
      .selectFrom('contracting_projects')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', invoice.project_id)
      .executeTakeFirst();

    if (!project) {
      throw new NotFoundException('المشروع التابع له المستخلص غير موجود');
    }

    // Amounts
    const currentWorkAndStored = Number(invoice.current_amount || 0) + Number(invoice.stored_materials_amount || 0);
    const advanceRecovery = Number(invoice.advance_recovery_amount || 0);
    const retentionHeld = Number(invoice.retention_held_amount || 0);
    const otherDeductions = Number(invoice.other_deductions || 0);
    const netPayable = Number(invoice.net_payable || 0);

    if (currentWorkAndStored <= 0 && netPayable <= 0) {
      throw new BadRequestException('لا يمكن إنشاء قيد محاسبي لمستخلص بقيمة صفرية');
    }

    // Resolve accounts
    // 1. Accounts Receivable (Clients)
    let arAccount = await (this.db as any)
      .selectFrom('accounting_accounts')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('code', '=', '1130')
      .where('is_active', '=', true)
      .executeTakeFirst();
    if (!arAccount) {
      arAccount = await (this.db as any)
        .selectFrom('accounting_accounts')
        .select('id')
        .where('tenant_id', '=', tenantId)
        .where('account_type', '=', 'asset')
        .where('is_receivable', '=', true)
        .where('is_active', '=', true)
        .executeTakeFirst();
    }

    // 2. Contracting Revenue
    let revAccount = await (this.db as any)
      .selectFrom('accounting_accounts')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('code', 'in', ['4200', '4100', '4000'])
      .where('is_active', '=', true)
      .orderBy('code', 'asc')
      .executeTakeFirst();

    // 3. Advances from customers
    let advanceAccount = await (this.db as any)
      .selectFrom('accounting_accounts')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('code', '=', '2150')
      .where('is_active', '=', true)
      .executeTakeFirst();
    if (!advanceAccount) {
      advanceAccount = await (this.db as any)
        .selectFrom('accounting_accounts')
        .select('id')
        .where('tenant_id', '=', tenantId)
        .where('code', '=', '2100')
        .where('is_active', '=', true)
        .executeTakeFirst();
    }

    // 4. Retentions Receivable
    let retentionAccount = await (this.db as any)
      .selectFrom('accounting_accounts')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('code', 'in', ['1135', '1180', '1160'])
      .where('is_active', '=', true)
      .executeTakeFirst();
    if (!retentionAccount) {
      retentionAccount = arAccount; // fallback to main receivable
    }

    const arAccountId = arAccount?.id ? Number(arAccount.id) : null;
    const revAccountId = revAccount?.id ? Number(revAccount.id) : null;
    const advAccountId = advanceAccount?.id ? Number(advanceAccount.id) : arAccountId;
    const retAccountId = retentionAccount?.id ? Number(retentionAccount.id) : arAccountId;

    if (!arAccountId || !revAccountId) {
      throw new BadRequestException('تعذر تحديد الحسابات المحاسبية الأساسية (العملاء أو الإيرادات) في شجرة الحسابات');
    }

    // Sequence & entry number
    const seqRow = await (this.db as any)
      .selectFrom('journal_entries')
      .select(sql<number>`count(*)::int`.as('count'))
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    const sequence = Number(seqRow?.count || 0) + 1;
    const entryNo = `JE-IPC-${String(sequence).padStart(5, '0')}`;

    const inserted = await this.db.transaction().execute(async (trx: any) => {
      // 1. Create header
      const [entry] = await trx
        .insertInto('journal_entries')
        .values({
          entry_no: entryNo,
          tenant_id: tenantId,
          account_id: accountId,
          entry_date: invoice.period_end || new Date(),
          description: `إثبات استحقاق مستخلص أعمال رقم ${invoice.ipc_number} - مشروع ${project.name}`,
          source_type: 'contracting_ipc',
          source_id: Number(invoice.id),
          status: 'posted',
          created_by: auth.userId,
        })
        .returning(['id', 'entry_no'])
        .execute();

      const lines: any[] = [];

      // Line 1: Credit Contracting Revenue
      lines.push({
        journal_entry_id: Number(entry.id),
        tenant_id: tenantId,
        account_id: revAccountId,
        cost_center_id: project.cost_center_id || null,
        description: `إيرادات أعمال وتشوينات مستخلص ${invoice.ipc_number}`,
        debit: 0,
        credit: currentWorkAndStored,
        partner_type: 'customer',
        partner_id: project.client_id || null,
      });

      // Line 2: Debit Customer Advances (Recovery)
      if (advanceRecovery > 0) {
        lines.push({
          journal_entry_id: Number(entry.id),
          tenant_id: tenantId,
          account_id: advAccountId,
          cost_center_id: project.cost_center_id || null,
          description: `استرداد دفعة مقدمة مستخلص ${invoice.ipc_number}`,
          debit: advanceRecovery,
          credit: 0,
          partner_type: 'customer',
          partner_id: project.client_id || null,
        });
      }

      // Line 3: Debit Retentions Held (Asset)
      if (retentionHeld > 0) {
        lines.push({
          journal_entry_id: Number(entry.id),
          tenant_id: tenantId,
          account_id: retAccountId,
          cost_center_id: project.cost_center_id || null,
          description: `تأمين أعمال محتجز (حسن تنفيذ) مستخلص ${invoice.ipc_number}`,
          debit: retentionHeld,
          credit: 0,
          partner_type: 'customer',
          partner_id: project.client_id || null,
        });
      }

      // Line 4: Debit Other Deductions
      if (otherDeductions > 0) {
        lines.push({
          journal_entry_id: Number(entry.id),
          tenant_id: tenantId,
          account_id: arAccountId,
          cost_center_id: project.cost_center_id || null,
          description: `استقطاعات وجزاءات مستخلص ${invoice.ipc_number}`,
          debit: otherDeductions,
          credit: 0,
          partner_type: 'customer',
          partner_id: project.client_id || null,
        });
      }

      // Line 5: Debit Accounts Receivable (Net Payable)
      if (netPayable > 0) {
        lines.push({
          journal_entry_id: Number(entry.id),
          tenant_id: tenantId,
          account_id: arAccountId,
          cost_center_id: project.cost_center_id || null,
          description: `صافي المستحق على العميل مستخلص ${invoice.ipc_number}`,
          debit: netPayable,
          credit: 0,
          partner_type: 'customer',
          partner_id: project.client_id || null,
        });
      }

      if (lines.length > 0) {
        await trx.insertInto('journal_entry_lines').values(lines).execute();
      }

      // Update invoice with journal_entry_id and ensure status is approved
      await trx
        .updateTable('contracting_invoices')
        .set({
          journal_entry_id: Number(entry.id),
          status: 'approved',
          approved_by: invoice.approved_by || auth.username || 'المعتمد',
          approved_at: invoice.approved_at || new Date(),
          updated_at: new Date(),
        })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', invoice.id)
        .execute();

      return entry;
    });

    return {
      success: true,
      journalEntryId: Number(inserted.id),
      entryNo: inserted.entry_no,
      message: 'تم ترحيل القيد المحاسبي بنجاح',
    };
  }

  // ==========================================================================
  // 5. Subcontractors Management (Commitments)
  // ==========================================================================

  async getSubcontracts(auth: AuthContext, projectId: string) {
    const { tenantId } = requireTenantScope(auth);
    return await this.db
      .selectFrom('contracting_subcontracts')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .orderBy('created_at', 'desc')
      .execute();
  }

  async createSubcontract(auth: AuthContext, projectId: string, dto: CreateSubcontractDto) {
    const { tenantId } = requireTenantScope(auth);
    let contractNumber = dto.contractNumber ? dto.contractNumber.trim() : '';
    if (!contractNumber) {
      const countRes = await this.db
        .selectFrom('contracting_subcontracts')
        .select(sql<number>`count(*)::int`.as('count'))
        .where('tenant_id', '=', tenantId)
        .where('project_id', '=', projectId as any)
        .executeTakeFirst();
      const count = (countRes?.count || 0) + 1;
      contractNumber = `SC-${projectId.slice(-4).toUpperCase()}-${String(count).padStart(3, '0')}`;
    }

    const [sub] = await this.db
      .insertInto('contracting_subcontracts')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        subcontractor_id: dto.subcontractorId,
        contract_number: contractNumber,
        scope_of_work: dto.scopeOfWork.trim(),
        total_amount: Number(dto.totalAmount || 0),
        retention_percent: dto.retentionPercent !== undefined ? Number(dto.retentionPercent) : 5.0,
        start_date: dto.startDate || null,
        end_date: dto.endDate || null,
        status: 'active',
        notes: dto.notes || null,
      })
      .returningAll()
      .execute();

    return sub;
  }

  // ==========================================================================
  // 6. Site Daily Logs (اليومية الميدانية للموقع)
  // ==========================================================================

  async getDailyLogs(auth: AuthContext, projectId: string) {
    const { tenantId } = requireTenantScope(auth);
    return await this.db
      .selectFrom('contracting_site_daily_logs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .orderBy('log_date', 'desc')
      .execute();
  }

  async createDailyLog(auth: AuthContext, projectId: string, dto: CreateDailyLogDto) {
    const { tenantId } = requireTenantScope(auth);
    const [log] = await this.db
      .insertInto('contracting_site_daily_logs')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        log_date: dto.logDate,
        weather_conditions: dto.weatherConditions || null,
        labor_count: Number(dto.laborCount || 0),
        subcontractor_labor_count: Number(dto.subcontractorLaborCount || 0),
        equipment_on_site: dto.equipmentOnSite || null,
        work_performed: dto.workPerformed.trim(),
        delays_or_obstacles: dto.delaysOrObstacles || null,
        materials_received: dto.materialsReceived || null,
        logged_by: auth.username || 'مشرف الموقع',
      })
      .returningAll()
      .execute();

    return log;
  }

  // ==========================================================================
  // 7. RFIs (Technical Office Requests - استفسارات المهندس والاستشاري)
  // ==========================================================================

  async getRfiList(auth: AuthContext, projectId: string) {
    const { tenantId } = requireTenantScope(auth);
    return await this.db
      .selectFrom('contracting_rfis')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .orderBy('created_at', 'desc')
      .execute();
  }

  async createRfi(auth: AuthContext, projectId: string, dto: CreateRfiDto) {
    const { tenantId } = requireTenantScope(auth);
    const countRes = await this.db
      .selectFrom('contracting_rfis')
      .select(sql<number>`count(*)::int`.as('count'))
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .executeTakeFirst();
    const count = (countRes?.count || 0) + 1;
    const rfiNum = `RFI-${projectId.slice(-4).toUpperCase()}-${String(count).padStart(3, '0')}`;

    const [rfi] = await this.db
      .insertInto('contracting_rfis')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        rfi_number: rfiNum,
        subject: dto.subject.trim(),
        question: dto.question.trim(),
        assigned_to: dto.assignedTo || null,
        status: 'open',
        date_requested: new Date().toISOString().split('T')[0],
        date_required: dto.dateRequired || null,
        notes: dto.notes || null,
      })
      .returningAll()
      .execute();

    return rfi;
  }

  async answerRfi(auth: AuthContext, id: string, dto: AnswerRfiDto) {
    const { tenantId } = requireTenantScope(auth);
    const [updated] = await this.db
      .updateTable('contracting_rfis')
      .set({
        answer: dto.answer.trim(),
        answered_by: auth.username || 'الاستشاري',
        answered_at: new Date(),
        status: 'answered',
        notes: dto.notes || null,
        updated_at: new Date(),
      })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .execute();

    return updated;
  }

  // ==========================================================================
  // 9. Schedule Tasks & Gantt / CPM
  // ==========================================================================

  async getScheduleTasks(auth: AuthContext, projectId: string) {
    const { tenantId } = requireTenantScope(auth);
    return await this.db
      .selectFrom('contracting_schedule_tasks')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .orderBy('start_date', 'asc')
      .execute();
  }

  async createScheduleTask(auth: AuthContext, projectId: string, dto: CreateScheduleTaskDto) {
    const { tenantId } = requireTenantScope(auth);

    let taskCode = dto.taskCode?.trim().toUpperCase();
    if (!taskCode) {
      const countRes = await this.db
        .selectFrom('contracting_schedule_tasks')
        .select(sql<number>`count(*)::int`.as('count'))
        .where('tenant_id', '=', tenantId)
        .where('project_id', '=', projectId as any)
        .executeTakeFirst();
      const count = (countRes?.count || 0) + 1;
      taskCode = `TSK-${String(count).padStart(3, '0')}`;
    }

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const durationDays = dto.durationDays || Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const [task] = await this.db
      .insertInto('contracting_schedule_tasks')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        task_code: taskCode,
        task_name: dto.taskName.trim(),
        wbs_code: dto.wbsCode?.trim() || '1.0',
        start_date: dto.startDate,
        end_date: dto.endDate,
        duration_days: durationDays,
        progress_percent: dto.progressPercent !== undefined ? Number(dto.progressPercent) : 0,
        predecessor_id: dto.predecessorId ? (dto.predecessorId as any) : null,
        is_critical_path: Boolean(dto.isCriticalPath),
        status: (dto.status || 'not_started') as any,
        boq_item_id: dto.boqItemId ? (dto.boqItemId as any) : null,
        assigned_team: dto.assignedTeam || null,
        notes: dto.notes || null,
      })
      .returningAll()
      .execute();

    return task;
  }

  async updateScheduleTask(auth: AuthContext, id: string, dto: UpdateScheduleTaskDto) {
    const { tenantId } = requireTenantScope(auth);

    const updatePayload: any = { updated_at: new Date() };
    if (dto.taskName !== undefined) updatePayload.task_name = dto.taskName.trim();
    if (dto.startDate !== undefined) updatePayload.start_date = dto.startDate;
    if (dto.endDate !== undefined) updatePayload.end_date = dto.endDate;
    if (dto.durationDays !== undefined) updatePayload.duration_days = dto.durationDays;
    if (dto.progressPercent !== undefined) {
      updatePayload.progress_percent = Number(dto.progressPercent);
      if (Number(dto.progressPercent) >= 100) updatePayload.status = 'completed';
      else if (Number(dto.progressPercent) > 0) updatePayload.status = 'in_progress';
    }
    if (dto.predecessorId !== undefined) updatePayload.predecessor_id = dto.predecessorId || null;
    if (dto.isCriticalPath !== undefined) updatePayload.is_critical_path = Boolean(dto.isCriticalPath);
    if (dto.status !== undefined) updatePayload.status = dto.status;
    if (dto.boqItemId !== undefined) updatePayload.boq_item_id = dto.boqItemId || null;
    if (dto.assignedTeam !== undefined) updatePayload.assigned_team = dto.assignedTeam || null;
    if (dto.notes !== undefined) updatePayload.notes = dto.notes || null;

    const [updated] = await this.db
      .updateTable('contracting_schedule_tasks')
      .set(updatePayload)
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .execute();

    return updated;
  }

  async deleteScheduleTask(auth: AuthContext, id: string) {
    const { tenantId } = requireTenantScope(auth);
    await this.db
      .deleteFrom('contracting_schedule_tasks')
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .execute();

    return { success: true, message: 'تم حذف المهمة الجدولية بنجاح' };
  }

  // ==========================================================================
  // 10. Material Requisitions (أذون صرف الخامات المباشرة على بنود المقايسة)
  // ==========================================================================

  async getMaterialRequisitions(auth: AuthContext, projectId: string) {
    const { tenantId } = requireTenantScope(auth);
    return await this.db
      .selectFrom('contracting_material_requisitions')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .orderBy('issue_date', 'desc')
      .execute();
  }

  async createMaterialRequisition(auth: AuthContext, projectId: string, dto: CreateMaterialRequisitionDto) {
    const { tenantId } = requireTenantScope(auth);

    let reqNumber = dto.requisitionNumber?.trim().toUpperCase();
    if (!reqNumber) {
      const year = new Date().getFullYear();
      const countRes = await this.db
        .selectFrom('contracting_material_requisitions')
        .select(sql<number>`count(*)::int`.as('count'))
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();
      const count = (countRes?.count || 0) + 1;
      reqNumber = `MR-${year}-${String(count).padStart(4, '0')}`;
    }

    const qty = Number(dto.quantity || 0);
    const unitCost = Number(dto.unitCost || 0);
    const totalCost = qty * unitCost;

    const [req] = await this.db
      .insertInto('contracting_material_requisitions')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        requisition_number: reqNumber,
        boq_item_id: dto.boqItemId ? (dto.boqItemId as any) : null,
        warehouse_id: dto.warehouseId ? Number(dto.warehouseId) : null,
        product_id: dto.productId ? Number(dto.productId) : null,
        item_name: dto.itemName.trim(),
        unit: dto.unit || 'unit',
        quantity: qty,
        unit_cost: unitCost,
        total_cost: totalCost,
        issue_date: dto.issueDate || new Date().toISOString().split('T')[0],
        recipient_name: dto.recipientName || null,
        status: 'issued',
        notes: dto.notes || null,
      })
      .returningAll()
      .execute();

    return req;
  }

  async deleteMaterialRequisition(auth: AuthContext, id: string) {
    const { tenantId } = requireTenantScope(auth);
    await this.db
      .deleteFrom('contracting_material_requisitions')
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .execute();

    return { success: true, message: 'تم إلغاء إذن صرف المواد بنجاح' };
  }

  // ==========================================================================
  // Helper: Enrich Project Financial KPIs
  // ==========================================================================

  private async enrichProjectMetrics(tenantId: string, p: any): Promise<ContractingProjectSummary> {
    // 1. Total Billed Client
    const clientBilledRes = await this.db
      .selectFrom('contracting_invoices')
      .select(sql<number>`COALESCE(SUM(current_amount + stored_materials_amount), 0)`.as('sum'))
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', p.id)
      .where('ipc_type', '=', 'client')
      .where('status', 'in', ['approved', 'paid'])
      .executeTakeFirst();
    const totalBilledClient = Number(clientBilledRes?.sum || 0);

    // 2. Total Billed Subcontractors
    const subBilledRes = await this.db
      .selectFrom('contracting_invoices')
      .select(sql<number>`COALESCE(SUM(current_amount), 0)`.as('sum'))
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', p.id)
      .where('ipc_type', '=', 'subcontractor')
      .where('status', 'in', ['approved', 'paid'])
      .executeTakeFirst();
    const totalBilledSubcontractors = Number(subBilledRes?.sum || 0);

    // 3. Approved Change Orders
    const coRes = await this.db
      .selectFrom('contracting_change_orders')
      .select(sql<number>`COALESCE(SUM(cost_impact), 0)`.as('sum'))
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', p.id)
      .where('status', '=', 'approved')
      .executeTakeFirst();
    const changeOrdersTotalCost = Number(coRes?.sum || 0);

    // 4. Committed Subcontracts Total
    const subcontractsRes = await this.db
      .selectFrom('contracting_subcontracts')
      .select(sql<number>`COALESCE(SUM(total_amount), 0)`.as('sum'))
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', p.id)
      .executeTakeFirst();
    const totalCostCommitted = Number(subcontractsRes?.sum || 0);

    const revisedContractValue = Number(p.revised_contract_value || p.contract_value || 0);
    const completionRatePercent = revisedContractValue > 0
      ? Math.min(100, Math.round((totalBilledClient / revisedContractValue) * 100))
      : 0;

    const actualCostIncurred = totalBilledSubcontractors;
    const grossMarginForecast = revisedContractValue - Math.max(totalCostCommitted, actualCostIncurred);

    return {
      id: String(p.id),
      code: p.code,
      name: p.name,
      clientId: p.client_id ? Number(p.client_id) : null,
      clientName: p.client_name || '',
      status: p.status,
      contractValue: Number(p.contract_value || 0),
      revisedContractValue: revisedContractValue,
      downPaymentAmount: Number(p.down_payment_amount || 0),
      downPaymentRecovered: Number(p.down_payment_recovered || 0),
      retentionPercent: Number(p.retention_percent || 5.0),
      retentionTotalHeld: Number(p.retention_total_held || 0),
      retentionReleased: Number(p.retention_released || 0),
      startDate: p.start_date || null,
      expectedEndDate: p.expected_end_date || null,
      actualEndDate: p.actual_end_date || null,
      siteLocationId: p.site_location_id ? Number(p.site_location_id) : null,
      costCenterId: p.cost_center_id ? Number(p.cost_center_id) : null,
      projectManager: p.project_manager || null,
      locationAddress: p.location_address || null,
      notes: p.notes || null,
      createdAt: p.created_at?.toISOString?.() || String(p.created_at),
      updatedAt: p.updated_at?.toISOString?.() || String(p.updated_at),

      totalBilledClient,
      totalBilledSubcontractors,
      changeOrdersTotalCost,
      completionRatePercent,
      totalCostCommitted,
      actualCostIncurred,
      grossMarginForecast,
    };
  }
}
