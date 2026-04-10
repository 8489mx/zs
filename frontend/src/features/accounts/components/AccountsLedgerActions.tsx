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
  return (
    <div className="actions compact-actions">
      <Button
        variant="secondary"
        onClick={async () => {
          const rows = await loadAllEntries();
          if (rows) exportLedgerCsv(filename, rows);
        }}
        disabled={disabled || !canPrint}
      >
        تصدير CSV
      </Button>
      <Button
        variant="secondary"
        onClick={() => void copyLedgerSummary(title, partyName, entries, async () => (await loadAllEntries()) || [])}
        disabled={disabled || !canPrint}
      >
        نسخ الكشف
      </Button>
      <Button
        variant="secondary"
        onClick={() => void printLedgerSummary(title, partyName, entries, async () => (await loadAllEntries()) || [])}
        disabled={disabled || !canPrint}
      >
        طباعة
      </Button>
    </div>
  );
}
