import { describe, it, expect } from 'vitest';
import {
  buildVanCollectionThermalReceiptHtml,
  formatVanCollectionShareMessage,
  VanCollectionReceiptData,
} from './van-collection-receipt.utils';

describe('Van Collection Receipt Utilities', () => {
  const sampleReceipt: VanCollectionReceiptData = {
    receiptNo: 'COL-261012-0042',
    amount: 15000,
    previousBalance: 45000,
    newBalance: 30000,
    customerName: 'سوبر ماركت الإيمان',
    customerCode: 'CUST-881',
    customerPhone: '01099887766',
    customerAddress: 'حي الهرم - شارع فيصل',
    repName: 'محمد طارق',
    vehiclePlate: 'ق هـ ر 7741',
    warehouseName: 'مستودع الجيزة المركزي',
    date: '2026-10-12T15:30:00.000Z',
    notes: 'دفعة سداد حساب نقدي - استلام ميداني معتمد',
    isOffline: false,
  };

  it('builds valid 80mm thermal receipt html with all financial and customer fields', () => {
    const html = buildVanCollectionThermalReceiptHtml(sampleReceipt, {
      storeName: 'شركة النور للتجارة والتوزيع',
      currency: 'ج.م',
    });

    expect(html).toContain('شركة النور للتجارة والتوزيع');
    expect(html).toContain('COL-261012-0042');
    expect(html).toContain('سوبر ماركت الإيمان');
    expect(html).toContain('CUST-881');
    expect(html).toContain('01099887766');
    expect(html).toContain('حي الهرم - شارع فيصل');
    expect(html).toContain('محمد طارق');
    expect(html).toContain('ق هـ ر 7741');
    expect(html).toContain('15000.00 ج.م');
    expect(html).toContain('45000.00 ج.م');
    expect(html).toContain('30000.00 ج.م');
    expect(html).toContain('دفعة سداد حساب نقدي');
    expect(html).toContain('svg'); // Barcode SVG generated
  });

  it('renders offline watermark badge when receipt is captured offline', () => {
    const offlineReceipt: VanCollectionReceiptData = {
      ...sampleReceipt,
      receiptNo: 'OFFCOL-261012-0001',
      isOffline: true,
    };

    const html = buildVanCollectionThermalReceiptHtml(offlineReceipt, { currency: 'ج.م' });
    expect(html).toContain('أوفلاين');
  });

  it('formats clean WhatsApp share message with previous and remaining balances', () => {
    const message = formatVanCollectionShareMessage(sampleReceipt, 'ج.م');

    expect(message).toContain('*سند قبض نقدي رسمي معتمد*');
    expect(message).toContain('#COL-261012-0042');
    expect(message).toContain('سوبر ماركت الإيمان');
    expect(message).toContain('محمد طارق');
    expect(message).toContain('45000.00 ج.م');
    expect(message).toContain('15000.00 ج.م');
    expect(message).toContain('30000.00 ج.م');
    expect(message).toContain('دفعة سداد حساب نقدي');
  });
});
