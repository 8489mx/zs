export function formatCurrency(value: number) {
  return new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
}

export function formatWhatsAppNumber(phone: string) {
  let cleaned = String(phone || '').replace(/\D/g, '');
  if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
  if (cleaned.length === 11 && cleaned.startsWith('01')) {
    cleaned = '2' + cleaned;
  }
  return cleaned;
}

export function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

export function toArabicDigits(str: string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(str || '').replace(/[0-9]/g, (d) => arabicDigits[Number(d)]);
}

export function formatDateOnly(value?: string | Date) {
  if (!value) return '—';
  let year = '';
  let month = '';
  let day = '';
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      year = match[1];
      month = match[2];
      day = match[3];
    }
  }
  if (!year) {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return String(value);
    day = String(date.getDate()).padStart(2, '0');
    month = String(date.getMonth() + 1).padStart(2, '0');
    year = String(date.getFullYear());
  }
  return `${toArabicDigits(year)}/${toArabicDigits(month)}/${toArabicDigits(day)}`;
}

export function formatDateTimeArabic(date?: Date | string | null) {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const time = new Intl.DateTimeFormat('ar-EG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d);
  return `${toArabicDigits(`${day}/${month}/${year}`)} في ${time}`;
}

function toIsoUtc(date: Date) {
  return new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  )).toISOString();
}

export function dayRangeLast30(referenceDate?: Date) {
  const end = referenceDate ? new Date(referenceDate) : new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  return { from: toIsoUtc(start), to: toIsoUtc(end) };
}
