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

    const customer = sale.customer_id
      ? await this.db
          .selectFrom('customers')
          .selectAll()
          .where('id', '=', Number(sale.customer_id))
          .where('tenant_id', '=', tenantId)
          .executeTakeFirst()
      : null;

    const isBusinessCustomer = Boolean(customer?.tax_number);
    const vatRate = 14; // Egypt standard VAT rate 14%

    const invoiceLines = items.map((item, index) => {
      const qty = Math.max(1, Number(item.qty || 1));
      const unitPrice = Number(item.unit_price || 0);
      const lineTotal = Number(item.line_total || qty * unitPrice);
      const vatAmount = Number(((lineTotal * vatRate) / 100).toFixed(2));
      const totalWithVat = Number((lineTotal + vatAmount).toFixed(2));

      return {
        description: item.product_name || `Item ${index + 1}`,
        itemType: 'EGS',
        itemCode: 'EG-' + (settings.tax_id || '100000') + '-' + (item.product_id || (index + 1)),
        unitType: 'EA',
        quantity: qty,
        internalCode: String(item.product_id || index + 1),
        salesTotal: lineTotal,
        total: totalWithVat,
        valueDifference: 0,
        totalTaxableFees: 0,
        netTotal: lineTotal,
        itemsDiscount: 0,
        unitValue: {
          currencySold: 'EGP',
          amountEGP: unitPrice,
          currencyExchangeRate: 1
        },
        discount: { rate: 0, amount: 0 },
        taxableItems: [
          {
            taxType: 'T1',
            amount: vatAmount,
            subType: 'V009',
            rate: vatRate
          }
        ]
      };
    });

    const netAmount = invoiceLines.reduce((acc, l) => acc + l.netTotal, 0);
    const totalTax = invoiceLines.reduce((acc, l) => acc + (l.taxableItems[0]?.amount || 0), 0);
    const totalAmount = Number((netAmount + totalTax).toFixed(2));

    const etaDocument = {
      issuer: {
        address: {
          branchID: '0',
          country: 'EG',
          governate: 'Cairo',
          regionCity: 'Cairo',
          street: 'Main Street',
          buildingNumber: '1'
        },
        type: 'B',
        id: String(settings.tax_id || '000000000'),
        name: 'Z-Systems Tenant Business'
      },
      receiver: {
        address: {
          country: 'EG',
          governate: 'Cairo',
          regionCity: 'Cairo',
          street: customer?.address || 'Local Street',
          buildingNumber: '1'
        },
        type: isBusinessCustomer ? 'B' : 'P',
        id: isBusinessCustomer ? String(customer?.tax_number) : (customer?.phone || ''),
        name: sale.customer_name || customer?.name || 'عميل نقدي'
      },
      documentType: 'I',
      documentTypeVersion: '1.0',
      dateTimeIssued: new Date(sale.created_at || Date.now()).toISOString(),
      taxpayerActivityCode: '4620',
      internalID: sale.doc_no || String(sale.id),
      purchaseOrderReference: '',
      purchaseOrderDescription: '',
      salesOrderReference: '',
      salesOrderDescription: '',
      proformaInvoiceNumber: '',
      payment: {
        bankName: '',
        bankAddress: '',
        bankAccountNo: '',
        bankAccountIBAN: '',
        swiftCode: '',
        terms: ''
      },
      delivery: {
        approach: '',
        packaging: '',
        dateValidity: '',
        exportPort: '',
        grossWeight: 0,
        netWeight: 0,
        terms: ''
      },
      invoiceLines,
      totalDiscountAmount: Number(sale.discount || 0),
      totalSalesAmount: netAmount,
      netAmount: netAmount,
      taxTotals: [
        {
          taxType: 'T1',
          amount: Number(totalTax.toFixed(2))
        }
      ],
      totalAmount: totalAmount,
      extraDiscountAmount: 0,
      totalItemsDiscountAmount: 0
    };

    return etaDocument;
  }
}

