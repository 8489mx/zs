import type { AppSettings } from '@/types/domain';

export type PosPrintPageSize = 'a4' | 'receipt';

export function paymentLabel(value?: string) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'cash') return 'نقدي';
  if (normalized === 'card') return 'بطاقة / فيزا';
  if (normalized === 'credit') return 'آجل';
  if (normalized === 'mixed') return 'مختلط';
  return value || 'نقدي';
}

export function getPrintOption(settings: Partial<AppSettings> | null | undefined, key: keyof AppSettings, defaultValue = true) {
  const value = settings?.[key];
  return typeof value === 'boolean' ? value : defaultValue;
}

export function isCompactReceipt(pageSize?: PosPrintPageSize, settings?: Partial<AppSettings> | null) {
  return pageSize === 'receipt' && getPrintOption(settings, 'printCompactReceipt', true);
}

export function formatDateTime(value?: string) {
  if (!value) return new Date().toLocaleString('ar-EG');
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('ar-EG');
}

export function defaultInvoiceFooter(settings?: Partial<AppSettings> | null) {
  const configured = String(settings?.invoiceFooter || '').trim();
  if (configured) return configured;
  return 'يرجى الاحتفاظ بالفاتورة. الاستبدال والاسترجاع حسب سياسة المتجر.';
}
