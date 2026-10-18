import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { copyLedgerSummary, exportLedgerCsv, printLedgerSummary } from '@/features/accounts/lib/ledger-actions';
import type { CustomerLedgerEntry, SupplierLedgerEntry } from '@/types/domain';

type LedgerEntry = CustomerLedgerEntry | SupplierLedgerEntry;

interface AccountsLedgerActionsProps {
  title: string;
  filename: string;
  partyName: string;
  entries: LedgerEntry[];
  canPrint: boolean;
  disabled: boolean;
  loadAllEntries: () => Promise<LedgerEntry[] | undefined>;
}

export function AccountsLedgerActions({ title, filename, partyName, entries, canPrint, disabled, loadAllEntries }: AccountsLedgerActionsProps) {
  const { t } = useTranslation();
  return (
    <div className="section-header-actions-group">
      <Button
        variant="secondary"
        className="section-header-action-btn"
        onClick={async () => {
          const rows = await loadAllEntries();
          if (rows) exportLedgerCsv(filename, rows);
        }}
        disabled={disabled || !canPrint}
      >
        {t('accounts.accounts_ledger_actions.s0', "تصدير")}
      </Button>
      <Button
        variant="secondary"
        className="section-header-action-btn"
        onClick={() => void copyLedgerSummary(title, partyName, entries, async () => (await loadAllEntries()) || [])}
        disabled={disabled || !canPrint}
      >
        {t('accounts.accounts_ledger_actions.s1', "نسخ")}
      </Button>
      <Button
        variant="secondary"
        className="section-header-action-btn"
        onClick={() => void printLedgerSummary(title, partyName, entries, async () => (await loadAllEntries()) || [])}
        disabled={disabled || !canPrint}
      >
        {t('accounts.accounts_ledger_actions.s2', "طباعة")}
      </Button>
    </div>
  );
}
