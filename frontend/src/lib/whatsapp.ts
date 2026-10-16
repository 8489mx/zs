import { getGlobalCurrencySymbol, getCurrencyDecimals, isKuwait, isSaudi } from './currencies';

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
  // Kuwait numbers: 8 digits starting with 2, 5, 6, 9
  if (digits.length === 8 && /^[2569]/.test(digits)) {
    return `965${digits}`;
  }
  // Strip leading 00 if present
  if (digits.startsWith('00')) {
    return digits.slice(2);
  }
  // Already has country code
  return digits;
}

export function formatRestaurantOrderWhatsAppMessage({
  customerName,
  orderNumber,
  items,
  total,
  deliveryFee,
  paymentLink,
  storeName,
  currency,
}: {
  customerName?: string;
  orderNumber?: string;
  items?: Array<{ name: string; qty: number; price?: number }>;
  total: number;
  deliveryFee?: number;
  paymentLink?: string;
  storeName?: string;
  currency?: string;
}): string {
  const activeCurrency = currency || getGlobalCurrencySymbol();
  const decimals = getCurrencyDecimals(activeCurrency);
  const isKwd = isKuwait({ currency: activeCurrency });
  const isKsa = isSaudi({ currency: activeCurrency });

  const storeHeader = storeName ? `*${storeName}*\n` : '';
  const greeting = customerName ? `مرحباً أستاذ/ة *${customerName}*،\n` : 'مرحباً بك،\n';
  const orderLine = orderNumber ? `تم استلام وتجهيز طلبك رقم: *#${orderNumber}*\n\n` : '';
  
  let itemsList = '';
  if (items && items.length > 0) {
    itemsList = '📋 *تفاصيل الطلب:*\n' + items.map(it => `• ${it.name} × ${it.qty}`).join('\n') + '\n\n';
  }

  const feeLine = deliveryFee && deliveryFee > 0 ? `(شامل رسوم التوصيل: ${deliveryFee.toFixed(decimals)} ${activeCurrency})\n` : '';
  const totalLine = `💰 *الإجمالي المطلوب:* *${total.toFixed(decimals)} ${activeCurrency}* ${feeLine}`;
  
  let defaultPaymentText = 'نقدي أو إنستاباي / محفظة عند الاستلام';
  if (isKwd) {
    defaultPaymentText = 'كي نت (K-NET) أو نقدي عند الاستلام';
  } else if (isKsa) {
    defaultPaymentText = 'شبكة مدى (mada) أو نقدي عند الاستلام';
  }

  const paymentSection = paymentLink
    ? (isKwd
        ? `\n💳 *رابط السداد الإلكتروني المباشر (كي نت K-NET / بطاقة):*\n${paymentLink}\n`
        : `\n💳 *رابط السداد الإلكتروني المباشر:*\n${paymentLink}\n`)
    : `\n💳 *طريقة الدفع:* ${defaultPaymentText}\n`;

  return `${storeHeader}${greeting}${orderLine}${itemsList}${totalLine}${paymentSection}\nيسعدنا خدمتكم دائماً ونتمنى لكم وجبة شهية!`;
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
- *${installmentText}* ${planNumber ? `(خطة: ${planNumber})` : ''}
- المبلغ المستحق: *${Number(amount).toLocaleString()} ${getGlobalCurrencySymbol()}*
- تاريخ الاستحقاق: *${formattedDate}*

نشكركم على التزامكم ويسعدنا دائماً خدمتكم!`;
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
- رقم الفاتورة: *#${docNo}*
- التاريخ: ${formattedDate}
${itemsCount ? `- عدد الأصناف: ${itemsCount}\n` : ''}- الإجمالي: *${Number(total).toLocaleString()} ${getGlobalCurrencySymbol()}*

نتطلع لزيارتكم مجدداً!`;
}
