import { escapeHtml } from '@/lib/browser';
import type { AppSettings, Sale } from '@/types/domain';
import { getPrintOption, getReceiptNumberLocale, isCompactReceipt, getReceiptTheme, type PosPrintPageSize } from '@/lib/pos-printing/shared';

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

export function formatReceiptQuantity(value: number, settings?: Partial<AppSettings> | null) {
  return new Intl.NumberFormat(getNumberLocale(settings), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
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
      <div class="invoice-brand-row"${!logoData ? ' style="justify-content:center;"' : ''}>
        ${logoData ? `<div class="invoice-logo-wrapper"><img class="invoice-logo" src="${escapeHtml(logoData)}" alt="شعار المتجر" /></div>` : ''}
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

function renderItemsTable(items: Array<{ name?: string; unitName?: string; qty?: number; price?: number; total?: number; modifiers?: any[]; serials?: string[] }>, compact = false, settings?: Partial<AppSettings> | null) {
  const body = (items || []).map((item, index) => {
    const modifiersHtml = item.modifiers?.length 
      ? `<div class="item-modifiers" style="font-size: 0.85em; color: #000; margin-top: 2px;">
          ${item.modifiers.map((mod: any) => {
            const modPrice = Number(mod.price || 0);
            const modQty = Number(mod.qty || 1);
            const modTotal = modPrice * modQty;
            return `<div style="padding: 2px 0; color: #000; font-size: 0.9em; margin-right: 8px;">
              <strong style="color: #000;">[إضافة]</strong> ${escapeHtml(mod.name)}
              ${modQty > 1 ? ` <span style="color:#000; font-size: 0.9em;">(×${modQty})</span>` : ''}
              ${modTotal > 0 ? ` <span style="font-weight:600; color:#000;">(+${formatReceiptMoney(modTotal, settings)})</span>` : ''}
            </div>`;
          }).join('')}
         </div>`
      : '';
    const serialsHtml = item.serials?.length
      ? `<div class="item-serials" style="font-size: 0.8em; color: #000; margin-top: 2px; font-family: monospace;">
          <strong>IMEI:</strong> ${item.serials.map(escapeHtml).join(', ')}
         </div>`
      : '';
    return `
    <tr>
      ${compact ? '' : `<td class="index-cell">${formatReceiptNumber(index + 1, settings)}</td>`}
      <td class="name-cell">${escapeHtml(item.name || '—')}${modifiersHtml}${serialsHtml}</td>
      ${compact ? '' : `<td>${escapeHtml(item.unitName || 'قطعة')}</td>`}
      <td>${formatReceiptQuantity(Number(item.qty || 0), settings)}</td>
      <td>${formatReceiptMoney(Number(item.price || 0), settings)}</td>
      <td>${formatReceiptMoney(Number(item.total || 0), settings)}</td>
    </tr>
    `;
  }).join('');

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
  deliveryFee?: number;
  taxAmount: number;
  total: number;
  paidAmount?: number;
  tenderedAmount?: number;
  changeAmount?: number;
  items: Array<{ qty?: number }>;
  settings?: Partial<AppSettings> | null;
  compact?: boolean;
  isReturn?: boolean;
}) {
  const totalPieces = (options.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const paidAmount = Number(options.paidAmount || 0);
  const tenderedAmount = Number(options.tenderedAmount || 0);
  const changeAmount = Number(options.changeAmount || 0);
  const remaining = Math.max(0, Number(options.total || 0) - paidAmount);
  const showTax = getPrintOption(options.settings, 'printShowTax', true);
  const showItemSummary = getPrintOption(options.settings, 'printShowItemSummary', true);
  const showPaymentDetails = getPrintOption(options.settings, 'printShowPaymentBreakdown', true);
  const hasDiscount = Math.abs(Number(options.discount || 0)) > 0.0001;
  const hasDeliveryFee = Math.abs(Number(options.deliveryFee || 0)) > 0.0001;
  
  let discountLabel = 'الخصم';
  if (hasDiscount && Number(options.subtotal || 0) > 0) {
    const rawPercent = (options.discount / options.subtotal) * 100;
    const cleanPercent = Math.round(rawPercent);
    const expectedDiscount = (cleanPercent / 100) * options.subtotal;
    if (cleanPercent > 0 && Math.abs(expectedDiscount - options.discount) <= 0.02) {
      discountLabel = `الخصم (${formatReceiptText(cleanPercent, options.settings)}%)`;
    }
  }

  const rows = options.isReturn ? [
    ...(showTax && Number(options.taxAmount || 0) > 0 ? [
      { label: 'الإجمالي قبل الضريبة', value: formatReceiptMoney(Number(options.subtotal || 0), options.settings) },
      { label: 'الضريبة', value: formatReceiptMoney(Number(options.taxAmount || 0), options.settings) },
    ] : []),
    { label: 'إجمالي المبلغ المسترد للعميل', value: formatReceiptMoney(Number(options.total || paidAmount || 0), options.settings), strong: true },
    ...(showItemSummary ? [
      { label: 'عدد البنود', value: formatReceiptNumber(Number(options.items?.length || 0), options.settings) },
      { label: 'إجمالي القطع', value: formatReceiptQuantity(totalPieces, options.settings) },
    ] : []),
  ] : [
    ...(showTax ? [{ label: 'الإجمالي قبل الضريبة', value: formatReceiptMoney(Number(options.subtotal || 0), options.settings) }] : []),
    ...(hasDiscount ? [{ label: discountLabel, value: formatReceiptMoney(Number(options.discount || 0), options.settings) }] : []),
    ...(hasDeliveryFee ? [{ label: 'التوصيل', value: formatReceiptMoney(Number(options.deliveryFee || 0), options.settings) }] : []),
    ...(showTax ? [{ label: 'الضريبة', value: formatReceiptMoney(Number(options.taxAmount || 0), options.settings) }] : []),
    { label: 'الإجمالي النهائي', value: formatReceiptMoney(Number(options.total || 0), options.settings), strong: true },
    ...(showPaymentDetails ? [
      { label: 'المدفوع', value: formatReceiptMoney(paidAmount, options.settings) },
      ...(remaining > 0 ? [{ label: 'المتبقي', value: formatReceiptMoney(remaining, options.settings) }] : []),
      ...(tenderedAmount > 0 ? [{ label: 'المستلم نقديًا', value: formatReceiptMoney(tenderedAmount, options.settings) }] : []),
      ...(changeAmount > 0 ? [{ label: 'الباقي', value: formatReceiptMoney(changeAmount, options.settings) }] : []),
    ] : []),
    ...(showItemSummary ? [
      { label: 'عدد البنود', value: formatReceiptNumber(Number(options.items?.length || 0), options.settings) },
      { label: 'إجمالي القطع', value: formatReceiptQuantity(totalPieces, options.settings) },
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
      background: #fff;
      padding: ${compact ? '5px 5px' : '7px 7px'};
      break-inside: avoid;
      overflow: hidden;
    }
    .invoice-card.compact { padding: 5px; }
    .invoice-brand-row { display: flex; align-items: stretch; justify-content: space-between; gap: ${compact ? '7px' : '10px'}; min-height: ${compact ? '48px' : '60px'}; }
    .invoice-logo-wrapper {
      position: relative;
      width: ${compact ? '75px' : '110px'};
      min-height: ${compact ? '48px' : '60px'};
      flex-shrink: 0;
    }
    .invoice-logo,
    .invoice-logo-fallback {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border-radius: 0;
      object-fit: contain;
      object-position: right center;
      background: transparent;
      display: grid;
      place-items: center;
      font-weight: 800;
      color: #000;
      overflow: hidden;
    }
    .invoice-brand-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; justify-content: center; text-align: center; }
    .invoice-brand-copy h2 { margin: 0; line-height: 1.15; color: #000; font-weight: 900; overflow-wrap: anywhere; }
    .store-inline-details { margin-top: ${compact ? '3px' : '5px'}; color: #000; font-size: ${compact ? '8.8px' : '10.2px'}; line-height: 1.35; display: grid; gap: 1px; justify-items: center; text-align: center; }
    .invoice-meta-panel { display: grid; gap: 0; }
    .meta-line { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: ${compact ? '2px 0' : '3px 0'}; border-bottom: 1px dotted #000; font-size: ${compact ? '10.3px' : '11.8px'}; line-height: 1.3; }
    .meta-line:last-child { border-bottom: 0; }
    .meta-line.strong { font-weight: 800; font-size: ${compact ? '12.5px' : '14px'}; }
    .meta-label { color: #000; white-space: nowrap; font-weight: 700; text-align: right; }
    .meta-value { text-align: left; font-weight: 500; color: #000; overflow-wrap: anywhere; }
    .invoice-items-card { padding: 0; }
    .invoice-items-table { margin: 0; width: 100%; border-collapse: collapse; table-layout: auto; }
    .invoice-items-table th,
    .invoice-items-table td { padding: ${compact ? '4px 2px' : '5px 4px'}; font-size: ${compact ? '9.6px' : '11.5px'}; border-bottom: 1px solid #000; text-align: center; white-space: nowrap; line-height: 1.2; }
    .invoice-items-table th:last-child,
    .invoice-items-table td:last-child { border-inline-start: 0; }
    .invoice-items-table tbody tr:last-child td { border-bottom: 0; }
    .invoice-items-table th { background: #000; color: #fff; font-weight: 800; }
    .invoice-items-table .name-cell { text-align: right; white-space: normal; width: 100%; min-width: 72px; overflow-wrap: anywhere; }
    .invoice-items-table td:not(.name-cell) { text-align: left; font-variant-numeric: tabular-nums; }
    .invoice-items-table.compact th,
    .invoice-items-table.compact td { font-size: 9.4px; }
    .invoice-items-table.compact th { font-size: 8.7px; }
    .invoice-items-table.compact th:first-child,
    .invoice-items-table.compact td:first-child { text-align: right; }
    .invoice-totals-card { padding-top: ${compact ? '4px' : '6px'}; padding-bottom: ${compact ? '4px' : '6px'}; border-top: 1px dashed #000; }
    .invoice-totals-card .meta-value { text-align: left; font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; font-weight: 600; }
    .invoice-totals-card .total-line { margin: ${compact ? '2px -2px' : '3px -3px'}; padding: ${compact ? '5px 4px' : '7px 5px'}; font-size: ${compact ? '14px' : '17px'}; background: transparent; }
    .invoice-totals-card .meta-line.strong .meta-value { font-weight: 900; }
    .invoice-payment-card { border-top: 1px dashed #000; }
    .invoice-payment-card .section-title { font-size: ${compact ? '11px' : '12.5px'}; font-weight: 900; text-align: center; padding-bottom: 4px; margin-bottom: 2px; }
    .payment-grid { display: grid; gap: 0; }
    .payment-chip { padding: ${compact ? '3px 0' : '4px 0'}; display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-size: ${compact ? '10px' : '11.3px'}; border-bottom: 1px dotted #000; background: transparent; }
    .payment-chip:last-child { border-bottom: 0; }
    .payment-chip strong { font-variant-numeric: tabular-nums; text-align: left; font-weight: 800; }
    .print-footer { margin-top: 5px; font-size: ${compact ? '8.8px' : '9.8px'}; padding: ${compact ? '5px 4px' : '7px 5px'}; border-top: 1px dashed #000; text-align: center; line-height: 1.35; }
    
    /* Theme: Boxed */
    .receipt-theme-boxed .invoice-card { border: 1px solid #000; border-radius: ${compact ? '6px' : '8px'}; margin-bottom: 4px; }
    .receipt-theme-boxed .invoice-totals-card, .receipt-theme-boxed .invoice-payment-card { border-top: 0; }
    .receipt-theme-boxed .invoice-totals-card .total-line { border: 1px dashed #000; border-radius: 8px; font-size: inherit; }
    .receipt-theme-boxed .invoice-items-table th, .receipt-theme-boxed .invoice-items-table td { border-inline-start: 1px solid #000; }
    .receipt-theme-boxed .invoice-items-table th:last-child, .receipt-theme-boxed .invoice-items-table td:last-child { border-inline-start: 0; }
    .receipt-theme-boxed .invoice-payment-card .section-title { border-bottom: 1px solid #000; }
    .receipt-theme-boxed .print-footer { border: 1px dashed #000; border-radius: 8px; }
    
    /* Theme: Ultra Compact */
    .receipt-theme-ultra-compact .invoice-card { padding: 0; background: transparent; }
    .receipt-theme-ultra-compact .print-content { gap: 0; }
    .receipt-theme-ultra-compact .invoice-brand-row { display: block; text-align: center; gap: 0; }
    .receipt-theme-ultra-compact .invoice-meta-panel { display: block; text-align: center; margin-bottom: 2px; }
    .receipt-theme-ultra-compact .invoice-logo-wrapper { width: 50px; height: 50px; min-height: 50px; margin: 0 auto 4px auto; }
    .receipt-theme-ultra-compact .invoice-brand-copy h2 { font-size: 14px; }
    .receipt-theme-ultra-compact .store-inline-details { display: inline; font-size: 9px; }
    .receipt-theme-ultra-compact .store-inline-details span { display: inline; }
    .receipt-theme-ultra-compact .store-inline-details span::after { content: " - "; }
    .receipt-theme-ultra-compact .store-inline-details span:last-child::after { content: ""; }
    .receipt-theme-ultra-compact .meta-line { display: inline; border: none; padding: 0; font-size: 10px; }
    .receipt-theme-ultra-compact .meta-line::after { content: " | "; margin: 0 3px; font-weight: normal; font-size: 9px; }
    .receipt-theme-ultra-compact .meta-line:last-child::after { content: ""; margin: 0; }
    .receipt-theme-ultra-compact .meta-line.strong { font-size: 12px; }
    .receipt-theme-ultra-compact .invoice-items-table th, .receipt-theme-ultra-compact .invoice-items-table td { padding: 2px 1px; font-size: 9.5px; border-bottom: 1px dotted #000; }
    .receipt-theme-ultra-compact .invoice-items-table th { background: transparent; color: #000; border-bottom: 1px solid #000; border-top: 1px dashed #000; }
    .receipt-theme-ultra-compact .invoice-totals-card { padding: 2px 0; }
    .receipt-theme-ultra-compact .invoice-totals-card .total-line { margin: 0; padding: 2px 0; font-size: 12.5px; border-bottom: 1px dashed #000; }
    .receipt-theme-ultra-compact .payment-chip { padding: 1px 0; font-size: 10px; border-bottom: 1px dotted #000; }
    .receipt-theme-ultra-compact .print-footer { margin-top: 2px; padding: 2px 0; border: 0; border-top: 1px dashed #000; font-size: 8.5px; }
    .receipt-theme-ultra-compact .meta-label, .receipt-theme-ultra-compact .meta-value { white-space: normal; overflow: hidden; }

    body.receipt-mode .print-shell { width: 100%; max-width: 100%; padding-top: 0; margin: 0; box-sizing: border-box; }
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
  customerPhone?: string;
  customerAddress?: string;
  supplierName?: string;
  paymentText?: string;
  cashierName?: string;
  branchName?: string;
  locationName?: string;
  tableNumber?: string | null;
  orderType?: string | null;
  deliveryRepName?: string;
  referenceInvoice?: string;
  isReturn?: boolean;
  isPurchase?: boolean;
  note?: string;
  items: Array<{ name?: string; unitName?: string; qty?: number; price?: number; total?: number; modifiers?: any[] }>;
  subtotal: number;
  discount: number;
  deliveryFee?: number;
  taxAmount: number;
  total: number;
  paidAmount?: number;
  tenderedAmount?: number;
  changeAmount?: number;
  payments?: Sale['payments'];
}) {
  const compact = isCompactReceipt(options.pageSize, options.settings);
  const showCustomer = getPrintOption(options.settings, 'printShowCustomer', true);
  const showDeliveryCustomerDetails = getPrintOption(options.settings, 'printShowDeliveryCustomerDetails', true);
  const showCashier = getPrintOption(options.settings, 'printShowCashier', true);
  const showBranch = getPrintOption(options.settings, 'printShowBranch', true);
  const showLocation = getPrintOption(options.settings, 'printShowLocation', true);
  const showPaymentMethod = getPrintOption(options.settings, 'printShowPaymentMethod', true);
  const showDocumentType = getPrintOption(options.settings, 'printShowDocumentType', true);
  const showDocumentNumber = getPrintOption(options.settings, 'printShowDocumentNumber', true);
  const showOrderType = getPrintOption(options.settings, 'printShowOrderType', true);

  const partyLabel = options.isPurchase ? 'المورد' : (options.isReturn ? 'العميل' : 'العميل');
  const partyValue = options.isPurchase
    ? (options.supplierName || options.customerName || '—')
    : (options.customerName || 'عميل نقدي');

  const metaRows = [
    ...(showDocumentType ? [{ label: 'نوع المستند', value: options.documentLabel || (options.isPurchase ? 'فاتورة شراء' : (options.isReturn ? 'إيصال مرتجع مبيعات' : 'فاتورة')) }] : []),
    ...(showDocumentNumber ? [{ label: 'رقم المستند', value: options.documentNumber ? String(options.documentNumber) : '—' }] : []),
    ...(options.referenceInvoice ? [{ label: 'مرجع الفاتورة الأصلية', value: options.referenceInvoice }] : []),
    { label: 'التاريخ', value: options.dateText || '—' },
    ...(showCustomer ? [{ label: partyLabel, value: partyValue }] : []),
    ...(showDeliveryCustomerDetails && options.orderType === 'delivery' && options.customerPhone ? [{ label: 'هاتف العميل', value: options.customerPhone }] : []),
    ...(showDeliveryCustomerDetails && options.orderType === 'delivery' && options.customerAddress ? [{ label: 'عنوان العميل', value: options.customerAddress }] : []),
    ...(showPaymentMethod ? [{ label: options.isReturn ? 'طريقة رد المبلغ' : (options.isPurchase ? 'طريقة السداد' : 'طريقة الدفع'), value: options.paymentText || 'نقدي' }] : []),
    ...(options.isPurchase
      ? (options.cashierName && options.cashierName !== '—' ? [{ label: 'المسؤول', value: options.cashierName }] : [])
      : (showCashier ? [{ label: 'الكاشير', value: options.cashierName || '—' }] : [])),
    ...(showBranch ? [{ label: 'الفرع', value: options.branchName || 'المتجر الرئيسي' }] : []),
    ...(showLocation ? [{ label: 'المخزن', value: options.locationName || 'المخزن الأساسي' }] : []),
    ...(options.settings?.restaurantModuleEnabled && options.orderType === 'dine_in' && options.tableNumber ? [{ label: 'الطاولة', value: String(options.tableNumber) }] : []),
    ...(options.settings?.restaurantModuleEnabled && !options.isReturn && !options.isPurchase && options.orderType && showOrderType ? [{ label: 'نوع الطلب', value: options.orderType === 'dine_in' ? 'صالة' : options.orderType === 'delivery' ? 'دليفري' : 'تيك أواي' }] : []),
    ...(options.settings?.printDeliveryRepOnReceipt && options.deliveryRepName ? [{ label: 'المندوب', value: options.deliveryRepName }] : []),
    ...(options.note ? [{ label: 'ملاحظة', value: options.note }] : []),
  ];

  const theme = getReceiptTheme(options.pageSize, options.settings);
  return {
    html: `
      <div class="receipt-theme-${theme}">
        ${renderStoreHeader(options.settings, compact)}
        ${renderMetaPanel(metaRows, compact, options.settings)}
        ${renderItemsTable(options.items, compact, options.settings)}
        ${renderTotals({ subtotal: options.subtotal, discount: options.discount, deliveryFee: options.deliveryFee, taxAmount: options.taxAmount, total: options.total, paidAmount: options.paidAmount, tenderedAmount: options.tenderedAmount, changeAmount: options.changeAmount, items: options.items, settings: options.settings, compact, isReturn: options.isReturn })}
        ${renderPaymentBreakdown(options.payments, options.settings, compact)}
      </div>
    `,
    compact,
  };
}
