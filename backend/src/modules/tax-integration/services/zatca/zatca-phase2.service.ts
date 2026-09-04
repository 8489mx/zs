import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { KYSELY_DB } from '../../../../database/database.constants';
import { Kysely } from 'kysely';
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
}

@Injectable()
export class ZatcaPhase2Service {
  private readonly logger = new Logger(ZatcaPhase2Service.name);

  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly taxSettings: TaxSettingsService
  ) {}

  /**
   * Build complete ZATCA Phase 2 invoice payload from sale ID
   */
  async buildZatcaInvoice(tenantId: string, saleId: number): Promise<ZatcaPhase2Result> {
    const settings = await this.taxSettings.getSettings(tenantId, 'ZATCA_SAUDI');
    
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
        total
      };
    });

    const calculatedSubtotal = lineItems.reduce((acc, l) => acc + l.subtotal, 0);
    const calculatedVat = lineItems.reduce((acc, l) => acc + l.vatAmount, 0);
    const calculatedTotal = Number((calculatedSubtotal + calculatedVat).toFixed(2));

    const invoiceData: ZatcaInvoiceData = {
      invoiceNumber: sale.doc_no || `INV-${sale.id}`,
      uuid: crypto.randomUUID(),
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
        district: 'العليا'
      },
      customerName: sale.customer_name || customer?.name || 'عميل نقدي',
      customerVatNumber: customer?.tax_number || undefined,
      customerAddress: {
        street: customer?.address || 'الرياض',
        city: 'الرياض',
        postalCode: '12211'
      },
      lineItems,
      subtotal: calculatedSubtotal,
      vatTotal: Number(calculatedVat.toFixed(2)),
      totalWithVat: calculatedTotal,
      previousInvoiceHash: 'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMjRiMWUxMDhkNDQ3ZjhlNzY1ZmVhNGU3NDkyNDQ1NQ==',
      invoiceCounterValue: sale.id
    };

    return this.generateZatcaPackage(invoiceData);
  }

  /**
   * Generates UBL 2.1 XML, SHA-256 hash, and Phase 2 TLV QR
   */
  generateZatcaPackage(data: ZatcaInvoiceData): ZatcaPhase2Result {
    // 1. Generate XML
    const ublXml = this.buildUblXml(data);

    // 2. Compute Invoice SHA-256 Hash
    const invoiceHash = this.computeSha256(ublXml);

    // 3. Generate ECDSA Keypair and Cryptographic Stamp
    const { signature, publicKey } = this.generateCryptographicStamp(invoiceHash);

    // 4. Generate Phase 2 QR Code (TLV with 8 tags)
    const qrCodeBase64 = this.generatePhase2TlvQr({
      sellerName: data.sellerName,
      vatNumber: data.sellerVatNumber,
      timestamp: `${data.issueDate}T${data.issueTime}Z`,
      totalWithVat: data.totalWithVat.toFixed(2),
      vatTotal: data.vatTotal.toFixed(2),
      invoiceHash,
      signature,
      publicKey
    });

    return {
      ublXml,
      invoiceHash,
      qrCodeBase64,
      digitalSignature: signature,
      publicKey
    };
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
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
    <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
    <cbc:ID>${data.invoiceNumber}</cbc:ID>
    <cbc:UUID>${data.uuid}</cbc:UUID>
    <cbc:IssueDate>${data.issueDate}</cbc:IssueDate>
    <cbc:IssueTime>${data.issueTime}</cbc:IssueTime>
    <cbc:InvoiceTypeCode name="${typeCode}">388</cbc:InvoiceTypeCode>
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
   * Generates ECDSA signature and public key for cryptographic stamp
   */
  generateCryptographicStamp(invoiceHash: string): { signature: string; publicKey: string } {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    const signer = crypto.createSign('SHA256');
    signer.update(invoiceHash);
    signer.end();
    const signature = signer.sign(privateKey, 'base64');

    const cleanPubKey = publicKey
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .replace(/\s+/g, '');

    return { signature, publicKey: cleanPubKey };
  }

  /**
   * Generates ZATCA Phase 2 TLV Encoded QR Code (Tags 1 through 8)
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
    const tlvParts: Buffer[] = [
      this.encodeTlvTag(1, Buffer.from(params.sellerName, 'utf8')),
      this.encodeTlvTag(2, Buffer.from(params.vatNumber, 'utf8')),
      this.encodeTlvTag(3, Buffer.from(params.timestamp, 'utf8')),
      this.encodeTlvTag(4, Buffer.from(params.totalWithVat, 'utf8')),
      this.encodeTlvTag(5, Buffer.from(params.vatTotal, 'utf8')),
      this.encodeTlvTag(6, Buffer.from(params.invoiceHash, 'utf8')),
      this.encodeTlvTag(7, Buffer.from(params.signature, 'utf8')),
      this.encodeTlvTag(8, Buffer.from(params.publicKey, 'utf8'))
    ];

    const combined = Buffer.concat(tlvParts);
    return combined.toString('base64');
  }

  private encodeTlvTag(tag: number, valueBuffer: Buffer): Buffer {
    const tagBuffer = Buffer.from([tag]);
    const lengthBuffer = Buffer.from([valueBuffer.length]);
    return Buffer.concat([tagBuffer, lengthBuffer, valueBuffer]);
  }

  /**
   * ZATCA Invoice Compliance Pre-Validation
   */
  validateCompliance(data: Partial<ZatcaInvoiceData>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.sellerVatNumber || !/^3\d{13}3$/.test(data.sellerVatNumber)) {
      errors.push('الرقم الضريبي للمنشأة غير مطابق لمعايير زاتكا (يجب أن يبدأ وينتهي بـ 3 ومكون من 15 خانة)');
    }

    if (!data.totalWithVat || data.totalWithVat <= 0) {
      errors.push('إجمالي الفاتورة غير صالح');
    }

    if (!data.lineItems || data.lineItems.length === 0) {
      errors.push('الفاتورة لا تحتوي على أي بنود');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
