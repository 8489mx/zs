import { describe, expect, it } from 'vitest';
import { detectReturnsAnomalies } from './returns-anomaly-detector';
import type { ReturnRecord, Sale } from '@/types/domain';

describe('detectReturnsAnomalies', () => {
  it('detects rapid instant returns under 15 minutes', () => {
    const saleDate = '2026-08-27T10:00:00.000Z';
    const returnDate = '2026-08-27T10:04:00.000Z'; // 4 minutes later

    const sales: Sale[] = [
      {
        id: 's1',
        docNo: 'INV-1001',
        customerId: 'walk-in',
        customerName: 'عميل نقدي',
        paymentType: 'cash',
        paymentChannel: 'cash',
        subTotal: 500,
        discount: 0,
        taxRate: 0,
        taxAmount: 0,
        pricesIncludeTax: true,
        total: 500,
        paidAmount: 500,
        tenderedAmount: 500,
        changeAmount: 0,
        status: 'posted',
        note: '',
        createdBy: 'كاشير 1',
        branchId: '1',
        branchName: 'الفرع الرئيسي',
        locationId: '1',
        locationName: 'المخزن الرئيسي',
        date: saleDate,
        items: [],
      }
    ];

    const returns: ReturnRecord[] = [
      {
        id: 'ret1',
        docNo: 'RET-001',
        invoiceId: 's1',
        invoiceDocNo: 'INV-1001',
        productName: 'صنف تجريبي',
        qty: 1,
        total: 500,
        note: '',
        createdAt: returnDate,
        returnType: 'sale',
        refundMethod: 'cash',
        createdBy: 'كاشير 1',
        createdByName: 'كاشير 1',
      }
    ];

    const report = detectReturnsAnomalies(returns, sales);

    expect(report.totalRapidReturnsCount).toBe(1);
    expect(report.totalSuspectReturnsCount).toBe(1);
    expect(report.analyzedRecords[0].timeGapMinutes).toBe(4);
    expect(report.analyzedRecords[0].flags.some((f) => f.id === 'rapid_return')).toBe(true);
    expect(report.cashierMetrics[0].rapidReturnsCount).toBe(1);
  });
});
