import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PosSaleSuccessDialog } from './PosSaleSuccessDialog';
import type { Sale } from '@/types/domain';

const sale = {
  id: 'sale-1',
  docNo: 'S-100',
  customerId: 'cust-1',
  customerName: 'أحمد علي',
  paymentType: 'cash',
  paymentChannel: 'cash',
  total: 120,
  paidAmount: 150,
  items: [],
  payments: [],
} as unknown as Sale;

function renderDialog(overrides: Partial<Parameters<typeof PosSaleSuccessDialog>[0]> = {}) {
  return render(
    <MemoryRouter>
      <PosSaleSuccessDialog
        open
        sale={sale}
        customer={{ id: 'cust-1', name: 'أحمد علي', phone: '01000000001', address: '', balance: 0, type: 'vip', creditLimit: 0, storeCreditBalance: 0 }}
        settings={{ storeName: 'متجر تجريبي' }}
        onClose={vi.fn()}
        onNewSale={vi.fn()}
        onPrintReceipt={vi.fn()}
        onPrintA4={vi.fn()}
        {...overrides}
      />
    </MemoryRouter>,
  );
}

describe('PosSaleSuccessDialog', () => {
  it('shows sale success details and print hint', () => {
    renderDialog();

    expect(screen.getByText('تم البيع بنجاح')).toBeInTheDocument();
    expect(screen.getAllByText('S-100').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'طباعة الريسيت F2' })).toBeInTheDocument();
  });

  it('uses the selected customer phone for WhatsApp', async () => {
    const user = userEvent.setup();
    const openMock = vi.spyOn(window, 'open').mockImplementation(() => null);

    renderDialog();

    await user.click(screen.getByRole('button', { name: 'إرسال واتساب F8' }));

    expect(openMock).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/01000000001'), '_blank', 'noopener,noreferrer');
    expect(openMock).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent('S-100')), '_blank', 'noopener,noreferrer');
    openMock.mockRestore();
  });

  it('shows phone input when no customer phone exists and sends once', async () => {
    const user = userEvent.setup();
    const openMock = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderDialog({
      customer: { id: 'cust-1', name: 'أحمد علي', phone: '', address: '', balance: 0, type: 'cash', creditLimit: 0, storeCreditBalance: 0 },
    });

    expect(screen.getByLabelText('رقم الهاتف')).toBeInTheDocument();
    await user.type(screen.getByLabelText('رقم الهاتف'), '01234567890');
    await user.click(screen.getByRole('button', { name: 'إرسال مرة واحدة F8' }));

    expect(openMock).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/01234567890'), '_blank', 'noopener,noreferrer');
    openMock.mockRestore();
  });
});
