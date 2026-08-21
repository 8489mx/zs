import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { Inject } from '@nestjs/common';
import { KYSELY_DB } from '../../database/database.constants';
import { CreateShipmentDto, UpdateShipmentCostsDto, AddShipmentItemDto, RecordForeignTransferDto } from './dto/import-sales.dto';

@Injectable()
export class ImportSalesService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<any>) {}

  async getPartners(tenantId: string) {
    return await this.db
      .selectFrom('import_partners')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .execute();
  }

  async createPartner(tenantId: string, userId: number, name: string, percentage: number, capitalAmount: number = 0, accountId?: string) {
    const partner = await this.db
      .insertInto('import_partners')
      .values({
        tenant_id: tenantId,
        name,
        profit_share_percentage: percentage,
        capital_amount: 0 // Will be added via transaction if > 0
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    if (capitalAmount > 0) {
      await this.recordCapitalTransaction(tenantId, userId, partner.id, {
        type: 'DEPOSIT',
        amount: capitalAmount,
        date: new Date().toISOString().split('T')[0],
        note: 'رأس مال افتتاحي',
        accountId
      });
      // Fetch updated partner
      return await this.db
        .selectFrom('import_partners')
        .selectAll()
        .where('id', '=', partner.id)
        .executeTakeFirstOrThrow();
    }

    return partner;
  }

  async updatePartner(tenantId: string, id: string, name?: string, percentage?: number, capitalAmount?: number) {
    let updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (percentage !== undefined) updateData.profit_share_percentage = percentage;
    if (capitalAmount !== undefined) updateData.capital_amount = capitalAmount;

    if (Object.keys(updateData).length === 0) return null;

    return await this.db
      .updateTable('import_partners')
      .set(updateData)
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
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
      
      // Helper to handle expenses
      const handleExpense = async (
        costAmount: number | undefined, 
        accountId: string | undefined, 
        existingExpenseId: number | null, 
        title: string
      ): Promise<number | null> => {
        if (costAmount === undefined && accountId === undefined) return existingExpenseId;
        
        const finalCost = costAmount !== undefined ? costAmount : 0; // If not provided, it might mean we just want to update something else, but let's assume we update expense if we provide cost OR account. Actually, if they pass cost, they must pass accountId if they want to pay.
        // If cost is 0, we can delete the expense, but let's just set it to 0 for simplicity.
        
        if (accountId && finalCost > 0) {
          if (existingExpenseId) {
            await trx.updateTable('expenses').set({ amount: finalCost, account_id: accountId }).where('id', '=', existingExpenseId).execute();
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
        updatePayload.shipping_expense_id = await handleExpense(
          (dto.shippingCostUsd || 0) * (dto.exchangeRateAtArrival || shipment.exchange_rate_at_arrival || 1), // Need EGP for expense!
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
      
      // If status changed to Arrived, update inventory and cost
      if (dto.status === 'Arrived') {
        await this.postShipmentToInventory(tenantId, shipmentId);
      }
      
      return await this.getShipmentById(tenantId, shipmentId);
    });      
  }

  private async postShipmentToInventory(tenantId: string, shipmentId: string) {
    const items = await this.db
      .selectFrom('import_shipment_items')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('shipment_id', '=', shipmentId)
      .execute();

    for (const item of items) {
      const finalQty = item.received_quantity !== null && item.received_quantity !== undefined 
        ? Number(item.received_quantity) 
        : Number(item.quantity);

      const prod = await this.db
        .selectFrom('products')
        .select(['stock_qty', 'cost_price'])
        .where('tenant_id', '=', tenantId)
        .where('id', '=', Number(item.product_id))
        .executeTakeFirst();

      const beforeQty = Number(prod?.stock_qty || 0);
      const afterQty = beforeQty + finalQty;
      const landedCost = Number(item.landed_cost_egp) || 0;

      // Update product stock and weighted cost_price
      await this.db
        .updateTable('products')
        .set({
          stock_qty: afterQty,
          cost_price: landedCost,
          updated_at: sql`NOW()`
        })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', Number(item.product_id))
        .execute();

      try {
        await this.db
          .insertInto('stock_movements')
          .values({
            product_id: Number(item.product_id),
            movement_type: 'import_receipt',
            qty: finalQty,
            before_qty: beforeQty,
            after_qty: afterQty,
            reason: 'استلام شحنة استيراد',
            note: `شحنة استيراد #${shipmentId} - تكلفة محملة للقطعة: ${landedCost} ج.م`,
            reference_type: 'import_shipment',
            reference_id: null,
            tenant_id: tenantId,
          } as any)
          .execute();
      } catch (err) {
        console.warn('Failed to record stock movement for import receipt:', err);
      }
        
      const qty = Number(item.quantity);
      if (item.shortage_handling_method === 'expense' && finalQty < qty) {
        const missingQty = qty - finalQty;
        const lossAmount = missingQty * landedCost;
        
        await this.db
          .insertInto('expenses')
          .values({
            tenant_id: tenantId,
            title: `خسائر نواقص حاوية (تسوية عجز) - صنف ${item.product_id}`,
            amount: lossAmount,
            expense_date: new Date(),
            note: `نقص عدد ${missingQty} قطعة من البوليصة. تم معالجتها كخسارة.`
          })
          .execute();
      }
    }
  }

  async calculateLandedCost(tenantId: string, shipmentId: string) {
    const shipment = await this.db
      .selectFrom('import_shipments')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', shipmentId)
      .executeTakeFirst();
      
    if (!shipment) return { success: false, message: 'Not found' };

    const items = await this.db
      .selectFrom('import_shipment_items')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('shipment_id', '=', shipmentId)
      .execute();

    if (items.length === 0) return { success: true };

    const rate = Number(shipment.exchange_rate_at_arrival) || 1;
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
          allocated_overhead_egp: unitOverheadEgp,
          landed_cost_egp: unitLandedEgp
        })
        .where('id', '=', item.id)
        .execute();
    }
    
    return { success: true, message: 'Landed cost recalculated successfully' };
  }

  async generatePeriodProfitReport(tenantId: string, startDate: string | Date, endDate: string | Date) {
    // 1. Get total revenue and cost from sales
    const salesData = await this.db
      .selectFrom('sales')
      .innerJoin('sale_items', 'sale_items.sale_id', 'sales.id')
      .select([
        sql<number>`sum(sale_items.line_total)`.as('total_revenue'),
        sql<number>`sum(sale_items.qty * sale_items.cost_price)`.as('total_cost')
      ])
      .where('sales.tenant_id', '=', tenantId)
      .where('sales.status', '!=', 'cancelled')
      .where('sales.created_at', '>=', new Date(startDate))
      .where('sales.created_at', '<=', new Date(endDate))
      .executeTakeFirst();

    const totalRevenue = Number(salesData?.total_revenue || 0);
    const totalCost = Number(salesData?.total_cost || 0);
    const grossProfit = totalRevenue - totalCost;

    // 2. Get operational expenses
    const expensesData = await this.db
      .selectFrom('expenses')
      .select([sql<number>`sum(amount)`.as('total_expenses')])
      .where('tenant_id', '=', tenantId)
      .where('expense_date', '>=', new Date(startDate))
      .where('expense_date', '<=', new Date(endDate))
      .executeTakeFirst();

    const totalExpenses = Number(expensesData?.total_expenses || 0);
    const netProfitPool = grossProfit - totalExpenses;

    // 3. Get partners and distribute
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
        shareAmount,
        withdrawnProfit: withdrawn,
        currentBalance: shareAmount - withdrawn
      };
    });

    return { 
      success: true, 
      message: 'تم تجميع أرباح الشراكة بنجاح', 
      data: {
        totalRevenue,
        totalCost,
        grossProfit,
        totalExpenses,
        netProfitPool,
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
        'suppliers.name as supplier_name'
      ])
      .where('supplier_payments.tenant_id', '=', tenantId)
      .where('supplier_payments.doc_no', '=', 'FOREIGN_TRANSFER')
      .orderBy('supplier_payments.payment_date', 'desc')
      .limit(50)
      .execute();
  }

  async recordForeignTransfer(tenantId: string, userId: number, dto: RecordForeignTransferDto) {
    const { supplierId, amountEgp, amountForeign, notes } = dto;
    const sId = Number(supplierId);

    return await this.db.transaction().execute(async (trx) => {
      const supplier = await trx
        .selectFrom('suppliers')
        .select(['id', 'name', 'account_id', 'balance'])
        .where('id', '=', sId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirstOrThrow();

      // 1. Create Treasury Expense (amountEgp)
      const expenseInsert = await trx.insertInto('expenses').values({
        tenant_id: tenantId,
        account_id: supplier.account_id,
        title: `حوالة خارجية إلى ${supplier.name}`,
        amount: amountEgp,
        note: notes || '',
        expense_date: new Date(),
        created_by: userId
      }).returning('id').executeTakeFirstOrThrow();
      
      const expenseId = expenseInsert.id;

      await trx.insertInto('treasury_transactions').values({
        tenant_id: tenantId,
        account_id: supplier.account_id,
        txn_type: 'expense',
        amount: -amountEgp,
        note: `تدبير عملة: حوالة خارجية إلى ${supplier.name}`,
        reference_type: 'expense',
        reference_id: expenseId,
        created_by: userId
      }).execute();

      // 2. Create Supplier Payment (amountForeign)
      const paymentInsert = await trx.insertInto('supplier_payments').values({
        tenant_id: tenantId,
        account_id: supplier.account_id,
        supplier_id: supplier.id,
        amount: amountForeign,
        note: `حوالة استيراد خارجية${notes ? ' - ' + notes : ''}`,
        created_by: userId
      }).returning('id').executeTakeFirstOrThrow();
      
      const paymentId = paymentInsert.id;

      await trx.updateTable('supplier_payments')
        .set({ doc_no: `FT-${paymentId}` })
        .where('id', '=', paymentId)
        .where('tenant_id', '=', tenantId)
        .execute();

      // 3. Update Supplier Ledger
      const newBalance = Number(supplier.balance || 0) - amountForeign;
      await trx.insertInto('supplier_ledger').values({
        tenant_id: tenantId,
        account_id: supplier.account_id,
        supplier_id: supplier.id,
        entry_type: 'supplier_payment',
        amount: -amountForeign,
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

      return { success: true, paymentId, expenseId, newBalance };
    });
  }

  async recordPartnerPayout(tenantId: string, userId: number, partnerId: string, amount: number) {
    return await this.db.transaction().execute(async (trx) => {
      // 1. Get partner
      const partner = await trx
        .selectFrom('import_partners')
        .selectAll()
        .where('id', '=', partnerId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirstOrThrow();

      // 2. Insert into treasury
      await trx.insertInto('expenses').values({
        tenant_id: tenantId,
        account_id: 'default',
        title: `صرف أرباح الشريك: ${partner.name}`,
        amount: amount,
        note: 'تسوية أرباح شريك',
        expense_date: new Date(),
        created_by: userId
      }).execute();

      await trx.insertInto('treasury_transactions').values({
        tenant_id: tenantId,
        txn_type: 'expense',
        amount: -amount,
        note: `صرف أرباح الشريك: ${partner.name}`,
        reference_type: 'partner_payout',
        created_by: userId
      }).execute();

      // 3. Update partner withdrawn profit
      await trx.updateTable('import_partners')
        .set((eb) => ({
          withdrawn_profit: sql`${eb.ref('withdrawn_profit')} + ${amount}`
        }))
        .where('id', '=', partnerId)
        .where('tenant_id', '=', tenantId)
        .execute();
        
      // 4. Insert into partner ledger
      await trx.insertInto('import_partner_ledger').values({
        tenant_id: tenantId,
        partner_id: partnerId,
        type: 'PROFIT_PAYOUT',
        amount: amount,
        transaction_date: new Date(),
        note: `صرف أرباح الشريك: ${partner.name}`,
        created_by: userId
      }).execute();
        
      return { success: true };
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
    return await this.db.transaction().execute(async (trx) => {
      await trx.insertInto('import_partner_ledger').values({
        tenant_id: tenantId,
        partner_id: partnerId,
        type: dto.type,
        amount: dto.amount,
        transaction_date: dto.date,
        note: dto.note || '',
        created_by: userId
      }).execute();

      const sign = dto.type === 'DEPOSIT' ? '+' : '-';
      await trx.updateTable('import_partners')
        .set((eb) => ({
          capital_amount: sql`${eb.ref('capital_amount')} ${sql.raw(sign)} ${dto.amount}`
        }))
        .where('id', '=', partnerId)
        .where('tenant_id', '=', tenantId)
        .execute();

      if (dto.accountId) {
        await trx.insertInto('treasury_transactions').values({
          tenant_id: tenantId,
          txn_type: dto.type === 'DEPOSIT' ? 'revenue' : 'expense',
          amount: dto.type === 'DEPOSIT' ? dto.amount : -dto.amount,
          note: (dto.type === 'DEPOSIT' ? 'إيداع رأس مال شريك: ' : 'سحب رأس مال شريك: ') + dto.note,
          reference_type: 'partner_capital',
          created_by: userId,
          account_id: dto.accountId
        }).execute();
      }

      return { success: true };
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
          updateData.retail_price = pricingCostEgp * (1 + rMargin);
        }
        
        if (item.target_wholesale_margin !== null && Number(item.target_wholesale_margin) > 0) {
          const wMargin = Number(item.target_wholesale_margin) / 100;
          updateData.wholesale_price = pricingCostEgp * (1 + wMargin);
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

