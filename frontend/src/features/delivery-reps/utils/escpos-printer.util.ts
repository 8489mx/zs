/**
 * ESC/POS Mobile Thermal Printer Utility for Van Sales & Field Delivery
 * Supports portable belt-clip 58mm/80mm Bluetooth printers and Sunmi/iMin POS terminals.
 */

export interface VanSaleReceiptItem {
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  unitName?: string;
  isBonus?: boolean;
}

export interface VanSaleReceiptData {
  companyName?: string;
  taxNumber?: string;
  invoiceNo: string;
  tripId?: number | null;
  repName: string;
  customerName: string;
  customerPhone?: string;
  dateStr: string;
  items: VanSaleReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paidAmount?: number;
  remainingBalance?: number;
  qrCodeData?: string;
}

export class EscPosPrinterUtil {
  // ESC/POS Command Constants
  static readonly ESC = 0x1b;
  static readonly GS = 0x1d;
  static readonly LF = 0x0a;

  /**
   * Generates formatted ESC/POS byte commands for a 58mm or 80mm thermal receipt
   */
  static generateReceiptBytes(data: VanSaleReceiptData, width: '58mm' | '80mm' = '58mm'): Uint8Array {
    const _charsPerLine = width === '80mm' ? 48 : 32;
    void _charsPerLine;
    const bytes: number[] = [];

    const pushBytes = (...vals: number[]) => bytes.push(...vals);
    const pushText = (text: string) => {
      // Encode string to UTF-8
      const enc = new TextEncoder().encode(text);
      for (const b of enc) bytes.push(b);
    };
    const pushLine = (text = '') => {
      pushText(text);
      bytes.push(EscPosPrinterUtil.LF);
    };

    // 1. Initialize Printer (ESC @)
    pushBytes(0x1b, 0x40);

    // 2. Center Align (ESC a 1)
    pushBytes(0x1b, 0x61, 0x01);

    // Header: Company Name in Double-Height Bold
    pushBytes(0x1b, 0x45, 0x01); // Bold ON
    pushBytes(0x1d, 0x21, 0x11); // Double size
    pushLine(data.companyName || 'فاتورة مبيعات التوزيع');
    pushBytes(0x1d, 0x21, 0x00); // Normal size
    pushBytes(0x1b, 0x45, 0x00); // Bold OFF

    if (data.taxNumber) {
      pushLine(`الرقم الضريبي: ${data.taxNumber}`);
    }
    pushLine('--------------------------------');

    // 3. Invoice Metadata
    pushBytes(0x1b, 0x61, 0x00); // Left/Start align
    pushLine(`رقم الفاتورة: ${data.invoiceNo}`);
    pushLine(`المندوب: ${data.repName}`);
    pushLine(`العميل: ${data.customerName}`);
    if (data.customerPhone) pushLine(`هاتف: ${data.customerPhone}`);
    pushLine(`التاريخ: ${data.dateStr}`);
    pushLine('================================');

    // 4. Table Header
    pushBytes(0x1b, 0x45, 0x01); // Bold
    if (width === '80mm') {
      pushLine('الصنف                    الكمية   السعر  الإجمالي');
    } else {
      pushLine('الصنف             الكمية  السعر  الإجمالي');
    }
    pushBytes(0x1b, 0x45, 0x00); // Normal
    pushLine('--------------------------------');

    // 5. Items Lines
    for (const item of data.items) {
      const bonusTag = item.isBonus ? ' [بونص]' : '';
      const name = `${item.name}${bonusTag}`;
      const qtyStr = `${item.qty} ${item.unitName || ''}`.trim();
      const priceStr = item.isBonus ? '0.00' : Number(item.unitPrice).toFixed(2);
      const totalStr = item.isBonus ? '0.00' : Number(item.lineTotal).toFixed(2);

      // Line 1: Item Name
      pushLine(name);
      // Line 2: Qty x Price = Total
      const detailLine = `   ${qtyStr} x ${priceStr} = ${totalStr} ج.م`;
      pushLine(detailLine);
    }
    pushLine('================================');

    // 6. Summary Totals (Right Aligned)
    pushBytes(0x1b, 0x61, 0x02); // Right align
    if (data.discount > 0) {
      pushLine(`الإجمالي قبل الخصم: ${data.subtotal.toFixed(2)} ج.م`);
      pushLine(`خصم / وفر العروض: ${data.discount.toFixed(2)} ج.م`);
    }

    pushBytes(0x1b, 0x45, 0x01); // Bold
    pushBytes(0x1d, 0x21, 0x01); // Double height
    pushLine(`صافي الفاتورة: ${data.total.toFixed(2)} ج.م`);
    pushBytes(0x1d, 0x21, 0x00); // Normal
    pushBytes(0x1b, 0x45, 0x00);

    const paymentLabel = data.paymentMethod === 'cash' ? 'نقداً (كاش)' : data.paymentMethod === 'credit' ? 'آجل' : 'شبكة / بطاقة';
    pushLine(`طريقة الدفع: ${paymentLabel}`);

    if (data.remainingBalance != null && data.remainingBalance > 0) {
      pushLine(`الرصيد المتبقي على العميل: ${data.remainingBalance.toFixed(2)} ج.م`);
    }

    // 7. Footer
    pushBytes(0x1b, 0x61, 0x01); // Center
    pushLine('--------------------------------');
    pushLine('شكراً لتعاملكم معنا');
    pushLine('منظومة زد لإدارة التوزيع والجملة');

    // Feed lines & Cut paper
    pushBytes(EscPosPrinterUtil.LF, EscPosPrinterUtil.LF, EscPosPrinterUtil.LF);
    pushBytes(0x1d, 0x56, 0x42, 0x00); // GS V B 0 (Partial Cut)

    return new Uint8Array(bytes);
  }

  /**
   * Connects via Web Bluetooth API to portable belt printer and dispatches raw bytes
   */
  static async printViaBluetooth(receiptBytes: Uint8Array): Promise<{ ok: boolean; message: string }> {
    if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) {
      throw new Error('المتصفح أو الجهاز الحالي لا يدعم تقنية Web Bluetooth. يرجى تفعيل البلوتوث واستخدام متصفح Chrome/Edge.');
    }

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
          { services: ['e7810a71-73ae-499d-8c15-faa9aef0c3f2'] },
          { services: ['49535343-fe7d-4ae5-8fa9-9fafd205e455'] },
        ],
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        ],
      });

      const server = await device.gatt.connect();

      // Find primary service
      let service: any;
      const serviceUuids = [
        '000018f0-0000-1000-8000-00805f9b34fb',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      ];
      for (const uuid of serviceUuids) {
        try {
          service = await server.getPrimaryService(uuid);
          if (service) break;
        } catch {
          // try next
        }
      }

      if (!service) {
        throw new Error('لم يتم العثور على خدمة الطباعة البلوتوث المتوافقة في الجهاز.');
      }

      const characteristics = await service.getCharacteristics();
      const writeChar = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);

      if (!writeChar) {
        throw new Error('طابعة البلوتوث لا تسمح بأوامر الإرسال المباشرة.');
      }

      // Write in 512-byte chunks to prevent buffer overflow
      const chunkSize = 512;
      for (let i = 0; i < receiptBytes.length; i += chunkSize) {
        const chunk = receiptBytes.slice(i, i + chunkSize);
        await writeChar.writeValue(chunk);
      }

      return { ok: true, message: 'تم إرسال الفاتورة للطابعة الحرارية بنجاح' };
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return { ok: false, message: 'تم إلغاء اختيار الطابعة' };
      }
      throw err;
    }
  }

  /**
   * Browser silent iframe fallback print
   */
  static printViaBrowserThermal(data: VanSaleReceiptData) {
    const printWindow = window.open('', '_blank', 'width=380,height=600');
    if (!printWindow) return;

    const itemsHtml = data.items
      .map(
        (it) => `
        <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
          <span>${it.name} ${it.isBonus ? '<b style="color:green;">[بونص]</b>' : ''}</span>
          <span>${it.isBonus ? '0.00' : it.lineTotal.toFixed(2)} ج.م</span>
        </div>
        <div style="font-size: 10px; color: #64748b; margin-bottom: 5px;">
          ${it.qty} ${it.unitName || ''} × ${it.isBonus ? '0.00' : it.unitPrice.toFixed(2)}
        </div>
      `,
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <title>فاتورة ${data.invoiceNo}</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          body { font-family: system-ui, sans-serif; font-size: 11px; margin: 6px; padding: 0; color: #000; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 14px;">${data.companyName || 'فاتورة مبيعات التوزيع'}</div>
        ${data.taxNumber ? `<div class="center" style="font-size: 10px;">الرقم الضريبي: ${data.taxNumber}</div>` : ''}
        <div class="divider"></div>
        <div>رقم الفاتورة: <b>${data.invoiceNo}</b></div>
        <div>المندوب: ${data.repName}</div>
        <div>العميل: <b>${data.customerName}</b></div>
        <div>التاريخ: ${data.dateStr}</div>
        <div class="divider"></div>
        ${itemsHtml}
        <div class="divider"></div>
        <div style="display:flex; justify-content:space-between;">
          <span>صافي الفاتورة:</span>
          <span class="bold" style="font-size: 13px;">${data.total.toFixed(2)} ج.م</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size: 10px;">
          <span>طريقة الدفع:</span>
          <span>${data.paymentMethod === 'cash' ? 'نقداً (كاش)' : 'آجل'}</span>
        </div>
        ${data.remainingBalance != null ? `
          <div style="display:flex; justify-content:space-between; font-size: 10px; color: #b91c1c;">
            <span>المتبقي على العميل:</span>
            <span>${data.remainingBalance.toFixed(2)} ج.م</span>
          </div>
        ` : ''}
        <div class="divider"></div>
        <div class="center" style="font-size: 10px;">شكراً لتعاملكم معنا<br/>منظومة زد لإدارة التوزيع</div>
        <script>
          window.onload = function() { window.print(); window.close(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
}
