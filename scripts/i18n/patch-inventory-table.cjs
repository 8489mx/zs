const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/inventory/components/InventoryTable.tsx', 'utf8');

// Replace formatUnitName
code = code.replace(
  `function formatUnitName(units?: { name: string; isBaseUnit: boolean }[]) {`,
  `function formatUnitName(units?: { name: string; isBaseUnit: boolean }[], isEn = false) {\n  if (!units?.length) return '';\n  const baseUnit = units.find(u => u.isBaseUnit) || units[0];\n  if (!baseUnit?.name) return '';\n  if (isEn) {\n    const enMap: Record<string, string> = { 'كيلوجرام': 'kg', 'جرام': 'g', 'قطعة': 'pcs', 'لتر': 'L', 'ملي': 'ml', 'متر': 'm' };\n    return enMap[baseUnit.name] || baseUnit.name;\n  }`
);

// Replace renderStatusBadge
code = code.replace(
  `function renderStatusBadge(status: 'healthy' | 'low' | 'out') {
  return <span className={\`status-badge \${status === 'out' ? 'status-draft' : status === 'low' ? 'status-warning' : 'status-posted'}\`}>{status === 'out' ? 'نافد' : status === 'low' ? 'منخفض' : 'سليم'}</span>;
}`,
  `function renderStatusBadge(status: 'healthy' | 'low' | 'out', isEn = false) {
  const label = status === 'out'
    ? (isEn ? 'Out of Stock' : 'نافد')
    : status === 'low'
    ? (isEn ? 'Low Stock' : 'منخفض')
    : (isEn ? 'Normal' : 'سليم');
  return <span className={\`status-badge \${status === 'out' ? 'status-draft' : status === 'low' ? 'status-warning' : 'status-posted'}\`}>{label}</span>;
}`
);

// Add isEn in component
code = code.replace(
  `  const { t } = useTranslation();`,
  `  const { t, i18n } = useTranslation();\n  const isEn = i18n.language === 'en';`
);

// Pass isEn to renderStatusBadge and formatUnitName
code = code.replace(
  /renderStatusBadge\(status\)/g,
  `renderStatusBadge(status, isEn)`
);
code = code.replace(
  /renderStatusBadge\(groupStatus\)/g,
  `renderStatusBadge(groupStatus, isEn)`
);
code = code.replace(
  /formatUnitName\(product\.units\)/g,
  `formatUnitName(product.units, isEn)`
);
code = code.replace(
  /formatUnitName\(group\.rows\[0\]\?\.units\)/g,
  `formatUnitName(group.rows[0]?.units, isEn)`
);

fs.writeFileSync('frontend/src/features/inventory/components/InventoryTable.tsx', code, 'utf8');
console.log('InventoryTable.tsx patched successfully');
