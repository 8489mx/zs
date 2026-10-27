import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PosCheckoutExpressSection } from './PosCheckoutExpressSection';

describe('PosCheckoutExpressSection - Cash Input & Change Calculation', () => {
  const createMockPos = (total = 50) => ({
    totals: { total },
    cart: [{ id: 1, name: 'تيشيرت قطن', qty: 1, price: total }],
    settings: { currency: 'EGP' },
    settingsQuery: { data: { currency: 'EGP' } },
    createSale: { isPending: false },
    canSubmitSale: true,
    setTenderedAmount: vi.fn(),
    setTerminalPaymentDetails: vi.fn(),
  });

  it('defaults to exact amount and zero change when cash is selected without typing', () => {
    const mockPos = createMockPos(50);
    const confirmSaleMock = vi.fn();

    render(
      <PosCheckoutExpressSection
        pos={mockPos as any}
        isKwdStore={false}
        isKsaStore={false}
        isPaymentActive={(preset) => preset === 'cash'}
        onSelectPaymentPreset={vi.fn()}
        onConfirmSale={confirmSaleMock}
        onSwitchToDetailed={vi.fn()}
        selectedCustomerName="عميل نقدي"
        onOpenCustomerPicker={vi.fn()}
        onOpenNotes={vi.fn()}
        isNotesOpen={false}
        cartQtySummaries={['1 قطعة']}
      />
    );

    // Exact cash indicator should be shown
    expect(screen.getByText('المبلغ بالضبط')).toBeInTheDocument();
    expect(screen.getByText(/مسدد بالكامل/)).toBeInTheDocument();

    // Confirming sale sends exact total
    const confirmButton = screen.getByRole('button', { name: /تأكيد البيع والطباعة/i });
    fireEvent.click(confirmButton);
    expect(confirmSaleMock).toHaveBeenCalledWith(50);
    expect(mockPos.setTenderedAmount).toHaveBeenCalledWith(50);
  });

  it('calculates change when typing a custom received amount (e.g. 200 for 50 bill)', () => {
    const mockPos = createMockPos(50);
    const confirmSaleMock = vi.fn();

    render(
      <PosCheckoutExpressSection
        pos={mockPos as any}
        isKwdStore={false}
        isKsaStore={false}
        isPaymentActive={(preset) => preset === 'cash'}
        onSelectPaymentPreset={vi.fn()}
        onConfirmSale={confirmSaleMock}
        onSwitchToDetailed={vi.fn()}
        selectedCustomerName="عميل نقدي"
        onOpenCustomerPicker={vi.fn()}
        onOpenNotes={vi.fn()}
        isNotesOpen={false}
        cartQtySummaries={['1 قطعة']}
      />
    );

    const input = screen.getByPlaceholderText('50');
    fireEvent.change(input, { target: { value: '200' } });

    // Change should be 150.00
    expect(screen.getByText('150.00')).toBeInTheDocument();
    expect(screen.getByText(/الباقي للعميل:/)).toBeInTheDocument();
    expect(screen.getByText(/مسح \(استعادة التلقائي\)/)).toBeInTheDocument();

    // Confirming sale passes 200
    const confirmButton = screen.getByRole('button', { name: /تأكيد البيع والطباعة/i });
    fireEvent.click(confirmButton);
    expect(confirmSaleMock).toHaveBeenCalledWith(200);
    expect(mockPos.setTenderedAmount).toHaveBeenCalledWith(200);
  });

  it('clicking a banknote shortcut (e.g. 200) fills the input and calculates change', () => {
    const mockPos = createMockPos(50);
    const confirmSaleMock = vi.fn();

    render(
      <PosCheckoutExpressSection
        pos={mockPos as any}
        isKwdStore={false}
        isKsaStore={false}
        isPaymentActive={(preset) => preset === 'cash'}
        onSelectPaymentPreset={vi.fn()}
        onConfirmSale={confirmSaleMock}
        onSwitchToDetailed={vi.fn()}
        selectedCustomerName="عميل نقدي"
        onOpenCustomerPicker={vi.fn()}
        onOpenNotes={vi.fn()}
        isNotesOpen={false}
        cartQtySummaries={['1 قطعة']}
      />
    );

    const banknote200 = screen.getByRole('button', { name: '200' });
    fireEvent.click(banknote200);

    expect(screen.getByText('150.00')).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: /تأكيد البيع والطباعة/i });
    fireEvent.click(confirmButton);
    expect(confirmSaleMock).toHaveBeenCalledWith(200);
  });

  it('clicking clear resets back to exact amount with 0.00 change', () => {
    const mockPos = createMockPos(50);

    render(
      <PosCheckoutExpressSection
        pos={mockPos as any}
        isKwdStore={false}
        isKsaStore={false}
        isPaymentActive={(preset) => preset === 'cash'}
        onSelectPaymentPreset={vi.fn()}
        onConfirmSale={vi.fn()}
        onSwitchToDetailed={vi.fn()}
        selectedCustomerName="عميل نقدي"
        onOpenCustomerPicker={vi.fn()}
        onOpenNotes={vi.fn()}
        isNotesOpen={false}
        cartQtySummaries={['1 قطعة']}
      />
    );

    const input = screen.getByPlaceholderText('50');
    fireEvent.change(input, { target: { value: '200' } });
    expect(screen.getByText('150.00')).toBeInTheDocument();

    const clearButton = screen.getByText(/مسح \(استعادة التلقائي\)/);
    fireEvent.click(clearButton);

    expect(screen.getByText(/مسدد بالكامل/)).toBeInTheDocument();
  });

  it('prevents K-NET confirm sale when idle and enables it after manual receipt confirmation', () => {
    const mockPos = createMockPos(12);
    const confirmSaleMock = vi.fn();

    render(
      <PosCheckoutExpressSection
        pos={mockPos as any}
        isKwdStore={true}
        isKsaStore={false}
        isPaymentActive={(preset) => preset === 'card'}
        onSelectPaymentPreset={vi.fn()}
        onConfirmSale={confirmSaleMock}
        onSwitchToDetailed={vi.fn()}
        selectedCustomerName="عميل نقدي"
        onOpenCustomerPicker={vi.fn()}
        onOpenNotes={vi.fn()}
        isNotesOpen={false}
        cartQtySummaries={['1 قطعة']}
      />
    );

    // K-NET is active, but button should be disabled initially (no bypass)
    const confirmButton = screen.getByRole('button', { name: /في انتظار دفع كي نت بالماكينة/i });
    expect(confirmButton).toBeDisabled();

    // Click on "إتمام يدوي (ماكينة خارجية)"
    const manualBtn = screen.getByRole('button', { name: /إتمام يدوي \(ماكينة خارجية\)/i });
    fireEvent.click(manualBtn);

    // Manual input card should appear
    const authCodeInput = screen.getByPlaceholderText(/مثال: 392616/i);
    expect(authCodeInput).toBeInTheDocument();

    // Type Auth Code from Kuwait K-NET receipt: 392616
    fireEvent.change(authCodeInput, { target: { value: '392616' } });

    // Click "اعتماد وتفعيل البيع"
    const approveBtn = screen.getByRole('button', { name: /اعتماد وتفعيل البيع/i });
    fireEvent.click(approveBtn);

    // Terminal payment details should be registered with 392616
    expect(mockPos.setTerminalPaymentDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        authCode: '392616',
        cardScheme: 'knet',
      })
    );

    // Confirm button should now be enabled with F2 text
    const readyConfirmBtn = screen.getByRole('button', { name: /تأكيد البيع والطباعة/i });
    expect(readyConfirmBtn).not.toBeDisabled();

    // Clicking confirm sale calls onConfirmSale
    fireEvent.click(readyConfirmBtn);
    expect(confirmSaleMock).toHaveBeenCalled();
  });
});

