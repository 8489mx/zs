import { escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatCurrency } from '@/lib/format';
import type { PosItem } from '@/features/pos/types/pos.types';
import type { Sale, AppSettings } from '@/types/domain';

function paymentLabel(value?: string) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'cash') return 'نقدي';
  if (normalized === 'card') return 'بطاقة';
  if (normalized === 'credit') return 'آجل';
  if (normalized === 'mixed') return 'مختلط';
  return value || 'نقدي';
}

function getPrintOption(settings: Partial<AppSettings> | null | undefined, key: keyof AppSettings, defaultValue = true) {
  const value = settings?.[key];
  return typeof value === 'boolean' ? value : defaultValue;
}

function isCompactReceipt(pageSize?: 'a4' | 'receipt', settings?: Partial<AppSettings> | null) {
  return pageSize === 'receipt' && getPrintOption(settings, 'printCompactReceipt', true);
}

function formatDateTime(value?: string) {
  if (!value) return new Date().toLocaleString('ar-EG');
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('ar-EG');
}

function resolveStoreIdentity(settings?: Partial<AppSettings> | null) {
  const brandName = String(settings?.brandName || settings?.storeName || 'متجرك').trim() || 'متجرك';
  const storeName = String(settings?.storeName || settings?.brandName || 'متجرك').trim() || 'متجرك';
  return { brandName, storeName };
}

function defaultInvoiceFooter(settings?: Partial<AppSettings> | null) {
  const configured = String(settings?.invoiceFooter || '').trim();
  if (configured) return configured;
  return 'يرجى الاحتفاظ بالفاتورة. الاستبدال والاسترجاع حسب سياسة المتجر.';
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

function renderStoreHeader(settings?: Partial<AppSettings> | null, compact = false) {
  const { brandName, storeName } = resolveStoreIdentity(settings);
  const showLogo = getPrintOption(settings, 'printShowLogo', true);
  const showPhone = getPrintOption(settings, 'printShowPhone', true);
  const showAddress = getPrintOption(settings, 'printShowAddress', true);
  const showTaxNumber = getPrintOption(settings, 'printShowTaxNumber', false);
  const phone = showPhone ? String(settings?.phone || '').trim() : '';
  const address = showAddress ? String(settings?.address || '').trim() : '';
  const taxNumber = showTaxNumber ? String(settings?.taxNumber || '').trim() : '';
  const logoData = showLogo ? String(settings?.logoData || '').trim() : '';

  const details = [
    phone ? `<span>الهاتف: ${escapeHtml(phone)}</span>` : '',
    address ? `<span>العنوان: ${escapeHtml(address)}</span>` : '',
    taxNumber ? `<span>ض.م: ${escapeHtml(taxNumber)}</span>` : '',
  ].filter(Boolean).join('<span class="dot">•</span>');

  const adaptiveBrandFontSize = getAdaptiveBrandFontSize(brandName, compact);

  return `
    <section class="invoice-card invoice-store-card${compact ? ' compact' : ''}">
      <div class="invoice-brand-row">
        ${logoData ? `<img class="invoice-logo" src="${escapeHtml(logoData)}" alt="شعار المتجر" />` : `<div class="invoice-logo-fallback">${escapeHtml(brandName.slice(0, 1).toUpperCase())}</div>`}
        <div class="invoice-brand-copy">
          <h2 title="${escapeHtml(brandName)}" style="font-size:${adaptiveBrandFontSize}">${escapeHtml(brandName)}</h2>
          ${storeName && storeName !== brandName ? `<div class="store-subtitle">${escapeHtml(storeName)}</div>` : ''}
          ${details ? `<div class="store-inline-details">${details}</div>` : ''}
        </div>
      </div>
    </section>
  `;
}

function renderMetaPanel(rows: Array<{ label: string; value?: string | number | null }>, compact = false) {
  const visibleRows = rows.filter((row) => String(row.value ?? '').trim());
  if (!visibleRows.length) return '';
  return `
    <section class="invoice-card invoice-meta-panel${compact ? ' compact' : ''}">
      ${visibleRows.map((row) => `
        <div class="meta-line">
          <span class="meta-label">${escapeHtml(row.label)}:</span>
          <span class="meta-value">${escapeHtml(String(row.value ?? '—'))}</span>
        </div>
      `).join('')}
    </section>
  `;
}

function renderItemsTable(items: Array<{ name?: string; unitName?: string; qty?: number; price?: number; total?: number }>, compact = false) {
  const body = (items || []).map((item, index) => `
    <tr>
      ${compact ? '' : `<td class="index-cell">${index + 1}</td>`}
      <td class="name-cell">${escapeHtml(item.name || '—')}</td>
      ${compact ? '' : `<td>${escapeHtml(item.unitName || 'قطعة')}</td>`}
      <td>${Number(item.qty || 0)}</td>
      <td>${formatCurrency(Number(item.price || 0))}</td>
      <td>${formatCurrency(Number(item.total || 0))}</td>
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
            <span>${escapeHtml(paymentLabel(payment.paymentChannel))}</span>
            <strong>${formatCurrency(Number(payment.amount || 0))}</strong>
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
  items: Array<{ qty?: number }>;
  settings?: Partial<AppSettings> | null;
  compact?: boolean;
}) {
  const totalPieces = (options.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const paidAmount = Number(options.paidAmount || 0);
  const remaining = Math.max(0, Number(options.total || 0) - paidAmount);
  const showTax = getPrintOption(options.settings, 'printShowTax', true);
  const showItemSummary = getPrintOption(options.settings, 'printShowItemSummary', true);
  const hasDiscount = Math.abs(Number(options.discount || 0)) > 0.0001;

  const rows = [
    { label: 'الإجمالي قبل الضريبة', value: formatCurrency(Number(options.subtotal || 0)) },
    ...(hasDiscount ? [{ label: 'الخصم', value: formatCurrency(Number(options.discount || 0)) }] : []),
    ...(showTax ? [{ label: 'الضريبة', value: formatCurrency(Number(options.taxAmount || 0)) }] : []),
    { label: 'الإجمالي النهائي', value: formatCurrency(Number(options.total || 0)), strong: true },
    { label: 'المدفوع', value: formatCurrency(paidAmount) },
    ...(remaining > 0 ? [{ label: 'المتبقي', value: formatCurrency(remaining) }] : []),
    ...(showItemSummary ? [
      { label: 'عدد البنود', value: String(Number(options.items?.length || 0)) },
      { label: 'إجمالي القطع', value: String(totalPieces) },
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

function getInvoiceStyles(compact = false) {
  return `
    .print-shell { padding: ${compact ? '4px' : '12px'}; }
    .print-header { display: none !important; }
    .print-title { font-size: ${compact ? '14px' : '19px'}; }
    .print-subtitle { margin-top: 1px; font-size: ${compact ? '9px' : '11px'}; min-height: 0; }
    .print-meta-chip { padding: ${compact ? '4px 8px' : '6px 10px'}; font-size: ${compact ? '9.5px' : '11px'}; }
    .print-content { gap: ${compact ? '5px' : '8px'}; }
    .invoice-card {
      border: 1px solid var(--print-border);
      border-radius: ${compact ? '10px' : '14px'};
      padding: ${compact ? '7px' : '11px'};
      background: #fff;
    }
    .invoice-store-card { background: rgba(248,250,252,.55); }
    .invoice-brand-row {
      display: flex;
      align-items: center;
      gap: ${compact ? '8px' : '12px'};
    }
    .invoice-logo,
    .invoice-logo-fallback {
      width: ${compact ? '38px' : '54px'};
      height: ${compact ? '38px' : '54px'};
      border-radius: ${compact ? '10px' : '14px'};
      border: 1px solid var(--print-border);
      object-fit: cover;
      background: #fff;
      flex: 0 0 auto;
    }
    .invoice-logo-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${compact ? '17px' : '24px'};
      font-weight: 700;
      color: var(--print-accent);
      background: rgba(37,99,235,.08);
    }
    .invoice-brand-copy {
      min-width: 0;
      flex: 1;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .invoice-brand-copy h2 {
      margin: 0;
      line-height: 1.1;
      white-space: nowrap;
      letter-spacing: -0.2px;
    }
    .store-subtitle {
      margin-top: 2px;
      color: var(--print-muted);
      font-size: ${compact ? '9.5px' : '11px'};
      text-align: center;
    }
    .store-inline-details {
      margin-top: ${compact ? '4px' : '6px'};
      color: var(--print-muted);
      font-size: ${compact ? '9px' : '10.5px'};
      line-height: 1.5;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      justify-content: center;
      text-align: center;
    }
    .store-inline-details .dot { opacity: .65; }
    .invoice-meta-panel { display: grid; gap: ${compact ? '1px' : '2px'}; }
    .meta-line {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 10px;
      padding: ${compact ? '2px 0' : '3px 0'};
      border-bottom: 1px dashed rgba(148,163,184,.35);
      font-size: ${compact ? '10.5px' : '12px'};
    }
    .meta-line:last-child { border-bottom: 0; }
    .meta-line.strong { font-weight: 700; font-size: ${compact ? '12.5px' : '14px'}; }
    .total-line { color: #0f172a; }
    .meta-label { color: var(--print-muted); white-space: nowrap; }
    .meta-value { text-align: left; font-weight: 600; }
    .invoice-items-table { margin-top: 0; width: 100%; border-collapse: collapse; }
    .invoice-items-table th,
    .invoice-items-table td {
      padding: ${compact ? '4px 3px' : '8px 6px'};
      font-size: ${compact ? '10px' : '12px'};
      border: 1px solid var(--print-border);
      text-align: center;
    }
    .invoice-items-table .name-cell { text-align: right; }
    .invoice-items-table.compact th,
    .invoice-items-table.compact td { font-size: 9.5px; }
    .invoice-items-table.compact th:first-child,
    .invoice-items-table.compact td:first-child { text-align: right; }
    .invoice-payment-card .section-title {
      font-size: ${compact ? '10.5px' : '12px'};
      font-weight: 700;
      margin-bottom: 5px;
    }
    .payment-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(${compact ? '92px' : '120px'}, 1fr));
      gap: 6px;
    }
    .payment-chip {
      border: 1px solid var(--print-border);
      border-radius: 10px;
      padding: ${compact ? '5px' : '8px'};
      display: flex;
      justify-content: space-between;
      gap: 6px;
      font-size: ${compact ? '9.5px' : '11px'};
      background: rgba(248,250,252,.55);
    }
    .print-footer {
      margin-top: 8px;
      font-size: ${compact ? '9.5px' : '11px'};
      padding-top: 8px;
      text-align: center;
    }
    body.receipt-mode .print-shell { max-width: 80mm; padding-top: 0; }
    body.receipt-mode .print-header { display: none !important; }
    body.receipt-mode .print-title-wrap { min-width: 0; }
  `;
}

function buildReceiptDocument(options: {
  pageSize?: 'a4' | 'receipt';
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
    ...(showLocation ? [{ label: 'الموقع', value: options.locationName || 'المخزن الأساسي' }] : []),
    ...(options.note ? [{ label: 'ملاحظة', value: options.note }] : []),
  ];

  return {
    html: `
      ${renderStoreHeader(options.settings, compact)}
      ${renderMetaPanel(metaRows, compact)}
      ${renderItemsTable(options.items, compact)}
      ${renderTotals({
        subtotal: options.subtotal,
        discount: options.discount,
        taxAmount: options.taxAmount,
        total: options.total,
        paidAmount: options.paidAmount,
        items: options.items,
        settings: options.settings,
        compact,
      })}
      ${renderPaymentBreakdown(options.payments, options.settings, compact)}
    `,
    compact,
  };
}

export function printPosDraftPreview(options: {
  title?: string;
  customerName?: string;
  paymentLabel?: string;
  branchName?: string;
  locationName?: string;
  items: PosItem[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  note?: string;
  pageSize?: 'a4' | 'receipt';
  settings?: Partial<AppSettings> | null;
}) {
  const document = buildReceiptDocument({
    pageSize: options.pageSize,
    settings: options.settings,
    documentLabel: options.pageSize === 'receipt' ? 'إيصال بيع' : 'فاتورة بيع',
    documentNumber: 'مسودة',
    dateText: formatDateTime(),
    customerName: options.customerName || 'عميل نقدي',
    paymentText: paymentLabel(options.paymentLabel),
    branchName: options.branchName || 'المتجر الرئيسي',
    locationName: options.locationName || 'المخزن الأساسي',
    note: options.note,
    items: (options.items || []).map((item) => ({
      name: item.name,
      unitName: item.unitName,
      qty: Number(item.qty || 0),
      price: Number(item.price || 0),
      total: Number(item.qty || 0) * Number(item.price || 0),
    })),
    subtotal: Number(options.subtotal || 0),
    discount: Number(options.discount || 0),
    taxAmount: Number(options.taxAmount || 0),
    total: Number(options.total || 0),
    paidAmount: Number(options.total || 0),
  });

  printHtmlDocument(options.title || (options.pageSize === 'receipt' ? 'معاينة إيصال البيع' : 'معاينة فاتورة الكاشير'), document.html, {
    subtitle: options.pageSize === 'receipt' ? '' : 'معاينة جاهزة للطباعة',
    footerHtml: getPrintOption(options.settings, 'printShowFooter', true) ? escapeHtml(defaultInvoiceFooter(options.settings)) : '',
    pageSize: options.pageSize === 'receipt' ? 'receipt' : 'A4',
    extraStyles: getInvoiceStyles(document.compact),
  });
}

export function printPostedSaleReceipt(
  sale: Sale,
  options: { pageSize?: 'a4' | 'receipt'; settings?: Partial<AppSettings> | null } = {},
) {
  const document = buildReceiptDocument({
    pageSize: options.pageSize,
    settings: options.settings,
    documentLabel: options.pageSize === 'receipt' ? 'إيصال بيع' : 'فاتورة بيع',
    documentNumber: sale.docNo || sale.id,
    dateText: formatDateTime(sale.date),
    customerName: sale.customerName || 'عميل نقدي',
    paymentText: paymentLabel(sale.paymentChannel || sale.paymentType),
    cashierName: sale.createdBy || '—',
    branchName: sale.branchName || 'المتجر الرئيسي',
    locationName: sale.locationName || 'المخزن الأساسي',
    note: sale.note || '',
    items: (sale.items || []).map((item) => ({
      name: item.name,
      unitName: item.unitName,
      qty: Number(item.qty || 0),
      price: Number(item.price || 0),
      total: Number(item.total || 0),
    })),
    subtotal: Number(sale.subTotal || 0),
    discount: Number(sale.discount || 0),
    taxAmount: Number(sale.taxAmount || 0),
    total: Number(sale.total || 0),
    paidAmount: Number(sale.paidAmount || 0),
    payments: sale.payments,
  });

  printHtmlDocument(`${options.pageSize === 'receipt' ? 'إيصال بيع' : 'فاتورة'} ${sale.docNo || sale.id}`, document.html, {
    subtitle: '',
    footerHtml: getPrintOption(options.settings, 'printShowFooter', true) ? escapeHtml(defaultInvoiceFooter(options.settings)) : '',
    pageSize: options.pageSize === 'receipt' ? 'receipt' : 'A4',
    extraStyles: getInvoiceStyles(document.compact),
  });
}
