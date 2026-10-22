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
      deliveryFee: 0,
      note: ' آجل ',
      paidAmount: 0,
      tenderedAmount: 0,
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

  it('preserves fractional unit conversion in all POS payloads for accurate stock deduction', () => {
    const input = {
      cart: [{ ...cart[0], qty: 4, price: 12.5, unitMultiplier: 0.5 }],
      customerId: '',
      paymentType: 'cash' as const,
      paymentChannel: 'cash' as const,
      discount: 0,
      deliveryFee: 0,
      note: '',
      paidAmount: 50,
      tenderedAmount: 50,
      payments: [{ paymentChannel: 'cash' as const, amount: 50 }],
      taxRate: 0,
      pricesIncludeTax: false,
      expectedTotal: 50,
    };
    for (const build of [buildPosSalePayload, buildLegacyPosSalePayload, buildMinimalPosSalePayload]) {
      expect((build(input) as any).items[0].unitMultiplier).toBe(0.5);
    }
  });

  it('rejects a credit sale before submit when no customer is selected', () => {
    expect(() => validatePosSaleInput({
      cart,
      customerId: '',
      paymentType: 'credit',
      paymentChannel: 'credit',
      discount: 0,
      deliveryFee: 0,
      note: '',
      paidAmount: 0,
      tenderedAmount: 0,
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
      deliveryFee: 0,
      note: '',
      paidAmount: 25,
      tenderedAmount: 25,
      payments: [{ paymentChannel: 'cash', amount: 25 }],
      taxRate: 0,
      pricesIncludeTax: false,
      expectedTotal: 25,
    })).toThrow('لا يمكن استخدام قناة آجل مع بيع نقدي');
  });

  it('carries the storefront order id on every payload builder (O62)', () => {
    const input = {
      cart,
      customerId: '7',
      paymentType: 'cash' as const,
      paymentChannel: 'cash' as const,
      discount: 5,
      deliveryFee: 0,
      note: '',
      paidAmount: 20,
      tenderedAmount: 20,
      payments: [{ paymentChannel: 'cash' as const, amount: 20 }],
      taxRate: 0,
      pricesIncludeTax: false,
      expectedTotal: 20,
      onlineOrderId: 41,
    };

    // The discount belongs to the storefront order, so the server must know which order it is;
    // without this the cashier is asked for a manager PIN (or the discount is lost).
    for (const build of [buildPosSalePayload, buildLegacyPosSalePayload, buildMinimalPosSalePayload]) {
      expect((build(input) as { onlineOrderId?: number }).onlineOrderId).toBe(41);
    }

    const withoutOrder = { ...input, onlineOrderId: undefined };
    for (const build of [buildPosSalePayload, buildLegacyPosSalePayload, buildMinimalPosSalePayload]) {
      expect('onlineOrderId' in (build(withoutOrder) as object)).toBe(false);
    }
  });
});
