import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PosCartMetaForm } from './PosCartMetaForm';
import { createTestQueryClient } from '@/test/test-query-client';
import type { Customer } from '@/types/domain';

const { customerPosSummaryMock } = vi.hoisted(() => ({
  customerPosSummaryMock: vi.fn(),
}));

vi.mock('@/features/pos/api/pos.api', () => ({
  posApi: {
    customerPosSummary: customerPosSummaryMock,
  },
}));

const customers: Customer[] = [
  {
    id: '101',
    name: 'أحمد علي',
    phone: '01000000001',
    address: '',
    balance: 900,
    type: 'vip',
    creditLimit: 1000,
    storeCreditBalance: 50,
  },
  {
    id: '202',
    name: 'منى حسن',
    phone: '01100000002',
    address: '',
    balance: 0,
    type: 'cash',
    creditLimit: 0,
    storeCreditBalance: 0,
  },
];

function renderMetaForm(initialCustomerId = '') {
  const queryClient = createTestQueryClient();

  function Harness() {
    const [customerId, setCustomerId] = useState(initialCustomerId);
    return (
      <QueryClientProvider client={queryClient}>
        <PosCartMetaForm
          customers={customers}
          customerId={customerId}
          onCustomerChange={setCustomerId}
          branches={[]}
          branchId=""
          onBranchChange={vi.fn()}
          locations={[]}
          locationId=""
          onLocationChange={vi.fn()}
          quickCustomerName=""
          quickCustomerPhone=""
          isQuickCustomerPending={false}
          onQuickCustomerSubmit={vi.fn()}
          onQuickCustomerNameChange={vi.fn()}
          onQuickCustomerPhoneChange={vi.fn()}
        />
      </QueryClientProvider>
    );
  }

  render(<Harness />);
}

describe('PosCartMetaForm customer context', () => {
  beforeEach(() => {
    customerPosSummaryMock.mockResolvedValue({
      customerId: '101',
      balance: 900,
      creditLimit: 1000,
      remainingCredit: 100,
      storeCreditBalance: 50,
      customerType: 'vip',
      lastSaleAt: '2026-04-20T10:00:00.000Z',
      totalSalesAmount: 2500,
      invoiceCount: 5,
      averageInvoice: 500,
      returnCount: 0,
    });
  });

  it('renders with the default cash customer without loading a summary', () => {
    renderMetaForm();

    expect(screen.getByRole('button', { name: /عميل نقدي/ })).toBeInTheDocument();
    expect(customerPosSummaryMock).not.toHaveBeenCalled();
  });

  it('searches and selects a customer by phone, then shows the compact card', async () => {
    const user = userEvent.setup();
    renderMetaForm();

    await user.click(screen.getByRole('button', { name: /عميل نقدي/ }));
    await user.type(screen.getByLabelText('ابحث بالاسم أو الهاتف'), '01000000001');
    await user.click(screen.getByRole('button', { name: /أحمد علي/ }));

    expect(screen.getByLabelText('ملخص العميل المختار')).toBeInTheDocument();
    expect(screen.getByText('رصيد العميل')).toBeInTheDocument();
    expect(screen.getByText('قريب من حد الائتمان')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('إجمالي المشتريات')).toBeInTheDocument());
  });

  it('removes the selected customer back to cash customer', async () => {
    const user = userEvent.setup();
    renderMetaForm('101');

    expect(screen.getByLabelText('ملخص العميل المختار')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'إزالة العميل' }));

    expect(screen.queryByLabelText('ملخص العميل المختار')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /عميل نقدي/ })).toBeInTheDocument();
  });

  it('keeps POS usable when the selected customer summary fails', async () => {
    customerPosSummaryMock.mockRejectedValueOnce(new Error('summary failed'));

    renderMetaForm('101');

    expect(screen.getByLabelText('ملخص العميل المختار')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('تعذر تحميل ملخص العميل، ويمكن إتمام البيع بشكل طبيعي.')).toBeInTheDocument();
    });
  });
});
