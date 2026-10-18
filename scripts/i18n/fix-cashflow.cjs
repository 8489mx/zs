const fs = require('fs');

let code = fs.readFileSync('frontend/src/features/accounting/pages/CashFlowStatementPage.tsx', 'utf8');

// 1. Add import
if (!code.includes('translateUiText')) {
  code = code.replace(
    "from '@/features/accounting/api/accounting.api';",
    "from '@/features/accounting/api/accounting.api';\nimport { translateUiText } from '@/lib/auto-translator';"
  );
}

// 2. Remove hardcoded dir="rtl"
code = code.replace(
  '<div className="page-stack page-shell cash-flow-workspace" dir="rtl">',
  '<div className="page-stack page-shell cash-flow-workspace">'
);

// 3. Update CashFlowSectionCard
const cardIndex = code.indexOf('function CashFlowSectionCard');
if (cardIndex !== -1) {
  const newCard = `function CashFlowSectionCard({ section }: { section: CashFlowSection }) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const title = isEn ? (section.titleEn || section.titleAr) : section.titleAr;
  const subTitle = isEn ? section.titleAr : section.titleEn;

  return (
    <Card style={{ padding: '0', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{title}</strong>
          {subTitle && (
            <span style={{ fontSize: '0.8rem', color: '#64748b', marginInlineStart: '8px' }}>({subTitle})</span>
          )}
        </div>
        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: section.total >= 0 ? '#166534' : '#991b1b' }}>
          {formatCurrency(section.total)}
        </div>
      </div>

      <div style={{ padding: '8px 16px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <tbody>
            {section.lines.map((line, idx) => {
              const label = isEn ? (line.labelEn || line.labelAr) : line.labelAr;
              const note = line.note ? (isEn ? (translateUiText(line.note) || line.note) : line.note) : undefined;
              return (
                <tr key={idx} style={{ borderBottom: idx !== section.lines.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td style={{ padding: '10px 4px', fontWeight: 600, color: '#1e293b' }}>
                    {label}
                    {note && (
                      <div style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b', marginTop: '2px' }}>
                        {note}
                      </div>
                    )}
                  </td>
                  <td
                    style={{
                      padding: '10px 4px',
                      textAlign: isEn ? 'right' : 'left',
                      fontWeight: 700,
                      color: line.amount < 0 ? '#dc2626' : line.amount > 0 ? '#16a34a' : '#64748b',
                      width: '180px',
                    }}
                  >
                    {formatCurrency(line.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '12px 18px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, color: '#334155' }}>
          {t('accounting.cash_flow_statement_page.s32', 'صافي التدفقات من')} {title}
        </span>
        <strong style={{ fontSize: '1.1rem', color: section.total >= 0 ? '#166534' : '#991b1b' }}>
          {formatCurrency(section.total)}
        </strong>
      </div>
    </Card>
  );
}
`;
  code = code.slice(0, cardIndex) + newCard;
  fs.writeFileSync('frontend/src/features/accounting/pages/CashFlowStatementPage.tsx', code, 'utf8');
  console.log('Successfully updated CashFlowStatementPage.tsx');
} else {
  console.log('Could not find CashFlowSectionCard in file');
}
