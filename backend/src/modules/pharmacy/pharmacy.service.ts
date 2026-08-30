import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { Kysely } from '../../database/kysely';
import { AuditService } from '../../core/audit/audit.service';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { normalizeArabicSearch } from '../../common/utils/arabic-search.util';
import { UpsertDrugDto } from './dto/upsert-drug.dto';
import { UpsertBatchDto } from './dto/upsert-batch.dto';
import { UpsertPrescriptionDto } from './dto/upsert-prescription.dto';
import { UpsertShortageDto } from './dto/upsert-shortage.dto';
import { UpsertClinicalServiceDto } from './dto/upsert-clinical-service.dto';
import { EGYPTIAN_MASTER_DRUGS } from './data/egyptian-master-drugs.data';

@Injectable()
export class PharmacyService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly audit: AuditService,
  ) {}

  // -------------------------------------------------------------
  // 1. EGYPTIAN MASTER DRUG REGISTRY & CATALOG (المرجع الدوائي المصري الشامل)
  // -------------------------------------------------------------
  getMasterCatalog(filters?: { q?: string; drugClass?: string; page?: number; pageSize?: number }) {
    let items = [...EGYPTIAN_MASTER_DRUGS];

    if (filters?.drugClass && filters.drugClass !== 'all') {
      items = items.filter((d) => d.drug_class === filters.drugClass);
    }

    if (filters?.q && filters.q.trim()) {
      const q = normalizeArabicSearch(filters.q.trim().toLowerCase());
      items = items.filter((d) => {
        const tEn = d.trade_name.toLowerCase();
        const tAr = normalizeArabicSearch((d.trade_name_ar || '').toLowerCase());
        const aEn = d.active_ingredient.toLowerCase();
        const aAr = normalizeArabicSearch((d.active_ingredient_ar || '').toLowerCase());
        const bar = (d.barcode || '').toLowerCase();
        const man = (d.manufacturer || '').toLowerCase();
        return (
          tEn.includes(q) ||
          tAr.includes(q) ||
          aEn.includes(q) ||
          aAr.includes(q) ||
          bar.includes(q) ||
          man.includes(q)
        );
      });
    }

    const page = Math.max(1, Number(filters?.page || 1));
    const pageSize = Math.min(500, Math.max(1, Number(filters?.pageSize || 25)));
    const totalItems = items.length;
    const offset = (page - 1) * pageSize;
    const paginatedItems = items.slice(offset, offset + pageSize);

    return {
      drugs: paginatedItems,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  async seedAllMasterDrugs(auth: AuthContext) {
    const scope = requireTenantScope(auth);
    let insertedCount = 0;
    let updatedCount = 0;

    for (const drug of EGYPTIAN_MASTER_DRUGS) {
      const existing = await this.db
        .selectFrom('pharmacy_drugs')
        .where('tenant_id', '=', scope.tenantId)
        .where((eb) =>
          eb.or([
            eb('trade_name', '=', drug.trade_name),
            eb('barcode', '=', drug.barcode),
          ])
        )
        .select(['id'])
        .executeTakeFirst();

      if (existing) {
        await this.db
          .updateTable('pharmacy_drugs')
          .set({
            trade_name_ar: drug.trade_name_ar,
            active_ingredient: drug.active_ingredient,
            active_ingredient_ar: drug.active_ingredient_ar,
            dosage_form: drug.dosage_form,
            strength: drug.strength,
            manufacturer: drug.manufacturer,
            drug_class: drug.drug_class,
            prescription_required: drug.prescription_required,
            controlled_level: drug.controlled_level,
            units_per_box: drug.units_per_box,
            unit_name: drug.unit_name,
            box_price: drug.box_price,
            strip_price: drug.strip_price,
            barcode: drug.barcode,
            indications: drug.indications,
            updated_at: sql`now()`,
          })
          .where('id', '=', existing.id)
          .where('tenant_id', '=', scope.tenantId)
          .execute();
        updatedCount++;
      } else {
        await this.db
          .insertInto('pharmacy_drugs')
          .values({
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
            trade_name: drug.trade_name,
            trade_name_ar: drug.trade_name_ar,
            active_ingredient: drug.active_ingredient,
            active_ingredient_ar: drug.active_ingredient_ar,
            dosage_form: drug.dosage_form,
            strength: drug.strength,
            manufacturer: drug.manufacturer,
            drug_class: drug.drug_class,
            prescription_required: drug.prescription_required,
            controlled_level: drug.controlled_level,
            units_per_box: drug.units_per_box,
            unit_name: drug.unit_name,
            box_price: drug.box_price,
            strip_price: drug.strip_price,
            barcode: drug.barcode,
            indications: drug.indications,
          })
          .execute();
        insertedCount++;
      }
    }

    return {
      success: true,
      totalMasterDrugs: EGYPTIAN_MASTER_DRUGS.length,
      insertedCount,
      updatedCount,
      message: `تمت تغذية الصيدلية بـ ${insertedCount} صنف جديد وتحديث ${updatedCount} صنف بنجاح`,
    };
  }

  async importSelectedMasterDrugs(auth: AuthContext, masterIds: string[]) {
    const scope = requireTenantScope(auth);
    const selected = EGYPTIAN_MASTER_DRUGS.filter((d) => masterIds.includes(d.id));
    let imported = 0;

    for (const drug of selected) {
      const existing = await this.db
        .selectFrom('pharmacy_drugs')
        .where('tenant_id', '=', scope.tenantId)
        .where('trade_name', '=', drug.trade_name)
        .select(['id'])
        .executeTakeFirst();

      if (!existing) {
        await this.db
          .insertInto('pharmacy_drugs')
          .values({
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
            trade_name: drug.trade_name,
            trade_name_ar: drug.trade_name_ar,
            active_ingredient: drug.active_ingredient,
            active_ingredient_ar: drug.active_ingredient_ar,
            dosage_form: drug.dosage_form,
            strength: drug.strength,
            manufacturer: drug.manufacturer,
            drug_class: drug.drug_class,
            prescription_required: drug.prescription_required,
            controlled_level: drug.controlled_level,
            units_per_box: drug.units_per_box,
            unit_name: drug.unit_name,
            box_price: drug.box_price,
            strip_price: drug.strip_price,
            barcode: drug.barcode,
            indications: drug.indications,
          })
          .execute();
        imported++;
      }
    }

    return { success: true, importedCount: imported };
  }

  async lookupBarcode(auth: AuthContext, barcode: string) {
    const scope = requireTenantScope(auth);
    const cleanBar = barcode.trim();
    if (!cleanBar) return null;

    // 1. Check local pharmacy inventory
    const local = await this.db
      .selectFrom('pharmacy_drugs')
      .where('tenant_id', '=', scope.tenantId)
      .where('barcode', '=', cleanBar)
      .selectAll()
      .executeTakeFirst();

    if (local) {
      return { foundIn: 'local', drug: local };
    }

    // 2. Check Egyptian Master Drugs Index
    const master = EGYPTIAN_MASTER_DRUGS.find((d) => d.barcode === cleanBar);
    if (master) {
      return { foundIn: 'master', drug: master };
    }

    return null;
  }

  // -------------------------------------------------------------
  // 2. DISTRIBUTOR INVOICE IMPORTER (مستورد فواتير المتحدة، ابن سينا، فارما أوفرسيز)
  // -------------------------------------------------------------
  async importDistributorInvoice(
    auth: AuthContext,
    dto: {
      distributor: string;
      invoiceNumber?: string;
      invoiceDate?: string;
      lines: Array<{
        productName: string;
        barcode?: string;
        quantity: number;
        bonusQuantity?: number;
        publicPrice: number;
        costPrice: number;
        expiryDate: string;
        batchNumber?: string;
      }>;
    },
  ) {
    const scope = requireTenantScope(auth);
    let importedItemsCount = 0;
    let totalQuantity = 0;
    let totalCostSum = 0;
    let totalPublicSum = 0;

    for (const line of dto.lines) {
      if (!line.productName || !line.quantity) continue;

      const qty = Number(line.quantity || 0) + Number(line.bonusQuantity || 0);
      const cost = Number(line.costPrice || 0);
      const pubPrice = Number(line.publicPrice || 0);

      totalQuantity += qty;
      totalCostSum += Number(line.quantity || 0) * cost;
      totalPublicSum += qty * pubPrice;

      // 1. Ensure drug exists in pharmacy_drugs
      let query = this.db
        .selectFrom('pharmacy_drugs')
        .where('tenant_id', '=', scope.tenantId);

      if (line.barcode) {
        query = query.where((eb) =>
          eb.or([
            eb('trade_name', '=', line.productName),
            eb('barcode', '=', line.barcode!),
          ])
        );
      } else {
        query = query.where('trade_name', '=', line.productName);
      }

      const drug = await query.select(['id', 'units_per_box']).executeTakeFirst();
      let drugId: number;

      if (!drug) {
        // Look up in Master Catalog for rich info
        const masterMatch = EGYPTIAN_MASTER_DRUGS.find(
          (m) =>
            m.trade_name.toLowerCase() === line.productName.toLowerCase() ||
            (line.barcode && m.barcode === line.barcode)
        );

        const newDrug = await this.db
          .insertInto('pharmacy_drugs')
          .values({
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
            trade_name: line.productName,
            trade_name_ar: masterMatch?.trade_name_ar || null,
            active_ingredient: masterMatch?.active_ingredient || 'دواء مسجل',
            active_ingredient_ar: masterMatch?.active_ingredient_ar || null,
            dosage_form: masterMatch?.dosage_form || 'أقراص (Tablets)',
            strength: masterMatch?.strength || null,
            manufacturer: masterMatch?.manufacturer || dto.distributor,
            drug_class: masterMatch?.drug_class || 'أدوية عامة',
            prescription_required: masterMatch?.prescription_required ?? false,
            units_per_box: masterMatch?.units_per_box || 2,
            unit_name: masterMatch?.unit_name || 'شريط',
            box_price: pubPrice || masterMatch?.box_price || 0,
            strip_price: pubPrice ? Number((pubPrice / (masterMatch?.units_per_box || 2)).toFixed(2)) : (masterMatch?.strip_price || 0),
            barcode: line.barcode || masterMatch?.barcode || null,
            controlled_level: masterMatch?.controlled_level || 'none',
          })
          .returningAll()
          .executeTakeFirstOrThrow();

        drugId = newDrug.id;
      } else {
        drugId = drug.id;
      }

      // 2. Insert Batch entry
      const batchNo = line.batchNumber || `B-${Date.now().toString().slice(-6)}`;
      await this.db
        .insertInto('pharmacy_batches')
        .values({
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
          drug_id: drugId,
          batch_number: batchNo,
          expiry_date: line.expiryDate || '2027-12',
          quantity: qty,
          unit_cost: cost,
          supplier_name: dto.distributor,
          status: 'active',
          notes: `وارد فاتورة ${dto.distributor} رقم ${dto.invoiceNumber || 'مباشرة'}`,
        })
        .execute();

      importedItemsCount++;
    }

    // Record a single bulk cash outflow for the total invoice cost
    if (totalCostSum > 0) {
      try {
        await this.db
          .insertInto('treasury_transactions')
          .values({
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
            txn_type: 'expense',
            amount: -totalCostSum,
            note: `فاتورة موزع: ${dto.distributor}${dto.invoiceNumber ? ` رقم ${dto.invoiceNumber}` : ''} — ${importedItemsCount} صنف — إجمالي التكلفة: ${totalCostSum.toFixed(2)} ج`,
            reference_type: 'pharmacy_batch',
            reference_id: null,
            created_by: auth.userId ? Number(auth.userId) : null,
          } as any)
          .execute();
      } catch (err) {
        console.warn('Failed to record distributor invoice to treasury:', err);
      }
    }

    return {
      success: true,
      distributor: dto.distributor,
      invoiceNumber: dto.invoiceNumber,
      importedLinesCount: importedItemsCount,
      totalQuantity,
      totalCostSum,
      totalPublicSum,
      message: `تم استيراد فاتورة ${dto.distributor} وتحديث الأرصدة والتشغيلات لعدد ${importedItemsCount} صنف`,
    };
  }

  // -------------------------------------------------------------
  // 3. ACTIVE STORE DRUGS & GENERIC SUBSTITUTES
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
      const strTerm = `%${strength.trim().toLowerCase()}%`;
      query = query.where(sql<boolean>`lower(coalesce(strength, '')) like ${strTerm}`);
    }

    return await query.selectAll().orderBy('box_price', 'asc').limit(30).execute();
  }

  async upsertDrug(auth: AuthContext, dto: UpsertDrugDto) {
    const scope = requireTenantScope(auth);

    if (dto.id) {
      return await this.db
        .updateTable('pharmacy_drugs')
        .set({
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
          controlled_level: dto.controlledLevel ?? 'none',
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
    }

    return await this.db
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
        controlled_level: dto.controlledLevel ?? 'none',
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
  }

  async deleteDrug(auth: AuthContext, id: number) {
    const scope = requireTenantScope(auth);
    return await this.db
      .deleteFrom('pharmacy_drugs')
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();
  }

  // -------------------------------------------------------------
  // 4. BATCHES & EXPIRY DATES
  // -------------------------------------------------------------
  async listBatches(
    auth: AuthContext,
    filters?: {
      status?: string;
      q?: string;
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
      const term = `%${normalizeArabicSearch(filters.q)}%`;
      query = query.where(sql<boolean>`(
        lower(batch_number) like ${term}
        OR lower(coalesce(supplier_name, '')) like ${term}
        OR lower(coalesce(notes, '')) like ${term}
      )`);
    }

    const totalRes = await query.select((eb) => eb.fn.count('id').as('count')).executeTakeFirst();
    const total = Number(totalRes?.count || 0);

    const page = Math.max(1, Number(filters?.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(filters?.pageSize || 25)));
    const offset = (page - 1) * pageSize;

    const batches = await query
      .selectAll()
      .orderBy('id', 'desc')
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
      return await this.db
        .updateTable('pharmacy_batches')
        .set({
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
          updated_at: sql`now()`,
        })
        .where('id', '=', dto.id)
        .where('tenant_id', '=', scope.tenantId)
        .returningAll()
        .executeTakeFirstOrThrow();
    }

    const batch = await this.db
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

    // Record cash outflow for batch purchase cost
    const totalBatchCost = Number(dto.quantity || 0) * Number(dto.unitCost || 0);
    if (totalBatchCost > 0) {
      try {
        await this.db
          .insertInto('treasury_transactions')
          .values({
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
            txn_type: 'expense',
            amount: -totalBatchCost,
            note: `شراء دواء - دفعة ${dto.batchNumber} — كمية: ${dto.quantity} وحدة × ${Number(dto.unitCost).toFixed(2)} ج${dto.supplierName ? ` — المورد: ${dto.supplierName}` : ''}`,
            reference_type: 'pharmacy_batch',
            reference_id: Number(batch.id),
            location_id: dto.locationId ?? null,
            created_by: auth.userId ? Number(auth.userId) : null,
          })
          .execute();
      } catch (err) {
        console.warn('Failed to record pharmacy batch purchase to treasury:', err);
      }
    }

    return batch;
  }

  // -------------------------------------------------------------
  // 5. PRESCRIPTIONS & MEDICAL INSURANCE
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
        OR lower(customer_name) like ${term}
        OR lower(coalesce(customer_phone, '')) like ${term}
        OR lower(coalesce(doctor_name, '')) like ${term}
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

    const rxNo = dto.prescriptionNo || `RX-${Date.now().toString().slice(-6)}`;
    const itemsJsonStr = dto.items ? JSON.stringify(dto.items) : '[]';

    if (dto.id) {
      return await this.db
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
          patient_copay_percent: dto.patientCopayPercent || 0,
          total_amount: dto.totalAmount || 0,
          patient_amount: dto.patientAmount || 0,
          insurance_amount: dto.insuranceAmount || 0,
          items_json: itemsJsonStr,
          dispensed_by: dto.dispensedBy ?? null,
          status: dto.status || 'dispensed',
          notes: dto.notes ?? null,
          updated_at: sql`now()`,
        })
        .where('id', '=', dto.id)
        .where('tenant_id', '=', scope.tenantId)
        .returningAll()
        .executeTakeFirstOrThrow();
    }

    const rx = await this.db
      .insertInto('pharmacy_prescriptions')
      .values({
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
        prescription_no: rxNo,
        customer_name: dto.customerName,
        customer_phone: dto.customerPhone ?? null,
        doctor_name: dto.doctorName ?? null,
        doctor_specialty: dto.doctorSpecialty ?? null,
        diagnosis: dto.diagnosis ?? null,
        insurance_provider: dto.insuranceProvider ?? null,
        insurance_card_no: dto.insuranceCardNo ?? null,
        approval_code: dto.approvalCode ?? null,
        patient_copay_percent: dto.patientCopayPercent || 0,
        total_amount: dto.totalAmount || 0,
        patient_amount: dto.patientAmount || 0,
        insurance_amount: dto.insuranceAmount || 0,
        items_json: itemsJsonStr,
        dispensed_by: dto.dispensedBy ?? null,
        status: dto.status || 'dispensed',
        notes: dto.notes ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Record cash revenue for patient cash payment (excluding insurance portion)
    const patientCash = Number(dto.patientAmount || dto.totalAmount || 0);
    if (patientCash > 0 && (dto.status || 'dispensed') === 'dispensed') {
      try {
        const insuranceSuffix = dto.insuranceProvider && Number(dto.insuranceAmount || 0) > 0
          ? ` (التأمين ${dto.insuranceProvider}: ${Number(dto.insuranceAmount).toFixed(2)} ج)`
          : '';
        await this.db
          .insertInto('treasury_transactions')
          .values({
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
            txn_type: 'revenue',
            amount: patientCash,
            note: `صرف روشتة ${rxNo} — العميل: ${dto.customerName} — إجمالي: ${Number(dto.totalAmount || 0).toFixed(2)} ج — نقدي: ${patientCash.toFixed(2)} ج${insuranceSuffix}`,
            reference_type: 'pharmacy_prescription',
            reference_id: Number(rx.id),
            created_by: auth.userId ? Number(auth.userId) : null,
          })
          .execute();
      } catch (err) {
        console.warn('Failed to record pharmacy prescription revenue to treasury:', err);
      }
    }

    return rx;
  }

  // -------------------------------------------------------------
  // 6. SHORTAGES BOOK (كشكول النواقص الرقمي)
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
        OR lower(coalesce(customer_name, '')) like ${term}
        OR lower(coalesce(suggested_distributor, '')) like ${term}
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
      return await this.db
        .updateTable('pharmacy_shortages')
        .set({
          product_name: dto.productName,
          active_ingredient: dto.activeIngredient ?? null,
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
    }

    return await this.db
      .insertInto('pharmacy_shortages')
      .values({
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
        product_name: dto.productName,
        active_ingredient: dto.activeIngredient ?? null,
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
  // 7. CLINICAL SERVICES (الخدمات والفحوصات الصيدلانية)
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
    const service = await this.db
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

    // Record revenue if a fee was collected
    const fee = Number(dto.fee || 0);
    if (fee > 0) {
      try {
        await this.db
          .insertInto('treasury_transactions')
          .values({
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
            txn_type: 'revenue',
            amount: fee,
            note: `خدمة صيدلانية: ${dto.serviceType} — العميل: ${dto.customerName} — رسوم: ${fee.toFixed(2)} ج`,
            reference_type: 'pharmacy_clinical_service',
            reference_id: Number(service.id),
            created_by: auth.userId ? Number(auth.userId) : null,
          })
          .execute();
      } catch (err) {
        console.warn('Failed to record pharmacy clinical service fee to treasury:', err);
      }
    }

    return service;
  }

  // -------------------------------------------------------------
  // 8. PHARMACY DASHBOARD STATS
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
        .select((eb) => [eb.fn.count('id').as('total')])
        .executeTakeFirst(),
    ]);

    return {
      totalDrugs: Number(drugsCountRes?.count || 0),
      neededShortages: Number(shortagesCountRes?.count || 0),
      dispensedPrescriptions: Number(activeRxCountRes?.count || 0),
      totalBatches: Number(batchesRes?.total || 0),
      masterDrugsCatalogSize: EGYPTIAN_MASTER_DRUGS.length,
    };
  }
}
