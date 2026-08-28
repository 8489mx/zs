import { describe, it, expect } from 'vitest';
import { generateCashDrawerSettlementReceiptHtml } from './cash-drawer-receipt';
import type { CashierShift } from '@/types/domain';

describe('generateCashDrawerSettlementReceiptHtml', () => {
  it('correctly incorporates deliveryCashIn into expected cash calculation and receipt html', () => {
    const shift: CashierShift = {
      id: '10',
      docNo: 'SHIFT-10',
      branchId: '1',
      branchName: 'الفرع الرئيسي',
      locationId: '1',
      locationName: 'نقطة 1',
      openedById: '2',
      openedByName: 'سيد',
      createdAt: '2026-08-28T22:00:00.000Z',
      closedAt: '2026-08-28T22:30:00.000Z',
      cashSalesTotal: 0,
      cardSalesTotal: 0,
      walletSalesTotal: 0,
      instapaySalesTotal: 0,
      creditSalesTotal: 0,
      deliverySalesTotal: 0,
      deliveryFeeTotal: 0,
      freelanceDeliveryFeeTotal: 0,
      storeDeliveryFeeTotal: 0,
      netStoreSalesTotal: 0,
      shiftSalesTotal: 0,
      saleCount: 0,
      mixedSalesCount: 0,
      cardOperationCount: 0,
      walletOperationCount: 0,
      instapayOperationCount: 0,
      cashDrawerMovementTotal: 1000,
      cashDrawerCashInTotal: 1000,
      cashDrawerDeliveryCashInTotal: 1000,
      cashDrawerManualCashInTotal: 0,
      cashDrawerCashOutTotal: 0,
      supplierPaymentsTotal: 0,
      expensesTotal: 0,
      serviceCashTotal: 0,
      serviceCardTotal: 0,
      serviceTotal: 0,
      saleReturnCashRefundTotal: 0,
      saleReturnCardRefundTotal: 0,
      saleReturnTotal: 0,
      openingCash: 500,
      openingNote: '',
      status: 'closed',
      expectedCash: 1500,
      countedCash: 1500,
      variance: 0,
      declaredCash: 1500,
      movementItems: [
        {
          id: 'tt-1',
          kind: 'delivery',
          kindLabel: 'تحصيل وتسوية دليفري',
          amount: 1000,
          note: 'تسوية أوردر دليفري رقم #123 من مندوب أحمد',
          createdAt: new Date().toISOString(),
        }
      ]
    };

    const html = generateCashDrawerSettlementReceiptHtml(shift, 'محل الاختبار');

    expect(html).toContain('تحصيلات مناديب دليفري');
    expect(html).toContain('1,000.00');
    expect(html).toContain('1,500.00');
  });
});
