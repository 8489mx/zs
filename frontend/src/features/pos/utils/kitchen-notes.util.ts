/**
 * Kitchen Bilingual Notes & Operational Tags Utility
 * Standardized for restaurant kitchen workflows in Kuwait and GCC.
 * Facilitates clear communication between Arabic-speaking cashiers/waiters
 * and multilingual (English/Asian) kitchen staff.
 */

export interface KitchenTag {
  ar: string;
  en: string;
}

export interface KitchenTagCategory {
  id: string;
  labelAr: string;
  labelEn: string;
  tags: KitchenTag[];
}

export const KITCHEN_TAG_CATEGORIES: KitchenTagCategory[] = [
  {
    id: 'exclusions',
    labelAr: 'المكونات والاستبعاد',
    labelEn: 'Exclusions & Inclusions',
    tags: [
      { ar: 'بدون بصل', en: 'NO ONION' },
      { ar: 'بدون طماطم', en: 'NO TOMATO' },
      { ar: 'بدون مخلل', en: 'NO PICKLES' },
      { ar: 'بدون مايونيز', en: 'NO MAYO' },
      { ar: 'بدون خس', en: 'NO LETTUCE' },
      { ar: 'بدون ثوم', en: 'NO GARLIC' },
      { ar: 'بدون خضار', en: 'NO VEGGIES' },
    ],
  },
  {
    id: 'spiciness',
    labelAr: 'الحرارة والتتبيل',
    labelEn: 'Spiciness & Seasoning',
    tags: [
      { ar: 'حار (سبايسي)', en: 'SPICY' },
      { ar: 'بارد (بدون شطة)', en: 'MILD / NO SPICY' },
      { ar: 'شطة زيادة', en: 'EXTRA SPICY' },
      { ar: 'ملح قليل', en: 'LESS SALT' },
    ],
  },
  {
    id: 'sauces',
    labelAr: 'الصوصات والإضافات',
    labelEn: 'Sauces & Extras',
    tags: [
      { ar: 'زيادة جبن', en: 'EXTRA CHEESE' },
      { ar: 'زيادة صوص', en: 'EXTRA SAUCE' },
      { ar: 'صوص جانبي', en: 'SAUCE ON SIDE' },
      { ar: 'بدون صوص', en: 'NO SAUCE' },
      { ar: 'كاتشب زيادة', en: 'EXTRA KETCHUP' },
    ],
  },
  {
    id: 'cooking',
    labelAr: 'درجة الطهي والتجهيز',
    labelEn: 'Cooking & Preparation',
    tags: [
      { ar: 'تسوية كاملة', en: 'WELL DONE' },
      { ar: 'نصف تسوية', en: 'MEDIUM' },
      { ar: 'مقرمش زيادة', en: 'EXTRA CRISPY' },
      { ar: 'محمص', en: 'TOASTED' },
      { ar: 'بدون زيت', en: 'NO OIL' },
    ],
  },
  {
    id: 'beverages',
    labelAr: 'المشروبات والحلويات',
    labelEn: 'Beverages & Sweets',
    tags: [
      { ar: 'بدون سكر', en: 'NO SUGAR' },
      { ar: 'سكر زيادة', en: 'EXTRA SUGAR' },
      { ar: 'سكر قليل', en: 'LESS SUGAR' },
      { ar: 'سكر دايت', en: 'DIET SUGAR' },
      { ar: 'بدون ثلج', en: 'NO ICE' },
      { ar: 'ثلج زيادة', en: 'EXTRA ICE' },
      { ar: 'حليب قليل الدسم', en: 'LOW FAT MILK' },
    ],
  },
  {
    id: 'packaging',
    labelAr: 'التعبئة والتقديم',
    labelEn: 'Packaging & Serving',
    tags: [
      { ar: 'سفري محكم', en: 'TAKEAWAY PACKING' },
      { ar: 'تقديم فوري', en: 'SERVE FIRST' },
      { ar: 'مع الطبق الرئيسي', en: 'WITH MAIN COURSE' },
    ],
  },
];

// Flat lookup map for instant O(1) matching
const ALL_TAGS: KitchenTag[] = KITCHEN_TAG_CATEGORIES.flatMap((c) => c.tags);

/**
 * Extracts or resolves the English name for an item.
 * Checks explicit nameEn / name_en fields first, then inspects parentheses / slashes in the name.
 */
export function resolveItemEnglishName(item?: {
  name?: string | null;
  nameEn?: string | null;
  name_en?: string | null;
  englishName?: string | null;
}): string | null {
  if (!item) return null;
  const explicit = String(item.nameEn || item.name_en || item.englishName || '').trim();
  if (explicit && /[a-zA-Z]/.test(explicit)) return explicit;

  const rawName = String(item.name || '').trim();
  if (!rawName) return null;

  // Pattern: "برجر دجاج (Chicken Burger)"
  const parenMatch = rawName.match(/\(([^)]*[a-zA-Z]{2,}[^)]*)\)/);
  if (parenMatch) return parenMatch[1].trim();

  // Pattern: "برجر دجاج / Chicken Burger" or "برجر دجاج - Chicken Burger"
  const slashMatch = rawName.match(/[\/|\-]\s*([a-zA-Z\s]{2,})$/);
  if (slashMatch) return slashMatch[1].trim();

  // If the whole name is already in English
  if (/^[A-Za-z0-9\s\-_.,()#&]+$/.test(rawName) && /[a-zA-Z]/.test(rawName)) {
    return rawName;
  }

  return null;
}

/**
 * Translates and formats kitchen notes so multilingual kitchen staff can read them.
 * Mode:
 * - 'dual': Shows both Arabic and English (e.g. "بدون بصل [NO ONION]")
 * - 'en': Prioritizes English for foreign kitchen staff (e.g. "[NO ONION]")
 * - 'ar': Arabic only
 */
export function formatKitchenNote(
  noteText?: string | null,
  mode: 'dual' | 'en' | 'ar' = 'dual',
): string {
  if (!noteText) return '';
  const trimmed = String(noteText).trim();
  if (!trimmed) return '';

  if (mode === 'ar') return trimmed;

  let result = trimmed;

  // Replace recognized Arabic tags with bilingual or English equivalents
  for (const tag of ALL_TAGS) {
    const cleanAr = tag.ar.replace(/[()]/g, '\\$&');
    const regex = new RegExp(`\\b${cleanAr}\\b|${cleanAr}`, 'gi');

    if (regex.test(result)) {
      if (mode === 'en') {
        result = result.replace(regex, `[${tag.en}]`);
      } else {
        // Dual mode: Keep Arabic and append English tag if not already present
        if (!result.includes(tag.en)) {
          result = result.replace(regex, `${tag.ar} [${tag.en}]`);
        }
      }
    }
  }

  // Clean up any double brackets or weird spacing
  result = result.replace(/\s+/g, ' ').trim();
  return result;
}
