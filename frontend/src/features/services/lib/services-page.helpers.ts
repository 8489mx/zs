import { escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatCurrency, formatDate } from '@/lib/format';
import type { ServiceRecord } from '@/types/domain';
import { SERVICE_PRESETS, type ServiceCatalogItem, type ServicePresetKey } from '@/features/services/lib/services-page.constants';

const SERVICES_CATALOG_STORAGE_KEY = 'services:catalog:v1';

export function readServicesCatalog(): ServiceCatalogItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SERVICES_CATALOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): ServiceCatalogItem[] => {
      if (!item || typeof item !== 'object') return [];
      const name = String((item as { name?: string }).name || '').trim();
      if (!name) return [];
      const defaultAmountRaw = (item as { defaultAmount?: unknown }).defaultAmount;
      const defaultAmount = typeof defaultAmountRaw === 'number' && Number.isFinite(defaultAmountRaw) ? defaultAmountRaw : null;
      return [{ name, defaultAmount }];
    });
  } catch {
    return [];
  }
}

export function writeServicesCatalog(items: ServiceCatalogItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SERVICES_CATALOG_STORAGE_KEY, JSON.stringify(items));
}

export function formatServicePaymentChannel(channel?: string) {
  return channel === 'card' ? 'فيزا' : 'نقدي';
}

export function printServiceReceipt(service: ServiceRecord) {
  printHtmlDocument(`إيصال خدمة ${service.name}`, `
    <h1>إيصال خدمة</h1>
    <div class="meta">الخدمة: ${escapeHtml(service.name)} · التاريخ: ${escapeHtml(formatDate(service.serviceDate))}</div>
    <div class="section"><strong>القيمة:</strong> ${formatCurrency(service.amount)}</div>
    <div class="section"><strong>طريقة التحصيل:</strong> ${escapeHtml(formatServicePaymentChannel(service.paymentChannel))}</div>
    <div class="section"><strong>الملاحظات:</strong> ${escapeHtml(service.notes || '—')}</div>
    <div class="section"><strong>المنفذ:</strong> ${escapeHtml(service.createdByName || '—')}</div>
  `);
}

export function normalizeServiceName(value: string) {
  return value.trim().toLocaleLowerCase('ar-EG');
}

export function buildPresetDrafts(key: ServicePresetKey) {
  const preset = SERVICE_PRESETS.find((entry) => entry.key === key);
  const names = preset?.services || [];
  return names.map((name, index) => ({ id: `${key}-${index + 1}`, name, amountInput: '' }));
}
