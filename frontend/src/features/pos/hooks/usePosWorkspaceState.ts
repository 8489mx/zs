import { useState } from 'react';
import { loadPosWorkspaceStorage } from '@/features/pos/lib/pos.persistence';
import type { PosItem, PosPriceType } from '@/features/pos/types/pos.types';
import type { Sale } from '@/types/domain';
import type { PaymentChannel, PaymentType, PosProductFilter } from '@/features/pos/hooks/usePosWorkspace';

export function usePosWorkspaceState() {
  const persistedState = loadPosWorkspaceStorage();
  const storedDraft = persistedState.draft;

  const [search, setSearch] = useState(storedDraft?.search || '');
  const [customerId, setCustomerId] = useState(storedDraft?.customerId || '');
  const [discount, setDiscount] = useState(Number(storedDraft?.discount || 0));
  const [cashAmount, setCashAmount] = useState(Number(storedDraft?.cashAmount ?? (storedDraft?.paymentChannel === 'cash' ? storedDraft?.paidAmount || 0 : 0)));
  const [cardAmount, setCardAmount] = useState(Number(storedDraft?.cardAmount ?? (storedDraft?.paymentChannel === 'card' ? storedDraft?.paidAmount || 0 : 0)));
  const [paymentType, setPaymentType] = useState<PaymentType>(storedDraft?.paymentType || 'cash');
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>(storedDraft?.paymentChannel || 'cash');
  const [note, setNote] = useState(storedDraft?.note || '');
  const [cart, setCart] = useState<PosItem[]>(storedDraft?.cart || []);
  const [selectedLineKey, setSelectedLineKey] = useState((storedDraft?.cart || [])[0]?.lineKey || '');
  const [priceType, setPriceType] = useState<PosPriceType>(storedDraft?.priceType || 'retail');
  const [branchId, setBranchId] = useState(storedDraft?.branchId || '');
  const [locationId, setLocationId] = useState(storedDraft?.locationId || '');
  const [productFilter, setProductFilter] = useState<PosProductFilter>('all');
  const [submitMessage, setSubmitMessage] = useState('');
  const [recentProductIds, setRecentProductIds] = useState<string[]>(persistedState.recentProductIds);
  const [quickCustomerName, setQuickCustomerName] = useState('');
  const [quickCustomerPhone, setQuickCustomerPhone] = useState('');
  const [lastSale, setLastSale] = useState<Sale | null>(persistedState.lastSale);
  const [quickAddCode, setQuickAddCode] = useState('');
  const [scannerMessage, setScannerMessage] = useState('');
  const [lastAddedLineKey, setLastAddedLineKey] = useState('');
  const [postSaleSaleKey, setPostSaleSaleKey] = useState('');
  const [barcodeFocusTick, setBarcodeFocusTick] = useState(0);

  return {
    persistedState,
    search,
    setSearch,
    customerId,
    setCustomerId,
    discount,
    setDiscount,
    cashAmount,
    setCashAmount,
    cardAmount,
    setCardAmount,
    paymentType,
    setPaymentType,
    paymentChannel,
    setPaymentChannel,
    note,
    setNote,
    cart,
    setCart,
    selectedLineKey,
    setSelectedLineKey,
    priceType,
    setPriceType,
    branchId,
    setBranchId,
    locationId,
    setLocationId,
    productFilter,
    setProductFilter,
    submitMessage,
    setSubmitMessage,
    recentProductIds,
    setRecentProductIds,
    quickCustomerName,
    setQuickCustomerName,
    quickCustomerPhone,
    setQuickCustomerPhone,
    lastSale,
    setLastSale,
    quickAddCode,
    setQuickAddCode,
    scannerMessage,
    setScannerMessage,
    lastAddedLineKey,
    setLastAddedLineKey,
    postSaleSaleKey,
    setPostSaleSaleKey,
    barcodeFocusTick,
    requestBarcodeFocus: () => setBarcodeFocusTick((current) => current + 1),
  };
}
