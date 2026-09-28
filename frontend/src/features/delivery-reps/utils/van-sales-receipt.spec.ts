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
});
