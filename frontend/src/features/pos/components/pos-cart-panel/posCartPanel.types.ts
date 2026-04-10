import type { FormEvent } from 'react';
import type { Branch, Customer, Location } from '@/types/domain';
import type { PosItem } from '@/features/pos/types/pos.types';

export type PaymentType = 'cash' | 'credit';
export type PaymentChannel = 'cash' | 'card' | 'credit' | 'mixed';

export interface HeldPosDraftSummary {
  id: string;
  label: string;
  total: number;
  itemsCount: number;
}

export interface PosCartPanelProps {
  cart: PosItem[];
  customers: Customer[];
  branches: Branch[];
  locations: Location[];
  customerId: string;
  branchId: string;
  locationId: string;
  paymentType: PaymentType;
  paymentChannel: PaymentChannel;
  paidAmount: number;
  cashAmount: number;
  cardAmount: number;
  discount: number;
  note: string;
  submitMessage: string;
  lastSaleDocNo?: string;
  canShowLastSaleActions?: boolean;
  quickCustomerName: string;
  quickCustomerPhone: string;
  isQuickCustomerPending: boolean;
  heldDrafts: HeldPosDraftSummary[];
  isError: boolean;
  isPending: boolean;
  totals: { subTotal: number; taxAmount: number; total: number };
  changeAmount: number;
  amountDue: number;
  hasOpenShift: boolean;
  canSubmitSale: boolean;
  canSubmitHint: string;
  lastAddedLineKey?: string;
  onCustomerChange: (value: string) => void;
  onQuickCustomerNameChange: (value: string) => void;
  onQuickCustomerPhoneChange: (value: string) => void;
  onQuickCustomerSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBranchChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onPaymentTypeChange: (value: PaymentType) => void;
  onCashAmountChange: (value: number) => void;
  onCardAmountChange: (value: number) => void;
  onDiscountChange: (value: number) => void;
  onNoteChange: (value: string) => void;
  onQtyChange: (lineKey: string, qty: number) => void;
  onRemoveItem: (lineKey: string) => void;
  onFillPaidAmount: () => void;
  onHoldDraft: () => void;
  onRecallDraft: (draftId: string) => void;
  onDeleteDraft: (draftId: string) => void;
  onClearHeldDrafts: () => void;
  onResetDraft: () => void;
  onPrintPreview: () => void;
  onReprintLastSale: () => void;
  onCopyLastSaleSummary: () => void;
  onExportHeldDrafts: () => void;
  onSubmit: () => void;
}
