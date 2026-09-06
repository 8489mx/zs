import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SettingsDailyDigestSection } from './SettingsDailyDigestSection';

vi.mock('@/features/settings/api/daily-digest.api', () => ({
  dailyDigestApi: {
    getConfig: vi.fn().mockResolvedValue({
      enabled: true,
      phone: '01018017523',
      timeOfDay: '23:30',
      includeSales: true,
      includeTransfers: true,
      includeShortages: true,
    }),
    saveConfig: vi.fn().mockResolvedValue({ ok: true }),
    sendTest: vi.fn().mockResolvedValue({ success: true }),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('SettingsDailyDigestSection Component', () => {
  it('renders daily digest header, form inputs, and WhatsApp simulator correctly', async () => {
    const Wrapper = createWrapper();
    render(<SettingsDailyDigestSection />, { wrapper: Wrapper });

    // Header & Badge
    expect(screen.getByText('الملخص التنفيذي واللوجستي اليومي للمدير')).toBeInTheDocument();
    expect(screen.getByText('واتساب مجدول')).toBeInTheDocument();
    expect(screen.getByText('حفظ الإعدادات')).toBeInTheDocument();
    expect(screen.getByText('إرسال ملخص تجريبي الآن')).toBeInTheDocument();

    // Form inputs & Checkboxes
    expect(screen.getByText('خيارات الجدولة والإرسال')).toBeInTheDocument();
    expect(screen.getByText('تفعيل التقرير الليلي المجدول')).toBeInTheDocument();
    expect(screen.getByText('بلوك المبيعات والنشاط اليومي')).toBeInTheDocument();
    expect(screen.getByText('بلوك أذون الصرف والإمداد التفصيلية للمحل')).toBeInTheDocument();
    expect(screen.getByText('بلوك نواقص المستودع الحرج')).toBeInTheDocument();

    // WhatsApp simulator
    expect(screen.getByText('معاينة الرسالة الحية على الواتساب')).toBeInTheDocument();
    expect(screen.getByText('بوت الإدارة والملخص اليومي')).toBeInTheDocument();
    expect(screen.getByText('متصل الآن عبر واتساب')).toBeInTheDocument();

    await vi.waitFor(() => {
      const phoneInput = screen.getByPlaceholderText('010XXXXXXXX أو 201XXXXXXXXX') as HTMLInputElement;
      expect(phoneInput.value).toBe('01018017523');
    });
  });

  it('updates live preview when checkboxes are toggled', async () => {
    const Wrapper = createWrapper();
    render(<SettingsDailyDigestSection />, { wrapper: Wrapper });

    await vi.waitFor(() => {
      expect(screen.getByText('المبيعات والإيرادات:')).toBeInTheDocument();
      expect(screen.getByText('أذون الصرف والإمداد للمحل:')).toBeInTheDocument();
      expect(screen.getByText('نواقص المستودع التي تحتاج شراء:')).toBeInTheDocument();
    });

    // Uncheck shortages
    const shortagesCheckbox = screen.getAllByRole('checkbox')[2];
    fireEvent.click(shortagesCheckbox);

    // Verify shortages section is removed from live simulator
    expect(screen.queryByText('نواقص المستودع التي تحتاج شراء:')).not.toBeInTheDocument();
  });
});
