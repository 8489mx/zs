import { escapeHtml } from '@/lib/browser/escape';

export interface SmallReceiptPrintOptions {
  title?: string;
  widthMm?: number;
  marginMm?: number;
  fontSizePx?: number;
  printDelayMs?: number;
  autoClose?: boolean;
}

export function getSmallReceiptStyles(options: { widthMm?: number; marginMm?: number; fontSizePx?: number } = {}) {
  const { widthMm = 58, marginMm = 0, fontSizePx = 10.5 } = options;

  return `
    @page {
      size: ${widthMm}mm auto;
      margin: ${marginMm}mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: 'Arial', 'Helvetica', 'Tahoma', sans-serif;
      font-size: ${fontSizePx}px;
      line-height: 1.25;
      direction: rtl;
      text-align: right;
      width: 100%;
      -webkit-font-smoothing: antialiased;
    }
    .thermal-receipt-container {
      width: 100%;
      max-width: ${widthMm}mm;
      margin: 0 auto;
      padding: 2mm 3mm;
      page-break-inside: avoid;
      break-inside: avoid;
      background: #fff;
      color: #000;
      box-sizing: border-box;
    }
    @media print {
      body {
        margin: 0 !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
    }
  `;
}

export function printSmallReceiptDocument(htmlContent: string, options: SmallReceiptPrintOptions = {}) {
  const {
    title = 'إيصال حراري',
    widthMm = 58,
    marginMm = 0,
    fontSizePx = 10.5,
    printDelayMs = 150,
    autoClose = false,
  } = options;

  const printWindow = window.open('', '_blank', `width=${Math.max(380, widthMm * 4)},height=700`);
  if (!printWindow) {
    throw new Error('المتصفح منع فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.');
  }

  const styles = getSmallReceiptStyles({ widthMm, marginMm, fontSizePx });

  const fullHtml = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>${styles}</style>
  </head>
  <body>
    <div class="thermal-receipt-container">
      ${htmlContent}
    </div>
  </body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(fullHtml);
  printWindow.document.close();
  printWindow.focus();

  window.setTimeout(() => {
    printWindow.print();
    if (autoClose) {
      window.setTimeout(() => printWindow.close(), 200);
    }
  }, printDelayMs);
}
