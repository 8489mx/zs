/**
 * Kitchen Day-Dots & Prep Expiry Thermal Printing Engine
 * Prints 50x30mm HACCP Food Safety Labels for kitchen commissary & prep items.
 */

export interface PrepDayDotLabelData {
  prepItemName: string;
  prepDate: string; // e.g. '2026-10-12 09:30 ص'
  expiryDate: string; // e.g. '2026-10-14 09:30 ص'
  shelfLifeHours?: number;
  storageTemp?: string; // e.g. '4°C'
  preparedBy?: string;
  unitName?: string;
  batchQty?: number;
}

export function printPrepDayDotLabel(data: PrepDayDotLabelData) {
  const printWindow = window.open('', '_blank', 'width=450,height=350');
  if (!printWindow) {
    alert('يرجى السماح بالنوافذ المنبثقة لطباعة ملصق الصلاحية');
    return;
  }

  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>ملصق سلامة الغذاء - ${escapeHtml(data.prepItemName)}</title>
  <style>
    @page {
      size: 50mm 30mm;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", "Tajawal", sans-serif;
      width: 50mm;
      height: 30mm;
      padding: 2.2mm 2.8mm;
      background: #ffffff;
      color: #000000;
      display: flex;
      flex-direction: column;
      justifyContent: space-between;
      overflow: hidden;
      font-size: 8pt;
      line-height: 1.15;
    }
    .header {
      border-bottom: 1px solid #000;
      padding-bottom: 1mm;
      display: flex;
      justifyContent: space-between;
      align-items: center;
    }
    .header .title {
      font-size: 6.5pt;
      font-weight: 800;
      letter-spacing: -0.2px;
      text-transform: uppercase;
    }
    .header .badge {
      font-size: 6pt;
      font-weight: 900;
      border: 1px solid #000;
      padding: 0.2mm 1mm;
      border-radius: 1mm;
    }
    .item-name {
      font-size: 9.5pt;
      font-weight: 900;
      line-height: 1.1;
      margin: 0.8mm 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.6mm;
      font-size: 6.2pt;
    }
    .meta-row {
      display: flex;
      justifyContent: space-between;
    }
    .meta-label {
      font-weight: 600;
      color: #333;
    }
    .meta-val {
      font-weight: 800;
    }
    .expiry-strip {
      border-top: 1px dashed #000;
      padding-top: 0.8mm;
      display: flex;
      justifyContent: space-between;
      align-items: baseline;
      font-size: 7.2pt;
      font-weight: 900;
    }
    .expiry-label {
      color: #000;
      font-size: 6.5pt;
    }
    .storage {
      font-size: 6pt;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="title">سلامة الغذاء HACCP / تحضير داخلي</span>
    <span class="badge">يُستهلك أولاً</span>
  </div>

  <div class="item-name">${escapeHtml(data.prepItemName)}</div>

  <div class="meta-grid">
    <div class="meta-row">
      <span class="meta-label">التحضير:</span>
      <span class="meta-val">${escapeHtml(data.prepDate)}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">الحفظ:</span>
      <span class="meta-val">${escapeHtml(data.storageTemp || '4°C')}</span>
    </div>
    ${data.batchQty ? `
    <div class="meta-row">
      <span class="meta-label">الكمية:</span>
      <span class="meta-val">${data.batchQty} ${escapeHtml(data.unitName || '')}</span>
    </div>` : ''}
    ${data.preparedBy ? `
    <div class="meta-row">
      <span class="meta-label">المسؤول:</span>
      <span class="meta-val">${escapeHtml(data.preparedBy)}</span>
    </div>` : ''}
  </div>

  <div class="expiry-strip">
    <span class="expiry-label">صالح حتى:</span>
    <span class="meta-val" style="font-size: 8pt;">${escapeHtml(data.expiryDate)}</span>
    <span class="storage">(${data.shelfLifeHours || 48} س)</span>
  </div>

  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() {
        window.close();
      }, 500);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
