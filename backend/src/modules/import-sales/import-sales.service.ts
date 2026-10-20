import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { Inject } from '@nestjs/common';
import { KYSELY_DB } from '../../database/database.constants';
import { CreateShipmentDto, UpdateShipmentCostsDto, AddShipmentItemDto, RecordForeignTransferDto } from './dto/import-sales.dto';
import { applyStockDelta, lockStockProducts } from '../../common/utils/location-stock-ledger';

@Injectable()
export class ImportSalesService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<any>) {}

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

    return { ...shipment, items };
  }

  async addShipmentItem(tenantId: string, shipmentId: string, dto: AddShipmentItemDto) {
    const result = await this.db
      .insertInto('import_shipment_items')
      .values({
        tenant_id: tenantId,
        shipment_id: shipmentId,
        product_id: dto.productId,
        quantity: dto.quantity,
        factory_unit_price_usd: dto.factoryUnitPriceUsd,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await this.calculateLandedCost(tenantId, shipmentId);
    return result;
  }

  async updateShipmentCosts(tenantId: string, userId: number, shipmentId: string, dto: UpdateShipmentCostsDto) {
    let updatePayload: any = {};
    if (dto.shippingCostUsd !== undefined) updatePayload.shipping_cost_usd = dto.shippingCostUsd;
    if (dto.customsCostEgp !== undefined) updatePayload.customs_cost_egp = dto.customsCostEgp;
    if (dto.internalTransportCostEgp !== undefined) updatePayload.internal_transport_cost_egp = dto.internalTransportCostEgp;
    if (dto.exchangeRateAtArrival !== undefined) updatePayload.exchange_rate_at_arrival = dto.exchangeRateAtArrival;
    if (dto.pricingExchangeRate !== undefined) updatePayload.pricing_exchange_rate = dto.pricingExchangeRate;
    if (dto.status !== undefined) updatePayload.status = dto.status;
    if (dto.shippedDate !== undefined) updatePayload.shipped_date = dto.shippedDate;
    if (dto.etaDate !== undefined) updatePayload.eta_date = dto.etaDate;
    if (dto.clearanceDate !== undefined) updatePayload.clearance_date = dto.clearanceDate;

    return await this.db.transaction().execute(async (trx) => {
      const shipment = await trx.selectFrom('import_shipments').selectAll().where('id', '=', shipmentId).where('tenant_id', '=', tenantId).executeTakeFirstOrThrow();
      
      const handleExpense = async (
        costAmount: number | undefined, 
        accountId: string | undefined, 
        existingExpenseId: number | null, 
        title: string
      ): Promise<number | null> => {
        if (costAmount === undefined && accountId === undefined) return existingExpenseId;
        const finalCost = costAmount !== undefined ? costAmount : 0;
        
        if (accountId && finalCost > 0) {
          if (existingExpenseId) {
            await trx
              .updateTable('expenses')
              .set({ amount: finalCost, account_id: accountId })
              .where('id', '=', existingExpenseId)
              .where('tenant_id', '=', tenantId)
              .execute();
            return existingExpenseId;
          } else {
            const expense = await trx.insertInto('expenses').values({
              tenant_id: tenantId,
              account_id: accountId,
              title: `${title} للحاوية ${shipment.container_number}`,
              amount: finalCost,
              expense_date: new Date(),
              created_by: userId
            }).returning('id').executeTakeFirstOrThrow();
            return expense.id;
          }
        }
        return existingExpenseId;
      };

      if (dto.shippingCostUsd !== undefined || dto.shippingAccountId !== undefined) {
        const rate = dto.exchangeRateAtArrival || shipment.exchange_rate_at_arrival || 1;
        updatePayload.shipping_expense_id = await handleExpense(
          (dto.shippingCostUsd || 0) * rate,
          dto.shippingAccountId, 
          shipment.shipping_expense_id, 
          'مصاريف شحن'
        );
      }
      
      if (dto.customsCostEgp !== undefined || dto.customsAccountId !== undefined) {
        updatePayload.customs_expense_id = await handleExpense(dto.customsCostEgp, dto.customsAccountId, shipment.customs_expense_id, 'مصاريف جمارك');
      }

      if (dto.internalTransportCostEgp !== undefined || dto.transportAccountId !== undefined) {
        updatePayload.transport_expense_id = await handleExpense(dto.internalTransportCostEgp, dto.transportAccountId, shipment.transport_expense_id, 'مصاريف نقل داخلي');
      }

      if (Object.keys(updatePayload).length > 0) {
        await trx
          .updateTable('import_shipments')
          .set(updatePayload)
          .where('tenant_id', '=', tenantId)
          .where('id', '=', shipmentId)
          .execute();
      }
    }).then(async () => {
      await this.calculateLandedCost(tenantId, shipmentId);
      
      // If status changed to Arrived, update inventory and cost using weighted average
      if (dto.status === 'Arrived') {
        await this.postShipmentToInventory(tenantId, shipmentId);
      }
      
      return await this.getShipmentById(tenantId, shipmentId);
    });      
  }

  private async postShipmentToInventory(tenantId: string, shipmentId: string) {
    await this.db.transaction().execute(async (trx) => {
      await trx.selectFrom('import_shipments').select('id')
        .where('id', '=', shipmentId).where('tenant_id', '=', tenantId)
        .forUpdate().executeTakeFirstOrThrow();

      // Robust idempotency check by reference_type and reference_id (with backwards-compat fallback)
      const posted = await trx.selectFrom('stock_movements').select('id')
        .where('tenant_id', '=', tenantId)
        .where('reference_type', '=', 'import_shipment')
        .where((eb) => eb.or([
          eb('reference_id', '=', shipmentId as any),
          eb('note', 'like', `شحنة استيراد #${shipmentId} -%`)
        ]))
        .executeTakeFirst();
      if (posted) return;

      const items = await trx.selectFrom('import_shipment_items').selectAll()
        .where('tenant_id', '=', tenantId).where('shipment_id', '=', shipmentId)
        .orderBy('product_id', 'asc').execute();
      if (items.length === 0) return;

      const products = await trx.selectFrom('products').select(['id', 'account_id', 'cost_price'])
        .where('tenant_id', '=', tenantId)
        .where('id', 'in', items.map((item) => Number(item.product_id)))
        .execute();
      const accountByProduct = new Map<number, string>(products.map((product) => [Number(product.id), String(product.account_id)]));
      const costByProduct = new Map<number, number>(products.map((product) => [Number(product.id), Number(product.cost_price || 0)]));

      for (const product of products.sort((a, b) => Number(a.id) - Number(b.id))) {
        await lockStockProducts(trx as any, { tenantId, accountId: String(product.account_id), productIds: [Number(product.id)] });
      }

      for (const item of items) {
        const finalQty = item.received_quantity !== null && item.received_quantity !== undefined
          ? Number(item.received_quantity)
          : Number(item.quantity);
        if (!Number.isFinite(finalQty) || finalQty < 0) throw new BadRequestException('Invalid received quantity');
        const accountId = accountByProduct.get(Number(item.product_id));
        if (!accountId) throw new NotFoundException(`Product #${item.product_id} not found`);
        const landedCost = Number(item.landed_cost_egp) || 0;

        const stockChange = await applyStockDelta(trx as any, {
          tenantId, accountId, productId: Number(item.product_id), delta: finalQty,
        });

        // Compute Weighted Average Cost: ((oldQty * oldCost) + (finalQty * landedCost)) / totalQty
        const oldQty = Math.max(0, stockChange.globalBefore ?? stockChange.scopeBefore);
        const oldCost = costByProduct.get(Number(item.product_id)) ?? 0;
        const totalQty = oldQty + finalQty;
        const newWeightedCost = (finalQty > 0 && totalQty > 0.00001)
          ? ((oldQty * oldCost) + (finalQty * landedCost)) / totalQty
          : (landedCost > 0 ? landedCost : oldCost);

        await trx.updateTable('products')
          .set({ cost_price: Number(newWeightedCost.toFixed(6)), updated_at: sql`NOW()` })
          .where('tenant_id', '=', tenantId).where('account_id', '=', accountId)
          .where('id', '=', Number(item.product_id)).execute();

        await trx.insertInto('stock_movements').values({
          product_id: Number(item.product_id),
          movement_type: 'import_receipt',
          qty: finalQty,
          before_qty: stockChange.scopeBefore,
          after_qty: stockChange.scopeAfter,
          reason: 'استلام شحنة استيراد',
          note: `شحنة استيراد #${shipmentId} - تكلفة محملة للقطعة: ${landedCost} ج.م`,
          reference_type: 'import_shipment',
          reference_id: shipmentId as any,
          tenant_id: tenantId,
          account_id: accountId,
        } as any).execute();

        const qty = Number(item.quantity);
        if (item.shortage_handling_method === 'expense' && finalQty < qty) {
          const missingQty = qty - finalQty;
          const lossAmount = missingQty * landedCost;

          await trx.insertInto('expenses').values({
            tenant_id: tenantId,
            account_id: accountId,
            title: `خسائر نواقص حاوية (تسوية عجز) - صنف ${item.product_id}`,
            amount: lossAmount,
            expense_date: new Date(),
            note: `نقص عدد ${missingQty} قطعة من البوليصة. تم معالجتها كخسارة.`
          }).execute();
        }
      }
    });
  }

  async calculateLandedCost(tenantId: string, shipmentId: string) {
    const shipment = await this.db
      .selectFrom('import_shipments')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', shipmentId)
      .executeTakeFirst();
      
    if (!shipment) return { success: false, message: 'Not found' };

    const rate = Number(shipment.exchange_rate_at_arrival);
    if (!rate || rate <= 0) {
      throw new BadRequestException('يجب تحديد سعر الصرف الفعلي للعملة الأجنبية للشحنة لحساب التكلفة الفعلية بدقة.');
    }

    const items = await this.db
      .selectFrom('import_shipment_items')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('shipment_id', '=', shipmentId)
      .execute();

    if (items.length === 0) return { success: true };

    const shippingUsd = Number(shipment.shipping_cost_usd) || 0;
    const customsEgp = Number(shipment.customs_cost_egp) || 0;
    const transportEgp = Number(shipment.internal_transport_cost_egp) || 0;

    const shippingEgp = shippingUsd * rate;
    const totalOverheadEgp = shippingEgp + customsEgp + transportEgp;

    const totalUsdValue = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.factory_unit_price_usd)), 0);

    for (const item of items) {
      const qty = Number(item.quantity);
      const unitUsd = Number(item.factory_unit_price_usd);
      const itemTotalUsd = qty * unitUsd;
      
      const ratio = totalUsdValue > 0 ? (itemTotalUsd / totalUsdValue) : (1 / items.length);
      const itemOverheadEgp = totalOverheadEgp * ratio;
      
      const unitBaseEgp = unitUsd * rate;
      const totalItemCostEgp = (qty * unitBaseEgp) + itemOverheadEgp;
      
      // Handle shortage
      const handlingMethod = item.shortage_handling_method || 'capitalize';
      const receivedQty = item.received_quantity !== null && item.received_quantity !== undefined 
        ? Number(item.received_quantity) 
        : qty;
        
      const effectiveQty = handlingMethod === 'capitalize' && receivedQty > 0 ? receivedQty : qty;

      const unitLandedEgp = effectiveQty > 0 ? totalItemCostEgp / effectiveQty : 0;
      const unitOverheadEgp = effectiveQty > 0 ? itemOverheadEgp / effectiveQty : 0;

      await this.db.updateTable('import_shipment_items')
        .set({
          allocated_overhead_egp: Number(unitOverheadEgp.toFixed(4)),
          landed_cost_egp: Number(unitLandedEgp.toFixed(4))
        })
        .where('id', '=', item.id)
        .where('tenant_id', '=', tenantId)
        .execute();
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

  async updateShipmentItem(tenantId: string, itemId: string, dto: { receivedQuantity?: number, targetRetailMargin?: number, targetWholesaleMargin?: number, shortageHandlingMethod?: 'capitalize' | 'expense' }) {
    const setPayload: any = {};
    if (dto.receivedQuantity !== undefined) setPayload.received_quantity = dto.receivedQuantity;
    if (dto.targetRetailMargin !== undefined) setPayload.target_retail_margin = dto.targetRetailMargin;
    if (dto.targetWholesaleMargin !== undefined) setPayload.target_wholesale_margin = dto.targetWholesaleMargin;
    if (dto.shortageHandlingMethod !== undefined) setPayload.shortage_handling_method = dto.shortageHandlingMethod;

    if (Object.keys(setPayload).length > 0) {
      await this.db
        .updateTable('import_shipment_items')
        .set(setPayload)
        .where('id', '=', itemId)
        .where('tenant_id', '=', tenantId)
        .execute();
        
      if (dto.receivedQuantity !== undefined || dto.shortageHandlingMethod !== undefined) {
        const item = await this.db.selectFrom('import_shipment_items')
          .select('shipment_id')
          .where('id', '=', itemId)
          .where('tenant_id', '=', tenantId)
          .executeTakeFirst();
          
        if (item) {
          await this.calculateLandedCost(tenantId, item.shipment_id);
        }
      }
    }
    
    return { success: true };
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
