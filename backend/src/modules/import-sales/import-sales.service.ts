import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Kysely, sql, Transaction, Selectable, Updateable } from 'kysely';
import { Database, ImportShipmentTable, ImportShipmentItemTable } from '../../database/database.types';
import { calculateImportLandedCosts, groupImportReceipts, importWeightedAverageCost, requireImportNumber } from './import-inventory-cost.engine';
import { KYSELY_DB } from '../../database/database.constants';
import {
  CreateShipmentDto,
  UpdateShipmentCostsDto,
  AddShipmentItemDto,
  RecordForeignTransferDto,
  UpdateShipmentItemDto,
  CreateImportProjectDto,
  UpdateImportProjectDto,
  CalculateFeasibilityDto,
  UpsertSupplierMetaDto,
  CreateQcInspectionDto,
  UpsertAciComplianceDto,
  CreateSourcingTripDto,
} from './dto/import-sales.dto';
import { applyStockDelta, lockStockProducts } from '../../common/utils/location-stock-ledger';
import { formatDailyDocumentNumber } from '../../common/utils/document-number.util';
import { calculateImportFeasibility, FeasibilityCalculationResult } from './engines/import-feasibility.engine';
import { calculateLandedCostBreakdown, calculateDemurrageRisk } from './engines/import-landed-cost.engine';

@Injectable()
export class ImportSalesService {
  private readonly inventoryDb: Kysely<Database>;
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<any>) {
    this.inventoryDb = db;
  }

  private async lockShipment(trx: Transaction<Database>, tenantId: string, shipmentId: string) {
    const shipment = await trx.selectFrom('import_shipments').selectAll()
      .where('tenant_id', '=', tenantId).where('id', '=', shipmentId).forUpdate().executeTakeFirst();
    if (!shipment) throw new NotFoundException('الشحنة غير موجودة');
    const receipt = await trx.selectFrom('import_inventory_receipts').selectAll()
      .where('tenant_id', '=', tenantId).where('shipment_id', '=', shipmentId).executeTakeFirst();
    return { shipment, receipt };
  }

  private assertShipmentEditable(state: Awaited<ReturnType<ImportSalesService['lockShipment']>>) {
    if (state.receipt?.state === 'legacy_review_required' || (!state.receipt && state.shipment.status === 'Arrived')) {
      throw new BadRequestException('الشحنة القديمة تحتاج مراجعة الاستلام وتسوية معتمدة قبل أي تعديل أو إعادة ترحيل');
    }
    if (state.receipt) {
      throw new BadRequestException('تم ترحيل الشحنة للمخزون؛ لا يمكن تعديل الكميات أو التكاليف إلا عبر تسوية معتمدة');
    }
  }

  private costLine(item: Selectable<ImportShipmentItemTable>) {
    return {
      id: item.id, productId: Number(item.product_id), quantity: Number(item.quantity),
      receivedQuantity: Number(item.received_quantity ?? item.quantity),
      factoryUnitPriceUsd: Number(item.factory_unit_price_usd),
      shortageHandlingMethod: item.shortage_handling_method ?? 'capitalize',
    };
  }

  async getPartners(tenantId: string) {
    return await this.db
      .selectFrom('import_partners')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('name', 'asc')
      .execute();
  }

  async createPartner(tenantId: string, userId: number, name: string, percentage: number, capitalAmount: number = 0, accountId?: string) {
    if (!name || !name.trim()) {
      throw new BadRequestException('اسم الشريك مطلوب.');
    }
    const cleanPercentage = Number(percentage);
    if (!Number.isFinite(cleanPercentage) || cleanPercentage < 0 || cleanPercentage > 100) {
      throw new BadRequestException('نسبة الشراكة يجب أن تكون بين 0% و 100%.');
    }
    const cleanCapital = Number(capitalAmount) || 0;
    if (cleanCapital < 0) {
      throw new BadRequestException('رأس المال لا يمكن أن يكون سالباً.');
    }

    return await this.db.transaction().execute(async (trx) => {
      // Check total percentage across all partners
      const existing = await trx.selectFrom('import_partners')
        .select(sql<number>`coalesce(sum(profit_share_percentage), 0)`.as('total_percentage'))
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();
      const currentTotal = Number(existing?.total_percentage || 0);
      if (currentTotal + cleanPercentage > 100.001) {
        throw new BadRequestException(`مجموع نسب الشركاء سيتجاوز 100% (المجموع الحالي: ${currentTotal}%).`);
      }

      const partner = await trx
        .insertInto('import_partners')
        .values({
          tenant_id: tenantId,
          name: name.trim(),
          profit_share_percentage: cleanPercentage,
          capital_amount: 0,
          withdrawn_profit: 0
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      if (cleanCapital > 0) {
        await trx.insertInto('import_partner_ledger').values({
          tenant_id: tenantId,
          partner_id: partner.id,
          type: 'DEPOSIT',
          amount: cleanCapital,
          transaction_date: new Date(),
          note: 'رأس مال افتتاحي',
          created_by: userId
        }).execute();

        await trx.updateTable('import_partners')
          .set({ capital_amount: cleanCapital })
          .where('id', '=', partner.id)
          .where('tenant_id', '=', tenantId)
          .execute();

        if (accountId) {
          await trx.insertInto('treasury_transactions').values({
            tenant_id: tenantId,
            txn_type: 'revenue',
            amount: cleanCapital,
            note: `إيداع رأس مال افتتاحي للشريك: ${partner.name}`,
            reference_type: 'partner_capital',
            reference_id: null,
            created_by: userId,
            account_id: accountId
          }).execute();
        }

        return await trx
          .selectFrom('import_partners')
          .selectAll()
          .where('id', '=', partner.id)
          .executeTakeFirstOrThrow();
      }

      return partner;
    });
  }

  async updatePartner(tenantId: string, id: string, name?: string, percentage?: number, capitalAmount?: number) {
    if (capitalAmount !== undefined) {
      throw new BadRequestException('لا يمكن تعديل رأس مال الشريك مباشرة بدون حركة إيداع أو سحب دفترية مسجلة.');
    }

    if (percentage !== undefined) {
      const cleanPercentage = Number(percentage);
      if (!Number.isFinite(cleanPercentage) || cleanPercentage < 0 || cleanPercentage > 100) {
        throw new BadRequestException('نسبة الشراكة يجب أن تكون بين 0% و 100%.');
      }
    }

    return await this.db.transaction().execute(async (trx) => {
      if (percentage !== undefined) {
        const existing = await trx.selectFrom('import_partners')
          .select(sql<number>`coalesce(sum(profit_share_percentage), 0)`.as('total_percentage'))
          .where('tenant_id', '=', tenantId)
          .where('id', '!=', id)
          .executeTakeFirst();
        const otherTotal = Number(existing?.total_percentage || 0);
        if (otherTotal + Number(percentage) > 100.001) {
          throw new BadRequestException(`مجموع نسب الشركاء سيتجاوز 100% (باقي الشركاء: ${otherTotal}%).`);
        }
      }

      let updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (percentage !== undefined) updateData.profit_share_percentage = Number(percentage);

      if (Object.keys(updateData).length === 0) return null;

      return await trx
        .updateTable('import_partners')
        .set(updateData)
        .where('tenant_id', '=', tenantId)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }

  async deletePartner(tenantId: string, id: string) {
    try {
      await this.db
        .deleteFrom('import_partners')
        .where('tenant_id', '=', tenantId)
        .where('id', '=', id)
        .execute();
      return { success: true };
    } catch (error: any) {
      if (error.code === '23503') { // PostgreSQL foreign_key_violation
        throw new BadRequestException('لا يمكن حذف الشريك لوجود عمليات مالية أو أرباح مسجلة باسمه.');
      }
      throw error;
    }
  }

  // ==========================================
  // 2. IMPORT PROJECTS & FEASIBILITY ENGINE
  // ==========================================

  async listProjects(tenantId: string, status?: string) {
    let query = this.db
      .selectFrom('import_projects')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('created_at', 'desc');

    if (status) {
      query = query.where('status', '=', status);
    }

    const projects = await query.execute();

    const shipmentCounts = await this.db
      .selectFrom('import_shipments')
      .select(['project_id', sql<number>`count(*)`.as('shipment_count')])
      .where('tenant_id', '=', tenantId)
      .where('project_id', 'is not', null)
      .groupBy('project_id')
      .execute();

    const countByProject = new Map<string, number>(
      shipmentCounts.map((sc) => [String(sc.project_id), Number(sc.shipment_count)])
    );

    return projects.map((p) => ({
      ...p,
      shipmentCount: countByProject.get(String(p.id)) || 0,
    }));
  }

  async getProjectById(tenantId: string, id: string) {
    const project = await this.db
      .selectFrom('import_projects')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id)
      .executeTakeFirst();

    if (!project) throw new NotFoundException('مشروع الاستيراد غير موجود.');

    const shipments = await this.db
      .selectFrom('import_shipments')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', id)
      .orderBy('created_at', 'desc')
      .execute();

    const qcInspections = await this.db
      .selectFrom('import_qc_inspections')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', id)
      .orderBy('inspection_date', 'desc')
      .execute();

    const sourcingTrips = await this.db
      .selectFrom('import_sourcing_trips')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', id)
      .orderBy('start_date', 'desc')
      .execute();

    const aciRecords = await this.db
      .selectFrom('import_aci_compliance')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('project_id', '=', id)
      .execute();

    const partners = await this.db
      .selectFrom('import_project_partners')
      .innerJoin('import_partners', 'import_partners.id', 'import_project_partners.partner_id')
      .select([
        'import_project_partners.id',
        'import_project_partners.partner_id',
        'import_project_partners.capital_share_amount',
        'import_project_partners.profit_percentage',
        'import_partners.name as partner_name',
      ])
      .where('import_project_partners.tenant_id', '=', tenantId)
      .where('import_project_partners.project_id', '=', id)
      .execute();

    return {
      ...project,
      shipments,
      qcInspections,
      sourcingTrips,
      aciRecords,
      partners,
    };
  }

  async createProject(tenantId: string, dto: CreateImportProjectDto) {
    return await this.db.transaction().execute(async (trx) => {
      const todayCount = await trx
        .selectFrom('import_projects')
        .select(sql<number>`count(*)`.as('count'))
        .where('tenant_id', '=', tenantId)
        .where('created_at', '>=', sql`CURRENT_DATE`)
        .executeTakeFirst();

      const seq = Number(todayCount?.count || 0) + 1;
      const projectNo = dto.projectNo || formatDailyDocumentNumber('IMP', seq);

      return await trx
        .insertInto('import_projects')
        .values({
          tenant_id: tenantId,
          project_no: projectNo,
          title: dto.title.trim(),
          target_market: dto.targetMarket || 'Egypt',
          country_origin: dto.countryOrigin || 'China',
          country_destination: dto.countryDestination || 'Egypt',
          budget_currency: dto.budgetCurrency || 'USD',
          allocated_capital: dto.allocatedCapital || 0,
          target_roi_percentage: dto.targetRoiPercentage || 25,
          status: dto.status || 'feasibility',
          feasibility_data: dto.feasibilityData ? JSON.stringify(dto.feasibilityData) : '{}',
          notes: dto.notes,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }

  async updateProject(tenantId: string, projectId: string, dto: UpdateImportProjectDto) {
    const payload: any = { updated_at: sql`NOW()` };
    if (dto.title !== undefined) payload.title = dto.title.trim();
    if (dto.targetMarket !== undefined) payload.target_market = dto.targetMarket;
    if (dto.countryOrigin !== undefined) payload.country_origin = dto.countryOrigin;
    if (dto.countryDestination !== undefined) payload.country_destination = dto.countryDestination;
    if (dto.budgetCurrency !== undefined) payload.budget_currency = dto.budgetCurrency;
    if (dto.allocatedCapital !== undefined) payload.allocated_capital = dto.allocatedCapital;
    if (dto.targetRoiPercentage !== undefined) payload.target_roi_percentage = dto.targetRoiPercentage;
    if (dto.status !== undefined) payload.status = dto.status;
    if (dto.feasibilityData !== undefined) payload.feasibility_data = JSON.stringify(dto.feasibilityData);
    if (dto.notes !== undefined) payload.notes = dto.notes;

    return await this.db
      .updateTable('import_projects')
      .set(payload)
      .where('id', '=', projectId)
      .where('tenant_id', '=', tenantId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  calculateFeasibility(dto: CalculateFeasibilityDto): FeasibilityCalculationResult {
    return calculateImportFeasibility(dto);
  }

  // ==========================================
  // 3. CHINA SOURCING & QC INSPECTIONS
  // ==========================================

  async listChinaSuppliers(tenantId: string) {
    return await this.db
      .selectFrom('suppliers')
      .leftJoin('import_suppliers_meta', (join) =>
        join
          .onRef('import_suppliers_meta.supplier_id', '=', 'suppliers.id')
          .onRef('import_suppliers_meta.tenant_id', '=', 'suppliers.tenant_id')
      )
      .select([
        'suppliers.id',
        'suppliers.name',
        'suppliers.phone',
        'suppliers.email',
        'suppliers.balance',
        'import_suppliers_meta.chinese_name',
        'import_suppliers_meta.city',
        'import_suppliers_meta.province',
        'import_suppliers_meta.moq_description',
        'import_suppliers_meta.production_lead_time_days',
        'import_suppliers_meta.verified_bank_details',
        'import_suppliers_meta.incoterms_accepted',
        'import_suppliers_meta.qc_rating',
        'import_suppliers_meta.quality_certifications',
        'import_suppliers_meta.audit_status',
        'import_suppliers_meta.notes as import_notes',
      ])
      .where('suppliers.tenant_id', '=', tenantId)
      .orderBy('suppliers.name', 'asc')
      .execute();
  }

  async upsertSupplierImportMeta(tenantId: string, supplierId: string, dto: UpsertSupplierMetaDto) {
    const sId = Number(supplierId);
    return await this.db.transaction().execute(async (trx) => {
      const existing = await trx
        .selectFrom('import_suppliers_meta')
        .select('id')
        .where('tenant_id', '=', tenantId)
        .where('supplier_id', '=', sId)
        .executeTakeFirst();

      const payload: any = {
        chinese_name: dto.chineseName,
        city: dto.city,
        province: dto.province,
        moq_description: dto.moqDescription,
        production_lead_time_days: dto.productionLeadTimeDays ?? 30,
        verified_bank_details: dto.verifiedBankDetails ? JSON.stringify(dto.verifiedBankDetails) : '{}',
        incoterms_accepted: dto.incotermsAccepted ? JSON.stringify(dto.incotermsAccepted) : '["FOB", "EXW", "CIF"]',
        qc_rating: dto.qcRating ?? 5.0,
        quality_certifications: dto.qualityCertifications ? JSON.stringify(dto.qualityCertifications) : '[]',
        audit_status: dto.auditStatus || 'verified',
        notes: dto.notes,
        updated_at: sql`NOW()`,
      };

      if (existing) {
        return await trx
          .updateTable('import_suppliers_meta')
          .set(payload)
          .where('id', '=', existing.id)
          .where('tenant_id', '=', tenantId)
          .returningAll()
          .executeTakeFirstOrThrow();
      } else {
        return await trx
          .insertInto('import_suppliers_meta')
          .values({
            tenant_id: tenantId,
            supplier_id: sId,
            ...payload,
          })
          .returningAll()
          .executeTakeFirstOrThrow();
      }
    });
  }

  async listSourcingTrips(tenantId: string, projectId?: string) {
    let query = this.db
      .selectFrom('import_sourcing_trips')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('start_date', 'desc');

    if (projectId) {
      query = query.where('project_id', '=', projectId);
    }

    return await query.execute();
  }

  async createSourcingTrip(tenantId: string, dto: CreateSourcingTripDto) {
    return await this.db
      .insertInto('import_sourcing_trips')
      .values({
        tenant_id: tenantId,
        project_id: dto.projectId,
        trip_title: dto.tripTitle.trim(),
        destination_city: dto.destinationCity.trim(),
        start_date: dto.startDate,
        end_date: dto.endDate,
        budget_egp: dto.budgetEgp || 0,
        actual_cost_egp: dto.actualCostEgp || 0,
        notes: dto.notes,
        findings: dto.findings ? JSON.stringify(dto.findings) : '{}',
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async listQcInspections(tenantId: string, projectId?: string, shipmentId?: string) {
    let query = this.db
      .selectFrom('import_qc_inspections')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('inspection_date', 'desc');

    if (projectId) query = query.where('project_id', '=', projectId);
    if (shipmentId) query = query.where('shipment_id', '=', shipmentId);

    return await query.execute();
  }

  async createQcInspection(tenantId: string, dto: CreateQcInspectionDto) {
    return await this.db
      .insertInto('import_qc_inspections')
      .values({
        tenant_id: tenantId,
        project_id: dto.projectId,
        shipment_id: dto.shipmentId,
        stage: dto.stage,
        inspection_date: dto.inspectionDate,
        inspector_name: dto.inspectorName,
        sample_size: dto.sampleSize || 0,
        passed_quantity: dto.passedQuantity || 0,
        failed_quantity: dto.failedQuantity || 0,
        defect_notes: dto.defectNotes,
        status: dto.status || 'passed',
        report_file_url: dto.reportFileUrl,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async updateQcInspection(tenantId: string, id: string, dto: Partial<CreateQcInspectionDto>) {
    const payload: any = {};
    if (dto.stage !== undefined) payload.stage = dto.stage;
    if (dto.inspectionDate !== undefined) payload.inspection_date = dto.inspectionDate;
    if (dto.inspectorName !== undefined) payload.inspector_name = dto.inspectorName;
    if (dto.sampleSize !== undefined) payload.sample_size = dto.sampleSize;
    if (dto.passedQuantity !== undefined) payload.passed_quantity = dto.passedQuantity;
    if (dto.failedQuantity !== undefined) payload.failed_quantity = dto.failedQuantity;
    if (dto.defectNotes !== undefined) payload.defect_notes = dto.defectNotes;
    if (dto.status !== undefined) payload.status = dto.status;
    if (dto.reportFileUrl !== undefined) payload.report_file_url = dto.reportFileUrl;

    return await this.db
      .updateTable('import_qc_inspections')
      .set(payload)
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  // ==========================================
  // 4. EGYPT COMPLIANCE & ACI / CUSTOMS TARIFFS
  // ==========================================

  async getAciCompliance(tenantId: string, targetId: string) {
    return await this.db
      .selectFrom('import_aci_compliance')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where((eb) => eb.or([eb('id', '=', targetId), eb('shipment_id', '=', targetId), eb('project_id', '=', targetId)]))
      .executeTakeFirst();
  }

  async upsertAciCompliance(tenantId: string, dto: UpsertAciComplianceDto) {
    return await this.db.transaction().execute(async (trx) => {
      const existing = await trx
        .selectFrom('import_aci_compliance')
        .select('id')
        .where('tenant_id', '=', tenantId)
        .where((eb) =>
          eb.or([
            eb('acid_number', '=', dto.acidNumber),
            ...(dto.shipmentId ? [eb('shipment_id', '=', dto.shipmentId)] : []),
          ])
        )
        .executeTakeFirst();

      const payload: any = {
        project_id: dto.projectId,
        shipment_id: dto.shipmentId,
        acid_number: dto.acidNumber.trim(),
        acid_issue_date: dto.acidIssueDate,
        acid_expiry_date: dto.acidExpiryDate,
        cargox_document_id: dto.cargoxDocumentId,
        importer_tax_number: dto.importerTaxNumber,
        exporter_id: dto.exporterId,
        status: dto.status || 'pending',
        compliance_checklist: dto.complianceChecklist ? JSON.stringify(dto.complianceChecklist) : '{}',
        notes: dto.notes,
      };

      if (existing) {
        return await trx
          .updateTable('import_aci_compliance')
          .set(payload)
          .where('id', '=', existing.id)
          .where('tenant_id', '=', tenantId)
          .returningAll()
          .executeTakeFirstOrThrow();
      } else {
        return await trx
          .insertInto('import_aci_compliance')
          .values({
            tenant_id: tenantId,
            ...payload,
          })
          .returningAll()
          .executeTakeFirstOrThrow();
      }
    });
  }

  async listCustomsTariffs(tenantId: string, search?: string) {
    let query = this.db
      .selectFrom('import_customs_tariffs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('hs_code', 'asc');

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      query = query.where((eb) =>
        eb.or([eb('hs_code', 'like', s), eb('description_ar', 'like', s), eb('description_en', 'like', s)])
      );
    }

    const rows = await query.execute();
    if (rows.length > 0) return rows;

    // Default Seed Tariffs if table is currently empty for tenant
    const defaultTariffs = [
      { hs_code: '8471.30', description_ar: 'أجهزة حاسب آلي محمولة ومكتبية', duty_rate_percent: 0, vat_rate_percent: 14, regulatory_body: 'GOEIC' },
      { hs_code: '8517.13', description_ar: 'هواتف ذكية ومحطات اتصال لاسلكية', duty_rate_percent: 0, vat_rate_percent: 14, regulatory_body: 'NTRA' },
      { hs_code: '9403.60', description_ar: 'أثاث خشبي متنوع ومنزلي', duty_rate_percent: 20, vat_rate_percent: 14, regulatory_body: 'GOEIC' },
      { hs_code: '6109.10', description_ar: 'ملابس قطنية وتيشيرتات ومنسوجات', duty_rate_percent: 40, vat_rate_percent: 14, regulatory_body: 'GOEIC' },
      { hs_code: '3926.90', description_ar: 'مصنوعات لدائن وبلاستيك أدوات منزلية', duty_rate_percent: 10, vat_rate_percent: 14, regulatory_body: 'GOEIC' },
      { hs_code: '8504.40', description_ar: 'محولات شحن وشواحن أجهزة كهربائية', duty_rate_percent: 5, vat_rate_percent: 14, regulatory_body: 'GOEIC' },
    ];

    for (const item of defaultTariffs) {
      await this.db
        .insertInto('import_customs_tariffs')
        .values({
          tenant_id: tenantId,
          ...item,
          inspection_fees_percent: 1,
        })
        .onConflict((oc) => oc.columns(['tenant_id', 'hs_code']).doNothing())
        .execute();
    }

    return await this.db
      .selectFrom('import_customs_tariffs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('hs_code', 'asc')
      .execute();
  }

  async calculateCustomsTax(tenantId: string, hsCode: string, cifValueEgp: number) {
    const tariff = await this.db
      .selectFrom('import_customs_tariffs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('hs_code', '=', hsCode)
      .executeTakeFirst();

    const dutyRate = Number(tariff?.duty_rate_percent ?? 5) / 100;
    const vatRate = Number(tariff?.vat_rate_percent ?? 14) / 100;
    const inspRate = Number(tariff?.inspection_fees_percent ?? 1) / 100;

    const cif = Math.max(0, Number(cifValueEgp) || 0);
    const customsDuty = cif * dutyRate;
    const inspectionFees = cif * inspRate;
    const vatBase = cif + customsDuty + inspectionFees;
    const vatAmount = vatBase * vatRate;
    const totalCustomsDues = customsDuty + inspectionFees + vatAmount;

    return {
      hsCode,
      description: tariff?.description_ar || 'بند جمركي قياسي',
      regulatoryBody: tariff?.regulatory_body || 'GOEIC',
      cifValueEgp: Number(cif.toFixed(2)),
      customsDuty: Number(customsDuty.toFixed(2)),
      inspectionFees: Number(inspectionFees.toFixed(2)),
      vatAmount: Number(vatAmount.toFixed(2)),
      totalCustomsDues: Number(totalCustomsDues.toFixed(2)),
      dutyRatePercent: Number((dutyRate * 100).toFixed(2)),
      vatRatePercent: Number((vatRate * 100).toFixed(2)),
    };
  }


  // ==========================================
  // 5. SHIPMENTS & INVENTORY ATOMIC RECEIPTS
  // ==========================================

  async listShipments(tenantId: string) {
    const rows = await this.db
      .selectFrom('import_shipments')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('created_at', 'desc')
      .execute();
      
    const stats = {
      sea: rows.filter(r => r.status === 'Pending').length,
      customs: rows.filter(r => r.status === 'In Customs').length,
      arrived: rows.filter(r => r.status === 'Arrived').length,
    };
    
    return { rows, stats };
  }

  async createShipment(tenantId: string, dto: CreateShipmentDto) {
    const result = await this.db
      .insertInto('import_shipments')
      .values({
        tenant_id: tenantId,
        container_number: dto.containerNumber,
        arrival_date: dto.arrivalDate,
        shipped_date: dto.shippingDate,
        supplier_id: dto.supplierId,
        bill_of_lading: dto.billOfLading,
        project_id: dto.projectId,
        freight_type: dto.freightType,
        container_size: dto.containerSize,
        port_of_loading: dto.portOfLoading,
        port_of_discharge: dto.portOfDischarge,
        cbm_volume: dto.cbmVolume,
        gross_weight_kg: dto.grossWeightKg,
        carrier_name: dto.carrierName,
        free_demurrage_days: dto.freeDemurrageDays,
        demurrage_start_date: dto.demurrageStartDate,
        demurrage_rate_per_day: dto.demurrageRatePerDay,
        customs_declaration_no: dto.customsDeclarationNo,
        vat_refundable_egp: dto.vatRefundableEgp,
        is_consolidated: dto.isConsolidated,
        cost_allocation_method: dto.costAllocationMethod,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return result;
  }

  async getShipmentById(tenantId: string, id: string) {
    const shipment = await this.db
      .selectFrom('import_shipments')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id)
      .executeTakeFirst();

    if (!shipment) throw new NotFoundException('Shipment not found');

    const items = await this.db
      .selectFrom('import_shipment_items')
      .leftJoin('products', 'products.id', 'import_shipment_items.product_id')
      .select([
        'import_shipment_items.id',
        'import_shipment_items.product_id',
        'import_shipment_items.quantity',
        'import_shipment_items.factory_unit_price_usd',
        'import_shipment_items.allocated_overhead_egp',
        'import_shipment_items.landed_cost_egp',
        'import_shipment_items.received_quantity',
        'import_shipment_items.target_retail_margin',
        'import_shipment_items.target_wholesale_margin',
        'import_shipment_items.shortage_handling_method',
        'import_shipment_items.created_at',
        'products.name as product_name',
      ])
      .where('import_shipment_items.tenant_id', '=', tenantId)
      .where('import_shipment_items.shipment_id', '=', id)
      .orderBy('import_shipment_items.created_at', 'asc')
      .execute();

    const receipt = await this.inventoryDb.selectFrom('import_inventory_receipts')
      .select(['id', 'state', 'posted_at', 'review_reason'])
      .where('tenant_id', '=', tenantId).where('shipment_id', '=', id).executeTakeFirst();

    const demurrageRisk = calculateDemurrageRisk({
      arrivalDate: shipment.arrival_date,
      demurrageStartDate: shipment.demurrage_start_date,
      freeDays: Number(shipment.free_demurrage_days || 14),
      ratePerDayUsd: Number(shipment.demurrage_rate_per_day || 50),
      exchangeRate: Number(shipment.exchange_rate_at_arrival || 1),
      status: shipment.status || 'Pending',
    });

    return { ...shipment, items, inventory_receipt: receipt ?? null, demurrageRisk };
  }

  async addShipmentItem(tenantId: string, shipmentId: string, dto: AddShipmentItemDto) {
    return this.inventoryDb.transaction().execute(async (trx) => {
      const state = await this.lockShipment(trx, tenantId, shipmentId);
      this.assertShipmentEditable(state);
      const productId = requireImportNumber(dto.productId, 'الصنف', 1);
      if (!Number.isSafeInteger(productId)) throw new BadRequestException('معرف الصنف غير صالح');
      const product = await trx.selectFrom('products').select('id')
        .where('tenant_id', '=', tenantId).where('id', '=', productId).executeTakeFirst();
      if (!product) throw new NotFoundException('الصنف غير موجود في المنشأة');
      requireImportNumber(dto.quantity, 'الكمية', 1);
      requireImportNumber(dto.factoryUnitPriceUsd, 'سعر المصنع');
      if (!Number.isInteger(dto.quantity)) throw new BadRequestException('الكمية يجب أن تكون عددًا صحيحًا');
      const item = await trx.insertInto('import_shipment_items').values({
        tenant_id: tenantId, shipment_id: shipmentId, product_id: productId,
        quantity: dto.quantity, factory_unit_price_usd: dto.factoryUnitPriceUsd,
      }).returningAll().executeTakeFirstOrThrow();
      await this.calculateLandedCostInTransaction(trx, state.shipment);
      return trx.selectFrom('import_shipment_items').selectAll()
        .where('tenant_id', '=', tenantId).where('id', '=', item.id).executeTakeFirstOrThrow();
    });
  }

  async updateShipmentCosts(tenantId: string, userId: number, shipmentId: string, dto: UpdateShipmentCostsDto) {
    await this.inventoryDb.transaction().execute(async (trx) => {
      const state = await this.lockShipment(trx, tenantId, shipmentId);
      const { shipment, receipt } = state;
      const numericFields = [
        ['shippingCostUsd', 'shipping_cost_usd'], ['customsCostEgp', 'customs_cost_egp'],
        ['internalTransportCostEgp', 'internal_transport_cost_egp'],
        ['exchangeRateAtArrival', 'exchange_rate_at_arrival'],
      ] as const;
      const payload: Updateable<ImportShipmentTable> = {};
      let financialChange = false;
      for (const [input, column] of numericFields) {
        if (dto[input] !== undefined) {
          const value = requireImportNumber(dto[input], input, input === 'exchangeRateAtArrival' ? Number.MIN_VALUE : 0);
          const scale = input === 'exchangeRateAtArrival' ? 4 : 2;
          if (value !== Number(value.toFixed(scale))) throw new BadRequestException(`دقة غير صالحة: ${input}`);
          payload[column] = value;
          if (value !== Number(shipment[column])) financialChange = true;
        }
      }
      if (dto.status !== undefined) {
        if (!['Pending', 'In Customs', 'Arrived'].includes(dto.status)) throw new BadRequestException('حالة الشحنة غير صالحة');
        payload.status = dto.status;
      }
      if (dto.pricingExchangeRate !== undefined) payload.pricing_exchange_rate = requireImportNumber(dto.pricingExchangeRate, 'سعر صرف التسعير', Number.MIN_VALUE);
      if (dto.shippedDate !== undefined) payload.shipped_date = dto.shippedDate;
      if (dto.etaDate !== undefined) payload.eta_date = dto.etaDate;
      if (dto.clearanceDate !== undefined) payload.clearance_date = dto.clearanceDate;
      if (dto.projectId !== undefined) payload.project_id = dto.projectId;
      if (dto.freightType !== undefined) payload.freight_type = dto.freightType;
      if (dto.containerSize !== undefined) payload.container_size = dto.containerSize;
      if (dto.portOfLoading !== undefined) payload.port_of_loading = dto.portOfLoading;
      if (dto.portOfDischarge !== undefined) payload.port_of_discharge = dto.portOfDischarge;
      if (dto.cbmVolume !== undefined) payload.cbm_volume = dto.cbmVolume;
      if (dto.grossWeightKg !== undefined) payload.gross_weight_kg = dto.grossWeightKg;
      if (dto.carrierName !== undefined) payload.carrier_name = dto.carrierName;
      if (dto.freeDemurrageDays !== undefined) payload.free_demurrage_days = dto.freeDemurrageDays;
      if (dto.demurrageStartDate !== undefined) payload.demurrage_start_date = dto.demurrageStartDate;
      if (dto.demurrageRatePerDay !== undefined) payload.demurrage_rate_per_day = dto.demurrageRatePerDay;
      if (dto.actualDemurrageFees !== undefined) payload.actual_demurrage_fees = dto.actualDemurrageFees;
      if (dto.customsDeclarationNo !== undefined) payload.customs_declaration_no = dto.customsDeclarationNo;
      if (dto.vatRefundableEgp !== undefined) payload.vat_refundable_egp = dto.vatRefundableEgp;
      if (dto.isConsolidated !== undefined) payload.is_consolidated = dto.isConsolidated;
      if (dto.costAllocationMethod !== undefined) payload.cost_allocation_method = dto.costAllocationMethod;

      const expenseInputs = [
        [dto.shippingAccountId, shipment.shipping_expense_id, shipment.shipping_cost_usd],
        [dto.customsAccountId, shipment.customs_expense_id, shipment.customs_cost_egp],
        [dto.transportAccountId, shipment.transport_expense_id, shipment.internal_transport_cost_egp],
      ] as const;
      // Replaying an identical posted request is a no-op, including its expense selections.
      if (receipt?.state === 'posted') {
        for (const [accountId, expenseId, cost] of expenseInputs) {
          if (accountId === undefined) continue;
          if (expenseId === null && Number(cost) === 0) continue;
          const expense = expenseId === null ? undefined : await trx.selectFrom('expenses').select('account_id')
            .where('tenant_id', '=', tenantId).where('id', '=', expenseId).executeTakeFirst();
          if (accountId !== expense?.account_id) financialChange = true;
        }
        if (financialChange || (dto.status !== undefined && dto.status !== 'Arrived')) {
          this.assertShipmentEditable(state);
        }
        // Only tracking dates and sales-pricing inputs can change after receipt.
        delete payload.shipping_cost_usd;
        delete payload.customs_cost_egp;
        delete payload.internal_transport_cost_egp;
        delete payload.exchange_rate_at_arrival;
        delete payload.status;
      } else {
        this.assertShipmentEditable(state);
        const handleExpense = async (cost: number, accountId: string | undefined, existingId: number | null, title: string) => {
          if (!accountId || cost <= 0) return existingId;
          if (existingId !== null) {
            await trx.updateTable('expenses').set({ amount: cost, account_id: accountId })
              .where('tenant_id', '=', tenantId).where('id', '=', existingId).execute();
            return existingId;
          }
          const expense = await trx.insertInto('expenses').values({
            tenant_id: tenantId, account_id: accountId, title: `${title} للحاوية ${shipment.container_number}`,
            amount: cost, expense_date: new Date().toISOString().slice(0, 10), created_by: userId,
            note: '', branch_id: null, location_id: null,
          }).returning('id').executeTakeFirstOrThrow();
          return expense.id;
        };
        if (dto.shippingCostUsd !== undefined || dto.shippingAccountId !== undefined) {
          payload.shipping_expense_id = await handleExpense(
            Number(dto.shippingCostUsd ?? shipment.shipping_cost_usd ?? 0) * requireImportNumber(dto.exchangeRateAtArrival ?? shipment.exchange_rate_at_arrival, 'سعر الصرف', Number.MIN_VALUE),
            dto.shippingAccountId, shipment.shipping_expense_id, 'مصاريف شحن');
        }
        if (dto.customsCostEgp !== undefined || dto.customsAccountId !== undefined) {
          payload.customs_expense_id = await handleExpense(Number(dto.customsCostEgp ?? shipment.customs_cost_egp ?? 0), dto.customsAccountId, shipment.customs_expense_id, 'مصاريف جمارك');
        }
        if (dto.internalTransportCostEgp !== undefined || dto.transportAccountId !== undefined) {
          payload.transport_expense_id = await handleExpense(Number(dto.internalTransportCostEgp ?? shipment.internal_transport_cost_egp ?? 0), dto.transportAccountId, shipment.transport_expense_id, 'مصاريف نقل داخلي');
        }
      }
      const updated = Object.keys(payload).length ? await trx.updateTable('import_shipments').set(payload)
        .where('tenant_id', '=', tenantId).where('id', '=', shipmentId).returningAll().executeTakeFirstOrThrow() : shipment;
      if (!receipt) {
        await this.calculateLandedCostInTransaction(trx, updated);
        if (dto.status === 'Arrived') await this.postShipmentToInventory(trx, tenantId, shipmentId, userId);
      }
    });
    return this.getShipmentById(tenantId, shipmentId);
  }

  /** Caller holds the shipment lock; status, costs, receipt and stock commit together. */
  private async postShipmentToInventory(trx: Transaction<Database>, tenantId: string, shipmentId: string, userId: number) {
    const items = await trx.selectFrom('import_shipment_items').selectAll()
      .where('tenant_id', '=', tenantId).where('shipment_id', '=', shipmentId).execute();
    if (!items.length) throw new BadRequestException('لا يمكن استلام شحنة بدون أصناف');
    const groups = groupImportReceipts(items.map((item) => ({ ...this.costLine(item), landedCost: Number(item.landed_cost_egp) })));
    const products = await trx.selectFrom('products').select(['id', 'account_id'])
      .where('tenant_id', '=', tenantId).where('id', 'in', groups.map((group) => group.productId))
      .orderBy('id', 'asc').execute();
    if (products.length !== groups.length) throw new NotFoundException('أحد أصناف الشحنة غير موجود في المنشأة');
    const accountByProduct = new Map(products.map((product) => [Number(product.id), product.account_id]));
    // Lock ALL products, across accounts, in global ID order before touching any location.
    for (const product of products) {
      await lockStockProducts(trx, { tenantId, accountId: product.account_id, productIds: [Number(product.id)] });
    }
    const receipt = await trx.insertInto('import_inventory_receipts').values({
      tenant_id: tenantId, shipment_id: shipmentId, state: 'posted', review_reason: null,
      posted_at: new Date(), created_by: userId,
    }).returning('id').executeTakeFirstOrThrow();
    for (const group of groups) {
      const accountId = accountByProduct.get(group.productId);
      if (!accountId) throw new BadRequestException('حساب الصنف غير صالح');
      if (group.quantity > 0) {
        const product = await trx.selectFrom('products').select('cost_price')
          .where('tenant_id', '=', tenantId).where('account_id', '=', accountId)
          .where('id', '=', group.productId).executeTakeFirstOrThrow();
        const stock = await applyStockDelta(trx, {
          tenantId, accountId, productId: group.productId, delta: group.quantity, allowNegative: true,
        });
        // globalBefore is a cached product counter. globalAfter is reconciled by the ledger
        // from locked location balances (including its legacy unassigned-stock policy).
        const oldQty = Number((stock.globalAfter - group.quantity).toFixed(3));
        const cost = importWeightedAverageCost(oldQty, Number(product.cost_price ?? 0), group.quantity, group.value);
        await trx.updateTable('products').set({ cost_price: cost, updated_at: sql`NOW()` })
          .where('tenant_id', '=', tenantId).where('account_id', '=', accountId).where('id', '=', group.productId).execute();
        await trx.insertInto('stock_movements').values({
          tenant_id: tenantId, account_id: accountId, product_id: group.productId,
          movement_type: 'import_receipt', qty: group.quantity, before_qty: stock.scopeBefore, after_qty: stock.scopeAfter,
          unit_cost: Number((group.value / group.quantity).toFixed(6)), total_cost: Number(group.value.toFixed(4)),
          reason: 'استلام شحنة استيراد', note: `شحنة استيراد #${shipmentId}`,
          reference_type: 'import_inventory_receipt', reference_id: receipt.id, import_receipt_id: receipt.id,
          created_by: userId, branch_id: null, location_id: null,
        }).execute();
      }
      if (group.shortageExpense > 0) {
        await trx.insertInto('expenses').values({
          tenant_id: tenantId, account_id: accountId,
          title: `خسائر نواقص حاوية (تسوية عجز) - صنف ${group.productId}`,
          amount: Number(group.shortageExpense.toFixed(2)), expense_date: new Date().toISOString().slice(0, 10),
          note: `شحنة استيراد #${shipmentId} - سند استلام ${receipt.id}`,
          created_by: userId, branch_id: null, location_id: null,
        }).execute();
      }
    }
  }

  async calculateLandedCost(tenantId: string, shipmentId: string) {
    return this.inventoryDb.transaction().execute(async (trx) => {
      const state = await this.lockShipment(trx, tenantId, shipmentId);
      this.assertShipmentEditable(state);
      return this.calculateLandedCostInTransaction(trx, state.shipment);
    });
  }

  private async calculateLandedCostInTransaction(trx: Transaction<Database>, shipment: Selectable<ImportShipmentTable>) {
    const items = await trx.selectFrom('import_shipment_items').selectAll()
      .where('tenant_id', '=', shipment.tenant_id).where('shipment_id', '=', shipment.id).execute();
    const lines = calculateImportLandedCosts(items.map((item) => this.costLine(item)), {
      exchangeRate: requireImportNumber(shipment.exchange_rate_at_arrival, 'سعر الصرف', Number.MIN_VALUE), shippingUsd: Number(shipment.shipping_cost_usd ?? 0),
      customsEgp: Number(shipment.customs_cost_egp ?? 0), transportEgp: Number(shipment.internal_transport_cost_egp ?? 0),
    });
    for (const line of lines) {
      await trx.updateTable('import_shipment_items').set({ allocated_overhead_egp: line.allocatedOverhead, landed_cost_egp: line.landedCost })
        .where('tenant_id', '=', shipment.tenant_id).where('shipment_id', '=', shipment.id).where('id', '=', line.id).execute();
    }
    return { success: true, message: 'Landed cost recalculated successfully' };
  }

  async generatePeriodProfitReport(
    tenantId: string,
    startDate: string | Date,
    endDate: string | Date,
    projectId?: string
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (typeof endDate === 'string' && !endDate.includes('T')) {
      end.setHours(23, 59, 59, 999);
    }

    // 1. Get total revenue and cost from sales
    const salesData = await this.db
      .selectFrom('sales')
      .innerJoin('sale_items', 'sale_items.sale_id', 'sales.id')
      .select([
        sql<number>`coalesce(sum(sale_items.line_total), 0)`.as('total_revenue'),
        sql<number>`coalesce(sum(sale_items.qty * sale_items.cost_price), 0)`.as('total_cost')
      ])
      .where('sales.tenant_id', '=', tenantId)
      .where('sales.status', '!=', 'cancelled')
      .where('sales.created_at', '>=', start)
      .where('sales.created_at', '<=', end)
      .executeTakeFirst();

    const totalRevenue = Number(salesData?.total_revenue || 0);
    const totalCost = Number(salesData?.total_cost || 0);
    const grossProfit = totalRevenue - totalCost;

    // 2. Get operational expenses EXCLUDING:
    // a) Capitalized shipment expenses (already in COGS via landed cost)
    // b) Foreign transfers (supplier debt settlements)
    // c) Partner profit payouts (equity dividend settlements)
    const shipmentExpenseIds = await this.db
      .selectFrom('import_shipments')
      .select(['shipping_expense_id', 'customs_expense_id', 'transport_expense_id'])
      .where('tenant_id', '=', tenantId)
      .execute();

    const excludedExpenseIds = new Set<number>();
    for (const s of shipmentExpenseIds) {
      if (s.shipping_expense_id) excludedExpenseIds.add(Number(s.shipping_expense_id));
      if (s.customs_expense_id) excludedExpenseIds.add(Number(s.customs_expense_id));
      if (s.transport_expense_id) excludedExpenseIds.add(Number(s.transport_expense_id));
    }

    let expensesQuery = this.db
      .selectFrom('expenses')
      .select([sql<number>`coalesce(sum(amount), 0)`.as('total_expenses')])
      .where('tenant_id', '=', tenantId)
      .where('expense_date', '>=', start)
      .where('expense_date', '<=', end)
      .where((eb) => eb.and([
        eb('title', 'not like', 'حوالة خارجية%'),
        eb('title', 'not like', 'صرف أرباح الشريك%')
      ]));

    if (excludedExpenseIds.size > 0) {
      expensesQuery = expensesQuery.where('id', 'not in', Array.from(excludedExpenseIds));
    }

    const expensesData = await expensesQuery.executeTakeFirst();
    const totalExpenses = Number(expensesData?.total_expenses || 0);
    const netProfitPool = grossProfit - totalExpenses;

    // 3. Get partners and calculate their share of the net pool
    let partners: any[] = [];
    if (projectId) {
      partners = await this.db
        .selectFrom('import_project_partners')
        .innerJoin('import_partners', 'import_partners.id', 'import_project_partners.partner_id')
        .select([
          'import_partners.id',
          'import_partners.name',
          'import_project_partners.profit_percentage as profit_share_percentage',
          'import_partners.withdrawn_profit',
        ])
        .where('import_project_partners.tenant_id', '=', tenantId)
        .where('import_project_partners.project_id', '=', projectId)
        .execute();
    }

    if (partners.length === 0) {
      partners = await this.db
        .selectFrom('import_partners')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .execute();
    }
    const partnerShares = partners.map(p => {
      const percentage = Number(p.profit_share_percentage) || 0;
      const shareAmount = (netProfitPool * percentage) / 100;
      const withdrawn = Number(p.withdrawn_profit) || 0;
      return {
        partnerId: p.id,
        name: p.name,
        percentage,
        shareAmount: Number(shareAmount.toFixed(2)),
        withdrawnProfit: Number(withdrawn.toFixed(2)),
        currentBalance: Number((shareAmount - withdrawn).toFixed(2))
      };
    });

    return { 
      success: true, 
      message: 'تم تجميع أرباح الشراكة بنجاح', 
      data: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalCost: Number(totalCost.toFixed(2)),
        grossProfit: Number(grossProfit.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        netProfitPool: Number(netProfitPool.toFixed(2)),
        partnerShares
      } 
    };
  }

  async listForeignTransfers(tenantId: string) {
    return await this.db
      .selectFrom('supplier_payments')
      .innerJoin('suppliers', 'suppliers.id', 'supplier_payments.supplier_id')
      .select([
        'supplier_payments.id',
        'supplier_payments.amount',
        'supplier_payments.payment_date',
        'supplier_payments.note',
        'supplier_payments.doc_no',
        'suppliers.name as supplier_name'
      ])
      .where('supplier_payments.tenant_id', '=', tenantId)
      .where((eb) => eb.or([
        eb('supplier_payments.doc_no', '=', 'FOREIGN_TRANSFER'),
        eb('supplier_payments.doc_no', 'like', 'FT-%'),
        eb('supplier_payments.note', 'like', '%حوالة%')
      ]))
      .orderBy('supplier_payments.payment_date', 'desc')
      .limit(50)
      .execute();
  }

  async recordForeignTransfer(tenantId: string, userId: number, dto: RecordForeignTransferDto) {
    const { supplierId, amountEgp, amountForeign, notes } = dto;
    const sId = Number(supplierId);

    const cleanEgp = Number(amountEgp);
    const cleanForeign = Number(amountForeign);

    if (!Number.isFinite(cleanEgp) || cleanEgp <= 0 || !Number.isFinite(cleanForeign) || cleanForeign <= 0) {
      throw new BadRequestException('مبالغ الحوالة بالجنيه والعملة الأجنبية يجب أن تكون أكبر من الصفر.');
    }

    return await this.db.transaction().execute(async (trx) => {
      const supplier = await trx
        .selectFrom('suppliers')
        .select(['id', 'name', 'account_id', 'balance'])
        .where('id', '=', sId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirstOrThrow();

      // 1. Create Supplier Payment in supplier_payments
      const paymentInsert = await trx.insertInto('supplier_payments').values({
        tenant_id: tenantId,
        account_id: supplier.account_id,
        supplier_id: supplier.id,
        amount: cleanForeign,
        note: `حوالة استيراد خارجية${notes ? ' - ' + notes : ''} [تدبير عملة: ${cleanEgp} ج.م]`,
        created_by: userId
      }).returning('id').executeTakeFirstOrThrow();
      
      const paymentId = paymentInsert.id;

      await trx.updateTable('supplier_payments')
        .set({ doc_no: `FT-${paymentId}` })
        .where('id', '=', paymentId)
        .where('tenant_id', '=', tenantId)
        .execute();

      // 2. Create Treasury Transaction for cash/bank outflow (Settlement of liability, NOT an operational expense)
      await trx.insertInto('treasury_transactions').values({
        tenant_id: tenantId,
        account_id: supplier.account_id,
        txn_type: 'supplier_payment',
        amount: -cleanEgp,
        note: `تدبير عملة: حوالة خارجية إلى ${supplier.name} (${cleanForeign} عملة أجنبية)`,
        reference_type: 'supplier_payment',
        reference_id: paymentId,
        created_by: userId
      }).execute();

      // 3. Update Supplier Ledger
      const newBalance = Number(supplier.balance || 0) - cleanForeign;
      await trx.insertInto('supplier_ledger').values({
        tenant_id: tenantId,
        account_id: supplier.account_id,
        supplier_id: supplier.id,
        entry_type: 'supplier_payment',
        amount: -cleanForeign,
        balance_after: newBalance,
        note: `حوالة خارجية: ${notes || ''}`,
        reference_type: 'supplier_payment',
        reference_id: paymentId,
        created_by: userId
      }).execute();

      // 4. Update Supplier Balance
      await trx.updateTable('suppliers')
        .set({ balance: newBalance })
        .where('id', '=', supplier.id)
        .where('tenant_id', '=', tenantId)
        .execute();

      return { success: true, paymentId, docNo: `FT-${paymentId}` };
    });
  }

  async recordPartnerPayout(tenantId: string, userId: number, partnerId: string, amount: number) {
    const cleanAmount = Number(amount);
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      throw new BadRequestException('مبلغ صرف الأرباح يجب أن يكون أكبر من الصفر.');
    }

    return await this.db.transaction().execute(async (trx) => {
      const partner = await trx
        .selectFrom('import_partners')
        .selectAll()
        .where('id', '=', partnerId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirstOrThrow();

      // Record in treasury_transactions as partner_payout (Dividend/Equity withdrawal, NOT operating expense)
      await trx.insertInto('treasury_transactions').values({
        tenant_id: tenantId,
        txn_type: 'partner_payout',
        amount: -cleanAmount,
        note: `صرف أرباح الشريك: ${partner.name}`,
        reference_type: 'partner_payout',
        reference_id: null,
        created_by: userId
      }).execute();

      // Update partner withdrawn profit
      await trx.updateTable('import_partners')
        .set((eb) => ({
          withdrawn_profit: sql`${eb.ref('withdrawn_profit')} + ${cleanAmount}`
        }))
        .where('id', '=', partnerId)
        .where('tenant_id', '=', tenantId)
        .execute();
        
      // Insert into partner ledger
      const ledgerInsert = await trx.insertInto('import_partner_ledger').values({
        tenant_id: tenantId,
        partner_id: partnerId,
        type: 'PROFIT_PAYOUT',
        amount: cleanAmount,
        transaction_date: new Date(),
        note: `صرف أرباح الشريك: ${partner.name}`,
        created_by: userId
      }).returning('id').executeTakeFirstOrThrow();
        
      return { success: true, ledgerId: ledgerInsert.id };
    });
  }

  async getPartnerLedger(tenantId: string, partnerId: string) {
    return await this.db
      .selectFrom('import_partner_ledger')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('partner_id', '=', partnerId)
      .orderBy('transaction_date', 'desc')
      .orderBy('created_at', 'desc')
      .execute();
  }

  async recordCapitalTransaction(tenantId: string, userId: number, partnerId: string, dto: { type: 'DEPOSIT' | 'WITHDRAWAL', amount: number, date: string, note?: string, accountId?: string }) {
    const cleanAmount = Number(dto.amount);
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      throw new BadRequestException('مبلغ حركة رأس المال يجب أن يكون أكبر من الصفر.');
    }

    return await this.db.transaction().execute(async (trx) => {
      const partner = await trx.selectFrom('import_partners')
        .selectAll()
        .where('id', '=', partnerId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirstOrThrow();

      if (dto.type === 'WITHDRAWAL' && Number(partner.capital_amount || 0) < cleanAmount) {
        throw new BadRequestException(`رصيد رأس المال الحالي (${partner.capital_amount}) لا يكفي لسحب مبلغ ${cleanAmount}.`);
      }

      const ledgerInsert = await trx.insertInto('import_partner_ledger').values({
        tenant_id: tenantId,
        partner_id: partnerId,
        type: dto.type,
        amount: cleanAmount,
        transaction_date: dto.date,
        note: dto.note || '',
        created_by: userId
      }).returning('id').executeTakeFirstOrThrow();

      const sign = dto.type === 'DEPOSIT' ? '+' : '-';
      await trx.updateTable('import_partners')
        .set((eb) => ({
          capital_amount: sql`${eb.ref('capital_amount')} ${sql.raw(sign)} ${cleanAmount}`
        }))
        .where('id', '=', partnerId)
        .where('tenant_id', '=', tenantId)
        .execute();

      if (dto.accountId) {
        await trx.insertInto('treasury_transactions').values({
          tenant_id: tenantId,
          txn_type: dto.type === 'DEPOSIT' ? 'revenue' : 'expense',
          amount: dto.type === 'DEPOSIT' ? cleanAmount : -cleanAmount,
          note: (dto.type === 'DEPOSIT' ? 'إيداع رأس مال شريك: ' : 'سحب رأس مال شريك: ') + (partner.name || '') + (dto.note ? ` - ${dto.note}` : ''),
          reference_type: 'partner_capital',
          created_by: userId,
          account_id: dto.accountId
        }).execute();
      }

      return { success: true, ledgerId: ledgerInsert.id };
    });
  }

  async updateShipmentItem(tenantId: string, itemId: string, dto: UpdateShipmentItemDto) {
    return this.inventoryDb.transaction().execute(async (trx) => {
      const parent = await trx.selectFrom('import_shipment_items').select('shipment_id')
        .where('tenant_id', '=', tenantId).where('id', '=', itemId).executeTakeFirst();
      if (!parent) throw new NotFoundException('بند الشحنة غير موجود');
      // Do not lock an item before its parent; every edit/post uses the same ordering.
      const state = await this.lockShipment(trx, tenantId, parent.shipment_id);
      const item = await trx.selectFrom('import_shipment_items').selectAll()
        .where('tenant_id', '=', tenantId).where('shipment_id', '=', parent.shipment_id)
        .where('id', '=', itemId).executeTakeFirstOrThrow();
      const payload: Updateable<ImportShipmentItemTable> = {};
      const stockEdit = dto.receivedQuantity !== undefined || dto.shortageHandlingMethod !== undefined;
      if (stockEdit) {
        this.assertShipmentEditable(state);
        if (dto.receivedQuantity !== undefined) payload.received_quantity = requireImportNumber(dto.receivedQuantity, 'الكمية المستلمة');
        if (dto.shortageHandlingMethod !== undefined) payload.shortage_handling_method = dto.shortageHandlingMethod;
      }
      if (dto.targetRetailMargin !== undefined) payload.target_retail_margin = requireImportNumber(dto.targetRetailMargin, 'هامش التجزئة');
      if (dto.targetWholesaleMargin !== undefined) payload.target_wholesale_margin = requireImportNumber(dto.targetWholesaleMargin, 'هامش الجملة');
      if (Object.keys(payload).length) {
        await trx.updateTable('import_shipment_items').set(payload)
          .where('tenant_id', '=', tenantId).where('shipment_id', '=', item.shipment_id).where('id', '=', itemId).execute();
        if (stockEdit) await this.calculateLandedCostInTransaction(trx, state.shipment);
      }
      return { success: true };
    });
  }

  async applySuggestedPrices(tenantId: string, shipmentId: string) {
    return await this.db.transaction().execute(async (trx) => {
      const items = await trx
        .selectFrom('import_shipment_items')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('shipment_id', '=', shipmentId)
        .execute();

      const shipment = await trx
        .selectFrom('import_shipments')
        .select(['exchange_rate_at_arrival', 'pricing_exchange_rate'])
        .where('id', '=', shipmentId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();
        
      const arrivalRate = Number(shipment?.exchange_rate_at_arrival) || 1;
      const pricingRate = Number(shipment?.pricing_exchange_rate) || arrivalRate;
        
      let updatedCount = 0;
      for (const item of items) {
        const cost = Number(item.landed_cost_egp || 0);
        
        // If pricing rate is different, adjust the base cost for pricing
        const unitUsd = Number(item.factory_unit_price_usd || 0);
        const pricingCostEgp = cost + (unitUsd * (pricingRate - arrivalRate));

        let updateData: any = {};

        if (item.target_retail_margin !== null && Number(item.target_retail_margin) > 0) {
          const rMargin = Number(item.target_retail_margin) / 100;
          updateData.retail_price = Number((pricingCostEgp * (1 + rMargin)).toFixed(2));
        }
        
        if (item.target_wholesale_margin !== null && Number(item.target_wholesale_margin) > 0) {
          const wMargin = Number(item.target_wholesale_margin) / 100;
          updateData.wholesale_price = Number((pricingCostEgp * (1 + wMargin)).toFixed(2));
        }

        if (Object.keys(updateData).length > 0) {
          await trx
            .updateTable('products')
            .set(updateData)
            .where('id', '=', Number(item.product_id))
            .where('tenant_id', '=', tenantId)
            .execute();
            
          updatedCount++;
        }
      }
      return { success: true, updatedCount };
    });
  }


  // ==========================================
  // 7. IMPORT COMMAND CENTER (DASHBOARD METRICS)
  // ==========================================

  async getImportCommandCenterMetrics(tenantId: string) {
    // 1. Capital metrics
    const partners = await this.db
      .selectFrom('import_partners')
      .select([
        sql<number>`coalesce(sum(capital_amount), 0)`.as('total_capital'),
        sql<number>`coalesce(sum(withdrawn_profit), 0)`.as('total_withdrawn'),
      ])
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    const totalCapital = Number(partners?.total_capital || 0);

    const activeProjects = await this.db
      .selectFrom('import_projects')
      .select([sql<number>`coalesce(sum(allocated_capital), 0)`.as('deployed_capital')])
      .where('tenant_id', '=', tenantId)
      .where('status', 'not in', ['closed', 'draft'])
      .executeTakeFirst();

    const deployedCapital = Number(activeProjects?.deployed_capital || 0);
    const availableCapital = Math.max(0, totalCapital - deployedCapital);

    // 2. Project counts by status
    const projectRows = await this.db
      .selectFrom('import_projects')
      .select(['status', sql<number>`count(*)`.as('count')])
      .where('tenant_id', '=', tenantId)
      .groupBy('status')
      .execute();

    const projectCounts: Record<string, number> = {};
    for (const r of projectRows) {
      projectCounts[r.status || 'unknown'] = Number(r.count || 0);
    }

    // 3. Shipments counts and values
    const shipmentRows = await this.db
      .selectFrom('import_shipments')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .execute();

    let inTransitCount = 0;
    let inCustomsCount = 0;
    let arrivedCount = 0;

    for (const s of shipmentRows) {
      if (s.status === 'Arrived') arrivedCount++;
      else if (s.status === 'In Customs') inCustomsCount++;
      else inTransitCount++;
    }

    // 4. Supplier foreign liabilities
    const debts = await this.db
      .selectFrom('suppliers')
      .select([sql<number>`coalesce(sum(balance), 0)`.as('total_debt_foreign')])
      .where('tenant_id', '=', tenantId)
      .where('balance', '>', 0)
      .executeTakeFirst();

    const totalDebtForeign = Number(debts?.total_debt_foreign || 0);

    // 5. Demurrage Risks & Warnings
    const demurrageAlerts: any[] = [];
    for (const s of shipmentRows.filter((r) => r.status !== 'Arrived')) {
      const risk = calculateDemurrageRisk({
        arrivalDate: s.arrival_date,
        demurrageStartDate: s.demurrage_start_date,
        freeDays: Number(s.free_demurrage_days || 14),
        ratePerDayUsd: Number(s.demurrage_rate_per_day || 50),
        exchangeRate: Number(s.exchange_rate_at_arrival || 50),
        status: s.status || 'Pending',
      });
      if (risk.isOverdue || (risk.daysRemaining !== null && risk.daysRemaining <= 3)) {
        demurrageAlerts.push({
          shipmentId: s.id,
          containerNumber: s.container_number,
          status: s.status,
          ...risk,
        });
      }
    }

    // 6. ACI Expirations
    const aciExpiring = await this.db
      .selectFrom('import_aci_compliance')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('status', 'not in', ['approved', 'expired'])
      .where('acid_expiry_date', 'is not', null)
      .where('acid_expiry_date', '<=', sql`CURRENT_DATE + INTERVAL '14 days'`)
      .execute();

    // 7. Recent Profit Snapshot (Current Month)
    const monthStart = new Date();
    monthStart.setDate(1);
    const profitReport = await this.generatePeriodProfitReport(tenantId, monthStart, new Date());

    return {
      capital: {
        totalCapital,
        deployedCapital,
        availableCapital,
        totalWithdrawn: Number(partners?.total_withdrawn || 0),
      },
      pipeline: {
        projects: projectCounts,
        shipments: {
          inTransit: inTransitCount,
          inCustoms: inCustomsCount,
          arrived: arrivedCount,
        },
      },
      liabilities: {
        totalDebtForeign,
      },
      alerts: {
        demurrageAlerts,
        aciExpiring,
      },
      performance: profitReport.data,
    };
  }

  // ==========================================
  // 8. PROJECT PARTNER DISTRIBUTION & CLOSURE
  // ==========================================

  async getProjectPartners(tenantId: string, projectId: string) {
    return await this.db
      .selectFrom('import_project_partners')
      .innerJoin('import_partners', 'import_partners.id', 'import_project_partners.partner_id')
      .select([
        'import_project_partners.id',
        'import_project_partners.partner_id',
        'import_project_partners.capital_share_amount',
        'import_project_partners.profit_percentage',
        'import_partners.name as partner_name',
      ])
      .where('import_project_partners.tenant_id', '=', tenantId)
      .where('import_project_partners.project_id', '=', projectId)
      .execute();
  }

  async setProjectPartners(
    tenantId: string,
    projectId: string,
    partners: Array<{ partnerId: string; capitalShare: number; profitPercentage: number }>
  ) {
    const totalPercentage = partners.reduce((sum, p) => sum + Number(p.profitPercentage || 0), 0);
    if (totalPercentage > 100.001) {
      throw new BadRequestException(`مجموع نسب الشركاء للمشروع (${totalPercentage}%) يتجاوز 100%.`);
    }

    return await this.db.transaction().execute(async (trx) => {
      await trx
        .deleteFrom('import_project_partners')
        .where('project_id', '=', projectId)
        .where('tenant_id', '=', tenantId)
        .execute();

      for (const p of partners) {
        await trx
          .insertInto('import_project_partners')
          .values({
            tenant_id: tenantId,
            project_id: projectId,
            partner_id: p.partnerId,
            capital_share_amount: Number(p.capitalShare || 0),
            profit_percentage: Number(p.profitPercentage || 0),
          })
          .execute();
      }

      return { success: true, count: partners.length };
    });
  }

  async closeProject(tenantId: string, userId: number, projectId: string) {
    return await this.db.transaction().execute(async (trx) => {
      const project = await trx
        .selectFrom('import_projects')
        .selectAll()
        .where('id', '=', projectId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirstOrThrow();

      if (project.status === 'closed') {
        throw new BadRequestException('المشروع مقفل بالفعل.');
      }

      await trx
        .updateTable('import_projects')
        .set({ status: 'closed', updated_at: sql`NOW()` })
        .where('id', '=', projectId)
        .where('tenant_id', '=', tenantId)
        .execute();

      return { success: true, message: `تم إقفال مشروع الاستيراد #${project.project_no} بنجاح.` };
    });
  }
}
