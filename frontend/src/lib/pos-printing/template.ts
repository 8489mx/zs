import { escapeHtml } from '@/lib/browser';
import { formatCurrency } from '@/lib/format';
import type { AppSettings, Sale } from '@/types/domain';
import { getPrintOption, isCompactReceipt, type PosPrintPageSize } from '@/lib/pos-printing/shared';

function resolveStoreIdentity(settings?: Partial<AppSettings> | null) {
  const brandName = String(settings?.brandName || settings?.storeName || 'متجرك').trim() || 'متجرك';
  const storeName = String(settings?.storeName || settings?.brandName || 'متجرك').trim() || 'متجرك';
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

function renderStoreHeader(settings?: Partial<AppSettings> | null, compact = false) {
  const { brandName } = resolveStoreIdentity(settings);
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
  ].filter(Boolean).join(' ');

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
            <span>${escapeHtml(payment.paymentChannel === 'cash' ? 'نقدي' : payment.paymentChannel === 'card' ? 'بطاقة / فيزا' : payment.paymentChannel === 'wallet' ? 'محفظة إلكترونية' : payment.paymentChannel === 'instapay' ? 'InstaPay' : payment.paymentChannel === 'credit' ? 'آجل' : 'مختلط')}</span>
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

export function getInvoiceStyles(compact = false) {
  return `
    .print-shell { padding: ${compact ? '1px 1mm 2mm' : '4px 1.2mm 2mm'}; }
    .print-header { display: none !important; }
    .print-title { font-size: ${compact ? '14px' : '19px'}; }
    .print-subtitle { margin-top: 1px; font-size: ${compact ? '9px' : '11px'}; min-height: 0; }
    .print-meta-chip { padding: ${compact ? '4px 8px' : '6px 10px'}; font-size: ${compact ? '9.5px' : '11px'}; }
    .print-content { gap: ${compact ? '3px' : '6px'}; }
    .invoice-card {
      border: 0;
      border-bottom: 1px solid #a3a3a3;
      border-radius: 0;
      background: #fff;
      padding: ${compact ? '3px 2px 4px' : '4px 2px 5px'};
      break-inside: avoid;
    }
    .invoice-card.compact { padding: 3px 2px 4px; }
    .invoice-store-card { border-bottom-color: #8c8c8c; }
    .invoice-brand-row { display: flex; align-items: center; justify-content: center; gap: ${compact ? '5px' : '7px'}; }
    .invoice-logo,
    .invoice-logo-fallback {
      width: ${compact ? '76px' : '104px'};
      height: ${compact ? '32px' : '44px'};
      border-radius: ${compact ? '5px' : '6px'};
      border: 1px solid #8a8a8a;
      object-fit: cover;
      flex-shrink: 0;
      background: #fff;
      display: grid;
      place-items: center;
      font-weight: 700;
      color: #111;
      overflow: hidden;
    }
    .invoice-brand-copy { min-width: 0; text-align: center; }
    .invoice-brand-copy h2 {
      margin: 0;
      font-size: ${compact ? '12px' : '19px'};
      line-height: 1.2;
      color: #000;
      font-weight: 800;
    }
    .store-inline-details {
      margin-top: ${compact ? '2px' : '4px'};
      color: #111;
      font-size: ${compact ? '9px' : '10.5px'};
      line-height: 1.35;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      justify-content: center;
      text-align: center;
    }
    .invoice-meta-panel { display: grid; gap: 0; }
    .meta-line {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: baseline;
      gap: 4px;
      padding: ${compact ? '1px 0' : '2px 0'};
      border-bottom: 1px dashed #b1b1b1;
      font-size: ${compact ? '10.5px' : '12px'};
    }
    .meta-line:last-child { border-bottom: 0; }
    .meta-line.strong { font-weight: 700; font-size: ${compact ? '12.5px' : '14px'}; }
    .total-line { color: #0f172a; }
    .meta-label { color: #111; white-space: nowrap; font-weight: 500; }
    .meta-value { text-align: right; font-weight: 400; color: #000; }
    .invoice-items-table { margin-top: 0; width: 100%; border-collapse: collapse; }
    .invoice-items-table th,
    .invoice-items-table td {
      padding: ${compact ? '3px 2px' : '4px 4px'};
      font-size: ${compact ? '10px' : '12px'};
      border: 1px solid #9a9a9a;
      text-align: center;
      white-space: nowrap;
      line-height: 1.15;
    }
    .invoice-items-table .name-cell { text-align: right; white-space: normal; width: 100%; }
    .invoice-items-table td:not(.name-cell) {
      text-align: left;
      font-variant-numeric: tabular-nums;
    }
    .invoice-items-table.compact th,
    .invoice-items-table.compact td { font-size: 9.5px; }
    .invoice-items-table.compact th { font-size: 8.5px; }
    .invoice-items-table.compact th:first-child,
    .invoice-items-table.compact td:first-child { text-align: right; }
    .invoice-payment-card .section-title {
      font-size: ${compact ? '10.5px' : '12px'};
      font-weight: 700;
      margin-bottom: 3px;
    }
    .payment-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(${compact ? '92px' : '120px'}, 1fr));
      gap: 4px;
    }
    .payment-chip {
      border: 0;
      border-bottom: 1px dashed #a8a8a8;
      border-radius: 0;
      padding: ${compact ? '3px 4px' : '5px 6px'};
      display: flex;
      justify-content: space-between;
      gap: 6px;
      font-size: ${compact ? '9.5px' : '11px'};
      background: #fff;
    }
    .payment-chip strong {
      font-variant-numeric: tabular-nums;
      text-align: left;
    }
    .invoice-totals-card .meta-value {
      text-align: left;
      font-variant-numeric: tabular-nums;
      font-feature-settings: "tnum";
      font-weight: 500;
    }
    .invoice-totals-card .meta-line.strong .meta-value {
      font-weight: 700;
    }
    .print-footer {
      margin-top: 4px;
      font-size: ${compact ? '8.8px' : '9.8px'};
      padding-top: 3px;
      padding-bottom: 2.4mm;
      border: 0;
      text-align: center;
    }
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
