import { Injectable, Inject } from '@nestjs/common';
import { KYSELY_DB } from '../../../../database/database.constants';
import { Kysely } from 'kysely';
import { Database } from '../../../../database/database.types';
import { TaxSettingsService } from '../tax-settings/tax-settings.service';

@Injectable()
export class EtaSerializerService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly taxSettings: TaxSettingsService
  ) {}

  async serializeSaleToEtaFormat(tenantId: string, saleId: number): Promise<any> {
    const settings = await this.taxSettings.getSettings(tenantId, 'ETA_EGYPT');
    if (!settings) throw new Error('ETA Settings not configured');

    const sale = await this.db
      .selectFrom('sales')
      .selectAll()
      .where('id', '=', saleId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirstOrThrow();

    const items = await this.db
      .selectFrom('sale_items')
      .selectAll()
      .where('sale_id', '=', saleId)
      .execute();

    // ToDo: Map sale and items to ETA JSON Schema structure
    // This involves grouping taxes, mapping GS1/EGS codes, and formatting dates

    const etaDocument = {
      issuer: {
        type: 'B',
        id: settings.tax_id,
        name: 'Issuer Company Name',
        address: { /* branch address */ }
      },
      receiver: {
        type: 'P',
        id: sale.customer_id ? 'Customer_Tax_Or_National_ID' : '',
        name: sale.customer_name || 'Cash Customer',
        address: { /* customer address */ }
      },
      documentType: 'I',
      documentTypeVersion: '1.0',
      dateTimeIssued: new Date().toISOString(),
      taxpayerActivityCode: '4620',
      internalID: sale.doc_no || sale.id.toString(),
      invoiceLines: items.map(item => ({
        description: item.product_name,
        itemType: 'GS1', // should be fetched from product.tax_code_type
        itemCode: '100000', // should be fetched from product.tax_code
        unitType: 'EA',
        quantity: item.qty,
        internalCode: item.product_id?.toString() || '0',
        salesTotal: item.line_total,
        total: item.line_total,
        valueDifference: 0,
        totalTaxableFees: 0,
        netTotal: item.line_total,
        itemsDiscount: 0,
        unitValue: {
          currencySold: 'EGP',
          amountEGP: item.unit_price
        },
        discount: { rate: 0, amount: 0 },
        taxableItems: []
      })),
      totalDiscountAmount: sale.discount,
      totalSalesAmount: sale.subtotal,
      netAmount: sale.subtotal,
      taxTotals: [],
      totalAmount: sale.total,
      extraDiscountAmount: 0,
      totalItemsDiscountAmount: 0
    };

    return etaDocument;
  }
}
