import { Injectable, NotFoundException, BadRequestException, ConflictException, UnprocessableEntityException, Inject, Optional } from '@nestjs/common';
import { AccountingPostingService } from '../accounting/accounting-posting.service';
import { AccountingTenantFoundationService } from '../accounting/accounting-tenant-foundation.service';
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
  ProcessLateExpenseDto,
  CalculateCustomsTaxDto,
} from './dto/import-sales.dto';
import { applyStockDelta, lockStockProducts } from '../../common/utils/location-stock-ledger';
import { formatDailyDocumentNumber } from '../../common/utils/document-number.util';
import { calculateImportFeasibility, FeasibilityCalculationResult } from './engines/import-feasibility.engine';
import {
  calculateLandedCostBreakdown,
  calculateDemurrageRisk,
  calculateLateExpenseAllocation,
} from './engines/import-landed-cost.engine';

@Injectable()
export class ImportSalesService {
  private readonly inventoryDb: Kysely<Database>;
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<any>,
    @Optional() @Inject(AccountingPostingService) private readonly accountingPosting?: AccountingPostingService,
  ) {
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

  /**
   * Resolves a real tenant account from Chart of Accounts / Accounting Settings.
   * Eliminates hardcoded account IDs (2110, 1110, 5201, 1130, 5101).
   * Follows the "No Silent Skips" architectural invariant.
   */
  /**
   * Validate posting roles against the tenant's actual chart-of-accounts flags.
   * Merely being an asset/liability is NOT sufficient to be a bank/inventory/AP account.
   * Never silently post to an unrelated account.
   */
  private async resolveTenantAccount(
    trx: Transaction<Database>,
    tenantId: string,
    role: 'cogs' | 'inventory' | 'payable' | 'bank' | 'forex_loss' | 'forex_gain',
    preferredAccountId?: number | null
  ): Promise<number> {
    const expectedType: Record<string, string> = {
      cogs: 'expense', inventory: 'asset', payable: 'liability',
      bank: 'asset', forex_loss: 'expense', forex_gain: 'revenue',
    };
    const accountIsEligible = (account: {
      account_type: string;
      is_active: boolean;
      is_cash_bank: boolean;
      is_inventory: boolean;
      is_payable: boolean;
      code: string;
    }): boolean => {
      if (!account.is_active || account.account_type !== expectedType[role]) return false;
      if (role === 'bank') return account.is_cash_bank === true;
      if (role === 'inventory') return account.is_inventory === true;
      if (role === 'payable') return account.is_payable === true;
      // FX accounts have no dedicated classification flag; require dedicated
      // configured codes rather than selecting an arbitrary revenue/expense account.
      if (role === 'forex_loss') return ['5201', '5190'].includes(account.code);
      if (role === 'forex_gain') return ['4201', '4190'].includes(account.code);
      return true;
    };
    const accountById = (id: number) => trx
      .selectFrom('accounting_accounts')
      .select(['id', 'code', 'account_type', 'is_active', 'is_cash_bank', 'is_inventory', 'is_payable'])
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id)
      .executeTakeFirst();

    if (preferredAccountId !== undefined && preferredAccountId !== null) {
      const id = Number(preferredAccountId);
      if (!Number.isSafeInteger(id) || id <= 0) {
        throw new BadRequestException('معرف الحساب المحاسبي يجب أن يكون رقمًا صحيحًا موجبًا.');
      }
      const preferred = await accountById(id);
      if (!preferred) {
        throw new BadRequestException(`الحساب المحاسبي المحدد (${id}) غير موجود في دليل حسابات المنشأة.`);
      }
      if (!accountIsEligible(preferred)) {
        throw new BadRequestException(`الحساب المحاسبي المحدد (${id}) غير صالح لدور (${role}) أو معطل. راجع نوع الحساب وعلامة وظيفته المحاسبية.`);
      }
      return Number(preferred.id);
    }

    const settings = await trx
      .selectFrom('accounting_settings')
      .select(['cogs_account_id', 'inventory_account_id', 'supplier_payable_account_id', 'bank_account_id'])
      .where('tenant_id', '=', tenantId)
      .where('id', '=', 1)
      .executeTakeFirst();
    const configured: Record<string, number | null> = {
      cogs: settings?.cogs_account_id ?? null,
      inventory: settings?.inventory_account_id ?? null,
      payable: settings?.supplier_payable_account_id ?? null,
      bank: settings?.bank_account_id ?? null,
      forex_loss: null,
      forex_gain: null,
    };
    const configuredId = configured[role];
    if (configuredId != null) {
      const account = await accountById(Number(configuredId));
      if (!account || !accountIsEligible(account)) {
        throw new UnprocessableEntityException(`حساب (${role}) في إعدادات المحاسبة غير صالح. يجب تصحيح الإعدادات قبل الترحيل.`);
      }
      return Number(account.id);
    }

    const candidateCodes: Record<string, string[]> = {
      cogs: ['5110', '5101', '5100'], inventory: ['1140', '1130'],
      payable: ['2110', '2100'], bank: ['1120'],
      forex_loss: ['5201', '5190'], forex_gain: ['4201', '4190'],
    };
    // Ordered, role-aware lookup; never fall back to the first asset/expense/liability.
    for (const code of candidateCodes[role]) {
      const account = await trx
        .selectFrom('accounting_accounts')
        .select(['id', 'code', 'account_type', 'is_active', 'is_cash_bank', 'is_inventory', 'is_payable'])
        .where('tenant_id', '=', tenantId)
        .where('code', '=', code)
        .executeTakeFirst();
      if (account && accountIsEligible(account)) return Number(account.id);
    }
    throw new UnprocessableEntityException(
      `لا يوجد حساب محاسبي معتمد ومصنف لدور (${role}). يجب إعداد دليل الحسابات قبل تنفيذ الحركة المالية.`
    );
  }

  /**
   * Partner contributions / returns are EQUITY movements, never sales revenue
   * or operating expenses. Cash, partner ledger and GL all commit atomically.
   */
  private async postPartnerCapitalMovement(
    trx: Transaction<Database>,
    tenantId: string,
    userId: number,
    partnerName: string,
    partnerId: string,
    type: 'DEPOSIT' | 'WITHDRAWAL',
    amount: number,
    movementDate: Date,
    requestedCashAccountId: string,
    note: string
  ): Promise<number> {
    const cashAccountId = await this.resolveTenantAccount(trx, tenantId, 'bank', Number(requestedCashAccountId));
    const cashAccount = await trx.selectFrom('accounting_accounts')
      .select(['id', 'account_id'])
      .where('tenant_id', '=', tenantId)
      .where('id', '=', cashAccountId)
      .executeTakeFirstOrThrow();
    const capitalAccount = await trx.selectFrom('accounting_accounts')
      .select(['id', 'is_active', 'account_type', 'allow_manual_entries'])
      .where('tenant_id', '=', tenantId)
      .where('account_id', '=', cashAccount.account_id)
      .where('code', '=', '3100')
      .executeTakeFirst();
    if (!capitalAccount || !capitalAccount.is_active || capitalAccount.account_type !== 'equity' || !capitalAccount.allow_manual_entries) {
      throw new UnprocessableEntityException('حساب رأس المال 3100 غير معتمد بدليل حسابات المنشأة؛ لا يمكن تسجيل الحركة بدون قيد حقوق ملكية.');
    }
    const cashIsDebit = type === 'DEPOSIT';
    const posted = await trx.insertInto('treasury_transactions').values({
      tenant_id: tenantId,
      account_id: cashAccount.account_id,
      txn_type: cashIsDebit ? 'partner_capital_deposit' : 'partner_capital_withdrawal',
      amount: cashIsDebit ? amount : -amount,
      note: `${cashIsDebit ? 'إيداع' : 'سحب'} رأس مال الشريك: ${partnerName}${note ? ' - ' + note : ''} (سجل ${partnerId})`,
      reference_type: 'partner_capital',
      reference_id: null,
      created_by: userId,
    }).returning('id').executeTakeFirstOrThrow();

    const postingService = this.accountingPosting ?? new AccountingPostingService(new AccountingTenantFoundationService());
    await postingService.postDomainJournal(trx, {
      sourceType: 'import_partner_capital',
      sourceId: Number(posted.id),
      tenantId,
      accountId: cashAccount.account_id,
      entryDate: movementDate,
      description: `${cashIsDebit ? 'مساهمة' : 'رد'} رأس مال الشريك ${partnerName} (حركة خزينة #${posted.id})`,
      createdBy: userId,
      postedBy: userId,
      lines: [
        {
          accountId: cashAccountId,
          description: 'حركة نقدية متعلقة برأس مال شريك',
          debit: cashIsDebit ? amount : 0,
          credit: cashIsDebit ? 0 : amount,
          partnerType: 'none',
          partnerId: null,
          branchId: null,
          locationId: null,
        },
        {
          accountId: Number(capitalAccount.id),
          description: 'حركة حقوق ملكية ورأس مال شريك',
          debit: cashIsDebit ? 0 : amount,
          credit: cashIsDebit ? amount : 0,
          partnerType: 'none',
          partnerId: null,
          branchId: null,
          locationId: null,
        },
      ],
    });
    return Number(posted.id);
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
    if (!name?.trim()) throw new BadRequestException('اسم الشريك مطلوب.');
    const cleanPercentage = Number(percentage);
    const cleanCapital = Number(capitalAmount);
    if (!Number.isFinite(cleanPercentage) || cleanPercentage < 0 || cleanPercentage > 100) {
      throw new BadRequestException('نسبة الشراكة يجب أن تكون بين 0% و100%.');
    }
    if (!Number.isFinite(cleanCapital) || cleanCapital < 0) {
      throw new BadRequestException('رأس المال يجب أن يكون مبلغًا موجبًا أو صفرًا.');
    }
    if (cleanCapital > 0 && !accountId) {
      throw new BadRequestException('يلزم تحديد حساب بنك أو خزينة معتمد لإثبات إيداع رأس مال الشريك.');
    }

    return await this.db.transaction().execute(async (trx) => {
      const existing = await trx.selectFrom('import_partners')
        .select(sql<number>`coalesce(sum(profit_share_percentage), 0)`.as('total_percentage'))
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();
      if (Number(existing?.total_percentage || 0) + cleanPercentage > 100.001) {
        throw new BadRequestException('مجموع نسب الشركاء سيتجاوز 100%.');
      }
      const partner = await trx.insertInto('import_partners').values({
        tenant_id: tenantId,
        name: name.trim(),
        profit_share_percentage: cleanPercentage,
        capital_amount: cleanCapital,
        withdrawn_profit: 0,
      }).returningAll().executeTakeFirstOrThrow();
      if (cleanCapital > 0) {
        const ledger = await trx.insertInto('import_partner_ledger').values({
          tenant_id: tenantId, partner_id: partner.id, type: 'DEPOSIT',
          amount: cleanCapital, transaction_date: new Date(),
          note: 'إيداع رأس مال افتتاحي', created_by: userId,
        }).returning('id').executeTakeFirstOrThrow();
        await this.postPartnerCapitalMovement(
          trx, tenantId, userId, partner.name, partner.id,
          'DEPOSIT', cleanCapital, new Date(), accountId!, String(ledger.id)
        );
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
        'import_suppliers_meta.verified_at',
        'import_suppliers_meta.verified_by',
        'import_suppliers_meta.verification_notes',
        'import_suppliers_meta.notes as import_notes',
      ])
      .where('suppliers.tenant_id', '=', tenantId)
      .orderBy('suppliers.name', 'asc')
      .execute();
  }

  async upsertSupplierImportMeta(tenantId: string, supplierId: string, dto: UpsertSupplierMetaDto) {
    const sId = Number(supplierId);
    return await this.db.transaction().execute(async (trx) => {
      const supplier = await trx
        .selectFrom('suppliers')
        .select('id')
        .where('id', '=', sId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!supplier) {
        throw new NotFoundException('المورد غير موجود بالمنشأة.');
      }

      const existing = await trx
        .selectFrom('import_suppliers_meta')
        .select(['id', 'audit_status'])
        .where('tenant_id', '=', tenantId)
        .where('supplier_id', '=', sId)
        .executeTakeFirst();

      // Newly added bank accounts must be 'unverified' by default until formally audited
      const auditStatus = dto.auditStatus && existing?.audit_status === 'verified'
        ? dto.auditStatus
        : 'unverified';

      const payload: any = {
        chinese_name: dto.chineseName,
        city: dto.city,
        province: dto.province,
        moq_description: dto.moqDescription,
        production_lead_time_days: dto.productionLeadTimeDays ?? 30,
        verified_bank_details: dto.verifiedBankDetails ? JSON.stringify(dto.verifiedBankDetails) : '{}',
        incoterms_accepted: dto.incotermsAccepted ? JSON.stringify(dto.incotermsAccepted) : JSON.stringify(['FOB', 'EXW', 'CIF']),
        qc_rating: dto.qcRating ?? 5.0,
        quality_certifications: dto.qualityCertifications ? JSON.stringify(dto.qualityCertifications) : '[]',
        audit_status: auditStatus,
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

  async verifySupplierBankDetails(
    tenantId: string,
    userId: number,
    supplierId: string,
    verificationNotes?: string
  ) {
    const sId = Number(supplierId);
    return await this.db.transaction().execute(async (trx) => {
      const existing = await trx
        .selectFrom('import_suppliers_meta')
        .selectAll()
        .where('supplier_id', '=', sId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!existing) {
        throw new NotFoundException('بيانات المورد غير مسجلة.');
      }

      await trx
        .updateTable('import_suppliers_meta')
        .set({
          audit_status: 'verified',
          verified_at: new Date(),
          verified_by: userId,
          verification_notes: verificationNotes || 'تم التحقق والاعتماد رسمياً للحساب البنكي للمورد.',
          updated_at: sql`NOW()`,
        })
        .where('supplier_id', '=', sId)
        .where('tenant_id', '=', tenantId)
        .execute();

      return { success: true, message: 'تم اعتماد وتوثيق الحساب البنكي للمورد بنجاح.' };
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

  async calculateCustomsTax(
    tenantId: string,
    hsCode: string,
    cifValueEgp: number,
    overrides?: { overrideDutyRatePercent?: number; overrideVatRatePercent?: number }
  ) {
    const tariff = await this.db
      .selectFrom('import_customs_tariffs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('hs_code', '=', hsCode)
      .executeTakeFirst();

    const isOfficial = Boolean(tariff && (tariff as any).is_official);
    const isDocumented = isOfficial;
    let dutyRate = 0;
    let vatRate = 0;
    let inspRate = 0;
    let source = '';

    if (tariff && isOfficial) {
      dutyRate = Number(tariff.duty_rate_percent) / 100;
      vatRate = Number(tariff.vat_rate_percent) / 100;
      inspRate = Number(tariff.inspection_fees_percent || 0) / 100;
      source = (tariff as any).official_source || 'مصلحة الجمارك المصرية (بند رسمي موثق)';
    } else if (tariff && !isOfficial) {
      dutyRate = Number(tariff.duty_rate_percent) / 100;
      vatRate = Number(tariff.vat_rate_percent) / 100;
      inspRate = Number(tariff.inspection_fees_percent || 0) / 100;
      source = 'تعريفة تقديرية غير رسمية (تتطلب مراجعة مستخلص جمركي)';
    } else if (
      overrides &&
      (overrides.overrideDutyRatePercent !== undefined || overrides.overrideVatRatePercent !== undefined)
    ) {
      dutyRate = Math.max(0, Number(overrides.overrideDutyRatePercent || 0)) / 100;
      vatRate = Math.max(0, Number(overrides.overrideVatRatePercent || 0)) / 100;
      inspRate = 0;
      source = 'تقدير يدوي مؤقت من المستخدم (غير رسمي)';
    } else {
      return {
        hsCode,
        isDocumentedTariff: false,
        isOfficialTariff: false,
        message: 'البند الجمركي غير مسجل بالتعريفة الرسمية المعتمدة. يلزم إدخال النسبة المعتمدة يدوياً.',
        cifValueEgp: Number(cifValueEgp || 0),
        customsDuty: 0,
        inspectionFees: 0,
        vatAmount: 0,
        totalCustomsDues: 0,
        dutyRatePercent: 0,
        vatRatePercent: 0,
      };
    }

    const cif = Math.max(0, Number(cifValueEgp) || 0);
    const customsDuty = cif * dutyRate;
    const inspectionFees = cif * inspRate;
    const vatBase = cif + customsDuty + inspectionFees;
    const vatAmount = vatBase * vatRate;
    const totalCustomsDues = customsDuty + inspectionFees + vatAmount;

    return {
      hsCode,
      isDocumentedTariff: isDocumented,
      isOfficialTariff: isOfficial,
      source,
      description: tariff?.description_ar || 'بند جمركي غير مسجل بالتعريفة الرسمية',
      regulatoryBody: tariff?.regulatory_body || 'غير محدد',
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

  private async calculateLandedCostInTransaction(
    trx: Transaction<Database>,
    shipment: Selectable<ImportShipmentTable>
  ) {
    const items = await trx
      .selectFrom('import_shipment_items')
      .selectAll()
      .where('tenant_id', '=', shipment.tenant_id)
      .where('shipment_id', '=', shipment.id)
      .execute();

    if (!items.length) {
      return { success: true, message: 'لا توجد أصناف بالشحنة' };
    }

    const rate = requireImportNumber(shipment.exchange_rate_at_arrival, 'سعر الصرف', Number.MIN_VALUE);
    const method = (shipment.cost_allocation_method as 'value' | 'weight' | 'cbm') || 'value';

    const breakdown = calculateLandedCostBreakdown({
      items: items.map((item) => ({
        id: item.id,
        productId: Number(item.product_id),
        quantity: Number(item.quantity),
        receivedQuantity: item.received_quantity !== null && item.received_quantity !== undefined ? Number(item.received_quantity) : Number(item.quantity),
        factoryUnitPriceUsd: Number(item.factory_unit_price_usd),
        shortageHandlingMethod: (item.shortage_handling_method as any) || 'capitalize',
      })),
      exchangeRate: rate,
      shippingCostUsd: Number(shipment.shipping_cost_usd ?? 0),
      customsCostEgp: Number(shipment.customs_cost_egp ?? 0),
      internalTransportCostEgp: Number(shipment.internal_transport_cost_egp ?? 0),
      demurrageFeesEgp: Number(shipment.actual_demurrage_fees ?? 0),
      vatRefundableEgp: Number(shipment.vat_refundable_egp ?? 0),
      vatIsRefundable: true,
      allocationMethod: method,
    });

    for (const line of breakdown.items) {
      await trx
        .updateTable('import_shipment_items')
        .set({
          allocated_overhead_egp: line.unitOverheadEgp,
          landed_cost_egp: line.landedCostEgp,
        })
        .where('tenant_id', '=', shipment.tenant_id)
        .where('shipment_id', '=', shipment.id)
        .where('id', '=', line.id)
        .execute();
    }

    return {
      success: true,
      message: 'تم إعادة احتساب التكلفة الفعلية وتوزيع الأعباء بنجاح وفق محرك Landed Cost المعتمد',
      breakdown,
    };
  }

  async processLateShipmentExpense(
    tenantId: string,
    userId: number,
    shipmentId: string,
    dto: ProcessLateExpenseDto
  ) {
    return await this.inventoryDb.transaction().execute(async (trx) => {
      const state = await this.lockShipment(trx, tenantId, shipmentId);
      const { shipment, receipt } = state;
      if (!receipt || receipt.state !== 'posted') {
        throw new BadRequestException('لا يمكن تسجيل مصروفات متأخرة إلا بعد استلام الشحنة وترحيل المخزون.');
      }

      const items = await trx
        .selectFrom('import_shipment_items')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('shipment_id', '=', shipmentId)
        .execute();

      if (!items.length) {
        throw new BadRequestException('الشحنة لا تحتوي على أصناف.');
      }

      let totalReceivedQty = 0;
      for (const item of items) {
        totalReceivedQty += Number(item.received_quantity ?? item.quantity);
      }

      const productIds = items.map((i) => Number(i.product_id));
      const products = await trx
        .selectFrom('products')
        .select(['id', 'cost_price', 'account_id'])
        .where('tenant_id', '=', tenantId)
        .where('id', 'in', productIds)
        .execute();

      for (const p of products.sort((a, b) => Number(a.id) - Number(b.id))) {
        await lockStockProducts(trx, { tenantId, accountId: p.account_id, productIds: [Number(p.id)] });
      }

      // Calculate item weights/shares for fair expense distribution across shipment items
      const itemBaseCosts = items.map((it) => {
        const qty = Number(it.quantity || 1);
        const unitUsd = Number(it.factory_unit_price_usd || 0);
        return qty * unitUsd;
      });
      const totalShipmentBaseUsd = itemBaseCosts.reduce((sum, v) => sum + v, 0);

      let totalLateCogs = 0;
      let totalLateInventory = 0;
      let totalSoldUnits = 0;
      let totalOnHandUnits = 0;

      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const pId = Number(item.product_id);
        const itemReceivedQty = Math.max(1, Number(item.received_quantity ?? item.quantity));

        // Check on-hand stock for this product in product_location_stock using real column 'qty'
        const stockRow = await trx
          .selectFrom('product_location_stock')
          .select([sql<number>`coalesce(sum(qty), 0)`.as('total_qty')])
          .where('tenant_id', '=', tenantId)
          .where('product_id', '=', pId)
          .executeTakeFirst();
        const currentStock = Math.max(0, Number(stockRow?.total_qty || 0));

        const itemOnHandQty = Math.min(itemReceivedQty, currentStock);
        const itemSoldQty = Math.max(0, itemReceivedQty - itemOnHandQty);

        totalOnHandUnits += itemOnHandQty;
        totalSoldUnits += itemSoldQty;

        // Share of late expense allocated to this item
        const itemShare = totalShipmentBaseUsd > 0
          ? itemBaseCosts[idx] / totalShipmentBaseUsd
          : itemReceivedQty / Math.max(1, totalReceivedQty);
        const itemLateExpense = dto.lateExpenseAmount * itemShare;

        const itemCogsAdj = (itemSoldQty / itemReceivedQty) * itemLateExpense;
        const itemInventoryAdj = (itemOnHandQty / itemReceivedQty) * itemLateExpense;
        const itemUnitCostIncrease = itemOnHandQty > 0 ? itemInventoryAdj / itemOnHandQty : 0;

        totalLateCogs += itemCogsAdj;
        totalLateInventory += itemInventoryAdj;

        if (itemUnitCostIncrease > 0) {
          await trx
            .updateTable('products')
            .set((eb) => ({
              cost_price: sql`${eb.ref('cost_price')} + ${Number(itemUnitCostIncrease.toFixed(6))}`,
              updated_at: sql`NOW()`,
            }))
            .where('tenant_id', '=', tenantId)
            .where('id', '=', pId)
            .execute();
        }

        await trx
          .updateTable('import_shipment_items')
          .set((eb) => ({
            landed_cost_egp: sql`${eb.ref('landed_cost_egp')} + ${Number((itemLateExpense / itemReceivedQty).toFixed(6))}`,
          }))
          .where('tenant_id', '=', tenantId)
          .where('id', '=', item.id)
          .execute();
      }

      totalLateCogs = Number(totalLateCogs.toFixed(2));
      totalLateInventory = Number(totalLateInventory.toFixed(2));

      // Resolve accounts dynamically from COA / Accounting Settings
      const cogsAccountId = await this.resolveTenantAccount(trx, tenantId, 'cogs', dto.accountId ? Number(dto.accountId) : null);
      const inventoryAccountId = await this.resolveTenantAccount(trx, tenantId, 'inventory');
      const payableAccountId = await this.resolveTenantAccount(trx, tenantId, 'payable', dto.payableAccountId ? Number(dto.payableAccountId) : null);

      let expenseId: number | null = null;
      if (totalLateCogs > 0) {
        const exp = await trx
          .insertInto('expenses')
          .values({
            tenant_id: tenantId,
            account_id: String(cogsAccountId),
            title: `${dto.title} (تسوية تكلفة متأخرة على مبيعات سابقة) - حاوية ${shipment.container_number}`,
            amount: totalLateCogs,
            expense_date: new Date().toISOString().slice(0, 10),
            created_by: userId,
            note: dto.note || `تم تحميل ${totalSoldUnits} وحدة مباعة بقيمة ${totalLateCogs} ج.م`,
            branch_id: null,
            location_id: null,
          })
          .returning('id')
          .executeTakeFirstOrThrow();
        expenseId = exp.id;
      }

      const postingService = this.accountingPosting ?? new AccountingPostingService(new AccountingTenantFoundationService());
      const lines: any[] = [];
      if (totalLateCogs > 0) {
        lines.push({
          accountId: cogsAccountId,
          description: `تسوية تكلفة مبيعات سابقة لمصروف متأخر - حاوية ${shipment.container_number}`,
          debit: totalLateCogs,
          credit: 0,
          partnerType: 'none',
          partnerId: null,
          branchId: null,
          locationId: null,
        });
      }
      if (totalLateInventory > 0) {
        lines.push({
          accountId: inventoryAccountId,
          description: `رسملة مصروف متأخر على المخزون المتبقي - حاوية ${shipment.container_number}`,
          debit: totalLateInventory,
          credit: 0,
          partnerType: 'none',
          partnerId: null,
          branchId: null,
          locationId: null,
        });
      }
      lines.push({
        accountId: payableAccountId,
        description: `استحقاق مصروف متأخر - حاوية ${shipment.container_number}`,
        debit: 0,
        credit: Number(dto.lateExpenseAmount.toFixed(2)),
        partnerType: shipment.supplier_id ? 'supplier' : 'none',
        partnerId: shipment.supplier_id ? Number(shipment.supplier_id) : null,
        branchId: null,
        locationId: null,
      });

      const journalEntryId = await postingService.postDomainJournal(trx, {
        sourceType: 'import_late_expense',
        sourceId: expenseId || 0,
        tenantId,
        accountId: tenantId,
        entryDate: new Date(),
        description: `تسوية مصروف استيراد متأخر - حاوية ${shipment.container_number} (${dto.title})`,
        branchId: null,
        locationId: null,
        createdBy: userId,
        postedBy: userId,
        lines,
      });

      await trx
        .updateTable('import_shipments')
        .set((eb) => ({
          late_expenses_total_egp: sql`coalesce(late_expenses_total_egp, 0) + ${dto.lateExpenseAmount}`,
          late_cogs_adjustment_egp: sql`coalesce(late_cogs_adjustment_egp, 0) + ${totalLateCogs}`,
          late_inventory_adjustment_egp: sql`coalesce(late_inventory_adjustment_egp, 0) + ${totalLateInventory}`,
        }))
        .where('tenant_id', '=', tenantId)
        .where('id', '=', shipmentId)
        .execute();

      return {
        success: true,
        message: 'تمت معالجة المصروف المتأخر وتوزيعه محاسبياً بين تكلفة البضاعة المباعة والمخزون المتبقي بنجاح.',
        allocation: {
          lateExpenseAmount: dto.lateExpenseAmount,
          lateCogsAdjustmentEgp: totalLateCogs,
          lateInventoryAdjustmentEgp: totalLateInventory,
          soldQuantity: totalSoldUnits,
          onHandQuantity: totalOnHandUnits,
          journalEntryId,
        },
        cogsExpenseId: expenseId,
      };
    });
  }

  async generatePeriodProfitReport(
    tenantId: string,
    startDate: string | Date,
    endDate: string | Date,
    projectId?: string,
    executor?: any
  ) {
    const qb = (executor || this.db) as Kysely<Database>;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (typeof endDate === 'string' && !endDate.includes('T')) {
      end.setHours(23, 59, 59, 999);
    }

    let projectProductIds: number[] = [];
    let projectShipmentIds: string[] = [];

    if (projectId) {
      const shipments = await qb
        .selectFrom('import_shipments')
        .select(['id', 'shipping_expense_id', 'customs_expense_id', 'transport_expense_id'])
        .where('tenant_id', '=', tenantId)
        .where('project_id', '=', projectId)
        .execute();

      projectShipmentIds = shipments.map((s) => s.id);

      if (projectShipmentIds.length > 0) {
        const items = await qb
          .selectFrom('import_shipment_items')
          .select('product_id')
          .where('tenant_id', '=', tenantId)
          .where('shipment_id', 'in', projectShipmentIds)
          .execute();

        projectProductIds = [...new Set(items.map((i) => Number(i.product_id)))];
      }
    }

    let totalRevenue = 0;
    let totalCost = 0;
    let totalDiscounts = 0;
    let returnRevenue = 0;
    let returnCost = 0;

    if (projectId) {
      // Precise inventory source scoping: Map each product's received quantity and landed cost in this project
      const projectItems = projectShipmentIds.length > 0
        ? await qb
            .selectFrom('import_shipment_items')
            .select(['product_id', 'received_quantity', 'quantity', 'landed_cost_egp'])
            .where('tenant_id', '=', tenantId)
            .where('shipment_id', 'in', projectShipmentIds)
            .execute()
        : [];

      const productSources = new Map<number, { receivedQty: number; unitCost: number }>();
      for (const item of projectItems) {
        const pId = Number(item.product_id);
        const qty = Number(item.received_quantity ?? item.quantity ?? 0);
        const cost = Number(item.landed_cost_egp || 0);
        const existing = productSources.get(pId);
        if (existing) {
          const totalQ = existing.receivedQty + qty;
          const weightedCost = totalQ > 0 ? (existing.receivedQty * existing.unitCost + qty * cost) / totalQ : cost;
          productSources.set(pId, { receivedQty: totalQ, unitCost: weightedCost });
        } else {
          productSources.set(pId, { receivedQty: qty, unitCost: cost });
        }
      }

      if (projectProductIds.length > 0) {
        const salesRows = await qb
          .selectFrom('sales')
          .innerJoin('sale_items', 'sale_items.sale_id', 'sales.id')
          .select([
            'sale_items.product_id',
            'sale_items.qty',
            'sale_items.line_total',
            'sale_items.allocated_discount',
          ])
          .where('sales.tenant_id', '=', tenantId)
          .where('sales.status', '!=', 'cancelled')
          .where('sales.created_at', '>=', start)
          .where('sales.created_at', '<=', end)
          .where('sale_items.product_id', 'in', projectProductIds)
          .orderBy('sales.created_at', 'asc')
          .execute();

        const remainingSource = new Map<number, number>();
        for (const [pId, src] of productSources.entries()) {
          remainingSource.set(pId, src.receivedQty);
        }

        for (const row of salesRows) {
          const pId = Number(row.product_id);
          const avail = remainingSource.get(pId) || 0;
          if (avail > 0) {
            const soldFromProject = Math.min(Number(row.qty), avail);
            const ratio = Number(row.qty) > 0 ? soldFromProject / Number(row.qty) : 1;
            totalRevenue += Number(row.line_total) * ratio;
            totalDiscounts += Number(row.allocated_discount || 0) * ratio;
            totalCost += soldFromProject * (productSources.get(pId)?.unitCost || 0);
            remainingSource.set(pId, avail - soldFromProject);
          }
        }

        const returnRows = await qb
          .selectFrom('return_documents')
          .innerJoin('return_items', 'return_items.return_document_id', 'return_documents.id')
          .select([
            'return_items.product_id',
            'return_items.qty',
            'return_items.line_total',
          ])
          .where('return_documents.tenant_id', '=', tenantId)
          .where('return_documents.return_type', '=', 'sale')
          .where('return_documents.created_at', '>=', start)
          .where('return_documents.created_at', '<=', end)
          .where('return_items.product_id', 'in', projectProductIds)
          .execute();

        for (const rRow of returnRows) {
          const pId = Number(rRow.product_id);
          const src = productSources.get(pId);
          if (src) {
            returnRevenue += Number(rRow.line_total);
            returnCost += Number(rRow.qty) * src.unitCost;
          }
        }
      }
    } else {
      // General company-wide period report
      const salesData = await qb
        .selectFrom('sales')
        .innerJoin('sale_items', 'sale_items.sale_id', 'sales.id')
        .select([
          sql<number>`coalesce(sum(sale_items.line_total), 0)`.as('total_revenue'),
          sql<number>`coalesce(sum(sale_items.qty * sale_items.cost_price), 0)`.as('total_cost'),
          sql<number>`coalesce(sum(sale_items.allocated_discount), 0)`.as('total_discount'),
        ])
        .where('sales.tenant_id', '=', tenantId)
        .where('sales.status', '!=', 'cancelled')
        .where('sales.created_at', '>=', start)
        .where('sales.created_at', '<=', end)
        .executeTakeFirst();

      totalRevenue = Number(salesData?.total_revenue || 0);
      totalCost = Number(salesData?.total_cost || 0);
      totalDiscounts = Number(salesData?.total_discount || 0);

      const returnData = await qb
        .selectFrom('return_documents')
        .innerJoin('return_items', 'return_items.return_document_id', 'return_documents.id')
        .select([
          sql<number>`coalesce(sum(return_items.line_total), 0)`.as('return_revenue'),
          sql<number>`coalesce(sum(return_items.qty * return_items.cost_price), 0)`.as('return_cost'),
        ])
        .where('return_documents.tenant_id', '=', tenantId)
        .where('return_documents.return_type', '=', 'sale')
        .where('return_documents.created_at', '>=', start)
        .where('return_documents.created_at', '<=', end)
        .executeTakeFirst();

      returnRevenue = Number(returnData?.return_revenue || 0);
      returnCost = Number(returnData?.return_cost || 0);
    }

    const netSalesRevenue = totalRevenue - totalDiscounts - returnRevenue;
    const netCogs = totalCost - returnCost;
    const grossProfit = netSalesRevenue - netCogs;

    let totalExpenses = 0;

    if (projectId) {
      const sourcingExpenses = await qb
        .selectFrom('import_sourcing_trips')
        .select([sql<number>`coalesce(sum(actual_cost_egp), 0)`.as('total_sourcing')])
        .where('tenant_id', '=', tenantId)
        .where('project_id', '=', projectId)
        .executeTakeFirst();

      const lateCogsExp = await qb
        .selectFrom('import_shipments')
        .select([sql<number>`coalesce(sum(late_cogs_adjustment_egp), 0)`.as('total_late_cogs')])
        .where('tenant_id', '=', tenantId)
        .where('project_id', '=', projectId)
        .executeTakeFirst();

      totalExpenses = Number(sourcingExpenses?.total_sourcing || 0) + Number(lateCogsExp?.total_late_cogs || 0);
    } else {
      const shipmentExpenseIds = await qb
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

      let expensesQuery = qb
        .selectFrom('expenses')
        .select([sql<number>`coalesce(sum(amount), 0)`.as('total_expenses')])
        .where('tenant_id', '=', tenantId)
        .where('expense_date', '>=', start)
        .where('expense_date', '<=', end)
        .where((eb) =>
          eb.and([
            eb('title', 'not like', 'حوالة خارجية%'),
            eb('title', 'not like', 'صرف أرباح الشريك%'),
          ])
        );

      if (excludedExpenseIds.size > 0) {
        expensesQuery = expensesQuery.where('id', 'not in', Array.from(excludedExpenseIds));
      }

      const expensesData = await expensesQuery.executeTakeFirst();
      totalExpenses = Number(expensesData?.total_expenses || 0);
    }

    const netProfitPool = grossProfit - totalExpenses;

    let partners: any[] = [];
    if (projectId) {
      partners = await qb
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
        .where('import_project_partners.is_active', '=', true)
        .execute();
    }

    if (partners.length === 0) {
      partners = await qb
        .selectFrom('import_partners')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .execute();
    }

    const partnerShares = partners.map((p) => {
      const percentage = Number(p.profit_share_percentage) || 0;
      const shareAmount = netProfitPool > 0 ? (netProfitPool * percentage) / 100 : 0;
      const withdrawn = Number(p.withdrawn_profit) || 0;
      return {
        partnerId: p.id,
        name: p.name,
        percentage,
        shareAmount: Number(shareAmount.toFixed(2)),
        withdrawnProfit: Number(withdrawn.toFixed(2)),
        currentBalance: Number((shareAmount - withdrawn).toFixed(2)),
      };
    });

    return {
      success: true,
      message: projectId ? 'تم تجميع أرباح مشروع الاستيراد بنجاح' : 'تم تجميع أرباح الشراكة العامة بنجاح',
      data: {
        projectId: projectId || null,
        // Quantity-capped SKU sales are not evidence of the actual source shipment.
        // Never treat the provisional report as approved distributable earnings.
        profitAttributionVerified: false,
        attributionStatus: 'UNVERIFIED_SOURCE',
        grossSalesRevenue: Number(totalRevenue.toFixed(2)),
        salesDiscounts: Number(totalDiscounts.toFixed(2)),
        salesReturnsRevenue: Number(returnRevenue.toFixed(2)),
        netSalesRevenue: Number(netSalesRevenue.toFixed(2)),
        totalRevenue: Number(netSalesRevenue.toFixed(2)),
        grossCogs: Number(totalCost.toFixed(2)),
        returnsCogs: Number(returnCost.toFixed(2)),
        netCogs: Number(netCogs.toFixed(2)),
        totalCost: Number(netCogs.toFixed(2)),
        grossProfit: Number(grossProfit.toFixed(2)),
        operatingExpenses: Number(totalExpenses.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        netProfitPool: Number(netProfitPool.toFixed(2)),
        partnerShares,
      },
    };
  }

  async listForeignTransfers(tenantId: string) {
    const rows = await this.db
      .selectFrom('supplier_payments')
      .innerJoin('suppliers', 'suppliers.id', 'supplier_payments.supplier_id')
      .select([
        'supplier_payments.id',
        'supplier_payments.doc_no',
        'supplier_payments.amount',
        'supplier_payments.amount_foreign',
        'supplier_payments.currency',
        'supplier_payments.note',
        'supplier_payments.created_at',
        'suppliers.name as supplier_name',
      ])
      .where('supplier_payments.tenant_id', '=', tenantId)
      .where('supplier_payments.doc_no', 'like', 'FT-%')
      .orderBy('supplier_payments.created_at', 'desc')
      .execute();

    return rows.map((r) => ({
      id: r.id,
      docNo: r.doc_no,
      amountForeign: r.amount_foreign == null ? null : Number(r.amount_foreign),
      amountEgp: Number(r.amount),
      currency: r.currency,
      requiresLegacyReconciliation: r.amount_foreign == null,
      supplierName: r.supplier_name,
      notes: r.note,
      createdAt: r.created_at,
    }));
  }

  async recordForeignTransfer(tenantId: string, userId: number, dto: RecordForeignTransferDto) {
    const { supplierId, amountEgp, amountForeign, currency, exchangeRateContract, proformaInvoiceId, notes, projectId, bankAccountId: reqBankAccountId } = dto;
    const sId = Number(supplierId);

    const cleanEgp = Number(amountEgp);
    const cleanForeign = Number(amountForeign);
    const requestKey = (dto.idempotencyKey || '').trim();
    if (!requestKey || requestKey.length > 128) {
      throw new BadRequestException('مفتاح عدم تكرار الحوالة (Idempotency Key) إلزامي ويجب ألا يتجاوز 128 حرفًا.');
    }

    if (!Number.isFinite(cleanEgp) || cleanEgp <= 0 || !Number.isFinite(cleanForeign) || cleanForeign <= 0) {
      throw new BadRequestException('مبالغ الحوالة بالجنيه والعملة الأجنبية يجب أن تكون أكبر من الصفر.');
    }

    return await this.db.transaction().execute(async (trx) => {
      const supplier = await trx
        .selectFrom('suppliers')
        .select(['id', 'name', 'account_id', 'balance'])
        .where('id', '=', sId)
        .where('tenant_id', '=', tenantId)
        .forUpdate()
        .executeTakeFirstOrThrow();

      // 1. Proforma Invoice Integrity Checks (Supplier, Project, Currency, Overpayment, Duplicate)
      if (proformaInvoiceId) {
        const pi = await trx
          .selectFrom('import_proforma_invoices')
          .selectAll()
          .where('id', '=', proformaInvoiceId)
          .where('tenant_id', '=', tenantId)
          .forUpdate()
          .executeTakeFirst();

        if (!pi) {
          throw new BadRequestException('الفاتورة المبدئية المحددة غير موجودة أو لا تنتمي لهذه المنشأة.');
        }

        if (Number(pi.supplier_id) !== sId) {
          throw new BadRequestException(
            `الفاتورة المبدئية (${pi.pi_number}) تخص مورداً آخر وليست للمورد المحدد.`
          );
        }

        if (projectId && pi.project_id && projectId !== pi.project_id) {
          throw new BadRequestException(
            `الفاتورة المبدئية (${pi.pi_number}) مرتبطة بمشروع استيراد آخر.`
          );
        }

        const piCurrency = (pi.currency || 'USD').toUpperCase();
        const transferCurrency = (currency || 'USD').toUpperCase();
        if (piCurrency !== transferCurrency) {
          throw new BadRequestException(
            `عملة الحوالة (${transferCurrency}) لا تطابق عملة الفاتورة المبدئية (${piCurrency}).`
          );
        }

        if (pi.payment_status === 'paid' && Number(pi.paid_amount_foreign || 0) >= Number(pi.total_amount_foreign || 0)) {
          throw new BadRequestException(
            `الفاتورة المبدئية (${pi.pi_number}) مسددة بالكامل بالفعل ولا يمكن سداد دفعات إضافية عليها.`
          );
        }

        const totalForeign = Number(pi.total_amount_foreign || 0);
        const alreadyPaidForeign = Number(pi.paid_amount_foreign || 0);
        const remainingForeign = Math.max(0, totalForeign - alreadyPaidForeign);
        if (cleanForeign > remainingForeign + 0.0001) {
          throw new BadRequestException(
            `مبلغ الحوالة (${cleanForeign.toFixed(2)} ${transferCurrency}) يتجاوز المتبقي غير المسدد للفاتورة المبدئية (${remainingForeign.toFixed(2)} ${transferCurrency}).`
          );
        }

        const newPaid = alreadyPaidForeign + cleanForeign;
        const newStatus = newPaid >= totalForeign - 0.0001 ? 'paid' : 'partially_paid';

        await trx
          .updateTable('import_proforma_invoices')
          .set({ paid_amount_foreign: newPaid, payment_status: newStatus })
          .where('id', '=', proformaInvoiceId)
          .where('tenant_id', '=', tenantId)
          .execute();
      }

      // 2. Database-Backed Idempotency Protection
      {
        const existingPayment = await trx
          .selectFrom('supplier_payments')
          .select(['id', 'doc_no', 'created_at'])
          .where('tenant_id', '=', tenantId)
          .where('idempotency_key', '=', requestKey)
          .executeTakeFirst();

        if (existingPayment) {
          throw new ConflictException(
            `تم تنفيذ هذا الطلب مسبقاً برقم (${existingPayment.doc_no})؛ تم منع إعادة التنفيذ بواسطة مفتاح عدم التكرار (Idempotency Key).`
          );
        }
      }

      // 3. Resolve Real Accounts from Chart of Accounts / Accounting Settings
      const supplierApAccountId = await this.resolveTenantAccount(trx, tenantId, 'payable');
      const bankAccountId = await this.resolveTenantAccount(trx, tenantId, 'bank', reqBankAccountId);
      const bankScope = await trx.selectFrom('accounting_accounts')
        .select('account_id').where('tenant_id', '=', tenantId).where('id', '=', bankAccountId)
        .executeTakeFirstOrThrow();
      const forexLossAccountId = await this.resolveTenantAccount(trx, tenantId, 'forex_loss');
      const forexGainAccountId = await this.resolveTenantAccount(trx, tenantId, 'forex_gain');

      // 4. Exact Base Currency (EGP) Accounting Entries without mixing foreign units
      const effectiveRateContract = exchangeRateContract && exchangeRateContract > 0
        ? exchangeRateContract
        : (cleanEgp / cleanForeign);
      const contractValue = Number((cleanForeign * effectiveRateContract).toFixed(2));
      const actualEgp = Number(cleanEgp.toFixed(2));
      const forexVarianceEgp = Number((actualEgp - contractValue).toFixed(2));

      let paymentInsert;
      try {
        paymentInsert = await trx
          .insertInto('supplier_payments')
          .values({
            tenant_id: tenantId,
            account_id: supplier.account_id || tenantId,
            supplier_id: supplier.id,
            amount: contractValue,
            amount_foreign: cleanForeign,
            note: `حوالة استيراد خارجية${notes ? ' - ' + notes : ''} [تدبير عملة: ${actualEgp} ج.م]`,
            created_by: userId,
            currency: currency || 'USD',
            exchange_rate: actualEgp / cleanForeign,
            forex_variance_egp: forexVarianceEgp,
            proforma_invoice_id: proformaInvoiceId || null,
            idempotency_key: requestKey,
          } as any)
          .returning('id')
          .executeTakeFirstOrThrow();
      } catch (err: any) {
        if (err?.code === '23505' || String(err?.message || '').includes('idx_supplier_payments_tenant_idempotency')) {
          throw new ConflictException(
            'تم تنفيذ حوالة متزامنة بنفس مفتاح عدم التكرار (Idempotency Key).'
          );
        }
        throw err;
      }

      const paymentId = paymentInsert.id;

      await trx
        .updateTable('supplier_payments')
        .set({ doc_no: `FT-${paymentId}` })
        .where('id', '=', paymentId)
        .where('tenant_id', '=', tenantId)
        .execute();

      await trx
        .insertInto('treasury_transactions')
        .values({
          tenant_id: tenantId,
          account_id: bankScope.account_id,
          txn_type: 'supplier_payment',
          amount: -actualEgp,
          note: `تدبير عملة: حوالة خارجية إلى ${supplier.name} (${cleanForeign} ${currency || 'USD'})` +
            (forexVarianceEgp !== 0 ? ` [فروق صرف: ${forexVarianceEgp.toFixed(2)} ج.م]` : ''),
          reference_type: 'supplier_payment',
          reference_id: paymentId,
          created_by: userId,
        })
        .execute();

      // The shared supplier ledger and suppliers.balance are BASE-CURRENCY EGP.
      // The original foreign-currency units belong only in amount_foreign / Proforma.
      const currentSupplierBalance = Number(supplier.balance || 0);
      const newSupplierBalance = currentSupplierBalance - contractValue;

      await trx
        .insertInto('supplier_ledger')
        .values({
          tenant_id: tenantId,
          account_id: supplier.account_id ? String(supplier.account_id) : tenantId,
          supplier_id: supplier.id,
          entry_type: 'payment',
          amount: contractValue,
          balance_after: newSupplierBalance,
          note: `حوالة خارجية FT-${paymentId} (${cleanForeign} ${currency || 'USD'})` +
            (forexVarianceEgp !== 0 ? ` [فروق صرف: ${forexVarianceEgp.toFixed(2)} ج.م]` : ''),
          reference_type: 'supplier_payment',
          reference_id: paymentId,
          return_document_id: null,
          branch_id: null,
          location_id: null,
          created_by: userId,
        })
        .execute();

      await trx
        .updateTable('suppliers')
        .set((eb) => ({
          balance: sql`${eb.ref('balance')} - ${contractValue}`,
        }))
        .where('id', '=', sId)
        .where('tenant_id', '=', tenantId)
        .execute();

      const postingService = this.accountingPosting ?? new AccountingPostingService(new AccountingTenantFoundationService());
      const lines: any[] = [
        // Line 1: Debit Supplier Accounts Payable in EGP (relieve debt at contract rate)
        {
          accountId: supplierApAccountId,
          description: `سداد مديونية مورد خارجي - ${supplier.name} (${cleanForeign} ${currency || 'USD'})`,
          debit: contractValue,
          credit: 0,
          partnerType: 'supplier',
          partnerId: supplier.id,
          branchId: null,
          locationId: null,
        },
      ];

      // Line 2: Realized Forex Variance in EGP (Debit if Loss, Credit if Gain)
      if (forexVarianceEgp > 0.001) {
        lines.push({
          accountId: forexLossAccountId,
          description: `فروق سعر صرف محققة (خسارة) على حوالة FT-${paymentId}`,
          debit: forexVarianceEgp,
          credit: 0,
          partnerType: 'none',
          partnerId: null,
          branchId: null,
          locationId: null,
        });
      } else if (forexVarianceEgp < -0.001) {
        lines.push({
          accountId: forexGainAccountId,
          description: `فروق سعر صرف محققة (أرباح) على حوالة FT-${paymentId}`,
          debit: 0,
          credit: Math.abs(forexVarianceEgp),
          partnerType: 'none',
          partnerId: null,
          branchId: null,
          locationId: null,
        });
      }

      // Line 3: Credit Bank account for actual cash paid in base currency (EGP)
      lines.push({
        accountId: bankAccountId,
        description: `تدبير عملة وخروج نقدية بنكية لحوالة FT-${paymentId}`,
        debit: 0,
        credit: actualEgp,
        partnerType: 'none',
        partnerId: null,
        branchId: null,
        locationId: null,
      });

      const jeId = await postingService.postDomainJournal(trx, {
        sourceType: 'supplier_payment',
        sourceId: paymentId,
        tenantId,
        accountId: supplier.account_id || tenantId,
        entryDate: new Date(),
        description: `سداد مورد خارجي وحوالة أجنبية FT-${paymentId} - ${supplier.name} (${cleanForeign} ${currency || 'USD'})`,
        branchId: null,
        locationId: null,
        createdBy: userId,
        postedBy: userId,
        lines,
      });

      return {
        success: true,
        paymentId,
        docNo: `FT-${paymentId}`,
        forexVarianceEgp,
        journalEntryId: jeId,
        bankAccountId,
        supplierApAccountId,
      };
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
        .forUpdate()
        .executeTakeFirstOrThrow();

      const profitReport = await this.generatePeriodProfitReport(tenantId, new Date('2020-01-01'), new Date());
      if (!profitReport.data.profitAttributionVerified) {
        throw new UnprocessableEntityException(
          'صرف الأرباح موقوف لحين إتمام تتبع مصدر البضاعة واعتماد أرباح كل مشروع؛ التقرير الحالي تقديري وغير صالح للتوزيع.'
        );
      }
      const partnerShare = profitReport.data.partnerShares.find((p: any) => p.partnerId === partnerId);
      const totalEntitled = Number(partnerShare?.shareAmount || 0);
      const withdrawn = Number(partner.withdrawn_profit || 0);
      const maxAvailable = Math.max(0, totalEntitled - withdrawn);

      if (cleanAmount > maxAvailable) {
        throw new BadRequestException(
          `لا يمكن صرف أرباح تتجاوز المستحق المعتمد للشريك. المتاح للصرف حالياً: ${maxAvailable.toFixed(2)} ج.م (المطلوب: ${cleanAmount.toFixed(2)} ج.م).`
        );
      }

      await trx
        .insertInto('treasury_transactions')
        .values({
          tenant_id: tenantId,
          txn_type: 'partner_payout',
          amount: -cleanAmount,
          note: `صرف أرباح الشريك: ${partner.name}`,
          reference_type: 'partner_payout',
          reference_id: null,
          created_by: userId,
        })
        .execute();

      await trx
        .updateTable('import_partners')
        .set((eb) => ({
          withdrawn_profit: sql`${eb.ref('withdrawn_profit')} + ${cleanAmount}`,
        }))
        .where('id', '=', partnerId)
        .where('tenant_id', '=', tenantId)
        .execute();

      const ledgerInsert = await trx
        .insertInto('import_partner_ledger')
        .values({
          tenant_id: tenantId,
          partner_id: partnerId,
          type: 'PROFIT_PAYOUT',
          amount: cleanAmount,
          transaction_date: new Date(),
          note: `صرف أرباح الشريك: ${partner.name}`,
          created_by: userId,
        })
        .returning('id')
        .executeTakeFirstOrThrow();

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

  async recordCapitalTransaction(tenantId: string, userId: number, partnerId: string, dto: { type: 'DEPOSIT' | 'WITHDRAWAL'; amount: number; date: string; note?: string; accountId?: string }) {
    const cleanAmount = Number(dto.amount);
    const movementDate = new Date(dto.date);
    if (dto.type !== 'DEPOSIT' && dto.type !== 'WITHDRAWAL') {
      throw new BadRequestException('نوع حركة رأس المال غير صالح.');
    }
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      throw new BadRequestException('مبلغ حركة رأس المال يجب أن يكون أكبر من الصفر.');
    }
    if (!dto.accountId) {
      throw new BadRequestException('تحديد حساب البنك أو الخزينة إلزامي لكل حركة رأس مال فعلية.');
    }
    if (Number.isNaN(movementDate.getTime())) throw new BadRequestException('تاريخ حركة رأس المال غير صالح.');

    return await this.db.transaction().execute(async (trx) => {
      const partner = await trx.selectFrom('import_partners')
        .selectAll()
        .where('id', '=', partnerId)
        .where('tenant_id', '=', tenantId)
        .forUpdate()
        .executeTakeFirstOrThrow();
      if (dto.type === 'WITHDRAWAL' && Number(partner.capital_amount || 0) < cleanAmount) {
        throw new BadRequestException(`رصيد رأس المال الحالي (${partner.capital_amount}) لا يكفي لسحب مبلغ ${cleanAmount}.`);
      }
      const ledger = await trx.insertInto('import_partner_ledger').values({
        tenant_id: tenantId,
        partner_id: partnerId,
        type: dto.type,
        amount: cleanAmount,
        transaction_date: dto.date,
        note: dto.note || '',
        created_by: userId,
      }).returning('id').executeTakeFirstOrThrow();
      const sign = dto.type === 'DEPOSIT' ? '+' : '-';
      await trx.updateTable('import_partners')
        .set((eb) => ({ capital_amount: sql`${eb.ref('capital_amount')} ${sql.raw(sign)} ${cleanAmount}` }))
        .where('id', '=', partnerId)
        .where('tenant_id', '=', tenantId)
        .execute();
      const treasuryTransactionId = await this.postPartnerCapitalMovement(
        trx, tenantId, userId, partner.name, partner.id,
        dto.type, cleanAmount, movementDate, dto.accountId, dto.note || ''
      );
      return { success: true, ledgerId: ledger.id, treasuryTransactionId };
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



  async getImportCommandCenterMetrics(tenantId: string) {
    const partnerCapital = await this.db
      .selectFrom('import_partner_ledger')
      .select([
        sql<number>`coalesce(sum(case when type = 'DEPOSIT' then amount else 0 end), 0)`.as('total_deposits'),
        sql<number>`coalesce(sum(case when type = 'WITHDRAWAL' then amount else 0 end), 0)`.as('total_withdrawals'),
      ])
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    const netPaidInCapital = Math.max(
      0,
      Number(partnerCapital?.total_deposits || 0) - Number(partnerCapital?.total_withdrawals || 0)
    );

    const shipmentExpenses = await this.db
      .selectFrom('import_shipments')
      .innerJoin('expenses', (join) =>
        join.on((eb) =>
          eb.or([
            eb('expenses.id', '=', eb.ref('import_shipments.shipping_expense_id')),
            eb('expenses.id', '=', eb.ref('import_shipments.customs_expense_id')),
            eb('expenses.id', '=', eb.ref('import_shipments.transport_expense_id')),
          ])
        )
      )
      .select([sql<number>`coalesce(sum(expenses.amount), 0)`.as('total_shipment_costs')])
      .where('import_shipments.tenant_id', '=', tenantId)
      .executeTakeFirst();

    const transferOutflows = await this.db
      .selectFrom('treasury_transactions')
      .select([sql<number>`coalesce(sum(abs(amount)), 0)`.as('total_transfers')])
      .where('tenant_id', '=', tenantId)
      .where('txn_type', '=', 'supplier_payment')
      .where('reference_type', '=', 'supplier_payment')
      .executeTakeFirst();

    const sourcingTripCosts = await this.db
      .selectFrom('import_sourcing_trips')
      .select([sql<number>`coalesce(sum(actual_cost_egp), 0)`.as('total_trips')])
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    const deployedCapital =
      Number(shipmentExpenses?.total_shipment_costs || 0) +
      Number(transferOutflows?.total_transfers || 0) +
      Number(sourcingTripCosts?.total_trips || 0);

    const availableCapital = Math.max(0, netPaidInCapital - deployedCapital);

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

    const foreignDebts = await this.db
      .selectFrom('suppliers')
      .leftJoin('import_suppliers_meta', 'import_suppliers_meta.supplier_id', 'suppliers.id')
      .select([
        'suppliers.id',
        'suppliers.name',
        'suppliers.balance',
        'import_suppliers_meta.audit_status',
      ])
      .where('suppliers.tenant_id', '=', tenantId)
      .where('suppliers.balance', '>', 0)
      .execute();

    const supplierLiabilities = foreignDebts.map((s) => ({
      supplierId: s.id,
      supplierName: s.name,
      balance: Number(s.balance || 0),
      currency: 'USD',
      isBankVerified: s.audit_status === 'verified',
    }));

    const totalDebtForeign = foreignDebts.reduce((sum, s) => sum + Number(s.balance || 0), 0);

    const demurrageAlerts: any[] = [];
    for (const s of shipmentRows.filter((r) => r.status !== 'Arrived')) {
      const risk = calculateDemurrageRisk({
        arrivalDate: s.arrival_date,
        demurrageStartDate: s.demurrage_start_date,
        freeDays: Number(s.free_demurrage_days || 14),
        ratePerDayUsd: Number(s.demurrage_rate_per_day || 50),
        exchangeRate: Number(s.exchange_rate_at_arrival || 1),
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

    const aciExpiring = await this.db
      .selectFrom('import_aci_compliance')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('status', 'not in', ['approved', 'expired'])
      .where('acid_expiry_date', 'is not', null)
      .where('acid_expiry_date', '<=', sql`CURRENT_DATE + INTERVAL '14 days'`)
      .execute();

    const monthStart = new Date();
    monthStart.setDate(1);
    const profitReport = await this.generatePeriodProfitReport(tenantId, monthStart, new Date());

    return {
      capital: {
        totalCapital: Number(netPaidInCapital.toFixed(2)),
        deployedCapital: Number(deployedCapital.toFixed(2)),
        availableCapital: Number(availableCapital.toFixed(2)),
      },
      pipeline: {
        projects: projectCounts,
        shipments: {
          inTransit: inTransitCount,
          inCustoms: inCustomsCount,
          arrived: arrivedCount,
          total: shipmentRows.length,
        },
      },
      liabilities: {
        totalDebtForeign,
        supplierLiabilities,
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
        'import_project_partners.id as allocation_id',
        'import_project_partners.partner_id',
        'import_partners.name as partner_name',
        'import_project_partners.capital_share_amount',
        'import_project_partners.profit_percentage',
        'import_project_partners.effective_from',
        'import_project_partners.is_active',
      ])
      .where('import_project_partners.tenant_id', '=', tenantId)
      .where('import_project_partners.project_id', '=', projectId)
      .where('import_project_partners.is_active', '=', true)
      .execute();
  }

  async setProjectPartners(
    tenantId: string,
    projectId: string,
    partners: Array<{ partnerId: string; capitalShare?: number; profitPercentage: number }>
  ) {
    return await this.db.transaction().execute(async (trx) => {
      const project = await trx
        .selectFrom('import_projects')
        .selectAll()
        .where('id', '=', projectId)
        .where('tenant_id', '=', tenantId)
        .forUpdate()
        .executeTakeFirst();

      if (!project) throw new NotFoundException('مشروع الاستيراد غير موجود.');
      if (project.status === 'closed') {
        throw new BadRequestException('لا يمكن تعديل نسب الشركاء لمشروع مقفل ومسوى مالياً.');
      }

      const totalPercentage = partners.reduce((sum, p) => sum + Number(p.profitPercentage || 0), 0);
      if (totalPercentage > 100.001) {
        throw new BadRequestException(`مجموع نسب الشركاء للمشروع (${totalPercentage}%) يتجاوز 100%.`);
      }

      const partnerIds = partners.map((p) => p.partnerId);
      if (partnerIds.length > 0) {
        const validPartners = await trx
          .selectFrom('import_partners')
          .select('id')
          .where('tenant_id', '=', tenantId)
          .where('id', 'in', partnerIds)
          .execute();

        if (validPartners.length !== partnerIds.length) {
          throw new BadRequestException('أحد الشركاء المحددين غير مسجل أو ينتمي لمنشأة أخرى.');
        }
      }

      // Delete partners no longer in the project to maintain clean foreign keys
      if (partnerIds.length > 0) {
        await trx
          .deleteFrom('import_project_partners')
          .where('project_id', '=', projectId)
          .where('tenant_id', '=', tenantId)
          .where('partner_id', 'not in', partnerIds)
          .execute();
      } else {
        await trx
          .deleteFrom('import_project_partners')
          .where('project_id', '=', projectId)
          .where('tenant_id', '=', tenantId)
          .execute();
      }

      // Upsert each partner cleanly to prevent duplicate key collision on (tenant_id, project_id, partner_id)
      for (const p of partners) {
        await trx
          .insertInto('import_project_partners')
          .values({
            tenant_id: tenantId,
            project_id: projectId,
            partner_id: p.partnerId,
            capital_share_amount: Number(p.capitalShare || 0),
            profit_percentage: Number(p.profitPercentage || 0),
            is_active: true,
            effective_from: new Date().toISOString().slice(0, 10),
          })
          .onConflict((oc) =>
            oc.columns(['tenant_id', 'project_id', 'partner_id']).doUpdateSet({
              capital_share_amount: Number(p.capitalShare || 0),
              profit_percentage: Number(p.profitPercentage || 0),
              is_active: true,
              effective_from: new Date().toISOString().slice(0, 10),
            })
          )
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
        .forUpdate()
        .executeTakeFirstOrThrow();

      if (project.status === 'closed') {
        throw new BadRequestException('المشروع مقفل بالفعل.');
      }

      const shipments = await trx
        .selectFrom('import_shipments')
        .selectAll()
        .where('project_id', '=', projectId)
        .where('tenant_id', '=', tenantId)
        .execute();

      for (const s of shipments) {
        if (s.status !== 'Arrived') {
          throw new BadRequestException(`لا يمكن إقفال المشروع: الحاوية ${s.container_number} ما زالت بالحالة (${s.status}) ولم تصل بعد.`);
        }
        const receipt = await trx
          .selectFrom('import_inventory_receipts')
          .select('state')
          .where('shipment_id', '=', s.id)
          .where('tenant_id', '=', tenantId)
          .executeTakeFirst();
        if (!receipt || receipt.state !== 'posted') {
          throw new BadRequestException(`لا يمكن إقفال المشروع: الحاوية ${s.container_number} لم يتم ترحيل استلامها المخزني بالكامل.`);
        }
      }

      const proformas = await trx
        .selectFrom('import_proforma_invoices')
        .selectAll()
        .where('project_id', '=', projectId)
        .where('tenant_id', '=', tenantId)
        .execute();

      for (const pi of proformas) {
        const isPaid = pi.payment_status === 'paid' && Number(pi.paid_amount_foreign || 0) >= Number(pi.total_amount_foreign || 0);
        if (!isPaid) {
          throw new BadRequestException(
            `لا يمكن إقفال المشروع: الفاتورة المبدئية رقم ${pi.pi_number} للمورد غير مسددة بالكامل (الحالة: ${pi.payment_status}، المسدد: ${pi.paid_amount_foreign || 0} من ${pi.total_amount_foreign || 0}).`
          );
        }
      }

      // Ensure no unsettled purchase invoices linked to this project architecturally
      const projectPurchases = await trx
        .selectFrom('purchases')
        .select(['id', 'doc_no', 'total', 'paid_amount', 'status'])
        .where('tenant_id', '=', tenantId)
        .where('import_project_id', '=', projectId)
        .where('status', '!=', 'cancelled')
        .execute();

      for (const pur of projectPurchases) {
        const paid = Number(pur.paid_amount || 0);
        const total = Number(pur.total || 0);
        if (paid < total - 0.001) {
          throw new BadRequestException(
            `لا يمكن إقفال المشروع: فاتورة الشراء رقم ${pur.doc_no || pur.id} غير مسددة بالكامل للمورد (المتبقي: ${(total - paid).toFixed(2)} ج.م).`
          );
        }
      }

      const startDate = project.created_at || new Date('2020-01-01');
      const profitReport = await this.generatePeriodProfitReport(tenantId, startDate, new Date(), projectId, trx);
      if (!profitReport.data.profitAttributionVerified &&
          (profitReport.data.grossSalesRevenue > 0 || profitReport.data.salesReturnsRevenue > 0)) {
        throw new UnprocessableEntityException(
          'لا يمكن اعتماد إقفال مالي نهائي لمشروع لديه مبيعات قبل إثبات مصدر الكميات المباعة وتسوية ربحية الشحنة.'
        );
      }

      const projectItems = shipments.length > 0
        ? await trx
            .selectFrom('import_shipment_items')
            .select(['product_id', 'quantity', 'received_quantity'])
            .where('tenant_id', '=', tenantId)
            .where('shipment_id', 'in', shipments.map((s) => s.id))
            .execute()
        : [];

      let totalReceived = 0;
      for (const it of projectItems) {
        totalReceived += Number(it.received_quantity ?? it.quantity);
      }

      const closureData = {
        closedAt: new Date().toISOString(),
        closedBy: userId,
        shipmentsCount: shipments.length,
        totalReceivedUnits: totalReceived,
        financialReconciliation: profitReport.data,
        reconciliationStatus: profitReport.data.profitAttributionVerified ? 'verified' : 'pending_source_attribution',
      };

      await trx
        .updateTable('import_projects')
        .set({
          status: 'closed',
          closure_data: closureData as any,
          closure_date: new Date(),
          closed_by: userId,
          updated_at: sql`NOW()`,
        })
        .where('id', '=', projectId)
        .where('tenant_id', '=', tenantId)
        .execute();

      return {
        success: true,
        message: `تمت تسوية وإقفال مشروع الاستيراد #${project.project_no} بنجاح وحفظ السجل المالي النهائي.`,
        closureData,
      };
    });
  }
}
