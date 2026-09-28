import { escapeHtml } from '@/lib/browser/escape';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { buildCode128Svg } from '@/lib/barcode';
import { printSmallReceiptDocument } from '@/lib/small-receipt-printer';

export interface VanSaleReceiptItem {
  productId: number;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal?: number;
  unitName?: string;
}

export interface VanSaleReceiptData {
  docNo: string;
  saleId?: number;
  total: number;
  paymentMethod: 'cash' | 'credit' | 'card' | 'split';
  paidAmount?: number;
  cashPaid?: number;
  remainingCredit?: number;
  creditOwed?: number;
  customerName: string;
  customerPhone?: string;
  customerCode?: string;
  customerAddress?: string;
  itemsCount?: number;
  packagingBreakdown?: {
    cartonsCount?: number;
    piecesCount?: number;
    itemsCount?: number;
  };
  deliveryProofPhoto?: string;
  items?: VanSaleReceiptItem[];
  repName?: string;
  vehiclePlate?: string;
  warehouseName?: string;
  date?: string;
}

export function buildVanSaleThermalReceiptHtml(
  receipt: VanSaleReceiptData,
  options: { storeName?: string; currency?: string } = {}
): string {
  const storeName = options.storeName?.trim() || 'مبيعات التوزيع الميداني';
  const currency = options.currency || getGlobalCurrencySymbol();

  const now = receipt.date ? new Date(receipt.date) : new Date();
  const dateStr = now.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });

  let itemsHtml = '';
  if (receipt.items && receipt.items.length > 0) {
    const rows = receipt.items
      .map((it) => {
        const itemLineTotal = Number(it.lineTotal != null ? it.lineTotal : it.qty * it.unitPrice);
        return `
        <tr style="border-bottom: 1px dotted #ccc;">
          <td style="text-align: right; padding: 3px 0; font-weight: 700; font-size: 10px; line-height: 1.25;">
            ${escapeHtml(it.name)}
          </td>
          <td style="text-align: center; padding: 3px 0; font-size: 10px;">
            ${it.qty}${it.unitName ? ' ' + escapeHtml(it.unitName) : ''}
          </td>
          <td style="text-align: center; padding: 3px 0; font-size: 10px;">
            ${Number(it.unitPrice).toFixed(2)}
          </td>
          <td style="text-align: left; padding: 3px 0; font-weight: 700; font-size: 10px;">
            ${itemLineTotal.toFixed(2)}
          </td>
        </tr>`;
      })
      .join('');

    itemsHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 4px 0;">
        <thead>
          <tr style="border-bottom: 1px solid #000; font-size: 9.5px; font-weight: 800;">
            <th style="text-align: right; padding: 2px 0;">الصنف</th>
            <th style="text-align: center; padding: 2px 0; width: 42px;">الكمية</th>
            <th style="text-align: center; padding: 2px 0; width: 48px;">السعر</th>
            <th style="text-align: left; padding: 2px 0; width: 54px;">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  } else {
    itemsHtml = `
      <div style="text-align: center; font-size: 10px; color: #444; padding: 6px 0; border-bottom: 1px dashed #000;">
        إجمالي البنود المباعة: <b>${receipt.itemsCount || 1}</b>
      </div>
    `;
  }

  let barcodeSvg = '';
  if (receipt.docNo) {
    try {
      barcodeSvg = buildCode128Svg(receipt.docNo);
    } catch {}
  }

  const packaging = receipt.packagingBreakdown;
  const isCash = receipt.paymentMethod === 'cash';
  const isCard = receipt.paymentMethod === 'card';
  const isSplit = receipt.paymentMethod === 'split';
  const paidCash = receipt.paidAmount != null ? receipt.paidAmount : (receipt.cashPaid != null ? receipt.cashPaid : 0);
  const remainingDebt = receipt.remainingCredit != null ? receipt.remainingCredit : (receipt.creditOwed != null ? receipt.creditOwed : Math.max(0, Number(receipt.total) - paidCash));

  const paymentMethodLabel =
    isCash
      ? 'نقدي (مسلم للمندوب)'
      : isCard
      ? 'شبكة / فيزا'
      : isSplit
      ? 'دفع مركب (نقدي + آجل)'
      : 'آجل (على حساب العميل)';

  return `
    <!-- HEADER -->
    <div style="text-align: center; border-bottom: 1.5px dashed #000; padding-bottom: 5px; margin-bottom: 6px;">
      <div style="font-size: 13.5px; font-weight: 800; margin-bottom: 2px; line-height: 1.2;">
        ${escapeHtml(storeName)}
      </div>
      <div style="font-size: 11px; font-weight: 700; color: #222;">
        فاتورة بيع مباشر (Van Sale)
      </div>
      <div style="font-size: 12.5px; font-weight: 800; font-family: monospace; letter-spacing: 0.5px; margin-top: 3px;">
        #${escapeHtml(receipt.docNo)}
      </div>
    </div>

    <!-- METADATA -->
    <div style="font-size: 10px; line-height: 1.4; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px;">
      <div style="display: flex; justify-content: space-between;">
        <span><b>التاريخ:</b> ${dateStr}</span>
        <span><b>الوقت:</b> ${timeStr}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 2px;">
        <span><b>العميل:</b> ${escapeHtml(receipt.customerName)}</span>
        ${receipt.customerCode ? `<span><b>الكود:</b> ${escapeHtml(receipt.customerCode)}</span>` : ''}
      </div>
      ${receipt.customerPhone ? `<div style="margin-top: 2px;"><b>الهاتف:</b> ${escapeHtml(receipt.customerPhone)}</div>` : ''}
      <div style="display: flex; justify-content: space-between; margin-top: 2px;">
        <span><b>المندوب:</b> ${escapeHtml(receipt.repName || 'مندوب التوزيع')}</span>
        ${receipt.vehiclePlate ? `<span><b>السيارة:</b> ${escapeHtml(receipt.vehiclePlate)}</span>` : ''}
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 2px;">
        <span><b>طريقة الدفع:</b> ${paymentMethodLabel}</span>
      </div>
    </div>

    <!-- PACKAGING BREAKDOWN -->
    ${packaging ? `
      <div style="display: flex; justify-content: space-between; font-size: 9.5px; font-weight: 700; background: #f4f4f4; padding: 3px 5px; border-radius: 3px; margin-bottom: 5px; border: 1px dashed #999;">
        <span>تفقيط الطرود:</span>
        <span>
          ${packaging.cartonsCount ? `${packaging.cartonsCount} كرتونة | ` : ''}
          ${packaging.piecesCount ? `${packaging.piecesCount} قطعة | ` : ''}
          ${packaging.itemsCount || (receipt.items?.length ?? 1)} بنود
        </span>
      </div>
    ` : ''}

    <!-- ITEMS -->
    <div style="margin-bottom: 6px;">
      ${itemsHtml}
    </div>

    <!-- FINANCIAL SUMMARY -->
    <div style="border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 4px 0; margin-bottom: 6px;">
      <div style="display: flex; justify-content: space-between; font-size: 13.5px; font-weight: 800;">
        <span>الإجمالي المطلوب:</span>
        <span>${Number(receipt.total).toFixed(2)} ${escapeHtml(currency)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 9.5px; margin-top: 2px; color: #222;">
        <span>طريقة السداد:</span>
        <span style="font-weight: 800;">${escapeHtml(paymentMethodLabel)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 9.5px; margin-top: 1px; color: #222;">
        <span>حالة السداد:</span>
        <span style="font-weight: 800;">${isCash ? 'تم التحصيل نقداً' : (receipt.paymentMethod === 'card' ? 'مدفوع بالشبكة' : (isSplit ? 'دفع مركب (جزء كاش)' : 'سجلت كمديونية آجلة'))}</span>
      </div>
      ${isSplit ? `
        <div style="display: flex; justify-content: space-between; font-size: 9.5px; margin-top: 2px; color: #000;">
          <span>المدفوع نقداً للمندوب:</span>
          <span style="font-weight: 800;">${paidCash.toFixed(2)} ${escapeHtml(currency)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 9.5px; margin-top: 1px; color: #000;">
          <span>المتبقي على حساب العميل:</span>
          <span style="font-weight: 800;">${remainingDebt.toFixed(2)} ${escapeHtml(currency)}</span>
        </div>
      ` : ''}
    </div>

    <!-- BARCODE -->
    ${barcodeSvg ? `
      <div style="text-align: center; margin: 4px 0 3px;">
        <div style="display: flex; justify-content: center; height: 30px; max-width: 100%; overflow: hidden;">
          ${barcodeSvg}
        </div>
        <div style="font-size: 8.5px; font-family: monospace; letter-spacing: 1px; margin-top: 1px;">
          ${escapeHtml(receipt.docNo)}
        </div>
      </div>
    ` : ''}

    <!-- FOOTER -->
    <div style="text-align: center; font-size: 9px; color: #444; border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px;">
      <div>شكراً لتعاملكم معنا!</div>
      <div style="font-size: 8px; color: #777; margin-top: 1px;">إيصال تسليم معتمد - Z-Systems ERP</div>
    </div>
  `;
}

export function formatVanSaleShareMessage(
  receipt: VanSaleReceiptData,
  currency = getGlobalCurrencySymbol()
): string {
  const isCash = receipt.paymentMethod === 'cash';
  const isCard = receipt.paymentMethod === 'card';
  const isSplit = receipt.paymentMethod === 'split';
  const paidCash = receipt.paidAmount != null ? receipt.paidAmount : (receipt.cashPaid != null ? receipt.cashPaid : 0);
  const remainingDebt = receipt.remainingCredit != null ? receipt.remainingCredit : (receipt.creditOwed != null ? receipt.creditOwed : Math.max(0, Number(receipt.total) - paidCash));

  const paymentMethodLabel =
    isCash
      ? 'نقدي (مسلم للمندوب)'
      : isCard
      ? 'شبكة / فيزا'
      : isSplit
      ? `دفع مركب (مسدد كاش: ${paidCash.toFixed(2)} ${currency} | متبقي آجل: ${remainingDebt.toFixed(2)} ${currency})`
      : 'آجل (على حساب العميل)';

  const lines: string[] = [
    `*فاتورة بيع مباشر (Van Sale)*`,
    `رقم الفاتورة: #${receipt.docNo}`,
    `العميل: ${receipt.customerName}`,
    `المندوب: ${receipt.repName || 'مندوب التوزيع'}${receipt.vehiclePlate ? ` (${receipt.vehiclePlate})` : ''}`,
    `طريقة السداد: ${paymentMethodLabel}`,
  ];

  if (receipt.items && receipt.items.length > 0) {
    lines.push('', '*الأصناف والبنود:*');
    receipt.items.forEach((it) => {
      const lineTot = Number(it.lineTotal != null ? it.lineTotal : it.qty * it.unitPrice).toFixed(2);
      lines.push(`• ${it.name} × ${it.qty} = ${lineTot} ${currency}`);
    });
  }

  if (receipt.packagingBreakdown) {
    const pkg = receipt.packagingBreakdown;
    lines.push(
      '',
      `*تفقيط الطرود:* ${pkg.cartonsCount ? `${pkg.cartonsCount} كرتونة | ` : ''}${pkg.piecesCount ? `${pkg.piecesCount} قطعة | ` : ''}${pkg.itemsCount || 1} بنود`
    );
  }

  lines.push(
    '',
    `*الإجمالي المطلوب:* ${Number(receipt.total).toFixed(2)} ${currency}`,
    '',
    'شكراً لتعاملكم معنا!'
  );

  return lines.join('\n');
}

export function printVanSaleThermalReceipt(
  receipt: VanSaleReceiptData,
  options: { storeName?: string; widthMm?: number; currency?: string } = {}
): void {
  const { widthMm = 80, storeName, currency } = options;
  const html = buildVanSaleThermalReceiptHtml(receipt, { storeName, currency });

  printSmallReceiptDocument(html, {
    title: `فاتورة #${receipt.docNo}`,
    widthMm,
    fontSizePx: 10.5,
    autoClose: true,
  });
}
