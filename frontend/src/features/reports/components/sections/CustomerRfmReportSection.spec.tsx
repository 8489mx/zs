import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomerRfmReportSection } from './CustomerRfmReportSection';
import { createTestQueryClient } from '@/test/test-query-client';

const mockDownloadExcelFile = vi.fn();
vi.mock('@/lib/browser', () => ({
  downloadExcelFile: (...args: any[]) => mockDownloadExcelFile(...args),
}));

const { mockRfmResponse } = vi.hoisted(() => ({
  mockRfmResponse: {
    summary: {
      totalCustomers: 2,
      championsCount: 1,
      loyalCount: 0,
      promisingCount: 0,
      atRiskCount: 1,
      lostCount: 0,
      totalRevenue: 5500,
      averageAov: 1100,
      repeatRate: 50,
    },
    items: [
      {
        id: 'c1',
        name: 'أحمد محمود',
        phone: '01011112222',
        balance: 0,
        loyaltyPoints: 120,
        frequency: 5,
        monetary: 4500,
        recencyDays: 5,
        lastSaleDate: '2026-08-30T10:00:00Z',
        aov: 900,
        segment: 'champions' as const,
      },
      {
        id: 'c2',
        name: 'محمود علي',
        phone: '01122223333',
        balance: 200,
        loyaltyPoints: 20,
        frequency: 2,
        monetary: 1000,
        recencyDays: 75,
        lastSaleDate: '2026-06-20T10:00:00Z',
        aov: 500,
        segment: 'at_risk' as const,
      },
    ],
  },
}));

vi.mock('@/features/reports/api/reports.api', () => ({
  reportsApi: {
    customerRfm: vi.fn().mockImplementation(() => Promise.resolve(mockRfmResponse)),
  },
}));

describe('CustomerRfmReportSection', () => {
  it('renders RFM metrics and customer rows', async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <CustomerRfmReportSection />
      </QueryClientProvider>
    );

    expect(await screen.findByText(/تحليل سلوك العملاء ومصفوفة الولاء/)).toBeDefined();
    expect(screen.getByText('أحمد محمود')).toBeDefined();
    expect(screen.getByText('محمود علي')).toBeDefined();
  });

  it('triggers Excel download on click', async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <CustomerRfmReportSection />
      </QueryClientProvider>
    );

    const exportBtn = await screen.findByText(/تصدير بيانات الحملات/);
    fireEvent.click(exportBtn);
    expect(mockDownloadExcelFile).toHaveBeenCalled();
  });
});
