import { Injectable, NotFoundException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { Inject } from '@nestjs/common';
import { KYSELY_DB } from '../../database/database.constants';
import { CreateShipmentDto, UpdateShipmentCostsDto, AddShipmentItemDto } from './dto/import-sales.dto';

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

  async createPartner(tenantId: string, name: string, percentage: number) {
    return await this.db
      .insertInto('import_partners')
      .values({
        tenant_id: tenantId,
        name,
        profit_share_percentage: percentage
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async deletePartner(tenantId: string, id: string) {
    return await this.db
      .deleteFrom('import_partners')
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id)
      .execute();
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
      return {
        partnerId: p.id,
        name: p.name,
        percentage,
        shareAmount
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
}
