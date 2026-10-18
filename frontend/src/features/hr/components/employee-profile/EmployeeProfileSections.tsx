import { useTranslation } from 'react-i18next';
﻿import type { HrContact, HrLedgerEntry } from '@/types/domain';
import { fallbackText, money } from '@/features/hr/utils/employee-profile.helpers';

interface ContactsSectionProps {
  contacts: HrContact[];
}

export function ContactsSection({ contacts }: ContactsSectionProps) {
  const { t } = useTranslation();
  if (!contacts.length) return <p className="muted">{t('hr.employee_profile.employee_profile_sections.s0', "لا توجد بيانات تواصل مسجلة.")}</p>;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>{t('hr.employee_profile.employee_profile_sections.s1', "البيان")}</th>
            <th>{t('hr.employee_profile.employee_profile_sections.s2', "النوع")}</th>
            <th>{t('hr.employee_profile.employee_profile_sections.s3', "القيمة")}</th>
            <th>{t('hr.employee_profile.employee_profile_sections.s4', "أساسي")}</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((row) => (
            <tr key={String(row.id)}>
              <td>{fallbackText(row.label)}</td>
              <td>{fallbackText(row.contactType)}</td>
              <td>{fallbackText(row.value)}</td>
              <td>{row.isPrimary ? t('hr.employee_profile.employee_profile_sections.s5', "نعم") : t('hr.employee_profile.employee_profile_sections.s6', "لا")}</td>
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
  const { t } = useTranslation();
  if (!ledger.length) return <p className="muted">{t('hr.employee_profile.employee_profile_sections.s7', "لا توجد حركات مسجلة.")}</p>;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>{t('hr.employee_profile.employee_profile_sections.s8', "نوع الحركة")}</th>
            <th>{t('hr.employee_profile.employee_profile_sections.s9', "القيمة")}</th>
            <th>{t('hr.employee_profile.employee_profile_sections.s10', "الرصيد بعد الحركة")}</th>
            <th>{t('hr.employee_profile.employee_profile_sections.s11', "التاريخ")}</th>
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
