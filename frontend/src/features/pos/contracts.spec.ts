import { describe, expect, it } from 'vitest';
import { buildLegacyPosSalePayload, buildMinimalPosSalePayload, buildPosSalePayload, validatePosSaleInput } from './contracts';
import type { PosItem } from '@/features/pos/types/pos.types';

const cart: PosItem[] = [
  {
    productId: '1',
    name: 'صنف اختبار',
    qty: 1,
    price: 25,
    costPrice: 20,
    unitName: 'قطعة',
    unitId: 'unit-1',
    unitMultiplier: 1,
    priceType: 'retail',
    lineKey: '1::قطعة::retail',
    stockLimit: 100,
    currentStock: 100,
    minStock: 0,
  },
];

describe('POS sale contracts', () => {
  it('keeps selected customer id on all credit-sale payload builders', () => {
    const input = {
      cart,
      customerId: ' 77 ',
      paymentType: 'credit' as const,
      paymentChannel: 'credit' as const,
      discount: 0,
      note: ' آجل ',
      paidAmount: 0,
      payments: [],
      taxRate: 0,
      pricesIncludeTax: false,
      expectedTotal: 25,
      branchId: '1',
      locationId: '2',
    };

    expect(buildPosSalePayload(input)).toMatchObject({
      customerId: '77',
      paymentType: 'credit',
      paymentChannel: 'credit',
      payments: [],
    });
    expect(buildLegacyPosSalePayload(input)).toMatchObject({
      customerId: '77',
      paymentType: 'credit',
      paymentChannel: 'credit',
    });
    expect(buildMinimalPosSalePayload(input)).toMatchObject({
      customerId: '77',
      paymentType: 'credit',
    });
  });

  it('rejects a credit sale before submit when no customer is selected', () => {
    expect(() => validatePosSaleInput({
      cart,
      customerId: '',
      paymentType: 'credit',
      paymentChannel: 'credit',
      discount: 0,
      note: '',
      paidAmount: 0,
      payments: [],
      taxRate: 0,
      pricesIncludeTax: false,
      expectedTotal: 25,
    })).toThrow('اختر العميل أولًا في حالة البيع الآجل');
  });

  it('rejects accidental credit channel on cash sale', () => {
    expect(() => validatePosSaleInput({
      cart,
      customerId: '',
      paymentType: 'cash',
      paymentChannel: 'credit',
      discount: 0,
      note: '',
      paidAmount: 25,
      payments: [{ paymentChannel: 'cash', amount: 25 }],
      taxRate: 0,
      pricesIncludeTax: false,
      expectedTotal: 25,
    })).toThrow('لا يمكن استخدام قناة آجل مع بيع نقدي');
  });
});
