import type { OnlineOrderRecord } from '../types/storefront.types';

const GCC_COUNTRY_CODES = new Set(['SA', 'AE', 'KW', 'QA', 'BH', 'OM']);

const EG_KEYWORDS = [
  'مصر', 'القاهرة', 'الجيزة', 'الإسكندرية', 'اسكندرية', 'حلوان', 'المعادي', 'مدينة نصر',
  'التجمع', 'أكتوبر', 'زايد', 'شبرا', 'الدقي', 'المهندسين', 'المنصورة', 'طنطا', 'الزقازيق',
  'الفيوم', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'اسوان', 'أسوان', 'بور سعيد', 'بورسعيد',
  'السويس', 'الإسماعيلية', 'اسماعيلية', 'الغربية', 'الشرقية', 'الدقهلية', 'القليوبية',
  'كفر الشيخ', 'المنوفية', 'البحيرة', 'دمياط', 'مطروح', 'بني سويف', 'المنيا'
];

const GCC_KEYWORDS = [
  'السعودية', 'الرياض', 'جدة', 'مكة', 'المدينة', 'الدمام', 'الخبر', 'تبوك', 'أبها', 'خميس مشيط',
  'بريدة', 'عنيزة', 'القصيم', 'الطائف', 'حائل', 'نجران', 'جازان', 'الهفوف', 'الجبيل', 'الإمارات',
  'دبي', 'أبوظبي', 'الشارقة', 'عجمان', 'الكويت', 'قطر', 'الدوحة', 'البحرين', 'المنامة', 'عمان', 'مسقط'
];

function cleanPhoneNumber(phone?: string | null): string {
  return String(phone || '').replace(/[^\d+]/g, '');
}

/**
 * Checks whether an order is destined for Egypt.
 * Considers explicit country code, local/international Egyptian phone numbers,
 * Egyptian governorates/cities in address/zone, and existing Bosta shipments.
 */
export function isOrderDestinedForEgypt(order: OnlineOrderRecord): boolean {
  if (order.bostaTrackingNumber || order.bostaDeliveryId) return true;

  const code = (order.countryCode || (order as any).country_code || '').toUpperCase().trim();
  if (code === 'EG') return true;
  if (GCC_COUNTRY_CODES.has(code)) return false;

  const phone = cleanPhoneNumber(order.customerPhone);
  if (phone.startsWith('+20') || phone.startsWith('0020') || phone.startsWith('201')) return true;
  if (/^01[0125]\d{8}$/.test(phone)) return true;

  if (
    phone.startsWith('+966') || phone.startsWith('00966') || phone.startsWith('966') ||
    phone.startsWith('+971') || phone.startsWith('00971') || phone.startsWith('971') ||
    phone.startsWith('+965') || phone.startsWith('00965') || phone.startsWith('965') ||
    phone.startsWith('+974') || phone.startsWith('00974') || phone.startsWith('974') ||
    phone.startsWith('+973') || phone.startsWith('00973') || phone.startsWith('973') ||
    phone.startsWith('+968') || phone.startsWith('00968') || phone.startsWith('968')
  ) {
    return false;
  }

  const addr = `${order.customerAddress || ''} ${order.deliveryZoneName || ''}`.toLowerCase();
  if (EG_KEYWORDS.some((kw) => addr.includes(kw))) return true;
  if (GCC_KEYWORDS.some((kw) => addr.includes(kw))) return false;

  return true;
}

/**
 * Checks whether an order is destined for Saudi Arabia or GCC countries.
 * Considers explicit GCC country codes, GCC phone prefixes, GCC cities/keywords,
 * and existing GCC carrier shipments (Aramex/SMSA).
 */
export function isOrderDestinedForGcc(order: OnlineOrderRecord): boolean {
  if (order.gccTrackingNumber || (order as any).gcc_tracking_number) return true;

  const code = (order.countryCode || (order as any).country_code || '').toUpperCase().trim();
  if (GCC_COUNTRY_CODES.has(code)) return true;
  if (code === 'EG') return false;

  const phone = cleanPhoneNumber(order.customerPhone);
  if (
    phone.startsWith('+966') || phone.startsWith('00966') || phone.startsWith('966') ||
    phone.startsWith('+971') || phone.startsWith('00971') || phone.startsWith('971') ||
    phone.startsWith('+965') || phone.startsWith('00965') || phone.startsWith('965') ||
    phone.startsWith('+974') || phone.startsWith('00974') || phone.startsWith('974') ||
    phone.startsWith('+973') || phone.startsWith('00973') || phone.startsWith('973') ||
    phone.startsWith('+968') || phone.startsWith('00968') || phone.startsWith('968')
  ) {
    return true;
  }

  if (/^01[0125]\d{8}$/.test(phone) || phone.startsWith('+20') || phone.startsWith('0020')) {
    return false;
  }

  const addr = `${order.customerAddress || ''} ${order.deliveryZoneName || ''}`.toLowerCase();
  if (GCC_KEYWORDS.some((kw) => addr.includes(kw))) return true;
  if (EG_KEYWORDS.some((kw) => addr.includes(kw))) return false;

  return false;
}
