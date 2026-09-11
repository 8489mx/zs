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
  CreateMasterPriceItemDto,
  UpdateMasterPriceItemDto,
  CreateEngineeringConstantDto,
  AutoPriceBoqItemDto,
  CreateCostSnapshotDto,
  CreateRetentionRecordDto,
  ReleaseRetentionDto,
  CreatePaymentHoldDto,
  ReleasePaymentHoldDto,
  CreateSupplierReturnDto,
  CreateLaborAttendanceDto,
  CreatePettyCashDto,
  SettlePettyCashDto,
  CreateGovernmentLicenseDto,
  CreateMasterBoqLibraryItemDto,
  UpdateMasterBoqLibraryItemDto,
  ImportMasterBoqToProjectDto,
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
    const rows = await this.db
      .selectFrom('contracting_boq_items')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .orderBy('item_code', 'asc')
      .execute();

    return rows.map((r: any) => ({
      id: String(r.id),
      projectId: String(r.project_id),
      itemCode: r.item_code,
      description: r.description,
      category: r.category,
      unit: r.unit,
      contractQty: Number(r.contract_qty ?? 0),
      revisedQty: Number(r.revised_qty ?? r.contract_qty ?? 0),
      unitPrice: Number(r.unit_price ?? 0),
      totalPrice: Number(r.total_price ?? (Number(r.contract_qty ?? 0) * Number(r.unit_price ?? 0))),
      estimatedUnitCost: Number(r.estimated_unit_cost ?? 0),
      executedQty: Number(r.executed_qty ?? 0),
      notes: r.notes,
      createdAt: r.created_at,
    }));
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
    if (!item) return null;
    return {
      id: String(item.id),
      projectId: String(item.project_id),
      itemCode: item.item_code,
      description: item.description,
      category: item.category,
      unit: item.unit,
      contractQty: Number(item.contract_qty ?? 0),
      revisedQty: Number(item.revised_qty ?? item.contract_qty ?? 0),
      unitPrice: Number(item.unit_price ?? 0),
      totalPrice: Number(item.total_price ?? 0),
      estimatedUnitCost: Number(item.estimated_unit_cost ?? 0),
      executedQty: Number(item.executed_qty ?? 0),
      notes: item.notes,
      createdAt: item.created_at,
    };
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

    if (!updated) return null;
    return {
      id: String(updated.id),
      projectId: String(updated.project_id),
      itemCode: updated.item_code,
      description: updated.description,
      category: updated.category,
      unit: updated.unit,
      contractQty: Number(updated.contract_qty ?? 0),
      revisedQty: Number(updated.revised_qty ?? updated.contract_qty ?? 0),
      unitPrice: Number(updated.unit_price ?? 0),
      totalPrice: Number(updated.total_price ?? 0),
      estimatedUnitCost: Number(updated.estimated_unit_cost ?? 0),
      executedQty: Number(updated.executed_qty ?? 0),
      notes: updated.notes,
      createdAt: updated.created_at,
    };
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

  // ==========================================================================
  // 12. Master Price List (أسعار السوق للخامات والمصنعيات والمعدات)
  // ==========================================================================

  async getMasterPriceList(auth: AuthContext, query?: { itemType?: string; category?: string; search?: string }) {
    const { tenantId } = requireTenantScope(auth);
    let q = (this.db as any)
      .selectFrom('contracting_master_price_list')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    if (query?.itemType && query.itemType !== 'all') {
      q = q.where('item_type', '=', query.itemType);
    }
    if (query?.category && query.category !== 'all') {
      q = q.where('category', '=', query.category);
    }
    if (query?.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where((eb: any) =>
        eb.or([
          eb('name', 'ilike', s),
          eb('code', 'ilike', s),
        ])
      );
    }

    const rows = await q.orderBy('created_at', 'desc').execute();
    return rows.map((r: any) => ({
      id: String(r.id),
      itemType: r.item_type,
      code: r.code,
      name: r.name,
      unit: r.unit,
      unitRate: Number(r.unit_rate || 0),
      category: r.category,
      notes: r.notes || null,
      createdAt: r.created_at?.toISOString?.() || String(r.created_at),
      updatedAt: r.updated_at?.toISOString?.() || String(r.updated_at),
    }));
  }

  async createMasterPriceItem(auth: AuthContext, dto: CreateMasterPriceItemDto) {
    const { tenantId } = requireTenantScope(auth);
    const [inserted] = await (this.db as any)
      .insertInto('contracting_master_price_list')
      .values({
        tenant_id: tenantId,
        item_type: dto.itemType,
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        unit: dto.unit || 'm3',
        unit_rate: Number(dto.unitRate || 0),
        category: dto.category || 'general',
        notes: dto.notes || null,
      })
      .returningAll()
      .execute();

    return {
      id: String(inserted.id),
      itemType: inserted.item_type,
      code: inserted.code,
      name: inserted.name,
      unit: inserted.unit,
      unitRate: Number(inserted.unit_rate || 0),
      category: inserted.category,
      notes: inserted.notes,
      createdAt: inserted.created_at?.toISOString?.() || String(inserted.created_at),
      updatedAt: inserted.updated_at?.toISOString?.() || String(inserted.updated_at),
    };
  }

  async updateMasterPriceItem(auth: AuthContext, id: string, dto: UpdateMasterPriceItemDto) {
    const { tenantId } = requireTenantScope(auth);
    const updates: Record<string, any> = { updated_at: new Date() };
    if (dto.name !== undefined) updates.name = dto.name.trim();
    if (dto.unit !== undefined) updates.unit = dto.unit;
    if (dto.unitRate !== undefined) updates.unit_rate = Number(dto.unitRate);
    if (dto.category !== undefined) updates.category = dto.category;
    if (dto.notes !== undefined) updates.notes = dto.notes;

    const [updated] = await (this.db as any)
      .updateTable('contracting_master_price_list')
      .set(updates)
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .execute();

    if (!updated) {
      throw new NotFoundException(`بند السعر برقم ${id} غير موجود`);
    }

    return {
      id: String(updated.id),
      itemType: updated.item_type,
      code: updated.code,
      name: updated.name,
      unit: updated.unit,
      unitRate: Number(updated.unit_rate || 0),
      category: updated.category,
      notes: updated.notes,
      createdAt: updated.created_at?.toISOString?.() || String(updated.created_at),
      updatedAt: updated.updated_at?.toISOString?.() || String(updated.updated_at),
    };
  }

  async deleteMasterPriceItem(auth: AuthContext, id: string) {
    const { tenantId } = requireTenantScope(auth);
    await (this.db as any)
      .deleteFrom('contracting_master_price_list')
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .execute();
    return { success: true };
  }

  // ==========================================================================
  // 13. Engineering Constants & Auto-Pricing Engine
  // ==========================================================================

  async getEngineeringConstants(auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    let rows = await (this.db as any)
      .selectFrom('contracting_engineering_constants')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('item_code', 'asc')
      .execute();

    if (rows.length === 0) {
      await this.seedDefaultEngineeringConstants(tenantId);
      rows = await (this.db as any)
        .selectFrom('contracting_engineering_constants')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .orderBy('item_code', 'asc')
        .execute();
    }

    // Fetch master prices to compute real-time direct costs
    const masterPrices = await this.getMasterPriceList(auth);
    const priceMap = new Map<string, number>(masterPrices.map((p: any) => [p.code, Number(p.unitRate || 0)]));

    return rows.map((r: any) => {
      const components = Array.isArray(r.components_json) ? r.components_json : [];
      let calculatedDirectCost = 0;
      const enrichedComponents = components.map((c: any) => {
        const rate = Number(priceMap.get(c.componentCode) ?? Number(c.unitRate || 0));
        const compCost = Number(c.qtyPerUnit || 0) * rate;
        calculatedDirectCost += compCost;
        return { ...c, unitRate: rate, totalCost: compCost };
      });

      const wastePct = Number(r.waste_percent || 0) / 100;
      const overheadPct = Number(r.overhead_percent || 0) / 100;
      const markupPct = Number(r.profit_markup_percent || 0) / 100;

      const totalCostWithWaste = calculatedDirectCost * (1 + wastePct);
      const totalCostWithOverhead = totalCostWithWaste * (1 + overheadPct);
      const calculatedSellingPrice = totalCostWithOverhead * (1 + markupPct);

      return {
        id: String(r.id),
        itemCode: r.item_code,
        itemName: r.item_name,
        unit: r.unit,
        wastePercent: Number(r.waste_percent || 0),
        overheadPercent: Number(r.overhead_percent || 0),
        profitMarkupPercent: Number(r.profit_markup_percent || 0),
        components: enrichedComponents,
        calculatedDirectCost: Math.round(calculatedDirectCost * 100) / 100,
        calculatedSellingPrice: Math.round(calculatedSellingPrice * 100) / 100,
        notes: r.notes || null,
        createdAt: r.created_at?.toISOString?.() || String(r.created_at),
        updatedAt: r.updated_at?.toISOString?.() || String(r.updated_at),
      };
    });
  }

  private async seedDefaultEngineeringConstants(tenantId: string) {
    const defaultConstants = [
      {
        item_code: 'DOOR-WOOD',
        item_name: 'أبواب خشبية تجارية وداخلية متكاملة (Wood Doors)',
        unit: 'item',
        waste_percent: 3.0,
        overhead_percent: 7.0,
        profit_markup_percent: 15.0,
        components_json: JSON.stringify([
          { componentCode: 'DOOR-LEAF', componentName: 'ضلفة باب وشاسيه وقشرة', unit: 'item', qtyPerUnit: 1, unitRate: 5500 },
          { componentCode: 'DOOR-ACC', componentName: 'إكسسوارات ومقابض وكالون', unit: 'set', qtyPerUnit: 1, unitRate: 1500 },
          { componentCode: 'DOOR-INSTALL', componentName: 'مصنعية تركيب وتثبيت ودهان', unit: 'item', qtyPerUnit: 1, unitRate: 1200 },
        ]),
        notes: 'معادلة هندسية قياسية لتسعير وتفكيك تكلفة الأبواب الخشبية الداخلي',
      },
      {
        item_code: 'CONC-C30',
        item_name: 'خرسانة مسلحة جهاد C30 للهيكل والأسقف',
        unit: 'm3',
        waste_percent: 5.0,
        overhead_percent: 7.0,
        profit_markup_percent: 15.0,
        components_json: JSON.stringify([
          { componentCode: 'CEM-425', componentName: 'أسمنت بورتلاندي 42.5', unit: 'ton', qtyPerUnit: 0.35, unitRate: 2400 },
          { componentCode: 'SAND-CRS', componentName: 'رمل حرش نظيف', unit: 'm3', qtyPerUnit: 0.4, unitRate: 180 },
          { componentCode: 'GRAV-MED', componentName: 'زلط / سن فينو', unit: 'm3', qtyPerUnit: 0.8, unitRate: 280 },
          { componentCode: 'STEEL-REBAR', componentName: 'حديد تسليح عالي الإجهاد', unit: 'ton', qtyPerUnit: 0.11, unitRate: 42000 },
          { componentCode: 'LABOR-CONC', componentName: 'عمالة ونجارة وصب خرسانة', unit: 'm3', qtyPerUnit: 1.0, unitRate: 550 },
        ]),
        notes: 'مكونات متر مكعب خرسانة مسلحة C30 شاملة الحديد والصب والشدة',
      },
      {
        item_code: 'BRK-20',
        item_name: 'مباني طوب أسمنتي/مفرغ 20 سم',
        unit: 'm2',
        waste_percent: 5.0,
        overhead_percent: 7.0,
        profit_markup_percent: 15.0,
        components_json: JSON.stringify([
          { componentCode: 'BRK-BLK', componentName: 'طوب أسمنتي 20×20×40', unit: 'pcs', qtyPerUnit: 12.5, unitRate: 18 },
          { componentCode: 'CEM-425', componentName: 'أسمنت بناء', unit: 'ton', qtyPerUnit: 0.015, unitRate: 2400 },
          { componentCode: 'SAND-CRS', componentName: 'رمل بناء', unit: 'm3', qtyPerUnit: 0.04, unitRate: 180 },
          { componentCode: 'LABOR-MASON', componentName: 'مصنعية بناء وطاقم عمالة', unit: 'm2', qtyPerUnit: 1.0, unitRate: 90 },
        ]),
        notes: 'مكونات مباني طوب أسمنتي سمك 20 سم بالمونة والعمالة',
      },
      {
        item_code: 'PLAS-INT',
        item_name: 'أعمال بياض ومحارة داخلية متكاملة',
        unit: 'm2',
        waste_percent: 4.0,
        overhead_percent: 7.0,
        profit_markup_percent: 15.0,
        components_json: JSON.stringify([
          { componentCode: 'CEM-425', componentName: 'أسمنت طرطشة وبياض', unit: 'ton', qtyPerUnit: 0.012, unitRate: 2400 },
          { componentCode: 'SAND-CRS', componentName: 'رمل ناعم للمحارة', unit: 'm3', qtyPerUnit: 0.035, unitRate: 180 },
          { componentCode: 'PLAS-CORNER', componentName: 'زوايا فلزيّة وأوتار', unit: 'm', qtyPerUnit: 0.5, unitRate: 25 },
          { componentCode: 'LABOR-PLAS', componentName: 'مصنعية مبيض محارة وطاقمه', unit: 'm2', qtyPerUnit: 1.0, unitRate: 85 },
        ]),
        notes: 'مكونات وتكاليف محارة وبياض الأسقف والحوائط الداخلية',
      },
      {
        item_code: 'TILE-CER',
        item_name: 'أعمال توريد وتركيب سيراميك أرضيات ورخام',
        unit: 'm2',
        waste_percent: 7.0,
        overhead_percent: 7.0,
        profit_markup_percent: 15.0,
        components_json: JSON.stringify([
          { componentCode: 'CER-TILE', componentName: 'بلاطات سيراميك فرز أول', unit: 'm2', qtyPerUnit: 1.05, unitRate: 320 },
          { componentCode: 'CEM-425', componentName: 'أسمنت مونة التركيب', unit: 'ton', qtyPerUnit: 0.01, unitRate: 2400 },
          { componentCode: 'SAND-CRS', componentName: 'رمل فرشة وتأسيس', unit: 'm3', qtyPerUnit: 0.05, unitRate: 180 },
          { componentCode: 'GROUT', componentName: 'روبة وسقية مفاصل الفواصل', unit: 'kg', qtyPerUnit: 0.5, unitRate: 45 },
          { componentCode: 'LABOR-TILE', componentName: 'مصنعية مبلط وطاقمه', unit: 'm2', qtyPerUnit: 1.0, unitRate: 110 },
        ]),
        notes: 'مكونات متر مسطح سيراميك أرضيات بالفرشة والمونة',
      },
      {
        item_code: 'PAINT-EMU',
        item_name: 'أعمال دهانات بلاستيك 3 أوجه وسيلر',
        unit: 'm2',
        waste_percent: 5.0,
        overhead_percent: 7.0,
        profit_markup_percent: 15.0,
        components_json: JSON.stringify([
          { componentCode: 'PAINT-SEAL', componentName: 'سيلر مائي مجهز', unit: 'L', qtyPerUnit: 0.15, unitRate: 45 },
          { componentCode: 'PAINT-PUTTY', componentName: 'معجون بلاستيك تجهيزي', unit: 'kg', qtyPerUnit: 1.2, unitRate: 35 },
          { componentCode: 'PAINT-TOP', componentName: 'دهان بلاستيك نصف لمعة', unit: 'L', qtyPerUnit: 0.25, unitRate: 120 },
          { componentCode: 'LABOR-PAINT', componentName: 'مصنعية نقاش وطاقمه', unit: 'm2', qtyPerUnit: 1.0, unitRate: 65 },
        ]),
        notes: 'دهانات بلاستيك وجهين سيلر ومعجون وتشطيب',
      },
      {
        item_code: 'PLUMB-FIRE',
        item_name: 'أعمال شبكات ومواسير مكافحة الحريق',
        unit: 'm',
        waste_percent: 5.0,
        overhead_percent: 7.0,
        profit_markup_percent: 15.0,
        components_json: JSON.stringify([
          { componentCode: 'STEEL-PIPE', componentName: 'مواسير صلب سيملس 2.5 بوصة', unit: 'm', qtyPerUnit: 1.05, unitRate: 850 },
          { componentCode: 'PIPE-FIT', componentName: 'وصلات وكوع ومحابس', unit: 'set', qtyPerUnit: 0.2, unitRate: 650 },
          { componentCode: 'LABOR-PLUMB', componentName: 'مصنعية فني لحام وتركيب حريق', unit: 'm', qtyPerUnit: 1.0, unitRate: 250 },
        ]),
        notes: 'شبكات حريق وتغذية صلب سيملس بالمحابس',
      },
    ];

    for (const c of defaultConstants) {
      await (this.db as any)
        .insertInto('contracting_engineering_constants')
        .values({
          tenant_id: tenantId,
          item_code: c.item_code,
          item_name: c.item_name,
          unit: c.unit,
          waste_percent: c.waste_percent,
          overhead_percent: c.overhead_percent,
          profit_markup_percent: c.profit_markup_percent,
          components_json: c.components_json,
          notes: c.notes,
        })
        .onConflict((oc: any) => oc.column('tenant_id').column('item_code').doNothing())
        .execute();
    }
  }

  async createEngineeringConstant(auth: AuthContext, dto: CreateEngineeringConstantDto) {
    const { tenantId } = requireTenantScope(auth);
    const [inserted] = await (this.db as any)
      .insertInto('contracting_engineering_constants')
      .values({
        tenant_id: tenantId,
        item_code: dto.itemCode.trim().toUpperCase(),
        item_name: dto.itemName.trim(),
        unit: dto.unit || 'm3',
        waste_percent: Number(dto.wastePercent ?? 5.0),
        overhead_percent: Number(dto.overheadPercent ?? 7.0),
        profit_markup_percent: Number(dto.profitMarkupPercent ?? 15.0),
        components_json: JSON.stringify(dto.components || []),
        notes: dto.notes || null,
      })
      .returningAll()
      .execute();

    return inserted;
  }

  async autoPriceBoqItem(auth: AuthContext, dto: AutoPriceBoqItemDto) {
    const { tenantId } = requireTenantScope(auth);
    const constant = await (this.db as any)
      .selectFrom('contracting_engineering_constants')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('item_code', '=', dto.constantCode.trim().toUpperCase())
      .executeTakeFirst();

    if (!constant) {
      throw new NotFoundException(`المعادلة الهندسية للبند ${dto.constantCode} غير موجودة`);
    }

    const masterPrices = await this.getMasterPriceList(auth);
    const priceMap = new Map<string, number>(masterPrices.map((p: any) => [p.code, Number(p.unitRate || 0)]));

    const components = Array.isArray(constant.components_json) ? constant.components_json : [];
    let unitDirectCost = 0;
    const breakdown = components.map((c: any) => {
      const rate = priceMap.get(c.componentCode) ?? Number(c.unitRate || 0);
      const total = Number(c.qtyPerUnit || 0) * rate;
      unitDirectCost += total;
      return {
        name: c.componentName,
        code: c.componentCode,
        qtyPerUnit: c.qtyPerUnit,
        unit: c.unit,
        unitRate: rate,
        componentCost: total,
      };
    });

    const wastePct = Number(dto.customWastePercent ?? constant.waste_percent ?? 5.0) / 100;
    const overheadPct = Number(dto.customOverheadPercent ?? constant.overhead_percent ?? 7.0) / 100;
    const markupPct = Number(dto.customProfitMarkupPercent ?? constant.profit_markup_percent ?? 15.0) / 100;

    const unitCostWithWaste = unitDirectCost * (1 + wastePct);
    const unitCostWithOverhead = unitCostWithWaste * (1 + overheadPct);
    const suggestedUnitPrice = Math.round(unitCostWithOverhead * (1 + markupPct) * 100) / 100;
    const totalEstimatedCost = Math.round(unitDirectCost * dto.quantity * 100) / 100;
    const totalPrice = Math.round(suggestedUnitPrice * dto.quantity * 100) / 100;
    const projectedProfit = totalPrice - totalEstimatedCost;

    return {
      constantCode: constant.item_code,
      constantName: constant.item_name,
      unit: constant.unit,
      quantity: dto.quantity,
      unitDirectCost: Math.round(unitDirectCost * 100) / 100,
      suggestedUnitPrice,
      totalEstimatedCost,
      totalPrice,
      projectedProfit,
      breakdown,
    };
  }

  // ==========================================================================
  // 14. Cost Baseline Snapshots (تجميد تكلفة وميزانية المشروع)
  // ==========================================================================

  async getCostSnapshots(auth: AuthContext, projectId: string) {
    const { tenantId } = requireTenantScope(auth);
    const rows = await (this.db as any)
      .selectFrom('contracting_cost_snapshots')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map((r: any) => ({
      id: String(r.id),
      projectId: String(r.project_id),
      snapshotName: r.snapshot_name,
      totalBudgetCost: Number(r.total_budget_cost || 0),
      totalContractValue: Number(r.total_contract_value || 0),
      isLocked: Boolean(r.is_locked),
      lockedAt: r.locked_at?.toISOString?.() || String(r.locked_at),
      lockedBy: r.locked_by || null,
      boqSnapshot: Array.isArray(r.boq_snapshot_json) ? r.boq_snapshot_json : [],
      createdAt: r.created_at?.toISOString?.() || String(r.created_at),
    }));
  }

  async createCostSnapshot(auth: AuthContext, projectId: string, dto: CreateCostSnapshotDto) {
    const { tenantId } = requireTenantScope(auth);
    const userEmail = (auth as any)?.user?.email || (auth as any)?.email || 'system_admin';
    // Fetch project and BOQ items
    const project = await this.getProjectById(auth, projectId);
    const boqItems = await this.getBoqItems(auth, projectId);

    const totalBudgetCost = (boqItems as any[]).reduce((acc: number, it: any) => acc + Number(it.estimated_unit_cost || it.estimatedUnitCost || 0) * Number(it.contract_qty || it.contractQty || 0), 0);
    const totalContractValue = (boqItems as any[]).reduce((acc: number, it: any) => acc + Number(it.total_price || it.totalPrice || 0), 0);

    const [inserted] = await (this.db as any)
      .insertInto('contracting_cost_snapshots')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        snapshot_name: dto.snapshotName.trim(),
        total_budget_cost: totalBudgetCost,
        total_contract_value: totalContractValue || project.contractValue,
        is_locked: true,
        locked_at: new Date(),
        locked_by: userEmail,
        boq_snapshot_json: JSON.stringify(boqItems),
      })
      .returningAll()
      .execute();

    return {
      id: String(inserted.id),
      projectId: String(inserted.project_id),
      snapshotName: inserted.snapshot_name,
      totalBudgetCost: Number(inserted.total_budget_cost || 0),
      totalContractValue: Number(inserted.total_contract_value || 0),
      isLocked: Boolean(inserted.is_locked),
      lockedAt: inserted.locked_at?.toISOString?.() || String(inserted.locked_at),
      lockedBy: inserted.locked_by,
      boqSnapshot: boqItems,
      createdAt: inserted.created_at?.toISOString?.() || String(inserted.created_at),
    };
  }

  // ==========================================================================
  // 15. Retention & Guarantees Records
  // ==========================================================================

  async getRetentionRecords(auth: AuthContext, query?: { projectId?: string; status?: string }) {
    const { tenantId } = requireTenantScope(auth);
    let q = (this.db as any)
      .selectFrom('contracting_retention_records')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    if (query?.projectId && query.projectId !== 'all') {
      q = q.where('project_id', '=', query.projectId as any);
    }
    if (query?.status && query.status !== 'all') {
      q = q.where('status', '=', query.status);
    }

    const rows = await q.orderBy('created_at', 'desc').execute();
    return rows.map((r: any) => ({
      id: String(r.id),
      projectId: String(r.project_id),
      subcontractId: r.subcontract_id ? String(r.subcontract_id) : null,
      partyType: r.party_type,
      partyId: r.party_id ? Number(r.party_id) : null,
      partyName: r.party_name,
      heldAmount: Number(r.held_amount || 0),
      releasedAmount: Number(r.released_amount || 0),
      retentionPercent: Number(r.retention_percent || 0),
      ipcInvoiceId: r.ipc_invoice_id ? String(r.ipc_invoice_id) : null,
      releaseDueDate: r.release_due_date || null,
      status: r.status,
      guaranteeCertificateRef: r.guarantee_certificate_ref || null,
      notes: r.notes || null,
      createdAt: r.created_at?.toISOString?.() || String(r.created_at),
      updatedAt: r.updated_at?.toISOString?.() || String(r.updated_at),
    }));
  }

  async createRetentionRecord(auth: AuthContext, projectId: string, dto: CreateRetentionRecordDto) {
    const { tenantId } = requireTenantScope(auth);
    const [inserted] = await (this.db as any)
      .insertInto('contracting_retention_records')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        subcontract_id: dto.subcontractId ? (dto.subcontractId as any) : null,
        party_type: dto.partyType,
        party_id: dto.partyId ? Number(dto.partyId) : null,
        party_name: dto.partyName.trim(),
        held_amount: Number(dto.heldAmount || 0),
        released_amount: 0,
        retention_percent: Number(dto.retentionPercent ?? 5.0),
        ipc_invoice_id: dto.ipcInvoiceId ? (dto.ipcInvoiceId as any) : null,
        release_due_date: dto.releaseDueDate || null,
        status: 'held',
        guarantee_certificate_ref: dto.guaranteeCertificateRef || null,
        notes: dto.notes || null,
      })
      .returningAll()
      .execute();

    return inserted;
  }

  async releaseRetentionRecord(auth: AuthContext, id: string, dto: ReleaseRetentionDto) {
    const { tenantId } = requireTenantScope(auth);
    const record = await (this.db as any)
      .selectFrom('contracting_retention_records')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .executeTakeFirst();

    if (!record) {
      throw new NotFoundException(`سجل ضمان الأعمال برقم ${id} غير موجود`);
    }

    const currentReleased = Number(record.released_amount || 0);
    const newReleased = currentReleased + Number(dto.releaseAmount);
    const totalHeld = Number(record.held_amount || 0);

    const newStatus = newReleased >= totalHeld ? 'fully_released' : 'partially_released';

    const [updated] = await (this.db as any)
      .updateTable('contracting_retention_records')
      .set({
        released_amount: newReleased,
        status: newStatus,
        notes: dto.notes ? `${record.notes || ''} [فك دفعة: ${dto.notes}]` : record.notes,
        updated_at: new Date(),
      })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .execute();

    return updated;
  }

  // ==========================================================================
  // 16. Payment Holds (حجز دفعات لعيوب جودة أو تأخير)
  // ==========================================================================

  async getPaymentHolds(auth: AuthContext, query?: { projectId?: string; isReleased?: boolean }) {
    const { tenantId } = requireTenantScope(auth);
    let q = (this.db as any)
      .selectFrom('contracting_payment_holds')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    if (query?.projectId && query.projectId !== 'all') {
      q = q.where('project_id', '=', query.projectId as any);
    }
    if (query?.isReleased !== undefined) {
      q = q.where('is_released', '=', query.isReleased);
    }

    const rows = await q.orderBy('created_at', 'desc').execute();
    return rows.map((r: any) => ({
      id: String(r.id),
      projectId: String(r.project_id),
      subcontractId: r.subcontract_id ? String(r.subcontract_id) : null,
      partyType: r.party_type,
      partyName: r.party_name,
      holdAmount: Number(r.hold_amount || 0),
      reason: r.reason,
      defectDescription: r.defect_description || null,
      isReleased: Boolean(r.is_released),
      releasedAt: r.released_at?.toISOString?.() || String(r.released_at || ''),
      releasedBy: r.released_by || null,
      releaseNotes: r.release_notes || null,
      createdAt: r.created_at?.toISOString?.() || String(r.created_at),
    }));
  }

  async createPaymentHold(auth: AuthContext, projectId: string, dto: CreatePaymentHoldDto) {
    const { tenantId } = requireTenantScope(auth);
    const [inserted] = await (this.db as any)
      .insertInto('contracting_payment_holds')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        subcontract_id: dto.subcontractId ? (dto.subcontractId as any) : null,
        party_type: dto.partyType,
        party_name: dto.partyName.trim(),
        hold_amount: Number(dto.holdAmount || 0),
        reason: dto.reason.trim(),
        defect_description: dto.defectDescription || null,
        is_released: false,
      })
      .returningAll()
      .execute();

    return inserted;
  }

  async releasePaymentHold(auth: AuthContext, id: string, dto: ReleasePaymentHoldDto) {
    const { tenantId } = requireTenantScope(auth);
    const userEmail = (auth as any)?.user?.email || (auth as any)?.email || 'finance_manager';
    const [updated] = await (this.db as any)
      .updateTable('contracting_payment_holds')
      .set({
        is_released: true,
        released_at: new Date(),
        released_by: userEmail,
        release_notes: dto.releaseNotes || null,
      })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .execute();

    if (!updated) {
      throw new NotFoundException(`سجل حجز الدفعة برقم ${id} غير موجود`);
    }

    return updated;
  }

  // ==========================================================================
  // 17. Supplier Returns & Credit Notes (أذون مرتجع الخامات)
  // ==========================================================================

  async getSupplierReturns(auth: AuthContext, query?: { projectId?: string }) {
    const { tenantId } = requireTenantScope(auth);
    let q = (this.db as any)
      .selectFrom('contracting_supplier_returns')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    if (query?.projectId && query.projectId !== 'all') {
      q = q.where('project_id', '=', query.projectId as any);
    }

    const rows = await q.orderBy('created_at', 'desc').execute();
    return rows.map((r: any) => ({
      id: String(r.id),
      projectId: String(r.project_id),
      returnNumber: r.return_number,
      supplierId: r.supplier_id ? Number(r.supplier_id) : null,
      supplierName: r.supplier_name,
      returnDate: r.return_date,
      totalAmount: Number(r.total_amount || 0),
      status: r.status,
      creditNoteNumber: r.credit_note_number || null,
      items: Array.isArray(r.items_json) ? r.items_json : [],
      notes: r.notes || null,
      createdAt: r.created_at?.toISOString?.() || String(r.created_at),
      updatedAt: r.updated_at?.toISOString?.() || String(r.updated_at),
    }));
  }

  async createSupplierReturn(auth: AuthContext, projectId: string, dto: CreateSupplierReturnDto) {
    const { tenantId } = requireTenantScope(auth);
    let returnNumber = dto.returnNumber;
    if (!returnNumber) {
      const year = new Date().getFullYear();
      const countRes = await (this.db as any)
        .selectFrom('contracting_supplier_returns')
        .select(sql<number>`count(*)::int`.as('count'))
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();
      const count = (countRes?.count || 0) + 1;
      returnNumber = `RTN-${year}-${String(count).padStart(3, '0')}`;
    }

    const totalAmount = dto.items.reduce((sum: number, it: any) => sum + Number(it.totalAmount || Number(it.quantity) * Number(it.unitCost)), 0);
    const creditNoteNumber = `CN-${returnNumber}`;

    const [inserted] = await (this.db as any)
      .insertInto('contracting_supplier_returns')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        return_number: returnNumber,
        supplier_id: dto.supplierId ? Number(dto.supplierId) : null,
        supplier_name: dto.supplierName.trim(),
        return_date: dto.returnDate || new Date().toISOString().split('T')[0],
        total_amount: totalAmount,
        status: 'posted',
        credit_note_number: creditNoteNumber,
        items_json: JSON.stringify(dto.items),
        notes: dto.notes || null,
      })
      .returningAll()
      .execute();

    return inserted;
  }

  // ==========================================================================
  // 18. Site Labor Attendance & Split Allocation
  // ==========================================================================

  async getLaborAttendance(auth: AuthContext, query?: { projectId?: string; workDate?: string }) {
    const { tenantId } = requireTenantScope(auth);
    let q = (this.db as any)
      .selectFrom('contracting_labor_attendance')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    if (query?.projectId && query.projectId !== 'all') {
      q = q.where('project_id', '=', query.projectId as any);
    }
    if (query?.workDate) {
      q = q.where('work_date', '=', query.workDate);
    }

    const rows = await q.orderBy('work_date', 'desc').orderBy('created_at', 'desc').execute();
    return rows.map((r: any) => ({
      id: String(r.id),
      projectId: String(r.project_id),
      workerName: r.worker_name,
      trade: r.trade,
      workDate: r.work_date,
      shiftType: r.shift_type,
      hoursWorked: Number(r.hours_worked || 0),
      splitProjectId: r.split_project_id ? String(r.split_project_id) : null,
      splitHours: Number(r.split_hours || 0),
      dailyRate: Number(r.daily_rate || 0),
      totalWage: Number(r.total_wage || 0),
      status: r.status,
      notes: r.notes || null,
      createdAt: r.created_at?.toISOString?.() || String(r.created_at),
      updatedAt: r.updated_at?.toISOString?.() || String(r.updated_at),
    }));
  }

  async createLaborAttendance(auth: AuthContext, projectId: string, dto: CreateLaborAttendanceDto) {
    const { tenantId } = requireTenantScope(auth);
    const hours = Number(dto.hoursWorked || 8);
    const dailyRate = Number(dto.dailyRate || 0);
    const totalWage = Math.round((dailyRate * (hours / 8)) * 100) / 100;

    const [inserted] = await (this.db as any)
      .insertInto('contracting_labor_attendance')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        worker_name: dto.workerName.trim(),
        trade: dto.trade,
        work_date: dto.workDate || new Date().toISOString().split('T')[0],
        shift_type: dto.shiftType || 'full_day',
        hours_worked: hours,
        split_project_id: dto.splitProjectId ? (dto.splitProjectId as any) : null,
        split_hours: Number(dto.splitHours || 0),
        daily_rate: dailyRate,
        total_wage: totalWage,
        status: 'recorded',
        notes: dto.notes || null,
      })
      .returningAll()
      .execute();

    return inserted;
  }

  // ==========================================================================
  // 19. Petty Cash & Site Custody (العهد النقدية مع منع التكرار قبل الإغلاق)
  // ==========================================================================

  async getPettyCashRecords(auth: AuthContext, query?: { projectId?: string; status?: string }) {
    const { tenantId } = requireTenantScope(auth);
    let q = (this.db as any)
      .selectFrom('contracting_petty_cash')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    if (query?.projectId && query.projectId !== 'all') {
      q = q.where('project_id', '=', query.projectId as any);
    }
    if (query?.status && query.status !== 'all') {
      q = q.where('status', '=', query.status);
    }

    const rows = await q.orderBy('created_at', 'desc').execute();
    return rows.map((r: any) => ({
      id: String(r.id),
      projectId: String(r.project_id),
      custodianName: r.custodian_name,
      custodianRole: r.custodian_role,
      disbursementNumber: r.disbursement_number,
      amountGiven: Number(r.amount_given || 0),
      amountSettled: Number(r.amount_settled || 0),
      remainingBalance: Number(r.remaining_balance || 0),
      issueDate: r.issue_date,
      settlementDueDate: r.settlement_due_date || null,
      status: r.status,
      receipts: Array.isArray(r.receipts_json) ? r.receipts_json : [],
      closureNotes: r.closure_notes || null,
      createdAt: r.created_at?.toISOString?.() || String(r.created_at),
      updatedAt: r.updated_at?.toISOString?.() || String(r.updated_at),
    }));
  }

  async createPettyCash(auth: AuthContext, projectId: string, dto: CreatePettyCashDto) {
    const { tenantId } = requireTenantScope(auth);
    // Strict Auditor Rule: Check if custodian already has an active, un-settled petty cash custody
    const activeCustody = await (this.db as any)
      .selectFrom('contracting_petty_cash')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('custodian_name', '=', dto.custodianName.trim())
      .where('status', '=', 'active')
      .executeTakeFirst();

    if (activeCustody) {
      throw new BadRequestException(
        `لا يمكن صرف عهدة نقدية جديدة للمهندس/المشرف (${dto.custodianName}) لوجود عهدة نشطة سابقة برقم (${activeCustody.disbursement_number}) بمبلغ متبقي (${activeCustody.remaining_balance} ر.س) لم يتم تسويتها وإغلاقها بعد.`
      );
    }

    let disbNum = dto.disbursementNumber;
    if (!disbNum) {
      const year = new Date().getFullYear();
      const countRes = await (this.db as any)
        .selectFrom('contracting_petty_cash')
        .select(sql<number>`count(*)::int`.as('count'))
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();
      const count = (countRes?.count || 0) + 1;
      disbNum = `CSH-${year}-${String(count).padStart(3, '0')}`;
    }

    const [inserted] = await (this.db as any)
      .insertInto('contracting_petty_cash')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        custodian_name: dto.custodianName.trim(),
        custodian_role: dto.custodianRole || 'site_engineer',
        disbursement_number: disbNum,
        amount_given: Number(dto.amountGiven),
        amount_settled: 0,
        remaining_balance: Number(dto.amountGiven),
        issue_date: dto.issueDate || new Date().toISOString().split('T')[0],
        settlement_due_date: dto.settlementDueDate || null,
        status: 'active',
        receipts_json: '[]',
      })
      .returningAll()
      .execute();

    return inserted;
  }

  async settlePettyCash(auth: AuthContext, id: string, dto: SettlePettyCashDto) {
    const { tenantId } = requireTenantScope(auth);
    const custody = await (this.db as any)
      .selectFrom('contracting_petty_cash')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .executeTakeFirst();

    if (!custody) {
      throw new NotFoundException(`سجل العهدة النقدية برقم ${id} غير موجود`);
    }

    const settledAmount = dto.receipts.reduce((acc, r) => acc + Number(r.amount || 0), 0);
    const remaining = Math.max(0, Number(custody.amount_given) - settledAmount);
    const status = remaining === 0 ? 'settled' : 'active';

    const [updated] = await (this.db as any)
      .updateTable('contracting_petty_cash')
      .set({
        amount_settled: settledAmount,
        remaining_balance: remaining,
        status,
        receipts_json: JSON.stringify(dto.receipts),
        closure_notes: dto.closureNotes || null,
        updated_at: new Date(),
      })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .execute();

    return updated;
  }

  // ==========================================================================
  // 20. Government Licenses & Site Compliance
  // ==========================================================================

  async getGovernmentLicenses(auth: AuthContext, query?: { projectId?: string; status?: string }) {
    const { tenantId } = requireTenantScope(auth);
    let q = (this.db as any)
      .selectFrom('contracting_government_licenses')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    if (query?.projectId && query.projectId !== 'all') {
      q = q.where('project_id', '=', query.projectId as any);
    }

    const rows = await q.orderBy('expiry_date', 'asc').execute();
    const today = new Date();

    return rows.map((r: any) => {
      const expDate = new Date(r.expiry_date);
      const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let computedStatus = r.status;
      if (r.status !== 'renewed') {
        if (diffDays <= 0) computedStatus = 'expired';
        else if (diffDays <= (r.alert_lead_days || 30)) computedStatus = 'expiring_soon';
        else computedStatus = 'active';
      }

      return {
        id: String(r.id),
        projectId: String(r.project_id),
        licenseType: r.license_type,
        licenseNumber: r.license_number,
        issuingAuthority: r.issuing_authority,
        issueDate: r.issue_date || null,
        expiryDate: r.expiry_date,
        feeAmount: Number(r.fee_amount || 0),
        status: computedStatus,
        documentUrl: r.document_url || null,
        alertLeadDays: Number(r.alert_lead_days || 30),
        daysUntilExpiry: diffDays,
        notes: r.notes || null,
        createdAt: r.created_at?.toISOString?.() || String(r.created_at),
        updatedAt: r.updated_at?.toISOString?.() || String(r.updated_at),
      };
    });
  }

  async createGovernmentLicense(auth: AuthContext, projectId: string, dto: CreateGovernmentLicenseDto) {
    const { tenantId } = requireTenantScope(auth);
    const [inserted] = await (this.db as any)
      .insertInto('contracting_government_licenses')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        license_type: dto.licenseType,
        license_number: dto.licenseNumber.trim(),
        issuing_authority: dto.issuingAuthority.trim(),
        issue_date: dto.issueDate || null,
        expiry_date: dto.expiryDate,
        fee_amount: Number(dto.feeAmount || 0),
        status: 'active',
        document_url: dto.documentUrl || null,
        alert_lead_days: Number(dto.alertLeadDays || 30),
        notes: dto.notes || null,
      })
      .returningAll()
      .execute();

    return inserted;
  }

  // ==========================================================================
  // 21. Executive Intelligence: Project Health Score & Cash Forecasting
  // ==========================================================================

  async getProjectHealthScore(auth: AuthContext, projectId: string) {
    const project = await this.getProjectById(auth, projectId);
    const licenses = await this.getGovernmentLicenses(auth, { projectId });
    const holds = await this.getPaymentHolds(auth, { projectId, isReleased: false });

    // 1. SPI: Schedule Performance Index (completionRate / expectedProgress)
    const completionRate = project.completionRatePercent;
    const spi = completionRate >= 90 ? 1.0 : completionRate >= 70 ? 0.85 : 0.65;

    // 2. CPI: Cost Performance Index
    const budget = project.revisedContractValue || 1;
    const costIncurred = project.actualCostIncurred;
    const cpi = costIncurred <= budget ? 1.0 : Math.max(0.5, budget / (costIncurred || 1));

    // 3. Compliance & Risk deductions
    let complianceScore = 100;
    const expiredLicenses = licenses.filter((l: any) => l.status === 'expired').length;
    const expiringLicenses = licenses.filter((l: any) => l.status === 'expiring_soon').length;
    complianceScore -= expiredLicenses * 25;
    complianceScore -= expiringLicenses * 10;
    complianceScore = Math.max(0, complianceScore);

    const holdsTotal = holds.reduce((acc: number, h: any) => acc + Number(h.holdAmount || 0), 0);
    const retentionRisk = holdsTotal > 0 ? 80 : 100;

    // Composite Score calculation (0 to 100)
    let finalScore = Math.round(
      spi * 30 +
      cpi * 30 +
      (complianceScore / 100) * 20 +
      (retentionRisk / 100) * 20
    );
    finalScore = Math.min(100, Math.max(0, finalScore));

    const healthStatus: 'green' | 'yellow' | 'red' =
      finalScore >= 80 ? 'green' : finalScore >= 60 ? 'yellow' : 'red';

    const recommendations: string[] = [];
    if (expiredLicenses > 0) {
      recommendations.push(`يوجد ${expiredLicenses} تراخيص حكومية منتهية للمشروع يجب تجديدها فوراً لتجنب الغرامات وتوقف الأعمال.`);
    }
    if (expiringLicenses > 0) {
      recommendations.push(`يوجد ${expiringLicenses} تصاريح تقترب من موعد الانتهاء خلال 30 يوماً.`);
    }
    if (holdsTotal > 0) {
      recommendations.push(`توجد دفعات محتجزة بقيمة ${holdsTotal.toLocaleString()} ر.س بسبب ملاحظات فنية أو عيوب استلام.`);
    }
    if (project.grossMarginForecast < 0) {
      recommendations.push(`توقعات هامش الربح سالبة، يلزم مراجعة تكاليف مقاولي الباطن والمواد.`);
    }
    if (recommendations.length === 0) {
      recommendations.push('المشروع يسير بمؤشرات إيجابية ممتازة ومتوافقة مع الميزانية والجدول الزمني.');
    }

    return {
      projectId: project.id,
      projectCode: project.code,
      projectName: project.name,
      score: finalScore,
      status: healthStatus,
      breakdown: {
        schedulePerformanceIndex: spi,
        costPerformanceIndex: cpi,
        budgetVariancePercent: Math.round(((project.revisedContractValue - project.actualCostIncurred) / (project.revisedContractValue || 1)) * 100),
        licensesComplianceScore: complianceScore,
        retentionRiskScore: retentionRisk,
      },
      recommendations,
    };
  }

  async getCashForecast(auth: AuthContext, query?: { projectId?: string }) {
    const { tenantId } = requireTenantScope(auth);
    // Inflows: Approved but un-paid client IPC invoices
    let clientIpcsQuery = (this.db as any)
      .selectFrom('contracting_invoices')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('ipc_type', '=', 'client')
      .where('status', 'in', ['approved', 'under_review']);

    if (query?.projectId && query.projectId !== 'all') {
      clientIpcsQuery = clientIpcsQuery.where('project_id', '=', query.projectId as any);
    }
    const pendingClientIpcs = await clientIpcsQuery.execute();
    const totalExpectedInflow = pendingClientIpcs.reduce((acc: number, r: any) => acc + Number(r.net_payable || 0), 0);

    // Outflows: Subcontractor IPCs + Active Petty Cash + Government Licenses Fees
    let subIpcsQuery = (this.db as any)
      .selectFrom('contracting_invoices')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('ipc_type', '=', 'subcontractor')
      .where('status', 'in', ['approved', 'under_review']);

    if (query?.projectId && query.projectId !== 'all') {
      subIpcsQuery = subIpcsQuery.where('project_id', '=', query.projectId as any);
    }
    const pendingSubIpcs = await subIpcsQuery.execute();
    const totalPendingSubIpcs = pendingSubIpcs.reduce((acc: number, r: any) => acc + Number(r.net_payable || 0), 0);

    const licenses = await this.getGovernmentLicenses(auth, query);
    const upcomingLicenseFees = licenses.reduce((acc: number, l: any) => acc + Number(l.feeAmount || 0), 0);

    return {
      projectId: query?.projectId || 'all',
      totalCurrentCashPosition: 0,
      buckets: [
        {
          period: '30_days',
          label: 'خلال 30 يوماً',
          expectedInflows: Math.round(totalExpectedInflow * 0.5),
          expectedOutflows: Math.round((totalPendingSubIpcs * 0.6) + (upcomingLicenseFees * 0.5)),
          netCashFlow: Math.round((totalExpectedInflow * 0.5) - ((totalPendingSubIpcs * 0.6) + (upcomingLicenseFees * 0.5))),
        },
        {
          period: '60_days',
          label: 'خلال 60 يوماً',
          expectedInflows: Math.round(totalExpectedInflow * 0.3),
          expectedOutflows: Math.round((totalPendingSubIpcs * 0.25) + (upcomingLicenseFees * 0.3)),
          netCashFlow: Math.round((totalExpectedInflow * 0.3) - ((totalPendingSubIpcs * 0.25) + (upcomingLicenseFees * 0.3))),
        },
        {
          period: '90_days',
          label: 'خلال 90 يوماً',
          expectedInflows: Math.round(totalExpectedInflow * 0.2),
          expectedOutflows: Math.round((totalPendingSubIpcs * 0.15) + (upcomingLicenseFees * 0.2)),
          netCashFlow: Math.round((totalExpectedInflow * 0.2) - ((totalPendingSubIpcs * 0.15) + (upcomingLicenseFees * 0.2))),
        },
      ],
      upcomingCommitmentsSummary: {
        pendingSubcontractorIpcs: totalPendingSubIpcs,
        pendingSupplierInvoices: 0,
        upcomingWages: 0,
        upcomingLicenseRenewals: upcomingLicenseFees,
      },
    };
  }

  // ==========================================================================
  // 22. Material Requirements Planning (MRP) & Bill of Materials Breakdown
  // ==========================================================================

  async getProjectMaterialRequirements(auth: AuthContext, projectId: string) {
    const { tenantId } = requireTenantScope(auth);
    const boqItems = await this.getBoqItems(auth, projectId);
    const constants = await this.getEngineeringConstants(auth);
    const constMap = new Map<string, any>(constants.map((c: any) => [c.itemCode, c]));

    // Aggregator for all project materials
    const materialTotals = new Map<string, {
      code: string;
      name: string;
      unit: string;
      type: string;
      requiredQuantity: number;
      dispatchedQuantity: number;
      unitRate: number;
      totalEstimatedCost: number;
    }>();

    for (const item of boqItems as any[]) {
      const qty = Number(item.revised_qty || item.contract_qty || item.revisedQty || item.contractQty || 0);
      const code = (item.item_code || item.itemCode || '').trim().toUpperCase();
      const constant = constMap.get(code);

      if (constant && Array.isArray(constant.components)) {
        for (const comp of constant.components) {
          const compCode = comp.componentCode || comp.code || comp.name;
          const wasteFactor = 1 + (Number(constant.wastePercent || 5) / 100);
          const reqQty = Number(comp.qtyPerUnit || 0) * qty * wasteFactor;
          const rate = Number(comp.unitRate || 0);

          const existing = materialTotals.get(compCode) || {
            code: compCode,
            name: comp.componentName || comp.name || compCode,
            unit: comp.unit || 'وحدة',
            type: comp.componentType || 'material',
            requiredQuantity: 0,
            dispatchedQuantity: 0,
            unitRate: rate,
            totalEstimatedCost: 0,
          };

          existing.requiredQuantity += reqQty;
          existing.totalEstimatedCost += reqQty * rate;
          materialTotals.set(compCode, existing);
        }
      } else {
        // Generic fallback item
        const fallbackCode = `MAT-${item.item_code || item.itemCode || 'ITEM'}`;
        const existing = materialTotals.get(fallbackCode) || {
          code: fallbackCode,
          name: `خامات بند: ${item.description}`,
          unit: item.unit,
          type: 'material',
          requiredQuantity: 0,
          dispatchedQuantity: 0,
          unitRate: Number(item.estimated_unit_cost || item.estimatedUnitCost || 0),
          totalEstimatedCost: 0,
        };
        existing.requiredQuantity += qty;
        existing.totalEstimatedCost += qty * Number(item.estimated_unit_cost || item.estimatedUnitCost || 0);
        materialTotals.set(fallbackCode, existing);
      }
    }

    // Get dispatched material requisitions for this project
    const requisitions = await this.getMaterialRequisitions(auth, projectId);
    for (const req of requisitions as any[]) {
      const itemName = (req.item_name || req.itemName || '').trim();
      for (const [key, val] of materialTotals.entries()) {
        if (val.name.includes(itemName) || itemName.includes(val.name) || key.includes(req.boq_item_id || req.boqItemId || '')) {
          val.dispatchedQuantity += Number(req.quantity || 0);
        }
      }
    }

    const items = Array.from(materialTotals.values()).map((m) => {
      const remaining = Math.max(0, m.requiredQuantity - m.dispatchedQuantity);
      const fulfillmentPercent = m.requiredQuantity > 0 ? Math.min(100, Math.round((m.dispatchedQuantity / m.requiredQuantity) * 100)) : 0;
      return {
        ...m,
        requiredQuantity: Math.round(m.requiredQuantity * 100) / 100,
        dispatchedQuantity: Math.round(m.dispatchedQuantity * 100) / 100,
        remainingQuantity: Math.round(remaining * 100) / 100,
        fulfillmentPercent,
        totalEstimatedCost: Math.round(m.totalEstimatedCost * 100) / 100,
      };
    });

    const totalMaterialsCost = items.reduce((acc, i) => acc + i.totalEstimatedCost, 0);

    return {
      projectId,
      totalDistinctMaterialsCount: items.length,
      totalMaterialsCost,
      items,
    };
  }

  // ==========================================================================
  // 23. Item-Level Profit & Loss (P&L) & Cost Variance Analyzer
  // ==========================================================================

  async getBoqProfitabilityAnalysis(auth: AuthContext, projectId: string) {
    const { tenantId } = requireTenantScope(auth);
    const boqItems = await this.getBoqItems(auth, projectId);

    // Fetch actual material costs incurred per BOQ item
    const materialReqs = await (this.db as any)
      .selectFrom('contracting_material_requisitions')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .execute();

    const actualMatCostByBoq = new Map<string, number>();
    for (const req of materialReqs) {
      if (req.boq_item_id) {
        const cost = Number(req.total_cost || Number(req.quantity) * Number(req.unit_cost));
        actualMatCostByBoq.set(String(req.boq_item_id), (actualMatCostByBoq.get(String(req.boq_item_id)) || 0) + cost);
      }
    }

    let totalProjectRevenue = 0;
    let totalProjectEstimatedCost = 0;
    let totalProjectActualCost = 0;
    let lossMakingItemsCount = 0;

    const analyzedItems = (boqItems as any[]).map((it) => {
      const contractQty = Number(it.contract_qty || it.contractQty || 0);
      const executedQty = Number(it.executed_qty || it.executedQty || 0);
      const unitPrice = Number(it.unit_price || it.unitPrice || 0);
      const estimatedUnitCost = Number(it.estimated_unit_cost || it.estimatedUnitCost || 0);

      const contractRevenue = Number(it.total_price || it.totalPrice || contractQty * unitPrice);
      const estimatedCost = contractQty * estimatedUnitCost;
      const actualCost = actualMatCostByBoq.get(String(it.id)) || (executedQty * estimatedUnitCost);
      const earnedRevenue = executedQty * unitPrice;

      const projectedProfit = contractRevenue - estimatedCost;
      const profitMarginPercent = contractRevenue > 0 ? Math.round((projectedProfit / contractRevenue) * 100) : 0;
      const realizedProfit = earnedRevenue - actualCost;

      totalProjectRevenue += contractRevenue;
      totalProjectEstimatedCost += estimatedCost;
      totalProjectActualCost += actualCost;

      let status: 'profitable' | 'at_risk' | 'loss' = 'profitable';
      if (profitMarginPercent < 0 || actualCost > estimatedCost) {
        status = 'loss';
        lossMakingItemsCount++;
      } else if (profitMarginPercent < 15) {
        status = 'at_risk';
      }

      return {
        id: it.id,
        itemCode: it.item_code || it.itemCode,
        description: it.description,
        category: it.category,
        unit: it.unit,
        contractQty,
        executedQty,
        unitPrice,
        estimatedUnitCost,
        contractRevenue,
        estimatedCost,
        actualCost,
        projectedProfit,
        profitMarginPercent,
        realizedProfit,
        status,
      };
    });

    const totalProjectProfit = totalProjectRevenue - totalProjectEstimatedCost;
    const overallMarginPercent = totalProjectRevenue > 0 ? Math.round((totalProjectProfit / totalProjectRevenue) * 100) : 0;

    return {
      projectId,
      totalProjectRevenue,
      totalProjectEstimatedCost,
      totalProjectActualCost,
      totalProjectProfit,
      overallMarginPercent,
      lossMakingItemsCount,
      itemsCount: analyzedItems.length,
      items: analyzedItems,
    };
  }

  // ==========================================================================
  // 24. Multi-Trade Master BOQ Library (بنك بنود المقاولات المرجعي وسحب التخصصات)
  // ==========================================================================

  async getMasterBoqTrades(auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    const rows = await sql<{
      trade_category: string;
      trade_name_ar: string;
      items_count: string;
    }>`
      SELECT 
        trade_category,
        trade_name_ar,
        COUNT(*)::text as items_count
      FROM contracting_master_boq_library
      WHERE (tenant_id = ${tenantId} OR tenant_id = '')
        AND is_active = true
      GROUP BY trade_category, trade_name_ar
      ORDER BY trade_category ASC
    `.execute(this.db);

    return rows.rows.map((r) => ({
      tradeCategory: r.trade_category,
      tradeNameAr: r.trade_name_ar,
      itemsCount: Number(r.items_count || 0),
    }));
  }

  async getMasterBoqLibrary(auth: AuthContext, query?: { tradeCategory?: string; search?: string }) {
    const { tenantId } = requireTenantScope(auth);
    let q = (this.db as any)
      .selectFrom('contracting_master_boq_library')
      .selectAll()
      .where((eb: any) => eb.or([eb('tenant_id', '=', tenantId), eb('tenant_id', '=', '')]))
      .where('is_active', '=', true);

    if (query?.tradeCategory && query.tradeCategory !== 'all') {
      q = q.where('trade_category', '=', query.tradeCategory);
    }

    if (query?.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where((eb: any) =>
        eb.or([
          eb('name', 'ilike', s),
          eb('item_code', 'ilike', s),
          eb('description', 'ilike', s),
          eb('trade_name_ar', 'ilike', s),
        ])
      );
    }

    const items = await q.orderBy('trade_category', 'asc').orderBy('item_code', 'asc').execute();
    return items.map((it: any) => ({
      id: String(it.id),
      tradeCategory: it.trade_category,
      tradeNameAr: it.trade_name_ar,
      itemCode: it.item_code,
      name: it.name,
      description: it.description,
      unit: it.unit,
      standardCost: Number(it.standard_cost || 0),
      standardPrice: Number(it.standard_price || 0),
      isActive: Boolean(it.is_active),
      isCustom: Boolean(it.tenant_id && it.tenant_id !== ''),
      createdAt: it.created_at,
    }));
  }

  async createMasterBoqItem(auth: AuthContext, dto: CreateMasterBoqLibraryItemDto) {
    const { tenantId } = requireTenantScope(auth);
    const existing = await (this.db as any)
      .selectFrom('contracting_master_boq_library')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('item_code', '=', dto.itemCode.trim())
      .executeTakeFirst();

    if (existing) {
      throw new BadRequestException(`كود البند المرجعي ${dto.itemCode} موجود مسبقاً`);
    }

    const inserted = await (this.db as any)
      .insertInto('contracting_master_boq_library')
      .values({
        tenant_id: tenantId,
        trade_category: dto.tradeCategory.trim(),
        trade_name_ar: dto.tradeNameAr.trim(),
        item_code: dto.itemCode.trim(),
        name: dto.name.trim(),
        description: dto.description?.trim() || '',
        unit: dto.unit.trim(),
        standard_cost: dto.standardCost,
        standard_price: dto.standardPrice,
        is_active: true,
      })
      .returningAll()
      .executeTakeFirst();

    return inserted;
  }

  async updateMasterBoqItem(auth: AuthContext, id: string, dto: UpdateMasterBoqLibraryItemDto) {
    const { tenantId } = requireTenantScope(auth);
    const updates: any = { updated_at: new Date() };
    if (dto.name !== undefined) updates.name = dto.name.trim();
    if (dto.tradeCategory !== undefined) updates.trade_category = dto.tradeCategory.trim();
    if (dto.tradeNameAr !== undefined) updates.trade_name_ar = dto.tradeNameAr.trim();
    if (dto.description !== undefined) updates.description = dto.description.trim();
    if (dto.unit !== undefined) updates.unit = dto.unit.trim();
    if (dto.standardCost !== undefined) updates.standard_cost = dto.standardCost;
    if (dto.standardPrice !== undefined) updates.standard_price = dto.standardPrice;

    const updated = await (this.db as any)
      .updateTable('contracting_master_boq_library')
      .set(updates)
      .where('id', '=', id as any)
      .where((eb: any) => eb.or([eb('tenant_id', '=', tenantId), eb('tenant_id', '=', '')]))
      .returningAll()
      .executeTakeFirst();

    if (!updated) {
      throw new NotFoundException(`البند المرجعي برقم ${id} غير موجود`);
    }
    return updated;
  }

  async deleteMasterBoqItem(auth: AuthContext, id: string) {
    const { tenantId } = requireTenantScope(auth);
    const res = await (this.db as any)
      .deleteFrom('contracting_master_boq_library')
      .where('id', '=', id as any)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!res || Number(res.numDeletedRows || 0) === 0) {
      throw new BadRequestException('لا يمكن حذف البنود المرجعية القياسية العامة للنظام');
    }
    return { success: true, message: 'تم حذف البند المرجعي بنجاح' };
  }

  async importMasterBoqItemsToProject(auth: AuthContext, projectId: string, dto: ImportMasterBoqToProjectDto) {
    const { tenantId } = requireTenantScope(auth);
    await this.getProjectById(auth, projectId);

    if (!dto.itemIds || dto.itemIds.length === 0) {
      throw new BadRequestException('يرجى تحديد بند واحد على الأقل للاستيراد');
    }

    const masterItems = await (this.db as any)
      .selectFrom('contracting_master_boq_library')
      .selectAll()
      .where('id', 'in', dto.itemIds as any)
      .execute();

    if (!masterItems || masterItems.length === 0) {
      throw new NotFoundException('لم يتم العثور على البنود المحددة في بنك البنود المرجعي');
    }

    const existingBoq = await (this.db as any)
      .selectFrom('contracting_boq_items')
      .select('item_code')
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .execute();

    const existingCodes = new Set(existingBoq.map((b: any) => b.item_code));

    let importedCount = 0;
    const insertedItems: any[] = [];

    for (const m of masterItems) {
      let candidateCode = m.item_code;
      let counter = 1;
      while (existingCodes.has(candidateCode)) {
        candidateCode = `${m.item_code}-${counter++}`;
      }
      existingCodes.add(candidateCode);

      const inserted = await (this.db as any)
        .insertInto('contracting_boq_items')
        .values({
          tenant_id: tenantId,
          project_id: projectId as any,
          item_code: candidateCode,
          description: m.name + (m.description ? ` - ${m.description}` : ''),
          category: m.trade_category || 'general',
          unit: m.unit || 'm3',
          contract_qty: 0,
          revised_qty: 0,
          unit_price: Number(m.standard_price || 0),
          total_price: 0,
          estimated_unit_cost: Number(m.standard_cost || 0),
          executed_qty: 0,
          notes: `مستورد من بنك البنود المرجعي [${m.trade_name_ar}]`,
        })
        .returningAll()
        .executeTakeFirst();

      if (inserted) {
        insertedItems.push(inserted);
        importedCount++;
      }
    }

    return {
      success: true,
      importedCount,
      projectId,
      items: insertedItems,
    };
  }
}



