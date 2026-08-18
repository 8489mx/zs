import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from '../../database/kysely';
import { AuditService } from '../../core/audit/audit.service';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';
import { AppError } from '../../common/errors/app-error';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { UpsertTradeInDto } from './dto/upsert-tradein.dto';

@Injectable()
export class TradeInService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly audit: AuditService,
  ) {}

  async listTransactions(
    auth: AuthContext,
    filters?: {
      q?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const scope = requireTenantScope(auth);
    let query = this.db
      .selectFrom('trade_in_transactions')
      .selectAll()
      .where('tenant_id', '=', scope.tenantId);

    if (filters?.q && filters.q.trim()) {
      const term = `%${filters.q.trim()}%`;
      query = query.where((eb) =>
        eb.or([
          eb('doc_no', 'ilike', term),
          eb('seller_name', 'ilike', term),
          eb('seller_phone', 'ilike', term),
          eb('seller_national_id', 'ilike', term),
          eb('serial_number', 'ilike', term),
          eb('device_model', 'ilike', term),
        ]),
      );
    }

    const totalRes = await query
      .select((eb) => eb.fn.count('id').as('count'))
      .executeTakeFirst();
    const total = Number(totalRes?.count || 0);

    const page = Math.max(1, Number(filters?.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(filters?.pageSize || 25)));
    const offset = (page - 1) * pageSize;

    const items = await query
      .orderBy('id', 'desc')
      .limit(pageSize)
      .offset(offset)
      .execute();

    return {
      transactions: items.map((t) => ({
        id: String(t.id),
        docNo: t.doc_no,
        sellerName: t.seller_name,
        sellerPhone: t.seller_phone,
        sellerNationalId: t.seller_national_id,
        deviceBrand: t.device_brand,
        deviceModel: t.device_model,
        serialNumber: t.serial_number,
        imei2: t.imei_2,
        deviceConditionNotes: t.device_condition_notes,
        agreedPurchasePrice: Number(t.agreed_purchase_price),
        transactionType: t.transaction_type,
        createdProductId: t.created_product_id ? String(t.created_product_id) : null,
        saleId: t.sale_id ? String(t.sale_id) : null,
        paymentMethod: t.payment_method,
        signatureData: t.signature_data,
        branchId: t.branch_id ? String(t.branch_id) : null,
        locationId: t.location_id ? String(t.location_id) : null,
        notes: t.notes,
        createdAt: t.created_at,
      })),
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getTransaction(id: number, auth: AuthContext) {
    const scope = requireTenantScope(auth);
    const item = await this.db
      .selectFrom('trade_in_transactions')
      .selectAll()
      .where('tenant_id', '=', scope.tenantId)
      .where('id', '=', id)
      .executeTakeFirst();

    if (!item) {
      throw new AppError('عملية شراء المستعمل غير موجودة', 'TRADEIN_NOT_FOUND', 404);
    }

    return {
      transaction: {
        id: String(item.id),
        docNo: item.doc_no,
        sellerName: item.seller_name,
        sellerPhone: item.seller_phone,
        sellerNationalId: item.seller_national_id,
        deviceBrand: item.device_brand,
        deviceModel: item.device_model,
        serialNumber: item.serial_number,
        imei2: item.imei_2,
        deviceConditionNotes: item.device_condition_notes,
        agreedPurchasePrice: Number(item.agreed_purchase_price),
        transactionType: item.transaction_type,
        createdProductId: item.created_product_id ? String(item.created_product_id) : null,
        saleId: item.sale_id ? String(item.sale_id) : null,
        paymentMethod: item.payment_method,
        signatureData: item.signature_data,
        branchId: item.branch_id ? String(item.branch_id) : null,
        locationId: item.location_id ? String(item.location_id) : null,
        notes: item.notes,
        createdAt: item.created_at,
      },
    };
  }

  async createTransaction(payload: UpsertTradeInDto, auth: AuthContext) {
    const scope = requireTenantScope(auth);
    const countRes = await this.db
      .selectFrom('trade_in_transactions')
      .select((eb) => eb.fn.count('id').as('count'))
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();
    const nextNum = Number(countRes?.count || 0) + 1;
    const year = new Date().getFullYear();
    const docNo = `TRD-${year}-${String(nextNum).padStart(4, '0')}`;

    const result = await this.db
      .insertInto('trade_in_transactions')
      .values({
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
        doc_no: docNo,
        seller_name: payload.sellerName.trim(),
        seller_phone: payload.sellerPhone.trim(),
        seller_national_id: payload.sellerNationalId.trim(),
        device_brand: payload.deviceBrand?.trim() ?? null,
        device_model: payload.deviceModel.trim(),
        serial_number: payload.serialNumber.trim(),
        imei_2: payload.imei2?.trim() ?? null,
        device_condition_notes: payload.deviceConditionNotes?.trim() ?? null,
        agreed_purchase_price: payload.agreedPurchasePrice,
        transaction_type: payload.transactionType ?? 'cash_purchase',
        created_product_id: payload.createdProductId ?? null,
        sale_id: payload.saleId ?? null,
        payment_method: payload.paymentMethod ?? 'cash',
        signature_data: payload.signatureData ?? null,
        branch_id: payload.branchId ?? null,
        location_id: payload.locationId ?? null,
        notes: payload.notes?.trim() ?? null,
      })
      .returning('id')
      .executeTakeFirst();

    if (!result?.id) {
      throw new AppError('تعذر تسجيل عملية الشراء', 'CREATE_TRADEIN_FAILED', 400);
    }

    // If a product ID was linked, automatically register the IMEI in product_serials
    if (payload.createdProductId) {
      const existingSerial = await this.db
        .selectFrom('product_serials')
        .select(['id'])
        .where('tenant_id', '=', scope.tenantId)
        .where('serial_number', '=', payload.serialNumber.trim())
        .executeTakeFirst();

      if (!existingSerial) {
        await this.db
          .insertInto('product_serials')
          .values({
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
            product_id: payload.createdProductId,
            serial_number: payload.serialNumber.trim(),
            imei_2: payload.imei2?.trim() ?? null,
            status: 'in_stock',
            cost_price: payload.agreedPurchasePrice,
            branch_id: payload.branchId ?? null,
            location_id: payload.locationId ?? null,
            notes: `شراء مستعمل إيصال رقم ${docNo} من ${payload.sellerName}`,
          })
          .execute();
      }
    }

    await this.audit.log(
      'Create Trade-In Transaction',
      `Registered used device purchase ${docNo} (${payload.deviceModel} IMEI: ${payload.serialNumber})`,
      auth,
    );

    return { ok: true, id: String(result.id), docNo };
  }

  async deleteTransaction(id: number, auth: AuthContext) {
    const scope = requireTenantScope(auth);
    await this.db
      .deleteFrom('trade_in_transactions')
      .where('tenant_id', '=', scope.tenantId)
      .where('id', '=', id)
      .execute();

    await this.audit.log('Delete Trade-In Transaction', `Deleted Trade-in ID ${id}`, auth);
    return { ok: true };
  }
}
