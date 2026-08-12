import { Injectable, NotFoundException } from '@nestjs/common';
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

  async createPartner(tenantId: string, name: string, percentage: number, capitalAmount: number = 0) {
    return await this.db
      .insertInto('import_partners')
      .values({
        tenant_id: tenantId,
        name,
        profit_share_percentage: percentage,
        capital_amount: capitalAmount
      })
      .returningAll()
      .executeTakeFirstOrThrow();
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
      return await this.db
        .deleteFrom('import_partners')
        .where('tenant_id', '=', tenantId)
        .where('id', '=', id)
        .execute();
    } catch (error: any) {
      if (error.code === '23503') { // PostgreSQL foreign_key_violation
        throw new import('@nestjs/common').BadRequestException('لا يمكن حذف الشريك لوجود عمليات مالية أو أرباح مسجلة باسمه.');
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
        'import_shipment_items.created_at',
        'products.name as product_name',
      ])
      .where('import_shipment_items.tenant_id', '=', tenantId)
      .where('import_shipment_items.shipment_id', '=', id)
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

  async updateShipmentCosts(tenantId: string, shipmentId: string, dto: UpdateShipmentCostsDto) {
    let updatePayload: any = {};
    if (dto.shippingCostUsd !== undefined) updatePayload.shipping_cost_usd = dto.shippingCostUsd;
    if (dto.customsCostEgp !== undefined) updatePayload.customs_cost_egp = dto.customsCostEgp;
    if (dto.internalTransportCostEgp !== undefined) updatePayload.internal_transport_cost_egp = dto.internalTransportCostEgp;
    if (dto.exchangeRateAtArrival !== undefined) updatePayload.exchange_rate_at_arrival = dto.exchangeRateAtArrival;
    if (dto.status !== undefined) updatePayload.status = dto.status;

    if (Object.keys(updatePayload).length > 0) {
      await this.db
        .updateTable('import_shipments')
        .set(updatePayload)
        .where('tenant_id', '=', tenantId)
        .where('id', '=', shipmentId)
        .execute();
    }
      
    await this.calculateLandedCost(tenantId, shipmentId);
    
    // If status changed to Arrived, update inventory and cost
    if (dto.status === 'Arrived') {
      await this.postShipmentToInventory(tenantId, shipmentId);
    }
    
    return await this.getShipmentById(tenantId, shipmentId);
  }

  private async postShipmentToInventory(tenantId: string, shipmentId: string) {
    const items = await this.db
      .selectFrom('import_shipment_items')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('shipment_id', '=', shipmentId)
      .execute();

    for (const item of items) {
      // Update product stock and cost_price
      await this.db
        .updateTable('products')
        .set((eb) => ({
          stock_qty: sql`${eb.ref('stock_qty')} + ${item.quantity}`,
          cost_price: Number(item.landed_cost_egp)
        }))
        .where('tenant_id', '=', tenantId)
        .where('id', '=', Number(item.product_id))
        .execute();
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
      const unitOverheadEgp = qty > 0 ? itemOverheadEgp / qty : 0;
      
      const unitBaseEgp = unitUsd * rate;
      const unitLandedEgp = unitBaseEgp + unitOverheadEgp;

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
        type: 'OUT',
        amount: amount,
        category: 'expense',
        reference_id: partnerId,
        reference_type: 'partner_payout',
        notes: `صرف أرباح الشريك: ${partner.name}`,
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
        
      return { success: true };
    });
  }
}

