const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/settings/components/workspace-sections/SettingsMarketplacesSection.tsx', 'utf8');

// Add translateUiText import
if (!code.includes("import { translateUiText }")) {
  code = code.replace(
    "import { formatDateTimeArabic } from '@/lib/format';",
    "import { formatDateTimeArabic } from '@/lib/format';\nimport { translateUiText } from '@/lib/auto-translator';"
  );
}

// In EditOnboardingProfileModal, get isEn
code = code.replace(
  "  const { t } = useTranslation();",
  "  const { t, i18n } = useTranslation();\n  const isEn = i18n.language === 'en';"
);

// In EditOnboardingProfileModal header
code = code.replace(
  "{currentMeta.title}",
  "{isEn ? (translateUiText(currentMeta.title) || currentMeta.title) : currentMeta.title}"
);
code = code.replace(
  "{currentMeta.subtitle}",
  "{isEn ? (translateUiText(currentMeta.subtitle) || currentMeta.subtitle) : currentMeta.subtitle}"
);

// In sectionTabs.map
code = code.replace(
  "{sec.label}",
  "{isEn ? (translateUiText(sec.label) || sec.label) : sec.label}"
);

fs.writeFileSync('frontend/src/features/settings/components/workspace-sections/SettingsMarketplacesSection.tsx', code, 'utf8');
console.log('SettingsMarketplacesSection.tsx patched successfully');
