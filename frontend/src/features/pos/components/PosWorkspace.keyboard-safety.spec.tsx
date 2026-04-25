import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode, RefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PosWorkspace } from './PosWorkspace';

const testState = vi.hoisted(() => ({
  pos: null as ReturnType<typeof createPosMock> | null,
}));

vi.mock('@/shared/components/query-feedback', () => ({
  QueryFeedback: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/pos/components/PosProductsPanel', () => ({
  PosProductsPanel: ({ searchInputRef }: { searchInputRef?: RefObject<HTMLInputElement | null> }) => (
    <input ref={searchInputRef} aria-label="barcode" />
  ),
}));

vi.mock('@/features/pos/components/pos-workspace/PosWorkspaceHeader', () => ({
  PosWorkspaceHeader: () => <div data-testid="pos-header" />,
}));

vi.mock('@/features/pos/components/pos-workspace/PosWorkspaceDock', () => ({
  PosWorkspaceDock: ({ onResetDraft }: { onResetDraft: () => void }) => (
    <button type="button" onClick={onResetDraft}>dock reset</button>
  ),
}));

vi.mock('@/features/pos/components/pos-workspace/PosWorkspaceStatusCards', () => ({
  PosWorkspaceStartupIssues: () => null,
}));

vi.mock('@/features/pos/hooks/usePosWorkspace', () => ({
  usePosWorkspace: () => testState.pos,
}));

vi.mock('@/features/pos/components/PosCartPanel', async () => {
  const React = await import('react');

  function MockPosCartPanel(props: {
    cart: Array<{ lineKey: string }>;
    onRemoveSelectedItem: () => void;
    onDeleteDraft: (draftId: string) => void;
    onClearHeldDrafts: () => void;
  }) {
    const [customerOpen, setCustomerOpen] = React.useState(false);

    React.useEffect(() => {
      if (!customerOpen) return undefined;
      const closeOnEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') setCustomerOpen(false);
      };
      window.addEventListener('keydown', closeOnEscape);
      return () => window.removeEventListener('keydown', closeOnEscape);
    }, [customerOpen]);

    return (
      <div>
        <span data-testid="cart-count">{props.cart.length}</span>
        <button type="button" onClick={() => setCustomerOpen(true)}>open customer picker</button>
        {customerOpen ? <div role="dialog" aria-modal="true">customer picker</div> : null}
        <button type="button" onClick={props.onRemoveSelectedItem}>delete selected line</button>
        <button type="button" onClick={() => props.onDeleteDraft('held-1')}>delete held</button>
        <button type="button" onClick={props.onClearHeldDrafts}>clear held</button>
      </div>
    );
  }

  return { PosCartPanel: MockPosCartPanel };
});

function createPosMock() {
  const product = {
    id: 'p1',
    name: 'Tea',
    retailPrice: 10,
    wholesalePrice: 8,
    stock: 10,
    units: [],
  };
  const line = {
    lineKey: 'p1::piece::retail',
    productId: 'p1',
    name: 'Tea',
    qty: 1,
    price: 10,
    unitName: 'piece',
    priceType: 'retail',
  };

  return {
    search: '',
    setSearch: vi.fn(),
    customerId: '',
    setCustomerId: vi.fn(),
    discount: 0,
    setDiscount: vi.fn(),
    discountApprovalGranted: false,
    setDiscountApprovalGranted: vi.fn(),
    discountApprovalSecret: '',
    setDiscountApprovalSecret: vi.fn(),
    paidAmount: 10,
    cashAmount: 10,
    setCashAmount: vi.fn(),
    cardAmount: 0,
    setCardAmount: vi.fn(),
    paymentType: 'cash',
    setPaymentType: vi.fn(),
    paymentChannel: 'cash',
    setPaymentChannel: vi.fn(),
    note: '',
    setNote: vi.fn(),
    cart: [line],
    setCart: vi.fn(),
    selectedLineKey: line.lineKey,
    setSelectedLineKey: vi.fn(),
    priceType: 'retail',
    setPriceType: vi.fn(),
    branchId: '',
    setBranchId: vi.fn(),
    locationId: '',
    setLocationId: vi.fn(),
    productFilter: 'all',
    setProductFilter: vi.fn(),
    submitMessage: '',
    setSubmitMessage: vi.fn(),
    heldDrafts: [],
    heldDraftSummaries: [{ id: 'held-1', label: 'Held #1', total: 10, itemsCount: 1 }],
    recentProductIds: [],
    recentProducts: [],
    quickCustomerName: '',
    setQuickCustomerName: vi.fn(),
    quickCustomerPhone: '',
    setQuickCustomerPhone: vi.fn(),
    lastSale: null,
    quickAddCode: '',
    setQuickAddCode: vi.fn(),
    scannerMessage: '',
    setScannerMessage: vi.fn(),
    lastAddedLineKey: '',
    barcodeFocusTick: 0,
    customersQuery: { isLoading: false, error: null, data: [], refetch: vi.fn() },
    settingsQuery: { isLoading: false, error: null, data: { paperSize: 'receipt' }, refetch: vi.fn() },
    branchesQuery: { isLoading: false, error: null, data: [], refetch: vi.fn() },
    locationsQuery: { isLoading: false, error: null, data: [], refetch: vi.fn() },
    productsQuery: { isLoading: false, error: null, data: [product], refetch: vi.fn() },
    saleProducts: [product],
    filteredSaleProducts: [product],
    createSale: { isError: false, isPending: false },
    quickCustomerMutation: { isPending: false },
    discountAuthorizationMutation: { isPending: false, mutateAsync: vi.fn() },
    refetchCatalogs: vi.fn(),
    totals: { subTotal: 10, taxAmount: 0, total: 10 },
    changeAmount: 0,
    amountDue: 0,
    ownOpenShift: { id: 'shift-1' },
    canApplyDiscount: true,
    hasDiscountPermissionViolation: false,
    hasPricePermissionViolation: false,
    canSubmitSale: true,
    canSubmitHint: '',
    canShowLastSaleActions: false,
    handleQuickAddCodeSubmit: vi.fn(),
    handleAddProduct: vi.fn(),
    selectAdjacentCartLine: vi.fn(),
    removeSelectedItem: vi.fn(),
    removeItem: vi.fn(),
    changeSelectedQty: vi.fn(),
    setQty: vi.fn(),
    editSelectedQty: vi.fn(),
    holdDraft: vi.fn(),
    recallDraft: vi.fn(),
    deleteDraft: vi.fn().mockResolvedValue(undefined),
    clearHeldDrafts: vi.fn().mockResolvedValue(undefined),
    resetPosDraft: vi.fn(),
    fillPaidAmount: vi.fn(),
    setPaymentPreset: vi.fn(),
    handleQuickCustomerSubmit: vi.fn(),
    handleSubmit: vi.fn(),
    printReceiptNow: vi.fn(),
    printA4Now: vi.fn(),
    reprintLastSale: vi.fn(),
    exportPdfNow: vi.fn(),
    exportHeldDrafts: vi.fn(),
  };
}

describe('POS workspace destructive keyboard safety', () => {
  beforeEach(() => {
    testState.pos = createPosMock();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('does not clear the cart when Escape closes the customer picker layer', async () => {
    render(<PosWorkspace />);

    fireEvent.click(screen.getByRole('button', { name: 'open customer picker' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('customer picker');

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(testState.pos?.resetPosDraft).not.toHaveBeenCalled();
    expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
  });

  it('asks for confirmation instead of clearing immediately on Escape with cart items', () => {
    render(<PosWorkspace />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.getByText('هل تريد تفريغ الفاتورة الحالية؟')).toBeInTheDocument();
    expect(testState.pos?.resetPosDraft).not.toHaveBeenCalled();
  });

  it('cancels the clear-cart confirmation when Escape is pressed inside it', async () => {
    render(<PosWorkspace />);

    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByText('هل تريد تفريغ الفاتورة الحالية؟')).not.toBeInTheDocument());
    expect(testState.pos?.resetPosDraft).not.toHaveBeenCalled();
  });

  it('keeps Delete line removal possible behind a confirmation', async () => {
    render(<PosWorkspace />);

    fireEvent.keyDown(window, { key: 'Delete' });

    expect(screen.getByText('تأكيد حذف البند')).toBeInTheDocument();
    expect(testState.pos?.removeItem).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'حذف' }));

    await waitFor(() => expect(testState.pos?.removeItem).toHaveBeenCalledWith('p1::piece::retail'));
  });

  it('confirms held-sale delete and requires a stronger clear-all confirmation', async () => {
    render(<PosWorkspace />);

    fireEvent.click(screen.getByRole('button', { name: 'delete held' }));
    expect(screen.getByText('تأكيد حذف الفاتورة المعلقة')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'حذف' }));
    await waitFor(() => expect(testState.pos?.deleteDraft).toHaveBeenCalledWith('held-1'));

    fireEvent.click(screen.getByRole('button', { name: 'clear held' }));
    expect(screen.getByText('تأكيد حذف كل الفواتير المعلقة')).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: 'حذف' });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('حذف الكل'), { target: { value: 'حذف الكل' } });
    fireEvent.click(confirmButton);

    await waitFor(() => expect(testState.pos?.clearHeldDrafts).toHaveBeenCalledTimes(1));
  });
});
