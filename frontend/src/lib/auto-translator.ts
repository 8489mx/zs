/**
 * Z-Systems Universal Auto-Translator Layer
 * Automatically detects and translates UI text nodes, modals, buttons, and form labels
 * when the active language is English ('en'), while preserving original Arabic user data
 * (e.g. Arabic product names, custom descriptions).
 */

import uiDictRaw from './ui-dictionary.json';

const UI_DICTIONARY: Record<string, string> = uiDictRaw;
const dictMap = new Map<string, string>();

for (const [ar, en] of Object.entries(UI_DICTIONARY)) {
  dictMap.set(ar.trim(), en.trim());
}

// Memory map to store original Arabic text for 100% reversible language switching
const originalTextMap = new WeakMap<Node, string>();
const originalAttrMap = new WeakMap<Element, Record<string, string>>();

let observer: MutationObserver | null = null;
let isTranslating = false;
let pendingNodes: Node[] = [];
let rafId: number | null = null;

const ARABIC_CHAR_REGEX = /[\u0600-\u06FF]/;

const IGNORED_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'TEXTAREA',
  'CODE',
  'PRE',
  'SVG',
  'PATH',
  'MATH',
]);

const VERB_PREFIXES = [
  { ar: 'إضافة أول', en: 'Add First' },
  { ar: 'إضافة', en: 'Add' },
  { ar: 'إنشاء', en: 'Create' },
  { ar: 'تعديل', en: 'Edit' },
  { ar: 'حذف', en: 'Delete' },
  { ar: 'عرض', en: 'View' },
  { ar: 'معاينة', en: 'Preview' },
  { ar: 'طباعة', en: 'Print' },
  { ar: 'تصدير', en: 'Export' },
  { ar: 'استيراد', en: 'Import' },
  { ar: 'تأكيد', en: 'Confirm' },
  { ar: 'إلغاء', en: 'Cancel' },
  { ar: 'إغلاق', en: 'Close' },
  { ar: 'فتح', en: 'Open' },
  { ar: 'تسجيل', en: 'Record' },
  { ar: 'تحديث', en: 'Update' },
  { ar: 'تفعيل', en: 'Activate' },
  { ar: 'تعطيل', en: 'Deactivate' },
  { ar: 'أرشفة', en: 'Archive' },
  { ar: 'استرجاع', en: 'Restore' },
  { ar: 'اختيار', en: 'Select' },
  { ar: 'اختر', en: 'Select' },
  { ar: 'حدد', en: 'Select' },
  { ar: 'بحث عن', en: 'Search for' },
  { ar: 'إدارة', en: 'Manage' },
  { ar: 'تحويل', en: 'Transfer' },
  { ar: 'تسوية', en: 'Adjustment' },
  { ar: 'صرف', en: 'Disbursement' },
  { ar: 'قبض', en: 'Collection' },
  { ar: 'سداد', en: 'Payment' },
  { ar: 'دفع', en: 'Payment' },
  { ar: 'إصدار', en: 'Issue' },
  { ar: 'إدخال', en: 'Enter / Check-in' },
  { ar: 'أدخل', en: 'Enter' },
  { ar: 'ادخل', en: 'Enter' },
  { ar: 'تصفية حسب', en: 'Filter by' },
  { ar: 'فرز حسب', en: 'Sort by' },
  { ar: 'ترتيب حسب', en: 'Sort by' },
  { ar: 'عرض حسب', en: 'View by' },
  { ar: 'تجميع حسب', en: 'Group by' },
  { ar: 'العودة إلى', en: 'Back to' },
  { ar: 'الرجوع إلى', en: 'Back to' },
  { ar: 'تفاصيل', enSuffix: 'Details' },
  { ar: 'قائمة', enSuffix: 'List' },
  { ar: 'سجل', enSuffix: 'Register' },
  { ar: 'تقرير', enSuffix: 'Report' },
  { ar: 'إحصائيات', enSuffix: 'Statistics' },
  { ar: 'حركات', enSuffix: 'Transactions' },
];

const ADJECTIVES: Record<string, string> = {
  'الجديد': 'New',
  'الجديدة': 'New',
  'جديد': 'New',
  'جديدة': 'New',
  'الحالي': 'Current',
  'الحالية': 'Current',
  'السابق': 'Previous',
  'السابقة': 'Previous',
  'التالي': 'Next',
  'التالية': 'Next',
  'المحدد': 'Selected',
  'المحددة': 'Selected',
  'النشط': 'Active',
  'النشطة': 'Active',
  'المعلق': 'Pending',
  'المعلقة': 'Pending',
  'المكتمل': 'Completed',
  'المكتملة': 'Completed',
  'اليومي': 'Daily',
  'اليومية': 'Daily',
  'الشهري': 'Monthly',
  'الشهرية': 'Monthly',
  'السنوي': 'Annual',
  'السنوية': 'Annual',
  'الرئيسي': 'Main',
  'الرئيسية': 'Main',
  'الفرعي': 'Sub',
  'الفرعية': 'Sub',
  'المحلي': 'Local',
  'المحلية': 'Local',
  'الافتراضي': 'Default',
  'الافتراضية': 'Default',
  'الإلكتروني': 'Electronic',
  'الإلكترونية': 'Electronic',
  'النقدي': 'Cash',
  'النقدية': 'Cash',
  'الآجل': 'Credit',
  'الآجلة': 'Credit',
  'المصدر': 'Source',
  'الوجهة': 'Destination',
  'المستهدف': 'Target',
  'المستهدفة': 'Target',
  'المطلوب': 'Required',
  'المطلوبة': 'Required',
  'المتاح': 'Available',
  'المتاحة': 'Available',
  'المتبقي': 'Remaining',
  'المتبقية': 'Remaining',
  'الإجمالي': 'Total',
  'الإجمالية': 'Total',
  'النهائي': 'Final',
  'النهائية': 'Final',
  'المبدئي': 'Initial',
  'المبدئية': 'Initial',
  'الفردي': 'Individual',
  'الفردية': 'Individual',
  'الجماعي': 'Group',
  'الجماعية': 'Group',
  'الفعلي': 'Actual',
  'الفعلية': 'Actual',
  'المتوقع': 'Expected',
  'المتوقعة': 'Expected',
  'التقريبي': 'Approximate',
  'التقريبية': 'Approximate',
  'الصحيح': 'Valid',
  'الصحيحة': 'Valid',
  'الخاطئ': 'Invalid',
  'الخاطئة': 'Invalid',
};

const COMPOUND_PREFIXES = [
  { ar: 'كود', enSuffix: 'Code' },
  { ar: 'رمز', enSuffix: 'Code' },
  { ar: 'اسم', enSuffix: 'Name' },
  { ar: 'مسمى', enSuffix: 'Title' },
  { ar: 'رقم', enSuffix: 'Number' },
  { ar: 'تاريخ', enSuffix: 'Date' },
  { ar: 'سعر', enSuffix: 'Price' },
  { ar: 'تكلفة', enSuffix: 'Cost' },
  { ar: 'قيمة', enSuffix: 'Value' },
  { ar: 'رصيد', enSuffix: 'Balance' },
  { ar: 'إجمالي', enPrefix: 'Total' },
  { ar: 'اجمالي', enPrefix: 'Total' },
  { ar: 'صافي', enPrefix: 'Net' },
  { ar: 'من', enPrefix: 'From' },
  { ar: 'إلى', enPrefix: 'To' },
  { ar: 'الى', enPrefix: 'To' },
  { ar: 'نوع', enSuffix: 'Type' },
  { ar: 'حالة', enSuffix: 'Status' },
  { ar: 'سبب', enSuffix: 'Reason' },
  { ar: 'بيانات', enSuffix: 'Data' },
  { ar: 'تفاصيل', enSuffix: 'Details' },
  { ar: 'سجل', enSuffix: 'Log' },
  { ar: 'تقرير', enSuffix: 'Report' },
  { ar: 'قائمة', enSuffix: 'List' },
  { ar: 'مركز', enSuffix: 'Center' },
  { ar: 'دليل', enSuffix: 'Directory' },
  { ar: 'فارق', enSuffix: 'Difference' },
  { ar: 'ملاحظات', enSuffix: 'Notes' },
  { ar: 'شروط', enSuffix: 'Terms' },
  { ar: 'نسبة', enSuffix: 'Rate' },
  { ar: 'حد', enSuffix: 'Limit' },
  { ar: 'مؤشر', enSuffix: 'Indicator' },
  { ar: 'مستوى', enSuffix: 'Level' },
  { ar: 'حجم', enSuffix: 'Size' },
  { ar: 'وزن', enSuffix: 'Weight' },
];

function shouldSkipElement(el: Element): boolean {
  if (IGNORED_TAGS.has(el.tagName)) return true;
  if (el.hasAttribute('data-no-translate') || el.getAttribute('translate') === 'no') return true;
  if (
    el.classList.contains('product-name') ||
    el.classList.contains('product-title') ||
    el.classList.contains('item-name') ||
    el.classList.contains('user-content')
  ) {
    return true;
  }
  return false;
}

/**
 * Translates a single text string using exact match, prefix match, or composite pattern
 */
export function translateUiText(rawText: string): string | null {
  if (!rawText || !ARABIC_CHAR_REGEX.test(rawText)) return null;

  const raw = rawText.trim();
  if (raw.length < 1) return null;

  // 1. Direct dictionary match on the raw trimmed string
  const directRaw = dictMap.get(raw);
  if (directRaw) return directRaw;

  // 2. Parentheses match on raw string: "إغلاق (Esc)", "مدين (Debit)"
  const parenMatch = raw.match(/^([^(]+?)\s*\(([^)]+)\)\s*([:!?.:…]*)$/);
  if (parenMatch) {
    const mainK = parenMatch[1].trim();
    const inner = parenMatch[2].trim();
    const trail = parenMatch[3];
    const transMain = dictMap.get(mainK) || translateUiText(mainK);
    const transInner = dictMap.get(inner) || translateUiText(inner) || inner;
    if (transMain) {
      if (transMain.trim().toLowerCase() === transInner.trim().toLowerCase()) {
        return transMain + trail;
      }
      return transMain + ' (' + transInner + ')' + trail;
    }
  }

  // 3. Coloned labels on raw string: "المستودع المصدر: ", "النسخة:"
  const colonMatch = raw.match(/^([^:]+)[:：]\s*(.*)$/);
  if (colonMatch) {
    const k = colonMatch[1].trim();
    const rest = colonMatch[2];
    const transK = dictMap.get(k) || translateUiText(k);
    if (transK) {
      const transRest = rest.trim() ? (dictMap.get(rest.trim()) || translateUiText(rest.trim()) || rest) : '';
      return transK + ': ' + transRest;
    }
  }

  // 4. Separate leading/trailing symbols, brackets, arrows, and punctuation
  // Note: Parentheses are excluded from stripping to protect inner expressions
  const symMatch = raw.match(/^([\s*+\-•–—[{"'«#%/&;rarr;lt;gt;]*)(.*?)([\s*+\-•–—\]}"'».:…!?؟/\\]*)$/);
  const prefix = symMatch ? symMatch[1] : '';
  const core = symMatch ? symMatch[2].trim() : raw;
  const suffix = symMatch ? symMatch[3] : '';

  if (!core) return null;

  // 5. Direct dictionary match on core
  const direct = dictMap.get(core);
  if (direct) {
    return prefix + direct + suffix;
  }

  // 6. Counted entities (e.g. "12 بوليصة", "58 فاتورة", "${rangeDays} يوم")
  const numMatch = core.match(/^(\d+[\d.,]*|\$\{[^}]+\})\s+([^\d]+)$/);
  if (numMatch) {
    const num = numMatch[1];
    const noun = numMatch[2].trim();
    const transNoun = dictMap.get(noun) || translateUiText(noun);
    if (transNoun) {
      return prefix + num + ' ' + transNoun + suffix;
    }
  }

  // 7. Currency amounts: "500 ج.م" -> "500 EGP", "1,200 ريال" -> "1,200 SAR"
  const currMatch = core.match(/^([\d.,]+)\s*(?:ج\.م|جنيه|جم)$/i);
  if (currMatch) return prefix + currMatch[1] + ' EGP' + suffix;
  const sarMatch = core.match(/^([\d.,]+)\s*(?:ر\.س|ريال)$/i);
  if (sarMatch) return prefix + sarMatch[1] + ' SAR' + suffix;
  const aedMatch = core.match(/^([\d.,]+)\s*(?:د\.إ|درهم)$/i);
  if (aedMatch) return prefix + aedMatch[1] + ' AED' + suffix;
  const usdMatch = core.match(/^([\d.,]+)\s*(?:\$|دولار)$/i);
  if (usdMatch) return prefix + usdMatch[1] + ' USD' + suffix;

  // 8. Barcode / Scanner pattern (e.g. "امسح باركود أو اكتب الاسم...")
  const scanMatch = core.match(/^امسح باركود\s*(.*)$/);
  if (scanMatch) {
    const rest = scanMatch[1].trim();
    if (!rest) return prefix + 'Scan barcode...' + suffix;
    if (rest.includes('اكتب الاسم')) return prefix + 'Scan barcode or enter name...' + suffix;
    return prefix + 'Scan barcode ' + rest + '...' + suffix;
  }

  // 9. Permission error
  if (core.startsWith('لا تملك صلاحية')) {
    return prefix + 'You do not have permission to view this data.' + suffix;
  }

  // 10. Action verb prefixes: "إضافة أصل جديد" -> "Add New Asset"
  for (const v of VERB_PREFIXES) {
    if (core.startsWith(v.ar + ' ')) {
      const rest = core.slice(v.ar.length + 1).trim();

      // Check if rest is [Noun] + [Adjective]
      for (const [adjAr, adjEn] of Object.entries(ADJECTIVES)) {
        if (rest.endsWith(' ' + adjAr)) {
          const nounPart = rest.slice(0, -(adjAr.length + 1)).trim();
          const transNoun = dictMap.get(nounPart);
          if (transNoun) {
            if (v.enSuffix) {
              return prefix + adjEn + ' ' + transNoun + ' ' + v.enSuffix + suffix;
            } else {
              return prefix + v.en + ' ' + adjEn + ' ' + transNoun + suffix;
            }
          }
        }
      }

      // Check if rest is pure Noun or in dict
      const transRest = dictMap.get(rest);
      if (transRest) {
        if (v.enSuffix) {
          return prefix + transRest + ' ' + v.enSuffix + suffix;
        } else {
          return prefix + v.en + ' ' + transRest + suffix;
        }
      }
    }
  }

  // 7. Noun + Adjective: "الفاتورة الحالية" -> "Current Invoice"
  for (const [adjAr, adjEn] of Object.entries(ADJECTIVES)) {
    if (core.endsWith(' ' + adjAr)) {
      const nounPart = core.slice(0, -(adjAr.length + 1)).trim();
      const transNoun = dictMap.get(nounPart);
      if (transNoun) {
        return prefix + adjEn + ' ' + transNoun + suffix;
      }
    }
  }

  // 8. Compound prefixes: "كود الموظف" -> "Employee Code", "إجمالي المبيعات" -> "Total Sales"
  for (const cp of COMPOUND_PREFIXES) {
    if (core.startsWith(cp.ar + ' ')) {
      const rest = core.slice(cp.ar.length + 1).trim();
      const transRest = dictMap.get(rest) || translateUiText(rest);
      if (transRest) {
        if (cp.enSuffix) {
          return prefix + transRest + ' ' + cp.enSuffix + suffix;
        } else if (cp.enPrefix) {
          return prefix + cp.enPrefix + ' ' + transRest + suffix;
        }
      }
    }
  }

  // 9. Empty state patterns: "لا توجد أصناف مسجلة" -> "No registered Products found"
  const emptyMatch = core.match(/^لا (?:توجد|يوجد)\s+(.+?)\s+مسجل[ة|ين]*$/);
  if (emptyMatch) {
    const entity = emptyMatch[1].trim();
    const transEntity = dictMap.get(entity) || entity;
    return prefix + 'No registered ' + transEntity + ' found' + suffix;
  }

  // 10. Progress/loading: "جارٍ الحفظ...", "جاري التحديث...", "جاري الإرسال...", "جاري تحميل..."
  const progMatch = core.match(/^(?:جاري|جارٍ)\s*(.*)$/);
  if (progMatch) {
    const act = progMatch[1].trim();
    if (!act) return prefix + 'Loading...' + suffix;
    const progMap: Record<string, string> = {
      'الحفظ': 'Saving...',
      'حفظ': 'Saving...',
      'التحديث': 'Updating...',
      'تحديث': 'Updating...',
      'الإرسال': 'Sending...',
      'إرسال': 'Sending...',
      'التسجيل': 'Registering...',
      'تسجيل': 'Registering...',
      'المعالجة': 'Processing...',
      'معالجة': 'Processing...',
      'التحميل': 'Loading...',
      'تحميل': 'Loading...',
      'التسوية': 'Reconciling...',
      'تسوية': 'Reconciling...',
      'الإنشاء': 'Creating...',
      'إنشاء': 'Creating...',
      'الحذف': 'Deleting...',
      'حذف': 'Deleting...',
    };
    if (progMap[act]) return prefix + progMap[act] + suffix;
    const loadEntityMatch = act.match(/^(?:تحميل|عرض)\s+(.+)$/);
    if (loadEntityMatch) {
      const entity = loadEntityMatch[1].trim();
      const transEntity = dictMap.get(entity) || entity;
      return prefix + 'Loading ' + transEntity + suffix;
    }
  }

  // 10. Example pattern: "مثال: 500 جنيه" -> "Example: 500 EGP"
  const egMatch = core.match(/^مثال[:：]\s*(.*)$/);
  if (egMatch) {
    const egVal = egMatch[1].trim();
    return prefix + 'Example: ' + egVal + suffix;
  }

  // 11. Breadcrumbs and slash-separated terms (e.g. "الرئيسية / المبيعات / عروض الأسعار")
  if (core.includes(' / ')) {
    const parts = core.split(' / ');
    let anyTranslated = false;
    const translatedParts = parts.map((part) => {
      const p = part.trim();
      const tr = dictMap.get(p) || translateUiText(p);
      if (tr && tr !== p) {
        anyTranslated = true;
        return tr;
      }
      return p;
    });
    if (anyTranslated) {
      return prefix + translatedParts.join(' / ') + suffix;
    }
  }

  // 12. Arrow-separated breadcrumbs (e.g. "الرئيسية > المبيعات")
  if (core.includes(' > ') || core.includes(' ← ') || core.includes(' → ')) {
    const delim = core.includes(' > ') ? ' > ' : core.includes(' → ') ? ' → ' : ' ← ';
    const parts = core.split(delim);
    let anyTranslated = false;
    const translatedParts = parts.map((part) => {
      const p = part.trim();
      const tr = dictMap.get(p) || translateUiText(p);
      if (tr && tr !== p) {
        anyTranslated = true;
        return tr;
      }
      return p;
    });
    if (anyTranslated) {
      return prefix + translatedParts.join(' > ') + suffix;
    }
  }

  // 13. Search patterns (e.g. "ابحث بالاسم أو الكود...", "بحث برقم الفاتورة، اسم العميل، أو الهاتف...")
  const searchMatch = core.match(/^(?:بحث|ابحث|البحث)\s+(?:بـ|عن|في|ب)?\s*(.*)$/);
  if (searchMatch) {
    const queryTarget = searchMatch[1].trim();
    if (!queryTarget || queryTarget === 'هنا') return prefix + 'Search...' + suffix;
    if (queryTarget === 'سريع') return prefix + 'Quick Search...' + suffix;

    const orParts = queryTarget.split(/\s*،\s*|\s+أو\s+/);
    if (orParts.length > 1) {
      const translatedItems = orParts.map((item) => {
        const cleanItem = item.replace(/^بـ|^ب|^في\s+/, '').trim();
        return dictMap.get(cleanItem) || translateUiText(cleanItem) || cleanItem;
      });
      return prefix + 'Search by ' + translatedItems.slice(0, -1).join(', ') + ' or ' + translatedItems.slice(-1)[0] + '...' + suffix;
    }
    const cleanSingle = queryTarget.replace(/^بـ|^ب|^في\s+/, '').trim();
    const transTarget = dictMap.get(cleanSingle) || translateUiText(cleanSingle);
    if (transTarget) {
      return prefix + 'Search by ' + transTarget + '...' + suffix;
    }
    return prefix + 'Search ' + queryTarget + '...' + suffix;
  }

  // 14. Selection patterns (e.g. "اختر الفرع...", "اختر الحساب...", "اختر طريقة الدفع...")
  const selectMatch = core.match(/^(?:اختر|اختيار|حدد)\s+(.*)$/);
  if (selectMatch) {
    const target = selectMatch[1].trim();
    if (!target) return prefix + 'Select...' + suffix;
    const transTarget = dictMap.get(target) || translateUiText(target);
    if (transTarget) {
      return prefix + 'Select ' + transTarget + suffix;
    }
  }

  // 15. All entities (e.g. "جميع الأصناف", "جميع الفروع", "كل الحسابات")
  const allMatch = core.match(/^(?:جميع|كل)\s+(.*)$/);
  if (allMatch) {
    const target = allMatch[1].trim();
    const transTarget = dictMap.get(target) || translateUiText(target);
    if (transTarget) {
      return prefix + 'All ' + transTarget + suffix;
    }
  }

  // 16. Count of entities (e.g. "عدد العملاء", "عدد الفواتير", "عدد الأصناف")
  const countMatch = core.match(/^عدد\s+(.*)$/);
  if (countMatch) {
    const target = countMatch[1].trim();
    const transTarget = dictMap.get(target) || translateUiText(target);
    if (transTarget) {
      return prefix + transTarget + ' Count' + suffix;
    }
  }

  // 17. Without entities (e.g. "بدون مركز", "بدون ضريبة", "بدون عميل")
  const withoutMatch = core.match(/^بدون\s+(.*)$/);
  if (withoutMatch) {
    const target = withoutMatch[1].trim();
    const transTarget = dictMap.get(target) || translateUiText(target);
    if (transTarget) {
      return prefix + 'No ' + transTarget + suffix;
    }
  }

  // 18. Broad empty state matcher (e.g. "لا توجد بيانات متاحة", "لا توجد نتائج", "لا توجد فواتير")
  const broadEmptyMatch = core.match(/^لا (?:توجد|يوجد)\s+(.*)$/);
  if (broadEmptyMatch) {
    const rest = broadEmptyMatch[1].trim();
    if (!rest || rest === 'بيانات' || rest === 'بيانات متاحة') return prefix + 'No data available' + suffix;
    if (rest === 'نتائج' || rest === 'نتائج مطابقة') return prefix + 'No matching results found' + suffix;
    if (rest === 'سجلات') return prefix + 'No records found' + suffix;
    const transRest = dictMap.get(rest) || translateUiText(rest);
    if (transRest) {
      return prefix + 'No ' + transRest + ' found' + suffix;
    }
    return prefix + 'No ' + rest + ' found' + suffix;
  }

  // 19. Success confirmations (e.g. "تم الحفظ بنجاح", "تم الحذف بنجاح")
  const successMatch = core.match(/^تم\s+(.+?)\s+بنجاح$/);
  if (successMatch) {
    const action = successMatch[1].trim();
    const actionMap: Record<string, string> = {
      'الحفظ': 'Saved',
      'التحديث': 'Updated',
      'الحذف': 'Deleted',
      'الإرسال': 'Sent',
      'التسجيل': 'Registered',
      'الترحيل': 'Posted',
      'الدفع': 'Paid',
      'الإلغاء': 'Cancelled',
      'الاعتماد': 'Approved',
      'الإنشاء': 'Created',
    };
    const act = actionMap[action] || dictMap.get(action);
    if (act) return prefix + act + ' successfully' + suffix;
  }

  // 20. Conjunction "و" (e.g. "المبيعات والعملاء", "المبيعات ونقاط الخدمة", "الشركات والتوزيع والإنتاج")
  if (core.includes(' و')) {
    const parts = core.split(/\s+و\s*|\s*،\s*/);
    if (parts.length > 1) {
      let allTranslated = true;
      const transParts = parts.map((p) => {
        const tr = dictMap.get(p.trim()) || translateUiText(p.trim());
        if (!tr) allTranslated = false;
        return tr || p.trim();
      });
      if (allTranslated) {
        return prefix + transParts.join(' & ') + suffix;
      }
    }
  }

  return null;
}

function processTextNode(node: Text): void {
  const parent = node.parentElement;
  if (!parent || shouldSkipElement(parent)) return;

  const currentVal = node.nodeValue;
  if (!currentVal) return;

  const translated = translateUiText(currentVal);
  if (translated && translated !== currentVal) {
    if (!originalTextMap.has(node)) {
      originalTextMap.set(node, currentVal);
    }
    node.nodeValue = translated;
  }
}

function processElementAttributes(el: HTMLElement): void {
  if (shouldSkipElement(el)) return;

  // Placeholder
  const placeholder = el.getAttribute('placeholder');
  if (placeholder) {
    const translated = translateUiText(placeholder);
    if (translated && translated !== placeholder) {
      let saved = originalAttrMap.get(el);
      if (!saved) {
        saved = {};
        originalAttrMap.set(el, saved);
      }
      if (!saved.placeholder) saved.placeholder = placeholder;
      el.setAttribute('placeholder', translated);
    }
  }

  // Title / Tooltip
  const title = el.getAttribute('title');
  if (title) {
    const translated = translateUiText(title);
    if (translated && translated !== title) {
      let saved = originalAttrMap.get(el);
      if (!saved) {
        saved = {};
        originalAttrMap.set(el, saved);
      }
      if (!saved.title) saved.title = title;
      el.setAttribute('title', translated);
    }
  }

  // aria-label
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) {
    const translated = translateUiText(ariaLabel);
    if (translated && translated !== ariaLabel) {
      let saved = originalAttrMap.get(el);
      if (!saved) {
        saved = {};
        originalAttrMap.set(el, saved);
      }
      if (!saved.ariaLabel) saved.ariaLabel = ariaLabel;
      el.setAttribute('aria-label', translated);
    }
  }

  // Button value: <input type="button" value="حفظ" /> or <input type="submit" value="..." />
  if (el.tagName === 'INPUT') {
    const inputType = el.getAttribute('type');
    if (inputType === 'button' || inputType === 'submit') {
      const val = (el as HTMLInputElement).value;
      if (val) {
        const translated = translateUiText(val);
        if (translated && translated !== val) {
          let saved = originalAttrMap.get(el);
          if (!saved) {
            saved = {};
            originalAttrMap.set(el, saved);
          }
          if (!saved.value) saved.value = val;
          (el as HTMLInputElement).value = translated;
        }
      }
    }
  }
}

function walkAndTranslate(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    processTextNode(root as Text);
    return;
  }

  if (root.nodeType === Node.ELEMENT_NODE) {
    const el = root as HTMLElement;
    if (shouldSkipElement(el)) return;
    processElementAttributes(el);

    let child = el.firstChild;
    while (child) {
      walkAndTranslate(child);
      child = child.nextSibling;
    }
  }
}

function restoreNodeToOriginal(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    const orig = originalTextMap.get(root);
    if (orig != null) {
      root.nodeValue = orig;
    }
    return;
  }

  if (root.nodeType === Node.ELEMENT_NODE) {
    const el = root as HTMLElement;
    const saved = originalAttrMap.get(el);
    if (saved) {
      if (saved.placeholder != null) el.setAttribute('placeholder', saved.placeholder);
      if (saved.title != null) el.setAttribute('title', saved.title);
    }

    let child = el.firstChild;
    while (child) {
      restoreNodeToOriginal(child);
      child = child.nextSibling;
    }
  }
}

function flushPendingTranslations(): void {
  isTranslating = true;
  const nodes = pendingNodes;
  pendingNodes = [];
  rafId = null;

  for (const node of nodes) {
    if (node.isConnected) {
      walkAndTranslate(node);
    }
  }
  isTranslating = false;
}

function queueNodeForTranslation(node: Node): void {
  pendingNodes.push(node);
  if (rafId === null) {
    rafId = requestAnimationFrame(flushPendingTranslations);
  }
}

function handleMutations(mutations: MutationRecord[]): void {
  if (isTranslating) return;

  for (const mut of mutations) {
    if (mut.type === 'childList') {
      mut.addedNodes.forEach((added) => {
        queueNodeForTranslation(added);
      });
    } else if (mut.type === 'characterData') {
      if (mut.target.nodeType === Node.TEXT_NODE) {
        queueNodeForTranslation(mut.target);
      }
    } else if (mut.type === 'attributes') {
      if (mut.target.nodeType === Node.ELEMENT_NODE) {
        processElementAttributes(mut.target as HTMLElement);
      }
    }
  }
}

export function activateAutoTranslator(): void {
  if (typeof document === 'undefined') return;

  // Initial full scan
  isTranslating = true;
  walkAndTranslate(document.body);
  isTranslating = false;

  // Observe ongoing dynamic updates (modals, dialogs, lists)
  if (!observer) {
    observer = new MutationObserver(handleMutations);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label', 'value'],
    });
  }
}

export function deactivateAutoTranslator(): void {
  if (typeof document === 'undefined') return;

  if (observer) {
    observer.disconnect();
    observer = null;
  }

  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  pendingNodes = [];

  // Restore everything to original Arabic
  restoreNodeToOriginal(document.body);
}

/**
 * Initializes the universal auto-translator listener.
 * Automatically activates when English is active, and deactivates/restores when Arabic is active.
 */
export function initAutoTranslator(i18nInstance: any): void {
  if (typeof window === 'undefined' || !i18nInstance) return;

  const currentLang = i18nInstance.language || 'ar';
  if (currentLang === 'en') {
    // Delay slightly to allow React initial mount to finish
    setTimeout(activateAutoTranslator, 50);
  }

  i18nInstance.on('languageChanged', (lng: string) => {
    if (lng === 'en') {
      activateAutoTranslator();
    } else {
      deactivateAutoTranslator();
    }
  });
}
