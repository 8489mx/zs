import { Quotation } from '@/features/sales/api/quotations.api';
import { getGlobalCurrencySymbol } from '@/lib/currencies';

export function printQuotation(q: Quotation) {
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) return;

  const items = q.items || [];
  const itemsHtml = items.map((item: any, idx: number) => `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td><strong>${item.product_name || item.productName || ''}</strong></td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: left;">${Number(item.unit_price ?? item.unitPrice ?? 0).toLocaleString('ar-EG')} ${getGlobalCurrencySymbol()}</td>
      <td style="text-align: left;">${Number(item.tax_amount || 0).toLocaleString('ar-EG')} ${getGlobalCurrencySymbol()}</td>
      <td style="text-align: left; font-weight: bold;">${Number(item.total).toLocaleString('ar-EG')} ${getGlobalCurrencySymbol()}</td>
    </tr>
  `).join('');

  const content = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>عرض سعر #${q.quotation_number}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #170e5e; padding-bottom: 15px; margin-bottom: 20px; }
          .brand { font-size: 22px; font-weight: 900; color: #170e5e; }
          .meta { font-size: 13px; color: #64748b; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; font-size: 13px; background: #f8fafc; padding: 15px; border-radius: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 10px; font-size: 12px; font-weight: bold; }
          td { border: 1px solid #e2e8f0; padding: 10px; font-size: 13px; }
          .totals { margin-inline-start: auto; width: 300px; font-size: 14px; }
          .totals-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0; }
          .totals-row.grand { font-weight: 900; font-size: 17px; color: #170e5e; border-top: 2px solid #170e5e; border-bottom: none; }
          .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">عرض سعر (QUOTATION)</div>
            <div class="meta">رقم العرض: <strong>#${q.quotation_number}</strong></div>
            <div class="meta">التاريخ: ${new Date(q.created_at).toLocaleDateString('ar-EG')}</div>
            ${q.valid_until ? `<div class="meta">صالح حتى: ${new Date(q.valid_until).toLocaleDateString('ar-EG')}</div>` : ''}
          </div>
        </div>

        <div class="info-grid">
          <div>
            <strong>بيانات العميل:</strong>
            <div>الاسم: ${q.customer_name}</div>
            ${q.customer_phone ? `<div>الهاتف: ${q.customer_phone}</div>` : ''}
            ${q.customer_address ? `<div>العنوان: ${q.customer_address}</div>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>الصنف / البيان</th>
              <th style="width: 70px;">الكمية</th>
              <th style="width: 100px;">سعر الوحدة</th>
              <th style="width: 90px;">الضريبة</th>
              <th style="width: 110px;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>المجموع الفرعي:</span>
            <span>${Number(q.subtotal).toLocaleString('ar-EG')} ${getGlobalCurrencySymbol()}</span>
          </div>
          ${Number(q.tax_amount) > 0 ? `
            <div class="totals-row">
              <span>ضريبة القيمة المضافة:</span>
              <span>${Number(q.tax_amount).toLocaleString('ar-EG')} ${getGlobalCurrencySymbol()}</span>
            </div>
          ` : ''}
          <div class="totals-row grand">
            <span>الإجمالي النهائي:</span>
            <span>${Number(q.total_amount).toLocaleString('ar-EG')} ${getGlobalCurrencySymbol()}</span>
          </div>
        </div>

        ${q.notes ? `
          <div style="margin-top: 20px; font-size: 12px; color: #475569;">
            <strong>ملاحظات:</strong> ${q.notes}
          </div>
        ` : ''}

        ${q.terms_conditions ? `
          <div class="footer">
            <strong>الشروط والأحكام:</strong>
            <div>${q.terms_conditions}</div>
          </div>
        ` : ''}

        <script>
          window.print();
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(content);
  printWindow.document.close();
}
