import { escapeHtml, printHtmlDocument } from '@/lib/browser';
import type { Sale, AppSettings } from '@/types/domain';
import { formatDateTime } from '@/lib/pos-printing/shared';

export function getKitchenTicketStyles() {
  return `
    .print-shell { padding: 1mm; font-family: system-ui, sans-serif; }
    .print-header { display: none !important; }
    
    /* Detailed Mode Styles */
    .kitchen-title { font-size: 16px; font-weight: 900; text-align: center; margin-bottom: 4px; }
    .kitchen-meta { font-size: 12px; font-weight: 700; margin-bottom: 4px; border-bottom: 1px solid #000; padding-bottom: 2px; }
    .kitchen-meta-line { display: flex; justify-content: space-between; margin-bottom: 1px; }
    .kitchen-items { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    .kitchen-items th, .kitchen-items td { padding: 3px 2px; border-bottom: 1px dashed #999; text-align: right; }
    .kitchen-items th { font-weight: 900; font-size: 12px; background: #f0f0f0; border-bottom: 1px solid #000; }
    .kitchen-items td { font-size: 14px; font-weight: 800; line-height: 1.2; }
    .kitchen-items td.qty { text-align: center; font-size: 15px; font-weight: 900; }
    .modifier-line { font-size: 12px; font-weight: normal; margin-top: 1px; padding-right: 8px; color: #333; }
    .note-line { font-size: 12px; font-style: italic; color: #d32f2f; margin-top: 1px; }
    
    /* Mini Mode Styles */
    .mini-ticket { text-align: center; padding: 4px 0; }
    .mini-title { font-size: 24px; font-weight: 900; margin-bottom: 4px; border: 2px solid #000; padding: 4px; border-radius: 4px; display: inline-block; }
    .mini-date { font-size: 13px; font-weight: 700; }

    body.receipt-mode .print-shell { width: 100%; max-width: 100%; padding-top: 0; margin: 0; box-sizing: border-box; }
  `;
}

export function buildKitchenTicketDocument(sale: Sale, settings?: Partial<AppSettings> | null) {
  const documentNumber = sale.docNo || sale.id;
  const dateText = formatDateTime(sale.date);
  
  if (settings?.posKitchenPrinterMode === 'mini') {
    return `
      <div class="mini-ticket" dir="rtl">
        <div class="mini-title">طلب #${escapeHtml(documentNumber)}</div>
        <div class="mini-date">${escapeHtml(dateText)}</div>
      </div>
    `;
  }

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
      ${note ? `<div class="kitchen-meta-line"><span>ملاحظات:</span> <span>${escapeHtml(note)}</span></div>` : ''}
    </div>
    <table class="kitchen-items" dir="rtl">
      <thead>
        <tr>
          <th>الصنف</th>
          <th style="text-align: center; width: 40px;">الكمية</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml || '<tr><td colspan="2" style="text-align: center;">لا توجد أصناف</td></tr>'}
      </tbody>
    </table>
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
    deviceName: settings?.posElectronKitchenPrinter || undefined,
  });
}
