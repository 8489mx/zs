import { useTranslation } from 'react-i18next';
import type { HrContact, HrLedgerEntry } from '@/types/domain';
import { fallbackText, money } from '@/features/hr/utils/employee-profile.helpers';

interface ContactsSectionProps {
  contacts: HrContact[];
}

export function ContactsSection({ contacts }: ContactsSectionProps) {
  const { t } = useTranslation();
  if (!contacts.length) return <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>{t('hr.employee_profile.employee_profile_sections.s0', "لا توجد بيانات تواصل مسجلة.")}</p>;
  return (
    <div className="table-wrap">
      <table className="data-table" style={{ width: '100%', fontSize: '0.825rem' }}>
        <thead>
          <tr>
            <th style={{ padding: '8px 12px' }}>{t('hr.employee_profile.employee_profile_sections.s1', "البيان")}</th>
            <th style={{ padding: '8px 12px' }}>{t('hr.employee_profile.employee_profile_sections.s2', "النوع")}</th>
            <th style={{ padding: '8px 12px' }}>{t('hr.employee_profile.employee_profile_sections.s3', "القيمة")}</th>
            <th style={{ padding: '8px 12px' }}>{t('hr.employee_profile.employee_profile_sections.s4', "أساسي")}</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((row) => (
            <tr key={String(row.id)}>
              <td style={{ padding: '8px 12px', fontWeight: 600 }}>{fallbackText(row.label)}</td>
              <td style={{ padding: '8px 12px' }}>{fallbackText(row.contactType)}</td>
              <td style={{ padding: '8px 12px', direction: 'ltr', textAlign: 'right' }}>{fallbackText(row.value)}</td>
              <td style={{ padding: '8px 12px' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: row.isPrimary ? '#dcfce7' : '#f1f5f9',
                  color: row.isPrimary ? '#15803d' : '#64748b',
                }}>
                  {row.isPrimary ? t('hr.employee_profile.employee_profile_sections.s5', "نعم") : t('hr.employee_profile.employee_profile_sections.s6', "لا")}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface LedgerSectionProps {
  ledger: HrLedgerEntry[];
}

function ledgerEntryTypeBadge(entryType?: string) {
  const t = String(entryType || '').toLowerCase().trim();
  if (t === 'loan') return <span style={{ padding: '2px 8px', borderRadius: 4, background: '#eff6ff', color: '#1d4ed8', fontWeight: 600, fontSize: '0.75rem' }}>صرف سلفة</span>;
  if (t === 'repayment') return <span style={{ padding: '2px 8px', borderRadius: 4, background: '#f0fdf4', color: '#15803d', fontWeight: 600, fontSize: '0.75rem' }}>سداد سلفة</span>;
  if (t === 'payroll') return <span style={{ padding: '2px 8px', borderRadius: 4, background: '#fef3c7', color: '#b45309', fontWeight: 600, fontSize: '0.75rem' }}>مسير رواتب</span>;
  if (t === 'settlement') return <span style={{ padding: '2px 8px', borderRadius: 4, background: '#f5f3ff', color: '#6d28d9', fontWeight: 600, fontSize: '0.75rem' }}>تسوية مستحقات</span>;
  if (t === 'advance') return <span style={{ padding: '2px 8px', borderRadius: 4, background: '#fff7ed', color: '#c2410c', fontWeight: 600, fontSize: '0.75rem' }}>دفعة مقدمة</span>;
  return <span style={{ padding: '2px 8px', borderRadius: 4, background: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: '0.75rem' }}>{entryType || 'حركة مالية'}</span>;
}

export function LedgerSection({ ledger }: LedgerSectionProps) {
  const { t } = useTranslation();
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
        <div>
          <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>السجل المالي والحساب المقيد للموظف</strong>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>كشف الحساب المالي التفصيلي متضمناً السلف، المسيرات، والتسويات المستحقة</span>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f8fafc', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          {ledger.length} حركة مسجلة
        </span>
      </div>

      {!ledger.length ? (
        <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>{t('hr.employee_profile.employee_profile_sections.s7', "لا توجد حركات مسجلة.")}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table" style={{ width: '100%', fontSize: '0.825rem' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px 12px' }}>{t('hr.employee_profile.employee_profile_sections.s8', "نوع الحركة")}</th>
                <th style={{ padding: '8px 12px' }}>{t('hr.employee_profile.employee_profile_sections.s9', "القيمة")}</th>
                <th style={{ padding: '8px 12px' }}>{t('hr.employee_profile.employee_profile_sections.s10', "الرصيد بعد الحركة")}</th>
                <th style={{ padding: '8px 12px' }}>{t('hr.employee_profile.employee_profile_sections.s11', "التاريخ")}</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((row) => (
                <tr key={String(row.id)}>
                  <td style={{ padding: '8px 12px' }}>{ledgerEntryTypeBadge(row.entryType)}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>{money(row.amount)}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>{money(row.balanceAfter)}</td>
                  <td style={{ padding: '8px 12px', color: '#64748b' }}>{fallbackText(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
