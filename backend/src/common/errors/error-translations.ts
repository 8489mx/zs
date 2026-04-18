const ERROR_CODE_MESSAGES: Record<string, string> = {
  INTERNAL_ERROR: 'حدث خطأ داخلي في الخادم.',
  VALIDATION_ERROR: 'البيانات المرسلة غير صحيحة.',
  DAMAGE_NOTE_REQUIRED: 'لازم تكتب سبب في خانة الملاحظات.',
  LOCATION_BRANCH_MISMATCH: 'الموقع المختار لا يتبع الفرع المحدد.',
  FORBIDDEN: 'غير مسموح بتنفيذ هذه العملية.',
  UNAUTHORIZED: 'غير مصرح لك بالوصول.',
  CUSTOMER_EXISTS: 'يوجد عميل بنفس الاسم بالفعل.',
  CUSTOMER_NOT_FOUND: 'العميل غير موجود.',
  CUSTOMER_NAME_REQUIRED: 'اسم العميل مطلوب.',
  CUSTOMER_HAS_BALANCE: 'لا يمكن حذف العميل لأن لديه رصيدًا قائمًا.',
  CUSTOMER_HAS_CREDIT: 'لا يمكن حذف العميل لأن لديه رصيدًا دفتريًا.',
  CUSTOMER_HAS_HISTORY: 'لا يمكن حذف العميل لأن لديه سجل حركات أو تاريخًا ماليًا.',
  SUPPLIER_EXISTS: 'يوجد مورد بنفس الاسم بالفعل.',
  SUPPLIER_NOT_FOUND: 'المورد غير موجود.',
  SUPPLIER_NAME_REQUIRED: 'اسم المورد مطلوب.',
  SUPPLIER_HAS_BALANCE: 'لا يمكن حذف المورد لأن عليه رصيدًا قائمًا.',
  SUPPLIER_HAS_HISTORY: 'لا يمكن حذف المورد لأن لديه سجل حركات أو تاريخًا ماليًا.',
  SUPPLIER_IN_USE: 'لا يمكن حذف المورد لأنه مرتبط بأصناف موجودة.',
  CATEGORY_EXISTS: 'يوجد قسم بنفس الاسم بالفعل.',
  CATEGORY_NOT_FOUND: 'القسم غير موجود.',
  CATEGORY_NAME_REQUIRED: 'اسم القسم مطلوب.',
  CATEGORY_IN_USE: 'لا يمكن حذف القسم لأنه مرتبط بأصناف موجودة.',
  PRODUCT_EXISTS: 'يوجد صنف بنفس الاسم أو الباركود بالفعل.',
  PRODUCT_NOT_FOUND: 'الصنف غير موجود.',
  PRODUCT_NAME_REQUIRED: 'اسم الصنف مطلوب.',
  PRODUCT_HAS_STOCK: 'لا يمكن حذف الصنف لأن عليه مخزونًا حاليًا.',
  PRODUCT_HAS_HISTORY: 'لا يمكن حذف الصنف لأن له حركات أو تاريخًا سابقًا.',
  STOCK_UPDATE_FORBIDDEN: 'لا يمكن تعديل المخزون من شاشة بيانات الصنف. استخدم شاشة المخزون أو التسوية.',
  PRICE_CHANGE_FORBIDDEN: 'تعديل الأسعار يتطلب صلاحية تعديل الأسعار.',
  DISCOUNT_CHANGE_FORBIDDEN: 'تعديل الخصم يتطلب صلاحية تعديل الخصم.',
  CUSTOMER_PRICE_INVALID: 'سعر العميل غير صحيح.',
  CASHIER_SHIFT_NOT_FOUND: 'الوردية غير موجودة.',
  SHIFT_NOT_FOUND: 'الوردية غير موجودة.',
  SHIFT_ALREADY_OPEN: 'يوجد وردية مفتوحة بالفعل لهذا المستخدم.',
  SHIFT_ALREADY_CLOSED: 'الوردية مغلقة بالفعل.',
  SHIFT_CLOSED: 'لا يمكن تنفيذ العملية على وردية مغلقة.',
  SHIFT_FORBIDDEN: 'غير مسموح لك بتنفيذ هذه العملية على هذه الوردية.',
  SHIFT_OPEN_FAILED: 'تعذر فتح الوردية.',
  MANAGER_PIN_INVALID: 'رمز اعتماد المدير غير صحيح.',
  MANAGER_PASSWORD_INVALID: 'كلمة مرور المدير غير صحيحة.',
  MANAGER_PASSWORD_REQUIRED: 'كلمة مرور المدير مطلوبة.',
  AMOUNT_INVALID: 'المبلغ يجب أن يكون أكبر من صفر.',
  COUNTED_CASH_INVALID: 'المبلغ المعدود غير صحيح.',
  NOTE_TOO_SHORT: 'اكتب سببًا أو ملاحظة واضحة لا تقل عن 8 أحرف.',
  SESSION_NOT_FOUND: 'الجلسة غير موجودة.',
  USER_NOT_FOUND: 'المستخدم غير موجود.',
  USER_EXISTS: 'يوجد مستخدم بنفس الاسم بالفعل.',
  USERNAME_REQUIRED: 'اسم المستخدم مطلوب.',
  PASSWORD_REQUIRED: 'كلمة المرور مطلوبة.',
  PASSWORD_TOO_WEAK: 'كلمة المرور يجب أن تكون 12 حرفًا على الأقل.',
  CURRENT_PASSWORD_INVALID: 'كلمة المرور الحالية غير صحيحة.',
  SETTINGS_INVALID: 'بيانات الإعدادات غير صحيحة.',
  APP_BOOTSTRAP_REQUIRED: 'يجب إكمال تهيئة النظام أولًا.',
  PURCHASE_NOT_FOUND: 'فاتورة الشراء غير موجودة.',
  SALE_NOT_FOUND: 'فاتورة البيع غير موجودة.',
  PAYMENT_NOT_FOUND: 'عملية الدفع غير موجودة.',
  LEDGER_ENTRY_NOT_FOUND: 'قيد الحساب غير موجود.',
  LOCATION_NOT_FOUND: 'الموقع غير موجود.',
  BRANCH_NOT_FOUND: 'الفرع غير موجود.',
  LOCATION_NAME_REQUIRED: 'اسم الموقع مطلوب.',
  BRANCH_NAME_REQUIRED: 'اسم الفرع مطلوب.',
  INVENTORY_ADJUSTMENT_INVALID: 'بيانات حركة المخزون غير صحيحة.',
};

function looksArabic(value: string): boolean {
  return /[\u0600-\u06FF]/.test(value);
}

function translateKnownEnglishMessage(message: string): string | null {
  const normalized = message.trim();

  const directMap: Record<string, string> = {
    'Internal server error': 'حدث خطأ داخلي في الخادم.',
    'Validation failed': 'البيانات المرسلة غير صحيحة.',
    'Unauthorized': 'غير مصرح لك بالوصول.',
    'Forbidden resource': 'غير مسموح لك بالوصول إلى هذا المورد.',
    'Missing required permissions': 'لا تملك الصلاحيات المطلوبة لتنفيذ هذه العملية.',
    'Invalid username or password': 'اسم المستخدم أو كلمة المرور غير صحيحين.',
    'Current password is incorrect': 'كلمة المرور الحالية غير صحيحة.',
    'Session not found': 'الجلسة غير موجودة.',
    'Settings payload must be an object': 'بيانات الإعدادات يجب أن تكون كائنًا صحيحًا.',
    'Customer already exists': 'يوجد عميل بنفس الاسم بالفعل.',
    'Customer not found': 'العميل غير موجود.',
    'Customer name is required': 'اسم العميل مطلوب.',
    'Customer has outstanding balance': 'لا يمكن حذف العميل لأن لديه رصيدًا قائمًا.',
    'Customer has store credit balance': 'لا يمكن حذف العميل لأن لديه رصيدًا دفتريًا.',
    'Customer has financial history and cannot be deleted': 'لا يمكن حذف العميل لأن لديه سجل حركات أو تاريخًا ماليًا.',
    'Supplier already exists': 'يوجد مورد بنفس الاسم بالفعل.',
    'Supplier not found': 'المورد غير موجود.',
    'Supplier name is required': 'اسم المورد مطلوب.',
    'Supplier has outstanding balance': 'لا يمكن حذف المورد لأن عليه رصيدًا قائمًا.',
    'Supplier has financial history and cannot be deleted': 'لا يمكن حذف المورد لأن لديه سجل حركات أو تاريخًا ماليًا.',
    'Supplier is used by products': 'لا يمكن حذف المورد لأنه مرتبط بأصناف موجودة.',
    'Category already exists': 'يوجد قسم بنفس الاسم بالفعل.',
    'Category not found': 'القسم غير موجود.',
    'Category name is required': 'اسم القسم مطلوب.',
    'Product not found': 'الصنف غير موجود.',
    'Product already exists': 'يوجد صنف بنفس الاسم أو الباركود بالفعل.',
    'Stock cannot be edited from product master data. Use inventory adjustment.': 'لا يمكن تعديل المخزون من شاشة بيانات الصنف. استخدم شاشة المخزون أو التسوية.',
    'Price changes require canEditPrice permission': 'تعديل الأسعار يتطلب صلاحية تعديل الأسعار.',
    'Discount changes require canDiscount permission': 'تعديل الخصم يتطلب صلاحية تعديل الخصم.',
    'Could not open cashier shift': 'تعذر فتح الوردية.',
  };

  if (directMap[normalized]) {
    return directMap[normalized];
  }

  if (normalized.startsWith('property ') && normalized.endsWith(' should not exist')) {
    const field = normalized.replace(/^property\s+/i, '').replace(/\s+should not exist$/i, '').trim();
    return `الحقل ${field} غير مسموح إرساله.`;
  }

  return null;
}

function translateByCodePattern(code: string): string | null {
  if (code.endsWith('_NOT_FOUND')) return 'العنصر المطلوب غير موجود.';
  if (code.endsWith('_EXISTS')) return 'يوجد عنصر مماثل بالفعل.';
  if (code.endsWith('_REQUIRED')) return 'هناك حقل مطلوب غير موجود.';
  if (code.endsWith('_INVALID')) return 'البيانات المدخلة غير صحيحة.';
  if (code.endsWith('_FORBIDDEN')) return 'غير مسموح بتنفيذ هذه العملية.';
  if (code.endsWith('_HAS_BALANCE')) return 'لا يمكن تنفيذ العملية لوجود رصيد قائم.';
  if (code.endsWith('_HAS_HISTORY')) return 'لا يمكن تنفيذ العملية لوجود سجل حركات أو تاريخ سابق.';
  if (code.endsWith('_IN_USE')) return 'لا يمكن تنفيذ العملية لأن العنصر مستخدم في بيانات أخرى.';
  return null;
}

function firstString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstString(item);
      if (found) return found;
    }
  }
  return null;
}

export function translateErrorMessageFromCode(code?: string | null, fallbackMessage?: unknown, statusCode?: number): string {
  const fallback = firstString(fallbackMessage);

  if (code === 'VALIDATION_ERROR') {
    if (fallback && fallback !== ERROR_CODE_MESSAGES.VALIDATION_ERROR) {
      if (looksArabic(fallback)) return fallback;
      const translated = translateKnownEnglishMessage(fallback);
      if (translated && translated !== ERROR_CODE_MESSAGES.VALIDATION_ERROR) return translated;
      return fallback;
    }
    return ERROR_CODE_MESSAGES.VALIDATION_ERROR;
  }

  if (code) {
    if (ERROR_CODE_MESSAGES[code]) return ERROR_CODE_MESSAGES[code];
    const pattern = translateByCodePattern(code);
    if (pattern) return pattern;
  }

  if (fallback) {
    if (looksArabic(fallback)) return fallback;
    const translated = translateKnownEnglishMessage(fallback);
    if (translated) return translated;
  }

  if (statusCode === 401) return 'غير مصرح لك بالوصول.';
  if (statusCode === 403) return 'غير مسموح بتنفيذ هذه العملية.';
  if (statusCode === 404) return 'العنصر المطلوب غير موجود.';
  if (statusCode === 422) return 'البيانات المرسلة غير صحيحة.';

  return 'تعذر تنفيذ العملية المطلوبة.';
}
