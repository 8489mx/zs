import { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { buildCode128Svg } from '@/lib/barcode';
import { escapeHtml, printHtmlDocument } from '@/lib/browser';
import type { MaintenanceTicket } from '@/types/domain-models/maintenance';
import type { AppSettings } from '@/types/domain';

interface MaintenanceReceiptModalProps {
  open: boolean;
  ticket: MaintenanceTicket | null;
  settings?: AppSettings | null;
  onClose: () => void;
}

export function printMaintenanceReceipt(ticket: MaintenanceTicket, settings?: AppSettings | null) {
  const barcodeSvg = buildCode128Svg(ticket.ticketNo);
  const totalCost = ticket.finalCost || ticket.expectedCost || 0;
  const advancePaid = ticket.advancePayment || 0;
  const remainingAmount = Math.max(0, totalCost - advancePaid);
  const dateFormatted = new Date(ticket.receivedAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
  const storeName = settings?.storeName || 'مركز الصيانة';
  const phone = settings?.phone || '';
  const address = settings?.address || '';

  const html = `
    <div style="text-align: center; margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 6px;">
      <h2 style="margin: 0 0 2px; font-size: 16px; font-weight: 800; color: #000;">${escapeHtml(storeName)}</h2>
      ${phone ? `<div style="font-size: 11px; font-weight: 700; color: #000;">هاتف: ${escapeHtml(phone)}</div>` : ''}
      ${address ? `<div style="font-size: 10px; color: #333;">${escapeHtml(address)}</div>` : ''}
      <div style="margin-top: 4px; display: inline-block; padding: 2px 8px; border: 1px solid #000; border-radius: 4px; font-weight: 800; font-size: 12px; color: #000;">
        إيصال استلام جهاز للإصلاح
      </div>
    </div>

    <div style="text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 8px;">
      <div style="width: 220px; height: 46px; margin: 0 auto 10px; display: block;">${barcodeSvg}</div>
      <div style="font-size: 16px; font-weight: 900; letter-spacing: 2px; font-family: monospace; color: #000; margin: 10px 0 3px; padding-top: 4px;">
        ${escapeHtml(ticket.ticketNo)}
      </div>
      <div style="font-size: 10px; color: #000; font-weight: 600;">تاريخ الاستلام: ${escapeHtml(dateFormatted)}</div>
    </div>

    <div style="border: 1px solid #000; border-radius: 4px; padding: 6px 8px; margin-bottom: 8px; font-size: 11px; line-height: 1.4; color: #000;">
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 3px;">
        <span>العميل: <strong>${escapeHtml(ticket.customerName)}</strong></span>
        <span dir="ltr"><strong>${escapeHtml(ticket.customerPhone)}</strong></span>
      </div>
      <div style="font-weight: 700; font-size: 12px; margin-bottom: 2px;">
        الجهاز: ${escapeHtml(ticket.deviceBrand ? `${ticket.deviceBrand} - ` : '')}${escapeHtml(ticket.deviceModel)}
      </div>
      ${ticket.serialNumber ? `<div style="font-size: 10px; font-family: monospace;" dir="ltr">IMEI: ${escapeHtml(ticket.serialNumber)}</div>` : ''}
      ${ticket.passcode ? `<div style="font-weight: 700; color: #000;">الرمز / قفل الشاشة: <span dir="ltr">${escapeHtml(ticket.passcode)}</span></div>` : ''}
    </div>

    <div style="border: 1px solid #000; border-radius: 4px; padding: 6px 8px; margin-bottom: 8px; font-size: 11px; color: #000;">
      <div style="font-weight: 800; text-decoration: underline; margin-bottom: 2px;">العطل المشتكى منه:</div>
      <div style="font-weight: 700;">${escapeHtml(ticket.problemDescription)}</div>
      ${ticket.deviceCondition ? `<div style="font-size: 10px; margin-top: 3px; color: #333;">الحالة الظاهرية: ${escapeHtml(ticket.deviceCondition)}</div>` : ''}
    </div>

    <div style="border: 1px solid #000; border-radius: 4px; padding: 6px 8px; margin-bottom: 8px; font-size: 11px; color: #000;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>التكلفة التقديرية:</span>
        <strong>${totalCost.toFixed(2)} ج.م</strong>
      </div>
      ${advancePaid > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span>المدفوع مقدماً (عربون):</span>
          <strong>${advancePaid.toFixed(2)} ج.م</strong>
        </div>
      ` : ''}
      <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 900; border-top: 1px dashed #000; padding-top: 3px; margin-top: 2px;">
        <span>المتبقي عند الاستلام:</span>
        <strong>${remainingAmount > 0 ? `${remainingAmount.toFixed(2)} ج.م` : 'خالص بالكامل ✓'}</strong>
      </div>
    </div>

    <div style="font-size: 9px; line-height: 1.3; color: #000; margin-bottom: 8px;">
      <strong style="display: block; text-decoration: underline; margin-bottom: 2px;">شروط الاستلام:</strong>
      <div style="padding-right: 4px;">
        • المركز غير مسؤول عن الأجهزة المتروكة لأكثر من 30 يوماً من تاريخ الإصلاح.<br />
        • المركز غير مسؤول عن فقدان البيانات (Data Loss) أثناء عمليات الصيانة.<br />
        • الضمان على القطع المستبدلة ${ticket.warrantyDays || 30} يوماً بموجب هذا الإيصال.<br />
        • لا يتم تسليم الجهاز إلا بأصل هذا الإيصال.
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 12px; padding-top: 6px; border-top: 1px dashed #000; font-size: 10px; font-weight: 700; text-align: center; color: #000;">
      <div>توقيع الفني / المستلم<br /><br />...................</div>
      <div>توقيع العميل<br /><br />...................</div>
    </div>
  `;

  printHtmlDocument(`إيصال استلام ${ticket.ticketNo}`, html, {
    pageSize: 'receipt',
    layout: 'centered',
    extraStyles: `
      @media print {
        body.receipt-mode { width: 76mm !important; max-width: 76mm !important; margin: 0 auto !important; padding: 0 !important; color: #000 !important; }
        * { color: #000 !important; font-weight: 600; }
        strong, h2, h3 { font-weight: 900 !important; }
      }
    `,
  });
}

export function printMaintenanceSticker(ticket: MaintenanceTicket, settings?: AppSettings | null) {
  const barcodeSvg = buildCode128Svg(ticket.ticketNo);
  const dateFormatted = new Date(ticket.receivedAt).toLocaleDateString('ar-EG');
  const storeName = settings?.storeName || 'مركز الصيانة';

  const html = `
    <div class="sticker-box">
      <div class="sticker-store">${escapeHtml(storeName)} - كود الصيانة</div>
      <div class="sticker-barcode">${barcodeSvg}</div>
      <div class="sticker-code">${escapeHtml(ticket.ticketNo)}</div>
      <div class="sticker-details">
        <div><b>العميل:</b> ${escapeHtml(ticket.customerName)} (${escapeHtml(ticket.customerPhone)})</div>
        <div><b>الجهاز:</b> ${escapeHtml(ticket.deviceBrand ? `${ticket.deviceBrand} - ` : '')}${escapeHtml(ticket.deviceModel)}</div>
        ${ticket.passcode ? `<div><b>الرمز:</b> <span dir="ltr">${escapeHtml(ticket.passcode)}</span></div>` : ''}
        <div><b>العطل:</b> ${escapeHtml(ticket.problemDescription)}</div>
      </div>
      <div class="sticker-date">تاريخ الدخول: ${escapeHtml(dateFormatted)}</div>
    </div>
  `;

  printHtmlDocument(`ستيكر ${ticket.ticketNo}`, html, {
    pageSize: 'auto',
    extraStyles: `
      @page { size: 50mm 30mm; margin: 1mm; }
      body { margin: 0; padding: 0; background: #fff; font-family: Tahoma, Arial, sans-serif; font-size: 8px; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-shell { padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; }
      .print-content { padding: 0 !important; margin: 0 !important; }
      .sticker-box { width: 100%; max-width: 48mm; margin: 0 auto; text-align: center; box-sizing: border-box; }
      .sticker-store { font-size: 7.5px; font-weight: 800; margin-bottom: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .sticker-barcode { width: 100%; height: 26px; margin: 2px auto 4px; }
      .sticker-barcode svg { width: 100%; height: 100%; display: block; }
      .sticker-code { font-size: 11px; font-weight: 900; font-family: monospace; letter-spacing: 1px; margin: 4px 0; }
      .sticker-details { text-align: right; font-size: 7px; line-height: 1.25; border-top: 0.5px solid #000; border-bottom: 0.5px solid #000; padding: 1px 0; }
      .sticker-date { font-size: 6px; color: #333; margin-top: 1px; }
    `,
  });
}

export async function exportMaintenanceReceiptPdf(ticket: MaintenanceTicket, settings?: Partial<AppSettings> | null) {
  const barcodeSvg = buildCode128Svg(ticket.ticketNo);
  const totalCost = ticket.finalCost || ticket.expectedCost || 0;
  const advancePaid = ticket.advancePayment || 0;
  const remainingAmount = Math.max(0, totalCost - advancePaid);
  const dateFormatted = new Date(ticket.receivedAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
  const storeName = settings?.storeName || 'مركز الصيانة';
  const phone = settings?.phone || '';
  const address = settings?.address || '';

  const html = `
    <div style="width: 460px; margin: 0 auto; padding: 24px; background: #ffffff; color: #0f172a; font-family: Tahoma, Arial, sans-serif; direction: rtl; border: 1px solid #cbd5e1; border-radius: 12px; box-sizing: border-box;">
      <div style="text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 14px; margin-bottom: 14px;">
        <h2 style="margin: 0 0 4px; font-size: 22px; font-weight: 900; color: #0f172a;">${escapeHtml(storeName)}</h2>
        ${phone ? `<div style="font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 2px;">هاتف: ${escapeHtml(phone)}</div>` : ''}
        ${address ? `<div style="font-size: 11px; color: #64748b;">${escapeHtml(address)}</div>` : ''}
        <div style="margin-top: 8px; display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; color: #0f172a; padding: 4px 14px; border-radius: 6px; font-weight: 800; font-size: 13px;">
          إيصال استلام جهاز للإصلاح
        </div>
      </div>

      <div style="text-align: center; padding: 6px 0 16px; border-bottom: 2px dashed #94a3b8; margin-bottom: 16px;">
        <div style="width: 240px; height: 48px; margin: 0 auto 12px; display: block;">${barcodeSvg}</div>
        <div style="font-size: 20px; font-weight: 900; letter-spacing: 2px; font-family: monospace; color: #0284c7; margin: 12px 0 4px; padding-top: 4px;">
          ${escapeHtml(ticket.ticketNo)}
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 600;">
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
        ${ticket.serialNumber ? `<div style="font-size: 11px; color: #64748b; font-family: monospace;" dir="ltr">IMEI: ${escapeHtml(ticket.serialNumber)}</div>` : ''}
        ${ticket.passcode ? `<div style="font-weight: 800; color: #2563eb; margin-top: 2px;">الرمز / قفل الشاشة: <span dir="ltr">${escapeHtml(ticket.passcode)}</span></div>` : ''}
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
          <span style="color: #64748b;">التكلفة التقديرية / النهائية:</span>
          <strong style="font-size: 13px;">${totalCost.toFixed(2)} ج.م</strong>
        </div>
        ${advancePaid > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #16a34a;">
            <span>المدفوع مقدماً (عربون):</span>
            <strong style="font-size: 13px;">${advancePaid.toFixed(2)} ج.م</strong>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 900; border-top: 1px dashed #cbd5e1; padding-top: 5px; margin-top: 4px;">
          <span>المتبقي عند الاستلام:</span>
          <span style="color: ${remainingAmount > 0 ? '#dc2626' : '#16a34a'};">
            ${remainingAmount > 0 ? `${remainingAmount.toFixed(2)} ج.م` : 'خالص بالكامل ✓'}
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

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = 210;
    const imgWidth = 140;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const marginX = (pdfWidth - imgWidth) / 2;
    pdf.addImage(imgData, 'PNG', marginX, 15, imgWidth, imgHeight);
    pdf.save(`إيصال_صيانة_${ticket.ticketNo}.pdf`);
  } finally {
    renderRoot.remove();
  }
}

export function MaintenanceReceiptModal({ open, ticket, settings, onClose }: MaintenanceReceiptModalProps) {
  const [printMode, setPrintMode] = useState<'receipt' | 'sticker'>('receipt');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  if (!open || !ticket) return null;

  const handlePrint = () => {
    if (printMode === 'receipt') {
      printMaintenanceReceipt(ticket, settings);
    } else {
      printMaintenanceSticker(ticket, settings);
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
    const advancePaid = ticket.advancePayment || 0;
    const remaining = Math.max(0, totalCost - advancePaid);

    const lines = [
      `🧾 *إيصال استلام جهاز صيانة* 🧾`,
      `مرحباً بك أستاذ *${ticket.customerName}* 👋`,
      `معك *${storeName}* بخصوص جهازك:`,
      ``,
      `📱 *الجهاز:* ${ticket.deviceBrand ? `${ticket.deviceBrand} - ` : ''}${ticket.deviceModel}`,
      `🔢 *كود الجهاز:* ${ticket.ticketNo}`,
      `🔧 *العطل المسجل:* ${ticket.problemDescription}`,
      ``,
      `💰 *إجمالي التكلفة التقديرية:* ${totalCost.toFixed(2)} ج.م`,
      ...(advancePaid > 0 ? [`💵 *المدفوع مقدماً:* ${advancePaid.toFixed(2)} ج.م`] : []),
      `⏳ *المتبقي عند الاستلام:* ${remaining.toFixed(2)} ج.م`,
      ``,
      `📄 *تم تنزيل ملف الإيصال PDF بالكامل لحفظه والرجوع إليه.*`,
      ``,
      `⚠️ *شروط الاستلام:*`,
      `• يرجى الاحتفاظ بكود الاستلام (${ticket.ticketNo}) للاستعلام عن الجهاز.`,
      `• لا يتم تسليم الجهاز إلا من خلال رقم الهاتف المسجل أو إثبات الشخصية.`,
      `• فترة الضمان على قطع الغيار 30 يوماً من تاريخ الإصلاح.`,
      ``,
      `نسعد دائماً بخدمتكم! ✨`,
    ];

    const url = `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank');
  };

  const barcodeSvg = buildCode128Svg(ticket.ticketNo);
  const remainingAmount = Math.max(0, (ticket.finalCost || ticket.expectedCost || 0) - (ticket.advancePayment || 0));

  return (
    <DialogShell open={open} onClose={onClose} width="min(560px, 95vw)" ariaLabel="طباعة إيصال استلام الصيانة والستيكر">
      <div className="page-stack" dir="rtl" style={{ gap: '14px', maxWidth: '520px', margin: '0 auto', padding: '12px 16px' }}>
        {/* Top Header & Actions Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="btn btn-sm btn-secondary"
              style={{ fontWeight: 700, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="تنزيل الإيصال كملف PDF"
            >
              <span>📄</span>
              <span>{isExportingPdf ? 'جاري التجهيز...' : 'PDF'}</span>
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
            <div style={{ textAlign: 'center', padding: '6px 0 14px', borderBottom: '1px dashed #cbd5e1', marginBottom: '14px' }}>
              <div style={{ width: '230px', height: '48px', margin: '0 auto 12px' }} dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
              <strong style={{ fontSize: '1.35rem', letterSpacing: '2px', display: 'block', margin: '12px 0 4px', fontFamily: 'monospace', color: '#0284c7' }}>
                {ticket.ticketNo}
              </strong>
              <small style={{ color: '#64748b', display: 'block', marginTop: '3px' }}>
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
                {ticket.serialNumber && <div style={{ gridColumn: 'span 2' }}>السيريال / IMEI: <strong dir="ltr">{ticket.serialNumber}</strong></div>}
                {ticket.passcode && <div style={{ gridColumn: 'span 2' }}>الرمز / قفل الشاشة: <strong dir="ltr" style={{ color: '#2563eb' }}>{ticket.passcode}</strong></div>}
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
                <span>التكلفة التقديرية / النهائية:</span>
                <strong>{(ticket.finalCost || ticket.expectedCost || 0).toFixed(2)} ج.م</strong>
              </div>
              {ticket.advancePayment > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#16a34a' }}>
                  <span>المدفوع مقدماً (عربون):</span>
                  <strong>{ticket.advancePayment.toFixed(2)} ج.م</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800 }}>
                <span>المتبقي عند الاستلام:</span>
                <span style={{ color: remainingAmount > 0 ? '#dc2626' : '#16a34a' }}>
                  {remainingAmount > 0 ? `${remainingAmount.toFixed(2)} ج.م` : 'خالص بالكامل ✓'}
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
          <div
            className="maintenance-printable-sticker"
            style={{
              background: '#fff',
              border: '2px dashed #0284c7',
              borderRadius: '8px',
              padding: '12px',
              maxWidth: '320px',
              margin: '0 auto',
              fontSize: '0.8rem',
              color: '#0f172a',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
              {settings?.storeName || 'مركز الصيانة'} - بطاقة تعريف الجهاز
            </div>

            <div style={{ width: '200px', height: '44px', margin: '0 auto' }} dangerouslySetInnerHTML={{ __html: barcodeSvg }} />

            <div style={{ fontSize: '1.35rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '2px', color: '#0284c7', margin: '6px 0 8px' }}>
              {ticket.ticketNo}
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px', textAlign: 'right', fontSize: '0.75rem', lineHeight: 1.45 }}>
              <div>العميل: <strong>{ticket.customerName}</strong> ({ticket.customerPhone})</div>
              <div>الجهاز: <strong>{ticket.deviceBrand ? `${ticket.deviceBrand} - ` : ''}{ticket.deviceModel}</strong></div>
              {ticket.passcode && <div>الرمز / القفل: <strong dir="ltr" style={{ color: '#2563eb' }}>{ticket.passcode}</strong></div>}
              <div style={{ color: '#dc2626', fontWeight: 600 }}>العطل: {ticket.problemDescription}</div>
            </div>

            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '6px' }}>
              تاريخ الاستلام: {new Date(ticket.receivedAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
          <Button variant="secondary" onClick={onClose}>
            إغلاق
          </Button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="btn btn-sm btn-secondary"
              style={{ fontWeight: 700, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>📄</span>
              <span>{isExportingPdf ? 'جاري التحميل...' : 'تحميل PDF'}</span>
            </button>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={isExportingPdf}
              className="btn btn-sm"
              style={{ background: '#22c55e', color: '#fff', border: 'none', fontWeight: 700, padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}
            >
              📱 إرسال واتساب
            </button>
            <Button variant="primary" onClick={handlePrint} style={{ fontWeight: 800 }}>
              {printMode === 'receipt' ? '🧾 طباعة إيصال' : '🏷️ طباعة استيكر'}
            </Button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
