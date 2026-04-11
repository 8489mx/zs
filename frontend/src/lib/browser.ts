/* eslint-disable max-lines */
import { queryKeys } from '@/app/query-keys';
import { queryClient } from '@/app/providers';
import { DEFAULT_STORE_NAME, useAuthStore } from '@/stores/auth-store';
import type { AppSettings } from '@/types/domain';

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadJsonFile(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  triggerDownload(blob, filename);
}

export function downloadCsvFile(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const csvEscape = (value: string | number | null | undefined) => {
    const text = String(value ?? '');
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };

  const csv = [headers.map(csvEscape).join(','), ...rows.map((row) => row.map(csvEscape).join(','))].join('\r\n');
  const withBom = `\ufeff${csv}`;
  const blob = new Blob([withBom], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, filename);
}

export function parseCsvRows(text: string) {
  const lines = text.replace(/^\ufeff/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const parseLine = (line: string) => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];
      if (char === '"' && inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }
      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
        continue;
      }
      current += char;
    }
    values.push(current.trim());
    return values;
  };

  const headers = parseLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      if (header) acc[header] = values[index] ?? '';
      return acc;
    }, {});
  }).filter((row) => Object.values(row).some((value) => String(value || '').trim()));
}

function looksLikeHtmlFragment(value: string) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized.startsWith('<!doctype')
    || normalized.startsWith('<html')
    || normalized.startsWith('<body')
    || normalized.startsWith('<style')
    || normalized.startsWith('<section')
    || normalized.startsWith('<div')
    || normalized.startsWith('<table')
    || normalized.startsWith('<h1')
    || normalized.startsWith('<h2')
    || normalized.startsWith('<h3');
}

function normalizeCachedSettings(raw: unknown): Partial<AppSettings> {
  if (!raw || typeof raw !== 'object') return {};
  const candidate = raw as Partial<AppSettings> & { settings?: Partial<AppSettings> };
  if (candidate.settings && typeof candidate.settings === 'object') return candidate.settings;
  return candidate;
}

function resolvePrintSettings() {
  const cachedSettings = normalizeCachedSettings(queryClient.getQueryData(queryKeys.settings));
  const sessionStoreName = useAuthStore.getState().storeName;
  const resolvedStoreName = String(cachedSettings.storeName || sessionStoreName || DEFAULT_STORE_NAME).trim() || DEFAULT_STORE_NAME;
  return {
    storeName: resolvedStoreName,
    brandName: String(cachedSettings.brandName || resolvedStoreName).trim() || resolvedStoreName,
    phone: String(cachedSettings.phone || '').trim(),
    address: String(cachedSettings.address || '').trim(),
    invoiceFooter: String(cachedSettings.invoiceFooter || '').trim(),
    logoData: String(cachedSettings.logoData || '').trim(),
  };
}

function stripLeadingDuplicateHeading(bodyHtml: string, title: string) {
  const normalizedTitle = String(title || '').trim();
  if (!normalizedTitle) return bodyHtml;
  const escapedTitle = normalizedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^\\s*<h[12][^>]*>\\s*${escapedTitle}\\s*<\\/h[12]>`, 'i');
  return bodyHtml.replace(pattern, '').trim();
}

function sanitizePrintText(value: string) {
  return String(value || '')
    .replace(/\bundefined\b/gi, '')
    .replace(/\bnull\b/gi, '')
    .replace(/[\u00A0]/g, ' ')
    .replace(/\s+[·•-]\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function buildBrandPanelHtml(branding: ReturnType<typeof resolvePrintSettings>) {
  const identity = branding.brandName || branding.storeName || DEFAULT_STORE_NAME;
  const identityLetter = Array.from(identity)[0] || 'Z';
  const details = [branding.phone, branding.address].filter(Boolean);
  return `
    <section class="brand-panel" aria-label="بيانات المتجر">
      <div class="brand-copy">
        <div class="brand-name">${escapeHtml(identity)}</div>
        ${details.length ? `<div class="brand-meta">${details.map((item) => `<span>${escapeHtml(item)}</span>`).join('<span class="brand-meta-sep">•</span>')}</div>` : ''}
      </div>
      ${branding.logoData
        ? `<img class="brand-logo-image" src="${branding.logoData}" alt="${escapeHtml(identity)}" />`
        : `<div class="brand-logo-fallback">${escapeHtml(identityLetter)}</div>`}
    </section>
  `;
}

export interface PrintDocumentOptions {
  subtitle?: string;
  footerHtml?: string;
  extraStyles?: string;
  pageSize?: 'auto' | 'A4' | 'receipt';
  orientation?: 'portrait' | 'landscape';
  printDelayMs?: number;
  autoClose?: boolean;
  documentDirection?: 'rtl' | 'ltr';
}

export function printHtmlDocument(titleOrBody: string, bodyOrTitle: string, options: PrintDocumentOptions = {}) {
  let title = String(titleOrBody || 'مستند للطباعة').trim() || 'مستند للطباعة';
  let bodyHtml = String(bodyOrTitle || '').trim();

  if (looksLikeHtmlFragment(titleOrBody) && !looksLikeHtmlFragment(bodyOrTitle)) {
    title = String(bodyOrTitle || 'مستند للطباعة').trim() || 'مستند للطباعة';
    bodyHtml = String(titleOrBody || '').trim();
  }

  const {
    subtitle = '',
    footerHtml = '',
    extraStyles = '',
    pageSize = 'auto',
    orientation = 'portrait',
    printDelayMs = 260,
    autoClose = false,
    documentDirection = 'rtl',
  } = options;

  const branding = resolvePrintSettings();
  const safeSubtitle = sanitizePrintText(subtitle);
  const bodyContent = pageSize === 'receipt' ? bodyHtml : stripLeadingDuplicateHeading(bodyHtml, title);
  const effectiveFooter = pageSize === 'receipt' ? sanitizePrintText(footerHtml || branding.invoiceFooter) : sanitizePrintText(footerHtml);
  const printedAt = new Date().toLocaleString('ar-EG');
  const printWindow = window.open('', '_blank', 'width=1120,height=820');
  if (!printWindow) throw new Error('المتصفح منع نافذة الطباعة');

  const pageRule = pageSize === 'A4'
    ? orientation === 'landscape'
      ? '@page { size: A4 landscape; margin: 9mm; }'
      : '@page { size: A4 portrait; margin: 9mm; }'
    : pageSize === 'receipt'
      ? '@page { size: 80mm auto; margin: 3.5mm; }'
      : '@page { size: auto; margin: 9mm; }';

  const html = `<!doctype html>
  <html lang="ar" dir="${documentDirection}">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(title)}</title>
      <style>
        :root {
          --print-text: #0f172a;
          --print-muted: #475569;
          --print-border: #cbd5e1;
          --print-surface: #f8fafc;
          --print-strong: #111827;
          --print-accent: #1d4ed8;
        }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #fff; color: var(--print-text); }
        body { font-family: Tahoma, Arial, sans-serif; font-size: 12px; line-height: 1.45; }
        .print-shell { padding: 12px; max-width: 100%; }
        .print-header { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: stretch; margin-bottom: 12px; }
        .brand-panel, .doc-panel, .meta-box, .summary-box, .totals, .print-footer {
          border: 1px solid var(--print-border);
          border-radius: 14px;
          background: rgba(248, 250, 252, 0.58);
        }
        .brand-panel {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
        }
        .brand-copy { min-width: 0; }
        .brand-name {
          font-size: 19px;
          font-weight: 800;
          color: var(--print-strong);
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .brand-meta {
          margin-top: 4px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px 8px;
          color: var(--print-muted);
          font-size: 11px;
        }
        .brand-meta-sep { opacity: 0.55; }
        .brand-logo-image, .brand-logo-fallback {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          flex-shrink: 0;
          object-fit: cover;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: linear-gradient(135deg, #e0ecff, #c7d2fe);
        }
        .brand-logo-fallback {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #1d4ed8;
          font-size: 18px;
          font-weight: 800;
        }
        .doc-panel {
          min-width: 180px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 2px;
        }
        .doc-title { margin: 0; font-size: 17px; line-height: 1.2; font-weight: 800; color: var(--print-strong); }
        .doc-subtitle { color: var(--print-muted); font-size: 11px; }
        .doc-meta-chip { margin-top: 4px; color: var(--print-muted); font-size: 11px; }
        .print-content { display: flex; flex-direction: column; gap: 10px; }
        .meta { margin: 0; color: var(--print-muted); font-size: 11px; }
        .section { margin: 0; break-inside: avoid; }
        h1, h2, h3 { margin: 0 0 8px; color: var(--print-strong); }
        h2 { font-size: 14px; }
        h3 { font-size: 13px; }
        p { margin: 0 0 6px; }
        .meta-grid, .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
          gap: 8px;
        }
        .meta-box, .summary-box { padding: 8px 10px; }
        .meta-box strong, .summary-box strong {
          display: block;
          margin-bottom: 4px;
          color: var(--print-muted);
          font-size: 11px;
          font-weight: 700;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: auto;
          font-size: 11px;
          margin-top: 4px;
        }
        th, td {
          border: 1px solid var(--print-border);
          padding: 4px 6px;
          text-align: right;
          vertical-align: top;
          word-break: break-word;
          overflow-wrap: anywhere;
          line-height: 1.3;
        }
        th {
          background: var(--print-surface);
          color: var(--print-muted);
          font-weight: 700;
        }
        tbody tr:nth-child(even) { background: rgba(248, 250, 252, 0.45); }
        .totals {
          margin-top: 4px;
          padding: 8px 10px;
        }
        .totals div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 4px;
        }
        .totals strong { color: var(--print-strong); }
        .muted { color: var(--print-muted); }
        .text-left { text-align: left; }
        .print-footer {
          margin-top: 12px;
          padding: 8px 10px;
          color: var(--print-muted);
          font-size: 11px;
        }
        body.receipt-mode { font-size: 11px; }
        body.receipt-mode .print-shell { padding: 6px; max-width: 76mm; }
        body.receipt-mode .print-header {
          grid-template-columns: 1fr;
          gap: 8px;
          margin-bottom: 8px;
        }
        body.receipt-mode .brand-panel { padding: 8px 10px; border-radius: 12px; }
        body.receipt-mode .brand-name { font-size: 15px; }
        body.receipt-mode .brand-logo-image, body.receipt-mode .brand-logo-fallback { width: 34px; height: 34px; border-radius: 10px; }
        body.receipt-mode .doc-panel { min-width: 0; padding: 8px 10px; }
        body.receipt-mode .doc-title { font-size: 14px; }
        body.receipt-mode table { font-size: 11px; }
        body.receipt-mode th, body.receipt-mode td { padding: 5px 6px; }
        body.receipt-mode .meta-grid, body.receipt-mode .summary-grid { grid-template-columns: 1fr; }
        body.receipt-mode .totals { padding: 8px 10px; }
        body.receipt-mode .print-footer { margin-top: 8px; }
        body.report-mode .print-shell { max-width: 100%; }
        body.report-mode .print-content > *:first-child { margin-top: 0 !important; }
        body.report-mode .print-content > * { min-height: auto !important; }
        body.report-mode .print-content .totals,
        body.report-mode .print-content .summary-box,
        body.report-mode .print-content .meta-box { break-inside: avoid; }
        @media print {
          html, body { height: auto; }
          .print-shell { padding: 0; }
          a { color: inherit; text-decoration: none; }
          .section, .meta-box, .summary-box, .totals, .print-header { break-inside: avoid; }
          table { break-inside: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr, td, th { break-inside: avoid-page; }
        }
        ${pageRule}
        ${extraStyles}
      </style>
    </head>
    <body class="${pageSize === 'receipt' ? 'receipt-mode' : 'report-mode'}">
      <div class="print-shell">
        ${pageSize === 'receipt' ? '' : `
        <div class="print-header">
          ${buildBrandPanelHtml(branding)}
          <div class="doc-panel">
            <h1 class="doc-title">${escapeHtml(title)}</h1>
            ${safeSubtitle ? `<div class="doc-subtitle">${escapeHtml(safeSubtitle)}</div>` : ''}
            <div class="doc-meta-chip">تاريخ الطباعة: ${escapeHtml(printedAt)}</div>
          </div>
        </div>`}
        <div class="print-content">${bodyContent}</div>
        ${effectiveFooter ? `<div class="print-footer">${effectiveFooter}</div>` : ''}
      </div>
    </body>
  </html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  const finalizePrint = () => {
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      if (autoClose) {
        window.setTimeout(() => printWindow.close(), 220);
      }
    }, Math.max(220, Number(printDelayMs || 0)));
  };

  if (printWindow.document.readyState === 'complete') {
    finalizePrint();
  } else {
    printWindow.addEventListener('load', finalizePrint, { once: true });
    window.setTimeout(finalizePrint, Math.max(400, Number(printDelayMs || 0) + 120));
  }
}
