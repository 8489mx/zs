import { escapeHtml } from '@/lib/browser';
import type { AppSettings, Sale } from '@/types/domain';
import { getPrintOption, getReceiptNumberLocale, isCompactReceipt, type PosPrintPageSize } from '@/lib/pos-printing/shared';

function resolveStoreIdentity(settings?: Partial<AppSettings> | null) {
  const brandName = String(settings?.storeName || 'متجر').trim() || 'متجر';
  const storeName = brandName;
  return { brandName, storeName };
}

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

function formatReceiptMoney(value: number, settings?: Partial<AppSettings> | null) {
  return formatReceiptNumber(Number(value || 0), settings, 2);
}

function formatReceiptText(value: string | number | null | undefined, settings?: Partial<AppSettings> | null) {
  const text = String(value ?? '—');
  if (settings?.printNumberFormat !== 'english') return text;
  return text
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

function renderStoreHeader(settings?: Partial<AppSettings> | null, compact = false) {
  const { brandName } = resolveStoreIdentity(settings);
  const showLogo = getPrintOption(settings, 'printShowLogo', true);
  const showPhone = getPrintOption(settings, 'printShowPhone', true);
  const showAddress = getPrintOption(settings, 'printShowAddress', true);
  const showTaxNumber = getPrintOption(settings, 'printShowTaxNumber', false);
  const phone = showPhone ? formatReceiptText(String(settings?.phone || '').trim(), settings) : '';
  const address = showAddress ? String(settings?.address || '').trim() : '';
  const taxNumber = showTaxNumber ? formatReceiptText(String(settings?.taxNumber || '').trim(), settings) : '';
  const logoData = showLogo ? String(settings?.logoData || '').trim() : '';
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

function renderItemsTable(items: Array<{ name?: string; unitName?: string; qty?: number; price?: number; total?: number }>, compact = false, settings?: Partial<AppSettings> | null) {
  const body = (items || []).map((item, index) => `
    <tr>
      ${compact ? '' : `<td class="index-cell">${formatReceiptNumber(index + 1, settings)}</td>`}
      <td class="name-cell">${escapeHtml(item.name || '—')}</td>
      ${compact ? '' : `<td>${escapeHtml(item.unitName || 'قطعة')}</td>`}
      <td>${formatReceiptNumber(Number(item.qty || 0), settings)}</td>
      <td>${formatReceiptMoney(Number(item.price || 0), settings)}</td>
      <td>${formatReceiptMoney(Number(item.total || 0), settings)}</td>
    </tr>
  `).join('');

  return `
    <section class="invoice-card invoice-items-card${compact ? ' compact' : ''}">
      <table class="invoice-items-table${compact ? ' compact' : ''}">
        <thead>
          <tr>
            ${compact ? '' : '<th>#</th>'}
            <th>الصنف</th>
            ${compact ? '' : '<th>الوحدة</th>'}
            <th>الكمية</th>
            <th>السعر</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>${body || `<tr><td colspan="${compact ? 4 : 6}">لا توجد أصناف</td></tr>`}</tbody>
      </table>
    </section>
  `;
}

function renderPaymentBreakdown(payments?: Sale['payments'], settings?: Partial<AppSettings> | null, compact = false) {
  if (!payments?.length || !getPrintOption(settings, 'printShowPaymentBreakdown', true)) return '';
  return `
    <section class="invoice-card invoice-payment-card${compact ? ' compact' : ''}">
      <div class="section-title">تفصيل المدفوعات</div>
      <div class="payment-grid">
        ${payments.map((payment) => `
          <div class="payment-chip">
            <span>${escapeHtml(payment.paymentChannel === 'cash' ? 'نقدي' : payment.paymentChannel === 'card' ? 'بطاقة / فيزا' : payment.paymentChannel === 'wallet' ? 'محفظة إلكترونية' : payment.paymentChannel === 'instapay' ? 'InstaPay' : payment.paymentChannel === 'credit' ? 'آجل' : 'مختلط')}</span>
            <strong>${formatReceiptMoney(Number(payment.amount || 0), settings)}</strong>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderTotals(options: {
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  paidAmount?: number;
  tenderedAmount?: number;
  changeAmount?: number;
  items: Array<{ qty?: number }>;
  settings?: Partial<AppSettings> | null;
  compact?: boolean;
}) {
  const totalPieces = (options.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const paidAmount = Number(options.paidAmount || 0);
  const tenderedAmount = Number(options.tenderedAmount || 0);
  const changeAmount = Number(options.changeAmount || 0);
  const remaining = Math.max(0, Number(options.total || 0) - paidAmount);
  const showTax = getPrintOption(options.settings, 'printShowTax', true);
  const showItemSummary = getPrintOption(options.settings, 'printShowItemSummary', true);
  const hasDiscount = Math.abs(Number(options.discount || 0)) > 0.0001;
  const rows = [
    { label: 'الإجمالي قبل الضريبة', value: formatReceiptMoney(Number(options.subtotal || 0), options.settings) },
    ...(hasDiscount ? [{ label: 'الخصم', value: formatReceiptMoney(Number(options.discount || 0), options.settings) }] : []),
    ...(showTax ? [{ label: 'الضريبة', value: formatReceiptMoney(Number(options.taxAmount || 0), options.settings) }] : []),
    { label: 'الإجمالي النهائي', value: formatReceiptMoney(Number(options.total || 0), options.settings), strong: true },
    { label: 'المدفوع', value: formatReceiptMoney(paidAmount, options.settings) },
    ...(remaining > 0 ? [{ label: 'المتبقي', value: formatReceiptMoney(remaining, options.settings) }] : []),
    ...(tenderedAmount > 0 ? [{ label: 'المستلم نقديًا', value: formatReceiptMoney(tenderedAmount, options.settings) }] : []),
    ...(changeAmount > 0 ? [{ label: 'الباقي', value: formatReceiptMoney(changeAmount, options.settings) }] : []),
    ...(showItemSummary ? [
      { label: 'عدد البنود', value: formatReceiptNumber(Number(options.items?.length || 0), options.settings) },
      { label: 'إجمالي القطع', value: formatReceiptNumber(totalPieces, options.settings) },
    ] : []),
  ];

  return `
    <section class="invoice-card invoice-totals-card${options.compact ? ' compact' : ''}">
      ${rows.map((row) => `
        <div class="meta-line${row.strong ? ' strong total-line' : ''}">
          <span class="meta-label">${escapeHtml(row.label)}:</span>
          <span class="meta-value">${escapeHtml(row.value)}</span>
        </div>
      `).join('')}
    </section>
  `;
}

export function getInvoiceStyles(compact = false) {
  return `
    .print-shell { padding: ${compact ? '1mm 1.2mm 2.5mm' : '2mm 1.8mm 3mm'}; }
    .print-header { display: none !important; }
    .print-title { font-size: ${compact ? '14px' : '19px'}; }
    .print-subtitle { margin-top: 1px; font-size: ${compact ? '9px' : '11px'}; min-height: 0; }
    .print-meta-chip { padding: ${compact ? '4px 8px' : '6px 10px'}; font-size: ${compact ? '9.5px' : '11px'}; }
    .print-content { gap: ${compact ? '4px' : '7px'}; }
    .invoice-card {
      border: 1px solid #8d8d8d;
      border-radius: ${compact ? '6px' : '8px'};
      background: #fff;
      padding: ${compact ? '5px 5px' : '7px 7px'};
      break-inside: avoid;
      overflow: hidden;
    }
    .invoice-card.compact { padding: 5px; }
    .invoice-store-card { padding: ${compact ? '6px 5px' : '8px 7px'}; }
    .invoice-brand-row { display: flex; align-items: center; justify-content: space-between; gap: ${compact ? '7px' : '10px'}; }
    .invoice-logo,
    .invoice-logo-fallback {
      width: ${compact ? '64px' : '90px'};
      height: ${compact ? '34px' : '48px'};
      border-radius: ${compact ? '5px' : '7px'};
      border: 1px solid #777;
      object-fit: contain;
      flex-shrink: 0;
      background: #fff;
      display: grid;
      place-items: center;
      font-weight: 800;
      color: #111;
      overflow: hidden;
    }
    .invoice-brand-copy { min-width: 0; flex: 1; text-align: center; }
    .invoice-brand-copy h2 { margin: 0; line-height: 1.15; color: #000; font-weight: 900; overflow-wrap: anywhere; }
    .store-inline-details { margin-top: ${compact ? '3px' : '5px'}; color: #111; font-size: ${compact ? '8.8px' : '10.2px'}; line-height: 1.35; display: grid; gap: 1px; justify-items: center; text-align: center; }
    .invoice-meta-panel { display: grid; gap: 0; }
    .meta-line { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: ${compact ? '2px 0' : '3px 0'}; border-bottom: 1px dotted #aaa; font-size: ${compact ? '10.3px' : '11.8px'}; line-height: 1.3; }
    .meta-line:last-child { border-bottom: 0; }
    .meta-line.strong { font-weight: 800; font-size: ${compact ? '12.5px' : '14px'}; }
    .meta-label { color: #111; white-space: nowrap; font-weight: 700; text-align: right; }
    .meta-value { text-align: left; font-weight: 500; color: #000; overflow-wrap: anywhere; }
    .invoice-items-card { padding: 0; }
    .invoice-items-table { margin: 0; width: 100%; border-collapse: collapse; table-layout: auto; }
    .invoice-items-table th,
    .invoice-items-table td { padding: ${compact ? '4px 2px' : '5px 4px'}; font-size: ${compact ? '9.6px' : '11.5px'}; border-inline-start: 1px solid #9b9b9b; border-bottom: 1px solid #b5b5b5; text-align: center; white-space: nowrap; line-height: 1.2; }
    .invoice-items-table th:last-child,
    .invoice-items-table td:last-child { border-inline-start: 0; }
    .invoice-items-table tbody tr:last-child td { border-bottom: 0; }
    .invoice-items-table th { background: #efefef; font-weight: 800; }
    .invoice-items-table .name-cell { text-align: right; white-space: normal; width: 100%; min-width: 72px; overflow-wrap: anywhere; }
    .invoice-items-table td:not(.name-cell) { text-align: left; font-variant-numeric: tabular-nums; }
    .invoice-items-table.compact th,
    .invoice-items-table.compact td { font-size: 9.4px; }
    .invoice-items-table.compact th { font-size: 8.7px; }
    .invoice-items-table.compact th:first-child,
    .invoice-items-table.compact td:first-child { text-align: right; }
    .invoice-totals-card { padding-top: ${compact ? '4px' : '6px'}; padding-bottom: ${compact ? '4px' : '6px'}; }
    .invoice-totals-card .meta-value { text-align: left; font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; font-weight: 600; }
    .invoice-totals-card .total-line { margin: ${compact ? '2px -2px' : '3px -3px'}; padding: ${compact ? '5px 4px' : '7px 5px'}; border: 1px solid #555; border-radius: 8px; background: #f3f3f3; }
    .invoice-totals-card .meta-line.strong .meta-value { font-weight: 900; }
    .invoice-payment-card .section-title { font-size: ${compact ? '11px' : '12.5px'}; font-weight: 900; text-align: center; padding-bottom: 4px; margin-bottom: 2px; border-bottom: 1px solid #888; }
    .payment-grid { display: grid; gap: 0; }
    .payment-chip { padding: ${compact ? '3px 0' : '4px 0'}; display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-size: ${compact ? '10px' : '11.3px'}; border-bottom: 1px dotted #aaa; background: #fff; }
    .payment-chip:last-child { border-bottom: 0; }
    .payment-chip strong { font-variant-numeric: tabular-nums; text-align: left; font-weight: 800; }
    .print-footer { margin-top: 5px; font-size: ${compact ? '8.8px' : '9.8px'}; padding: ${compact ? '5px 4px' : '7px 5px'}; border: 1px solid #aaa; border-radius: 8px; text-align: center; line-height: 1.35; }
    body.receipt-mode .print-shell { max-width: 76mm; padding-top: 0; margin: 0 auto; }
    body.receipt-mode .print-header { display: none !important; }
    body.receipt-mode .print-title-wrap { min-width: 0; }
  `;
}

export function buildReceiptDocument(options: {
  pageSize?: PosPrintPageSize;
  settings?: Partial<AppSettings> | null;
  documentLabel: string;
  documentNumber?: string | number;
  dateText?: string;
  customerName?: string;
  paymentText?: string;
  cashierName?: string;
  branchName?: string;
  locationName?: string;
  note?: string;
  items: Array<{ name?: string; unitName?: string; qty?: number; price?: number; total?: number }>;
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  paidAmount?: number;
  tenderedAmount?: number;
  changeAmount?: number;
  payments?: Sale['payments'];
}) {
  const compact = isCompactReceipt(options.pageSize, options.settings);
  const showCustomer = getPrintOption(options.settings, 'printShowCustomer', true);
  const showCashier = getPrintOption(options.settings, 'printShowCashier', true);
  const showBranch = getPrintOption(options.settings, 'printShowBranch', true);
  const showLocation = getPrintOption(options.settings, 'printShowLocation', true);
  const showPaymentMethod = getPrintOption(options.settings, 'printShowPaymentMethod', true);

  const metaRows = [
    { label: 'نوع المستند', value: options.documentLabel || 'فاتورة' },
    { label: 'رقم المستند', value: options.documentNumber ? String(options.documentNumber) : '—' },
    { label: 'التاريخ', value: options.dateText || '—' },
    ...(showCustomer ? [{ label: 'العميل', value: options.customerName || 'عميل نقدي' }] : []),
    ...(showPaymentMethod ? [{ label: 'طريقة الدفع', value: options.paymentText || 'نقدي' }] : []),
    ...(showCashier ? [{ label: 'الكاشير', value: options.cashierName || '—' }] : []),
    ...(showBranch ? [{ label: 'الفرع', value: options.branchName || 'المتجر الرئيسي' }] : []),
    ...(showLocation ? [{ label: 'المخزن', value: options.locationName || 'المخزن الأساسي' }] : []),
    ...(options.note ? [{ label: 'ملاحظة', value: options.note }] : []),
  ];

  return {
    html: `
      ${renderStoreHeader(options.settings, compact)}
      ${renderMetaPanel(metaRows, compact, options.settings)}
      ${renderItemsTable(options.items, compact, options.settings)}
      ${renderTotals({ subtotal: options.subtotal, discount: options.discount, taxAmount: options.taxAmount, total: options.total, paidAmount: options.paidAmount, tenderedAmount: options.tenderedAmount, changeAmount: options.changeAmount, items: options.items, settings: options.settings, compact })}
      ${renderPaymentBreakdown(options.payments, options.settings, compact)}
    `,
    compact,
  };
}
