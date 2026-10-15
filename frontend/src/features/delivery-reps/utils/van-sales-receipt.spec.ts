import { describe, it, expect } from 'vitest';
import {
  buildVanSaleThermalReceiptHtml,
  formatVanSaleShareMessage,
  VanSaleReceiptData,
} from './van-sales-receipt.utils';

describe('Van Sales Receipt Utilities', () => {
  const sampleReceipt: VanSaleReceiptData = {
    docNo: 'VAN-260928-64989',
    saleId: 101,
    total: 450,
    paymentMethod: 'credit',
    customerName: 'م. حازم عبد الصمد',
    customerCode: 'CUST-009',
    customerPhone: '01012345678',
    repName: 'سيد محمد',
    vehiclePlate: 'س ط أ 1234',
    packagingBreakdown: {
      cartonsCount: 1,
      piecesCount: 3,
      itemsCount: 3,
    },
    items: [
      { productId: 1, name: 'شاي العروسة 250جم', qty: 1, unitPrice: 50, lineTotal: 50 },
      { productId: 2, name: 'سكر أبيض 1كجم', qty: 2, unitPrice: 200, lineTotal: 400 },
    ],
    date: '2026-09-28T14:38:00.000Z',
  };

  it('builds valid 80mm thermal receipt html with all fields and barcode', () => {
    const html = buildVanSaleThermalReceiptHtml(sampleReceipt, {
      storeName: 'شركة التوزيع المتحدة',
      currency: 'ج.م',
    });

    expect(html).toContain('شركة التوزيع المتحدة');
    expect(html).toContain('VAN-260928-64989');
    expect(html).toContain('م. حازم عبد الصمد');
    expect(html).toContain('CUST-009');
    expect(html).toContain('01012345678');
    expect(html).toContain('سيد محمد');
    expect(html).toContain('س ط أ 1234');
    expect(html).toContain('شاي العروسة 250جم');
    expect(html).toContain('سكر أبيض 1كجم');
    expect(html).toContain('450.00 ج.م');
    expect(html).toContain('1 كرتونة');
    expect(html).toContain('3 قطعة');
    expect(html).toContain('svg'); // barcode SVG was generated
  });

  it('handles receipt without items array gracefully using itemsCount fallback', () => {
    const receiptWithoutItems: VanSaleReceiptData = {
      docNo: 'VAN-260928-11111',
      total: 100,
      paymentMethod: 'cash',
      customerName: 'عميل نقدي سريع',
      itemsCount: 2,
    };

    const html = buildVanSaleThermalReceiptHtml(receiptWithoutItems, { currency: 'ج.م' });
    expect(html).toContain('VAN-260928-11111');
    expect(html).toContain('عميل نقدي سريع');
    expect(html).toContain('إجمالي البنود المباعة: <b>2</b>');
    expect(html).toContain('100.00 ج.م');
    expect(html).toContain('تم التحصيل نقداً');
  });

  it('escapes customer name and item names against XSS', () => {
    const dangerousReceipt: VanSaleReceiptData = {
      docNo: 'VAN-TEST',
      total: 50,
      paymentMethod: 'cash',
      customerName: '<script>alert(1)</script>',
      items: [{ productId: 5, name: '<b style="color:red">خطر</b>', qty: 1, unitPrice: 50 }],
    };

    const html = buildVanSaleThermalReceiptHtml(dangerousReceipt);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<b style="color:red">');
    expect(html).toContain('&lt;b style=');
  });

  it('formats WhatsApp sharing message accurately', () => {
    const message = formatVanSaleShareMessage(sampleReceipt, 'ج.م');
    expect(message).toContain('*فاتورة بيع مباشر (Van Sale)*');
    expect(message).toContain('VAN-260928-64989');
    expect(message).toContain('م. حازم عبد الصمد');
    expect(message).toContain('• شاي العروسة 250جم × 1 = 50.00 ج.م');
    expect(message).toContain('• سكر أبيض 1كجم × 2 = 400.00 ج.م');
    expect(message).toContain('450.00 ج.م');
  });

  it('formats WhatsApp sharing message with storeName, bonus items, and electronic payment details', () => {
    const electronicReceipt: VanSaleReceiptData = {
      docNo: 'VAN-261015-0012',
      total: 350,
      paymentMethod: 'instapay',
      transferReference: 'IP-9988221',
      customerName: 'سوبرماركت المدينة',
      customerCode: 'CUST-88',
      storeName: 'شركة الأمل لتوزيع الأغذية',
      customerTotalBalance: 1200,
      items: [
        { productId: 10, name: 'لبن جهينة 1 لتر', qty: 10, unitPrice: 35, unitName: 'كرتونة', lineTotal: 350 },
        { productId: 11, name: 'عصير برتقال هدية', qty: 1, unitPrice: 0, unitName: 'قطعة', lineTotal: 0, isBonus: true },
      ],
      packagingBreakdown: { cartonsCount: 10, piecesCount: 1, itemsCount: 2 },
    };

    const message = formatVanSaleShareMessage(electronicReceipt, { storeName: 'شركة الأمل لتوزيع الأغذية', currency: 'ج.م' });
    expect(message).toContain('*شركة الأمل لتوزيع الأغذية*');
    expect(message).toContain('VAN-261015-0012');
    expect(message).toContain('سوبرماركت المدينة');
    expect(message).toContain('[CUST-88]');
    expect(message).toContain('تحويل بنكي / إنستاباي (مرجع: IP-9988221)');
    expect(message).toContain('• لبن جهينة 1 لتر × 10 كرتونة = 350.00 ج.م');
    expect(message).toContain('• عصير برتقال هدية × 1 قطعة [بونص مجاني 0.00]');
    expect(message).toContain('*إجمالي رصيد الحساب المتبقي:* 1200.00 ج.م');
  });
});
