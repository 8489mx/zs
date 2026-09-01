import type { Sale } from '@/types/domain';
import { formatCurrency, formatDate } from '@/lib/format';
import { triggerHaptic } from '@/shared/utils/haptics';

export function buildSaleWhatsAppMessage(sale: Sale, storeName?: string): string {
  const storeHeader = storeName ? `🏪 *${storeName}*\n` : '🏪 *فاتورة مبيعات*\n';
  const invoiceInfo = `🧾 *فاتورة رقم:* #${sale.docNo || sale.id}\n📅 *التاريخ:* ${formatDate(sale.date)}\n👤 *العميل:* ${sale.customerName || 'عميل نقدي'}\n`;
  
  let itemsText = '\n📦 *تفاصيل الأصناف:*\n';
  if (sale.items && sale.items.length > 0) {
    sale.items.forEach((item, index) => {
      const unit = item.unitName ? ` (${item.unitName})` : '';
      itemsText += `${index + 1}. ${item.name}${unit} × ${item.qty} = ${formatCurrency(item.total)}\n`;
    });
  }

  const totalsText = `\n💰 *الإجمالي:* ${formatCurrency(sale.total)}`;
  const paidText = sale.paidAmount !== undefined ? `\n💵 *المدفوع:* ${formatCurrency(sale.paidAmount)}` : '';
  const remaining = Math.max(0, Number(sale.total || 0) - Number(sale.paidAmount || 0));
  const remainingText = remaining > 0 ? `\n⚠️ *المتبقي:* ${formatCurrency(remaining)}` : '';
  
  const footer = '\n\n✨ شكراً لتعاملكم معنا!';

  return `${storeHeader}${invoiceInfo}${itemsText}${totalsText}${paidText}${remainingText}${footer}`.trim();
}

export async function shareSaleViaWhatsApp(
  sale: Sale,
  options?: { customerPhone?: string; storeName?: string }
): Promise<void> {
  triggerHaptic('selection');
  const message = buildSaleWhatsAppMessage(sale, options?.storeName);
  const rawPhone = options?.customerPhone || (sale as any).customerPhone || '';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  
  let formattedPhone = cleanPhone;
  if (formattedPhone.startsWith('01') && formattedPhone.length === 11) {
    formattedPhone = `2${formattedPhone}`;
  }

  const encodedText = encodeURIComponent(message);
  const waUrl = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  if (!formattedPhone && typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: `فاتورة #${sale.docNo || sale.id}`,
        text: message,
      });
      triggerHaptic('success');
      return;
    } catch {
      // Fallback
    }
  }

  window.open(waUrl, '_blank', 'noopener,noreferrer');
  triggerHaptic('success');
}
