import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatSaleForHardwarePrinter,
  getHardwarePrinterUrl,
  isHardwarePrinterAvailable,
  tryPrintViaHardware,
  resetHardwarePrinterAvailabilityCache,
} from './hardware';
import type { Sale } from '@/types/domain';

describe('Hardware POS Printing Engine', () => {
  beforeEach(() => {
    resetHardwarePrinterAvailabilityCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetHardwarePrinterAvailabilityCache();
  });

  const sampleSale: Sale = {
    id: 'sale-123',
    docNo: 'INV-261013-0001',
    date: '2026-10-13T15:00:00Z',
    customerName: 'أحمد محمود',
    createdBy: 'كاشير 1',
    branchName: 'فرع المعادي',
    paymentType: 'cash',
    paymentChannel: 'cash',
    subTotal: 150,
    total: 150,
    paidAmount: 200,
    changeAmount: 50,
    items: [
      {
        id: 'item-1',
        name: 'برجر دجاج سوبر',
        qty: 1,
        price: 100,
        total: 100,
        modifiers: [{ name: 'جبنة إضافية', price: 15 }],
      },
      {
        id: 'item-2',
        name: 'بطاطس مقلية',
        qty: 1,
        price: 35,
        total: 35,
      },
    ],
  } as any;

  it('formats sale receipt text correctly for 58mm thermal rolls', () => {
    const formatted = formatSaleForHardwarePrinter(sampleSale, {
      settings: { brandName: 'Z-Burger', phone: '0100000000', receiptWidthMm: 58 } as any,
    });

    expect(formatted).toContain('Z-Burger');
    expect(formatted).toContain('INV-261013-0001');
    expect(formatted).toContain('برجر دجاج سوبر');
    expect(formatted).toContain('+ جبنة إضافية');
    expect(formatted).toContain('بطاطس مقلية');
    expect(formatted).toContain('150.00 EGP');
    expect(formatted).toContain('المدفوع:');
    expect(formatted).toContain('المتبقي:');
    expect(formatted).toContain('شكراً لتعاملكم معنا');
  });

  it('determines the hardware printer URL with default 127.0.0.1:9100', () => {
    expect(getHardwarePrinterUrl()).toBe('http://127.0.0.1:9100/');
    expect(getHardwarePrinterUrl({ settings: { posHardwarePrinterUrl: 'http://192.168.1.100:9100/' } as any })).toBe(
      'http://192.168.1.100:9100/'
    );
  });

  it('detects available hardware printer when endpoint responds 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      })
    );

    const isAvailable = await isHardwarePrinterAvailable();
    expect(isAvailable).toBe(true);
  });

  it('returns false when hardware printer endpoint is down or times out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Connection refused'))
    );

    const isAvailable = await isHardwarePrinterAvailable();
    expect(isAvailable).toBe(false);
  });

  it('tryPrintViaHardware prints silently and returns true when hardware is online', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url, options) => {
        if (options?.method === 'OPTIONS') {
          return Promise.resolve({ ok: true, status: 200 });
        }
        if (options?.method === 'POST') {
          return Promise.resolve({ ok: true, status: 200 });
        }
        return Promise.reject(new Error('Unknown'));
      })
    );

    const success = await tryPrintViaHardware(sampleSale);
    expect(success).toBe(true);
  });

  it('tryPrintViaHardware returns false when hardware is not reachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Connection refused'))
    );

    const success = await tryPrintViaHardware(sampleSale);
    expect(success).toBe(false);
  });
});
