import { http } from '@/lib/http';

export interface CurrencyItem {
  id: string;
  code: string;
  name: string;
  exchangeRate: number;
  isBase: boolean;
  symbol?: string;
  updatedAt?: string;
}

export interface ForexRevaluationPreviewLine {
  accountId: number;
  accountCode: string;
  accountName: string;
  foreignBalance: number;
  bookLocalValue: number;
  revaluedLocalValue: number;
  unrealizedDifference: number;
}

export interface ForexRevaluationPreview {
  periodDate: string;
  currencyCode: string;
  bookRate: number;
  closingRate: number;
  totalForeignBalance: number;
  netUnrealizedGainLoss: number;
  lines: ForexRevaluationPreviewLine[];
}

export interface ForexRevaluationRun {
  id: string;
  period_date: string;
  currency_code: string;
  book_exchange_rate: number;
  closing_exchange_rate: number;
  foreign_balance_total: number;
  unrealized_gain_loss: number;
  journal_entry_id: number | null;
  journal_entry_no: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export const forexApi = {
  listCurrencies: () =>
    http<{ currencies: CurrencyItem[] }>('/api/accounting/currencies'),

  upsertCurrency: (data: { currencyCode: string; currencyName: string; exchangeRate: number; isBase?: boolean; symbol?: string }) =>
    http<{ ok: boolean; currency: any }>('/api/accounting/currencies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listRuns: () =>
    http<ForexRevaluationRun[]>('/api/accounting/currencies/revaluations'),

  getRunDetails: (id: string) =>
    http<{ run: ForexRevaluationRun; lines: any[] }>(`/api/accounting/currencies/revaluations/${id}`),

  previewRevaluation: (data: { periodDate: string; currencyCode: string; closingRate: number }) =>
    http<ForexRevaluationPreview>('/api/accounting/currencies/revaluations/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  executeRevaluation: (data: { periodDate: string; currencyCode: string; closingRate: number; notes?: string }) =>
    http<{ ok: boolean; runId: string; journalEntryNo: string; netUnrealizedGainLoss: number; totalForeignBalance: number; linesCount: number }>(
      '/api/accounting/currencies/revaluations/execute',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),
};
