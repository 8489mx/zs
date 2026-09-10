export interface FiscalYearRecord {
  id: number;
  tenant_id: string;
  name: string;
  code: string | null;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed';
  closing_entry_id: number | null;
  net_profit_loss: number;
  total_revenue: number;
  total_expense: number;
  retained_earnings_account_id: number | null;
  closed_at: string | null;
  closed_by: number | null;
  closing_notes: string | null;
  created_at: string;
  updated_at: string;
  closingEntry?: any;
}

export interface FiscalYearsStats {
  totalYears: number;
  openYears: number;
  closedYears: number;
  currentYearId: number | null;
}

export interface FiscalYearAccountBalance {
  id: number;
  code: string;
  name_ar: string;
  name_en: string | null;
  account_type: string;
  balance: number;
  closingDebit: number;
  closingCredit: number;
}

export interface ProposedClosingLine {
  accountId: number;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
}

export interface FiscalYearPreview {
  fiscalYear: FiscalYearRecord;
  unpostedEntriesCount: number;
  canClose: boolean;
  blockReason: string | null;
  totalRevenue: number;
  totalExpense: number;
  netProfitLoss: number;
  isProfit: boolean;
  retainedEarningsAccount: {
    id: number;
    code: string;
    name_ar: string;
  } | null;
  revenueAccounts: FiscalYearAccountBalance[];
  expenseAccounts: FiscalYearAccountBalance[];
  proposedClosingLines: ProposedClosingLine[];
}

export interface CreateFiscalYearPayload {
  name: string;
  code?: string;
  startDate: string;
  endDate: string;
}

export interface CloseFiscalYearPayload {
  retainedEarningsAccountId?: number;
  notes?: string;
}

export interface ReopenFiscalYearPayload {
  reason: string;
}
