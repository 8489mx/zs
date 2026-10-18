const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/ai-copilot/components/AiBusinessCopilotModal.tsx', 'utf8');

// Add QUICK_SUGGESTIONS_EN
code = code.replace(
  `const QUICK_SUGGESTIONS = [
  'كسبت كام النهاردة؟',
  'فلوس الخزينة والدرج الحالية',
  'ايه نواقص المخزن الحرجة؟',
  'مين أكتر عملاء عليهم فلوس؟',
  'أفكار بره الصندوق لزيادة الأرباح',
  'فرص تصريف البضاعة الراكدة',
  'شروط وسياسات المنشأة',
  'أكتر 5 منتجات مبيعاً',
];`,
  `const QUICK_SUGGESTIONS = [
  'كسبت كام النهاردة؟',
  'فلوس الخزينة والدرج الحالية',
  'ايه نواقص المخزن الحرجة؟',
  'مين أكتر عملاء عليهم فلوس؟',
  'أفكار بره الصندوق لزيادة الأرباح',
  'فرص تصريف البضاعة الراكدة',
  'شروط وسياسات المنشأة',
  'أكتر 5 منتجات مبيعاً',
];

const QUICK_SUGGESTIONS_EN = [
  'How much did we earn today?',
  'Current cash in safe & register',
  'What are critical stock shortages?',
  'Top customers with outstanding balances',
  'Out-of-the-box ideas to boost profit',
  'Opportunities to move stagnant stock',
  'Company policies & terms',
  'Top 5 best-selling products',
];`
);

// In component, get isEn
code = code.replace(
  `  const { t } = useTranslation();`,
  `  const { t, i18n } = useTranslation();\n  const isEn = i18n.language === 'en';`
);

// Map suggestions
code = code.replace(
  `{QUICK_SUGGESTIONS.map((text, idx) => (`,
  `{(isEn ? QUICK_SUGGESTIONS_EN : QUICK_SUGGESTIONS).map((text, idx) => (`
);

fs.writeFileSync('frontend/src/features/ai-copilot/components/AiBusinessCopilotModal.tsx', code, 'utf8');
console.log('AiBusinessCopilotModal.tsx patched successfully');
