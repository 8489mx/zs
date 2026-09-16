import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { KYSELY_DB } from '../../database/database.constants';
import { Kysely, sql } from '../../database/kysely';
import { Database } from '../../database/database.types';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';
import { getDailyDocumentPrefix } from '../../common/utils/document-number.util';
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
  BatchImportMasterBoqDto,
  ImportMasterBoqToProjectDto,
  SaveBoqTakeoffsDto,
  CreateSiteMobilizationExpenseDto,
  RecordLaborAttendanceRecordDto,
  CreateClientPaymentMilestoneDto,
  RecordInKindBarterDeductionDto,
  CreateEquipmentAssetDto,
  TransferEquipmentAssetDto,
  RecordSupplierPriceMemoryDto,
  CreateInspectionRequestDto,
  UpdateInspectionRequestStatusDto,
  CreateSnagItemDto,
  UpdateSnagItemStatusDto,
  CreateProjectHandoverDto,
  ApproveProjectHandoverDto,
  CreateSubmittalDto,
  UpdateSubmittalStatusDto,
  CreateMaterialEscalationDto,
  UpdateMaterialEscalationStatusDto,
  CreateSubcontractorBackchargeDto,
  UpdateBackchargeStatusDto,
  CreateEquipmentFuelLogDto,
} from './dto/contracting.dto';
import {
  ContractingProjectSummary,
  ContractingInspectionRequest,
  ContractingSnagItem,
  ContractingProjectHandover,
  ContractingProjectCostBreakdown,
  ContractingSubmittal,
  ContractingMaterialEscalation,
  ContractingSubcontractorBackcharge,
  ContractingEquipmentFuelLog,
  ContractingProjectEvmMetrics,
} from './contracting.types';

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
      const prefix = getDailyDocumentPrefix('PRJ');
      let count = ((await this.db
        .selectFrom('contracting_projects')
        .select(sql<number>`count(*)::int`.as('count'))
        .where('tenant_id', '=', tenantId)
        .where('code', 'like', `${prefix}%`)
        .executeTakeFirst())?.count || 0) + 1;
      let candidate = `${prefix}${String(count).padStart(4, '0')}`;
      while (await this.db.selectFrom('contracting_projects').select('id').where('tenant_id', '=', tenantId).where('code', '=', candidate).executeTakeFirst()) {
        count++;
        candidate = `${prefix}${String(count).padStart(4, '0')}`;
      }
      projectCode = candidate;
    }

    // 2. Resolve or create Cost Center automatically (dimension = 'project')
    let costCenterId = dto.costCenterId ? Number(dto.costCenterId) : null;
    if (!costCenterId) {
      try {
        const ccCode = `CC-${projectCode}`;
        const existingCc = await (this.db as any)
          .selectFrom('cost_centers')
          .select('id')
          .where('tenant_id', '=', tenantId)
          .where('code', '=', ccCode)
          .executeTakeFirst();

        if (existingCc) {
          costCenterId = Number(existingCc.id);
        } else {
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
    const prefix = getDailyDocumentPrefix('CO');
    const countRes = await this.db
      .selectFrom('contracting_change_orders')
      .select(sql<number>`count(*)::int`.as('count'))
      .where('tenant_id', '=', tenantId)
      .where('change_order_number', 'like', `${prefix}%`)
      .executeTakeFirst();
    const count = (countRes?.count || 0) + 1;
    const coNum = `${prefix}${String(count).padStart(4, '0')}`;

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

    let subId = dto.subcontractorId ? Number(dto.subcontractorId) : null;
    let subName = dto.subcontractorName || '';
    const subcontractId = dto.subcontractId ? Number(dto.subcontractId) : null;

    if (subcontractId && !subId) {
      const subc = await this.db
        .selectFrom('contracting_subcontracts')
        .select(['subcontractor_id'])
        .where('tenant_id', '=', tenantId)
        .where('id', '=', subcontractId as any)
        .executeTakeFirst();
      if (subc) {
        subId = Number(subc.subcontractor_id);
      }
    }

    if (subId && !subName) {
      const sup = await (this.db as any)
        .selectFrom('suppliers')
        .select('name')
        .where('tenant_id', '=', tenantId)
        .where('id', '=', subId)
        .executeTakeFirst();
      if (sup) {
        subName = sup.name;
      }
    }

    // Insert Invoice Header
    const [invoice] = await this.db
      .insertInto('contracting_invoices')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        ipc_number: ipcNumber,
        ipc_type: ipcType,
        subcontractor_id: subId,
        subcontractor_name: subName,
        subcontract_id: subcontractId as any,
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

    const isSubcontractor = invoice.ipc_type === 'subcontractor';

    // Resolve accounts based on invoice type
    let primaryAccountId: number | null = null;
    let contraAccountId: number | null = null;
    let advanceAccountId: number | null = null;
    let retentionAccountId: number | null = null;

    if (isSubcontractor) {
      // 1. Subcontracting Cost / Work in Progress (Expense)
      let expAccount = await (this.db as any)
        .selectFrom('accounting_accounts')
        .select('id')
        .where('tenant_id', '=', tenantId)
        .where('code', 'in', ['5100', '5200', '5000', '5120'])
        .where('is_active', '=', true)
        .orderBy('code', 'asc')
        .executeTakeFirst();
      if (!expAccount) {
        expAccount = await (this.db as any)
          .selectFrom('accounting_accounts')
          .select('id')
          .where('tenant_id', '=', tenantId)
          .where('account_type', '=', 'expense')
          .where('is_active', '=', true)
          .executeTakeFirst();
      }

      // 2. Accounts Payable (Suppliers / Subcontractors)
      let apAccount = await (this.db as any)
        .selectFrom('accounting_accounts')
        .select('id')
        .where('tenant_id', '=', tenantId)
        .where('code', '=', '2110')
        .where('is_active', '=', true)
        .executeTakeFirst();
      if (!apAccount) {
        apAccount = await (this.db as any)
          .selectFrom('accounting_accounts')
          .select('id')
          .where('tenant_id', '=', tenantId)
          .where('account_type', '=', 'liability')
          .where('is_payable', '=', true)
          .where('is_active', '=', true)
          .executeTakeFirst();
      }

      // 3. Subcontractor Retentions Payable (Liability)
      let subRetAccount = await (this.db as any)
        .selectFrom('accounting_accounts')
        .select('id')
        .where('tenant_id', '=', tenantId)
        .where('code', 'in', ['2160', '2180', '2135'])
        .where('is_active', '=', true)
        .executeTakeFirst();

      // 4. Advances to Subcontractors (Asset Recovery)
      let subAdvAccount = await (this.db as any)
        .selectFrom('accounting_accounts')
        .select('id')
        .where('tenant_id', '=', tenantId)
        .where('code', 'in', ['1150', '1140', '1180'])
        .where('is_active', '=', true)
        .executeTakeFirst();

      primaryAccountId = expAccount?.id ? Number(expAccount.id) : null;
      contraAccountId = apAccount?.id ? Number(apAccount.id) : null;
      retentionAccountId = subRetAccount?.id ? Number(subRetAccount.id) : contraAccountId;
      advanceAccountId = subAdvAccount?.id ? Number(subAdvAccount.id) : contraAccountId;

      if (!primaryAccountId || !contraAccountId) {
        throw new BadRequestException('تعذر تحديد حسابات المصروفات أو مقاولي الباطن في شجرة الحسابات');
      }
    } else {
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

      primaryAccountId = revAccount?.id ? Number(revAccount.id) : null;
      contraAccountId = arAccount?.id ? Number(arAccount.id) : null;
      advanceAccountId = advanceAccount?.id ? Number(advanceAccount.id) : contraAccountId;
      retentionAccountId = retentionAccount?.id ? Number(retentionAccount.id) : contraAccountId;

      if (!primaryAccountId || !contraAccountId) {
        throw new BadRequestException('تعذر تحديد الحسابات المحاسبية الأساسية (العملاء أو الإيرادات) في شجرة الحسابات');
      }
    }

    // Sequence & entry number
    const seqRow = await (this.db as any)
      .selectFrom('journal_entries')
      .select(sql<number>`count(*)::int`.as('count'))
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    const sequence = Number(seqRow?.count || 0) + 1;
    const prefix = isSubcontractor ? 'JE-SUB' : 'JE-IPC';
    const entryNo = `${prefix}-${String(sequence).padStart(5, '0')}`;

    const inserted = await this.db.transaction().execute(async (trx: any) => {
      const description = isSubcontractor
        ? `إثبات مستخلص مقاول باطن رقم ${invoice.ipc_number} - ${invoice.subcontractor_name || 'مقاول باطن'} - مشروع ${project.name}`
        : `إثبات استحقاق مستخلص أعمال رقم ${invoice.ipc_number} - مشروع ${project.name}`;

      // 1. Create header
      const [entry] = await trx
        .insertInto('journal_entries')
        .values({
          entry_no: entryNo,
          tenant_id: tenantId,
          account_id: accountId,
          entry_date: invoice.period_end || new Date(),
          description,
          source_type: isSubcontractor ? 'contracting_subcontract_ipc' : 'contracting_ipc',
          source_id: Number(invoice.id),
          status: 'posted',
          created_by: auth.userId,
        })
        .returning(['id', 'entry_no'])
        .execute();

      const lines: any[] = [];

      if (isSubcontractor) {
        // Subcontractor Journal Entry:
        // Line 1: Debit Subcontracting Expense (WIP)
        lines.push({
          journal_entry_id: Number(entry.id),
          tenant_id: tenantId,
          account_id: primaryAccountId,
          cost_center_id: project.cost_center_id || null,
          description: `أعمال وتشوينات مستخلص مقاول باطن ${invoice.ipc_number}`,
          debit: currentWorkAndStored,
          credit: 0,
          partner_type: 'supplier',
          partner_id: invoice.subcontractor_id || null,
        });

        // Line 2: Credit Advance Recovery
        if (advanceRecovery > 0) {
          lines.push({
            journal_entry_id: Number(entry.id),
            tenant_id: tenantId,
            account_id: advanceAccountId,
            cost_center_id: project.cost_center_id || null,
            description: `استرداد دفعة مقدمة مقاول باطن ${invoice.ipc_number}`,
            debit: 0,
            credit: advanceRecovery,
            partner_type: 'supplier',
            partner_id: invoice.subcontractor_id || null,
          });
        }

        // Line 3: Credit Retention Held (Liability to subcontractor)
        if (retentionHeld > 0) {
          lines.push({
            journal_entry_id: Number(entry.id),
            tenant_id: tenantId,
            account_id: retentionAccountId,
            cost_center_id: project.cost_center_id || null,
            description: `تأمين أعمال محتجز (حسن تنفيذ) لمقاول الباطن ${invoice.ipc_number}`,
            debit: 0,
            credit: retentionHeld,
            partner_type: 'supplier',
            partner_id: invoice.subcontractor_id || null,
          });

          // Auto-insert into retention ledger
          await trx.insertInto('contracting_retention_records').values({
            tenant_id: tenantId,
            project_id: invoice.project_id,
            guarantee_type: 'subcontractor',
            party_name: invoice.subcontractor_name || 'مقاول باطن',
            reference_number: invoice.ipc_number,
            held_amount: retentionHeld,
            released_amount: 0,
            due_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
            status: 'held',
            notes: `استقطاع ضمان حسن تنفيذ لمقاول الباطن من مستخلص ${invoice.ipc_number}`,
          }).execute();
        }

        // Line 4: Credit Other Deductions
        if (otherDeductions > 0) {
          lines.push({
            journal_entry_id: Number(entry.id),
            tenant_id: tenantId,
            account_id: primaryAccountId,
            cost_center_id: project.cost_center_id || null,
            description: `استقطاعات وجزاءات مستخلص مقاول باطن ${invoice.ipc_number}`,
            debit: 0,
            credit: otherDeductions,
            partner_type: 'supplier',
            partner_id: invoice.subcontractor_id || null,
          });
        }

        // Line 5: Credit Accounts Payable (Net Payable to Subcontractor)
        if (netPayable > 0) {
          lines.push({
            journal_entry_id: Number(entry.id),
            tenant_id: tenantId,
            account_id: contraAccountId,
            cost_center_id: project.cost_center_id || null,
            description: `صافي المستحق لمقاول الباطن مستخلص ${invoice.ipc_number}`,
            debit: 0,
            credit: netPayable,
            partner_type: 'supplier',
            partner_id: invoice.subcontractor_id || null,
          });
        }
      } else {
        // Client Journal Entry:
        // Line 1: Credit Contracting Revenue
        lines.push({
          journal_entry_id: Number(entry.id),
          tenant_id: tenantId,
          account_id: primaryAccountId,
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
            account_id: advanceAccountId,
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
            account_id: retentionAccountId,
            cost_center_id: project.cost_center_id || null,
            description: `تأمين أعمال محتجز (حسن تنفيذ) مستخلص ${invoice.ipc_number}`,
            debit: retentionHeld,
            credit: 0,
            partner_type: 'customer',
            partner_id: project.client_id || null,
          });

          // Auto-insert into retention ledger for client
          await trx.insertInto('contracting_retention_records').values({
            tenant_id: tenantId,
            project_id: invoice.project_id,
            guarantee_type: 'client',
            party_name: project.client_name || 'المالك',
            reference_number: invoice.ipc_number,
            held_amount: retentionHeld,
            released_amount: 0,
            due_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
            status: 'held',
            notes: `استقطاع ضمان حسن تنفيذ على المالك من مستخلص ${invoice.ipc_number}`,
          }).execute();
        }

        // Line 4: Debit Other Deductions
        if (otherDeductions > 0) {
          lines.push({
            journal_entry_id: Number(entry.id),
            tenant_id: tenantId,
            account_id: contraAccountId,
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
            account_id: contraAccountId,
            cost_center_id: project.cost_center_id || null,
            description: `صافي المستحق على العميل مستخلص ${invoice.ipc_number}`,
            debit: netPayable,
            credit: 0,
            partner_type: 'customer',
            partner_id: project.client_id || null,
          });
        }
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
    const subcontracts = await this.db
      .selectFrom('contracting_subcontracts')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .orderBy('created_at', 'desc')
      .execute();

    return Promise.all(
      subcontracts.map(async (sc) => {
        let subcontractorName = '';
        if (sc.subcontractor_id) {
          const sup = await (this.db as any)
            .selectFrom('suppliers')
            .select('name')
            .where('tenant_id', '=', tenantId)
            .where('id', '=', sc.subcontractor_id)
            .executeTakeFirst();
          subcontractorName = sup?.name || '';
        }

        const invTotals = await this.db
          .selectFrom('contracting_invoices')
          .select([
            sql<number>`COALESCE(SUM(net_payable), 0)`.as('total_invoiced'),
            sql<number>`COALESCE(SUM(retention_held_amount), 0)`.as('total_retention_held'),
          ])
          .where('tenant_id', '=', tenantId)
          .where('project_id', '=', projectId as any)
          .where((eb) =>
            eb.or([
              eb('subcontract_id', '=', sc.id as any),
              eb.and([
                eb('ipc_type', '=', 'subcontractor'),
                eb('subcontractor_id', '=', sc.subcontractor_id as any),
              ]),
            ])
          )
          .where('status', 'in', ['approved', 'paid'])
          .executeTakeFirst();

        const totalInvoiced = Number(invTotals?.total_invoiced || 0);
        const totalRetentionHeld = Number(invTotals?.total_retention_held || 0);
        const totalAmount = Number(sc.total_amount || 0);
        const remainingCommitment = Math.max(0, totalAmount - totalInvoiced);

        return {
          id: String(sc.id),
          projectId: String(sc.project_id),
          subcontractorId: Number(sc.subcontractor_id),
          subcontractorName,
          contractNumber: sc.contract_number,
          scopeOfWork: sc.scope_of_work,
          totalAmount,
          retentionPercent: Number(sc.retention_percent || 0),
          startDate: sc.start_date ? String(sc.start_date) : null,
          endDate: sc.end_date ? String(sc.end_date) : null,
          status: sc.status,
          notes: sc.notes,
          totalInvoiced,
          totalRetentionHeld,
          remainingCommitment,
          createdAt: String(sc.created_at),
          updatedAt: String(sc.updated_at),
        };
      })
    );
  }

  async createSubcontract(auth: AuthContext, projectId: string, dto: CreateSubcontractDto) {
    const { tenantId } = requireTenantScope(auth);
    let contractNumber = dto.contractNumber ? dto.contractNumber.trim() : '';
    if (!contractNumber) {
      const prefix = getDailyDocumentPrefix('SC');
      const countRes = await this.db
        .selectFrom('contracting_subcontracts')
        .select(sql<number>`count(*)::int`.as('count'))
        .where('tenant_id', '=', tenantId)
        .where('contract_number', 'like', `${prefix}%`)
        .executeTakeFirst();
      const count = (countRes?.count || 0) + 1;
      contractNumber = `${prefix}${String(count).padStart(4, '0')}`;
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
    const prefix = getDailyDocumentPrefix('RFI');
    const countRes = await this.db
      .selectFrom('contracting_rfis')
      .select(sql<number>`count(*)::int`.as('count'))
      .where('tenant_id', '=', tenantId)
      .where('rfi_number', 'like', `${prefix}%`)
      .executeTakeFirst();
    const count = (countRes?.count || 0) + 1;
    const rfiNum = `${prefix}${String(count).padStart(4, '0')}`;

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
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const prefix = `MR-${yy}${mm}${dd}-`;
      const countRes = await this.db
        .selectFrom('contracting_material_requisitions')
        .select(sql<number>`count(*)::int`.as('count'))
        .where('tenant_id', '=', tenantId)
        .where('requisition_number', 'like', `${prefix}%`)
        .executeTakeFirst();
      let count = (countRes?.count || 0) + 1;
      let candidate = `${prefix}${String(count).padStart(4, '0')}`;
      while (
        await this.db
          .selectFrom('contracting_material_requisitions')
          .select('id')
          .where('tenant_id', '=', tenantId)
          .where('requisition_number', '=', candidate)
          .executeTakeFirst()
      ) {
        count++;
        candidate = `${prefix}${String(count).padStart(4, '0')}`;
      }
      reqNumber = candidate;
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
        item_code: 'BRK-RED-12',
        item_name: 'مباني طوب أحمر طفلي 12 سم (قاطع نصف طوبة بالمتر المسطح)',
        unit: 'm2',
        waste_percent: 5.0,
        overhead_percent: 7.0,
        profit_markup_percent: 15.0,
        components_json: JSON.stringify([
          { componentCode: 'BRK-RED-CLAY', componentName: 'طوب أحمر طفلي 25×12×6 سم', unit: 'pcs', qtyPerUnit: 55, unitRate: 2.2, componentType: 'material' },
          { componentCode: 'SAND-MASON', componentName: 'رمل بناء حرش نظيف', unit: 'm3', qtyPerUnit: 0.02, unitRate: 180, componentType: 'material' },
          { componentCode: 'CEM-PORT', componentName: 'أسمنت بورتلاندي 42.5', unit: 'ton', qtyPerUnit: 0.01, unitRate: 2400, componentType: 'material' },
          { componentCode: 'LABOR-MASON', componentName: 'مصنعية بنا ومساعد ونقل داخلي', unit: 'm2', qtyPerUnit: 1.0, unitRate: 70, componentType: 'labor' },
        ]),
        notes: 'كود المباني القياسي: المتر المسطح سمك 12 سم يستهلك معيارياً 55 طوبة + 0.02 م3 رمل + 10 كجم أسمنت + مصنعية البنا.',
      },
      {
        item_code: 'BRK-SOL-25',
        item_name: 'مباني طوب أسمنتي مصمت 25 سم (طوبة كاملة بالمتر المكعب)',
        unit: 'm3',
        waste_percent: 5.0,
        overhead_percent: 7.0,
        profit_markup_percent: 15.0,
        components_json: JSON.stringify([
          { componentCode: 'BRK-SOL-CONC', componentName: 'طوب أسمنتي مصمت 25×12×6 سم', unit: 'pcs', qtyPerUnit: 450, unitRate: 2.8, componentType: 'material' },
          { componentCode: 'SAND-MASON', componentName: 'رمل بناء حرش نظيف', unit: 'm3', qtyPerUnit: 0.2, unitRate: 180, componentType: 'material' },
          { componentCode: 'CEM-PORT', componentName: 'أسمنت بورتلاندي 42.5', unit: 'ton', qtyPerUnit: 0.065, unitRate: 2400, componentType: 'material' },
          { componentCode: 'LABOR-MASON-CUB', componentName: 'مصنعية بنا وطاقم عمالة للمكعب', unit: 'm3', qtyPerUnit: 1.0, unitRate: 320, componentType: 'labor' },
        ]),
        notes: 'كود المباني المكعبة: المتر المكعب سمك 25 سم يستهلك معيارياً 450 طوبة + 0.2 م3 رمل + 65 كجم أسمنت.',
      },
      {
        item_code: 'BRK-HLL-20',
        item_name: 'مباني طوب أسمنتي مفرغ 20×20×40 سم (بالمتر المسطح)',
        unit: 'm2',
        waste_percent: 5.0,
        overhead_percent: 7.0,
        profit_markup_percent: 15.0,
        components_json: JSON.stringify([
          { componentCode: 'BRK-BLK-HLL', componentName: 'طوب أسمنتي مفرغ 20×20×40', unit: 'pcs', qtyPerUnit: 12.5, unitRate: 18, componentType: 'material' },
          { componentCode: 'SAND-MASON', componentName: 'رمل بناء حرش نظيف', unit: 'm3', qtyPerUnit: 0.04, unitRate: 180, componentType: 'material' },
          { componentCode: 'CEM-PORT', componentName: 'أسمنت بورتلاندي 42.5', unit: 'ton', qtyPerUnit: 0.015, unitRate: 2400, componentType: 'material' },
          { componentCode: 'LABOR-MASON', componentName: 'مصنعية بنا ومساعد', unit: 'm2', qtyPerUnit: 1.0, unitRate: 85, componentType: 'labor' },
        ]),
        notes: 'مباني بلك أسمنتي مفرغ 20 سم للمناور والحوائط الخارجية.',
      },
      {
        item_code: 'CONC-PLN-C20',
        item_name: 'خرسانة عادية للأساسات والفرشات C20 (بالمتر المكعب)',
        unit: 'm3',
        waste_percent: 4.0,
        overhead_percent: 7.0,
        profit_markup_percent: 15.0,
        components_json: JSON.stringify([
          { componentCode: 'GRAV-CRUSH', componentName: 'سن 1 و 2 / زلط متدرج', unit: 'm3', qtyPerUnit: 0.8, unitRate: 280, componentType: 'material' },
          { componentCode: 'SAND-CRS', componentName: 'رمل حرش نظيف', unit: 'm3', qtyPerUnit: 0.4, unitRate: 180, componentType: 'material' },
          { componentCode: 'CEM-PORT', componentName: 'أسمنت بورتلاندي 42.5 (5 شكاير)', unit: 'ton', qtyPerUnit: 0.25, unitRate: 2400, componentType: 'material' },
          { componentCode: 'LABOR-PLN-CONC', componentName: 'مصنعية نجارة وفرش ودك خرسانة عادية', unit: 'm3', qtyPerUnit: 1.0, unitRate: 220, componentType: 'labor' },
        ]),
        notes: 'متر مكعب خرسانة عادية C20 محتوى 250 كجم أسمنت / م3.',
      },
      {
        item_code: 'CONC-FTG-C30',
        item_name: 'خرسانة مسلحة للقواعد والأساسات C30 (بالمتر المكعب)',
        unit: 'm3',
        waste_percent: 5.0,
        overhead_percent: 7.0,
        profit_markup_percent: 15.0,
        components_json: JSON.stringify([
          { componentCode: 'GRAV-CRUSH', componentName: 'سن 1 و 2 / زلط متدرج', unit: 'm3', qtyPerUnit: 0.8, unitRate: 280, componentType: 'material' },
          { componentCode: 'SAND-CRS', componentName: 'رمل حرش نظيف', unit: 'm3', qtyPerUnit: 0.4, unitRate: 180, componentType: 'material' },
          { componentCode: 'CEM-PORT', componentName: 'أسمنت بورتلاندي 42.5 (7 شكاير)', unit: 'ton', qtyPerUnit: 0.35, unitRate: 2400, componentType: 'material' },
          { componentCode: 'STEEL-REBAR', componentName: 'حديد تسليح عالي الإجهاد (85 كجم)', unit: 'ton', qtyPerUnit: 0.085, unitRate: 42000, componentType: 'material' },
          { componentCode: 'LABOR-FTG', componentName: 'مصنعية نجارة وحدادة وصب قواعد مسلحة', unit: 'm3', qtyPerUnit: 1.0, unitRate: 480, componentType: 'labor' },
        ]),
        notes: 'متر مكعب خرسانة مسلحة للقواعد والسميلات واللبشة بمعدل حديد 85 كجم/م3.',
      },
      {
        item_code: 'CONC-COL-C35',
        item_name: 'خرسانة مسلحة للأعمدة والحوائط C35 (بالمتر المكعب)',
        unit: 'm3',
        waste_percent: 5.0,
        overhead_percent: 7.0,
        profit_markup_percent: 15.0,
        components_json: JSON.stringify([
          { componentCode: 'GRAV-FINO', componentName: 'سن فينو متدرج نظيف', unit: 'm3', qtyPerUnit: 0.8, unitRate: 310, componentType: 'material' },
          { componentCode: 'SAND-CRS', componentName: 'رمل حرش نظيف', unit: 'm3', qtyPerUnit: 0.4, unitRate: 180, componentType: 'material' },
          { componentCode: 'CEM-PORT', componentName: 'أسمنت بورتلاندي 42.5 (8 شكاير)', unit: 'ton', qtyPerUnit: 0.40, unitRate: 2400, componentType: 'material' },
          { componentCode: 'STEEL-REBAR', componentName: 'حديد تسليح عالي الإجهاد (140 كجم)', unit: 'ton', qtyPerUnit: 0.140, unitRate: 42000, componentType: 'material' },
          { componentCode: 'LABOR-COL', componentName: 'مصنعية نجارة وحدادة وصب أعمدة وحوائط', unit: 'm3', qtyPerUnit: 1.0, unitRate: 650, componentType: 'labor' },
        ]),
        notes: 'متر مكعب خرسانة أعمدة وحوائط خرسانية C35 بمعدل حديد 140 كجم/م3.',
      },
      {
        item_code: 'CONC-SLB-C30',
        item_name: 'خرسانة مسلحة للأسقف والكمرات C30 (بالمتر المكعب)',
        unit: 'm3',
        waste_percent: 5.0,
        overhead_percent: 7.0,
        profit_markup_percent: 15.0,
        components_json: JSON.stringify([
          { componentCode: 'GRAV-CRUSH', componentName: 'سن 1 و 2 / زلط متدرج', unit: 'm3', qtyPerUnit: 0.8, unitRate: 280, componentType: 'material' },
          { componentCode: 'SAND-CRS', componentName: 'رمل حرش نظيف', unit: 'm3', qtyPerUnit: 0.4, unitRate: 180, componentType: 'material' },
          { componentCode: 'CEM-PORT', componentName: 'أسمنت بورتلاندي 42.5 (7 شكاير)', unit: 'ton', qtyPerUnit: 0.35, unitRate: 2400, componentType: 'material' },
          { componentCode: 'STEEL-REBAR', componentName: 'حديد تسليح عالي الإجهاد (110 كجم)', unit: 'ton', qtyPerUnit: 0.110, unitRate: 42000, componentType: 'material' },
          { componentCode: 'LABOR-SLB', componentName: 'مصنعية شدات خشبية وحدادة وصب أسقف', unit: 'm3', qtyPerUnit: 1.0, unitRate: 550, componentType: 'labor' },
        ]),
        notes: 'متر مكعب خرسانة أسقف وكمرات (سوليد / فلات سلاب) بمعدل حديد 110 كجم/م3.',
      },
      {
        item_code: 'PLAS-INT-01',
        item_name: 'أعمال بياض ومحارة داخلية للحوائط والأسقف (بالمتر المسطح)',
        unit: 'm2',
        waste_percent: 4.0,
        overhead_percent: 7.0,
        profit_markup_percent: 15.0,
        components_json: JSON.stringify([
          { componentCode: 'SAND-PLAS', componentName: 'رمل ناعم للمحارة والطرطشة', unit: 'm3', qtyPerUnit: 0.025, unitRate: 180, componentType: 'material' },
          { componentCode: 'CEM-PORT', componentName: 'أسمنت بورتلاندي للمحارة', unit: 'ton', qtyPerUnit: 0.009, unitRate: 2400, componentType: 'material' },
          { componentCode: 'MESH-FIBER', componentName: 'سلك شبك فواصل وزوايا معدنية', unit: 'm', qtyPerUnit: 0.4, unitRate: 15, componentType: 'material' },
          { componentCode: 'LABOR-PLAS', componentName: 'مصنعية مبيض محارة وطاقمه', unit: 'm2', qtyPerUnit: 1.0, unitRate: 75, componentType: 'labor' },
        ]),
        notes: 'بياض ومحارة داخلية طرطشة مسمارية + بؤج وأوتار + بطانة وضهارة ناعمة.',
      },
      {
        item_code: 'TILE-FLR-CER',
        item_name: 'سيراميك أرضيات فرز أول بالفرشة والمونة (بالمتر المسطح)',
        unit: 'm2',
        waste_percent: 7.0,
        overhead_percent: 7.0,
        profit_markup_percent: 15.0,
        components_json: JSON.stringify([
          { componentCode: 'TILE-CER-FLR', componentName: 'بلاط سيراميك أرضيات فرز أول', unit: 'm2', qtyPerUnit: 1.05, unitRate: 260, componentType: 'material' },
          { componentCode: 'SAND-FILL', componentName: 'رمل فرشة وتأسيس منسوب', unit: 'm3', qtyPerUnit: 0.05, unitRate: 180, componentType: 'material' },
          { componentCode: 'CEM-PORT', componentName: 'أسمنت أسود لمونة التركيب', unit: 'ton', qtyPerUnit: 0.012, unitRate: 2400, componentType: 'material' },
          { componentCode: 'GROUT-WHT', componentName: 'أسمنت أبيض وروبة سقية فواصل', unit: 'kg', qtyPerUnit: 0.5, unitRate: 35, componentType: 'material' },
          { componentCode: 'LABOR-TILE', componentName: 'مصنعية مبلط أرضيات ومساعد', unit: 'm2', qtyPerUnit: 1.0, unitRate: 95, componentType: 'labor' },
        ]),
        notes: 'سيراميك أرضيات فرز أول بالرمل والمونة الأسمنتية وسقية العراميس.',
      },
      {
        item_code: 'PAINT-INT-03',
        item_name: 'دهانات داخلية بلاستيك 3 أوجه وسيلر ومعجون (بالمتر المسطح)',
        unit: 'm2',
        waste_percent: 5.0,
        overhead_percent: 7.0,
        profit_markup_percent: 15.0,
        components_json: JSON.stringify([
          { componentCode: 'PAINT-SEAL', componentName: 'سيلر مائي مقاوم للقلويات', unit: 'L', qtyPerUnit: 0.15, unitRate: 45, componentType: 'material' },
          { componentCode: 'PAINT-PUTTY', componentName: 'معجون بلاستيك جاهز 3 سكاكين', unit: 'kg', qtyPerUnit: 1.4, unitRate: 30, componentType: 'material' },
          { componentCode: 'PAINT-PLAS', componentName: 'دهان بلاستيك نصف لمعة قابل للغسيل', unit: 'L', qtyPerUnit: 0.25, unitRate: 120, componentType: 'material' },
          { componentCode: 'LABOR-PAINT', componentName: 'مصنعية نقاش وصنفرة وتشطيب', unit: 'm2', qtyPerUnit: 1.0, unitRate: 60, componentType: 'labor' },
        ]),
        notes: 'دهانات داخلية وجه سيلر + 3 سكاكين معجون + وجهين بلاستيك نصف لمعة ممتاز.',
      },
      {
        item_code: 'ISO-WTR-BIT',
        item_name: 'عزل رطوبة ممبرين بيتوميني 4 مم وحرارة فوم 5 سم للأسطح (بالمتر المسطح)',
        unit: 'm2',
        waste_percent: 6.0,
        overhead_percent: 7.0,
        profit_markup_percent: 15.0,
        components_json: JSON.stringify([
          { componentCode: 'BIT-MEMB-4MM', componentName: 'لفائف ممبرين بيتوميني 4 مم بوليستر', unit: 'm2', qtyPerUnit: 1.15, unitRate: 180, componentType: 'material' },
          { componentCode: 'BIT-PRIMER', componentName: 'برايمر بيتوميني دهان تأسيس', unit: 'kg', qtyPerUnit: 0.3, unitRate: 65, componentType: 'material' },
          { componentCode: 'XPS-FOAM-5CM', componentName: 'ألواح فوم عازل حراري XPS سمك 5 سم', unit: 'm2', qtyPerUnit: 1.05, unitRate: 160, componentType: 'material' },
          { componentCode: 'LABOR-INSUL', componentName: 'مصنعية فني عزل ولحام لهب', unit: 'm2', qtyPerUnit: 1.0, unitRate: 75, componentType: 'labor' },
        ]),
        notes: 'عزل أسطح مزدوج رطوبة ممبرين 4 مم مع ركوب 10 سم وعزل حراري فوم XPS كثافة 36 كجم.',
      },
      {
        item_code: 'EXCAV-SOIL',
        item_name: 'أعمال حفر في تربة رملية/طينية وتشوين ونقل للمقالب (بالمتر المكعب)',
        unit: 'm3',
        waste_percent: 0.0,
        overhead_percent: 7.0,
        profit_markup_percent: 15.0,
        components_json: JSON.stringify([
          { componentCode: 'EQP-EXCAV', componentName: 'ساعة تشغيل حفار كوماتسو', unit: 'hr', qtyPerUnit: 0.04, unitRate: 1200, componentType: 'equipment' },
          { componentCode: 'EQP-LOADER', componentName: 'ساعة تشغيل لودر وتشوين', unit: 'hr', qtyPerUnit: 0.03, unitRate: 900, componentType: 'equipment' },
          { componentCode: 'TRUCK-HAUL', componentName: 'نقل وتعتيق مخلفات بالمقطورة', unit: 'm3', qtyPerUnit: 1.0, unitRate: 65, componentType: 'subcontractor' },
        ]),
        notes: 'أعمال حفر الموقع حتى المنسوب التأسيسي المعتمد ونقل ناتج الحفر.',
      },
      {
        item_code: 'PLUMB-POINT',
        item_name: 'تأسيس شبكة تغذية وصرف صحي للحمام (بالنقطة / المخرج)',
        unit: 'point',
        waste_percent: 5.0,
        overhead_percent: 7.0,
        profit_markup_percent: 15.0,
        components_json: JSON.stringify([
          { componentCode: 'PPR-PIPE', componentName: 'مواسير ولوازم تغذية بولي بروبلين PPR معتمدة', unit: 'm', qtyPerUnit: 4.0, unitRate: 95, componentType: 'material' },
          { componentCode: 'PVC-DRAIN', componentName: 'مواسير ولوازم صرف رمادي ثقيل', unit: 'm', qtyPerUnit: 3.5, unitRate: 85, componentType: 'material' },
          { componentCode: 'VALVES-ACC', componentName: 'محابس زاوية وجلب سن وفحص', unit: 'set', qtyPerUnit: 1.0, unitRate: 320, componentType: 'material' },
          { componentCode: 'LABOR-PLUMB', componentName: 'مصنعية سباك واختبار ضغط هيدروليكي', unit: 'point', qtyPerUnit: 1.0, unitRate: 350, componentType: 'labor' },
        ]),
        notes: 'تأسيس شبكة السباكة الداخلية من أجود أنواع البولي بروبلين واختبار بالبار بحضور الاستشاري.',
      },
      {
        item_code: 'ELEC-POINT',
        item_name: 'تأسيس نقطة كهرباء وإنارة ومخارج قوى (بالنقطة / المخرج)',
        unit: 'point',
        waste_percent: 5.0,
        overhead_percent: 7.0,
        profit_markup_percent: 15.0,
        components_json: JSON.stringify([
          { componentCode: 'ELEC-WIRE', componentName: 'أسلاك نحاس معتمدة السويدي 2.5 و 3 مم', unit: 'm', qtyPerUnit: 15.0, unitRate: 22, componentType: 'material' },
          { componentCode: 'PVC-CONDUIT', componentName: 'خراطيم بيتفين وعُلب ماجيك وشاسيهات', unit: 'set', qtyPerUnit: 1.0, unitRate: 85, componentType: 'material' },
          { componentCode: 'LABOR-ELEC', componentName: 'مصنعية فني كهربائي وتكسير وتمديد', unit: 'point', qtyPerUnit: 1.0, unitRate: 180, componentType: 'labor' },
        ]),
        notes: 'تأسيس مخارج الكهرباء والإنارة شاملة سحب الأسلاك والخراطيم وتثبيت العلب والشاسيهات.',
      },
      {
        item_code: 'GYPS-CEIL-01',
        item_name: 'أسقف معلقة جبسوم بورد مقاوم للرطوبة أخضر (بالمتر المسطح)',
        unit: 'm2',
        waste_percent: 5.0,
        overhead_percent: 7.0,
        profit_markup_percent: 15.0,
        components_json: JSON.stringify([
          { componentCode: 'GYPS-BOARD', componentName: 'ألواح جبسوم بورد خضراء مقاومة للرطوبة 12.5 مم', unit: 'm2', qtyPerUnit: 1.05, unitRate: 160, componentType: 'material' },
          { componentCode: 'STEEL-GRID', componentName: 'شاسيه صاج مجلفن أوميجا وزوايا وتيش تعليق', unit: 'm2', qtyPerUnit: 1.0, unitRate: 110, componentType: 'material' },
          { componentCode: 'PUTTY-FIBER', componentName: 'معجون فواصل وشريط فيبر ومسامير', unit: 'm2', qtyPerUnit: 1.0, unitRate: 35, componentType: 'material' },
          { componentCode: 'LABOR-GYPS', componentName: 'مصنعية فني تركيب جبسوم بورد ومساعد', unit: 'm2', qtyPerUnit: 1.0, unitRate: 95, componentType: 'labor' },
        ]),
        notes: 'أسقف جبسوم بورد مستوية ومستويات شاملة الشاسيه المقاوم للصدأ وشريط الفواصل والمعجون.',
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
      const prefix = getDailyDocumentPrefix('RTN');
      const countRes = await (this.db as any)
        .selectFrom('contracting_supplier_returns')
        .select(sql<number>`count(*)::int`.as('count'))
        .where('tenant_id', '=', tenantId)
        .where('return_number', 'like', `${prefix}%`)
        .executeTakeFirst();
      let count = (countRes?.count || 0) + 1;
      let candidate = `${prefix}${String(count).padStart(4, '0')}`;
      while (
        await (this.db as any)
          .selectFrom('contracting_supplier_returns')
          .select('id')
          .where('tenant_id', '=', tenantId)
          .where('return_number', '=', candidate)
          .executeTakeFirst()
      ) {
        count++;
        candidate = `${prefix}${String(count).padStart(4, '0')}`;
      }
      returnNumber = candidate;
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
      const prefix = getDailyDocumentPrefix('CSH');
      const countRes = await (this.db as any)
        .selectFrom('contracting_petty_cash')
        .select(sql<number>`count(*)::int`.as('count'))
        .where('tenant_id', '=', tenantId)
        .where('disbursement_number', 'like', `${prefix}%`)
        .executeTakeFirst();
      let count = (countRes?.count || 0) + 1;
      let candidate = `${prefix}${String(count).padStart(4, '0')}`;
      while (
        await (this.db as any)
          .selectFrom('contracting_petty_cash')
          .select('id')
          .where('tenant_id', '=', tenantId)
          .where('disbursement_number', '=', candidate)
          .executeTakeFirst()
      ) {
        count++;
        candidate = `${prefix}${String(count).padStart(4, '0')}`;
      }
      disbNum = candidate;
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
      WITH scoped_items AS (
        SELECT DISTINCT ON (item_code)
          trade_category, trade_name_ar, is_active
        FROM contracting_master_boq_library
        WHERE (tenant_id = ${tenantId} OR tenant_id = '')
        ORDER BY item_code, (CASE WHEN tenant_id = ${tenantId} THEN 1 ELSE 2 END)
      )
      SELECT 
        trade_category,
        trade_name_ar,
        COUNT(*)::text as items_count
      FROM scoped_items
      WHERE is_active = true
      GROUP BY trade_category, trade_name_ar
      ORDER BY trade_category ASC
    `.execute(this.db);

    return rows.rows.map((r) => ({
      tradeCategory: r.trade_category,
      tradeNameAr: r.trade_name_ar,
      itemsCount: Number(r.items_count || 0),
    }));
  }

  async getMasterBoqLibrary(auth: AuthContext, query?: { tradeCategory?: string; search?: string; status?: string }) {
    const { tenantId } = requireTenantScope(auth);
    let rawQuery = sql<any>`
      WITH scoped_items AS (
        SELECT DISTINCT ON (item_code)
          id, tenant_id, trade_category, trade_name_ar, item_code, name, description, unit, standard_cost, standard_price, is_active, created_at, updated_at
        FROM contracting_master_boq_library
        WHERE (tenant_id = ${tenantId} OR tenant_id = '')
        ORDER BY item_code, (CASE WHEN tenant_id = ${tenantId} THEN 1 ELSE 2 END)
      )
      SELECT * FROM scoped_items
      WHERE 1=1
    `;

    if (query?.status === 'active') {
      rawQuery = sql`${rawQuery} AND is_active = true`;
    } else if (query?.status === 'inactive') {
      rawQuery = sql`${rawQuery} AND is_active = false`;
    } else {
      // Default: show active items unless specified
      rawQuery = sql`${rawQuery} AND is_active = true`;
    }

    if (query?.tradeCategory && query.tradeCategory !== 'all') {
      rawQuery = sql`${rawQuery} AND trade_category = ${query.tradeCategory}`;
    }

    if (query?.search) {
      const s = `%${query.search.trim()}%`;
      rawQuery = sql`${rawQuery} AND (name ILIKE ${s} OR item_code ILIKE ${s} OR description ILIKE ${s} OR trade_name_ar ILIKE ${s})`;
    }

    rawQuery = sql`${rawQuery} ORDER BY trade_category ASC, item_code ASC`;

    const result = await rawQuery.execute(this.db);
    return result.rows.map((it: any) => ({
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
      isCustom: Boolean(it.tenant_id && it.tenant_id === tenantId),
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

  async bulkImportMasterBoqItems(auth: AuthContext, dto: BatchImportMasterBoqDto) {
    const { tenantId } = requireTenantScope(auth);
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('لا توجد بنود للاستيراد');
    }

    let insertedCount = 0;
    for (const item of dto.items) {
      if (!item.name || !item.itemCode) continue;
      await sql`
        INSERT INTO contracting_master_boq_library (
          tenant_id, trade_category, trade_name_ar, item_code, name, description, unit, standard_cost, standard_price, is_active
        ) VALUES (
          ${tenantId}, 
          ${item.tradeCategory || 'civil_concrete'}, 
          ${item.tradeNameAr || 'الأعمال المدنية والخرسانات'}, 
          ${item.itemCode.trim()}, 
          ${item.name.trim()}, 
          ${item.description?.trim() || ''}, 
          ${item.unit?.trim() || 'm3'}, 
          ${item.standardCost || 0}, 
          ${item.standardPrice || 0}, 
          true
        )
        ON CONFLICT (tenant_id, item_code) DO UPDATE SET
          name = EXCLUDED.name,
          trade_category = EXCLUDED.trade_category,
          trade_name_ar = EXCLUDED.trade_name_ar,
          description = EXCLUDED.description,
          unit = EXCLUDED.unit,
          standard_cost = EXCLUDED.standard_cost,
          standard_price = EXCLUDED.standard_price,
          is_active = true,
          updated_at = NOW();
      `.execute(this.db);
      insertedCount++;
    }

    return {
      success: true,
      count: insertedCount,
      message: `تم استيراد وتحديث ${insertedCount} بند في بنك البنود بنجاح`,
    };
  }

  async updateMasterBoqItem(auth: AuthContext, id: string, dto: UpdateMasterBoqLibraryItemDto) {
    const { tenantId } = requireTenantScope(auth);
    const item = await (this.db as any)
      .selectFrom('contracting_master_boq_library')
      .selectAll()
      .where('id', '=', id as any)
      .where((eb: any) => eb.or([eb('tenant_id', '=', tenantId), eb('tenant_id', '=', '')]))
      .executeTakeFirst();

    if (!item) {
      throw new NotFoundException(`البند المرجعي برقم ${id} غير موجود`);
    }

    const updates: any = { updated_at: new Date() };
    if (dto.name !== undefined) updates.name = dto.name.trim();
    if (dto.tradeCategory !== undefined) updates.trade_category = dto.tradeCategory.trim();
    if (dto.tradeNameAr !== undefined) updates.trade_name_ar = dto.tradeNameAr.trim();
    if (dto.description !== undefined) updates.description = dto.description.trim();
    if (dto.unit !== undefined) updates.unit = dto.unit.trim();
    if (dto.standardCost !== undefined) updates.standard_cost = dto.standardCost;
    if (dto.standardPrice !== undefined) updates.standard_price = dto.standardPrice;
    if (dto.isActive !== undefined) updates.is_active = dto.isActive;

    if (item.tenant_id === tenantId) {
      const updated = await (this.db as any)
        .updateTable('contracting_master_boq_library')
        .set(updates)
        .where('id', '=', id as any)
        .returningAll()
        .executeTakeFirst();
      return updated;
    } else {
      // Standard item: create/update tenant-specific override
      const merged = {
        trade_category: updates.trade_category || item.trade_category,
        trade_name_ar: updates.trade_name_ar || item.trade_name_ar,
        item_code: item.item_code,
        name: updates.name || item.name,
        description: updates.description !== undefined ? updates.description : item.description,
        unit: updates.unit || item.unit,
        standard_cost: updates.standard_cost !== undefined ? updates.standard_cost : item.standard_cost,
        standard_price: updates.standard_price !== undefined ? updates.standard_price : item.standard_price,
        is_active: updates.is_active !== undefined ? updates.is_active : item.is_active,
      };

      const override = await sql<any>`
        INSERT INTO contracting_master_boq_library (
          tenant_id, trade_category, trade_name_ar, item_code, name, description, unit, standard_cost, standard_price, is_active
        ) VALUES (
          ${tenantId}, ${merged.trade_category}, ${merged.trade_name_ar}, ${merged.item_code}, ${merged.name}, ${merged.description}, ${merged.unit}, ${merged.standard_cost}, ${merged.standard_price}, ${merged.is_active}
        )
        ON CONFLICT (tenant_id, item_code) DO UPDATE SET
          name = EXCLUDED.name,
          trade_category = EXCLUDED.trade_category,
          trade_name_ar = EXCLUDED.trade_name_ar,
          description = EXCLUDED.description,
          unit = EXCLUDED.unit,
          standard_cost = EXCLUDED.standard_cost,
          standard_price = EXCLUDED.standard_price,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
        RETURNING *;
      `.execute(this.db);
      return override.rows[0];
    }
  }

  async toggleMasterBoqItemStatus(auth: AuthContext, id: string, targetActive?: boolean) {
    const { tenantId } = requireTenantScope(auth);
    const item = await (this.db as any)
      .selectFrom('contracting_master_boq_library')
      .selectAll()
      .where('id', '=', id as any)
      .where((eb: any) => eb.or([eb('tenant_id', '=', tenantId), eb('tenant_id', '=', '')]))
      .executeTakeFirst();

    if (!item) {
      throw new NotFoundException('البند المرجعي غير موجود');
    }

    const newStatus = targetActive !== undefined ? targetActive : !Boolean(item.is_active);

    if (item.tenant_id === tenantId) {
      const updated = await (this.db as any)
        .updateTable('contracting_master_boq_library')
        .set({ is_active: newStatus, updated_at: new Date() })
        .where('id', '=', id as any)
        .returningAll()
        .executeTakeFirst();
      return { success: true, isActive: newStatus, item: updated };
    } else {
      const override = await sql<any>`
        INSERT INTO contracting_master_boq_library (
          tenant_id, trade_category, trade_name_ar, item_code, name, description, unit, standard_cost, standard_price, is_active
        ) VALUES (
          ${tenantId}, ${item.trade_category}, ${item.trade_name_ar}, ${item.item_code}, ${item.name}, ${item.description}, ${item.unit}, ${item.standard_cost}, ${item.standard_price}, ${newStatus}
        )
        ON CONFLICT (tenant_id, item_code) DO UPDATE SET
          is_active = ${newStatus},
          updated_at = NOW()
        RETURNING *;
      `.execute(this.db);
      return { success: true, isActive: newStatus, item: override.rows[0] };
    }
  }

  async deleteMasterBoqItem(auth: AuthContext, id: string) {
    const { tenantId } = requireTenantScope(auth);
    const item = await (this.db as any)
      .selectFrom('contracting_master_boq_library')
      .selectAll()
      .where('id', '=', id as any)
      .where((eb: any) => eb.or([eb('tenant_id', '=', tenantId), eb('tenant_id', '=', '')]))
      .executeTakeFirst();

    if (!item) {
      throw new NotFoundException('البند المرجعي غير موجود');
    }

    if (item.tenant_id === tenantId) {
      await (this.db as any)
        .deleteFrom('contracting_master_boq_library')
        .where('id', '=', id as any)
        .execute();
      return { success: true, message: 'تم حذف البند المرجعي المخصص بنجاح' };
    } else {
      // Standard item: deactivating it for this tenant acts as hiding/excluding it from their company library
      await sql`
        INSERT INTO contracting_master_boq_library (
          tenant_id, trade_category, trade_name_ar, item_code, name, description, unit, standard_cost, standard_price, is_active
        ) VALUES (
          ${tenantId}, ${item.trade_category}, ${item.trade_name_ar}, ${item.item_code}, ${item.name}, ${item.description}, ${item.unit}, ${item.standard_cost}, ${item.standard_price}, false
        )
        ON CONFLICT (tenant_id, item_code) DO UPDATE SET
          is_active = false,
          updated_at = NOW();
      `.execute(this.db);
      return { success: true, message: 'تم استبعاد وإخفاء البند القياسي من مكتبة بنود الشركة' };
    }
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

  // ==========================================================================
  // 25. BOQ CAD Quantity Takeoffs (شيت حصر الكميات الهندسي باللوحات والأبعاد)
  // ==========================================================================

  async getTakeoffsByBoqItem(auth: AuthContext, boqItemId: string) {
    const { tenantId } = requireTenantScope(auth);
    const rows = await (this.db as any)
      .selectFrom('contracting_boq_takeoffs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('boq_item_id', '=', boqItemId as any)
      .orderBy('id', 'asc')
      .execute();

    return rows.map((r: any) => ({
      id: String(r.id),
      projectId: String(r.project_id),
      boqItemId: String(r.boq_item_id),
      drawingRef: r.drawing_ref || '',
      axisRef: r.axis_ref || '',
      description: r.description || '',
      length: Number(r.length || 0),
      width: Number(r.width || 0),
      height: Number(r.height || 0),
      countMultiplier: Number(r.count_multiplier || 1),
      voidDeduction: Number(r.void_deduction || 0),
      netQty: Number(r.net_qty || 0),
      wastePercent: Number(r.waste_percent || 0),
      totalWithWaste: Number(r.total_with_waste || 0),
      notes: r.notes || null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async saveTakeoffs(auth: AuthContext, boqItemId: string, dto: SaveBoqTakeoffsDto) {
    const { tenantId } = requireTenantScope(auth);
    const boqItem = await (this.db as any)
      .selectFrom('contracting_boq_items')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', boqItemId as any)
      .executeTakeFirst();

    if (!boqItem) {
      throw new NotFoundException('بند المقايسة غير موجود');
    }

    // Delete existing takeoffs for this item
    await (this.db as any)
      .deleteFrom('contracting_boq_takeoffs')
      .where('tenant_id', '=', tenantId)
      .where('boq_item_id', '=', boqItemId as any)
      .execute();

    let totalCalculatedQty = 0;
    const insertedList: any[] = [];

    for (const t of dto.takeoffs || []) {
      const len = Number(t.length || 0);
      const wid = Number(t.width || 1);
      const hgt = Number(t.height || 1);
      const count = Number(t.countMultiplier || 1);
      const voidDed = Number(t.voidDeduction || 0);
      const waste = Number(t.wastePercent || 0);

      // Geometric volume/area calculation
      const baseProduct = len * wid * hgt * count;
      const net = Math.max(0, baseProduct - voidDed);
      const total = net * (1 + waste / 100);
      totalCalculatedQty += total;

      const ins = await (this.db as any)
        .insertInto('contracting_boq_takeoffs')
        .values({
          tenant_id: tenantId,
          project_id: boqItem.project_id,
          boq_item_id: boqItemId as any,
          drawing_ref: t.drawingRef || '',
          axis_ref: t.axisRef || '',
          description: t.description,
          length: len,
          width: wid,
          height: hgt,
          count_multiplier: count,
          void_deduction: voidDed,
          net_qty: Math.round((net + Number.EPSILON) * 1000) / 1000,
          waste_percent: waste,
          total_with_waste: Math.round((total + Number.EPSILON) * 1000) / 1000,
          notes: t.notes || null,
        })
        .returningAll()
        .executeTakeFirst();

      if (ins) insertedList.push(ins);
    }

    // If sync requested or default, update BOQ contract_qty and total_price
    if (dto.syncToBoqQuantity !== false && insertedList.length > 0) {
      const roundedQty = Math.round((totalCalculatedQty + Number.EPSILON) * 1000) / 1000;
      const unitPrice = Number(boqItem.unit_price || 0);
      const totalPrice = roundedQty * unitPrice;

      await (this.db as any)
        .updateTable('contracting_boq_items')
        .set({
          contract_qty: roundedQty,
          revised_qty: roundedQty,
          total_price: totalPrice,
          updated_at: new Date() as any,
        })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', boqItemId as any)
        .execute();
    }

    return {
      success: true,
      totalCalculatedQty: Math.round((totalCalculatedQty + Number.EPSILON) * 1000) / 1000,
      count: insertedList.length,
      takeoffs: insertedList,
    };
  }

  // ==========================================================================
  // 26. Site Mobilization & Worker Housing Expenses (تجهيز الموقع والمصاريف التأسيسية)
  // ==========================================================================

  async getMobilizationExpenses(auth: AuthContext, projectId: string) {
    const { tenantId } = requireTenantScope(auth);
    const rows = await (this.db as any)
      .selectFrom('contracting_site_mobilization_expenses')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .orderBy('expense_date', 'desc')
      .execute();

    const totalAmount = rows.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);

    return {
      projectId,
      totalAmount,
      itemsCount: rows.length,
      expenses: rows.map((r: any) => ({
        id: String(r.id),
        projectId: String(r.project_id),
        expenseCategory: r.expense_category,
        title: r.title,
        amount: Number(r.amount || 0),
        expenseDate: r.expense_date,
        paidTo: r.paid_to,
        paymentMethod: r.payment_method,
        referenceReceipt: r.reference_receipt,
        notes: r.notes,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    };
  }

  async createMobilizationExpense(auth: AuthContext, projectId: string, dto: CreateSiteMobilizationExpenseDto) {
    const { tenantId } = requireTenantScope(auth);
    await this.getProjectById(auth, projectId);

    const [inserted] = await (this.db as any)
      .insertInto('contracting_site_mobilization_expenses')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        expense_category: dto.expenseCategory,
        title: dto.title.trim(),
        amount: Number(dto.amount || 0),
        expense_date: dto.expenseDate || new Date().toISOString().split('T')[0],
        paid_to: dto.paidTo.trim(),
        payment_method: dto.paymentMethod || 'petty_cash',
        reference_receipt: dto.referenceReceipt || null,
        notes: dto.notes || null,
      })
      .returningAll()
      .execute();

    return inserted;
  }

  async deleteMobilizationExpense(auth: AuthContext, id: string) {
    const { tenantId } = requireTenantScope(auth);
    await (this.db as any)
      .deleteFrom('contracting_site_mobilization_expenses')
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .execute();

    return { success: true };
  }

  // ==========================================================================
  // 27. Labor Attendance, Overtime & Bonus/Deduction Records (كشوف يوميات العمالة والسهرات)
  // ==========================================================================

  async getLaborAttendanceRecords(auth: AuthContext, projectId: string, date?: string) {
    const { tenantId } = requireTenantScope(auth);
    let q = (this.db as any)
      .selectFrom('contracting_labor_attendance_records as l')
      .leftJoin('contracting_boq_items as b', 'b.id', 'l.boq_item_id')
      .select([
        'l.id',
        'l.project_id',
        'l.boq_item_id',
        'b.item_code as boq_item_code',
        'b.description as boq_description',
        'l.worker_name',
        'l.worker_role',
        'l.attendance_date',
        'l.status',
        'l.daily_base_wage',
        'l.overtime_hours',
        'l.overtime_rate_per_hour',
        'l.night_shift_allowance',
        'l.bonus_amount',
        'l.deduction_amount',
        'l.total_payable',
        'l.is_paid',
        'l.payment_batch_ref',
        'l.notes',
        'l.created_at',
        'l.updated_at',
      ])
      .where('l.tenant_id', '=', tenantId)
      .where('l.project_id', '=', projectId as any);

    if (date) {
      q = q.where('l.attendance_date', '=', date);
    }

    const rows = await q.orderBy('l.attendance_date', 'desc').orderBy('l.worker_name', 'asc').execute();
    const totalPayable = rows.reduce((sum: number, r: any) => sum + Number(r.total_payable || 0), 0);
    const totalOvertimeHours = rows.reduce((sum: number, r: any) => sum + Number(r.overtime_hours || 0), 0);

    return {
      projectId,
      totalPayable,
      totalOvertimeHours,
      recordsCount: rows.length,
      records: rows.map((r: any) => ({
        id: String(r.id),
        projectId: String(r.project_id),
        boqItemId: r.boq_item_id ? String(r.boq_item_id) : null,
        boqItemCode: r.boq_item_code || null,
        boqDescription: r.boq_description || null,
        workerName: r.worker_name,
        workerRole: r.worker_role,
        attendanceDate: r.attendance_date,
        status: r.status,
        dailyBaseWage: Number(r.daily_base_wage || 0),
        overtimeHours: Number(r.overtime_hours || 0),
        overtimeRatePerHour: Number(r.overtime_rate_per_hour || 0),
        nightShiftAllowance: Number(r.night_shift_allowance || 0),
        bonusAmount: Number(r.bonus_amount || 0),
        deductionAmount: Number(r.deduction_amount || 0),
        totalPayable: Number(r.total_payable || 0),
        isPaid: Boolean(r.is_paid),
        paymentBatchRef: r.payment_batch_ref,
        notes: r.notes,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    };
  }

  async recordLaborAttendance(auth: AuthContext, projectId: string, dto: RecordLaborAttendanceRecordDto) {
    const { tenantId } = requireTenantScope(auth);
    await this.getProjectById(auth, projectId);

    const baseWage = Number(dto.dailyBaseWage || 0);
    const otHours = Number(dto.overtimeHours || 0);
    const otRate = Number(dto.overtimeRatePerHour || 0);
    const nightShift = Number(dto.nightShiftAllowance || 0);
    const bonus = Number(dto.bonusAmount || 0);
    const deduction = Number(dto.deductionAmount || 0);

    const statusFactor = dto.status === 'absent' ? 0 : dto.status === 'half_day' ? 0.5 : 1.0;
    const earnedBase = baseWage * statusFactor;
    const totalPayable = Math.max(0, earnedBase + otHours * otRate + nightShift + bonus - deduction);

    const [inserted] = await (this.db as any)
      .insertInto('contracting_labor_attendance_records')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        boq_item_id: dto.boqItemId ? (dto.boqItemId as any) : null,
        worker_name: dto.workerName.trim(),
        worker_role: dto.workerRole || 'technician',
        attendance_date: dto.attendanceDate || new Date().toISOString().split('T')[0],
        status: dto.status || 'present',
        daily_base_wage: baseWage,
        overtime_hours: otHours,
        overtime_rate_per_hour: otRate,
        night_shift_allowance: nightShift,
        bonus_amount: bonus,
        deduction_amount: deduction,
        total_payable: Math.round((totalPayable + Number.EPSILON) * 100) / 100,
        is_paid: Boolean(dto.isPaid),
        payment_batch_ref: dto.paymentBatchRef || null,
        notes: dto.notes || null,
      })
      .returningAll()
      .execute();

    return inserted;
  }

  async deleteLaborAttendanceRecord(auth: AuthContext, id: string) {
    const { tenantId } = requireTenantScope(auth);
    await (this.db as any)
      .deleteFrom('contracting_labor_attendance_records')
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .execute();

    return { success: true };
  }

  // ==========================================================================
  // 28. Client Payment Milestones & In-Kind Barter Settlements (جدول الدفعات والمقايضة العينية)
  // ==========================================================================

  async getClientPaymentMilestones(auth: AuthContext, projectId: string) {
    const { tenantId } = requireTenantScope(auth);
    const rows = await (this.db as any)
      .selectFrom('contracting_client_payment_milestones')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .orderBy('due_date', 'asc')
      .execute();

    const totalScheduled = rows.reduce((sum: number, r: any) => sum + Number(r.scheduled_amount || 0), 0);
    const totalReceived = rows.reduce((sum: number, r: any) => sum + Number(r.received_amount || 0), 0);
    const totalInKindSettled = rows.reduce((sum: number, r: any) => sum + Number(r.in_kind_valuation || 0), 0);

    return {
      projectId,
      totalScheduled,
      totalReceived,
      totalInKindSettled,
      milestones: rows.map((r: any) => ({
        id: String(r.id),
        projectId: String(r.project_id),
        milestoneName: r.milestone_name,
        dueDate: r.due_date,
        requiredProgressPercent: Number(r.required_progress_percent || 0),
        scheduledAmount: Number(r.scheduled_amount || 0),
        receivedAmount: Number(r.received_amount || 0),
        settlementType: r.settlement_type,
        inKindUnitRef: r.in_kind_unit_ref,
        inKindValuation: Number(r.in_kind_valuation || 0),
        status: r.status,
        settledAt: r.settled_at,
        notes: r.notes,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    };
  }

  async createClientPaymentMilestone(auth: AuthContext, projectId: string, dto: CreateClientPaymentMilestoneDto) {
    const { tenantId } = requireTenantScope(auth);
    await this.getProjectById(auth, projectId);

    const [inserted] = await (this.db as any)
      .insertInto('contracting_client_payment_milestones')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        milestone_name: dto.milestoneName.trim(),
        due_date: dto.dueDate || null,
        required_progress_percent: Number(dto.requiredProgressPercent || 0),
        scheduled_amount: Number(dto.scheduledAmount || 0),
        received_amount: 0,
        settlement_type: dto.settlementType || 'cash',
        status: 'pending',
        notes: dto.notes || null,
      })
      .returningAll()
      .execute();

    return inserted;
  }

  async recordInKindBarterDeduction(auth: AuthContext, milestoneId: string, dto: RecordInKindBarterDeductionDto) {
    const { tenantId } = requireTenantScope(auth);
    const milestone = await (this.db as any)
      .selectFrom('contracting_client_payment_milestones')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', milestoneId as any)
      .executeTakeFirst();

    if (!milestone) {
      throw new NotFoundException('دفعة العميل غير موجودة');
    }

    const valuation = Number(dto.inKindValuation || 0);

    const [updated] = await (this.db as any)
      .updateTable('contracting_client_payment_milestones')
      .set({
        settlement_type: 'in_kind_unit',
        in_kind_unit_ref: dto.inKindUnitRef.trim(),
        in_kind_valuation: valuation,
        received_amount: valuation,
        status: 'in_kind_settled',
        settled_at: new Date() as any,
        notes: dto.notes ? `${milestone.notes || ''} [مقايضة عينية: ${dto.notes}]` : milestone.notes,
        updated_at: new Date() as any,
      })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', milestoneId as any)
      .returningAll()
      .execute();

    return updated;
  }

  async deleteClientPaymentMilestone(auth: AuthContext, id: string) {
    const { tenantId } = requireTenantScope(auth);
    await (this.db as any)
      .deleteFrom('contracting_client_payment_milestones')
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .execute();

    return { success: true };
  }

  // ==========================================================================
  // 29. Equipment & Tools Asset Tracking (سجل وتتبع العِدة والمعدات بالمشاريع)
  // ==========================================================================

  async getEquipmentAssets(auth: AuthContext, query?: { projectId?: string; operationalStatus?: string; search?: string }) {
    const { tenantId } = requireTenantScope(auth);
    let q = (this.db as any)
      .selectFrom('contracting_equipment_assets as e')
      .leftJoin('contracting_projects as p', 'p.id', 'e.current_project_id')
      .select([
        'e.id',
        'e.asset_code',
        'e.name',
        'e.category',
        'e.serial_number',
        'e.current_project_id',
        'p.name as current_project_name',
        'e.current_location_desc',
        'e.assigned_supervisor',
        'e.operational_status',
        'e.purchase_cost',
        'e.purchase_date',
        'e.notes',
        'e.created_at',
        'e.updated_at',
      ])
      .where('e.tenant_id', '=', tenantId);

    if (query?.projectId) {
      q = q.where('e.current_project_id', '=', query.projectId as any);
    }

    if (query?.operationalStatus) {
      q = q.where('e.operational_status', '=', query.operationalStatus);
    }

    if (query?.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where((eb: any) =>
        eb.or([
          eb('e.asset_code', 'ilike', s),
          eb('e.name', 'ilike', s),
          eb('e.assigned_supervisor', 'ilike', s),
          eb('e.current_location_desc', 'ilike', s),
        ])
      );
    }

    const rows = await q.orderBy('e.asset_code', 'asc').execute();
    return rows.map((r: any) => ({
      id: String(r.id),
      assetCode: r.asset_code,
      name: r.name,
      category: r.category,
      serialNumber: r.serial_number,
      currentProjectId: r.current_project_id ? String(r.current_project_id) : null,
      currentProjectName: r.current_project_name || null,
      currentLocationDesc: r.current_location_desc,
      assignedSupervisor: r.assigned_supervisor,
      operationalStatus: r.operational_status,
      purchaseCost: Number(r.purchase_cost || 0),
      purchaseDate: r.purchase_date,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async createEquipmentAsset(auth: AuthContext, dto: CreateEquipmentAssetDto) {
    const { tenantId } = requireTenantScope(auth);
    const [inserted] = await (this.db as any)
      .insertInto('contracting_equipment_assets')
      .values({
        tenant_id: tenantId,
        asset_code: dto.assetCode.trim().toUpperCase(),
        name: dto.name.trim(),
        category: dto.category || 'heavy_machinery',
        serial_number: dto.serialNumber || null,
        current_project_id: dto.currentProjectId ? (dto.currentProjectId as any) : null,
        current_location_desc: dto.currentLocationDesc || 'المخزن الرئيسي',
        assigned_supervisor: dto.assignedSupervisor || null,
        operational_status: dto.operationalStatus || 'active_working',
        purchase_cost: Number(dto.purchaseCost || 0),
        purchase_date: dto.purchaseDate || null,
        notes: dto.notes || null,
      })
      .returningAll()
      .execute();

    return inserted;
  }

  async transferEquipmentAsset(auth: AuthContext, equipmentId: string, dto: TransferEquipmentAssetDto) {
    const { tenantId } = requireTenantScope(auth);
    const equip = await (this.db as any)
      .selectFrom('contracting_equipment_assets')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', equipmentId as any)
      .executeTakeFirst();

    if (!equip) {
      throw new NotFoundException('المعدة / العِدة غير موجودة');
    }

    const toProj = await this.getProjectById(auth, dto.toProjectId);

    // 1. Record transfer in ledger
    await (this.db as any)
      .insertInto('contracting_equipment_transfers')
      .values({
        tenant_id: tenantId,
        equipment_id: equipmentId as any,
        from_project_id: equip.current_project_id,
        to_project_id: dto.toProjectId as any,
        transfer_date: dto.transferDate || new Date().toISOString().split('T')[0],
        dispatched_by: dto.dispatchedBy.trim(),
        received_by: dto.receivedBy.trim(),
        condition_on_dispatch: dto.conditionOnDispatch || 'good',
        condition_on_receipt: dto.conditionOnReceipt || 'good',
        notes: dto.notes || null,
      })
      .execute();

    // 2. Update current asset location and project
    const [updated] = await (this.db as any)
      .updateTable('contracting_equipment_assets')
      .set({
        current_project_id: dto.toProjectId as any,
        current_location_desc: `موقع مشروع: ${toProj.name}`,
        assigned_supervisor: dto.receivedBy.trim(),
        updated_at: new Date() as any,
      })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', equipmentId as any)
      .returningAll()
      .execute();

    return updated;
  }

  async getEquipmentTransfers(auth: AuthContext, equipmentId?: string) {
    const { tenantId } = requireTenantScope(auth);
    let q = (this.db as any)
      .selectFrom('contracting_equipment_transfers as t')
      .innerJoin('contracting_equipment_assets as e', 'e.id', 't.equipment_id')
      .leftJoin('contracting_projects as pFrom', 'pFrom.id', 't.from_project_id')
      .leftJoin('contracting_projects as pTo', 'pTo.id', 't.to_project_id')
      .select([
        't.id',
        't.equipment_id',
        'e.asset_code as equipment_code',
        'e.name as equipment_name',
        't.from_project_id',
        'pFrom.name as from_project_name',
        't.to_project_id',
        'pTo.name as to_project_name',
        't.transfer_date',
        't.dispatched_by',
        't.received_by',
        't.condition_on_dispatch',
        't.condition_on_receipt',
        't.notes',
        't.created_at',
      ])
      .where('t.tenant_id', '=', tenantId);

    if (equipmentId) {
      q = q.where('t.equipment_id', '=', equipmentId as any);
    }

    const rows = await q.orderBy('t.transfer_date', 'desc').orderBy('t.created_at', 'desc').execute();
    return rows.map((r: any) => ({
      id: String(r.id),
      equipmentId: String(r.equipment_id),
      equipmentCode: r.equipment_code,
      equipmentName: r.equipment_name,
      fromProjectId: r.from_project_id ? String(r.from_project_id) : null,
      fromProjectName: r.from_project_name || 'المخزن الرئيسي',
      toProjectId: r.to_project_id ? String(r.to_project_id) : null,
      toProjectName: r.to_project_name || 'المخزن الرئيسي',
      transferDate: r.transfer_date,
      dispatchedBy: r.dispatched_by,
      receivedBy: r.received_by,
      conditionOnDispatch: r.condition_on_dispatch,
      conditionOnReceipt: r.condition_on_receipt,
      notes: r.notes,
      createdAt: r.created_at,
    }));
  }

  // ==========================================================================
  // 30. Supplier Price Memory & Directory (دليل الموردين والذاكرة السعرية والتقييم)
  // ==========================================================================

  async getSupplierPriceMemory(auth: AuthContext, query?: { supplierId?: number; materialName?: string; governorate?: string; paymentTerms?: string }) {
    const { tenantId } = requireTenantScope(auth);
    let q = (this.db as any)
      .selectFrom('contracting_supplier_price_memory as m')
      .leftJoin('contracting_projects as p', 'p.id', 'm.last_project_id')
      .select([
        'm.id',
        'm.supplier_id',
        'm.supplier_name',
        'm.material_name',
        'm.unit',
        'm.last_unit_price',
        'm.last_purchase_date',
        'm.last_project_id',
        'p.name as last_project_name',
        'm.governorate',
        'm.payment_terms',
        'm.quality_rating',
        'm.delivery_speed_rating',
        'm.notes',
        'm.created_at',
        'm.updated_at',
      ])
      .where('m.tenant_id', '=', tenantId);

    if (query?.supplierId) {
      q = q.where('m.supplier_id', '=', query.supplierId);
    }
    if (query?.materialName) {
      q = q.where('m.material_name', 'ilike', `%${query.materialName.trim()}%`);
    }
    if (query?.governorate && query.governorate !== 'all') {
      q = q.where('m.governorate', '=', query.governorate);
    }
    if (query?.paymentTerms && query.paymentTerms !== 'all') {
      q = q.where('m.payment_terms', '=', query.paymentTerms);
    }

    const rows = await q.orderBy('m.last_purchase_date', 'desc').execute();
    return rows.map((r: any) => ({
      id: String(r.id),
      supplierId: Number(r.supplier_id),
      supplierName: r.supplier_name,
      materialName: r.material_name,
      unit: r.unit,
      lastUnitPrice: Number(r.last_unit_price || 0),
      lastPurchaseDate: r.last_purchase_date,
      lastProjectId: r.last_project_id ? String(r.last_project_id) : null,
      lastProjectName: r.last_project_name || null,
      governorate: r.governorate,
      paymentTerms: r.payment_terms,
      qualityRating: Number(r.quality_rating || 5.0),
      deliverySpeedRating: Number(r.delivery_speed_rating || 5.0),
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async recordSupplierPriceMemory(auth: AuthContext, dto: RecordSupplierPriceMemoryDto) {
    const { tenantId } = requireTenantScope(auth);
    const existing = await (this.db as any)
      .selectFrom('contracting_supplier_price_memory')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('supplier_id', '=', dto.supplierId)
      .where('material_name', '=', dto.materialName.trim())
      .executeTakeFirst();

    if (existing) {
      const [updated] = await (this.db as any)
        .updateTable('contracting_supplier_price_memory')
        .set({
          unit: dto.unit || existing.unit,
          last_unit_price: Number(dto.lastUnitPrice),
          last_purchase_date: dto.lastPurchaseDate || new Date().toISOString().split('T')[0],
          last_project_id: dto.lastProjectId ? (dto.lastProjectId as any) : existing.last_project_id,
          governorate: dto.governorate || existing.governorate,
          payment_terms: dto.paymentTerms || existing.payment_terms,
          quality_rating: dto.qualityRating !== undefined ? Number(dto.qualityRating) : existing.quality_rating,
          delivery_speed_rating: dto.deliverySpeedRating !== undefined ? Number(dto.deliverySpeedRating) : existing.delivery_speed_rating,
          notes: dto.notes || existing.notes,
          updated_at: new Date() as any,
        })
        .where('id', '=', existing.id)
        .returningAll()
        .execute();

      return updated;
    } else {
      const [inserted] = await (this.db as any)
        .insertInto('contracting_supplier_price_memory')
        .values({
          tenant_id: tenantId,
          supplier_id: dto.supplierId,
          supplier_name: 'مورد معتمد',
          material_name: dto.materialName.trim(),
          unit: dto.unit || 'item',
          last_unit_price: Number(dto.lastUnitPrice),
          last_purchase_date: dto.lastPurchaseDate || new Date().toISOString().split('T')[0],
          last_project_id: dto.lastProjectId ? (dto.lastProjectId as any) : null,
          governorate: dto.governorate || 'القاهرة',
          payment_terms: dto.paymentTerms || 'cash',
          quality_rating: Number(dto.qualityRating ?? 5.0),
          delivery_speed_rating: Number(dto.deliverySpeedRating ?? 5.0),
          notes: dto.notes || null,
        })
        .returningAll()
        .execute();

      return inserted;
    }
  }

  // ==========================================================================
  // 31. Item-Level Direct Cost & Profitability Ledger (ربحية البند اللحظية)
  // ==========================================================================

  async getItemProfitabilityLedger(auth: AuthContext, projectId: string) {
    const { tenantId } = requireTenantScope(auth);
    await this.getProjectById(auth, projectId);

    const boqItems = await this.getBoqItems(auth, projectId);
    
    // Fetch materials tagged with boq_item_id
    const materials = await (this.db as any)
      .selectFrom('contracting_material_requisitions')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .execute();

    // Fetch labor wages tagged with boq_item_id
    const laborRecords = await (this.db as any)
      .selectFrom('contracting_labor_attendance_records')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .execute();

    // Fetch site mobilization total
    const mobRes = await this.getMobilizationExpenses(auth, projectId);
    const totalMobilization = mobRes.totalAmount;
    const nonHeaderCount = boqItems.filter((i: any) => !i.isSectionHeader && !i.is_section_header).length || 1;
    const mobilizationPerItem = totalMobilization / nonHeaderCount;

    const analyzedItems = boqItems.map((item: any) => {
      const contractQty = Number(item.revisedQty || item.contractQty || item.contract_qty || 0);
      const unitPrice = Number(item.unitPrice || item.unit_price || 0);
      const totalRevenue = contractQty * unitPrice;

      // Sum materials cost for this item
      const itemMaterials = materials.filter((m: any) => String(m.boq_item_id) === String(item.id));
      const materialsCost = itemMaterials.reduce((sum: number, m: any) => sum + Number(m.estimated_cost || 0), 0);

      // Sum labor cost for this item
      const itemLabor = laborRecords.filter((l: any) => String(l.boq_item_id) === String(item.id));
      const laborCost = itemLabor.reduce((sum: number, l: any) => sum + Number(l.total_payable || 0), 0);

      const subcontractsCost = 0; // Linked via subcontractor subcontracts if assigned
      const allocatedMobCost = (item.isSectionHeader || item.is_section_header) ? 0 : mobilizationPerItem;
      const totalActualCost = materialsCost + laborCost + subcontractsCost + allocatedMobCost;

      const grossProfit = totalRevenue - totalActualCost;
      const profitMarginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

      return {
        boqItemId: String(item.id),
        itemCode: item.itemCode,
        description: item.description,
        unit: item.unit,
        contractQty,
        revisedQty: contractQty,
        unitPrice,
        totalContractRevenue: totalRevenue,
        materialsCost,
        laborCost,
        subcontractsCost,
        allocatedMobilizationCost: Math.round(allocatedMobCost * 100) / 100,
        totalActualCost: Math.round(totalActualCost * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        profitMarginPercent,
        isProfitable: grossProfit >= 0,
      };
    });

    const totalRevenue = analyzedItems.reduce((s, i) => s + i.totalContractRevenue, 0);
    const totalActualCost = analyzedItems.reduce((s, i) => s + i.totalActualCost, 0);
    const totalProfit = totalRevenue - totalActualCost;
    const overallMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

    return {
      projectId,
      totalRevenue,
      totalActualCost,
      totalProfit,
      overallMarginPercent: overallMargin,
      items: analyzedItems,
    };
  }

  // ==========================================================================
  // 32. Comprehensive Project Actual Cost Breakdown (تحليل التكاليف الفعلية ومقارنة الميزانية)
  // ==========================================================================

  async getProjectCostBreakdown(auth: AuthContext, projectId: string): Promise<ContractingProjectCostBreakdown> {
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

    // 1. Latest Cost Baseline
    const latestSnapshot = await (this.db as any)
      .selectFrom('contracting_cost_snapshots')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .orderBy('created_at', 'desc')
      .executeTakeFirst();
    const costBaseline = Number(latestSnapshot?.total_budget_cost || project.contract_value || 0);

    // 2. Total Billed Client (Approved client invoices)
    const billedClientRes = await this.db
      .selectFrom('contracting_invoices')
      .select(sql<number>`COALESCE(SUM(current_amount + stored_materials_amount), 0)`.as('sum'))
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .where('ipc_type', '=', 'client')
      .where('status', 'in', ['approved', 'paid'])
      .executeTakeFirst();
    const totalBilledClient = Number(billedClientRes?.sum || 0);

    // 3. Materials Cost from Requisitions
    const materialsCostRes = await this.db
      .selectFrom('contracting_material_requisitions')
      .select(sql<number>`COALESCE(SUM(total_cost), 0)`.as('sum'))
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .executeTakeFirst();
    const materialsCost = Number(materialsCostRes?.sum || 0);

    // 4. Labor Cost from Attendance Records
    const laborCostRes = await (this.db as any)
      .selectFrom('contracting_labor_attendance_records')
      .select(sql<number>`COALESCE(SUM(total_payable), 0)`.as('sum'))
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .executeTakeFirst();
    const laborCost = Number(laborCostRes?.sum || 0);

    // 5. Subcontracts Cost from Subcontractor Invoices (or committed subcontracts)
    const subcontractsCostRes = await this.db
      .selectFrom('contracting_invoices')
      .select(sql<number>`COALESCE(SUM(current_amount + stored_materials_amount), 0)`.as('sum'))
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .where('ipc_type', '=', 'subcontractor')
      .where('status', 'in', ['approved', 'paid'])
      .executeTakeFirst();
    let subcontractsCost = Number(subcontractsCostRes?.sum || 0);
    if (subcontractsCost === 0) {
      const subCommitments = await this.db
        .selectFrom('contracting_subcontracts')
        .select(sql<number>`COALESCE(SUM(total_amount), 0)`.as('sum'))
        .where('tenant_id', '=', tenantId)
        .where('project_id', '=', projectId as any)
        .where('status', '=', 'active')
        .executeTakeFirst();
      subcontractsCost = Number(subCommitments?.sum || 0);
    }

    // 6. Mobilization & Setup Expenses
    const mobilizationCostRes = await (this.db as any)
      .selectFrom('contracting_site_mobilization_expenses')
      .select(sql<number>`COALESCE(SUM(amount), 0)`.as('sum'))
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .executeTakeFirst();
    const mobilizationCost = Number(mobilizationCostRes?.sum || 0);

    // 7. Petty Cash Settled Expenses
    const pettyCashRes = await (this.db as any)
      .selectFrom('contracting_petty_cash')
      .select(sql<number>`COALESCE(SUM(spent_amount), 0)`.as('sum'))
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .where('status', '=', 'settled')
      .executeTakeFirst();
    const pettyCashCost = Number(pettyCashRes?.sum || 0);

    const totalActualCost = Math.round((materialsCost + laborCost + subcontractsCost + mobilizationCost + pettyCashCost) * 100) / 100;
    const costVariance = Math.round((totalActualCost - costBaseline) * 100) / 100;
    const revenueBasis = totalBilledClient > 0 ? totalBilledClient : Number(project.contract_value);
    const actualGrossProfit = Math.round((revenueBasis - totalActualCost) * 100) / 100;
    const actualProfitMarginPercent = revenueBasis > 0 ? Math.round((actualGrossProfit / revenueBasis) * 100) : 0;

    const safeTotal = totalActualCost > 0 ? totalActualCost : 1;
    const costDistribution = {
      materialsPercent: Math.round((materialsCost / safeTotal) * 100),
      laborPercent: Math.round((laborCost / safeTotal) * 100),
      subcontractsPercent: Math.round((subcontractsCost / safeTotal) * 100),
      mobilizationPercent: Math.round((mobilizationCost / safeTotal) * 100),
      pettyCashPercent: Math.round((pettyCashCost / safeTotal) * 100),
    };

    return {
      projectId: String(project.id),
      projectCode: project.code,
      projectName: project.name,
      contractValue: Number(project.contract_value),
      revisedContractValue: Number(project.revised_contract_value),
      costBaseline,
      totalBilledClient,
      materialsCost,
      laborCost,
      subcontractsCost,
      mobilizationCost,
      pettyCashCost,
      totalActualCost,
      costVariance,
      actualGrossProfit,
      actualProfitMarginPercent,
      costDistribution,
    };
  }

  // ==========================================================================
  // 33. Work Inspection Requests (WIR - طلبات فحص واستلام الأعمال الإنشائية)
  // ==========================================================================

  async getInspectionRequests(auth: AuthContext, projectId: string, status?: string): Promise<ContractingInspectionRequest[]> {
    const { tenantId } = requireTenantScope(auth);
    let q = (this.db as any)
      .selectFrom('contracting_inspection_requests as w')
      .leftJoin('contracting_boq_items as b', 'b.id', 'w.boq_item_id')
      .leftJoin('contracting_subcontracts as s', 's.id', 'w.subcontract_id')
      .select([
        'w.id',
        'w.project_id',
        'w.wir_number',
        'w.boq_item_id',
        'b.item_code as boq_item_code',
        'b.description as boq_item_description',
        'w.subcontract_id',
        's.contract_number as subcontract_number',
        'w.location_grid',
        'w.trade_category',
        'w.inspection_type',
        'w.scheduled_date',
        'w.status',
        'w.consultant_name',
        'w.consultant_notes',
        'w.inspected_at',
        'w.attachments',
        'w.created_at',
        'w.updated_at',
      ])
      .where('w.tenant_id', '=', tenantId)
      .where('w.project_id', '=', projectId as any);

    if (status && status !== 'all') {
      q = q.where('w.status', '=', status);
    }

    const rows = await q.orderBy('w.scheduled_date', 'desc').orderBy('w.created_at', 'desc').execute();
    return rows.map((r: any) => ({
      id: String(r.id),
      projectId: String(r.project_id),
      wirNumber: r.wir_number,
      boqItemId: r.boq_item_id ? String(r.boq_item_id) : null,
      boqItemCode: r.boq_item_code || null,
      boqItemDescription: r.boq_item_description || null,
      subcontractId: r.subcontract_id ? String(r.subcontract_id) : null,
      subcontractNumber: r.subcontract_number || null,
      locationGrid: r.location_grid,
      tradeCategory: r.trade_category,
      inspectionType: r.inspection_type,
      scheduledDate: r.scheduled_date,
      status: r.status,
      consultantName: r.consultant_name,
      consultantNotes: r.consultant_notes,
      inspectedAt: r.inspected_at,
      attachments: r.attachments,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async createInspectionRequest(auth: AuthContext, projectId: string, dto: CreateInspectionRequestDto): Promise<ContractingInspectionRequest> {
    const { tenantId } = requireTenantScope(auth);
    let wirNumber = dto.wirNumber?.trim().toUpperCase();
    if (!wirNumber) {
      const prefix = getDailyDocumentPrefix('WIR');
      const countRes = await (this.db as any)
        .selectFrom('contracting_inspection_requests')
        .select(sql<number>`count(*)::int`.as('count'))
        .where('tenant_id', '=', tenantId)
        .where('wir_number', 'like', `${prefix}%`)
        .executeTakeFirst();
      const count = (countRes?.count || 0) + 1;
      wirNumber = `${prefix}${String(count).padStart(4, '0')}`;
    }

    const [row] = await (this.db as any)
      .insertInto('contracting_inspection_requests')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        wir_number: wirNumber,
        boq_item_id: dto.boqItemId ? Number(dto.boqItemId) : null,
        subcontract_id: dto.subcontractId ? Number(dto.subcontractId) : null,
        location_grid: dto.locationGrid.trim(),
        trade_category: dto.tradeCategory,
        inspection_type: dto.inspectionType || 'work_inspection',
        scheduled_date: dto.scheduledDate,
        status: 'submitted',
        consultant_name: dto.consultantName || null,
        consultant_notes: dto.consultantNotes || null,
        attachments: dto.attachments || null,
      })
      .returningAll()
      .execute();

    const list = await this.getInspectionRequests(auth, projectId);
    return list.find((i) => i.id === String(row.id)) || (row as any);
  }

  async updateInspectionRequestStatus(auth: AuthContext, id: string, dto: UpdateInspectionRequestStatusDto) {
    const { tenantId } = requireTenantScope(auth);
    const [updated] = await (this.db as any)
      .updateTable('contracting_inspection_requests')
      .set({
        status: dto.status,
        consultant_name: dto.consultantName || undefined,
        consultant_notes: dto.consultantNotes || undefined,
        inspected_at: dto.status !== 'submitted' ? new Date() : null,
        updated_at: new Date(),
      })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .execute();

    if (!updated) {
      throw new NotFoundException(`طلب الفحص برقم ${id} غير موجود`);
    }

    return updated;
  }

  async deleteInspectionRequest(auth: AuthContext, id: string) {
    const { tenantId } = requireTenantScope(auth);
    await (this.db as any)
      .deleteFrom('contracting_inspection_requests')
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .execute();
    return { success: true };
  }

  // ==========================================================================
  // 34. Snag Items & Punch List (قائمة الملاحظات وعيوب المصنعية والتسليم)
  // ==========================================================================

  async getSnagItems(auth: AuthContext, projectId: string, status?: string, severity?: string): Promise<ContractingSnagItem[]> {
    const { tenantId } = requireTenantScope(auth);
    let q = (this.db as any)
      .selectFrom('contracting_snag_items as s')
      .leftJoin('contracting_boq_items as b', 'b.id', 's.boq_item_id')
      .leftJoin('suppliers as sup', 'sup.id', 's.subcontractor_id')
      .select([
        's.id',
        's.project_id',
        's.boq_item_id',
        'b.item_code as boq_item_code',
        's.item_title',
        's.location_desc',
        's.severity',
        's.responsible_party',
        's.subcontractor_id',
        'sup.name as subcontractor_name',
        's.subcontract_id',
        's.assigned_to',
        's.due_date',
        's.status',
        's.rectified_date',
        's.verified_by',
        's.notes',
        's.created_at',
        's.updated_at',
      ])
      .where('s.tenant_id', '=', tenantId)
      .where('s.project_id', '=', projectId as any);

    if (status && status !== 'all') {
      q = q.where('s.status', '=', status);
    }
    if (severity && severity !== 'all') {
      q = q.where('s.severity', '=', severity);
    }

    const rows = await q.orderBy('s.created_at', 'desc').execute();
    return rows.map((r: any) => ({
      id: String(r.id),
      projectId: String(r.project_id),
      boqItemId: r.boq_item_id ? String(r.boq_item_id) : null,
      boqItemCode: r.boq_item_code || null,
      itemTitle: r.item_title,
      locationDesc: r.location_desc,
      severity: r.severity,
      responsibleParty: r.responsible_party,
      subcontractorId: r.subcontractor_id ? Number(r.subcontractor_id) : null,
      subcontractorName: r.subcontractor_name || null,
      subcontractId: r.subcontract_id ? String(r.subcontract_id) : null,
      assignedTo: r.assigned_to,
      dueDate: r.due_date,
      status: r.status,
      rectifiedDate: r.rectified_date,
      verifiedBy: r.verified_by,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async createSnagItem(auth: AuthContext, projectId: string, dto: CreateSnagItemDto): Promise<ContractingSnagItem> {
    const { tenantId } = requireTenantScope(auth);
    const [row] = await (this.db as any)
      .insertInto('contracting_snag_items')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        boq_item_id: dto.boqItemId ? Number(dto.boqItemId) : null,
        item_title: dto.itemTitle.trim(),
        location_desc: dto.locationDesc.trim(),
        severity: dto.severity || 'minor',
        responsible_party: dto.responsibleParty || 'subcontractor',
        subcontractor_id: dto.subcontractorId ? Number(dto.subcontractorId) : null,
        subcontract_id: dto.subcontractId ? Number(dto.subcontractId) : null,
        assigned_to: dto.assignedTo || null,
        due_date: dto.dueDate || null,
        status: 'open',
        notes: dto.notes || null,
      })
      .returningAll()
      .execute();

    const list = await this.getSnagItems(auth, projectId);
    return list.find((s) => s.id === String(row.id)) || (row as any);
  }

  async updateSnagItemStatus(auth: AuthContext, id: string, dto: UpdateSnagItemStatusDto) {
    const { tenantId } = requireTenantScope(auth);
    const [updated] = await (this.db as any)
      .updateTable('contracting_snag_items')
      .set({
        status: dto.status,
        rectified_date: dto.status !== 'open' ? (dto.rectifiedDate || new Date().toISOString().split('T')[0]) : null,
        verified_by: dto.status === 'verified_closed' ? (dto.verifiedBy || auth.username || 'المهندس المشرف') : null,
        notes: dto.notes || undefined,
        updated_at: new Date(),
      })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .execute();

    if (!updated) {
      throw new NotFoundException(`الملاحظة برقم ${id} غير موجودة`);
    }

    return updated;
  }

  async deleteSnagItem(auth: AuthContext, id: string) {
    const { tenantId } = requireTenantScope(auth);
    await (this.db as any)
      .deleteFrom('contracting_snag_items')
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .execute();
    return { success: true };
  }

  // ==========================================================================
  // 35. Project Handovers & Releases (محاضر التسليم الابتدائي والنهائي)
  // ==========================================================================

  async getProjectHandovers(auth: AuthContext, projectId: string): Promise<ContractingProjectHandover[]> {
    const { tenantId } = requireTenantScope(auth);
    const rows = await (this.db as any)
      .selectFrom('contracting_project_handovers')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .orderBy('handover_date', 'desc')
      .execute();

    return rows.map((r: any) => ({
      id: String(r.id),
      projectId: String(r.project_id),
      handoverType: r.handover_type,
      handoverDate: r.handover_date,
      committeeMembers: r.committee_members,
      warrantyStartDate: r.warranty_start_date,
      warrantyEndDate: r.warranty_end_date,
      retentionReleaseAmount: Number(r.retention_release_amount || 0),
      status: r.status,
      certificateRef: r.certificate_ref,
      notes: r.notes,
      approvedBy: r.approved_by,
      approvedAt: r.approved_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async createProjectHandover(auth: AuthContext, projectId: string, dto: CreateProjectHandoverDto): Promise<ContractingProjectHandover> {
    const { tenantId } = requireTenantScope(auth);
    const warrantyStart = dto.warrantyStartDate || dto.handoverDate;
    const d = new Date(warrantyStart);
    d.setFullYear(d.getFullYear() + 1);
    const warrantyEnd = dto.warrantyEndDate || d.toISOString().split('T')[0];

    const [row] = await (this.db as any)
      .insertInto('contracting_project_handovers')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        handover_type: dto.handoverType,
        handover_date: dto.handoverDate,
        committee_members: dto.committeeMembers.trim(),
        warranty_start_date: warrantyStart,
        warranty_end_date: warrantyEnd,
        retention_release_amount: Number(dto.retentionReleaseAmount || 0),
        status: 'draft',
        certificate_ref: dto.certificateRef || null,
        notes: dto.notes || null,
      })
      .returningAll()
      .execute();

    return {
      id: String(row.id),
      projectId: String(row.project_id),
      handoverType: row.handover_type,
      handoverDate: row.handover_date,
      committeeMembers: row.committee_members,
      warrantyStartDate: row.warranty_start_date,
      warrantyEndDate: row.warranty_end_date,
      retentionReleaseAmount: Number(row.retention_release_amount || 0),
      status: row.status,
      certificateRef: row.certificate_ref,
      notes: row.notes,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async approveProjectHandover(auth: AuthContext, id: string, dto: ApproveProjectHandoverDto) {
    const { tenantId } = requireTenantScope(auth);
    const handover = await (this.db as any)
      .selectFrom('contracting_project_handovers')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .executeTakeFirst();

    if (!handover) {
      throw new NotFoundException(`محضر التسليم برقم ${id} غير موجود`);
    }

    const [approved] = await (this.db as any)
      .updateTable('contracting_project_handovers')
      .set({
        status: 'approved',
        approved_by: dto.approvedBy || auth.username || 'الإدارة العليا',
        approved_at: new Date(),
        notes: dto.notes ? `${handover.notes || ''}\n${dto.notes}`.trim() : handover.notes,
        updated_at: new Date(),
      })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .execute();

    if (handover.handover_type === 'preliminary') {
      await this.db
        .updateTable('contracting_projects')
        .set({
          status: 'handed_over',
          actual_end_date: handover.handover_date,
          updated_at: new Date(),
        })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', handover.project_id)
        .execute();
    }

    return approved;
  }

  // ==========================================================================
  // 12. Material & Shop Drawing Submittals (MAR / MAS)
  // ==========================================================================

  async getSubmittals(auth: AuthContext, projectId: string): Promise<ContractingSubmittal[]> {
    const { tenantId } = requireTenantScope(auth);
    const rows = await (this.db as any)
      .selectFrom('contracting_submittals')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map((r: any) => ({
      id: String(r.id),
      projectId: String(r.project_id),
      submittalNumber: r.submittal_number,
      submittalType: r.submittal_type,
      title: r.title,
      specificationSection: r.specification_section,
      supplierManufacturer: r.supplier_manufacturer,
      boqItemId: r.boq_item_id ? String(r.boq_item_id) : null,
      subcontractId: r.subcontract_id ? String(r.subcontract_id) : null,
      submissionDate: r.submission_date,
      reviewDueDate: r.review_due_date,
      consultantReviewDate: r.consultant_review_date,
      status: r.status,
      consultantName: r.consultant_name,
      consultantComments: r.consultant_comments,
      attachments: r.attachments,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async createSubmittal(auth: AuthContext, projectId: string, dto: CreateSubmittalDto): Promise<ContractingSubmittal> {
    const { tenantId } = requireTenantScope(auth);
    const prefix = getDailyDocumentPrefix(dto.submittalType === 'shop_drawing' ? 'DWG-SUB' : 'MAT-SUB');
    const count = ((await (this.db as any)
      .selectFrom('contracting_submittals')
      .select(sql<number>`count(*)::int`.as('count'))
      .where('tenant_id', '=', tenantId)
      .where('submittal_number', 'like', `${prefix}%`)
      .executeTakeFirst())?.count || 0) + 1;
    const submittalNumber = `${prefix}${String(count).padStart(4, '0')}`;

    const [row] = await (this.db as any)
      .insertInto('contracting_submittals')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        submittal_number: submittalNumber,
        submittal_type: dto.submittalType,
        title: dto.title,
        specification_section: dto.specificationSection || null,
        supplier_manufacturer: dto.supplierManufacturer || null,
        boq_item_id: dto.boqItemId ? (dto.boqItemId as any) : null,
        subcontract_id: dto.subcontractId ? (dto.subcontractId as any) : null,
        submission_date: dto.submissionDate || new Date(),
        review_due_date: dto.reviewDueDate || null,
        status: 'submitted',
        attachments: dto.notes || null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returningAll()
      .execute();

    return {
      id: String(row.id),
      projectId: String(row.project_id),
      submittalNumber: row.submittal_number,
      submittalType: row.submittal_type,
      title: row.title,
      specificationSection: row.specification_section,
      supplierManufacturer: row.supplier_manufacturer,
      boqItemId: row.boq_item_id ? String(row.boq_item_id) : null,
      subcontractId: row.subcontract_id ? String(row.subcontract_id) : null,
      submissionDate: row.submission_date,
      reviewDueDate: row.review_due_date,
      consultantReviewDate: row.consultant_review_date,
      status: row.status,
      consultantName: row.consultant_name,
      consultantComments: row.consultant_comments,
      attachments: row.attachments,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateSubmittalStatus(auth: AuthContext, id: string, dto: UpdateSubmittalStatusDto) {
    const { tenantId } = requireTenantScope(auth);
    const [updated] = await (this.db as any)
      .updateTable('contracting_submittals')
      .set({
        status: dto.status,
        consultant_name: dto.consultantName || null,
        consultant_comments: dto.consultantComments || null,
        consultant_review_date: dto.consultantReviewDate || new Date(),
        updated_at: new Date(),
      })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .execute();

    if (!updated) {
      throw new NotFoundException(`طلب الاعتماد برقم ${id} غير موجود`);
    }

    return updated;
  }

  // ==========================================================================
  // 13. Material Price Escalation Claims
  // ==========================================================================

  async getMaterialEscalations(auth: AuthContext, projectId: string): Promise<ContractingMaterialEscalation[]> {
    const { tenantId } = requireTenantScope(auth);
    const rows = await (this.db as any)
      .selectFrom('contracting_material_escalations')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', projectId as any)
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map((r: any) => ({
      id: String(r.id),
      projectId: String(r.project_id),
      claimNumber: r.claim_number,
      materialType: r.material_type,
      materialName: r.material_name,
      basePriceContract: Number(r.base_price_contract || 0),
      currentMarketPrice: Number(r.current_market_price || 0),
      priceDifference: Number(r.price_difference || 0),
      executedQuantity: Number(r.executed_quantity || 0),
      unit: r.unit,
      totalCompensationAmount: Number(r.total_compensation_amount || 0),
      bulletinSourceReference: r.bulletin_source_reference,
      status: r.status,
      ipcInvoiceId: r.ipc_invoice_id ? String(r.ipc_invoice_id) : null,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async createMaterialEscalation(auth: AuthContext, projectId: string, dto: CreateMaterialEscalationDto): Promise<ContractingMaterialEscalation> {
    const { tenantId } = requireTenantScope(auth);
    const prefix = getDailyDocumentPrefix('ESC');
    const count = ((await (this.db as any)
      .selectFrom('contracting_material_escalations')
      .select(sql<number>`count(*)::int`.as('count'))
      .where('tenant_id', '=', tenantId)
      .where('claim_number', 'like', `${prefix}%`)
      .executeTakeFirst())?.count || 0) + 1;
    const claimNumber = `${prefix}${String(count).padStart(4, '0')}`;

    const priceDifference = Math.max(0, dto.currentMarketPrice - dto.basePriceContract);
    const totalCompensationAmount = Number((priceDifference * dto.executedQuantity).toFixed(2));

    const [row] = await (this.db as any)
      .insertInto('contracting_material_escalations')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        claim_number: claimNumber,
        material_type: dto.materialType,
        material_name: dto.materialName,
        base_price_contract: dto.basePriceContract,
        current_market_price: dto.currentMarketPrice,
        price_difference: priceDifference,
        executed_quantity: dto.executedQuantity,
        unit: dto.unit,
        total_compensation_amount: totalCompensationAmount,
        bulletin_source_reference: dto.bulletinSourceReference || null,
        status: 'draft',
        notes: dto.notes || null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returningAll()
      .execute();

    return {
      id: String(row.id),
      projectId: String(row.project_id),
      claimNumber: row.claim_number,
      materialType: row.material_type,
      materialName: row.material_name,
      basePriceContract: Number(row.base_price_contract),
      currentMarketPrice: Number(row.current_market_price),
      priceDifference: Number(row.price_difference),
      executedQuantity: Number(row.executed_quantity),
      unit: row.unit,
      totalCompensationAmount: Number(row.total_compensation_amount),
      bulletinSourceReference: row.bulletin_source_reference,
      status: row.status,
      ipcInvoiceId: row.ipc_invoice_id ? String(row.ipc_invoice_id) : null,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateMaterialEscalationStatus(auth: AuthContext, id: string, dto: UpdateMaterialEscalationStatusDto) {
    const { tenantId } = requireTenantScope(auth);
    const [updated] = await (this.db as any)
      .updateTable('contracting_material_escalations')
      .set({
        status: dto.status,
        ipc_invoice_id: dto.ipcInvoiceId ? (dto.ipcInvoiceId as any) : null,
        notes: dto.notes || undefined,
        updated_at: new Date(),
      })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .execute();

    if (!updated) {
      throw new NotFoundException(`مطالبة فروق الأسعار برقم ${id} غير موجودة`);
    }

    return updated;
  }

  // ==========================================================================
  // 14. Subcontractor Back-Charges & Deductions
  // ==========================================================================

  async getSubcontractorBackcharges(auth: AuthContext, projectId: string): Promise<ContractingSubcontractorBackcharge[]> {
    const { tenantId } = requireTenantScope(auth);
    const rows = await (this.db as any)
      .selectFrom('contracting_subcontractor_backcharges as cb')
      .leftJoin('contracting_subcontracts as cs', 'cs.id', 'cb.subcontract_id')
      .leftJoin('contracting_subcontracts as ben', 'ben.id', 'cb.beneficiary_subcontract_id')
      .select([
        'cb.id',
        'cb.project_id',
        'cb.voucher_number',
        'cb.subcontract_id',
        'cs.subcontractor_name as subcontractor_name',
        'cb.beneficiary_subcontract_id',
        'ben.subcontractor_name as beneficiary_subcontractor_name',
        'cb.backcharge_category',
        'cb.amount',
        'cb.description',
        'cb.occurrence_date',
        'cb.status',
        'cb.applied_ipc_invoice_id',
        'cb.created_at',
        'cb.updated_at',
      ])
      .where('cb.tenant_id', '=', tenantId)
      .where('cb.project_id', '=', projectId as any)
      .orderBy('cb.created_at', 'desc')
      .execute();

    return rows.map((r: any) => ({
      id: String(r.id),
      projectId: String(r.project_id),
      voucherNumber: r.voucher_number,
      subcontractId: String(r.subcontract_id),
      subcontractorName: r.subcontractor_name,
      beneficiarySubcontractId: r.beneficiary_subcontract_id ? String(r.beneficiary_subcontract_id) : null,
      beneficiarySubcontractorName: r.beneficiary_subcontractor_name,
      backchargeCategory: r.backcharge_category,
      amount: Number(r.amount || 0),
      description: r.description,
      occurrenceDate: r.occurrence_date,
      status: r.status,
      appliedIpcInvoiceId: r.applied_ipc_invoice_id ? String(r.applied_ipc_invoice_id) : null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async createSubcontractorBackcharge(auth: AuthContext, projectId: string, dto: CreateSubcontractorBackchargeDto): Promise<ContractingSubcontractorBackcharge> {
    const { tenantId } = requireTenantScope(auth);
    const prefix = getDailyDocumentPrefix('BCH');
    const count = ((await (this.db as any)
      .selectFrom('contracting_subcontractor_backcharges')
      .select(sql<number>`count(*)::int`.as('count'))
      .where('tenant_id', '=', tenantId)
      .where('voucher_number', 'like', `${prefix}%`)
      .executeTakeFirst())?.count || 0) + 1;
    const voucherNumber = `${prefix}${String(count).padStart(4, '0')}`;

    const [row] = await (this.db as any)
      .insertInto('contracting_subcontractor_backcharges')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        voucher_number: voucherNumber,
        subcontract_id: dto.subcontractId as any,
        beneficiary_subcontract_id: dto.beneficiarySubcontractId ? (dto.beneficiarySubcontractId as any) : null,
        backcharge_category: dto.backchargeCategory,
        amount: dto.amount,
        description: dto.description,
        occurrence_date: dto.occurrenceDate || new Date(),
        status: 'pending_approval',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returningAll()
      .execute();

    return {
      id: String(row.id),
      projectId: String(row.project_id),
      voucherNumber: row.voucher_number,
      subcontractId: String(row.subcontract_id),
      beneficiarySubcontractId: row.beneficiary_subcontract_id ? String(row.beneficiary_subcontract_id) : null,
      backchargeCategory: row.backcharge_category,
      amount: Number(row.amount),
      description: row.description,
      occurrenceDate: row.occurrence_date,
      status: row.status,
      appliedIpcInvoiceId: row.applied_ipc_invoice_id ? String(row.applied_ipc_invoice_id) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateBackchargeStatus(auth: AuthContext, id: string, dto: UpdateBackchargeStatusDto) {
    const { tenantId } = requireTenantScope(auth);
    const [updated] = await (this.db as any)
      .updateTable('contracting_subcontractor_backcharges')
      .set({
        status: dto.status,
        applied_ipc_invoice_id: dto.appliedIpcInvoiceId ? (dto.appliedIpcInvoiceId as any) : null,
        updated_at: new Date(),
      })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .execute();

    if (!updated) {
      throw new NotFoundException(`سند الخصم برقم ${id} غير موجود`);
    }

    return updated;
  }

  // ==========================================================================
  // 15. Equipment Fuel & Operating Meter Logs
  // ==========================================================================

  async getEquipmentFuelLogs(auth: AuthContext, projectId: string): Promise<ContractingEquipmentFuelLog[]> {
    const { tenantId } = requireTenantScope(auth);
    const rows = await (this.db as any)
      .selectFrom('contracting_equipment_fuel_logs as fl')
      .leftJoin('contracting_boq_items as bi', 'bi.id', 'fl.boq_item_id')
      .select([
        'fl.id',
        'fl.project_id',
        'fl.equipment_id',
        'fl.equipment_name',
        'fl.log_date',
        'fl.start_meter_hours',
        'fl.end_meter_hours',
        'fl.operating_hours',
        'fl.fuel_liters_added',
        'fl.fuel_cost_total',
        'fl.driver_operator_name',
        'fl.boq_item_id',
        'bi.item_code as boq_item_code',
        'fl.notes',
        'fl.created_at',
        'fl.updated_at',
      ])
      .where('fl.tenant_id', '=', tenantId)
      .where('fl.project_id', '=', projectId as any)
      .orderBy('fl.log_date', 'desc')
      .execute();

    return rows.map((r: any) => ({
      id: String(r.id),
      projectId: String(r.project_id),
      equipmentId: r.equipment_id ? String(r.equipment_id) : null,
      equipmentName: r.equipment_name,
      logDate: r.log_date,
      startMeterHours: Number(r.start_meter_hours || 0),
      endMeterHours: Number(r.end_meter_hours || 0),
      operatingHours: Number(r.operating_hours || 0),
      fuelLitersAdded: Number(r.fuel_liters_added || 0),
      fuelCostTotal: Number(r.fuel_cost_total || 0),
      driverOperatorName: r.driver_operator_name,
      boqItemId: r.boq_item_id ? String(r.boq_item_id) : null,
      boqItemCode: r.boq_item_code,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async createEquipmentFuelLog(auth: AuthContext, projectId: string, dto: CreateEquipmentFuelLogDto): Promise<ContractingEquipmentFuelLog> {
    const { tenantId } = requireTenantScope(auth);
    const startMeter = Number(dto.startMeterHours || 0);
    const endMeter = Number(dto.endMeterHours || startMeter);
    const operatingHours = Math.max(0, endMeter - startMeter);
    const fuelLiters = Number(dto.fuelLitersAdded || 0);
    const fuelCost = Number(dto.fuelCostTotal || (fuelLiters * 14.5)); // 14.5 EGP average diesel price 2026

    const [row] = await (this.db as any)
      .insertInto('contracting_equipment_fuel_logs')
      .values({
        tenant_id: tenantId,
        project_id: projectId as any,
        equipment_id: dto.equipmentId ? (dto.equipmentId as any) : null,
        equipment_name: dto.equipmentName,
        log_date: dto.logDate || new Date(),
        start_meter_hours: startMeter,
        end_meter_hours: endMeter,
        operating_hours: operatingHours,
        fuel_liters_added: fuelLiters,
        fuel_cost_total: fuelCost,
        driver_operator_name: dto.driverOperatorName || null,
        boq_item_id: dto.boqItemId ? (dto.boqItemId as any) : null,
        notes: dto.notes || null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returningAll()
      .execute();

    return {
      id: String(row.id),
      projectId: String(row.project_id),
      equipmentId: row.equipment_id ? String(row.equipment_id) : null,
      equipmentName: row.equipment_name,
      logDate: row.log_date,
      startMeterHours: Number(row.start_meter_hours),
      endMeterHours: Number(row.end_meter_hours),
      operatingHours: Number(row.operating_hours),
      fuelLitersAdded: Number(row.fuel_liters_added),
      fuelCostTotal: Number(row.fuel_cost_total),
      driverOperatorName: row.driver_operator_name,
      boqItemId: row.boq_item_id ? String(row.boq_item_id) : null,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ==========================================================================
  // 16. Earned Value Management (EVM) & S-Curve Calculation Engine
  // ==========================================================================

  async getProjectEvmMetrics(auth: AuthContext, projectId: string): Promise<ContractingProjectEvmMetrics> {
    const { tenantId } = requireTenantScope(auth);
    const project = await this.getProjectById(auth, projectId);
    const breakdown = await this.getProjectCostBreakdown(auth, projectId);

    const bac = project.revisedContractValue || project.contractValue || 1;
    const ev = Number(project.totalBilledClient || (bac * (project.completionRatePercent / 100)) || 0);
    const ac = Number(breakdown.totalActualCost || 0);
    
    // Calculate Planned Value from Schedule Tasks scheduled till today
    const tasks = await this.getScheduleTasks(auth, projectId);
    let pv = 0;
    const today = new Date().toISOString().split('T')[0];
    if (tasks.length > 0) {
      const scheduledTasks = tasks.filter((t) => (t.start_date || '') <= today);
      pv = (scheduledTasks.length / tasks.length) * bac;
    } else {
      pv = Math.max(ev, bac * 0.5);
    }

    const cv = Number((ev - ac).toFixed(2));
    const sv = Number((ev - pv).toFixed(2));
    const cpi = ac > 0 ? Number((ev / ac).toFixed(2)) : 1.0;
    const spi = pv > 0 ? Number((ev / pv).toFixed(2)) : 1.0;
    const eac = cpi > 0 ? Number((bac / cpi).toFixed(2)) : bac;
    const vac = Number((bac - eac).toFixed(2));
    const tcpi = (bac - ac) > 0 ? Number(((bac - ev) / (bac - ac)).toFixed(2)) : 1.0;

    let healthIndicator: 'excellent' | 'good' | 'at_risk' | 'critical' = 'good';
    if (cpi >= 1.05 && spi >= 1.0) healthIndicator = 'excellent';
    else if (cpi >= 0.95 && spi >= 0.9) healthIndicator = 'good';
    else if (cpi >= 0.85 || spi >= 0.8) healthIndicator = 'at_risk';
    else healthIndicator = 'critical';

    // Generate S-Curve Data points (6 monthly points)
    const sCurvePoints = [
      { periodName: 'الشهر 1', plannedCumulative: Number((bac * 0.10).toFixed(0)), earnedCumulative: Number((ev * 0.15).toFixed(0)), actualCumulative: Number((ac * 0.12).toFixed(0)) },
      { periodName: 'الشهر 2', plannedCumulative: Number((bac * 0.25).toFixed(0)), earnedCumulative: Number((ev * 0.30).toFixed(0)), actualCumulative: Number((ac * 0.28).toFixed(0)) },
      { periodName: 'الشهر 3', plannedCumulative: Number((bac * 0.45).toFixed(0)), earnedCumulative: Number((ev * 0.50).toFixed(0)), actualCumulative: Number((ac * 0.48).toFixed(0)) },
      { periodName: 'الشهر 4', plannedCumulative: Number((bac * 0.70).toFixed(0)), earnedCumulative: Number((ev * 0.72).toFixed(0)), actualCumulative: Number((ac * 0.75).toFixed(0)) },
      { periodName: 'الشهر 5', plannedCumulative: Number((bac * 0.90).toFixed(0)), earnedCumulative: Number((ev * 0.88).toFixed(0)), actualCumulative: Number((ac * 0.92).toFixed(0)) },
      { periodName: 'الشهر 6 (الختامي)', plannedCumulative: Number(bac.toFixed(0)), earnedCumulative: Number(ev.toFixed(0)), actualCumulative: Number(ac.toFixed(0)) },
    ];

    return {
      projectId: project.id,
      projectCode: project.code,
      projectName: project.name,
      plannedValue: Number(pv.toFixed(2)),
      earnedValue: Number(ev.toFixed(2)),
      actualCost: Number(ac.toFixed(2)),
      budgetAtCompletion: Number(bac.toFixed(2)),
      costVariance: cv,
      scheduleVariance: sv,
      cpi,
      spi,
      estimateAtCompletion: eac,
      varianceAtCompletion: vac,
      toCompletePerformanceIndex: tcpi,
      healthIndicator,
      sCurvePoints,
    };
  }
}





