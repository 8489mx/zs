import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/browser', () => ({
  escapeHtml: (str: string) => str,
  printHtmlDocument: vi.fn(),
}));

import { buildKitchenTicketDocument, getKitchenTicketStyles } from './kitchen';

describe('Kitchen Ticket Printing (KOT)', () => {
  const baseSale = {
    docNo: 'Z-261020-0005',
    orderType: 'dine_in',
    tableNumber: '12',
    waiterName: 'أحمد النجار',
    items: [
      {
        name: 'برجر دجاج كلاسيك',
        nameEn: 'Classic Chicken Burger',
        qty: 2,
        notes: 'بدون بصل، زيادة جبن',
      },
      {
        name: 'بطاطس مقلية',
        nameEn: 'French Fries',
        qty: 1,
        notes: 'مقرمش زيادة',
      },
      {
        name: 'كشري مصري',
        qty: 1,
      },
    ],
    note: 'طلب مستعجل، بدون بصل',
  };

  it('renders dual language items by default or in dual mode', () => {
    const html = buildKitchenTicketDocument(baseSale as any, {
      posKitchenLanguage: 'dual',
    } as any);

    // English item name displayed prominently
    expect(html).toContain('Classic Chicken Burger');
    expect(html).toContain('French Fries');
    // Arabic item name also displayed
    expect(html).toContain('برجر دجاج كلاسيك');
    expect(html).toContain('بطاطس مقلية');
    // Bilingual notes translated
    expect(html).toContain('NO ONION');
    expect(html).toContain('EXTRA CHEESE');
    expect(html).toContain('EXTRA CRISPY');
  });

  it('renders English-focused ticket when posKitchenLanguage is en', () => {
    const html = buildKitchenTicketDocument(baseSale as any, {
      posKitchenLanguage: 'en',
    } as any);

    expect(html).toContain('Classic Chicken Burger');
    expect(html).toContain('kitchen-item-en');
    // Translates note to English bracket tag
    expect(html).toContain('[NO ONION]');
    expect(html).toContain('[EXTRA CHEESE]');
  });

  it('renders Arabic-only when posKitchenLanguage is ar', () => {
    const html = buildKitchenTicketDocument(baseSale as any, {
      posKitchenLanguage: 'ar',
    } as any);

    expect(html).toContain('برجر دجاج كلاسيك');
    expect(html).not.toContain('kitchen-item-en');
    expect(html).toContain('بدون بصل، زيادة جبن');
  });

  it('renders styles including bilingual kitchen CSS classes', () => {
    const styles = getKitchenTicketStyles();
    expect(styles).toContain('.kitchen-item-en');
    expect(styles).toContain('.kitchen-item-ar');
    expect(styles).toContain('.kitchen-tag-pill');
  });
});
