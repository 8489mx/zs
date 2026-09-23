export interface CloseFiscalPeriodDto {
  notes?: string;
}

export interface ReopenFiscalPeriodDto {
  reason: string;
}

export interface FiscalPeriodResponse {
  id: number;
  tenant_id: string;
  fiscal_year_id: number;
  period_number: number;
  name: string;
  code: string | null;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed';
  closed_at: string | null;
  closed_by: number | null;
  closing_notes: string | null;
  created_at: string;
  updated_at: string;
}
