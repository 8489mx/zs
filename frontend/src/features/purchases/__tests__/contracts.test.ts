import { expect, test, describe } from 'vitest';
import { buildPurchasePayload, PurchaseDraftItem } from '../contracts';

describe('Purchase Contracts - buildPurchasePayload', () => {
  const defaultValues = {
    supplierId: 1,
    paymentType: 'credit' as const,
    branchId: null,
    locationId: null,
    note: '',
    requiredDate: '2026-07-15T00:00:00.000Z',
    currency: 'EGP',
    companyName: '',
    contactId: null,
    shippingAddressId: null,
    costCenterId: null,
    projectId: null,
    termsTemplate: '',
    discount: 0,
  };

  test('should retain locationId and categoryId in items', () => {
    const items: PurchaseDraftItem[] = [
      {
        productId: '10',
        name: 'زيت كريستال',
        qty: 5,
        cost: 100,
        total: 500,
        unitName: 'Piece',
        unitMultiplier: 1,
        locationId: 5, // المخزن المختار يدويًا
        categoryId: 2,
      }
    ];

    const payload = buildPurchasePayload(defaultValues, items, 14, false);
    
    expect(payload.items[0].locationId).toBe(5);
    expect(payload.items[0].categoryId).toBe(2);
  });

  test('should map undefined locationId and categoryId to undefined (no unintended 0, NaN, or null)', () => {
    const items: PurchaseDraftItem[] = [
      {
        productId: '11',
        name: 'صنف بدون مخزن',
        qty: 1,
        cost: 50,
        total: 50,
        unitName: 'Piece',
        unitMultiplier: 1,
      }
    ];

    const payload = buildPurchasePayload(defaultValues, items, 14, false);
    
    expect(payload.items[0].locationId).toBeUndefined();
    expect(payload.items[0].categoryId).toBeUndefined();
  });
  
  test('should parse string locationId and categoryId to numbers', () => {
    const items: PurchaseDraftItem[] = [
      {
        productId: '12',
        name: 'صنف',
        qty: 1,
        cost: 50,
        total: 50,
        unitName: 'Piece',
        unitMultiplier: 1,
        locationId: '100',
        categoryId: '200',
      }
    ];

    const payload = buildPurchasePayload(defaultValues, items, 14, false);
    
    expect(payload.items[0].locationId).toBe(100);
    expect(payload.items[0].categoryId).toBe(200);
  });
});
