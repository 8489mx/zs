const fs = require('fs');
let code = fs.readFileSync('frontend/src/shared/ui/ComboboxSelect.tsx', 'utf8');

// Add translateUiText import
code = code.replace(
  "import { normalizeArabicSearchKey } from '@/lib/arabic-normalization';",
  "import { normalizeArabicSearchKey } from '@/lib/arabic-normalization';\nimport { translateUiText } from '@/lib/auto-translator';"
);

// Add isEn and helper in ComboboxSelect
code = code.replace(
  "  const { t } = useTranslation();",
  `  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const getOptionLabel = (label: string) => {
    if (!isEn || !label) return label;
    return translateUiText(label) || label;
  };

  const resolvedPlaceholder = isEn && placeholder === 'ابحث...' ? 'Search...' : (isEn && placeholder ? (translateUiText(placeholder) || placeholder) : placeholder);
  const resolvedEmptyLabel = isEn && emptyLabel === 'بدون' ? 'None' : (isEn && emptyLabel ? (translateUiText(emptyLabel) || emptyLabel) : emptyLabel);`
);

// Update query sync on selectedOption change
code = code.replace(
  "setQuery(selectedOption ? selectedOption.label : '');",
  "setQuery(selectedOption ? getOptionLabel(selectedOption.label) : '');"
);

// Update useEffect dependency
code = code.replace(
  "[isOpen, selectedOption]);",
  "[isOpen, selectedOption, isEn]);"
);

// Update placeholder
code = code.replace(
  "placeholder={placeholder}",
  "placeholder={resolvedPlaceholder}"
);

// Update emptyLabel display
code = code.replace(
  "{emptyLabel}",
  "{resolvedEmptyLabel}"
);

// Update option label display
code = code.replace(
  "{opt.label}",
  "{getOptionLabel(opt.label)}"
);

// Update alignment from textAlign: 'right' to dynamic
code = code.replace(
  /textAlign: 'right'/g,
  "textAlign: isEn ? 'left' : 'right'"
);

fs.writeFileSync('frontend/src/shared/ui/ComboboxSelect.tsx', code, 'utf8');
console.log('ComboboxSelect.tsx patched successfully');
