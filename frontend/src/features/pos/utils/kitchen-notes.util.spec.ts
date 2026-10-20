import { describe, it, expect } from 'vitest';
import {
  resolveItemEnglishName,
  formatKitchenNote,
  KITCHEN_TAG_CATEGORIES,
} from './kitchen-notes.util';

describe('Kitchen Bilingual Notes Utility', () => {
  describe('resolveItemEnglishName', () => {
    it('returns explicit nameEn when available', () => {
      const item = { name: 'برجر دجاج كلاسيك', nameEn: 'Classic Chicken Burger' };
      expect(resolveItemEnglishName(item)).toBe('Classic Chicken Burger');
    });

    it('returns explicit name_en when available', () => {
      const item = { name: 'شاورما لحم', name_en: 'Beef Shawarma' };
      expect(resolveItemEnglishName(item)).toBe('Beef Shawarma');
    });

    it('extracts English name from parentheses', () => {
      const item = { name: 'بيتزا مارجريتا (Margherita Pizza)' };
      expect(resolveItemEnglishName(item)).toBe('Margherita Pizza');
    });

    it('extracts English name from slash suffix', () => {
      const item = { name: 'عصير برتقال طازج / Fresh Orange Juice' };
      expect(resolveItemEnglishName(item)).toBe('Fresh Orange Juice');
    });

    it('returns rawName if name is completely English', () => {
      const item = { name: 'Double Cheese Burger' };
      expect(resolveItemEnglishName(item)).toBe('Double Cheese Burger');
    });

    it('returns null if no English characters exist in name', () => {
      const item = { name: 'فتوش مقلي' };
      expect(resolveItemEnglishName(item)).toBeNull();
    });
  });

  describe('formatKitchenNote', () => {
    it('formats recognized tags in dual mode with English brackets', () => {
      const note = 'بدون بصل، زيادة جبن';
      const formatted = formatKitchenNote(note, 'dual');
      expect(formatted).toContain('بدون بصل [NO ONION]');
      expect(formatted).toContain('زيادة جبن [EXTRA CHEESE]');
    });

    it('formats recognized tags in en mode replacing Arabic with English brackets', () => {
      const note = 'بدون بصل، حار (سبايسي)';
      const formatted = formatKitchenNote(note, 'en');
      expect(formatted).toContain('[NO ONION]');
      expect(formatted).toContain('[SPICY]');
      expect(formatted).not.toContain('بدون بصل');
    });

    it('preserves raw text in ar mode', () => {
      const note = 'بدون بصل، شطة زيادة';
      const formatted = formatKitchenNote(note, 'ar');
      expect(formatted).toBe('بدون بصل، شطة زيادة');
    });

    it('does not duplicate English tag if already present in note', () => {
      const note = 'بدون بصل (NO ONION)';
      const formatted = formatKitchenNote(note, 'dual');
      expect(formatted).toBe('بدون بصل (NO ONION)');
    });

    it('handles empty or null note safely', () => {
      expect(formatKitchenNote('')).toBe('');
      expect(formatKitchenNote(null)).toBe('');
      expect(formatKitchenNote(undefined)).toBe('');
    });
  });

  describe('KITCHEN_TAG_CATEGORIES', () => {
    it('contains all essential kitchen operational categories', () => {
      const ids = KITCHEN_TAG_CATEGORIES.map((c) => c.id);
      expect(ids).toContain('exclusions');
      expect(ids).toContain('spiciness');
      expect(ids).toContain('sauces');
      expect(ids).toContain('cooking');
      expect(ids).toContain('beverages');
      expect(ids).toContain('packaging');
    });
  });
});
