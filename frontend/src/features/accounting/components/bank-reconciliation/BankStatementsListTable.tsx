import { useTranslation } from 'react-i18next';
import React from 'react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { BankStatementListItem } from '../../api/accounting.api';

interface BankStatementsListTableProps {
  isLoading: boolean;
  statements?: BankStatementListItem[];
  onOpenCreate: () => void;
  onSelectStatement: (id: number) => void;
}

export const BankStatementsListTable: React.FC<BankStatementsListTableProps> = ({
  isLoading,
  statements,
  onOpenCreate,
  onSelectStatement,
}) => {
  const { t } = useTranslation();
  return (
    <Card title={t('accounting.bank_reconciliation.bank_statements_list_table.s0', "سجل كشوف الحسابات البنكية")} className="workspace-panel">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>{t('accounting.bank_reconciliation.bank_statements_list_table.s1', "جارٍ تحميل كشوف الحسابات...")}</div>
        ) : !statements || statements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: 700 }}>
              {t('accounting.bank_reconciliation.bank_statements_list_table.s2', "لا توجد كشوف حسابات بنكية مسجلة حالياً.")}
            </p>
            <p style={{ margin: '6px 0 16px', fontSize: '12px', color: '#94a3b8' }}>
              {t('accounting.bank_reconciliation.bank_statements_list_table.s3', "ابدأ بإضافة أول كشف حساب بنكي لمطابقة أرصدة البنك مع دفتر الأستاذ العام.")}
            </p>
            <Button
              type="button"
              variant="primary"
              onClick={onOpenCreate}
              style={{ background: '#170e5e', borderColor: '#170e5e', fontSize: '13px', fontWeight: 800 }}
            >
              {t('accounting.bank_reconciliation.bank_statements_list_table.s4', "+ إضافة كشف حساب بنكي")}
            </Button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>
                  <th style={{ padding: '10px 14px', color: '#475569' }}>{t('accounting.bank_reconciliation.bank_statements_list_table.s5', "رقم الكشف")}</th>
                  <th style={{ padding: '10px 14px', color: '#475569' }}>{t('accounting.bank_reconciliation.bank_statements_list_table.s6', "الحساب البنكي")}</th>
                  <th style={{ padding: '10px 14px', color: '#475569' }}>{t('accounting.bank_reconciliation.bank_statements_list_table.s7', "تاريخ الكشف")}</th>
                  <th style={{ padding: '10px 14px', color: '#475569' }}>{t('accounting.bank_reconciliation.bank_statements_list_table.s8', "رصيد البداية")}</th>
                  <th style={{ padding: '10px 14px', color: '#475569' }}>{t('accounting.bank_reconciliation.bank_statements_list_table.s9', "رصيد النهاية")}</th>
                  <th style={{ padding: '10px 14px', color: '#475569' }}>{t('accounting.bank_reconciliation.bank_statements_list_table.s10', "الحالة")}</th>
                  <th style={{ padding: '10px 14px', color: '#475569', textAlign: 'center' }}>{t('accounting.bank_reconciliation.bank_statements_list_table.s11', "الإجراء")}</th>
                </tr>
              </thead>
              <tbody>
                {statements.map((stmt) => (
                  <tr key={stmt.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>{stmt.statementNo}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{stmt.accountNameAr}</span>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>{t('accounting.bank_reconciliation.bank_statements_list_table.s12', "كود:")} {stmt.accountCode}</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>{stmt.statementDate}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>{formatCurrency(stmt.startingBalance)}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#170e5e' }}>{formatCurrency(stmt.endingBalance)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: '6px',
                          background: stmt.status === 'reconciled' ? '#f0fdf4' : stmt.status === 'in_progress' ? '#eff6ff' : '#f8fafc',
                          color: stmt.status === 'reconciled' ? '#166534' : stmt.status === 'in_progress' ? '#1e40af' : '#475569',
                          border: `1px solid ${stmt.status === 'reconciled' ? '#bbf7d0' : stmt.status === 'in_progress' ? '#bfdbfe' : '#cbd5e1'}`,
                        }}
                      >
                        {stmt.status === 'reconciled' ? t('accounting.bank_reconciliation.bank_statements_list_table.s13', "متطابق بالكامل") : stmt.status === 'in_progress' ? t('accounting.bank_reconciliation.bank_statements_list_table.s14', "جاري المطابقة") : t('accounting.bank_reconciliation.bank_statements_list_table.s15', "مسودة")}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onSelectStatement(stmt.id)}
                        style={{ borderColor: '#170e5e', color: '#170e5e', fontSize: '12px', fontWeight: 800, padding: '4px 12px' }}
                      >
                        {t('accounting.bank_reconciliation.bank_statements_list_table.s16', "فتح مساحة المطابقة ↵")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
};
