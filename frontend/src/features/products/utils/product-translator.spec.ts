import { describe, it, expect } from 'vitest';
import {
  syncTranslateProductEnToAr,
  syncTranslateProductArToEn,
  translateProductEnToAr,
  translateProductArToEn
} from './product-translator';

describe('product-translator', () => {
  it('translates MILK to Arabic accurately', () => {
    expect(syncTranslateProductEnToAr('MILK')).toBe('حليب');
    expect(syncTranslateProductEnToAr('milk')).toBe('حليب');
  });

  it('translates common grocery items synchronously', () => {
    expect(syncTranslateProductEnToAr('bread')).toBe('خبز');
    expect(syncTranslateProductEnToAr('water')).toBe('مياه');
    expect(syncTranslateProductEnToAr('cheese')).toBe('جبنة');
    expect(syncTranslateProductEnToAr('eggs')).toBe('بيض');
    expect(syncTranslateProductEnToAr('tea')).toBe('شاي');
    expect(syncTranslateProductEnToAr('sugar')).toBe('سكر');
  });

  it('translates electronics and accessories synchronously', () => {
    expect(syncTranslateProductEnToAr('phone')).toBe('هاتف');
    expect(syncTranslateProductEnToAr('charger')).toBe('شاحن');
    expect(syncTranslateProductEnToAr('cable')).toBe('كابل');
    expect(syncTranslateProductEnToAr('battery')).toBe('بطارية');
  });

  it('translates Arabic to English accurately', () => {
    expect(syncTranslateProductArToEn('حليب')).toBe('Milk');
    expect(syncTranslateProductArToEn('خبز')).toBe('Bread');
    expect(syncTranslateProductArToEn('مياه')).toBe('Water');
    expect(syncTranslateProductArToEn('قهوة')).toBe('Coffee');
    expect(syncTranslateProductArToEn('شاي')).toBe('Tea');
  });

  it('handles multi-word products and units', () => {
    const res = syncTranslateProductEnToAr('Almarai Milk 1L');
    expect(res).toContain('حليب');
    expect(res).toContain('المراعي');
    expect(res).toContain('1 لتر');
  });

  it('async translation works and falls back gracefully', async () => {
    const res = await translateProductEnToAr('milk');
    expect(res).toBe('حليب');

    const arRes = await translateProductArToEn('حليب');
    expect(arRes).toBe('Milk');
  });
});
