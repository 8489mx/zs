import { http } from '@/lib/http';
import type {
  FiscalYearRecord,
  FiscalYearsStats,
  FiscalYearPreview,
  CreateFiscalYearPayload,
  CloseFiscalYearPayload,
  ReopenFiscalYearPayload,
  FiscalPeriodRecord,
  CloseFiscalPeriodPayload,
  ReopenFiscalPeriodPayload,
} from '../types/fiscal-years.types';

export const fiscalYearsApi = {
  listFiscalYears: () =>
    http<{ data: FiscalYearRecord[]; stats: FiscalYearsStats }>('/api/accounting/fiscal-years'),

  getFiscalYear: (id: number) =>
    http<FiscalYearRecord>(`/api/accounting/fiscal-years/${id}`),

  createFiscalYear: (payload: CreateFiscalYearPayload) =>
    http<FiscalYearRecord>('/api/accounting/fiscal-years', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  previewClose: (id: number) =>
    http<FiscalYearPreview>(`/api/accounting/fiscal-years/${id}/preview-close`),

  executeClose: (id: number, payload: CloseFiscalYearPayload) =>
    http<{ success: boolean; message: string; closingEntryId: number; netProfitLoss: number; isProfit: boolean }>(
      `/api/accounting/fiscal-years/${id}/close`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),

  reopen: (id: number, payload: ReopenFiscalYearPayload) =>
    http<{ success: boolean; message: string }>(`/api/accounting/fiscal-years/${id}/reopen`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteFiscalYear: (id: number) =>
    http<{ success: boolean; message: string }>(`/api/accounting/fiscal-years/${id}`, {
      method: 'DELETE',
    }),

  listPeriods: (fiscalYearId: number) =>
    http<FiscalPeriodRecord[]>(`/api/accounting/fiscal-years/${fiscalYearId}/periods`),

  // مسار كتابة صريح: قراءة الفترات لا تولّدها (نمط O33).
  generatePeriods: (fiscalYearId: number) =>
    http<FiscalPeriodRecord[]>(`/api/accounting/fiscal-years/${fiscalYearId}/periods/generate`, {
      method: 'POST',
    }),

  closePeriod: (periodId: number, payload?: CloseFiscalPeriodPayload) =>
    http<{ success: boolean; message: string }>(`/api/accounting/fiscal-periods/${periodId}/close`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),

  reopenPeriod: (periodId: number, payload: ReopenFiscalPeriodPayload) =>
    http<{ success: boolean; message: string }>(`/api/accounting/fiscal-periods/${periodId}/reopen`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
