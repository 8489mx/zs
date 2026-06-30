import { escapeHtml, printHtmlDocument, resolvePrintSettings } from '@/lib/browser';
import type { AppSettings, StockTransfer } from '@/types/domain';
import { defaultInvoiceFooter, formatDateTime, getPrintOption, getReceiptNumberLocale, type PosPrintPageSize } from '@/lib/pos-printing/shared';
import { getInvoiceStyles } from '@/lib/pos-printing/template';
import { queryClient } from '@/app/providers';
import { queryKeys } from '@/app/query-keys';



function getAdaptiveBrandFontSize(brandName: string, compact = false) {
  const length = Array.from(String(brandName || '').trim()).length;
  if (compact) {
    if (length > 34) return '10.5px';
    if (length > 28) return '11.5px';
    if (length > 22) return '12.5px';
    if (length > 18) return '14px';
    return '16px';
  }
  if (length > 34) return '14px';
  if (length > 28) return '15px';
  if (length > 22) return '17px';
  if (length > 18) return '19px';
  return '21px';
}

function getNumberLocale(settings?: Partial<AppSettings> | null) {
  return getReceiptNumberLocale(settings);
}

function formatReceiptNumber(value: number, settings?: Partial<AppSettings> | null, fractionDigits = 0) {
  return new Intl.NumberFormat(getNumberLocale(settings), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number(value || 0));
}

function formatReceiptText(value: string | number | null | undefined, settings?: Partial<AppSettings> | null) {
  const text = String(value ?? '—');
  if (settings?.printNumberFormat !== 'english') return text;
  return text
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

function renderStoreHeader(settings?: Partial<AppSettings> | null, compact = false) {
  const resolved = resolvePrintSettings();
  
  const showLogo = getPrintOption(settings, 'printShowLogo', true);
  const showPhone = getPrintOption(settings, 'printShowPhone', true);
  const showAddress = getPrintOption(settings, 'printShowAddress', true);
  const showTaxNumber = getPrintOption(settings, 'printShowTaxNumber', false);
  
  const phone = showPhone ? formatReceiptText(resolved.phone, settings) : '';
  const address = showAddress ? resolved.address : '';
  const taxNumber = showTaxNumber ? formatReceiptText(String(settings?.taxNumber || '').trim(), settings) : '';
  const logoData = showLogo ? resolved.logoData : '';
  const brandName = resolved.brandName;

  const details = [
    phone ? `<span>الهاتف: ${escapeHtml(phone)}</span>` : '',
    address ? `<span>العنوان: ${escapeHtml(address)}</span>` : '',
    taxNumber ? `<span>الرقم الضريبي: ${escapeHtml(taxNumber)}</span>` : '',
  ].filter(Boolean).join('');

  return `
    <section class="invoice-card invoice-store-card${compact ? ' compact' : ''}">
      <div class="invoice-brand-row">
        ${logoData ? `<img class="invoice-logo" src="${escapeHtml(logoData)}" alt="شعار المتجر" />` : `<div class="invoice-logo-fallback">${escapeHtml(brandName.slice(0, 1).toUpperCase())}</div>`}
        <div class="invoice-brand-copy">
          <h2 title="${escapeHtml(brandName)}" style="font-size:${getAdaptiveBrandFontSize(brandName, compact)}">${escapeHtml(brandName)}</h2>
          ${details ? `<div class="store-inline-details">${details}</div>` : ''}
        </div>
      </div>
    </section>
  `;
}

function renderMetaPanel(rows: Array<{ label: string; value?: string | number | null }>, compact = false, settings?: Partial<AppSettings> | null) {
  const visibleRows = rows.filter((row) => String(row.value ?? '').trim());
  if (!visibleRows.length) return '';
  return `
    <section class="invoice-card invoice-meta-panel${compact ? ' compact' : ''}">
      ${visibleRows.map((row) => `
        <div class="meta-line">
          <span class="meta-label">${escapeHtml(row.label)}:</span>
          <span class="meta-value">${escapeHtml(formatReceiptText(row.value ?? '—', settings))}</span>
        </div>
      `).join('')}
    </section>
  `;
}

function renderTransferItemsTable(items: Array<{ productName?: string; qty?: number }>, compact = false, settings?: Partial<AppSettings> | null) {
  const body = (items || []).map((item, index) => `
    <tr>
      ${compact ? '' : `<td class="index-cell">${formatReceiptNumber(index + 1, settings)}</td>`}
      <td class="name-cell">${escapeHtml(item.productName || '—')}</td>
      <td>${formatReceiptNumber(Number(item.qty || 0), settings)}</td>
    </tr>
  `).join('');

  return `
    <section class="invoice-card invoice-items-card${compact ? ' compact' : ''}">
      <table class="invoice-items-table${compact ? ' compact' : ''}">
        <thead>
          <tr>
            ${compact ? '' : '<th>#</th>'}
            <th>الصنف</th>
            <th>الكمية</th>
          </tr>
        </thead>
        <tbody>${body || `<tr><td colspan="${compact ? 2 : 3}">لا توجد أصناف</td></tr>`}</tbody>
      </table>
    </section>
  `;
}

function renderTransferTotals(options: { items: Array<{ qty?: number }>; settings?: Partial<AppSettings> | null; compact?: boolean }) {
  const totalQty = options.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  return `
    <section class="invoice-card invoice-totals-card${options.compact ? ' compact' : ''}">
      <div class="totals-grid">
        <div class="totals-row subtotal">
          <span>عدد الأصناف</span>
          <strong>${formatReceiptNumber(options.items.length, options.settings)}</strong>
        </div>
        <div class="totals-row grand-total">
          <span>إجمالي الكمية</span>
          <strong>${formatReceiptNumber(totalQty, options.settings)}</strong>
        </div>
      </div>
    </section>
  `;
}

export interface PrintTransferOptions {
  pageSize?: PosPrintPageSize;
  settings?: Partial<AppSettings> | null;
}

export function buildTransferDocument(transfer: StockTransfer, options: PrintTransferOptions) {
  const compact = options.pageSize === 'receipt';
  
  const headerHtml = renderStoreHeader(options.settings, compact);
  
  const metaHtml = renderMetaPanel([
    { label: compact ? 'إيصال' : 'وثيقة', value: compact ? 'تحويل مخزني' : 'إيصال تحويل مخزون بين الفروع' },
    { label: 'رقم المستند', value: transfer.docNo || transfer.id },
    { label: 'التاريخ', value: formatDateTime(transfer.date) },
    { label: 'من', value: transfer.fromLocationName },
    { label: 'إلى', value: transfer.toLocationName },
    { label: 'بواسطة', value: transfer.createdBy || '—' },
    { label: 'المستلم / السائق', value: transfer.recipientName || '—' },
    { label: 'ملاحظات', value: transfer.note || '' }
  ], compact, options.settings);

  const itemsHtml = renderTransferItemsTable(transfer.items || [], compact, options.settings);
  const totalsHtml = renderTransferTotals({ items: transfer.items || [], settings: options.settings, compact });

  const html = `
    <div class="invoice-document-root${compact ? ' compact-receipt-mode' : ''}" dir="rtl">
      ${headerHtml}
      ${metaHtml}
      ${itemsHtml}
      ${totalsHtml}
    </div>
  `;

  return { html, compact };
}

export function printTransferDocument(transfer: StockTransfer, options: PrintTransferOptions = {}) {
  printMultipleTransfers([transfer], options);
}

export function printMultipleTransfers(transfers: StockTransfer[], options: PrintTransferOptions = {}) {
  if (!transfers.length) return;

  // Try to load settings from query cache if not provided
  if (!options.settings) {
    try {
      const cached = queryClient.getQueryData(queryKeys.settings);
      if (cached && typeof cached === 'object') {
        options.settings = (cached as any).settings || cached;
      }
    } catch (err) {
      // ignore
    }
  }

  const isReceipt = options.pageSize === 'receipt';
  
  if (transfers.length === 1) {
    const transferForPrint = { ...transfers[0], toLocationName: transfers[0].toLocationName || transfers[0].toBranchName || '—' };
    const document = buildTransferDocument(transferForPrint, options);
    printHtmlDocument(`${isReceipt ? 'إيصال تحويل' : 'تحويل مخزني'} ${transfers[0].docNo || transfers[0].id}`, document.html, {
      subtitle: isReceipt ? '' : 'وثيقة تحويل مخزون',
      footerHtml: `<div style="text-align: center; margin-top: 2rem; font-weight: bold; padding: 1rem 0; border-top: 1px dashed #ccc;">توقيع المستلم: ..........................</div>`,
      pageSize: isReceipt ? 'receipt' : 'A4',
      extraStyles: getInvoiceStyles(isReceipt),
    });
    return;
  }

  // --- Combined Print Logic ---
  const headerHtml = renderStoreHeader(options.settings, isReceipt);
  
  const docNumbers = transfers.map(t => t.docNo || t.id).join('، ');
  const fromLocations = Array.from(new Set(transfers.map(t => t.fromLocationName || '—'))).join('، ');
  const toLocation = transfers[0].toLocationName || transfers[0].toBranchName || '—';
  
  const metaHtml = renderMetaPanel([
    { label: isReceipt ? 'إيصال' : 'وثيقة', value: isReceipt ? 'تحويل مخزني مجمع' : 'إيصال تحويل مجمع بين الفروع' },
    { label: 'أرقام المستندات', value: docNumbers },
    { label: 'التاريخ', value: formatDateTime(transfers[0].date) },
    { label: 'من مخازن', value: fromLocations },
    { label: 'إلى', value: toLocation },
    { label: 'بواسطة', value: transfers[0].createdBy || '—' },
    { label: 'المستلم / السائق', value: transfers[0].recipientName || '—' },
  ], isReceipt, options.settings);

  // Combine all items and annotate their source warehouse
  const combinedItems = transfers.flatMap(t => 
    (t.items || []).map(item => ({
      ...item,
      productName: `${item.productName || '—'} (من: ${t.fromLocationName || '—'})`
    }))
  );

  const itemsHtml = renderTransferItemsTable(combinedItems, isReceipt, options.settings);
  const totalsHtml = renderTransferTotals({ items: combinedItems, settings: options.settings, compact: isReceipt });

  const bodyHtml = `
    <div class="invoice-document-root${isReceipt ? ' compact-receipt-mode' : ''}" dir="rtl">
      ${headerHtml}
      ${metaHtml}
      ${itemsHtml}
      ${totalsHtml}
    </div>
  `;

  const title = `أذونات صرف مجمعة (${transfers.length})`;

  printHtmlDocument(title, bodyHtml, {
    subtitle: isReceipt ? '' : 'وثائق تحويل مخزون مجمعة',
    footerHtml: `<div style="text-align: center; margin-top: 2rem; font-weight: bold; padding: 1rem 0; border-top: 1px dashed #ccc;">توقيع المستلم: ..........................</div>`,
    pageSize: isReceipt ? 'receipt' : 'A4',
    extraStyles: getInvoiceStyles(isReceipt),
  });
}



export function buildInventoryStatusReport(rows: any[], options: PrintTransferOptions) {
  const compact = options.pageSize === 'receipt';
  const headerHtml = renderStoreHeader(options.settings, compact);
  
  const totalStockValue = rows.reduce((acc, row) => acc + ((row.stock || 0) * (row.costPrice || 0)), 0);
  
  const metaHtml = renderMetaPanel([
    { label: 'وثيقة', value: 'تقرير جرد وقيمة المخزون' },
    { label: 'التاريخ', value: formatDateTime(new Date().toISOString()) },
  ], compact, options.settings);

  const body = (rows || []).map((row, index) => `
    <tr>
      ${compact ? '' : `<td class="index-cell">${formatReceiptNumber(index + 1, options.settings)}</td>`}
      <td class="name-cell">${escapeHtml(row.name || '—')}</td>
      <td>${formatReceiptNumber(Number(row.stock || 0), options.settings)}</td>
      <td>${formatReceiptNumber(Number(row.costPrice || 0), options.settings)}</td>
      <td>${formatReceiptNumber(Number((row.stock || 0) * (row.costPrice || 0)), options.settings)}</td>
    </tr>
  `).join('');

  const itemsHtml = `
    <section class="invoice-card invoice-items-card${compact ? ' compact' : ''}">
      <table class="invoice-items-table${compact ? ' compact' : ''}">
        <thead>
          <tr>
            ${compact ? '' : '<th>#</th>'}
            <th>الصنف</th>
            <th>الكمية</th>
            <th>التكلفة</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>${body || `<tr><td colspan="${compact ? 4 : 5}">لا توجد أصناف</td></tr>`}</tbody>
      </table>
    </section>
  `;

  const totalsHtml = `
    <section class="invoice-card invoice-totals-card${compact ? ' compact' : ''}">
      <div class="totals-grid">
        <div class="totals-row subtotal">
          <span>عدد الأصناف</span>
          <strong>${formatReceiptNumber(rows.length, options.settings)}</strong>
        </div>
        <div class="totals-row grand-total">
          <span>إجمالي قيمة المخزون</span>
          <strong>${formatReceiptNumber(totalStockValue, options.settings, 2)}</strong>
        </div>
      </div>
    </section>
  `;

  const html = `
    <div class="invoice-document-root${compact ? ' compact-receipt-mode' : ''}" dir="rtl">
      ${headerHtml}
      ${metaHtml}
      ${itemsHtml}
      ${totalsHtml}
    </div>
  `;

  return { html, compact };
}

export function printInventoryStatusReport(rows: any[], options: PrintTransferOptions = {}) {
  const document = buildInventoryStatusReport(rows, options);
  printHtmlDocument('تقرير جرد وقيمة المخزون', document.html, {
    subtitle: 'تقرير الجرد',
    footerHtml: getPrintOption(options.settings, 'printShowFooter', true) ? escapeHtml(defaultInvoiceFooter(options.settings)) : '',
    pageSize: options.pageSize === 'receipt' ? 'receipt' : 'A4',
    extraStyles: getInvoiceStyles(document.compact),
  });
}

export function buildInventoryMovementsReport(movements: any[], options: PrintTransferOptions) {
  const compact = options.pageSize === 'receipt';
  const headerHtml = renderStoreHeader(options.settings, compact);
  
  const metaHtml = renderMetaPanel([
    { label: 'وثيقة', value: 'تقرير حركات وعمليات المخزن' },
    { label: 'التاريخ', value: formatDateTime(new Date().toISOString()) },
  ], compact, options.settings);

  const body = (movements || []).map((movement, index) => `
    <tr>
      ${compact ? '' : `<td class="index-cell">${formatReceiptNumber(index + 1, options.settings)}</td>`}
      <td>${formatDateTime(movement.date || '')}</td>
      <td class="name-cell">${escapeHtml(movement.productName || '—')}</td>
      <td>${escapeHtml(movement.locationName || '—')}</td>
      <td>${escapeHtml(movement.type || '—')}</td>
      <td>${formatReceiptNumber(Number(movement.qty || 0), options.settings)}</td>
      <td>${escapeHtml(movement.reason || movement.referenceId || '—')}</td>
    </tr>
  `).join('');

  const itemsHtml = `
    <section class="invoice-card invoice-items-card${compact ? ' compact' : ''}">
      <table class="invoice-items-table${compact ? ' compact' : ''}">
        <thead>
          <tr>
            ${compact ? '' : '<th>#</th>'}
            <th>التاريخ</th>
            <th>الصنف</th>
            <th>المخزن</th>
            <th>النوع</th>
            <th>الكمية</th>
            <th>السبب / المستلم</th>
          </tr>
        </thead>
        <tbody>${body || `<tr><td colspan="${compact ? 6 : 7}">لا توجد حركات</td></tr>`}</tbody>
      </table>
    </section>
  `;

  const html = `
    <div class="invoice-document-root${compact ? ' compact-receipt-mode' : ''}" dir="rtl">
      ${headerHtml}
      ${metaHtml}
      ${itemsHtml}
    </div>
  `;

  return { html, compact };
}

export function printInventoryMovementsReport(movements: any[], options: PrintTransferOptions = {}) {
  const document = buildInventoryMovementsReport(movements, options);
  printHtmlDocument('تقرير حركات وعمليات المخزن', document.html, {
    subtitle: 'حركات المخزون',
    footerHtml: getPrintOption(options.settings, 'printShowFooter', true) ? escapeHtml(defaultInvoiceFooter(options.settings)) : '',
    pageSize: options.pageSize === 'receipt' ? 'receipt' : 'A4',
    extraStyles: getInvoiceStyles(document.compact),
  });
}
