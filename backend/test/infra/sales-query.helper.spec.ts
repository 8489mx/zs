import { mapSaleRows } from '../../src/modules/sales/helpers/sales-query.helper';
import { describe, expect, it } from 'vitest';

describe('SalesQueryHelper', () => {
  describe('mapSaleRows', () => {
    it('should map tenderedAmount and changeAmount correctly', () => {
      const sales = [
        {
          id: 1,
          total: 40.50,
          paid_amount: 40.50,
          tendered_amount: 100.00,
          change_amount: 59.50,
        },
      ];
      
      const mapped = mapSaleRows(sales, [], []);
      
      expect(mapped[0]).toMatchObject({
        id: '1',
        total: 40.50,
        paidAmount: 40.50,
        tenderedAmount: 100.00,
        changeAmount: 59.50,
      });
    });

    it('should fallback to 0 if tenderedAmount or changeAmount is missing', () => {
      const sales = [
        {
          id: 2,
          total: 40.50,
          paid_amount: 40.50,
        },
      ];
      
      const mapped = mapSaleRows(sales, [], []);
      
      expect(mapped[0]).toMatchObject({
        id: '2',
        total: 40.50,
        paidAmount: 40.50,
        tenderedAmount: 0,
        changeAmount: 0,
      });
    });
  });
});
