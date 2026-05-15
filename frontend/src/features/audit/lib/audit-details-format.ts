import type { AuditLog } from '@/types/domain';

type AuditDetailsObject = Record<string, unknown>;

const FIELD_LABELS: Record<string, string> = {
  actorUserId: 'رقم المستخدم',
  productId: 'الصنف',
  qty: 'الكمية',
  quantity: 'الكمية',
  reason: 'السبب',
  note: 'ملاحظات',
  locationId: 'المخزن',
  branchId: 'الفرع',
  fromQty: 'من',
  toQty: 'إلى',
  oldQty: 'من',
  newQty: 'إلى',
};

function stringifyDetailValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return value.trim();
  return JSON.stringify(value);
}

function readDetail(details: AuditDetailsObject, key: string): string {
  return stringifyDetailValue(details[key]);
}

function parseAuditDetails(rawDetails?: string): AuditDetailsObject | null {
  const raw = String(rawDetails || '').trim();
  if (!raw || (!raw.startsWith('{') && !raw.startsWith('['))) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as AuditDetailsObject : null;
  } catch {
    try {
      const normalized = raw.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3');
      const parsed = JSON.parse(normalized);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as AuditDetailsObject : null;
    } catch {
      return null;
    }
  }
}

function formatDamagedStockDetails(details: AuditDetailsObject): string {
  const productId = readDetail(details, 'productId');
  const qty = readDetail(details, 'qty') || readDetail(details, 'quantity');
  const reason = readDetail(details, 'reason');
  const locationId = readDetail(details, 'locationId');

  const parts = [
    productId ? `الصنف #${productId}` : 'صنف غير محدد',
    qty ? `الكمية التالفة ${qty}` : '',
    reason ? `السبب: ${reason}` : '',
    locationId ? `المخزن #${locationId}` : '',
  ].filter(Boolean);

  return `تم تسجيل تالف: ${parts.join(' — ')}`;
}

function formatGenericObjectDetails(details: AuditDetailsObject): string {
  return Object.entries(details)
    .map(([key, value]) => {
      const formattedValue = stringifyDetailValue(value);
      if (!formattedValue) return '';
      const label = FIELD_LABELS[key] || key;
      const displayValue = key === 'productId' ? `#${formattedValue}` : formattedValue;
      return `${label}: ${displayValue}`;
    })
    .filter(Boolean)
    .join(' — ');
}

function looksLikeRawDetails(value?: string): boolean {
  const text = String(value || '').trim();
  return text.startsWith('{') || text.startsWith('[');
}

export function formatAuditDetails(row: AuditLog): string {
  const rawDetails = row.details || row.detailsSummary || '';
  const parsedDetails = parseAuditDetails(rawDetails);

  if (parsedDetails) {
    if (String(row.action || '').includes('تالف') || String(row.action || '').toLowerCase().includes('damage')) {
      return formatDamagedStockDetails(parsedDetails);
    }

    const genericDetails = formatGenericObjectDetails(parsedDetails);
    return genericDetails || '—';
  }

  if (row.detailsSummary && !looksLikeRawDetails(row.detailsSummary)) return row.detailsSummary;
  if (row.details && !looksLikeRawDetails(row.details)) return row.details;
  return '—';
}
