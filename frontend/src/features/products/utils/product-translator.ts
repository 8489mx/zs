/**
 * Smart Product Name Translator Utility
 * Provides fast bidirectional translation between English and Arabic for ERP product items.
 * Uses a built-in instant retail dictionary + fallback to online translation when connected.
 */

// Core retail & FMCG dictionary: English (lowercase) -> Arabic
const EN_TO_AR_DICT: Record<string, string> = {
  // Dairy & Grocery
  milk: 'حليب',
  'fresh milk': 'حليب طازج',
  'full cream milk': 'حليب كامل الدسم',
  'low fat milk': 'حليب قليل الدسم',
  'skimmed milk': 'حليب خالي الدسم',
  'powder milk': 'حليب مجفف',
  cheese: 'جبنة',
  'cheddar cheese': 'جبنة شيدر',
  'mozzarella cheese': 'جبنة موزاريلا',
  mozzarella: 'موزاريلا',
  cheddar: 'شيدر',
  feta: 'فيتا',
  'feta cheese': 'جبنة فيتا',
  butter: 'زبدة',
  yogurt: 'زبادي',
  cream: 'قشطة',
  egg: 'بيض',
  eggs: 'بيض',
  bread: 'خبز',
  toast: 'توست',
  'sliced bread': 'خبز توست',
  water: 'مياه',
  'mineral water': 'مياه معدنية',
  juice: 'عصير',
  'orange juice': 'عصير برتقال',
  'apple juice': 'عصير تفاح',
  'mango juice': 'عصير مانجو',
  tea: 'شاي',
  'black tea': 'شاي أسود',
  'green tea': 'شاي أخضر',
  coffee: 'قهوة',
  espresso: 'إسبريسو',
  nescafe: 'نسكافيه',
  sugar: 'سكر',
  salt: 'ملح',
  oil: 'زيت',
  'cooking oil': 'زيت طهي',
  'olive oil': 'زيت زيتون',
  'corn oil': 'زيت ذرة',
  'sunflower oil': 'زيت عباد الشمس',
  rice: 'أرز',
  'basmati rice': 'أرز بسمتي',
  'egyptian rice': 'أرز مصري',
  pasta: 'مكرونة',
  macaroni: 'مكرونة',
  spaghetti: 'سباجيتي',
  flour: 'دقيق',
  sauce: 'صلصة',
  'tomato sauce': 'صلصة طماطم',
  'tomato paste': 'معجون طماطم',
  ketchup: 'كاتشب',
  mayonnaise: 'مايونيز',
  tuna: 'تونة',
  sardine: 'سردين',
  meat: 'لحم',
  beef: 'لحم بقري',
  chicken: 'دجاج',
  fish: 'سمك',
  apple: 'تفاح',
  banana: 'موز',
  orange: 'برتقال',
  lemon: 'ليمون',
  tomato: 'طماطم',
  potato: 'بطاطس',
  onion: 'بصل',
  garlic: 'ثوم',
  cucumber: 'خيار',
  chocolate: 'شوكولاتة',
  biscuit: 'بسكويت',
  biscuits: 'بسكويت',
  chips: 'شيبسي',
  crisps: 'شيبسي',
  candy: 'حلوى',
  sweets: 'حلويات',
  gum: 'علكة',
  'ice cream': 'آيس كريم',
  cake: 'كيك',
  croissant: 'كرواسون',
  honey: 'عسل',
  jam: 'مربى',

  // Beverages & Brands
  soda: 'مشروب غازي',
  'soft drink': 'مشروب غازي',
  cola: 'كولا',
  pepsi: 'بيبسي',
  'coca cola': 'كوكاكولا',
  coke: 'كوكاكولا',
  '7up': 'سفن أب',
  sprite: 'سبرايت',
  fanta: 'فانتا',
  mirinda: 'ميرندا',
  'red bull': 'ريد بول',
  almarai: 'المراعي',
  juhayna: 'جهينة',
  danone: 'دانون',
  nestle: 'نستله',
  lipton: 'ليبتون',
  nivea: 'نيفيا',
  dove: 'دوف',
  lux: 'لوكس',

  // Personal Care & Household
  soap: 'صابون',
  'liquid soap': 'صابون سائل',
  'hand soap': 'صابون يدين',
  shampoo: 'شامبو',
  conditioner: 'بلسم',
  'hair conditioner': 'بلسم شعر',
  'shower gel': 'جل استحمام',
  toothpaste: 'معجون أسنان',
  toothbrush: 'فرشاة أسنان',
  perfume: 'عطر',
  cologne: 'كولونيا',
  deodorant: 'مزيل عرق',
  tissue: 'مناديل',
  tissues: 'مناديل',
  'wet wipes': 'مناديل مبللة',
  detergent: 'مسحوق غسيل',
  'washing powder': 'مسحوق غسيل',
  'dish soap': 'سائل غسيل صحون',
  sponge: 'إسفنجة',
  bleach: 'كلور',
  cleaner: 'منظف',
  disinfectant: 'مطهر',

  // Electronics & Mobile Accessories
  phone: 'هاتف',
  mobile: 'جوال',
  smartphone: 'هاتف ذكي',
  iphone: 'آيفون',
  samsung: 'سامسونج',
  charger: 'شاحن',
  'fast charger': 'شاحن سريع',
  'wall charger': 'شاحن جداري',
  'car charger': 'شاحن سيارة',
  'wireless charger': 'شاحن لاسلكي',
  cable: 'كابل',
  'usb cable': 'كابل يو إس بي',
  'type-c cable': 'كابل تايب سي',
  'type c cable': 'كابل تايب سي',
  'lightning cable': 'كابل لايتنينج',
  'power bank': 'باور بانك',
  headphones: 'سماعات',
  headphone: 'سماعة',
  earbuds: 'سماعات أذن',
  headset: 'سماعة رأس',
  'bluetooth speaker': 'سماعة بلوتوث',
  speaker: 'سماعة',
  'screen protector': 'لاصقة حماية شاشة',
  case: 'جراب',
  'phone case': 'جراب هاتف',
  cover: 'كفر',
  battery: 'بطارية',
  adapter: 'محول',
  laptop: 'لابتوب',
  mouse: 'ماوس',
  keyboard: 'لوحة مفاتيح',
  'flash drive': 'فلاشة',
  'memory card': 'كارت ميموري',
  'smart watch': 'ساعة ذكية',
  watch: 'ساعة',

  // Fashion & Apparel
  shirt: 'قميص',
  't-shirt': 'تيشيرت',
  tshirt: 'تيشيرت',
  'polo shirt': 'قميص بولو',
  pants: 'بنطلون',
  trousers: 'بنطلون',
  jeans: 'جينز',
  shorts: 'شورت',
  jacket: 'جاكيت',
  coat: 'معطف',
  hoodie: 'هودي',
  sweatshirt: 'سويت شيرت',
  sweater: 'بلوفر',
  suit: 'بدلة',
  dress: 'فستان',
  skirt: 'تنورة',
  shoes: 'حذاء',
  sneakers: 'حذاء رياضي',
  sandals: 'صندل',
  slippers: 'شبشب',
  socks: 'جوارب',
  belt: 'حزام',
  cap: 'كاب',
  hat: 'قبعة',
  bag: 'حقيبة',
  backpack: 'حقيبة ظهر',
  wallet: 'محفظة',

  // Units, Attributes & Qualifiers
  small: 'صغير',
  medium: 'وسط',
  large: 'كبير',
  xl: 'إكس لارج',
  xxl: '2 إكس لارج',
  black: 'أسود',
  white: 'أبيض',
  red: 'أحمر',
  blue: 'أزرق',
  green: 'أخضر',
  yellow: 'أصفر',
  gray: 'رمادي',
  grey: 'رمادي',
  silver: 'فضي',
  gold: 'ذهبي',
  golden: 'ذهبي',
  pack: 'عبوة',
  box: 'علبة',
  can: 'كانز',
  bottle: 'زجاجة',
  piece: 'قطعة',
  kg: 'كجم',
  g: 'جرام',
  gm: 'جرام',
  liter: 'لتر',
  litre: 'لتر',
  l: 'لتر',
  ml: 'مل',
};

// Build reverse dictionary: Arabic -> English
const AR_TO_EN_DICT: Record<string, string> = {};
for (const [en, ar] of Object.entries(EN_TO_AR_DICT)) {
  if (!AR_TO_EN_DICT[ar]) {
    // Format English nicely: capitalize words
    const capitalized = en
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    AR_TO_EN_DICT[ar] = capitalized;
  }
}

// Memory cache for fetched translations
const translationCache = new Map<string, string>();

/**
 * Synchronous dictionary translation (0ms execution, perfect for onChange/onBlur/onSubmit)
 */
export function syncTranslateProductEnToAr(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // 1. Direct match
  if (EN_TO_AR_DICT[lower]) {
    return EN_TO_AR_DICT[lower];
  }

  // 2. Cache match
  const cacheKey = `en_ar:${lower}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // 3. Multi-word composite lookup (e.g. "Almarai Milk 1L")
  const tokens = trimmed.split(/(\s+|[-_/])/);
  let hasTranslation = false;
  const translatedTokens = tokens.map((tok) => {
    const cleanTok = tok.trim().toLowerCase();
    if (!cleanTok) return tok;

    // Check unit patterns: "1L" -> "1 لتر", "500ml" -> "500 مل", "1kg" -> "1 كجم", "250g" -> "250 جرام"
    const unitMatch = cleanTok.match(/^(\d+(?:\.\d+)?)(l|litre|liter|ml|kg|g|gm)$/i);
    if (unitMatch) {
      const num = unitMatch[1];
      const unit = unitMatch[2].toLowerCase();
      const arUnit = unit === 'l' || unit === 'liter' || unit === 'litre' ? 'لتر'
        : unit === 'ml' ? 'مل'
        : unit === 'kg' ? 'كجم'
        : 'جرام';
      hasTranslation = true;
      return `${num} ${arUnit}`;
    }

    if (EN_TO_AR_DICT[cleanTok]) {
      hasTranslation = true;
      return EN_TO_AR_DICT[cleanTok];
    }
    return tok;
  });

  if (hasTranslation) {
    return translatedTokens.join('');
  }

  return '';
}

/**
 * Synchronous dictionary translation Arabic -> English
 */
export function syncTranslateProductArToEn(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();

  // 1. Direct match
  if (AR_TO_EN_DICT[trimmed]) {
    return AR_TO_EN_DICT[trimmed];
  }

  // 2. Cache match
  const cacheKey = `ar_en:${trimmed}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // 3. Multi-word composite lookup
  const words = trimmed.split(/\s+/);
  let hasTranslation = false;
  const translatedWords = words.map((w) => {
    if (AR_TO_EN_DICT[w]) {
      hasTranslation = true;
      return AR_TO_EN_DICT[w];
    }
    return w;
  });

  if (hasTranslation) {
    return translatedWords.join(' ');
  }

  return '';
}

/**
 * Async Smart Translation with Online Fallback (MyMemory API)
 */
export async function translateProductEnToAr(text: string): Promise<string> {
  const syncResult = syncTranslateProductEnToAr(text);
  if (syncResult && syncResult !== text) {
    return syncResult;
  }

  const trimmed = text.trim();
  if (!trimmed) return '';

  const cacheKey = `en_ar:${trimmed.toLowerCase()}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // Online fallback with 1.5s timeout
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=en|ar`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const translation = data?.responseData?.translatedText;
      if (translation && typeof translation === 'string' && !translation.includes('MYMEMORY WARNING')) {
        translationCache.set(cacheKey, translation.trim());
        return translation.trim();
      }
    }
  } catch {
    // Network timeout or offline - gracefully fall back
  }

  return syncResult || trimmed;
}

/**
 * Async Smart Translation Arabic -> English with Online Fallback
 */
export async function translateProductArToEn(text: string): Promise<string> {
  const syncResult = syncTranslateProductArToEn(text);
  if (syncResult && syncResult !== text) {
    return syncResult;
  }

  const trimmed = text.trim();
  if (!trimmed) return '';

  const cacheKey = `ar_en:${trimmed}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // Online fallback with 1.5s timeout
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=ar|en`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const translation = data?.responseData?.translatedText;
      if (translation && typeof translation === 'string' && !translation.includes('MYMEMORY WARNING')) {
        // Capitalize words
        const formatted = translation
          .trim()
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        translationCache.set(cacheKey, formatted);
        return formatted;
      }
    }
  } catch {
    // Network timeout or offline - gracefully fall back
  }

  return syncResult || trimmed;
}
