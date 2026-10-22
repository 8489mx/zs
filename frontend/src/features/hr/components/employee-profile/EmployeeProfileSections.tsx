import { useTranslation } from 'react-i18next';
import type { HrContact, HrLedgerEntry } from '@/types/domain';
import { fallbackText, money } from '@/features/hr/utils/employee-profile.helpers';
import { formatDateTimeArabic } from '@/lib/format';

interface ContactsSectionProps {
  contacts: HrContact[];
}

function formatContactType(type?: string, isEn = false) {
  const t = String(type || '').toLowerCase().trim();
  if (isEn) {
    if (t === 'mobile') return 'Mobile';
    if (t === 'phone') return 'Phone';
    if (t === 'email') return 'Email';
    if (t === 'emergency') return 'Emergency Contact';
    if (t === 'whatsapp') return 'WhatsApp';
    if (t === 'address') return 'Address';
    return type || '—';
  }
  if (t === 'mobile') return 'موبايل';
  if (t === 'phone') return 'هاتف';
  if (t === 'email') return 'بريد إلكتروني';
  if (t === 'emergency') return 'طوارئ';
  if (t === 'whatsapp') return 'واتساب';
  if (t === 'address') return 'عنوان';
  return type || '—';
}

export function ContactsSection({ contacts }: ContactsSectionProps) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

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
              <td style={{ padding: '8px 12px' }}>{formatContactType(row.contactType, isEn)}</td>
              <td style={{ padding: '8px 12px', direction: 'ltr', textAlign: isEn ? 'left' : 'right' }}>{fallbackText(row.value)}</td>
              <td style={{ padding: '8px 12px' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: row.isPrimary ? '#dcfce7' : '#f1f5f9',
                  color: row.isPrimary ? '#15803d' : '#64748b',
                }}>
                  {row.isPrimary ? (isEn ? 'Yes' : 'نعم') : (isEn ? 'No' : 'لا')}
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

function ledgerEntryTypeBadge(entryType?: string, isEn = false) {
  const t = String(entryType || '').toLowerCase().trim();

  if (t === 'loan_disbursement' || t === 'loan') {
    return (
      <span style={{ padding: '2px 8px', borderRadius: 4, background: '#eff6ff', color: '#1d4ed8', fontWeight: 600, fontSize: '0.75rem' }}>
        {isEn ? 'Loan Disbursement' : 'صرف سلفة'}
      </span>
    );
  }
  if (t === 'loan_repayment' || t === 'repayment') {
    return (
      <span style={{ padding: '2px 8px', borderRadius: 4, background: '#f0fdf4', color: '#15803d', fontWeight: 600, fontSize: '0.75rem' }}>
        {isEn ? 'Loan Repayment' : 'سداد سلفة'}
      </span>
    );
  }
  if (t === 'payroll' || t === 'salary_payment') {
    return (
      <span style={{ padding: '2px 8px', borderRadius: 4, background: '#fef3c7', color: '#b45309', fontWeight: 600, fontSize: '0.75rem' }}>
        {isEn ? 'Payroll Run' : 'مسير رواتب'}
      </span>
    );
  }
  if (t === 'payroll_deduction') {
    return (
      <span style={{ padding: '2px 8px', borderRadius: 4, background: '#fee2e2', color: '#b91c1c', fontWeight: 600, fontSize: '0.75rem' }}>
        {isEn ? 'Payroll Deduction' : 'استقطاع مسير'}
      </span>
    );
  }
  if (t === 'end_of_service') {
    return (
      <span style={{ padding: '2px 8px', borderRadius: 4, background: '#f5f3ff', color: '#6d28d9', fontWeight: 600, fontSize: '0.75rem' }}>
        {isEn ? 'End of Service' : 'مستحقات نهاية الخدمة'}
      </span>
    );
  }
  if (t === 'settlement') {
    return (
      <span style={{ padding: '2px 8px', borderRadius: 4, background: '#f5f3ff', color: '#6d28d9', fontWeight: 600, fontSize: '0.75rem' }}>
        {isEn ? 'Settlement' : 'تسوية مستحقات'}
      </span>
    );
  }
  if (t === 'advance') {
    return (
      <span style={{ padding: '2px 8px', borderRadius: 4, background: '#fff7ed', color: '#c2410c', fontWeight: 600, fontSize: '0.75rem' }}>
        {isEn ? 'Advance' : 'دفعة مقدمة'}
      </span>
    );
  }
  if (t === 'bonus' || t === 'reward') {
    return (
      <span style={{ padding: '2px 8px', borderRadius: 4, background: '#dcfce7', color: '#15803d', fontWeight: 600, fontSize: '0.75rem' }}>
        {isEn ? 'Bonus' : 'مكافأة'}
      </span>
    );
  }
  if (t === 'penalty') {
    return (
      <span style={{ padding: '2px 8px', borderRadius: 4, background: '#fee2e2', color: '#b91c1c', fontWeight: 600, fontSize: '0.75rem' }}>
        {isEn ? 'Penalty' : 'خصم جزاء'}
      </span>
    );
  }
  if (t === 'allowance') {
    return (
      <span style={{ padding: '2px 8px', borderRadius: 4, background: '#e0f2fe', color: '#0369a1', fontWeight: 600, fontSize: '0.75rem' }}>
        {isEn ? 'Allowance' : 'بدل إضافي'}
      </span>
    );
  }
  return (
    <span style={{ padding: '2px 8px', borderRadius: 4, background: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: '0.75rem' }}>
      {entryType || (isEn ? 'Movement' : 'حركة مالية')}
    </span>
  );
}

function formatLedgerDate(dateStr?: string | Date | null, isEn = false) {
  if (!dateStr) return '—';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (Number.isNaN(d.getTime())) return String(dateStr);
  if (isEn) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const formattedHours = String(hours).padStart(2, '0');
    return `${year}-${month}-${day} ${formattedHours}:${minutes} ${period}`;
  }
  return formatDateTimeArabic(d);
}

function formatLedgerNote(note?: string, type?: string, isEn = false): string {
  if (!note || !note.trim()) {
    return isEn ? (type?.includes('repayment') ? 'Loan Repayment' : 'Loan Disbursement') : (type?.includes('repayment') ? 'سداد دفعة من السلفة' : 'صرف السلفة للموظف');
  }
  const text = note.trim();
  if (isEn) return text;
  const lower = text.toLowerCase();
  if (lower.includes('employee advance/loan disbursed immediately upon creation') || lower.includes('employee advance/loan disbursed')) {
    return 'صرف السلفة للموظف عند الإنشاء';
  }
  if (lower.includes('loan disbursement') || lower.includes('loan disbursed')) {
    return 'صرف السلفة للموظف';
  }
  if (lower.includes('employee loan repayment') || lower.includes('loan repayment')) {
    return 'سداد دفعة من السلفة';
  }
  if (lower.includes('payroll salary deduction') || lower.includes('salary deduction')) {
    return 'استقطاع من مسير الرواتب';
  }
  return text;
}

export function LedgerSection({ ledger }: LedgerSectionProps) {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
        <div>
          <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>
            {isEn ? 'Employee Financial Ledger & Statement' : 'السجل المالي والحساب المقيد للموظف'}
          </strong>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            {isEn ? 'Detailed statement of loans, disbursements, payroll deductions, and settlements' : 'كشف الحساب المالي التفصيلي متضمناً السلف، المسيرات، والتسويات المستحقة'}
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f8fafc', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          {ledger.length} {isEn ? 'movements' : 'حركة مسجلة'}
        </span>
      </div>

      {!ledger.length ? (
        <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
          {isEn ? 'No financial movements recorded.' : 'لا توجد حركات مسجلة.'}
        </p>
      ) : (
        <div className="table-wrap">
          <table className="data-table" style={{ width: '100%', fontSize: '0.825rem' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px 12px' }}>{isEn ? 'Movement Type' : 'نوع الحركة'}</th>
                <th style={{ padding: '8px 12px' }}>{isEn ? 'Amount' : 'القيمة'}</th>
                <th style={{ padding: '8px 12px' }}>{isEn ? 'Balance After' : 'الرصيد بعد الحركة'}</th>
                <th style={{ padding: '8px 12px' }}>{isEn ? 'Notes / Statement' : 'البيان والملاحظات'}</th>
                <th style={{ padding: '8px 12px' }}>{isEn ? 'Date & Time' : 'التاريخ والوقت'}</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((row) => (
                <tr key={String(row.id)}>
                  <td style={{ padding: '8px 12px' }}>{ledgerEntryTypeBadge(row.entryType, isEn)}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 700, color: Number(row.amount || 0) < 0 ? '#15803d' : '#0f172a' }}>
                    {money(row.amount)}
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>{money(row.balanceAfter)}</td>
                  <td style={{ padding: '8px 12px', color: '#334155', fontSize: '0.8rem' }}>
                    {formatLedgerNote(row.note, row.entryType, isEn)}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {formatLedgerDate(row.createdAt, isEn)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
