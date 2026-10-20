import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Kysely, sql, Transaction, Selectable, Updateable } from 'kysely';
import { Database, ImportShipmentTable, ImportShipmentItemTable } from '../../database/database.types';
import { calculateImportLandedCosts, groupImportReceipts, importWeightedAverageCost, requireImportNumber } from './import-inventory-cost.engine';
import { Inject } from '@nestjs/common';
import { KYSELY_DB } from '../../database/database.constants';
import { CreateShipmentDto, UpdateShipmentCostsDto, AddShipmentItemDto, RecordForeignTransferDto, UpdateShipmentItemDto } from './dto/import-sales.dto';
import { applyStockDelta, lockStockProducts } from '../../common/utils/location-stock-ledger';

@Injectable()
export class ImportSalesService {
  // Keep unrelated partner/transfer paths untouched; all inventory queries use the real schema.
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
    return { ...shipment, items, inventory_receipt: receipt ?? null };
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

  async generatePeriodProfitReport(tenantId: string, startDate: string | Date, endDate: string | Date) {
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
    const partners = await this.db
      .selectFrom('import_partners')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .execute();

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
}
