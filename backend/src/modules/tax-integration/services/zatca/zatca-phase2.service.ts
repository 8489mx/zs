import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { KYSELY_DB } from '../../../../database/database.constants';
import { Kysely, sql } from 'kysely';
import { Database } from '../../../../database/database.types';
import { TaxSettingsService } from '../tax-settings/tax-settings.service';

export interface ZatcaInvoiceData {
  invoiceNumber: string;
  uuid: string;
  issueDate: string; // YYYY-MM-DD
  issueTime: string; // HH:mm:ss
  invoiceType: 'simplified' | 'standard';
  sellerName: string;
  sellerVatNumber: string;
  sellerAddress: {
    street: string;
    buildingNumber: string;
    city: string;
    postalCode: string;
    district: string;
  };
  customerName: string;
  customerVatNumber?: string;
  customerAddress?: {
    street: string;
    city: string;
    postalCode?: string;
  };
  lineItems: Array<{
    id: number | string;
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    vatAmount: number;
    vatRate: number; // e.g. 15
    total: number;
  }>;
  subtotal: number;
  vatTotal: number;
  totalWithVat: number;
  previousInvoiceHash?: string;
  invoiceCounterValue?: number;
}

export interface ZatcaPhase2Result {
  ublXml: string;
  invoiceHash: string; // SHA-256 Base64
  qrCodeBase64: string; // Phase 2 TLV Base64
  digitalSignature: string; // ECDSA signature Base64
  publicKey: string; // Base64
  uuid: string;
  icv: number;
  previousHash: string;
}

@Injectable()
export class ZatcaPhase2Service {
  private readonly logger = new Logger(ZatcaPhase2Service.name);

  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly taxSettings: TaxSettingsService,
  ) {}

  /**
   * Synchronous ZATCA package builder from pre-assembled ZatcaInvoiceData
   * Used by tests and direct invoice processing without DB round-trip
   */
  generateZatcaPackage(data: ZatcaInvoiceData): Omit<ZatcaPhase2Result, 'icv' | 'previousHash'> & { icv: number; previousHash: string } {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const ublXml = this.buildUblXml(data);
    const invoiceHash = this.computeSha256(ublXml);
    const signature = this.signWithKey(invoiceHash, privateKey);

    const qrCodeBase64 = this.generatePhase2TlvQr({
      sellerName: data.sellerName,
      vatNumber: data.sellerVatNumber,
      timestamp: `${data.issueDate}T${data.issueTime}Z`,
      totalWithVat: data.totalWithVat.toFixed(2),
      vatTotal: data.vatTotal.toFixed(2),
      invoiceHash,
      signature,
      publicKey,
    });

    return {
      ublXml,
      invoiceHash,
      qrCodeBase64,
      digitalSignature: signature,
      publicKey,
      uuid: data.uuid,
      icv: data.invoiceCounterValue || 1,
      previousHash: data.previousInvoiceHash || '',
    };
  }

  /**
   * Builds complete ZATCA Phase 2 compliant invoice with dynamic cryptographic PIH chaining
   * Atomic Transaction + Row-level lock (FOR UPDATE) guarantees zero ICV collision or gap
   */
  async buildZatcaInvoice(tenantId: string, saleId: number, egsId?: string | number): Promise<ZatcaPhase2Result> {
    const settings = await this.taxSettings.getSettings(tenantId, 'ZATCA_SAUDI');
    
    return await this.db.transaction().execute(async (trx) => {
      const sale = await trx
        .selectFrom('sales')
        .selectAll()
        .where('id', '=', saleId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirstOrThrow();

      const items = await trx
        .selectFrom('sale_items')
        .selectAll()
        .where('sale_id', '=', saleId)
        .execute();

      const customer = sale.customer_id
        ? await trx
            .selectFrom('customers')
            .selectAll()
            .where('id', '=', Number(sale.customer_id))
            .where('tenant_id', '=', tenantId)
            .executeTakeFirst()
        : null;

      // 1. Fetch or initialize EGS Unit with row-level lock (.forUpdate()) for sequential ICV & PIH guarantee
      let egs = egsId
        ? await trx
            .selectFrom('zatca_egs_units')
            .selectAll()
            .where('id', '=', String(egsId) as any)
            .where('tenant_id', '=', tenantId)
            .forUpdate()
            .executeTakeFirst()
        : await trx
            .selectFrom('zatca_egs_units')
            .selectAll()
            .where('tenant_id', '=', tenantId)
            .where((eb) => eb.or([
              eb('status', '=', 'production_active'),
              eb('status', '=', 'compliance_passed'),
              eb('status', '=', 'unregistered'),
            ]))
            .orderBy('id', 'asc')
            .forUpdate()
            .executeTakeFirst();

      // Auto-create default EGS unit if none exists
      if (!egs) {
        const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
          namedCurve: 'prime256v1',
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });

        const newUnit = await trx
          .insertInto('zatca_egs_units')
          .values({
            tenant_id: tenantId,
            branch_id: sale.branch_id ? Number(sale.branch_id) : 1,
            device_uuid: crypto.randomUUID(),
            device_name: 'Main POS Unit 01',
            custom_id: 'POS-01',
            private_key_pem: privateKey,
            public_key_pem: publicKey,
            status: 'production_active',
            environment: settings?.environment === 'production' ? 'production' : 'sandbox',
            last_icv: 0,
            last_invoice_hash: 'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMjRiMWUxMDhkNDQ3ZjhlNzY1ZmVhNGU3NDkyNDQ1NQ==',
          } as any)
          .returningAll()
          .executeTakeFirstOrThrow();

        egs = newUnit;
      }

      const nextIcv = Number(egs.last_icv || 0) + 1;
      const previousInvoiceHash = egs.last_invoice_hash || 'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMjRiMWUxMDhkNDQ3ZjhlNzY1ZmVhNGU3NDkyNDQ1NQ==';
      const invoiceUuid = crypto.randomUUID();

      const saleDate = new Date(sale.created_at || Date.now());
      const issueDate = saleDate.toISOString().split('T')[0];
      const issueTime = saleDate.toTimeString().split(' ')[0];

      const isB2B = Boolean(customer?.tax_number);
      const invoiceType = isB2B ? 'standard' : 'simplified';
      const vatRate = 15; // KSA 15% standard VAT

      const lineItems = items.map((item, idx) => {
        const qty = Math.max(1, Number(item.qty || 1));
        const unitPrice = Number(item.unit_price || 0);
        const subtotal = Number(item.line_total || qty * unitPrice);
        const vatAmount = Number(((subtotal * vatRate) / 100).toFixed(2));
        const total = Number((subtotal + vatAmount).toFixed(2));

        return {
          id: idx + 1,
          name: item.product_name || `Item ${idx + 1}`,
          quantity: qty,
          unitPrice,
          subtotal,
          vatAmount,
          vatRate,
          total,
        };
      });

      const calculatedSubtotal = lineItems.reduce((acc, l) => acc + l.subtotal, 0);
      const calculatedVat = lineItems.reduce((acc, l) => acc + l.vatAmount, 0);
      const calculatedTotal = Number((calculatedSubtotal + calculatedVat).toFixed(2));

      const invoiceData: ZatcaInvoiceData = {
        invoiceNumber: sale.doc_no || `INV-${sale.id}`,
        uuid: invoiceUuid,
        issueDate,
        issueTime,
        invoiceType,
        sellerName: 'مؤسسة التجارة والخدمات السحابية',
        sellerVatNumber: settings?.tax_id || '300000000000003',
        sellerAddress: {
          street: 'شارع الملك فهد',
          buildingNumber: '1234',
          city: 'الرياض',
          postalCode: '12211',
          district: 'العليا',
        },
        customerName: sale.customer_name || customer?.name || 'عميل نقدي',
        customerVatNumber: customer?.tax_number || undefined,
        customerAddress: {
          street: customer?.address || 'الرياض',
          city: 'الرياض',
          postalCode: '12211',
        },
        lineItems,
        subtotal: calculatedSubtotal,
        vatTotal: Number(calculatedVat.toFixed(2)),
        totalWithVat: calculatedTotal,
        previousInvoiceHash,
        invoiceCounterValue: nextIcv,
      };

      // 2. Generate XML, SHA-256 Hash and Signature using EGS Private Key
      const ublXml = this.buildUblXml(invoiceData);
      const invoiceHash = this.computeSha256(ublXml);
      const signature = this.signWithKey(invoiceHash, egs.private_key_pem);
      const publicKey = egs.public_key_pem;

      // 3. Generate Phase 2 QR Code (TLV with 8 tags)
      const qrCodeBase64 = this.generatePhase2TlvQr({
        sellerName: invoiceData.sellerName,
        vatNumber: invoiceData.sellerVatNumber,
        timestamp: `${invoiceData.issueDate}T${invoiceData.issueTime}Z`,
        totalWithVat: invoiceData.totalWithVat.toFixed(2),
        vatTotal: invoiceData.vatTotal.toFixed(2),
        invoiceHash,
        signature,
        publicKey,
      });

      // 4. Update EGS unit with next ICV and new hash to advance the chain
      await trx
        .updateTable('zatca_egs_units')
        .set({
          last_icv: nextIcv,
          last_invoice_hash: invoiceHash,
          updated_at: new Date(),
        })
        .where('id', '=', egs.id)
        .execute();

      // 5. Save ZATCA audit details on the sale record
      await trx
        .updateTable('sales')
        .set({
          zatca_uuid: invoiceUuid,
          zatca_hash: invoiceHash,
          zatca_prev_hash: previousInvoiceHash,
          zatca_icv: nextIcv,
          zatca_status: 'reported',
          zatca_qr: qrCodeBase64,
          zatca_ubl_xml: ublXml,
        } as any)
        .where('id', '=', sale.id)
        .execute();

      return {
        ublXml,
        invoiceHash,
        qrCodeBase64,
        digitalSignature: signature,
        publicKey,
        uuid: invoiceUuid,
        icv: nextIcv,
        previousHash: previousInvoiceHash,
      };
    });
  }

  /**
   * Generates ZATCA UBL 2.1 Compliant XML
   */
  buildUblXml(data: ZatcaInvoiceData): string {
    const typeCode = data.invoiceType === 'simplified' ? '0200000' : '0100000';

    const linesXml = data.lineItems.map(item => `
    <cac:InvoiceLine>
        <cbc:ID>${item.id}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="PCE">${item.quantity}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="SAR">${item.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
        <cac:TaxTotal>
            <cbc:TaxAmount currencyID="SAR">${item.vatAmount.toFixed(2)}</cbc:TaxAmount>
            <cbc:RoundingAmount currencyID="SAR">${item.total.toFixed(2)}</cbc:RoundingAmount>
            <cac:TaxSubtotal>
                <cbc:TaxableAmount currencyID="SAR">${item.subtotal.toFixed(2)}</cbc:TaxableAmount>
                <cbc:TaxAmount currencyID="SAR">${item.vatAmount.toFixed(2)}</cbc:TaxAmount>
                <cac:TaxCategory>
                    <cbc:ID>S</cbc:ID>
                    <cbc:Percent>${item.vatRate.toFixed(2)}</cbc:Percent>
                    <cac:TaxScheme>
                        <cbc:ID>VAT</cbc:ID>
                    </cac:TaxScheme>
                </cac:TaxCategory>
            </cac:TaxSubtotal>
        </cac:TaxTotal>
        <cac:Item>
            <cbc:Name><![CDATA[${item.name}]]></cbc:Name>
            <cac:ClassifiedTaxCategory>
                <cbc:ID>S</cbc:ID>
                <cbc:Percent>${item.vatRate.toFixed(2)}</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:ClassifiedTaxCategory>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="SAR">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>`).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
    <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
    <cbc:ID>${data.invoiceNumber}</cbc:ID>
    <cbc:UUID>${data.uuid}</cbc:UUID>
    <cbc:IssueDate>${data.issueDate}</cbc:IssueDate>
    <cbc:IssueTime>${data.issueTime}</cbc:IssueTime>
    <cbc:InvoiceTypeCode name="${typeCode}">${data.invoiceType === 'simplified' ? '388' : '388'}</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
    <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
    <cac:AdditionalDocumentReference>
        <cbc:ID>ICV</cbc:ID>
        <cbc:UUID>${data.invoiceCounterValue || 1}</cbc:UUID>
    </cac:AdditionalDocumentReference>
    <cac:AdditionalDocumentReference>
        <cbc:ID>PIH</cbc:ID>
        <cac:Attachment>
            <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${data.previousInvoiceHash || ''}</cbc:EmbeddedDocumentBinaryObject>
        </cac:Attachment>
    </cac:AdditionalDocumentReference>
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="CRN">1010010101</cbc:ID>
            </cac:PartyIdentification>
            <cac:PostalAddress>
                <cbc:StreetName><![CDATA[${data.sellerAddress.street}]]></cbc:StreetName>
                <cbc:BuildingNumber>${data.sellerAddress.buildingNumber}</cbc:BuildingNumber>
                <cbc:CityName><![CDATA[${data.sellerAddress.city}]]></cbc:CityName>
                <cbc:PostalZone>${data.sellerAddress.postalCode}</cbc:PostalZone>
                <cbc:CountrySubentity><![CDATA[${data.sellerAddress.district}]]></cbc:CountrySubentity>
                <cac:Country>
                    <cbc:IdentificationCode>SA</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${data.sellerVatNumber}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName><![CDATA[${data.sellerName}]]></cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PostalAddress>
                <cbc:StreetName><![CDATA[${data.customerAddress?.street || 'الرياض'}]]></cbc:StreetName>
                <cbc:CityName><![CDATA[${data.customerAddress?.city || 'الرياض'}]]></cbc:CityName>
                <cac:Country>
                    <cbc:IdentificationCode>SA</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${data.customerVatNumber || '000000000000000'}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName><![CDATA[${data.customerName}]]></cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingCustomerParty>
    <cac:Delivery>
        <cbc:ActualDeliveryDate>${data.issueDate}</cbc:ActualDeliveryDate>
    </cac:Delivery>
    <cac:PaymentMeans>
        <cbc:PaymentMeansCode>10</cbc:PaymentMeansCode>
    </cac:PaymentMeans>
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="SAR">${data.vatTotal.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="SAR">${data.subtotal.toFixed(2)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="SAR">${data.vatTotal.toFixed(2)}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cbc:ID>S</cbc:ID>
                <cbc:Percent>15.00</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="SAR">${data.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="SAR">${data.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="SAR">${data.totalWithVat.toFixed(2)}</cbc:TaxInclusiveAmount>
        <cbc:AllowanceTotalAmount currencyID="SAR">0.00</cbc:AllowanceTotalAmount>
        <cbc:PayableAmount currencyID="SAR">${data.totalWithVat.toFixed(2)}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
${linesXml}
</Invoice>`;
  }

  /**
   * Computes SHA-256 hash of invoice XML
   */
  computeSha256(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('base64');
  }

  /**
   * Signs SHA-256 hash with ECDSA private key
   */
  signWithKey(invoiceHash: string, privateKeyPem: string): string {
    const signer = crypto.createSign('SHA256');
    signer.update(invoiceHash);
    signer.end();
    return signer.sign(privateKeyPem, 'base64');
  }

  /**
   * Generates Phase 2 TLV QR Code (Tags 1 to 8)
   */
  generatePhase2TlvQr(params: {
    sellerName: string;
    vatNumber: string;
    timestamp: string;
    totalWithVat: string;
    vatTotal: string;
    invoiceHash: string;
    signature: string;
    publicKey: string;
  }): string {
    const buffers: Buffer[] = [
      this.toTlv(1, Buffer.from(params.sellerName, 'utf8')),
      this.toTlv(2, Buffer.from(params.vatNumber, 'utf8')),
      this.toTlv(3, Buffer.from(params.timestamp, 'utf8')),
      this.toTlv(4, Buffer.from(params.totalWithVat, 'utf8')),
      this.toTlv(5, Buffer.from(params.vatTotal, 'utf8')),
      this.toTlv(6, Buffer.from(params.invoiceHash, 'utf8')),
      this.toTlv(7, Buffer.from(params.signature, 'utf8')),
      this.toTlv(8, Buffer.from(params.publicKey, 'utf8')),
    ];

    return Buffer.concat(buffers).toString('base64');
  }

  private toTlv(tagNum: number, valueBuffer: Buffer): Buffer {
    const tag = Buffer.from([tagNum]);
    const len = Buffer.from([valueBuffer.length]);
    return Buffer.concat([tag, len, valueBuffer]);
  }

  /**
   * Basic client-side validation helper for ZATCA invoice compliance checks
   */
  validateCompliance(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data) {
      return { valid: false, errors: ['لا توجد بيانات للتحقق'] };
    }

    if (!data.sellerVatNumber || String(data.sellerVatNumber).length !== 15) {
      errors.push('رقم ضريبة البائع يجب أن يكون 15 خانة');
    }
    if (!data.invoiceNumber) {
      errors.push('رقم الفاتورة مطلوب');
    }
    if (!data.issueDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.issueDate)) {
      errors.push('تاريخ الإصدار يجب أن يكون بصيغة YYYY-MM-DD');
    }
    if (!data.lineItems || !Array.isArray(data.lineItems) || data.lineItems.length === 0) {
      errors.push('يجب أن تحتوي الفاتورة على بند واحد على الأقل');
    }
    if (data.totalWithVat === undefined || data.totalWithVat < 0) {
      errors.push('الإجمالي شامل الضريبة يجب أن يكون قيمة موجبة');
    }

    return { valid: errors.length === 0, errors };
  }
}
