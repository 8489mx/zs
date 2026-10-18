const fs = require('fs');

let code = fs.readFileSync('frontend/src/features/accounting/pages/BalanceSheetPage.tsx', 'utf8');

// Remove hardcoded dir="rtl"
code = code.replace(
  '<div className="page-stack page-shell balance-sheet-workspace" dir="rtl">',
  '<div className="page-stack page-shell balance-sheet-workspace">'
);

// Update SectionCard
const cardIndex = code.indexOf('function SectionCard');
if (cardIndex !== -1) {
  const newCard = `function SectionCard({ section, hasCompare }: { section: BalanceSheetSection; hasCompare: boolean }) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const title = isEn ? (section.titleEn || section.titleAr) : section.titleAr;
  const subTitle = isEn ? section.titleAr : section.titleEn;

  return (
    <Card style={{ padding: '0', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between' }}>
        <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{title}</strong>
        {subTitle && <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{subTitle}</span>}
      </div>

      <div style={{ padding: '12px 16px' }}>
        {section.accounts.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
            {t('accounting.balance_sheet_page.s35', "لا توجد أرصدة في هذا القسم")}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <tbody>
              {section.accounts.map((acc) => {
                const accName = isEn ? (acc.nameEn || acc.nameAr) : acc.nameAr;
                return (
                  <tr key={acc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 4px', color: '#64748b', width: '80px' }}>{acc.code}</td>
                    <td style={{ padding: '8px 4px', fontWeight: 600, color: '#1e293b' }}>{accName}</td>
                    <td style={{ padding: '8px 4px', textAlign: isEn ? 'right' : 'left', fontWeight: 700, color: acc.amount < 0 ? '#dc2626' : '#0f172a' }}>
                      {formatCurrency(acc.amount)}
                    </td>
                    {hasCompare && (
                      <td style={{ padding: '8px 4px', textAlign: isEn ? 'right' : 'left', color: '#64748b', fontSize: '0.8rem' }}>
                        {formatCurrency(acc.compareAmount || 0)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ padding: '12px 18px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, color: '#334155' }}>{t('accounting.balance_sheet_page.s36', "إجمالي")} {title}</span>
        <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{formatCurrency(section.total)}</strong>
      </div>
    </Card>
  );
}
`;
  code = code.slice(0, cardIndex) + newCard;
  fs.writeFileSync('frontend/src/features/accounting/pages/BalanceSheetPage.tsx', code, 'utf8');
  console.log('Successfully updated BalanceSheetPage.tsx');
}
