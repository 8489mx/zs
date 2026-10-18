/**
 * Cleans frontend/src/locales/en.json:
 * Replaces any untranslated Arabic values with their proper English translations
 * using translateUiText and the unified dictionary.
 */

const fs = require('fs');
const path = require('path');

const EN_PATH = path.resolve(__dirname, '../../frontend/src/locales/en.json');
const { translateUiText } = require('./auto-translator-bundle.cjs');

const ARABIC_RE = /[\u0600-\u06FF]/;

const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));

let translatedCount = 0;
let removedCount = 0;
let preservedCount = 0;

// Extra manual dictionary for key settings terms
const MANUAL_MAP = {
  'الهوية وبيانات النشاط': 'Identity & Business Information',
  'الاسم والشعار وبيانات التواصل المطبوعة': 'Name, Logo & Printed Contact Details',
  'إعدادات النشاط': 'Business Settings',
  'إعدادات النظام الأساسية': 'Core System Settings',
  'إعدادات التشغيل والمخزون': 'Operations & Inventory Settings',
  'الفرع الرئيسي ومكان التقاط الكاشير': 'Main Branch & Cashier Pickup Location',
  'نمط تشغيل المنشأة ونطاق العمل': 'Operation Mode & Business Scope',
  'اللغة والمنطقة والتواصل': 'Language, Region & Communication',
  'المنطقة الزمنية وتنسيق التواريخ والتواصل': 'Timezone, Date Formats & Communication',
  'تغيير الشعار': 'Change Logo',
  'رفع شعار': 'Upload Logo',
  'الفرع الرئيسي': 'Main Branch',
  'مكان الاستلام الافتراضي': 'Default Pickup Location',
  'رصيد فرع التعاونيات': 'Co-op Branch Balance',
  'نمط الكاشير الافتراضي': 'Default Cashier Mode',
  'سكانر باركود': 'Barcode Scanner',
  'شاشة لمس': 'Touch Screen',
  'مصدر مخزون البيع للفرع (التعاونيات)': 'Branch Sales Stock Source (Co-ops)',
  'نطاق المخزون': 'Stock Scope',
  'مدى البيع الأساسي': 'Primary Sales Scope',
  'كل المخازن التشغيلية': 'All Operational Warehouses',
  'مخزن الفرع الأساسي': 'Primary Branch Warehouse',
  'السماح بالبيع من المخازن الخارجية': 'Allow Selling from External Warehouses',
  'اسم النشاط / المتجر': 'Business / Store Name',
  'الاسم التجاري القياسي وإدارة الأعمال العامة': 'Standard Trading & General Business',
  'الهاتف': 'Phone',
  'العنوان': 'Address',
  'لون الواجهة المخصص': 'Custom Theme Color',
  'افتراضي': 'Default',
  'مؤسسة تجارية متقدمة (Enterprise Trading)': 'Advanced Commercial Enterprise (Enterprise Trading)',
  'محل تجاري ونقاط بيع مبسطة (Simple Retail)': 'Simple Retail & POS (Simple Retail)',
  'النمط المؤسسي المتقدم': 'Advanced Enterprise Mode',
  'محاسبة متقدمة': 'Advanced Accounting',
  'موصى به للمحلات': 'Recommended for Shops',
  'تجزئة ومستويات مالية': 'Retail & Financial Levels',
  'دولة المقر / النشاط': 'Headquarters Country / Activity',
  'لغة النظام': 'System Language',
  'العملة': 'Currency',
  'المنطقة الزمنية': 'Timezone',
  'صيغة التاريخ': 'Date Format',
  'صيغة الوقت': 'Time Format',
  'رابط إرسال الواتساب': 'WhatsApp Link Delivery',
  'عام': 'General',
  'إعدادات نقطة البيع والمبيعات والمخزون': 'POS, Sales & Inventory Settings',
  'تخصيص المنظومة والنشاط': 'System & Business Customization',
  'الطباعة والإيصالات': 'Printing & Receipts',
  'حفظ الإعدادات': 'Save Settings',
  'تفريغ التغييرات': 'Discard Changes',
  'الفروع وأماكن التخزين': 'Branches & Storage Locations',
  'المستخدمون والصلاحيات': 'Users & Permissions',
  'الضرائب والفاتورة الإلكترونية': 'Taxes & E-Invoicing',
  'التجارة الإلكترونية والمنصات': 'E-Commerce & Marketplaces',
  'بوابة الواتساب والتقارير الذكية': 'WhatsApp Gateway & Smart Reports',
  'النسخ والبيانات والصيانة': 'Backups, Data & Maintenance',
  'الاشتراك والفوترة': 'Subscription & Billing',
  'المراقبة ورصد السيرفر (APM)': 'Monitoring & Server APM',
};

function cleanObject(obj) {
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') {
      if (ARABIC_RE.test(val)) {
        const trimmed = val.trim();
        // Check manual map
        if (MANUAL_MAP[trimmed]) {
          obj[key] = MANUAL_MAP[trimmed];
          translatedCount++;
        } else {
          // Check translateUiText
          const tr = translateUiText(trimmed);
          if (tr && !ARABIC_RE.test(tr)) {
            obj[key] = tr;
            translatedCount++;
          } else {
            // Delete Arabic string from en.json so missing key handler translates it dynamically
            delete obj[key];
            removedCount++;
          }
        }
      } else {
        preservedCount++;
      }
    } else if (typeof val === 'object' && val !== null) {
      cleanObject(val);
      if (Object.keys(val).length === 0) {
        delete obj[key];
      }
    }
  }
}

cleanObject(en);

fs.writeFileSync(EN_PATH, JSON.stringify(en, null, 2) + '\n', 'utf8');

console.log(`Cleaning complete!`);
console.log(`- Translated from dictionary: ${translatedCount}`);
console.log(`- Removed Arabic values: ${removedCount}`);
console.log(`- Preserved English values: ${preservedCount}`);
