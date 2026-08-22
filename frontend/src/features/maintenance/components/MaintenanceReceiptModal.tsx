import { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { buildCode128Svg } from '@/lib/barcode';
import { escapeHtml, printHtmlDocument } from '@/lib/browser';
import type { MaintenanceTicket } from '@/types/domain-models/maintenance';
import type { AppSettings } from '@/types/domain';
import { getMaintenanceProfile } from '../constants/maintenance-profiles';

interface MaintenanceReceiptModalProps {
  open: boolean;
  ticket: MaintenanceTicket | null;
  settings?: AppSettings | null;
  onClose: () => void;
}

export function extractTicketDiscount(notes?: string | null) {
  if (!notes) return { amount: 0, reason: '' };
  const match = notes.match(/\[خصم تسليم:\s*([\d.]+)\s*ج\.م\s*-\s*السبب:\s*([^\]]+)\]/);
  if (!match) return { amount: 0, reason: '' };
  return {
    amount: Number(match[1]) || 0,
    reason: match[2].trim(),
  };
}

export function printMaintenanceReceipt(ticket: MaintenanceTicket, settings?: AppSettings | null) {
  const barcodeSvg = buildCode128Svg(ticket.ticketNo);
  const discountInfo = extractTicketDiscount(ticket.technicianNotes);
  let totalCost = ticket.finalCost || ticket.expectedCost || 0;
  if (discountInfo.amount > 0 && ticket.expectedCost > totalCost) {
    totalCost = ticket.expectedCost;
  }
  const advancePaid = ticket.advancePayment || 0;
  const netTotal = Math.max(0, totalCost - discountInfo.amount);
  const collectedAtDelivery = Math.max(0, netTotal - advancePaid);
  const remainingAmount = ticket.status === 'delivered' ? 0 : Math.max(0, netTotal - advancePaid);
  const dateFormatted = new Date(ticket.receivedAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
  const profile = getMaintenanceProfile(settings?.maintenanceProfile);
  const storeName = settings?.storeName || profile.title;
  const phone = settings?.phone || '';
  const address = settings?.address || '';

  const html = `
    <div class="maintenance-receipt-container" style="width: 100%; max-width: 68mm; margin: 0 auto; box-sizing: border-box; font-family: Tahoma, Arial, sans-serif; font-size: 11px; line-height: 1.35; color: #000;">
      <div style="text-align: center; margin-bottom: 6px; border-bottom: 1px dashed #000; padding-bottom: 6px;">
        <h2 style="margin: 0 0 2px; font-size: 15px; font-weight: 800; color: #000;">${escapeHtml(storeName)}</h2>
        ${phone ? `<div style="font-size: 10.5px; font-weight: 500; color: #111;">هاتف: ${escapeHtml(phone)}</div>` : ''}
        ${address ? `<div style="font-size: 9px; font-weight: 400; color: #333;">${escapeHtml(address)}</div>` : ''}
        <div style="margin-top: 4px; display: inline-block; padding: 2px 8px; border: 1px solid #000; border-radius: 4px; font-weight: 700; font-size: 10.5px; color: #000;">
          إيصال استلام جهاز للإصلاح (${escapeHtml(profile.shortTitle)})
        </div>
      </div>

      <div style="text-align: center; margin-bottom: 6px; border-bottom: 1px dashed #000; padding-bottom: 6px;">
        <div style="width: 100%; max-width: 200px; height: 42px; margin: 0 auto; display: block;">${barcodeSvg}</div>
        <div style="font-size: 16px; font-weight: 900; letter-spacing: 1.5px; font-family: monospace; color: #000; margin: 5px 0 2px; padding-top: 2px;">
          ${escapeHtml(ticket.ticketNo)}
        </div>
        <div style="font-size: 9.5px; font-weight: 400; color: #222;">تاريخ الاستلام: ${escapeHtml(dateFormatted)}</div>
      </div>

      <div style="border: 1px solid #000; border-radius: 4px; padding: 5px 6px; margin-bottom: 6px; font-size: 10px; line-height: 1.35; color: #000; box-sizing: border-box;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 3px;">
          <span>العميل: <strong style="font-weight: 700;">${escapeHtml(ticket.customerName)}</strong></span>
          <span dir="ltr" style="font-weight: 600; font-family: monospace;">${escapeHtml(ticket.customerPhone)}</span>
        </div>
        <div style="font-size: 10.5px; margin-bottom: 2px;">
          الجهاز: <strong style="font-weight: 700;">${escapeHtml(ticket.deviceBrand ? `${ticket.deviceBrand} - ` : '')}${escapeHtml(ticket.deviceModel)}</strong>
        </div>
        ${ticket.serialNumber ? `<div style="font-size: 9.5px; font-family: monospace;" dir="ltr">${escapeHtml(profile.serialLabel)}: ${escapeHtml(ticket.serialNumber)}</div>` : ''}
        ${ticket.passcode ? `<div style="color: #000;">${escapeHtml(profile.passcodeLabel)}: <span dir="ltr" style="font-weight: 700;">${escapeHtml(ticket.passcode)}</span></div>` : ''}
      </div>

      <div style="border: 1px solid #000; border-radius: 4px; padding: 5px 6px; margin-bottom: 6px; font-size: 10px; color: #000; box-sizing: border-box;">
        <div style="font-weight: 700; text-decoration: underline; margin-bottom: 2px;">العطل المشتكى منه:</div>
        <div style="font-weight: 500;">${escapeHtml(ticket.problemDescription)}</div>
        ${ticket.deviceCondition ? `<div style="font-size: 9px; font-weight: 400; margin-top: 3px; color: #222;">الحالة الظاهرية: ${escapeHtml(ticket.deviceCondition)}</div>` : ''}
      </div>

      <div style="border: 1px solid #000; border-radius: 4px; padding: 5px 6px; margin-bottom: 6px; font-size: 10px; color: #000; box-sizing: border-box;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
          <span>القيمة الإجمالية:</span>
          <span style="font-weight: 700;">${totalCost.toFixed(2)} ج.م</span>
        </div>
        ${advancePaid > 0 ? `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <span>المدفوع مقدماً (عربون):</span>
            <span style="font-weight: 600;">${advancePaid.toFixed(2)} ج.م</span>
          </div>
        ` : ''}
        ${discountInfo.amount > 0 ? `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; color: #000;">
            <span>خصم (${escapeHtml(discountInfo.reason)}):</span>
            <span style="font-weight: 700;">-${discountInfo.amount.toFixed(2)} ج.م</span>
          </div>
        ` : ''}
        ${ticket.status === 'delivered' ? `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; border-top: 1px dashed #666; padding-top: 2px;">
            <span>المبلغ المحصل عند الاستلام:</span>
            <span style="font-weight: 700;">${collectedAtDelivery.toFixed(2)} ج.م</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 800; border-top: 1px dashed #000; padding-top: 3px; margin-top: 2px;">
          <span>المتبقي:</span>
          <span>${ticket.status === 'delivered' ? '0.00 ج.م (خالص بالكامل ✓)' : `${remainingAmount.toFixed(2)} ج.م`}</span>
        </div>
      </div>

      <div style="font-size: 8px; line-height: 1.35; color: #111; margin-bottom: 6px; padding: 0 2px;">
        <strong style="display: block; font-weight: 700; text-decoration: underline; margin-bottom: 2px;">شروط الاستلام:</strong>
        <div style="font-weight: 400;">
          • المركز غير مسؤول عن الأجهزة المتروكة لأكثر من 30 يوماً.<br />
          • المركز غير مسؤول عن فقدان البيانات أثناء الصيانة.<br />
          • الضمان على القطع المستبدلة ${ticket.warrantyDays || 30} يوماً بموجب هذا الإيصال.<br />
          • لا يتم تسليم الجهاز إلا بأصل هذا الإيصال.
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; padding-top: 6px; border-top: 1px dashed #000; font-size: 9px; font-weight: 600; text-align: center; color: #000; box-sizing: border-box;">
        <div>توقيع المستلم<br /><br />...................</div>
        <div>توقيع العميل<br /><br />...................</div>
      </div>
    </div>
  `;

  printHtmlDocument(`إيصال استلام ${ticket.ticketNo}`, html, {
    pageSize: 'receipt',
    layout: 'centered',
    extraStyles: `
      @page { size: 80mm auto; margin: 0; }
      @media print {
        html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; background: #fff !important; }
        body.receipt-mode { width: 100% !important; max-width: 100% !important; margin: 0 auto !important; padding: 0 !important; color: #000 !important; }
        .print-shell { width: 100% !important; max-width: 68mm !important; margin: 0 auto !important; padding: 1mm 2mm !important; box-sizing: border-box !important; }
        * { color: #000 !important; box-sizing: border-box !important; }
      }
    `,
  });
}

export function printMaintenanceSticker(
  ticket: MaintenanceTicket,
  settings?: AppSettings | null,
  preset: '50x30' | '50x25' | '40x30' | '60x40' | '80-roll' = '50x30'
) {
  const barcodeSvg = buildCode128Svg(ticket.ticketNo);
  const dateFormatted = new Date(ticket.receivedAt).toLocaleDateString('ar-EG');
  const storeName = settings?.storeName || 'مركز الصيانة';

  let widthMm = 50;
  let heightMm = 30;
  if (preset === '50x25') { widthMm = 50; heightMm = 25; }
  else if (preset === '40x30') { widthMm = 40; heightMm = 30; }
  else if (preset === '60x40') { widthMm = 60; heightMm = 40; }
  else if (preset === '80-roll') { widthMm = 76; heightMm = 45; }

  const html = `
    <div class="sticker-card">
      <div class="sticker-header">${escapeHtml(storeName)}</div>
      <div class="sticker-barcode">${barcodeSvg}</div>
      <div class="sticker-code">${escapeHtml(ticket.ticketNo)}</div>
      <div class="sticker-body">
        <div class="sticker-row"><b>العميل:</b> ${escapeHtml(ticket.customerName)} (${escapeHtml(ticket.customerPhone)})</div>
        <div class="sticker-row"><b>الجهاز:</b> ${escapeHtml(ticket.deviceBrand ? `${ticket.deviceBrand} - ` : '')}${escapeHtml(ticket.deviceModel)}</div>
        ${ticket.passcode ? `<div class="sticker-row"><b>الرمز:</b> <span dir="ltr">${escapeHtml(ticket.passcode)}</span></div>` : ''}
        <div class="sticker-row"><b>العطل:</b> ${escapeHtml(ticket.problemDescription)}</div>
      </div>
      <div class="sticker-footer">تاريخ الاستلام: ${escapeHtml(dateFormatted)}</div>
    </div>
  `;

  printHtmlDocument(`ستيكر ${ticket.ticketNo}`, html, {
    pageSize: 'receipt',
    extraStyles: `
      @page { size: ${widthMm}mm ${heightMm}mm; margin: 0 !important; }
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; width: ${widthMm}mm !important; height: ${heightMm}mm !important; overflow: hidden !important; }
      .print-header, .print-footer, .brand-panel, .doc-panel { display: none !important; }
      .print-shell { padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; }
      .print-content { padding: 0 !important; margin: 0 !important; gap: 0 !important; }
      .sticker-card {
        width: ${widthMm}mm;
        height: ${heightMm}mm;
        max-width: ${widthMm}mm;
        max-height: ${heightMm}mm;
        box-sizing: border-box;
        padding: 1.2mm 2mm;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        text-align: center;
        font-family: Tahoma, Arial, sans-serif;
        color: #000;
        overflow: hidden;
      }
      .sticker-header {
        font-size: 8px;
        font-weight: 900;
        line-height: 1.1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        border-bottom: 0.5px solid #000;
        padding-bottom: 1px;
      }
      .sticker-barcode {
        width: 100%;
        height: 18px;
        margin: 1px auto 0;
      }
      .sticker-barcode svg {
        width: 100%;
        height: 100%;
        display: block;
      }
      .sticker-code {
        font-size: 11px;
        font-weight: 900;
        font-family: monospace;
        letter-spacing: 1.5px;
        line-height: 1;
        margin: 1px 0;
      }
      .sticker-body {
        text-align: right;
        font-size: 7.5px;
        line-height: 1.25;
        border-top: 0.5px solid #000;
        border-bottom: 0.5px solid #000;
        padding: 1px 0;
      }
      .sticker-row {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sticker-footer {
        font-size: 6.5px;
        color: #000;
        font-weight: 600;
        margin-top: 1px;
      }
    `,
  });
}

export async function exportMaintenanceReceiptPdf(ticket: MaintenanceTicket, settings?: Partial<AppSettings> | null) {
  const barcodeSvg = buildCode128Svg(ticket.ticketNo);
  const discountInfo = extractTicketDiscount(ticket.technicianNotes);
  let totalCost = ticket.finalCost || ticket.expectedCost || 0;
  if (discountInfo.amount > 0 && ticket.expectedCost > totalCost) {
    totalCost = ticket.expectedCost;
  }
  const advancePaid = ticket.advancePayment || 0;
  const netTotal = Math.max(0, totalCost - discountInfo.amount);
  const collectedAtDelivery = Math.max(0, netTotal - advancePaid);
  const remainingAmount = ticket.status === 'delivered' ? 0 : Math.max(0, netTotal - advancePaid);
  const dateFormatted = new Date(ticket.receivedAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
  const profile = getMaintenanceProfile(settings?.maintenanceProfile);
  const storeName = settings?.storeName || profile.title;
  const phone = settings?.phone || '';
  const address = settings?.address || '';

  const html = `
    <div style="width: 460px; margin: 0 auto; padding: 24px; background: #ffffff; color: #0f172a; font-family: Tahoma, Arial, sans-serif; direction: rtl; border: 1px solid #cbd5e1; border-radius: 12px; box-sizing: border-box;">
      <div style="text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 14px; margin-bottom: 14px;">
        <h2 style="margin: 0 0 4px; font-size: 22px; font-weight: 900; color: #0f172a;">${escapeHtml(storeName)}</h2>
        ${phone ? `<div style="font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 2px;">هاتف: ${escapeHtml(phone)}</div>` : ''}
        ${address ? `<div style="font-size: 11px; color: #64748b;">${escapeHtml(address)}</div>` : ''}
        <div style="margin-top: 8px; display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; color: #0f172a; padding: 4px 14px; border-radius: 6px; font-weight: 800; font-size: 13px;">
          إيصال استلام جهاز للإصلاح (${escapeHtml(profile.shortTitle)})
        </div>
      </div>

      <div style="text-align: center; padding: 6px 0 14px; border-bottom: 2px dashed #94a3b8; margin-bottom: 14px;">
        <div style="width: 240px; height: 48px; margin: 0 auto 6px; display: block;">${barcodeSvg}</div>
        <div style="font-size: 19px; font-weight: 900; letter-spacing: 2px; font-family: monospace; color: #0284c7; margin: 6px 0 3px; padding-top: 2px;">
          ${escapeHtml(ticket.ticketNo)}
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 3px; font-weight: 600;">
          تاريخ الاستلام: ${escapeHtml(dateFormatted)}
        </div>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; font-size: 12px; line-height: 1.6;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 5px;">
          <span>العميل: <strong style="font-size: 13px;">${escapeHtml(ticket.customerName)}</strong></span>
          <span dir="ltr"><strong>${escapeHtml(ticket.customerPhone)}</strong></span>
        </div>
        <div style="font-size: 13px; font-weight: 800; margin-bottom: 3px; color: #0f172a;">
          الجهاز: ${escapeHtml(ticket.deviceBrand ? `${ticket.deviceBrand} - ` : '')}${escapeHtml(ticket.deviceModel)}
        </div>
        ${ticket.serialNumber ? `<div style="font-size: 11px; color: #64748b; font-family: monospace;" dir="ltr">${escapeHtml(profile.serialLabel)}: ${escapeHtml(ticket.serialNumber)}</div>` : ''}
        ${ticket.passcode ? `<div style="font-weight: 800; color: #2563eb; margin-top: 2px;">${escapeHtml(profile.passcodeLabel)}: <span dir="ltr">${escapeHtml(ticket.passcode)}</span></div>` : ''}
      </div>

      <div style="margin-bottom: 14px;">
        <div style="font-weight: 800; color: #dc2626; font-size: 12px; margin-bottom: 3px;">العطل المشتكى منه:</div>
        <div style="background: #fef2f2; border: 1px solid #fee2e2; color: #991b1b; padding: 8px 12px; border-radius: 6px; font-weight: 700; font-size: 12px;">
          ${escapeHtml(ticket.problemDescription)}
        </div>
        ${ticket.deviceCondition ? `<div style="font-size: 11px; color: #475569; margin-top: 5px;">حالة الجهاز الظاهرية: <strong>${escapeHtml(ticket.deviceCondition)}</strong></div>` : ''}
      </div>

      <div style="border-top: 2px dashed #94a3b8; border-bottom: 2px dashed #94a3b8; padding: 10px 0; margin-bottom: 14px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #64748b;">القيمة الإجمالية:</span>
          <strong style="font-size: 13px;">${totalCost.toFixed(2)} ج.م</strong>
        </div>
        ${advancePaid > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #16a34a;">
            <span>المدفوع مقدماً (عربون):</span>
            <strong style="font-size: 13px;">${advancePaid.toFixed(2)} ج.م</strong>
          </div>
        ` : ''}
        ${discountInfo.amount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #b45309;">
            <span>خصم (${escapeHtml(discountInfo.reason)}):</span>
            <strong style="font-size: 13px;">-${discountInfo.amount.toFixed(2)} ج.م</strong>
          </div>
        ` : ''}
        ${ticket.status === 'delivered' ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; border-top: 1px dashed #cbd5e1; padding-top: 4px;">
            <span style="color: #64748b;">المحصل عند الاستلام:</span>
            <strong style="font-size: 13px;">${collectedAtDelivery.toFixed(2)} ج.م</strong>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 900; border-top: 1px dashed #cbd5e1; padding-top: 5px; margin-top: 4px;">
          <span>المتبقي:</span>
          <span style="color: #16a34a;">
            ${ticket.status === 'delivered' ? '0.00 ج.م (خالص بالكامل ✓)' : `${remainingAmount.toFixed(2)} ج.م`}
          </span>
        </div>
      </div>

      <div style="font-size: 10px; color: #64748b; line-height: 1.4; margin-bottom: 16px;">
        <strong style="display: block; color: #334155; margin-bottom: 3px;">شروط الاستلام:</strong>
        <div style="padding-right: 4px;">
          • المركز غير مسؤول عن الأجهزة المتروكة لأكثر من 30 يوماً من تاريخ الإصلاح.<br />
          • المركز غير مسؤول عن فقدان البيانات (Data Loss) أثناء عمليات الصيانة أو السوفت وير.<br />
          • فترة الضمان على قطع الغيار المستبدلة ${ticket.warrantyDays || 30} يوماً بموجب هذا الإيصال.<br />
          • لا يتم تسليم الجهاز إلا بأصل هذا الإيصال أو إثبات الشخصية.
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 11px; text-align: center; color: #475569;">
        <div>توقيع المستلم / الفني<br /><br />.............................</div>
        <div>توقيع العميل<br /><br />.............................</div>
      </div>
    </div>
  `;

  const renderRoot = globalThis.document.createElement('div');
  renderRoot.setAttribute('aria-hidden', 'true');
  renderRoot.style.position = 'fixed';
  renderRoot.style.left = '-20000px';
  renderRoot.style.top = '0';
  renderRoot.style.width = '460px';
  renderRoot.style.opacity = '1';
  renderRoot.style.pointerEvents = 'none';
  renderRoot.innerHTML = html;
  globalThis.document.body.appendChild(renderRoot);

  try {
    const canvas = await html2canvas(renderRoot, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, Math.max(120, (canvas.height * 80) / canvas.width)],
    });

    const pdfWidth = 80;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`ايصال_صيانة_${ticket.ticketNo}.pdf`);
  } catch (err) {
    console.error('Failed to generate PDF receipt:', err);
  } finally {
    renderRoot.remove();
  }
}

export function MaintenanceReceiptModal({ open, ticket, settings, onClose }: MaintenanceReceiptModalProps) {
  const [printMode, setPrintMode] = useState<'receipt' | 'sticker'>('receipt');
  const [stickerPreset, setStickerPreset] = useState<'50x30' | '50x25' | '40x30' | '60x40' | '80-roll'>('50x30');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  if (!open || !ticket) return null;

  const handlePrint = () => {
    if (printMode === 'receipt') {
      printMaintenanceReceipt(ticket, settings);
    } else {
      printMaintenanceSticker(ticket, settings, stickerPreset);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      await exportMaintenanceReceiptPdf(ticket, settings);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSendWhatsApp = async () => {
    // 1. Download PDF automatically for attaching
    try {
      setIsExportingPdf(true);
      await exportMaintenanceReceiptPdf(ticket, settings);
    } catch (err) {
      console.warn('PDF export failed during WhatsApp share:', err);
    } finally {
      setIsExportingPdf(false);
    }

    // 2. Open WhatsApp Web with customer
    let phoneFormatted = ticket.customerPhone.trim().replace(/\D/g, '');
    if (phoneFormatted.startsWith('01')) {
      phoneFormatted = '20' + phoneFormatted.substring(1);
    }
    const storeName = settings?.storeName || 'مخازن رجب العطار';
    const totalCost = ticket.finalCost || ticket.expectedCost || 0;
    const discountInfo = extractTicketDiscount(ticket.technicianNotes);
    const netTotal = Math.max(0, totalCost - discountInfo.amount);
    const advancePaid = ticket.advancePayment || 0;
    const remaining = ticket.status === 'delivered' ? 0 : Math.max(0, netTotal - advancePaid);

    const lines = [
      `*إيصال استلام جهاز صيانة*`,
      `----------------------------------------`,
      `مرحباً بك أستاذ *${ticket.customerName}*`,
      `معك *${storeName}* بخصوص جهازك:`,
      ``,
      `- *الجهاز:* ${ticket.deviceBrand ? `${ticket.deviceBrand} - ` : ''}${ticket.deviceModel}`,
      `- *كود الجهاز:* ${ticket.ticketNo}`,
      `- *العطل المسجل:* ${ticket.problemDescription}`,
      ``,
      `- *إجمالي قيمة الإصلاح:* ${totalCost.toFixed(2)} ج.م`,
      ...(discountInfo.amount > 0 ? [
        `- *خصم خاص للعميل (${discountInfo.reason}):* -${discountInfo.amount.toFixed(2)} ج.م`,
        `- *الصافي بعد الخصم:* ${netTotal.toFixed(2)} ج.م`,
      ] : []),
      ...(advancePaid > 0 ? [`- *المدفوع مقدماً (عربون):* ${advancePaid.toFixed(2)} ج.م`] : []),
      `- *المتبقي عند الاستلام:* ${remaining.toFixed(2)} ج.م ${ticket.status === 'delivered' ? '(خالص بالكامل ✓)' : ''}`,
      `----------------------------------------`,
      `- *تم إرفاق إيصال الاستلام الرسمي بصيغة PDF.*`,
      ``,
      `*شروط الاستلام:*`,
      `- يرجى الاحتفاظ بكود الاستلام (${ticket.ticketNo}) للاستعلام عن الجهاز.`,
      `- لا يتم تسليم الجهاز إلا من خلال رقم الهاتف المسجل أو إثبات الشخصية.`,
      `- فترة الضمان على قطع الغيار ${ticket.warrantyDays || 30} يوماً من تاريخ الإصلاح.`,
      `----------------------------------------`,
      `*نسعد دائماً بخدمتكم!*`,
    ];

    const url = `https://api.whatsapp.com/send/?phone=${phoneFormatted}&text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank');
  };

  const profile = getMaintenanceProfile(settings?.maintenanceProfile);
  const barcodeSvg = buildCode128Svg(ticket.ticketNo);
  const discountInfo = extractTicketDiscount(ticket.technicianNotes);
  let totalCost = ticket.finalCost || ticket.expectedCost || 0;
  if (discountInfo.amount > 0 && ticket.expectedCost > totalCost) {
    totalCost = ticket.expectedCost;
  }
  const netTotal = Math.max(0, totalCost - discountInfo.amount);
  const advancePaid = ticket.advancePayment || 0;
  const collectedAtDelivery = Math.max(0, netTotal - advancePaid);
  const remainingAmount = ticket.status === 'delivered' ? 0 : Math.max(0, netTotal - advancePaid);

  return (
    <DialogShell open={open} onClose={onClose} width="min(580px, 95vw)" ariaLabel="طباعة إيصال استلام الصيانة والستيكر">
      <div className="page-stack" dir="rtl" style={{ gap: '14px', maxWidth: '540px', margin: '0 auto', padding: '14px 18px' }}>
        {/* Top Header & Actions Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          {/* Right: Tabs */}
          <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setPrintMode('receipt')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: printMode === 'receipt' ? '#fff' : 'transparent',
                fontWeight: printMode === 'receipt' ? 800 : 500,
                color: printMode === 'receipt' ? '#0f172a' : '#64748b',
                boxShadow: printMode === 'receipt' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              🧾 إيصال العميل
            </button>
            <button
              type="button"
              onClick={() => setPrintMode('sticker')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: printMode === 'sticker' ? '#fff' : 'transparent',
                fontWeight: printMode === 'sticker' ? 800 : 500,
                color: printMode === 'sticker' ? '#0f172a' : '#64748b',
                boxShadow: printMode === 'sticker' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              🏷️ ستيكر ظهر الجهاز
            </button>
          </div>

          {/* Left: Actions (PDF, WhatsApp, Print) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {printMode === 'receipt' && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  className="btn btn-sm btn-secondary"
                  style={{ fontWeight: 700, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="تنزيل الإيصال كملف PDF"
                >
                  <span>📄</span>
                  <span>{isExportingPdf ? 'جاري التحميل...' : 'PDF'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  disabled={isExportingPdf}
                  className="btn btn-sm"
                  style={{ background: '#22c55e', color: '#fff', border: 'none', fontWeight: 700, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="إرسال عبر واتساب مع تحميل ملف PDF"
                >
                  <span>واتساب</span>
                  <span>💬</span>
                </button>
              </>
            )}
            <Button variant="primary" onClick={handlePrint} style={{ fontWeight: 800, padding: '6px 14px' }}>
              {printMode === 'receipt' ? '🖨️ طباعة (80mm)' : '🖨️ طباعة الستيكر'}
            </Button>
          </div>
        </div>

        {printMode === 'receipt' ? (
          /* Standard Customer Receipt Preview */
          <div
            className="maintenance-printable-receipt"
            style={{
              background: '#fff',
              border: '1px dashed #94a3b8',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '0.85rem',
              lineHeight: 1.5,
              color: '#0f172a',
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #94a3b8', paddingBottom: '12px', marginBottom: '12px' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: 800 }}>{settings?.storeName || 'مركز الصيانة'}</h2>
              {settings?.phone && <div style={{ fontSize: '0.85rem', color: '#475569' }}>هاتف: {settings.phone}</div>}
              {settings?.address && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{settings.address}</div>}
              <div style={{ marginTop: '8px', display: 'inline-block', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                إيصال استلام جهاز للإصلاح
              </div>
            </div>

            {/* Barcode & Ticket No */}
            <div style={{ textAlign: 'center', padding: '6px 0 10px', borderBottom: '1px dashed #cbd5e1', marginBottom: '12px' }}>
              <div style={{ width: '230px', height: '48px', margin: '0 auto 6px' }} dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
              <strong style={{ fontSize: '1.3rem', letterSpacing: '2px', display: 'block', margin: '6px 0 2px', fontFamily: 'monospace', color: '#0284c7' }}>
                {ticket.ticketNo}
              </strong>
              <small style={{ color: '#64748b', display: 'block', marginTop: '2px' }}>
                تاريخ الاستلام: {new Date(ticket.receivedAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
              </small>
            </div>

            {/* Customer & Device Details Table */}
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
                <div>العميل: <strong>{ticket.customerName}</strong></div>
                <div>الهاتف: <strong dir="ltr">{ticket.customerPhone}</strong></div>
                <div style={{ gridColumn: 'span 2' }}>
                  الجهاز: <strong>{ticket.deviceBrand ? `${ticket.deviceBrand} - ` : ''}{ticket.deviceModel}</strong>
                </div>
                {ticket.serialNumber && <div style={{ gridColumn: 'span 2' }}>{profile.serialLabel}: <strong dir="ltr">{ticket.serialNumber}</strong></div>}
                {ticket.passcode && <div style={{ gridColumn: 'span 2' }}>{profile.passcodeLabel}: <strong dir="ltr" style={{ color: '#2563eb' }}>{ticket.passcode}</strong></div>}
              </div>
            </div>

            {/* Problem & Condition */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: '3px' }}>العطل المشتكى منه:</div>
              <div style={{ background: '#fef2f2', padding: '6px 10px', borderRadius: '4px', border: '1px solid #fee2e2', color: '#991b1b' }}>
                {ticket.problemDescription}
              </div>

              {ticket.deviceCondition && (
                <div style={{ marginTop: '6px', fontSize: '0.8rem' }}>
                  <span style={{ fontWeight: 600, color: '#475569' }}>حالة الجهاز الظاهرية: </span>
                  <span>{ticket.deviceCondition}</span>
                </div>
              )}
            </div>

            {/* Financials */}
            <div style={{ borderTop: '1px dashed #94a3b8', borderBottom: '1px dashed #94a3b8', padding: '8px 0', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>القيمة الإجمالية:</span>
                <strong>{totalCost.toFixed(2)} ج.م</strong>
              </div>
              {ticket.advancePayment > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#16a34a' }}>
                  <span>المدفوع مقدماً (عربون):</span>
                  <strong>{ticket.advancePayment.toFixed(2)} ج.م</strong>
                </div>
              )}
              {discountInfo.amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#b45309' }}>
                  <span>خصم ممنوح للعميل ({discountInfo.reason}):</span>
                  <strong>-{discountInfo.amount.toFixed(2)} ج.م</strong>
                </div>
              )}
              {ticket.status === 'delivered' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', borderTop: '1px dashed #e2e8f0', paddingTop: '4px' }}>
                  <span>المحصل عند الاستلام:</span>
                  <strong>{collectedAtDelivery.toFixed(2)} ج.م</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, borderTop: '1px dashed #cbd5e1', paddingTop: '4px', marginTop: '4px' }}>
                <span>المتبقي:</span>
                <span style={{ color: '#16a34a' }}>
                  {ticket.status === 'delivered' ? '0.00 ج.م (خالص بالكامل ✓)' : `${remainingAmount.toFixed(2)} ج.م`}
                </span>
              </div>
            </div>

            {/* Disclaimer / Terms */}
            <div style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'justify', lineHeight: 1.35 }}>
              <strong>شروط الاستلام:</strong>
              <ul style={{ paddingRight: '16px', margin: '4px 0' }}>
                <li>المركز غير مسؤول عن الأجهزة المتروكة لأكثر من 30 يوماً من تاريخ الإصلاح.</li>
                <li>المركز غير مسؤول عن فقدان البيانات (Data Loss) أثناء عمليات الصيانة أو السوفت وير.</li>
                <li>فترة الضمان على قطع الغيار المستبدلة {ticket.warrantyDays || 30} يوماً بموجب هذا الإيصال.</li>
                <li>لا يتم تسليم الجهاز إلا بأصل هذا الإيصال أو إثبات الشخصية.</li>
              </ul>
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '0.75rem', textAlign: 'center' }}>
              <div>توقيع المستلم / الفني<br /><br />...................</div>
              <div>توقيع العميل<br /><br />...................</div>
            </div>
          </div>
        ) : (
          /* Mini Sticker Tag Preview */
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>مقاس الملصق / الطابعة:</label>
              <select
                value={stickerPreset}
                onChange={(e) => setStickerPreset(e.target.value as any)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: '#fff',
                  color: '#0f172a',
                }}
              >
                <option value="50x30">50 × 30 مم (الافتراضي لملصقات الهواتف)</option>
                <option value="50x25">50 × 25 مم</option>
                <option value="40x30">40 × 30 مم</option>
                <option value="60x40">60 × 40 مم</option>
                <option value="80-roll">ورق فواتير حراري 80 مم</option>
              </select>
            </div>

            <div
              className="maintenance-printable-sticker"
              style={{
                background: '#fff',
                border: '2px dashed #0284c7',
                borderRadius: '8px',
                padding: '10px',
                maxWidth: stickerPreset === '80-roll' ? '380px' : '300px',
                margin: '0 auto',
                fontSize: '0.75rem',
                color: '#0f172a',
                textAlign: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '4px' }}>
                {settings?.storeName || 'مركز الصيانة'}
              </div>

              <div style={{ width: '190px', height: '36px', margin: '0 auto 2px' }} dangerouslySetInnerHTML={{ __html: barcodeSvg }} />

              <div style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '1.5px', color: '#0284c7', margin: '2px 0 4px' }}>
                {ticket.ticketNo}
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '6px 8px', textAlign: 'right', fontSize: '0.72rem', lineHeight: 1.4 }}>
                <div>العميل: <strong>{ticket.customerName}</strong> ({ticket.customerPhone})</div>
                <div>الجهاز: <strong>{ticket.deviceBrand ? `${ticket.deviceBrand} - ` : ''}{ticket.deviceModel}</strong></div>
                {ticket.passcode && <div>{profile.passcodeLabel}: <strong dir="ltr" style={{ color: '#2563eb' }}>{ticket.passcode}</strong></div>}
                <div style={{ color: '#dc2626', fontWeight: 700 }}>العطل: {ticket.problemDescription}</div>
              </div>

              <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
                تاريخ الاستلام: {new Date(ticket.receivedAt).toLocaleDateString('ar-EG')}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
          <Button variant="secondary" onClick={onClose} style={{ padding: '6px 20px', fontWeight: 700 }}>
            إغلاق
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
