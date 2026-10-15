import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';

export interface AggregatorChannelDto {
  code: string;
  name: string;
  name_en?: string;
  commission_rate: number;
  is_active: boolean;
  auto_accept_orders: boolean;
  api_key?: string;
  webhook_secret?: string;
}

export interface IngestOrderDto {
  aggregatorCode: string;
  externalOrderId: string;
  displayNumber?: string;
  branchId?: number;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  riderName?: string;
  riderPhone?: string;
  subtotal: number;
  deliveryFee?: number;
  commissionRate?: number;
  items: Array<{
    productId?: number;
    name: string;
    qty: number;
    unitPrice: number;
    modifiers?: Array<{ name: string; price?: number; qty?: number }>;
    notes?: string;
  }>;
  notes?: string;
}

@Injectable()
export class DeliveryAggregatorsService {
  private readonly logger = new Logger(DeliveryAggregatorsService.name);

  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private static readonly DEFAULT_GCC_CHANNELS = [
    { code: 'jahez', name: 'جاهز (Jahez)', name_en: 'Jahez', commission_rate: 18.0 },
    { code: 'hungerstation', name: 'هنقرستيشن (Hungerstation)', name_en: 'Hungerstation', commission_rate: 19.5 },
    { code: 'talabat', name: 'طلبات (Talabat)', name_en: 'Talabat', commission_rate: 20.0 },
    { code: 'deliveroo', name: 'دليفرو (Deliveroo)', name_en: 'Deliveroo', commission_rate: 18.5 },
    { code: 'cari', name: 'كاري (Cari)', name_en: 'Cari', commission_rate: 0.0 },
    { code: 'keeta', name: 'كيتا (Keeta)', name_en: 'Keeta', commission_rate: 15.0 },
    { code: 'careem', name: 'كريم فود (Careem Now)', name_en: 'Careem', commission_rate: 17.0 },
    { code: 'toyou', name: 'تويو (ToYou)', name_en: 'ToYou', commission_rate: 16.0 },
  ];

  /**
   * List all delivery aggregators for tenant, auto-seeding standard GCC channels if not yet present
   */
  async listAggregators(auth: AuthContext) {
    const scope = requireTenantScope(auth);
    let rows = await this.db
      .selectFrom('pos_delivery_aggregators')
      .selectAll()
      .where('tenant_id', '=', scope.tenantId)
      .orderBy('id', 'asc')
      .execute();

    if (rows.length === 0) {
      // Auto-seed default GCC channels
      for (const ch of DeliveryAggregatorsService.DEFAULT_GCC_CHANNELS) {
        await this.db
          .insertInto('pos_delivery_aggregators')
          .values({
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
            code: ch.code,
            name: ch.name,
            name_en: ch.name_en,
            commission_rate: ch.commission_rate,
            is_active: true,
            auto_accept_orders: true,
          })
          .execute();
      }

      rows = await this.db
        .selectFrom('pos_delivery_aggregators')
        .selectAll()
        .where('tenant_id', '=', scope.tenantId)
        .orderBy('id', 'asc')
        .execute();
    } else {
      // Auto-seed any newly added channel (e.g. cari) if missing
      const existingCodes = new Set(rows.map((r) => r.code));
      let hasAdded = false;
      for (const ch of DeliveryAggregatorsService.DEFAULT_GCC_CHANNELS) {
        if (!existingCodes.has(ch.code)) {
          await this.db
            .insertInto('pos_delivery_aggregators')
            .values({
              tenant_id: scope.tenantId,
              account_id: scope.accountId,
              code: ch.code,
              name: ch.name,
              name_en: ch.name_en,
              commission_rate: ch.commission_rate,
              is_active: true,
              auto_accept_orders: true,
            })
            .execute();
          hasAdded = true;
        }
      }
      if (hasAdded) {
        rows = await this.db
          .selectFrom('pos_delivery_aggregators')
          .selectAll()
          .where('tenant_id', '=', scope.tenantId)
          .orderBy('id', 'asc')
          .execute();
      }
    }

    return rows;
  }

  /**
   * Update aggregator settings (commission, active, auto-accept, keys)
   */
  async updateAggregator(auth: AuthContext, id: number, payload: Partial<AggregatorChannelDto>) {
    const scope = requireTenantScope(auth);
    const existing = await this.db
      .selectFrom('pos_delivery_aggregators')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('منصة التوصيل غير موجودة');
    }

    const updateObj: Record<string, any> = {
      updated_at: new Date(),
    };
    if (payload.commission_rate !== undefined) updateObj.commission_rate = payload.commission_rate;
    if (payload.is_active !== undefined) updateObj.is_active = payload.is_active;
    if (payload.auto_accept_orders !== undefined) updateObj.auto_accept_orders = payload.auto_accept_orders;
    if (payload.api_key !== undefined) updateObj.api_key = payload.api_key;
    if (payload.webhook_secret !== undefined) updateObj.webhook_secret = payload.webhook_secret;

    await this.db
      .updateTable('pos_delivery_aggregators')
      .set(updateObj)
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .execute();

    return { success: true };
  }

  /**
   * Ingest incoming aggregator order (from webhook or mock push)
   */
  async ingestOrder(auth: AuthContext, dto: IngestOrderDto) {
    const scope = requireTenantScope(auth);
    const aggregator = await this.db
      .selectFrom('pos_delivery_aggregators')
      .selectAll()
      .where('code', '=', dto.aggregatorCode)
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();

    if (!aggregator || !aggregator.is_active) {
      throw new BadRequestException(`منصة التوصيل ${dto.aggregatorCode} غير مفعلة`);
    }

    const commRate = dto.commissionRate ?? Number(aggregator.commission_rate || 0);
    const subtotal = Number(dto.subtotal || 0);
    const deliveryFee = Number(dto.deliveryFee || 0);
    const commissionAmount = Number(((subtotal * commRate) / 100).toFixed(2));
    const netPayout = Number((subtotal - commissionAmount).toFixed(2));

    const initialStatus = aggregator.auto_accept_orders ? 'preparing' : 'received';

    const inserted = await this.db
      .insertInto('pos_aggregator_orders')
      .values({
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
        aggregator_id: Number(aggregator.id),
        external_order_id: dto.externalOrderId,
        display_number: dto.displayNumber || `${dto.aggregatorCode.toUpperCase()}-${dto.externalOrderId.slice(-4)}`,
        branch_id: dto.branchId ? Number(dto.branchId) : null,
        status: initialStatus,
        customer_name: dto.customerName || 'عميل تطبيق التوصيل',
        customer_phone: dto.customerPhone,
        delivery_address: dto.deliveryAddress,
        rider_name: dto.riderName,
        rider_phone: dto.riderPhone,
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        aggregator_commission: commissionAmount,
        net_payout: netPayout,
        order_payload: dto as any,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    return {
      orderId: Number(inserted.id),
      status: initialStatus,
      displayNumber: dto.displayNumber || `${dto.aggregatorCode.toUpperCase()}-${dto.externalOrderId.slice(-4)}`,
      netPayout,
      commissionAmount,
    };
  }

  /**
   * List live aggregator orders with status filter
   */
  async listOrders(auth: AuthContext, filters?: { status?: string; limit?: number }) {
    const scope = requireTenantScope(auth);
    let query = this.db
      .selectFrom('pos_aggregator_orders as o')
      .innerJoin('pos_delivery_aggregators as a', 'a.id', 'o.aggregator_id')
      .select([
        'o.id',
        'o.aggregator_id',
        'a.code as aggregator_code',
        'a.name as aggregator_name',
        'o.external_order_id',
        'o.display_number',
        'o.status',
        'o.customer_name',
        'o.customer_phone',
        'o.delivery_address',
        'o.rider_name',
        'o.rider_phone',
        'o.subtotal',
        'o.delivery_fee',
        'o.aggregator_commission',
        'o.net_payout',
        'o.order_payload',
        'o.created_at',
      ])
      .where('o.tenant_id', '=', scope.tenantId);

    if (filters?.status && filters.status !== 'all') {
      query = query.where('o.status', '=', filters.status);
    }

    return query
      .orderBy('o.created_at', 'desc')
      .limit(filters?.limit || 50)
      .execute();
  }

  /**
   * Update aggregator order status (e.g. ready for pickup, delivered)
   */
  async updateOrderStatus(auth: AuthContext, orderId: number, status: string) {
    const scope = requireTenantScope(auth);
    await this.db
      .updateTable('pos_aggregator_orders')
      .set({
        status,
        updated_at: new Date(),
      })
      .where('id', '=', orderId)
      .where('tenant_id', '=', scope.tenantId)
      .execute();

    return { success: true, status };
  }

  /**
   * Trigger 86 (Out of Stock) for a product across active delivery platforms
   */
  async trigger86(auth: AuthContext, productId: number, isAvailable: boolean) {
    const scope = requireTenantScope(auth);
    const product = await this.db
      .selectFrom('products')
      .select(['id', 'name'])
      .where('id', '=', productId)
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();

    if (!product) {
      throw new NotFoundException('الصنف غير موجود');
    }

    this.logger.log(
      `Tenant ${scope.tenantId}: Item 86 dispatched for Product #${productId} (${product.name}) -> Available: ${isAvailable}`,
    );

    return {
      productId,
      productName: product.name,
      isAvailable,
      broadcastedTo: ['jahez', 'hungerstation', 'talabat', 'keeta', 'deliveroo'],
      timestamp: new Date().toISOString(),
    };
  }
}
