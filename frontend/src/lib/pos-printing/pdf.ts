import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { AppSettings, Sale } from '@/types/domain';
import { buildReceiptDocument, getInvoiceStyles } from '@/lib/pos-printing/template';
import { defaultInvoiceFooter, formatDateTime, paymentLabel } from '@/lib/pos-printing/shared';

const PDF_PAGE_WIDTH_MM = 210;
const PDF_PAGE_HEIGHT_MM = 297;
const PDF_MARGIN_MM = 8;
const PDF_RENDER_WIDTH_PX = 794;

function buildPostedSaleDocument(sale: Sale, settings?: Partial<AppSettings> | null) {
  return buildReceiptDocument({
    pageSize: 'a4',
    settings,
    documentLabel: 'فاتورة بيع',
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
}

function buildPdfShell(documentHtml: string, settings?: Partial<AppSettings> | null) {
  return `
    <style>
      :root {
        --print-text: #0f172a;
        --print-muted: #475569;
        --print-border: #cbd5e1;
        --print-surface: #f8fafc;
        --print-strong: #111827;
        --print-accent: #1d4ed8;
      }
      * { box-sizing: border-box; }
      body { margin: 0; background: #ffffff; color: var(--print-text); font-family: Tahoma, Arial, sans-serif; }
      .pdf-export-root {
        width: ${PDF_RENDER_WIDTH_PX}px;
        min-height: 1123px;
        padding: 24px;
        background: #ffffff;
        direction: rtl;
      }
      .print-shell { padding: 0; }
      .print-footer {
        margin-top: 8px;
        font-size: 11px;
        padding-top: 8px;
        text-align: center;
        color: var(--print-muted);
      }
      ${getInvoiceStyles(false)}
    </style>
    <div class="pdf-export-root">
      <div class="print-shell">
        ${documentHtml}
        <div class="print-footer">${defaultInvoiceFooter(settings)}</div>
      </div>
    </div>
  `;
}

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(images.map((image) => {
    if (image.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => resolve(), { once: true });
    });
  }));
}

function buildFileName(sale: Sale) {
  const key = String(sale.docNo || sale.id || 'sale').replace(/[^\w\u0600-\u06FF-]+/g, '-');
  return `sale-${key || 'invoice'}.pdf`;
}

function addCanvasAsPages(pdf: jsPDF, canvas: HTMLCanvasElement) {
  const usableWidthMm = PDF_PAGE_WIDTH_MM - (PDF_MARGIN_MM * 2);
  const usableHeightMm = PDF_PAGE_HEIGHT_MM - (PDF_MARGIN_MM * 2);
  const pxPerMm = canvas.width / usableWidthMm;
  const pageSliceHeightPx = Math.max(1, Math.floor(usableHeightMm * pxPerMm));

  let renderedOffsetPx = 0;
  let pageIndex = 0;

  while (renderedOffsetPx < canvas.height) {
    const currentSliceHeightPx = Math.min(pageSliceHeightPx, canvas.height - renderedOffsetPx);
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = currentSliceHeightPx;
    const context = pageCanvas.getContext('2d');
    if (!context) throw new Error('تعذر تجهيز صفحات PDF');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    context.drawImage(
      canvas,
      0,
      renderedOffsetPx,
      canvas.width,
      currentSliceHeightPx,
      0,
      0,
      pageCanvas.width,
      currentSliceHeightPx,
    );

    const imageData = pageCanvas.toDataURL('image/png');
    const renderedHeightMm = currentSliceHeightPx / pxPerMm;
    if (pageIndex > 0) pdf.addPage('a4', 'portrait');
    pdf.addImage(imageData, 'PNG', PDF_MARGIN_MM, PDF_MARGIN_MM, usableWidthMm, renderedHeightMm, undefined, 'FAST');

    renderedOffsetPx += currentSliceHeightPx;
    pageIndex += 1;
  }
}

export async function exportPostedSalePdf(sale: Sale, options: { settings?: Partial<AppSettings> | null } = {}) {
  const receiptDocument = buildPostedSaleDocument(sale, options.settings || null);
  const renderRoot = globalThis.document.createElement('div');
  renderRoot.setAttribute('aria-hidden', 'true');
  renderRoot.style.position = 'fixed';
  renderRoot.style.left = '-20000px';
  renderRoot.style.top = '0';
  renderRoot.style.width = `${PDF_RENDER_WIDTH_PX}px`;
  renderRoot.style.opacity = '1';
  renderRoot.style.pointerEvents = 'none';
  renderRoot.innerHTML = buildPdfShell(receiptDocument.html, options.settings || null);
  globalThis.document.body.appendChild(renderRoot);

  try {
    await waitForImages(renderRoot);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const canvas = await html2canvas(renderRoot, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      width: PDF_RENDER_WIDTH_PX,
      windowWidth: PDF_RENDER_WIDTH_PX,
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    addCanvasAsPages(pdf, canvas);
    pdf.save(buildFileName(sale));
  } finally {
    renderRoot.remove();
  }
}
