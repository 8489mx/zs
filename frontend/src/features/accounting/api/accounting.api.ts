import { http } from '@/lib/http';

export type AccountingAccount = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  accountType: string;
  accountGroup: string;
  parentId: string;
  depth: number;
  normalBalance: string;
  isActive: boolean;
  isSystem: boolean;
  allowManualEntries: boolean;
  isControlAccount: boolean;
  flags: {
    isCashBank: boolean;
    isReceivable: boolean;
    isPayable: boolean;
    isInventory: boolean;
    isTax: boolean;
  };
  sortOrder: number;
};

export type JournalEntryListItem = {
  id: string;
  entryNo: string;
  entryDate: string;
  description: string;
  sourceType: string;
  sourceId: string;
  status: 'draft' | 'posted' | 'cancelled' | string;
};

export type JournalEntryLine = {
  id: string;
  accountId: string;
  accountCode?: string;
  accountNameAr?: string;
  accountNameEn?: string;
  description: string;
  debit: number;
  credit: number;
};

export type JournalEntryDetail = {
  id: string;
  entryNo: string;
  entryDate: string;
  description: string;
  sourceType: string;
  sourceId: string;
  status: 'draft' | 'posted' | 'cancelled' | string;
  lines: JournalEntryLine[];
  totals?: {
    debit: number;
    credit: number;
    balanced?: boolean;
  };
};

export const accountingApi = {
  accounts: () => http<{ accounts: AccountingAccount[] }>('/api/accounting/accounts'),
  settings: () => http<{ settings: Record<string, unknown> | null }>('/api/accounting/settings'),
  journalEntries: (query: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || String(value).trim() === '') continue;
      search.set(key, String(value));
    }
    const suffix = search.toString();
    return http<{ entries: JournalEntryListItem[]; pagination: Record<string, unknown> }>(`/api/accounting/journal-entries${suffix ? `?${suffix}` : ''}`);
  },
  journalEntry: (id: string) => http<{ entry: JournalEntryDetail }>(`/api/accounting/journal-entries/${encodeURIComponent(id)}`),
};

