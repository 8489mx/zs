const fs = require('fs');
let content = fs.readFileSync('src/features/settings/components/forms/SettingsMainForm.tsx', 'utf8');

// Add import
content = content.replace(
  "import { DialogShell } from '@/shared/components/dialog-shell';",
  "import { DialogShell } from '@/shared/components/dialog-shell';\nimport { FormSection } from '@/shared/components/form-section';"
);

// Replace form wrapper
content = content.replace(
  '<form id="settings-main-form" className="page-shell document-prototype-shell purchase-new-prototype settings-core-form" dir="rtl" onSubmit={submit}>',
  '<form id="settings-main-form" className="page-stack settings-core-form" dir="rtl" onSubmit={submit}>'
);

// We'll use a precise regex to remove the topbar block and <main> tag
content = content.replace(
  /\{\/\* ===== الهيدر العلوي الثابت ===== \*\/\}\s*<div className="purchase-prototype-sticky-stack">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\{\/\* ===== محتوى الصفحة ===== \*\/\}\s*<main className="document-prototype-column" style=\{\{ paddingBottom: '100px' \}\}>/g,
  ''
);

// Replace brand preview section
content = content.replace(
  /<section className="document-prototype-section" style=\{\{ marginBottom: 24 \}\}>\s*<BrandPreview form=\{form\} \/>\s*<\/section>/,
  '<FormSection title="الهوية التجارية">\n          <BrandPreview form={form} />\n        </FormSection>'
);

// Replace standard sections with description
content = content.replace(
  /<section className="document-prototype-section">\s*<div className="document-prototype-section-header" style=\{\{ marginBottom: 16 \}\}>\s*<h3 className="document-prototype-section-title">([^<]+)<\/h3>\s*<\/div>\s*<div className="muted small" style=\{\{ marginBottom: 16 \}\}>([\s\S]*?)<\/div>/g,
  '<FormSection title="$1" description={<>$2</>}>'
);

// Replace standard sections without description
content = content.replace(
  /<section className="document-prototype-section">\s*<div className="document-prototype-section-header" style=\{\{ marginBottom: 16 \}\}>\s*<h3 className="document-prototype-section-title">([^<]+)<\/h3>\s*<\/div>/g,
  '<FormSection title="$1">'
);

// Close sections
content = content.replace(/<\/section>/g, '</FormSection>');

// Remove main close
content = content.replace(/\s*<\/main>\s*/, '\n\n      ');

fs.writeFileSync('src/features/settings/components/forms/SettingsMainForm.tsx', content);
