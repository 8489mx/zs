const fs = require('fs');
let code = fs.readFileSync('frontend/src/shared/components/feature-gate.tsx', 'utf8');

// Add translateUiText import
if (!code.includes("import { translateUiText }")) {
  code = code.replace(
    "import { useTranslation } from 'react-i18next';",
    "import { useTranslation } from 'react-i18next';\nimport { translateUiText } from '@/lib/auto-translator';"
  );
}

// In component, get isEn and resolvedFeatureName
code = code.replace(
  "  const { t } = useTranslation();",
  `  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const resolvedFeatureName = isEn ? (translateUiText(featureName) || featureName) : featureName;`
);

// Replace dir="rtl"
code = code.replace(
  'dir="rtl"',
  'dir={isEn ? "ltr" : "rtl"}'
);

// Replace title
code = code.replace(
  `{isDesktopOfflineApp() ? \`موديول \${featureName} غير مضمّن في ترخيصك\` : \`موديول \${featureName} يتطلب ترقية الباقة\`}`,
  `{isEn
    ? (isDesktopOfflineApp() ? \`Module "\${resolvedFeatureName}" is not included in your license\` : \`Module "\${resolvedFeatureName}" requires a plan upgrade\`)
    : (isDesktopOfflineApp() ? \`موديول \${featureName} غير مضمّن في ترخيصك\` : \`موديول \${featureName} يتطلب ترقية الباقة\`)}`
);

// Replace description
code = code.replace(
  `{isDesktopOfflineApp()
          ? \`هذا الموديول متاح في مستوى أعلى من ترخيصك الحالي. تواصل معنا لترقية الترخيص والاستفادة الفورية من كافة أدوات \${featureName} مع الحفاظ على جميع بياناتك.\`
          : \`هذه الميزة المتقدمة متاحة في المستويات الأعلى من باقتك. يمكنك ترقية باقتك للاستفادة الفورية من كافة أدوات \${featureName} مع الحفاظ على جميع بياناتك.\`}`,
  `{isEn
          ? (isDesktopOfflineApp()
              ? \`This module is available in a higher tier of your license. Contact us to upgrade and unlock all "\${resolvedFeatureName}" tools while preserving all your data.\`
              : \`This advanced feature is available on higher tiers. You can upgrade your plan to immediately access all "\${resolvedFeatureName}" tools while preserving all your data.\`)
          : (isDesktopOfflineApp()
              ? \`هذا الموديول متاح في مستوى أعلى من ترخيصك الحالي. تواصل معنا لترقية الترخيص والاستفادة الفورية من كافة أدوات \${featureName} مع الحفاظ على جميع بياناتك.\`
              : \`هذه الميزة المتقدمة متاحة في المستويات الأعلى من باقتك. يمكنك ترقية باقتك للاستفادة الفورية من كافة أدوات \${featureName} مع الحفاظ على جميع بياناتك.\`)}`
);

// Replace buttons
code = code.replace(
  `{t('shared.feature_gate.s0', "ترقية الباقة الآن")}`,
  `{isEn ? 'Upgrade Plan Now' : t('shared.feature_gate.s0', "ترقية الباقة الآن")}`
);
code = code.replace(
  `{t('shared.feature_gate.s1', "العودة للرئيسية")}`,
  `{isEn ? 'Back to Dashboard' : t('shared.feature_gate.s1', "العودة للرئيسية")}`
);

fs.writeFileSync('frontend/src/shared/components/feature-gate.tsx', code, 'utf8');
console.log('feature-gate.tsx patched successfully');
