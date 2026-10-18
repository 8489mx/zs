const fs = require('fs');
let code = fs.readFileSync('frontend/src/shared/ui/searchable-combobox.tsx', 'utf8');

// Add translateUiText import
code = code.replace(
  "import { matchesArabic } from '@/lib/arabic-normalization';",
  "import { matchesArabic } from '@/lib/arabic-normalization';\nimport { translateUiText } from '@/lib/auto-translator';"
);

// Add isEn and resolved strings inside component
code = code.replace(
  "  const { t } = useTranslation();",
  `  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const resolvedPlaceholder = isEn && placeholder ? (translateUiText(placeholder) || placeholder) : placeholder;
  const resolvedEmptyLabel = isEn && emptyLabel ? (translateUiText(emptyLabel) || emptyLabel) : emptyLabel;`
);

// Update option title rendering
code = code.replace(
  `<span className="purchase-prototype-combobox-option-title">{getLabel(option)}</span>`,
  `<span className="purchase-prototype-combobox-option-title">{isEn ? (translateUiText(getLabel(option)) || getLabel(option)) : getLabel(option)}</span>`
);

// Update empty label rendering
code = code.replace(
  `<span>{emptyLabel}</span>`,
  `<span>{resolvedEmptyLabel}</span>`
);

// Update input placeholder in both inline and wrapped
code = code.replace(
  `placeholder={placeholder}`,
  `placeholder={resolvedPlaceholder}`
);
code = code.replace(
  `placeholder={placeholder}`,
  `placeholder={resolvedPlaceholder}`
);

fs.writeFileSync('frontend/src/shared/ui/searchable-combobox.tsx', code, 'utf8');
console.log('searchable-combobox.tsx patched successfully');
