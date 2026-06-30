import { useAuthStore } from '@/stores/auth-store';

export const dict = {

  company_label: { ar: 'شركة', en: 'Company' },
  discount_label: { ar: 'الخصم', en: 'Discount' },
  discount_value_label: { ar: 'قيمة الخصم', en: 'Discount Value' },
  search_supplier: { ar: 'ابحث عن مورد...', en: 'Search for supplier...' },
  search_contact: { ar: 'ابحث عن جهة اتصال...', en: 'Search for contact...' },
  search_address: { ar: 'اختر أو ابحث عن عنوان...', en: 'Choose or search for address...' },
  search_item: { ar: 'ابحث عن صنف...', en: 'Search for item...' },
  search_warehouse: { ar: 'ابحث عن مستودع...', en: 'Search for warehouse...' },
  search_cost_center: { ar: 'ابحث عن مركز تكلفة...', en: 'Search for cost center...' },
  search_project: { ar: 'ابحث عن مشروع...', en: 'Search for project...' },
  search_terms_template: { ar: 'ابحث عن نموذج شروط...', en: 'Search for terms template...' },
  custom_value: { ar: 'قيمة مخصصة', en: 'Custom Value' },
  quick_item_actions: { ar: 'إجراءات الأصناف السريعة', en: 'Quick Item Actions' },
  apply_tax: { ar: 'تطبيق أو تغيير الضريبة', en: 'Apply or Change Tax' },
  add_service_line: { ar: 'إضافة بند خدمة لا يؤثر على المخزون', en: 'Add a service line that does not affect inventory' },
  apply_discount: { ar: 'تطبيق خصم عام', en: 'Apply General Discount' },
  additional_notes: { ar: 'ملاحظات إضافية...', en: 'Additional notes...' },

  // Breadcrumbs
  purchases: { ar: 'المشتريات', en: 'Purchases' },
  purchase_orders: { ar: 'طلبات الشراء', en: 'Purchase Orders' },
  new_purchase_order: { ar: 'طلب شراء جديد', en: 'New Purchase Order' },
  
  // Status
  status_draft: { ar: 'مسودة', en: 'Draft' },
  status_confirmed: { ar: 'مؤكد', en: 'Confirmed' },
  
  // Smart Buttons
  previous_orders: { ar: 'أوامر سابقة', en: 'Prev Orders' },
  credit_balance: { ar: 'رصيد دائن', en: 'Credit Balance' },
  
  // Actions
  save_as_draft: { ar: 'حفظ كمسودة', en: 'Save as Draft' },
  draft_saved: { ar: 'تم حفظ المسودة بنجاح', en: 'Draft Saved Successfully' },
  confirm_order: { ar: 'تأكيد الطلب', en: 'Confirm Order' },
  cancel: { ar: 'إلغاء', en: 'Cancel' },
  send_email: { ar: 'إرسال بالبريد', en: 'Send by Email' },
  print: { ar: 'طباعة', en: 'Print' },
  receive_products: { ar: 'استلام المنتجات', en: 'Receive Products' },
  create_bill: { ar: 'إنشاء فاتورة', en: 'Create Bill' },
  no_data_to_save: { ar: 'لا توجد بيانات لحفظها', en: 'No data to save' },
  please_complete_data: { ar: 'يرجى استكمال البيانات المطلوبة قبل التأكيد', en: 'Please complete required data before confirming' },
  invoice_confirmed: { ar: 'تم تأكيد الفاتورة بنجاح', en: 'Invoice confirmed successfully' },

  // Tabs
  products_tab: { ar: 'المنتجات', en: 'Products' },
  other_info_tab: { ar: 'معلومات أخرى', en: 'Other Info' },

  // Form Fields
  supplier: { ar: 'المورد', en: 'Supplier' },
  select_supplier: { ar: 'اختر المورد...', en: 'Select Supplier...' },
  supplier_reference: { ar: 'مرجع المورد', en: 'Supplier Reference' },
  order_deadline: { ar: 'التاريخ المطلوب', en: 'Order Deadline' },
  expected_arrival: { ar: 'تاريخ الوصول المتوقع', en: 'Expected Arrival' },
  contact_person: { ar: 'جهة الاتصال', en: 'Contact Person' },
  currency: { ar: 'العملة', en: 'Currency' },
  egyptian_pound: { ar: 'جنيه مصري (EGP)', en: 'Egyptian Pound (EGP)' },
  us_dollar: { ar: 'دولار أمريكي (USD)', en: 'US Dollar (USD)' },

  // Product Table Headers
  product: { ar: 'المنتج', en: 'Product' },
  description: { ar: 'الوصف', en: 'Description' },
  quantity: { ar: 'الكمية', en: 'Quantity' },
  received: { ar: 'المستلم', en: 'Received' },
  billed: { ar: 'المفوتر', en: 'Billed' },
  uom: { ar: 'وحدة القياس', en: 'UoM' },
  unit_price: { ar: 'سعر الوحدة', en: 'Unit Price' },
  taxes: { ar: 'الضرائب', en: 'Taxes' },
  subtotal: { ar: 'الإجمالي الفرعي', en: 'Subtotal' },

  // Table Actions & Totals
  add_product: { ar: 'إضافة منتج', en: 'Add a product' },
  add_section: { ar: 'إضافة قسم', en: 'Add a section' },
  add_note: { ar: 'إضافة ملاحظة', en: 'Add a note' },
  untaxed_amount: { ar: 'المبلغ غير الخاضع للضريبة', en: 'Untaxed Amount' },
  total_taxes: { ar: 'إجمالي الضرائب', en: 'Taxes' },
  total: { ar: 'الإجمالي', en: 'Total' },

  // Other Info Tab Fields
  purchase_representative: { ar: 'مندوب المشتريات', en: 'Purchase Representative' },
  company: { ar: 'الشركة', en: 'Company' },
  payment_terms: { ar: 'شروط الدفع', en: 'Payment Terms' },
  fiscal_position: { ar: 'المركز المالي (الضريبي)', en: 'Fiscal Position' },
  incoterm: { ar: 'شروط التسليم (Incoterm)', en: 'Incoterm' },
  shipping_policy: { ar: 'سياسة الشحن', en: 'Shipping Policy' },
  receipt_date: { ar: 'تاريخ الاستلام', en: 'Receipt Date' },
  source_document: { ar: 'المستند المصدر', en: 'Source Document' },

  // Search
  search: { ar: 'بحث...', en: 'Search...' },
  suppliers_search: { ar: 'الموردون', en: 'Suppliers' },
  products_search: { ar: 'المنتجات', en: 'Products' },
  quick_orders: { ar: 'أوامر سريعة', en: 'Quick Orders' },
  search_in_docs: { ar: 'بحث في المستندات:', en: 'Search in documents:' },

  // Misc
  back_to_purchases: { ar: 'العودة إلى المشتريات', en: 'Back to purchases' },
  tax_15: { ar: 'ضريبة 15%', en: 'Tax 15%' },
  tax_0: { ar: 'معفى', en: 'Exempt' },
  dark_mode: { ar: 'الوضع الداكن', en: 'Dark Mode' },
  light_mode: { ar: 'الوضع الفاتح', en: 'Light Mode' },
  delete_row: { ar: 'حذف السطر', en: 'Delete row' },

  // Auto-extracted Data
  basic_info: { ar: 'المعلومات الأساسية', en: 'Basic Information' },
  attach_docs: { ar: 'إرفاق المستندات', en: 'Attach Documents' },
  drag_drop_docs: { ar: 'اضغط أو اسحب لإرفاق المستندات الداعمة', en: 'Click or drag to attach supporting documents' },
  items_section: { ar: 'الأصناف', en: 'Items' },
  accounting_section: { ar: 'المحاسبة', en: 'Accounting' },
  cost_center: { ar: 'مركز التكلفة', en: 'Cost Center' },
  project: { ar: 'المشروع', en: 'Project' },
  terms_conditions: { ar: 'الشروط والأحكام', en: 'Terms & Conditions' },
  terms_template: { ar: 'نموذج الشروط', en: 'Terms Template' },
  notes_section: { ar: 'ملاحظات', en: 'Notes' },
  totals_section: { ar: 'الإجماليات', en: 'Totals' },
  status_done: { ar: 'منتهي', en: 'Done' },
  status_cancelled: { ar: 'ملغى', en: 'Cancelled' },
  status_locked: { ar: 'مقفول', en: 'Locked' },
  add_item: { ar: 'إضافة صنف', en: 'Add Item' },
  scan_barcode: { ar: 'مسح باركود', en: 'Scan Barcode' },
  new_product: { ar: 'منتج جديد', en: 'New Product' },
  tax: { ar: 'الضريبة', en: 'Tax' },
  total_amount: { ar: 'المبلغ', en: 'Amount' },
  warehouse_title: { ar: 'المستودع', en: 'Warehouse' },
  price_title: { ar: 'السعر', en: 'Price' },
  date: { ar: 'التاريخ', en: 'Date' },
  item_label: { ar: 'الصنف', en: 'Item' },
  warehouse_label: { ar: 'المستودع', en: 'Warehouse' },
  price_label: { ar: 'السعر', en: 'Price' },
  amount_label: { ar: 'المبلغ', en: 'Amount' },
  search_product_placeholder: { ar: 'ابحث عن منتج...', en: 'Search for a product...' },
  discount_rate: { ar: '% معدل الخصم', en: '% Discount Rate' },
  fixed_amount: { ar: 'مبلغ ثابت', en: 'Fixed Amount' },
  add_discount: { ar: 'إضافة خصم', en: 'Add Discount' },
  review_quantities_note: { ar: 'يرجى مراجعة الكميات مع أمين المخزن قبل التأكيد.', en: 'Please review quantities with the storekeeper before confirming.' },
  new_supplier: { ar: 'المورد الجديد', en: 'New Supplier' },
  create_new_product: { ar: 'إنشاء منتج جديد', en: 'Create New Product' },
  new_contact: { ar: 'جهة الاتصال الجديدة', en: 'New Contact' },
  new_address: { ar: 'العنوان الجديد', en: 'New Address' },
  new_warehouse: { ar: 'المستودع الجديد', en: 'New Warehouse' },
  new_cost_center: { ar: 'مركز التكلفة الجديد', en: 'New Cost Center' },
  new_project: { ar: 'المشروع الجديد', en: 'New Project' },
  local_use_only: { ar: 'للاستخدام المحلي داخل نموذج التجربة فقط.', en: 'For local use in the prototype only.' },
  close: { ar: 'إغلاق', en: 'Close' },
  product_name: { ar: 'اسم المنتج', en: 'Product Name' },
  shipping_address: { ar: 'عنوان الشحن', en: 'Shipping Address' },
  name: { ar: 'الاسم', en: 'Name' },
  phone_number: { ar: 'رقم الهاتف', en: 'Phone Number' },
  tax_number: { ar: 'الرقم الضريبي', en: 'Tax Number' },
  product_type: { ar: 'نوع المنتج', en: 'Product Type' },
  stock_product: { ar: 'مخزني', en: 'Stockable' },
  service_product: { ar: 'خدمة', en: 'Service' },
  barcode: { ar: 'الباركود', en: 'Barcode' },
  optional: { ar: 'اختياري', en: 'Optional' },
  default_warehouse: { ar: 'المستودع الافتراضي', en: 'Default Warehouse' },
  city: { ar: 'المدينة', en: 'City' },
  supplier_company: { ar: 'المورد/الشركة', en: 'Supplier/Company' },
  code: { ar: 'الكود', en: 'Code' },
  create_and_select: { ar: 'إنشاء واختيار', en: 'Create & Select' },
  unsaved_changes: { ar: 'لديك تغييرات غير محفوظة، هل تريد المغادرة؟', en: 'You have unsaved changes, do you want to leave?' },
  ok: { ar: 'موافق', en: 'OK' },
  scan_barcode_title: { ar: 'مسح الباركود', en: 'Scan Barcode' },
  barcode_desc: { ar: 'استخدم الإدخال اليدوي أو قارئ الباركود إن كان متاحًا.', en: 'Use manual entry or a barcode scanner if available.' },
  test_codes: { ar: 'كودات التجربة: 622100001 ، 622100002 ، 622100003', en: 'Test codes: 622100001, 622100002, 622100003' },
  found: { ar: 'تم العثور على:', en: 'Found:' },
  not_found: { ar: 'لم يتم العثور على صنف بهذا الباركود', en: 'No item found with this barcode' },
  add_to_item: { ar: 'إضافة للصنف', en: 'Add to Item' },
  create_new_item_barcode: { ar: '+ إنشاء صنف جديد بهذا الباركود', en: '+ Create new item with this barcode' },
  discount_amount: { ar: 'قيمة الخصم', en: 'Discount Amount' },

  // Auto-extracted Data 2
  subtotal_alt: { ar: 'المجموع الفرعي', en: 'Subtotal' },
  tax_alt: { ar: 'الضريبة', en: 'Tax' },
  confirm_invoice: { ar: 'تأكيد الفاتورة', en: 'Confirm Invoice' },
  discount: { ar: 'الخصم', en: 'Discount' },

  // Placeholder data
  main_warehouse: { ar: 'المستودع الرئيسي', en: 'Main Warehouse' },
  stationery_warehouse: { ar: 'مخزن القرطاسية', en: 'Stationery Warehouse' },
  accounting_books: { ar: 'دفاتر محاسبية', en: 'Accounting Books' },
  printing_paper: { ar: 'ورق طباعة A4', en: 'A4 Printing Paper' },
  ink_pens: { ar: 'أقلام حبر', en: 'Ink Pens' },
  
  egp: { ar: 'ج.م', en: 'EGP' },
  pieces: { ar: 'قطعة', en: 'Units' },
  immediate_payment: { ar: 'دفع فوري', en: 'Immediate Payment' },
  days_15: { ar: '15 يوم', en: '15 Days' },
  days_30: { ar: '30 يوم', en: '30 Days' },
  days_45: { ar: '45 يوم', en: '45 Days' },
  end_of_next_month: { ar: 'نهاية الشهر القادم', en: 'End of following month' },
  
  local_supplier: { ar: 'مورد محلي', en: 'Local Supplier' },
  international_supplier: { ar: 'مورد دولي', en: 'International Supplier' },
  exempt_supplier: { ar: 'معفى ضريبياً', en: 'Tax Exempt' },
  
  company_zsystems: { ar: 'Z-Systems شركة', en: 'Z-Systems Inc.' },
  branch_cairo: { ar: 'فرع القاهرة', en: 'Cairo Branch' },
  branch_alex: { ar: 'فرع الإسكندرية', en: 'Alexandria Branch' },
  
  receipt_full: { ar: 'استلام الكمية بالكامل', en: 'Receive all at once' },
  receipt_partial: { ar: 'السماح باستلام جزئي', en: 'Allow partial receipt' },
  service_type: { ar: 'خدمة', en: 'Service' },
  tax_rate: { ar: 'معدل ضريبي', en: 'Tax Rate' },
  select_supplier_error: { ar: 'يرجى اختيار المورد', en: 'Please select a supplier' },
  select_date_error: { ar: 'يرجى تحديد التاريخ', en: 'Please select a date' },
  select_required_date_error: { ar: 'يرجى تحديد التاريخ المطلوب', en: 'Please select the required date' },
  select_currency_error: { ar: 'يرجى اختيار العملة', en: 'Please select the currency' },
  add_one_item_error: { ar: 'يرجى إضافة صنف واحد على الأقل', en: 'Please add at least one item' },
  select_item_error: { ar: 'يرجى اختيار الصنف', en: 'Please select the item' },
  qty_greater_than_zero_error: { ar: 'الكمية يجب أن تكون أكبر من صفر', en: 'Quantity must be greater than zero' },
  price_not_negative_error: { ar: 'السعر يجب ألا يكون أقل من صفر', en: 'Price cannot be negative' },
  select_warehouse_error: { ar: 'يرجى اختيار المستودع', en: 'Please select the warehouse' },
  test_barcode_notice: { ar: 'كودات التجربة: 622100001 ، 622100002 ، 622100003', en: 'Test barcodes: 622100001, 622100002, 622100003' },
  found_item: { ar: 'تم العثور على:', en: 'Found:' },
  item_not_found: { ar: 'لم يتم العثور على صنف بهذا الباركود', en: 'No item found with this barcode' },
  create_new_item_with_barcode: { ar: '+ إنشاء صنف جديد بهذا الباركود', en: '+ Create new item with this barcode' },
  scan_barcode_desc: { ar: 'استخدم الإدخال اليدوي أو قارئ الباركود إن كان متاحًا.', en: 'Use manual entry or a barcode scanner if available.' },
  unsaved_changes_title: { ar: 'لديك تغييرات غير محفوظة، هل تريد المغادرة؟', en: 'You have unsaved changes, do you want to leave?' },
  stock_type: { ar: 'مخزني', en: 'Stockable' },
  unit: { ar: 'الوحدة', en: 'Unit' },
  demo_supplier: { ar: 'مؤسسة النور للتوريدات', en: 'Al Nour Supplies' },
  demo_company: { ar: 'Z ERP Trading', en: 'Z ERP Trading' },
  demo_contact: { ar: 'أحمد حسان', en: 'Ahmed Hassan' },
  demo_address: { ar: 'مخزن القاهرة - مدينة نصر', en: 'Cairo Warehouse - Nasr City' },
  demo_item1: { ar: 'دفاتر محاسبية', en: 'Accounting Notebooks' },
  demo_item2: { ar: 'ورق طباعة A4', en: 'A4 Printing Paper' },
  demo_warehouse1: { ar: 'المستودع الرئيسي', en: 'Main Warehouse' },
  demo_warehouse2: { ar: 'مخزن القرطاسية', en: 'Stationery Warehouse' },
  demo_cost_center: { ar: 'مشتريات تشغيلية', en: 'Operational Purchases' },
  demo_project: { ar: 'تجهيز فرع جديد', en: 'New Branch Setup' },
  demo_terms: { ar: 'نموذج مشتريات قياسي', en: 'Standard Purchasing Template' },
  category: { ar: 'القسم', en: 'Category' },
  select_category: { ar: 'اختر القسم', en: 'Select Category' },
};

import { useEffect } from 'react';

export type DictKey = keyof typeof dict;

export function useTranslation() {
  const language = useAuthStore((state) => state.language || 'ar');
  
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);
  
  return {
    t: (key: DictKey) => {
      if (!dict[key]) return key;
      return dict[key][language as 'ar' | 'en'] || key;
    },
    language,
    setLanguage: (lang: 'ar' | 'en') => useAuthStore.getState().updateSessionMeta({ language: lang })
  };
}
