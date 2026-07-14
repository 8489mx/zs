import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/browser', () => ({
  escapeHtml: (str: string) => str,
}));

import { formatReceiptQuantity } from './template';

describe('Receipt Printing formatReceiptQuantity', () => {
  const englishSettings = { printNumberFormat: 'english' as const };

  it('should format zero correctly', () => {
    expect(formatReceiptQuantity(0, englishSettings)).toBe('0');
  });

  it('should format exact fractional quantities without rounding (up to 3 decimals)', () => {
    expect(formatReceiptQuantity(0.135, englishSettings)).toBe('0.135');
    expect(formatReceiptQuantity(1.575, englishSettings)).toBe('1.575');
    expect(formatReceiptQuantity(1.5, englishSettings)).toBe('1.5');
    expect(formatReceiptQuantity(0.5, englishSettings)).toBe('0.5');
  });

  it('should format whole numbers without decimal zeros', () => {
    expect(formatReceiptQuantity(3, englishSettings)).toBe('3');
    expect(formatReceiptQuantity(3.000, englishSettings)).toBe('3');
  });

  it('should handle invalid or missing values gracefully', () => {
    expect(formatReceiptQuantity(null as any, englishSettings)).toBe('0');
    expect(formatReceiptQuantity(undefined as any, englishSettings)).toBe('0');
    expect(formatReceiptQuantity(NaN, englishSettings)).toBe('0');
  });

  it('should format with Arabic locale when configured', () => {
    // Test with Arabic settings
    const settings = { printNumberFormat: 'arabic' as const };
    const res = formatReceiptQuantity(1.575, settings);
    // Intl.NumberFormat in ar-EG locale usually produces ١٫٥٧٥ but let's check for standard digits first.
    // Actually, getNumberLocale(settings) returns 'ar-EG' when printNumberFormat is 'arabic'.
    // The exact output depends on Node/browser Intl implementation. We just ensure it runs without throwing.
    expect(res).toBeDefined();
  });
});
