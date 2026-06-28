import { escapeHtml, printHtmlDocument } from '@/lib/browser';
import type { Sale, AppSettings } from '@/types/domain';
import { formatDateTime } from '@/lib/pos-printing/shared';

export function getKitchenTicketStyles() {
  return `
    .print-shell { padding: 1mm 1.2mm 2.5mm; font-family: system-ui, sans-serif; }
    .print-header { display: none !important; }
    .kitchen-title { font-size: 18px; font-weight: 900; text-align: center; margin-bottom: 8px; }
    .kitchen-meta { font-size: 13px; font-weight: 700; margin-bottom: 8px; border-bottom: 2px solid #000; padding-bottom: 4px; }
    .kitchen-meta-line { display: flex; justify-content: space-between; margin-bottom: 3px; }
    .kitchen-items { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    .kitchen-items th, .kitchen-items td { padding: 6px 4px; border-bottom: 1px solid #000; text-align: right; }
    .kitchen-items th { font-weight: 900; font-size: 14px; background: #f0f0f0; }
    .kitchen-items td { font-size: 15px; font-weight: 800; }
    .kitchen-items td.qty { text-align: center; font-size: 16px; font-weight: 900; }
    .modifier-line { font-size: 13px; font-weight: normal; margin-top: 2px; padding-right: 12px; color: #333; }
    .note-line { font-size: 13px; font-style: italic; color: #d32f2f; margin-top: 2px; }
    .ticket-footer { text-align: center; font-size: 11px; margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px; }
    body.receipt-mode .print-shell { max-width: 76mm; padding-top: 0; margin: 0 auto; }
  `;
}

export function buildKitchenTicketDocument(sale: Sale, _settings?: Partial<AppSettings> | null) {
  const documentNumber = sale.docNo || sale.id;
  const dateText = formatDateTime(sale.date);
  const items = sale.items || [];
  const note = sale.note || '';

  const itemsHtml = items.map((item) => {
    let modifiersHtml = '';
    if (item.modifiers && Array.isArray(item.modifiers) && item.modifiers.length > 0) {
      modifiersHtml = item.modifiers.map((mod: any) => 
        `<div class="modifier-line">+ ${escapeHtml(mod.name)} ${mod.qty > 1 ? `(x${mod.qty})` : ''}</div>`
      ).join('');
    }

    let itemNoteHtml = '';
    if (item.notes) {
      itemNoteHtml = `<div class="note-line">ملاحظة: ${escapeHtml(item.notes)}</div>`;
    }

    return `
      <tr>
        <td>
          <div>${escapeHtml(item.name || '')}</div>
          ${modifiersHtml}
          ${itemNoteHtml}
        </td>
        <td class="qty">${Number(item.qty || 0)}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <div class="kitchen-title" dir="rtl">شيت المطبخ (KOT)</div>
    <div class="kitchen-meta" dir="rtl">
      <div class="kitchen-meta-line"><span>رقم الطلب:</span> <span>${escapeHtml(documentNumber)}</span></div>
      <div class="kitchen-meta-line"><span>التاريخ:</span> <span>${escapeHtml(dateText)}</span></div>
      ${sale.customerName ? `<div class="kitchen-meta-line"><span>العميل:</span> <span>${escapeHtml(sale.customerName)}</span></div>` : ''}
      ${note ? `<div class="kitchen-meta-line"><span>ملاحظات:</span> <span>${escapeHtml(note)}</span></div>` : ''}
    </div>
    <table class="kitchen-items" dir="rtl">
      <thead>
        <tr>
          <th>الصنف</th>
          <th style="text-align: center;">الكمية</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml || '<tr><td colspan="2" style="text-align: center;">لا توجد أصناف</td></tr>'}
      </tbody>
    </table>
    <div class="ticket-footer" dir="rtl">
      طُبعت في ${formatDateTime(new Date().toISOString())}
    </div>
  `;

  return html;
}

export function printKitchenTicket(sale: Sale, settings?: Partial<AppSettings> | null) {
  const html = buildKitchenTicketDocument(sale, settings);
  const title = `المطبخ ${sale.docNo || sale.id}`;
  
  printHtmlDocument(title, html, {
    subtitle: '',
    footerHtml: '',
    pageSize: 'receipt',
    extraStyles: getKitchenTicketStyles(),
  });
}
