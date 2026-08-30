import type { AppSettings } from '@/types/domain';

export type PosPrintPageSize = 'a4' | 'receipt';

export function paymentLabel(value?: string) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'cash') return 'نقدي';
  if (normalized === 'card') return 'بطاقة / فيزا';
  if (normalized === 'wallet') return 'محفظة إلكترونية';
  if (normalized === 'instapay') return 'InstaPay';
  if (normalized === 'credit') return 'آجل';
  if (normalized === 'mixed') return 'مختلط';
  return value || 'نقدي';
}

export function formatSalePaymentText(
  paymentType?: string,
  paymentChannel?: string,
  paidAmount?: number,
  total?: number,
  orderType?: string | null,
  collectionStatus?: string | null
): string {
  const paid = Number(paidAmount || 0);
  const invoiceTotal = Number(total || 0);
  const isDelivery = orderType === 'delivery';
  const channel = String(paymentChannel || '').trim().toLowerCase();

  if (paymentType === 'credit') {
    if (paid > 0.009 && paid + 0.009 < invoiceTotal) {
      if (channel === 'wallet') return 'سداد جزئي (محفظة + آجل)';
      if (channel === 'instapay') return 'سداد جزئي (InstaPay + آجل)';
      if (channel === 'card') return 'سداد جزئي (فيزا + آجل)';
      if (channel === 'mixed') return 'سداد جزئي (مختلط + آجل)';
      return 'سداد جزئي (نقدي + آجل)';
    }
    return 'آجل بالكامل';
  }

  const channelLabel = paymentLabel(paymentChannel || paymentType);

  if (isDelivery) {
    if (collectionStatus === 'cod' || (channelLabel === 'نقدي' && paid < 0.009)) {
      return 'تحصيل مع المندوب (نقدي)';
    }
    if (paid + 0.009 >= invoiceTotal) {
      return `خالص مسبقاً (${channelLabel})`;
    }
  }

  return channelLabel;
}

export function getPrintOption(settings: Partial<AppSettings> | null | undefined, key: keyof AppSettings, defaultValue = true) {
  const value = settings?.[key];
  return typeof value === 'boolean' ? value : defaultValue;
}

export function getReceiptNumberLocale(settings?: Partial<AppSettings> | null) {
  return settings?.printNumberFormat === 'english' ? 'en-US' : 'ar-EG';
}

export function isCompactReceipt(pageSize?: PosPrintPageSize, settings?: Partial<AppSettings> | null) {
  return pageSize === 'receipt' && getPrintOption(settings, 'printCompactReceipt', true);
}

export function getReceiptTheme(pageSize?: PosPrintPageSize, settings?: Partial<AppSettings> | null) {
  return pageSize === 'receipt' ? (settings?.posReceiptTheme || 'classic') : 'classic';
}

export function formatDateTime(value?: string | Date | null, settings?: Partial<AppSettings> | null) {
  const locale = getReceiptNumberLocale(settings);
  if (!value) return new Date().toLocaleString(locale);
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString(locale);
}

export function defaultInvoiceFooter(settings?: Partial<AppSettings> | null) {
  const configured = String(settings?.invoiceFooter || '').trim();
  if (configured) return configured;
  return 'يرجى الاحتفاظ بالفاتورة. الاستبدال والاسترجاع حسب سياسة المتجر.';
}
