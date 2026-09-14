import { describe, expect, it } from 'vitest';
import { getNextSequentialStyleCode, getStyleCodeSequenceStart } from './style-code.utils';
import type { Product } from '@/types/domain';

describe('style-code.utils', () => {
  it('should return 1001 as the starting sequence number when no products exist', () => {
    expect(getStyleCodeSequenceStart()).toBe(1001);
    expect(getNextSequentialStyleCode([])).toBe('1001');
  });

  it('should return 1001 when all existing products have style codes <= 1000', () => {
    const products = [
      { id: '1', styleCode: '10' },
      { id: '2', styleCode: '100' },
      { id: '3', styleCode: '500' },
      { id: '4', styleCode: '1000' },
    ] as unknown as Product[];

    expect(getNextSequentialStyleCode(products)).toBe('1001');
  });

  it('should return next sequential code when products exist > 1000', () => {
    const products = [
      { id: '1', styleCode: '1001' },
      { id: '2', styleCode: '1005' },
    ] as unknown as Product[];

    expect(getNextSequentialStyleCode(products)).toBe('1006');
  });

  it('should ignore non-numeric style codes', () => {
    const products = [
      { id: '1', styleCode: 'SHIRT-BLUE' },
      { id: '2', styleCode: '1002' },
    ] as unknown as Product[];

    expect(getNextSequentialStyleCode(products)).toBe('1003');
  });
});
