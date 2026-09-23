import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FiscalPeriodsModal } from '@/features/accounting/components/fiscal-years/FiscalPeriodsModal';
import type { FiscalPeriodRecord, FiscalYearRecord } from '@/features/accounting/types/fiscal-years.types';

const { listPeriodsMock, generatePeriodsMock, closePeriodMock, reopenPeriodMock } = vi.hoisted(() => ({
  listPeriodsMock: vi.fn(),
  generatePeriodsMock: vi.fn(),
  closePeriodMock: vi.fn(),
  reopenPeriodMock: vi.fn(),
}));

vi.mock('@/features/accounting/api/fiscal-years.api', () => ({
  fiscalYearsApi: {
    listPeriods: listPeriodsMock,
    generatePeriods: generatePeriodsMock,
    closePeriod: closePeriodMock,
    reopenPeriod: reopenPeriodMock,
  },
}));

const FISCAL_YEAR: FiscalYearRecord = {
  id: 7,
  tenant_id: 't1',
  name: 'السنة المالية 2025',
  code: 'FY2025',
  start_date: '2025-01-01',
  end_date: '2025-12-31',
  status: 'open',
  closing_entry_id: null,
  net_profit_loss: 0,
  total_revenue: 0,
  total_expense: 0,
  retained_earnings_account_id: null,
  closed_at: null,
  closed_by: null,
  closing_notes: null,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
};

function period(overrides: Partial<FiscalPeriodRecord> & { id: number; period_number: number; name: string }): FiscalPeriodRecord {
  return {
    tenant_id: 't1',
    fiscal_year_id: 7,
    code: `2025-${String(overrides.period_number).padStart(2, '0')}`,
    start_date: '2025-01-01',
    end_date: '2025-01-31',
    status: 'open',
    closed_at: null,
    closed_by: null,
    closing_notes: null,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderModal(onNotice = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  const view = render(
    <FiscalPeriodsModal fiscalYear={FISCAL_YEAR} onClose={vi.fn()} onNotice={onNotice} />,
    { wrapper: Wrapper },
  );
  return { ...view, onNotice };
}

describe('FiscalPeriodsModal', () => {
  beforeEach(() => {
    listPeriodsMock.mockReset();
    generatePeriodsMock.mockReset();
    closePeriodMock.mockReset();
    reopenPeriodMock.mockReset();
  });

  it('shows each month with its closing state', async () => {
    listPeriodsMock.mockResolvedValue([
      period({ id: 1, period_number: 1, name: 'يناير 2025', status: 'closed', closed_at: '2025-02-01T00:00:00.000Z' }),
      period({ id: 2, period_number: 2, name: 'فبراير 2025', start_date: '2025-02-01', end_date: '2025-02-28' }),
    ]);

    renderModal();

    expect(await screen.findByText('يناير 2025')).toBeInTheDocument();
    expect(screen.getByText('فبراير 2025')).toBeInTheDocument();
    expect(screen.getByText('مقفلة ومجمدة')).toBeInTheDocument();
    expect(screen.getByText('مفتوحة نشطة')).toBeInTheDocument();
    expect(generatePeriodsMock).not.toHaveBeenCalled();
  });

  /**
   * قراءة الفترات صارت قراءة بحتة على السيرفر (نمط O33)، فالسنوات القديمة بلا فترات تحتاج نداء
   * كتابة صريحاً. **مرة واحدة**: لو أعاد السيرفر قائمة فارغة مرة أخرى فلا يجوز أن تدور النافذة
   * في حلقة توليد لا تنتهي.
   */
  it('generates the periods once for a year that has none, and does not loop', async () => {
    listPeriodsMock.mockResolvedValue([]);
    generatePeriodsMock.mockResolvedValue([]);

    renderModal();

    await waitFor(() => expect(generatePeriodsMock).toHaveBeenCalledTimes(1));
    expect(generatePeriodsMock).toHaveBeenCalledWith(7);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(generatePeriodsMock).toHaveBeenCalledTimes(1);
  });

  it('closes a month with the notes the user typed', async () => {
    listPeriodsMock.mockResolvedValue([period({ id: 1, period_number: 1, name: 'يناير 2025' })]);
    closePeriodMock.mockResolvedValue({ success: true, message: 'تم إقفال الفترة بنجاح.' });
    const user = userEvent.setup();
    const { onNotice } = renderModal();

    await user.click(await screen.findByRole('button', { name: /إقفال الشهر/ }));
    await user.type(screen.getByPlaceholderText(/ملاحظات الإقفال/), 'بعد مراجعة المحاسب');
    await user.click(screen.getByRole('button', { name: /تأكيد الإقفال وتجميد الشهر/ }));

    await waitFor(() => {
      expect(closePeriodMock).toHaveBeenCalledWith(1, { notes: 'بعد مراجعة المحاسب' });
    });
    expect(onNotice).toHaveBeenCalledWith('تم إقفال الفترة بنجاح.');
  });

  /** FP-4: إعادة الفتح بلا سبب مدوَّن ليست إعادة فتح — هي ثغرة في أثر التدقيق. */
  it('will not reopen a month until a reason is written', async () => {
    listPeriodsMock.mockResolvedValue([
      period({ id: 1, period_number: 1, name: 'يناير 2025', status: 'closed', closed_at: '2025-02-01T00:00:00.000Z' }),
    ]);
    reopenPeriodMock.mockResolvedValue({ success: true, message: 'تم إعادة فتح الفترة بنجاح.' });
    const user = userEvent.setup();
    renderModal();

    await user.click(await screen.findByRole('button', { name: /إعادة فتح/ }));
    const confirm = screen.getByRole('button', { name: /تأكيد إعادة فتح الفترة/ });
    expect(confirm).toBeDisabled();
    expect(reopenPeriodMock).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText(/سبب إعادة فتح الفترة/), 'تصحيح قيد مورد');
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    await waitFor(() => {
      expect(reopenPeriodMock).toHaveBeenCalledWith(1, { reason: 'تصحيح قيد مورد' });
    });
  });

  /** رفض السيرفر (الترتيب الزمني، مسودات معلقة) يجب أن يظهر للمستخدم لا أن يُبتلع. */
  it('surfaces the server refusal instead of swallowing it', async () => {
    listPeriodsMock.mockResolvedValue([
      period({ id: 2, period_number: 2, name: 'فبراير 2025', start_date: '2025-02-01', end_date: '2025-02-28' }),
    ]);
    closePeriodMock.mockRejectedValue(
      new Error('لا يمكن إقفال الفترة [فبراير 2025] قبل إقفال الفترة السابقة [يناير 2025].'),
    );
    const user = userEvent.setup();
    const { onNotice } = renderModal();

    await user.click(await screen.findByRole('button', { name: /إقفال الشهر/ }));
    await user.click(screen.getByRole('button', { name: /تأكيد الإقفال وتجميد الشهر/ }));

    expect(await screen.findByText(/قبل إقفال الفترة السابقة/)).toBeInTheDocument();
    expect(onNotice).not.toHaveBeenCalled();
  });
});
