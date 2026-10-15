import { escapeHtml, printHtmlDocument } from '@/lib/browser';
import type { Sale, AppSettings } from '@/types/domain';
import { formatDateTime } from '@/lib/pos-printing/shared';

export function getKitchenTicketStyles() {
  return `
    .print-shell { padding: 1mm; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .print-header { display: none !important; }
    
    /* Detailed Mode Styles */
    .kitchen-title { font-size: 15px; font-weight: 900; text-align: center; margin-bottom: 4px; letter-spacing: 0.5px; border-bottom: 2px dashed #000; padding-bottom: 4px; }
    .kitchen-badge-container { display: flex; justify-content: space-between; align-items: center; margin: 4px 0 6px; border: 2px solid #000; border-radius: 4px; padding: 4px 8px; }
    .kitchen-table-callout { font-size: 17px; font-weight: 900; }
    .kitchen-order-tag { font-size: 14px; font-weight: 800; }
    .addon-banner { background: #000; color: #fff; text-align: center; font-weight: 900; font-size: 12px; padding: 3px 0; margin-bottom: 4px; border-radius: 3px; letter-spacing: 0.5px; }
    .kitchen-meta { font-size: 12px; font-weight: 700; margin-bottom: 6px; border-bottom: 1px solid #000; padding-bottom: 4px; }
    .kitchen-meta-line { display: flex; justify-content: space-between; margin-bottom: 2px; }
    .kitchen-items { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    .kitchen-items th, .kitchen-items td { padding: 4px 2px; border-bottom: 1px dashed #999; text-align: right; }
    .kitchen-items th { font-weight: 900; font-size: 12px; background: #f0f0f0; border-bottom: 1px solid #000; }
    .kitchen-items td { font-size: 14px; font-weight: 800; line-height: 1.3; }
    .kitchen-items td.qty { text-align: center; font-size: 16px; font-weight: 900; width: 44px; }
    .item-meta-badges { display: inline-flex; gap: 4px; margin-right: 4px; }
    .course-badge { font-size: 10.5px; font-weight: 800; background: #eee; border: 1px solid #666; border-radius: 3px; padding: 1px 4px; }
    .seat-badge { font-size: 10.5px; font-weight: 800; border: 1px dashed #000; border-radius: 3px; padding: 1px 4px; }
    .modifier-line { font-size: 12px; font-weight: 700; margin-top: 2px; padding-right: 10px; color: #222; }
    .note-line { font-size: 12px; font-weight: 800; font-style: italic; color: #b91c1c; margin-top: 2px; padding-right: 6px; }
    
    /* Mini Mode Styles */
    .mini-ticket { text-align: center; padding: 2px 0; }
    .mini-title { font-size: 26px; font-weight: 900; margin-bottom: 4px; border: 2px solid #000; padding: 3px 14px; border-radius: 6px; display: inline-block; letter-spacing: 0.5px; }
    .mini-meta { font-size: 11.5px; font-weight: 700; color: #111; direction: rtl; }

    body.receipt-mode .print-shell { width: 100%; max-width: 100%; padding-top: 0; margin: 0; box-sizing: border-box; }
  `;
}

export function buildKitchenTicketDocument(
  sale: Partial<Sale> & {
    cashierName?: string;
    waiterName?: string;
    guestCount?: number;
    isAddon?: boolean;
    orderTypeLabel?: string;
  },
  settings?: Partial<AppSettings> | null
) {
  const documentNumber = String(sale.docNo || sale.id || 'طلب معلق');
  const shortOrderMatch = documentNumber.match(/-0*(\d+)$/);
  const shortOrderNo = shortOrderMatch ? shortOrderMatch[1] : (sale.id ? String(sale.id) : documentNumber);
  const dateText = formatDateTime(sale.date || new Date().toISOString(), settings);
  
  if (settings?.posKitchenPrinterMode === 'mini') {
    return `
      <div class="mini-ticket" dir="rtl">
        <div class="mini-title">طلب # ${escapeHtml(shortOrderNo)}</div>
        <div class="mini-meta">${escapeHtml(documentNumber)} &bull; ${escapeHtml(dateText)}</div>
      </div>
    `;
  }

  const orderTypeMap: Record<string, string> = {
    dine_in: 'محلي (داخل المطعم)',
    takeaway: 'سفري / استلام',
    delivery: 'توصيل',
    car_pickup: 'استلام سيارة (Drive-Thru)',
    drive_thru: 'استلام سيارة (Drive-Thru)',
  };
  const courseMap: Record<string, string> = {
    appetizer: 'مقبلات',
    main: 'طبق رئيسي',
    dessert: 'حلويات',
    beverage: 'مشروبات',
  };

  const orderTypeKey = String(sale.orderType || '').toLowerCase();
  const orderTypeLabel = sale.orderTypeLabel || orderTypeMap[orderTypeKey] || (sale.tableNumber ? 'محلي' : 'سفري');
  const staffName = sale.waiterName || sale.createdBy || sale.cashierName || '';
  const items = sale.items || [];
  const note = sale.note || '';

  const itemsHtml = items.map((item: any) => {
    let modifiersHtml = '';
    if (item.modifiers && Array.isArray(item.modifiers) && item.modifiers.length > 0) {
      modifiersHtml = item.modifiers.map((mod: any) => 
        `<div class="modifier-line">+ ${escapeHtml(mod.name || '')} ${mod.qty > 1 ? `(x${mod.qty})` : ''}</div>`
      ).join('');
    }

    let itemNoteHtml = '';
    if (item.notes) {
      itemNoteHtml = `<div class="note-line">ملاحظة: ${escapeHtml(item.notes)}</div>`;
    }

    const courseName = item.course ? (courseMap[item.course] || item.course) : '';
    const seatLabel = item.seatNumber ? `مقعد ${item.seatNumber}` : '';

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: baseline; flex-wrap: wrap;">
            <span>${escapeHtml(item.name || '')}</span>
            ${courseName || seatLabel ? `
              <span class="item-meta-badges">
                ${courseName ? `<span class="course-badge">${escapeHtml(courseName)}</span>` : ''}
                ${seatLabel ? `<span class="seat-badge">${escapeHtml(seatLabel)}</span>` : ''}
              </span>
            ` : ''}
          </div>
          ${modifiersHtml}
          ${itemNoteHtml}
        </td>
        <td class="qty">${Number(item.qty || 0)}</td>
      </tr>
    `;
  }).join('');

  const tableHeaderCallout = sale.tableNumber ? `طاولة: ${escapeHtml(sale.tableNumber)}` : escapeHtml(orderTypeLabel);

  const html = `
    <div class="kitchen-title" dir="rtl">تذكرة المطبخ (KOT)</div>
    ${sale.isAddon ? `<div class="addon-banner" dir="rtl">[ طلب إضافي - ADD-ON ]</div>` : ''}
    <div class="kitchen-badge-container" dir="rtl">
      <div class="kitchen-table-callout">${tableHeaderCallout}</div>
      <div class="kitchen-order-tag">طلب #${escapeHtml(shortOrderNo)}</div>
    </div>
    <div class="kitchen-meta" dir="rtl">
      <div class="kitchen-meta-line"><span>النوع:</span> <span>${escapeHtml(orderTypeLabel)}</span></div>
      ${staffName ? `<div class="kitchen-meta-line"><span>المسؤول:</span> <span>${escapeHtml(staffName)}</span></div>` : ''}
      ${sale.guestCount && Number(sale.guestCount) > 1 ? `<div class="kitchen-meta-line"><span>عدد الضيوف:</span> <span>${escapeHtml(String(sale.guestCount))}</span></div>` : ''}
      <div class="kitchen-meta-line"><span>التاريخ والوقت:</span> <span>${escapeHtml(dateText)}</span></div>
      ${note ? `<div class="kitchen-meta-line"><span>ملاحظات الطلب:</span> <span>${escapeHtml(note)}</span></div>` : ''}
    </div>
    <table class="kitchen-items" dir="rtl">
      <thead>
        <tr>
          <th>الصنف / الخيارات</th>
          <th style="text-align: center; width: 44px;">الكمية</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml || '<tr><td colspan="2" style="text-align: center;">لا توجد أصناف</td></tr>'}
      </tbody>
    </table>
  `;

  return html;
}

export function printKitchenTicket(
  sale: Partial<Sale> & {
    cashierName?: string;
    waiterName?: string;
    guestCount?: number;
    isAddon?: boolean;
    orderTypeLabel?: string;
  },
  settings?: Partial<AppSettings> | null
) {
  const html = buildKitchenTicketDocument(sale, settings);
  const title = `المطبخ ${sale.docNo || sale.id || 'طلب جديد'}`;
  
  printHtmlDocument(title, html, {
    subtitle: '',
    footerHtml: '',
    pageSize: 'receipt',
    extraStyles: getKitchenTicketStyles(),
    deviceName: settings?.posElectronKitchenPrinter || undefined,
  });
}
