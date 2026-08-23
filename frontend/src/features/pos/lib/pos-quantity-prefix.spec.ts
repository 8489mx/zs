import { describe, expect, it } from 'vitest';
import { parseQuantityPrefixQuery } from './pos-quantity-prefix';

describe('parseQuantityPrefixQuery', () => {
  it('parses empty or regular queries without prefix', () => {
    expect(parseQuantityPrefixQuery('')).toEqual({ hasPrefix: false, quantity: 1, cleanQuery: '' });
    expect(parseQuantityPrefixQuery('6221234567890')).toEqual({ hasPrefix: false, quantity: 1, cleanQuery: '6221234567890' });
    expect(parseQuantityPrefixQuery('اندومي')).toEqual({ hasPrefix: false, quantity: 1, cleanQuery: 'اندومي' });
  });

  it('parses plus prefix "10+barcode"', () => {
    expect(parseQuantityPrefixQuery('10+6221234567890')).toEqual({
      hasPrefix: true,
      quantity: 10,
      cleanQuery: '6221234567890',
    });
    expect(parseQuantityPrefixQuery('10+اندومي')).toEqual({
      hasPrefix: true,
      quantity: 10,
      cleanQuery: 'اندومي',
    });
  });

  it('parses multiplication prefix "10*barcode" and "10xbarcode"', () => {
    expect(parseQuantityPrefixQuery('10*6221234567890')).toEqual({
      hasPrefix: true,
      quantity: 10,
      cleanQuery: '6221234567890',
    });
    expect(parseQuantityPrefixQuery('5xشيبسي')).toEqual({
      hasPrefix: true,
      quantity: 5,
      cleanQuery: 'شيبسي',
    });
  });

  it('parses decimal quantities like "2.5*طماطم"', () => {
    expect(parseQuantityPrefixQuery('2.5*طماطم')).toEqual({
      hasPrefix: true,
      quantity: 2.5,
      cleanQuery: 'طماطم',
    });
  });

  it('parses standalone prefix awaiting barcode scan like "10+" or "10*"', () => {
    expect(parseQuantityPrefixQuery('10+')).toEqual({
      hasPrefix: true,
      quantity: 10,
      cleanQuery: '',
    });
    expect(parseQuantityPrefixQuery('10*')).toEqual({
      hasPrefix: true,
      quantity: 10,
      cleanQuery: '',
    });
  });

  it('parses suffix quantity update commands like "+10" or "*10"', () => {
    expect(parseQuantityPrefixQuery('+10')).toEqual({
      hasPrefix: true,
      quantity: 10,
      cleanQuery: '',
      isSuffixQuantityChange: true,
    });
    expect(parseQuantityPrefixQuery('*5')).toEqual({
      hasPrefix: true,
      quantity: 5,
      cleanQuery: '',
      isSuffixQuantityChange: true,
    });
  });
});
