import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { applyStockDelta } from '../../../common/utils/location-stock-ledger';
import { AccountingPostingService } from '../../accounting/accounting-posting.service';

export interface CreateFoodWasteLogDto {
  branchId: number;
  productId: number;
  quantity: number;
  reason: 'spoilage' | 'prep_error' | 'expired' | 'customer_complaint' | 'other';
  notes?: string;
}

@Injectable()
export class RestaurantFoodWasteService {
  private readonly logger = new Logger(RestaurantFoodWasteService.name);

  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly accountingPosting: AccountingPostingService,
  ) {}

  /**
   * Log daily/shift food waste and deduct raw ingredient from inventory
   */
  async logWaste(auth: AuthContext, dto: CreateFoodWasteLogDto) {
    const scope = requireTenantScope(auth);
    if (!dto.quantity || dto.quantity <= 0) {
      throw new BadRequestException('الكمية يجب أن تكون أكبر من الصفر');
    }

    const product = await this.db
      .selectFrom('products')
      .select(['id', 'name', 'cost_price'])
      .where('id', '=', dto.productId)
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();

    if (!product) {
      throw new NotFoundException('الصنف غير موجود');
    }

    const costPrice = Number(product.cost_price || 0);
    const totalCost = Number((costPrice * dto.quantity).toFixed(2));

    return await this.db.transaction().execute(async (trx) => {
      // 1. Get primary stock location for branch
      const branch = await trx
        .selectFrom('branches')
        .select(['default_stock_location_id'])
        .where('id', '=', dto.branchId)
        .where('tenant_id', '=', scope.tenantId)
        .executeTakeFirst();

      let locationId = branch?.default_stock_location_id ? Number(branch.default_stock_location_id) : null;
      if (!locationId) {
        const fallbackLocation = await trx
          .selectFrom('stock_locations')
          .select(['id'])
          .where('branch_id', '=', dto.branchId)
          .where('is_active', '=', true)
          .where('tenant_id', '=', scope.tenantId)
          .executeTakeFirst();
        locationId = fallbackLocation ? Number(fallbackLocation.id) : null;
      }

      // 2. Insert waste log
      const log = await trx
        .insertInto('restaurant_food_waste_logs')
        .values({
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
          branch_id: dto.branchId,
          product_id: dto.productId,
          quantity: dto.quantity,
          cost_price: costPrice,
          total_cost: totalCost,
          reason: dto.reason,
          notes: dto.notes || null,
          logged_by: auth.userId ? Number(auth.userId) : null,
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      // 3. Deduct stock if location exists
      if (locationId) {
        const stockChange = await applyStockDelta(trx, {
          productId: dto.productId,
          delta: -dto.quantity,
          branchId: dto.branchId,
          locationId: locationId,
          tenantId: scope.tenantId,
          accountId: scope.accountId,
          allowNegative: true,
        });

        await trx
          .insertInto('stock_movements')
          .values({
            product_id: dto.productId,
            movement_type: 'damaged',
            qty: -dto.quantity,
            before_qty: stockChange.scopeBefore,
            after_qty: stockChange.scopeAfter,
            reason: `food_waste_${dto.reason}`,
            note: `هدر مطبخ #${log.id}: ${dto.notes || dto.reason}`,
            reference_type: 'food_waste',
            reference_id: Number(log.id),
            branch_id: dto.branchId,
            location_id: locationId,
            created_by: auth.userId ? Number(auth.userId) : 0,
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
          } as any)
          .execute();
      }

      // Post double-entry journal entry in General Ledger (Debit: Food Waste Expense 5300, Credit: Inventory 1140)
      const journalResult = await this.accountingPosting.postFoodWaste(trx, Number(log.id), auth);

      return {
        id: Number(log.id),
        productName: product.name,
        quantity: dto.quantity,
        totalCost,
        journalEntryId: journalResult.journalEntryId,
      };
    });
  }

  /**
   * List recent waste logs with optional branch filter
   */
  async listLogs(auth: AuthContext, filters?: { branchId?: number; limit?: number }) {
    const scope = requireTenantScope(auth);
    let query = this.db
      .selectFrom('restaurant_food_waste_logs as w')
      .innerJoin('products as p', 'p.id', 'w.product_id')
      .leftJoin('branches as b', 'b.id', 'w.branch_id')
      .select([
        'w.id',
        'w.branch_id',
        'b.name as branch_name',
        'w.product_id',
        'p.name as product_name',
        'w.quantity',
        'w.cost_price',
        'w.total_cost',
        'w.reason',
        'w.notes',
        'w.created_at',
      ])
      .where('w.tenant_id', '=', scope.tenantId);

    if (filters?.branchId) {
      query = query.where('w.branch_id', '=', filters.branchId);
    }

    return query
      .orderBy('w.created_at', 'desc')
      .limit(filters?.limit || 50)
      .execute();
  }

  /**
   * Get Food Cost Variance Summary (Theoretical consumption vs. waste)
   */
  async getVarianceSummary(auth: AuthContext, branchId?: number) {
    const scope = requireTenantScope(auth);

    // Sum total waste in last 30 days
    const wasteSummary = await this.db
      .selectFrom('restaurant_food_waste_logs')
      .select([
        sql<number>`COALESCE(SUM(total_cost), 0)`.as('total_waste_cost'),
        sql<number>`COALESCE(COUNT(*), 0)`.as('total_waste_incidents'),
      ])
      .where('tenant_id', '=', scope.tenantId)
      .where(sql<boolean>`created_at >= NOW() - INTERVAL '30 days'`)
      .executeTakeFirst();

    // Group waste by reason
    const wasteByReason = await this.db
      .selectFrom('restaurant_food_waste_logs')
      .select([
        'reason',
        sql<number>`COALESCE(SUM(total_cost), 0)`.as('cost'),
        sql<number>`COUNT(*)`.as('count'),
      ])
      .where('tenant_id', '=', scope.tenantId)
      .where(sql<boolean>`created_at >= NOW() - INTERVAL '30 days'`)
      .groupBy('reason')
      .execute();

    return {
      period: '30_days',
      totalWasteCost: Number(wasteSummary?.total_waste_cost || 0),
      totalWasteIncidents: Number(wasteSummary?.total_waste_incidents || 0),
      byReason: wasteByReason.map((r) => ({
        reason: r.reason,
        cost: Number(r.cost),
        count: Number(r.count),
      })),
    };
  }
}
