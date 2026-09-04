/**
 * Utility helpers for WhatsApp messaging and formatting across Z-Systems
 */

export function cleanWhatsAppPhone(phone: string): string {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  if (!digits) return '';

  // Egyptian numbers starting with 01
  if (digits.startsWith('01') && digits.length === 11) {
    return `2${digits}`;
  }
  // Saudi numbers starting with 05
  if (digits.startsWith('05') && digits.length === 10) {
    return `966${digits.slice(1)}`;
  }
  // Saudi numbers without 0 (e.g. 5xxxxxxxx)
  if (digits.startsWith('5') && digits.length === 9) {
    return `966${digits}`;
  }
  // Already has country code
  return digits;
}

export function openWhatsAppChat(phone: string, message: string): boolean {
  const target = cleanWhatsAppPhone(phone);
  if (!target) return false;
  const url = `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

export function openWhatsApp(urlOrPhone: string, message?: string): boolean {
  if (urlOrPhone.startsWith('http') || urlOrPhone.startsWith('whatsapp:')) {
    window.open(urlOrPhone, '_blank', 'noopener,noreferrer');
    return true;
  }
  return openWhatsAppChat(urlOrPhone, message || '');
}

export function formatInstallmentReminderMessage({
  customerName,
  installmentNumber,
  totalInstallments,
  amount,
  dueDate,
  planNumber,
  storeName,
}: {
  customerName: string;
  installmentNumber: number;
  totalInstallments?: number;
  amount: number;
  dueDate: string;
  planNumber?: string;
  storeName?: string;
}): string {
  const formattedDate = new Date(dueDate).toLocaleDateString('ar-EG');
  const storeHeader = storeName ? `*${storeName}*\n` : '';
  const installmentText = totalInstallments ? `قسط #${installmentNumber} من ${totalInstallments}` : `قسط #${installmentNumber}`;

  return `${storeHeader}مرحباً أستاذ/ة *${customerName}*،
نود تذكيركم بموعد استحقاق الدفعة القادمة:
📋 *${installmentText}* ${planNumber ? `(خطة: ${planNumber})` : ''}
💰 المبلغ المستحق: *${Number(amount).toLocaleString()} ج.م*
📅 تاريخ الاستحقاق: *${formattedDate}*

نشكركم على التزامكم ويسعدنا دائماً خدمتكم! 🙏`;
}

export function formatInvoiceShareMessage({
  customerName,
  docNo,
  total,
  itemsCount,
  date,
  storeName,
}: {
  customerName?: string;
  docNo: string;
  total: number;
  itemsCount?: number;
  date?: string;
  storeName?: string;
}): string {
  const formattedDate = date ? new Date(date).toLocaleDateString('ar-EG') : new Date().toLocaleDateString('ar-EG');
  const storeHeader = storeName ? `*${storeName}*\n` : '';
  const greeting = customerName ? `مرحباً أستاذ/ة *${customerName}*،\n` : 'مرحباً عميلنا العزيز،\n';

  return `${storeHeader}${greeting}شكراً لتسوقكم معنا! تفاصيل الفاتورة:
🧾 رقم الفاتورة: *#${docNo}*
📅 التاريخ: ${formattedDate}
${itemsCount ? `📦 عدد الأصناف: ${itemsCount}\n` : ''}💵 الإجمالي: *${Number(total).toLocaleString()} ج.م*

نتطلع لزيارتكم مجدداً! ✨`;
}
