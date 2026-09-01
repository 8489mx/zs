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
        تصدير
      </Button>
      <Button
        variant="secondary"
        className="section-header-action-btn"
        onClick={() => void copyLedgerSummary(title, partyName, entries, async () => (await loadAllEntries()) || [])}
        disabled={disabled || !canPrint}
      >
        نسخ
      </Button>
      <Button
        variant="secondary"
        className="section-header-action-btn"
        onClick={() => void printLedgerSummary(title, partyName, entries, async () => (await loadAllEntries()) || [])}
        disabled={disabled || !canPrint}
      >
        طباعة
      </Button>
    </div>
  );
}
