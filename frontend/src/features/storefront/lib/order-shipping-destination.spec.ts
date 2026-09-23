import { describe, expect, it } from 'vitest';
import { isOrderDestinedForEgypt, isOrderDestinedForGcc } from './order-shipping-destination';
import type { OnlineOrderRecord } from '../types/storefront.types';

function createMockOrder(overrides: Partial<OnlineOrderRecord> = {}): OnlineOrderRecord {
  return {
    id: 1,
    orderNumber: 'ORD-101',
    customerName: 'سيد',
    customerPhone: '01018017555',
    customerAddress: 'حلوان - القاهرة',
    customerNotes: null,
    subtotal: 1000,
    deliveryFee: 50,
    totalAmount: 1050,
    status: 'pending',
    paymentMethod: 'cod',
    saleId: null,
    createdAt: new Date().toISOString(),
    items: [],
    ...overrides,
  };
}

describe('order-shipping-destination helpers', () => {
  it('correctly identifies local Egyptian orders', () => {
    // Exact user case: Sayed, Helwan, 010...
    const egyptianOrder = createMockOrder();
    expect(isOrderDestinedForEgypt(egyptianOrder)).toBe(true);
    expect(isOrderDestinedForGcc(egyptianOrder)).toBe(false);

    // International format Egyptian phone +2011...
    const intlEgyptian = createMockOrder({ customerPhone: '+201140001234', customerAddress: 'الإسكندرية' });
    expect(isOrderDestinedForEgypt(intlEgyptian)).toBe(true);
    expect(isOrderDestinedForGcc(intlEgyptian)).toBe(false);

    // Explicit countryCode 'EG'
    const explicitEg = createMockOrder({ countryCode: 'EG', customerPhone: '01223344556' });
    expect(isOrderDestinedForEgypt(explicitEg)).toBe(true);
    expect(isOrderDestinedForGcc(explicitEg)).toBe(false);
  });

  it('correctly identifies Saudi and GCC orders', () => {
    // Saudi customer in Riyadh
    const saudiOrder = createMockOrder({
      customerName: 'فهد العتيبي',
      customerPhone: '+966501234567',
      customerAddress: 'حي الياسمين - الرياض',
      countryCode: 'SA',
    });
    expect(isOrderDestinedForEgypt(saudiOrder)).toBe(false);
    expect(isOrderDestinedForGcc(saudiOrder)).toBe(true);

    // UAE customer in Dubai
    const uaeOrder = createMockOrder({
      customerName: 'محمد الشامسي',
      customerPhone: '+971501234567',
      customerAddress: 'دبي',
      countryCode: 'AE',
    });
    expect(isOrderDestinedForEgypt(uaeOrder)).toBe(false);
    expect(isOrderDestinedForGcc(uaeOrder)).toBe(true);

    // Kuwait customer
    const kuwaitOrder = createMockOrder({
      customerName: 'خالد المطيري',
      customerPhone: '+96591234567',
      countryCode: 'KW',
    });
    expect(isOrderDestinedForEgypt(kuwaitOrder)).toBe(false);
    expect(isOrderDestinedForGcc(kuwaitOrder)).toBe(true);
  });

  it('respects existing shipment tracking numbers', () => {
    // Order already shipped with Bosta
    const bostaOrder = createMockOrder({
      bostaTrackingNumber: 'BST-998877',
      countryCode: 'SA', // even if anomalous, bosta exists
    });
    expect(isOrderDestinedForEgypt(bostaOrder)).toBe(true);

    // Order already shipped with Aramex/SMSA
    const gccOrder = createMockOrder({
      gccTrackingNumber: 'ARMX-112233',
      countryCode: 'EG',
    });
    expect(isOrderDestinedForGcc(gccOrder)).toBe(true);
  });
});
