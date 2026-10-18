const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/cash-drawer/components/CashDrawerShiftsCard.tsx', 'utf8');

// Update renderStatusBadge signature and labels
code = code.replace(
  `function renderStatusBadge(status: string) {`,
  `function renderStatusBadge(status: string, isEn = false) {`
);
code = code.replace(
  `مفتوحة`,
  `{isEn ? 'Open' : 'مفتوحة'}`
);
code = code.replace(
  `بانتظار المراجعة`,
  `{isEn ? 'Pending Review' : 'بانتظار المراجعة'}`
);
code = code.replace(
  `مغلقة`,
  `{isEn ? 'Closed' : 'مغلقة'}`
);

// In component, get isEn
code = code.replace(
  `  const { t } = useTranslation();`,
  `  const { t, i18n } = useTranslation();\n  const isEn = i18n.language === 'en';`
);

// Pass isEn to renderStatusBadge
code = code.replace(
  `{renderStatusBadge(String(row.status || ''))}`,
  `{renderStatusBadge(String(row.status || ''), isEn)}`
);
code = code.replace(
  `{renderStatusBadge(String(mobileSelectedShift.status || ''))}`,
  `{renderStatusBadge(String(mobileSelectedShift.status || ''), isEn)}`
);

fs.writeFileSync('frontend/src/features/cash-drawer/components/CashDrawerShiftsCard.tsx', code, 'utf8');
console.log('CashDrawerShiftsCard.tsx patched successfully');
