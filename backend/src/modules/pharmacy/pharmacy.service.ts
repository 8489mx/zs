import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { Kysely } from '../../database/kysely';
import { AuditService } from '../../core/audit/audit.service';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';
import { AppError } from '../../common/errors/app-error';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { normalizeArabicSearch } from '../../common/utils/arabic-search.util';
import { UpsertDrugDto } from './dto/upsert-drug.dto';
import { UpsertBatchDto } from './dto/upsert-batch.dto';
import { UpsertPrescriptionDto } from './dto/upsert-prescription.dto';
import { UpsertShortageDto } from './dto/upsert-shortage.dto';
import { UpsertClinicalServiceDto } from './dto/upsert-clinical-service.dto';

@Injectable()
export class PharmacyService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly audit: AuditService,
  ) {}

  // -------------------------------------------------------------
  // 1. DRUGS & GENERIC SUBSTITUTES
  // -------------------------------------------------------------
  async listDrugs(
    auth: AuthContext,
    filters?: {
      q?: string;
      activeIngredient?: string;
      dosageForm?: string;
      controlledLevel?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const scope = requireTenantScope(auth);
    let query = this.db
      .selectFrom('pharmacy_drugs')
      .where('tenant_id', '=', scope.tenantId);

    if (filters?.dosageForm && filters.dosageForm !== 'all') {
      query = query.where('dosage_form', '=', filters.dosageForm);
    }

    if (filters?.controlledLevel && filters.controlledLevel !== 'all') {
      query = query.where('controlled_level', '=', filters.controlledLevel);
    }

    if (filters?.activeIngredient) {
      const term = `%${normalizeArabicSearch(filters.activeIngredient)}%`;
      query = query.where(sql<boolean>`(
        lower(active_ingredient) like ${term}
        OR TRANSLATE(LOWER(COALESCE(active_ingredient_ar, '')), 'أإآٱٲٳؤئىة', 'ااااااويهه') LIKE ${term}
      )`);
    }

    if (filters?.q && filters.q.trim()) {
      const term = `%${normalizeArabicSearch(filters.q)}%`;
      query = query.where(sql<boolean>`(
        lower(trade_name) like ${term}
        OR TRANSLATE(LOWER(COALESCE(trade_name_ar, '')), 'أإآٱٲٳؤئىة', 'ااااااويهه') LIKE ${term}
        OR lower(active_ingredient) like ${term}
        OR TRANSLATE(LOWER(COALESCE(active_ingredient_ar, '')), 'أإآٱٲٳؤئىة', 'ااااااويهه') LIKE ${term}
        OR lower(coalesce(barcode, '')) like ${term}
        OR lower(coalesce(manufacturer, '')) like ${term}
      )`);
    }

    const totalRes = await query.select((eb) => eb.fn.count('id').as('count')).executeTakeFirst();
    const total = Number(totalRes?.count || 0);

    const page = Math.max(1, Number(filters?.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(filters?.pageSize || 25)));
    const offset = (page - 1) * pageSize;

    const drugs = await query
      .selectAll()
      .orderBy('id', 'desc')
      .limit(pageSize)
      .offset(offset)
      .execute();

    return {
      drugs,
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findSubstitutes(auth: AuthContext, activeIngredient: string, strength?: string) {
    const scope = requireTenantScope(auth);
    if (!activeIngredient || !activeIngredient.trim()) return [];

    const term = `%${normalizeArabicSearch(activeIngredient.trim())}%`;
    let query = this.db
      .selectFrom('pharmacy_drugs')
      .where('tenant_id', '=', scope.tenantId)
      .where(sql<boolean>`(
        lower(active_ingredient) like ${term}
        OR TRANSLATE(LOWER(COALESCE(active_ingredient_ar, '')), 'أإآٱٲٳؤئىة', 'ااااااويهه') LIKE ${term}
      )`);

    if (strength && strength.trim()) {
      query = query.where('strength', '=', strength.trim());
    }

    return await query.selectAll().orderBy('trade_name', 'asc').limit(20).execute();
  }

  async upsertDrug(auth: AuthContext, dto: UpsertDrugDto) {
    const scope = requireTenantScope(auth);

    if (dto.id) {
      const existing = await this.db
        .selectFrom('pharmacy_drugs')
        .where('id', '=', dto.id)
        .where('tenant_id', '=', scope.tenantId)
        .selectAll()
        .executeTakeFirst();

      if (!existing) {
        throw new AppError('DRUG_NOT_FOUND', 'الدواء غير موجود', 404);
      }

      const updated = await this.db
        .updateTable('pharmacy_drugs')
        .set({
          product_id: dto.productId ?? existing.product_id,
          trade_name: dto.tradeName,
          trade_name_ar: dto.tradeNameAr ?? null,
          active_ingredient: dto.activeIngredient,
          active_ingredient_ar: dto.activeIngredientAr ?? null,
          dosage_form: dto.dosageForm,
          strength: dto.strength ?? null,
          manufacturer: dto.manufacturer ?? null,
          drug_class: dto.drugClass ?? null,
          prescription_required: dto.prescriptionRequired ?? false,
          controlled_level: dto.controlledLevel || 'none',
          units_per_box: dto.unitsPerBox || 1,
          unit_name: dto.unitName || 'شريط',
          strip_price: dto.stripPrice || 0,
          box_price: dto.boxPrice || 0,
          pregnancy_safety: dto.pregnancySafety ?? null,
          storage_condition: dto.storageCondition ?? null,
          barcode: dto.barcode ?? null,
          indications: dto.indications ?? null,
          side_effects: dto.sideEffects ?? null,
          updated_at: sql`now()`,
        })
        .where('id', '=', dto.id)
        .where('tenant_id', '=', scope.tenantId)
        .returningAll()
        .executeTakeFirstOrThrow();

      return updated;
    }

    const created = await this.db
      .insertInto('pharmacy_drugs')
      .values({
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
        product_id: dto.productId ?? null,
        trade_name: dto.tradeName,
        trade_name_ar: dto.tradeNameAr ?? null,
        active_ingredient: dto.activeIngredient,
        active_ingredient_ar: dto.activeIngredientAr ?? null,
        dosage_form: dto.dosageForm,
        strength: dto.strength ?? null,
        manufacturer: dto.manufacturer ?? null,
        drug_class: dto.drugClass ?? null,
        prescription_required: dto.prescriptionRequired ?? false,
        controlled_level: dto.controlledLevel || 'none',
        units_per_box: dto.unitsPerBox || 1,
        unit_name: dto.unitName || 'شريط',
        strip_price: dto.stripPrice || 0,
        box_price: dto.boxPrice || 0,
        pregnancy_safety: dto.pregnancySafety ?? null,
        storage_condition: dto.storageCondition ?? null,
        barcode: dto.barcode ?? null,
        indications: dto.indications ?? null,
        side_effects: dto.sideEffects ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return created;
  }

  async deleteDrug(auth: AuthContext, id: number) {
    const scope = requireTenantScope(auth);
    await this.db
      .deleteFrom('pharmacy_drugs')
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .execute();
    return { success: true };
  }

  // -------------------------------------------------------------
  // 2. BATCHES & EXPIRY DATES
  // -------------------------------------------------------------
  async listBatches(
    auth: AuthContext,
    filters?: {
      status?: string;
      q?: string;
      nearExpiryDays?: number;
      page?: number;
      pageSize?: number;
    },
  ) {
    const scope = requireTenantScope(auth);
    let query = this.db
      .selectFrom('pharmacy_batches')
      .where('tenant_id', '=', scope.tenantId);

    if (filters?.status && filters.status !== 'all') {
      query = query.where('status', '=', filters.status);
    }

    if (filters?.q && filters.q.trim()) {
      const term = `%${filters.q.trim().toLowerCase()}%`;
      query = query.where(sql<boolean>`(
        lower(batch_number) like ${term}
        OR lower(coalesce(supplier_name, '')) like ${term}
      )`);
    }

    const totalRes = await query.select((eb) => eb.fn.count('id').as('count')).executeTakeFirst();
    const total = Number(totalRes?.count || 0);

    const page = Math.max(1, Number(filters?.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(filters?.pageSize || 25)));
    const offset = (page - 1) * pageSize;

    const batches = await query
      .selectAll()
      .orderBy('expiry_date', 'asc')
      .limit(pageSize)
      .offset(offset)
      .execute();

    return {
      batches,
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async upsertBatch(auth: AuthContext, dto: UpsertBatchDto) {
    const scope = requireTenantScope(auth);

    if (dto.id) {
      const updated = await this.db
        .updateTable('pharmacy_batches')
        .set({
          batch_number: dto.batchNumber,
          expiry_date: dto.expiryDate,
          quantity: dto.quantity || 0,
          unit_cost: dto.unitCost || 0,
          supplier_name: dto.supplierName ?? null,
          status: dto.status || 'active',
          notes: dto.notes ?? null,
          updated_at: sql`now()`,
        })
        .where('id', '=', dto.id)
        .where('tenant_id', '=', scope.tenantId)
        .returningAll()
        .executeTakeFirstOrThrow();
      return updated;
    }

    const created = await this.db
      .insertInto('pharmacy_batches')
      .values({
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
        product_id: dto.productId ?? null,
        drug_id: dto.drugId ?? null,
        batch_number: dto.batchNumber,
        expiry_date: dto.expiryDate,
        quantity: dto.quantity || 0,
        unit_cost: dto.unitCost || 0,
        location_id: dto.locationId ?? null,
        supplier_name: dto.supplierName ?? null,
        status: dto.status || 'active',
        notes: dto.notes ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return created;
  }

  // -------------------------------------------------------------
  // 3. PRESCRIPTIONS & INSURANCE
  // -------------------------------------------------------------
  async listPrescriptions(
    auth: AuthContext,
    filters?: {
      status?: string;
      insuranceProvider?: string;
      q?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const scope = requireTenantScope(auth);
    let query = this.db
      .selectFrom('pharmacy_prescriptions')
      .where('tenant_id', '=', scope.tenantId);

    if (filters?.status && filters.status !== 'all') {
      query = query.where('status', '=', filters.status);
    }

    if (filters?.insuranceProvider && filters.insuranceProvider !== 'all') {
      query = query.where('insurance_provider', '=', filters.insuranceProvider);
    }

    if (filters?.q && filters.q.trim()) {
      const term = `%${normalizeArabicSearch(filters.q)}%`;
      query = query.where(sql<boolean>`(
        lower(prescription_no) like ${term}
        OR TRANSLATE(LOWER(COALESCE(customer_name, '')), 'أإآٱٲٳؤئىة', 'ااااااويهه') LIKE ${term}
        OR lower(coalesce(customer_phone, '')) like ${term}
        OR TRANSLATE(LOWER(COALESCE(doctor_name, '')), 'أإآٱٲٳؤئىة', 'ااااااويهه') LIKE ${term}
        OR lower(coalesce(insurance_card_no, '')) like ${term}
      )`);
    }

    const totalRes = await query.select((eb) => eb.fn.count('id').as('count')).executeTakeFirst();
    const total = Number(totalRes?.count || 0);

    const page = Math.max(1, Number(filters?.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(filters?.pageSize || 25)));
    const offset = (page - 1) * pageSize;

    const prescriptions = await query
      .selectAll()
      .orderBy('id', 'desc')
      .limit(pageSize)
      .offset(offset)
      .execute();

    return {
      prescriptions,
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async upsertPrescription(auth: AuthContext, dto: UpsertPrescriptionDto) {
    const scope = requireTenantScope(auth);

    const total = Number(dto.totalAmount || 0);
    const copayPct = Number(dto.patientCopayPercent || 0);
    const patientAmt = dto.patientAmount !== undefined ? dto.patientAmount : (total * (copayPct / 100));
    const insuranceAmt = dto.insuranceAmount !== undefined ? dto.insuranceAmount : (total - patientAmt);

    if (dto.id) {
      const updated = await this.db
        .updateTable('pharmacy_prescriptions')
        .set({
          customer_name: dto.customerName,
          customer_phone: dto.customerPhone ?? null,
          doctor_name: dto.doctorName ?? null,
          doctor_specialty: dto.doctorSpecialty ?? null,
          diagnosis: dto.diagnosis ?? null,
          insurance_provider: dto.insuranceProvider ?? null,
          insurance_card_no: dto.insuranceCardNo ?? null,
          approval_code: dto.approvalCode ?? null,
          patient_copay_percent: copayPct,
          total_amount: total,
          patient_amount: patientAmt,
          insurance_amount: insuranceAmt,
          status: dto.status || 'dispensed',
          items_json: JSON.stringify(dto.items || []),
          dispensed_by: dto.dispensedBy ?? null,
          notes: dto.notes ?? null,
          updated_at: sql`now()`,
        })
        .where('id', '=', dto.id)
        .where('tenant_id', '=', scope.tenantId)
        .returningAll()
        .executeTakeFirstOrThrow();
      return updated;
    }

    const countRes = await this.db
      .selectFrom('pharmacy_prescriptions')
      .where('tenant_id', '=', scope.tenantId)
      .select((eb) => eb.fn.count('id').as('count'))
      .executeTakeFirst();
    const count = Number(countRes?.count || 0) + 1;
    const rxNo = dto.prescriptionNo || `RX-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

    const created = await this.db
      .insertInto('pharmacy_prescriptions')
      .values({
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
        prescription_no: rxNo,
        customer_id: dto.customerId ?? null,
        customer_name: dto.customerName,
        customer_phone: dto.customerPhone ?? null,
        doctor_name: dto.doctorName ?? null,
        doctor_specialty: dto.doctorSpecialty ?? null,
        diagnosis: dto.diagnosis ?? null,
        insurance_provider: dto.insuranceProvider ?? null,
        insurance_card_no: dto.insuranceCardNo ?? null,
        approval_code: dto.approvalCode ?? null,
        patient_copay_percent: copayPct,
        total_amount: total,
        patient_amount: patientAmt,
        insurance_amount: insuranceAmt,
        status: dto.status || 'dispensed',
        items_json: JSON.stringify(dto.items || []),
        dispensed_by: dto.dispensedBy ?? null,
        notes: dto.notes ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return created;
  }

  // -------------------------------------------------------------
  // 4. SHORTAGES (كشكول النواقص)
  // -------------------------------------------------------------
  async listShortages(
    auth: AuthContext,
    filters?: {
      status?: string;
      priority?: string;
      q?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const scope = requireTenantScope(auth);
    let query = this.db
      .selectFrom('pharmacy_shortages')
      .where('tenant_id', '=', scope.tenantId);

    if (filters?.status && filters.status !== 'all') {
      query = query.where('status', '=', filters.status);
    }

    if (filters?.priority && filters.priority !== 'all') {
      query = query.where('priority', '=', filters.priority);
    }

    if (filters?.q && filters.q.trim()) {
      const term = `%${normalizeArabicSearch(filters.q)}%`;
      query = query.where(sql<boolean>`(
        lower(product_name) like ${term}
        OR lower(coalesce(active_ingredient, '')) like ${term}
        OR lower(coalesce(suggested_distributor, '')) like ${term}
        OR TRANSLATE(LOWER(COALESCE(customer_name, '')), 'أإآٱٲٳؤئىة', 'ااااااويهه') LIKE ${term}
      )`);
    }

    const totalRes = await query.select((eb) => eb.fn.count('id').as('count')).executeTakeFirst();
    const total = Number(totalRes?.count || 0);

    const page = Math.max(1, Number(filters?.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(filters?.pageSize || 25)));
    const offset = (page - 1) * pageSize;

    const shortages = await query
      .selectAll()
      .orderBy('id', 'desc')
      .limit(pageSize)
      .offset(offset)
      .execute();

    return {
      shortages,
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async upsertShortage(auth: AuthContext, dto: UpsertShortageDto) {
    const scope = requireTenantScope(auth);

    if (dto.id) {
      const updated = await this.db
        .updateTable('pharmacy_shortages')
        .set({
          product_name: dto.productName,
          active_ingredient: dto.activeIngredient ?? null,
          dosage_form: dto.dosageForm ?? null,
          suggested_distributor: dto.suggestedDistributor ?? null,
          requested_quantity: dto.requestedQuantity || 1,
          priority: dto.priority || 'normal',
          customer_name: dto.customerName ?? null,
          customer_phone: dto.customerPhone ?? null,
          status: dto.status || 'needed',
          notes: dto.notes ?? null,
          updated_at: sql`now()`,
        })
        .where('id', '=', dto.id)
        .where('tenant_id', '=', scope.tenantId)
        .returningAll()
        .executeTakeFirstOrThrow();
      return updated;
    }

    const created = await this.db
      .insertInto('pharmacy_shortages')
      .values({
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
        product_name: dto.productName,
        active_ingredient: dto.activeIngredient ?? null,
        dosage_form: dto.dosageForm ?? null,
        suggested_distributor: dto.suggestedDistributor ?? null,
        requested_quantity: dto.requestedQuantity || 1,
        priority: dto.priority || 'normal',
        customer_name: dto.customerName ?? null,
        customer_phone: dto.customerPhone ?? null,
        status: dto.status || 'needed',
        notes: dto.notes ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return created;
  }

  async updateShortageStatus(auth: AuthContext, id: number, status: string) {
    const scope = requireTenantScope(auth);
    return await this.db
      .updateTable('pharmacy_shortages')
      .set({ status, updated_at: sql`now()` })
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  // -------------------------------------------------------------
  // 5. CLINICAL SERVICES (الخدمات والفحوصات الصيدلانية)
  // -------------------------------------------------------------
  async listClinicalServices(auth: AuthContext, limit = 50) {
    const scope = requireTenantScope(auth);
    return await this.db
      .selectFrom('pharmacy_clinical_services')
      .where('tenant_id', '=', scope.tenantId)
      .selectAll()
      .orderBy('id', 'desc')
      .limit(limit)
      .execute();
  }

  async createClinicalService(auth: AuthContext, dto: UpsertClinicalServiceDto) {
    const scope = requireTenantScope(auth);
    return await this.db
      .insertInto('pharmacy_clinical_services')
      .values({
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
        service_type: dto.serviceType,
        customer_name: dto.customerName,
        customer_phone: dto.customerPhone ?? null,
        metric_value_1: dto.metricValue1 ?? null,
        metric_value_2: dto.metricValue2 ?? null,
        pharmacist_notes: dto.pharmacistNotes ?? null,
        fee: dto.fee || 0,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  // -------------------------------------------------------------
  // 6. PHARMACY DASHBOARD STATS
  // -------------------------------------------------------------
  async getDashboardStats(auth: AuthContext) {
    const scope = requireTenantScope(auth);

    const [drugsCountRes, shortagesCountRes, activeRxCountRes, batchesRes] = await Promise.all([
      this.db
        .selectFrom('pharmacy_drugs')
        .where('tenant_id', '=', scope.tenantId)
        .select((eb) => eb.fn.count('id').as('count'))
        .executeTakeFirst(),
      this.db
        .selectFrom('pharmacy_shortages')
        .where('tenant_id', '=', scope.tenantId)
        .where('status', '=', 'needed')
        .select((eb) => eb.fn.count('id').as('count'))
        .executeTakeFirst(),
      this.db
        .selectFrom('pharmacy_prescriptions')
        .where('tenant_id', '=', scope.tenantId)
        .where('status', '=', 'dispensed')
        .select((eb) => eb.fn.count('id').as('count'))
        .executeTakeFirst(),
      this.db
        .selectFrom('pharmacy_batches')
        .where('tenant_id', '=', scope.tenantId)
        .select((eb) => [
          eb.fn.count('id').as('total'),
        ])
        .executeTakeFirst(),
    ]);

    return {
      totalDrugs: Number(drugsCountRes?.count || 0),
      neededShortages: Number(shortagesCountRes?.count || 0),
      dispensedPrescriptions: Number(activeRxCountRes?.count || 0),
      totalBatches: Number(batchesRes?.total || 0),
    };
  }
}
