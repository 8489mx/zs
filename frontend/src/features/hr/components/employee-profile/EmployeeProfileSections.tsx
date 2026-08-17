import type { HrContact, HrLedgerEntry } from '@/types/domain';
import { fallbackText, money } from '@/features/hr/utils/employee-profile.helpers';

interface ContactsSectionProps {
  contacts: HrContact[];
}

export function ContactsSection({ contacts }: ContactsSectionProps) {
  if (!contacts.length) return <p className="muted">لا توجد بيانات تواصل مسجلة.</p>;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>البيان</th>
            <th>النوع</th>
            <th>القيمة</th>
            <th>أساسي</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((row) => (
            <tr key={String(row.id)}>
              <td>{fallbackText(row.label)}</td>
              <td>{fallbackText(row.contactType)}</td>
              <td>{fallbackText(row.value)}</td>
              <td>{row.isPrimary ? 'نعم' : 'لا'}</td>
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

export function LedgerSection({ ledger }: LedgerSectionProps) {
  if (!ledger.length) return <p className="muted">لا توجد حركات مسجلة.</p>;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>نوع الحركة</th>
            <th>القيمة</th>
            <th>الرصيد بعد الحركة</th>
            <th>التاريخ</th>
          </tr>
        </thead>
        <tbody>
          {ledger.map((row) => (
            <tr key={String(row.id)}>
              <td>{fallbackText(row.entryType)}</td>
              <td>{money(row.amount)}</td>
              <td>{money(row.balanceAfter)}</td>
              <td>{fallbackText(row.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
