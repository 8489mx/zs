import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import type { PosWorkspaceState } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';
import {
  PosCheckoutCustomerSection,
  PosCheckoutPaymentSection,
  type PaymentPreset,
} from '@/features/pos/components/pos-workspace/PosCheckoutDialogSections';
import { useAuthStore, isAdminUser } from '@/stores/auth-store';

interface PosCheckoutDialogProps {
  open: boolean;
  pos: PosWorkspaceState;
  selectedCustomerName: string;
  onClose: () => void;
  onConfirmSale: (managerPin?: string) => void;
}

export function PosCheckoutDialog({ open, pos, selectedCustomerName, onClose, onConfirmSale }: PosCheckoutDialogProps) {
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [managerApprovalOpen, setManagerApprovalOpen] = useState(false);
  const [managerPinDraft, setManagerPinDraft] = useState('');
  const [managerPinError, setManagerPinError] = useState('');
  const cashAmountInputRef = useRef<HTMLInputElement | null>(null);
  const managerPinInputRef = useRef<HTMLInputElement | null>(null);
  const approvedManagerPinRef = useRef('');
  const openedOnceRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const createSalePendingRef = useRef(Boolean(pos.createSale.isPending));
  
  const { user } = useAuthStore();
  const isAdmin = isAdminUser(user);
  const isDiscountLocked = !pos.canApplyDiscount && !isAdmin;

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { createSalePendingRef.current = Boolean(pos.createSale.isPending); }, [pos.createSale.isPending]);

  const stableOnClose = useCallback(() => { onCloseRef.current(); }, []);
  const clearInlineManagerApproval = useCallback(() => {
    setManagerApprovalOpen(false);
    setManagerPinDraft('');
    setManagerPinError('');
  }, []);
  const handleDialogClose = useCallback(() => {
    if (createSalePendingRef.current) return;
    clearInlineManagerApproval();
    stableOnClose();
  }, [clearInlineManagerApproval, stableOnClose]);
  const handleConfirmSale = useCallback(() => {
    const managerPin = approvedManagerPinRef.current || undefined;
    onConfirmSale(managerPin);
  }, [onConfirmSale]);

  const handleInlineManagerApproval = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const managerPin = String(managerPinDraft || '').trim();
    setManagerPinError('');
    if (!managerPin) {
      setManagerPinError('اكتب PIN المدير أولًا.');
      managerPinInputRef.current?.focus();
      return;
    }
    try {
      await pos.discountAuthorizationMutation.mutateAsync(managerPin);
      approvedManagerPinRef.current = managerPin;
      pos.setDiscountApprovalGranted(true);
      pos.setDiscountApprovalSecret('');
      setManagerPinDraft('');
      setManagerApprovalOpen(false);
      pos.setSubmitMessage('تم اعتماد الخصم لهذه الفاتورة فقط.');
    } catch (error) {
      approvedManagerPinRef.current = '';
      pos.setDiscountApprovalSecret('');
      setManagerPinDraft('');
      setManagerPinError(getErrorMessage(error, 'تعذر اعتماد الخصم.'));
      managerPinInputRef.current?.focus();
    }
  }, [managerPinDraft, pos]);

  useEffect(() => {
    if (!open) {
      openedOnceRef.current = false;
      clearInlineManagerApproval();
      return;
    }
    if (openedOnceRef.current) return;
    openedOnceRef.current = true;
    const frameId = window.requestAnimationFrame(() => {
      if (customerPickerOpen || managerApprovalOpen) return;
      cashAmountInputRef.current?.focus();
      cashAmountInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [clearInlineManagerApproval, customerPickerOpen, managerApprovalOpen, open]);

  useEffect(() => {
    if (!pos.discountApprovalGranted) approvedManagerPinRef.current = '';
    if (!isDiscountLocked) clearInlineManagerApproval();
  }, [clearInlineManagerApproval, isDiscountLocked, pos.discountApprovalGranted]);

  useEffect(() => {
    if (!managerApprovalOpen || pos.discountApprovalGranted) return;
    const frameId = window.requestAnimationFrame(() => {
      managerPinInputRef.current?.focus();
      managerPinInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [managerApprovalOpen, pos.discountApprovalGranted]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'F2') return;
      event.preventDefault();
      event.stopPropagation();
      if (pos.createSale.isPending) return;
      if (managerApprovalOpen && !pos.discountApprovalGranted) {
        void handleInlineManagerApproval();
        return;
      }
      if (pos.canSubmitSale) handleConfirmSale();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleConfirmSale, handleInlineManagerApproval, managerApprovalOpen, open, pos.canSubmitSale, pos.createSale.isPending, pos.discountApprovalGranted]);

  const customers = useMemo(() => (Array.isArray(pos.customersQuery.data) ? pos.customersQuery.data : []), [pos.customersQuery.data]);
  const selectedCustomer = useMemo(
    () => customers.find((customer) => String(customer.id) === String(pos.customerId)) || null,
    [pos.customerId, customers],
  );
  const filteredCustomers = useMemo(() => {
    const query = customerQuery.trim().toLowerCase();
    if (!query) return customers.slice(0, 40);
    return customers.filter((customer) => (
      customer.name.toLowerCase().includes(query) || String(customer.phone || '').toLowerCase().includes(query)
    )).slice(0, 40);
  }, [customerQuery, customers]);
  const piecesCount = useMemo(() => pos.cart.reduce((sum, item) => sum + Number(item.qty || 0), 0), [pos.cart]);
  const itemsCount = pos.cart.length;

  async function handleQuickCustomerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await pos.handleQuickCustomerSubmit(event);
  }
  function isPaymentActive(preset: PaymentPreset) {
    if (preset === 'credit') return pos.paymentType === 'credit';
    if (pos.paymentType === 'credit') return false;
    return pos.paymentChannel === preset;
  }

  if (!open) return null;

  return (
    <DialogShell open={open} onClose={handleDialogClose} width="min(980px, calc(100vw - 32px))" zIndex={86} ariaLabel="مراجعة وإتمام البيع">
      <Card title="مراجعة وإتمام البيع" className="dialog-card pos-checkout-dialog-card">
        <div className="pos-checkout-dialog">
          <section className="pos-checkout-dialog-section pos-checkout-summary-section">
            <div className="pos-checkout-section-head"><h4>ملخص الفاتورة</h4><span className="muted small">راجع الإجمالي قبل تأكيد البيع</span></div>
            <div className="pos-checkout-dialog-summary pos-checkout-dialog-summary-main">
              <div className="pos-checkout-dialog-chip"><span>عدد العناصر</span><strong>{itemsCount}</strong></div>
              <div className="pos-checkout-dialog-chip"><span>عدد القطع</span><strong>{piecesCount}</strong></div>
              <div className="pos-checkout-dialog-chip is-total"><span>المطلوب دفعه</span><strong className="is-primary">{formatCurrency(pos.totals.total)}</strong></div>
            </div>
          </section>

          <PosCheckoutCustomerSection
            pos={pos}
            selectedCustomerName={selectedCustomerName}
            selectedCustomer={selectedCustomer}
            filteredCustomers={filteredCustomers}
            customerPickerOpen={customerPickerOpen}
            customerQuery={customerQuery}
            onCustomerPickerOpenChange={setCustomerPickerOpen}
            onCustomerQueryChange={setCustomerQuery}
            onQuickCustomerSubmit={(event) => { void handleQuickCustomerSubmit(event); }}
          />

          <PosCheckoutPaymentSection
            pos={pos}
            cashAmountInputRef={cashAmountInputRef}
            managerPinInputRef={managerPinInputRef}
            customerPickerOpen={customerPickerOpen}
            managerApprovalOpen={managerApprovalOpen}
            managerPinDraft={managerPinDraft}
            managerPinError={managerPinError}
            isDiscountLocked={isDiscountLocked}
            approvedManagerPinRef={approvedManagerPinRef}
            onManagerApprovalOpenChange={setManagerApprovalOpen}
            onManagerPinDraftChange={setManagerPinDraft}
            onManagerPinErrorChange={setManagerPinError}
            onInlineManagerApproval={(event) => { void handleInlineManagerApproval(event); }}
            isPaymentActive={isPaymentActive}
            onSelectPaymentPreset={(preset) => pos.setPaymentPreset(preset)}
          />

          <section className="pos-checkout-dialog-section">
            <h4>ملاحظات الفاتورة</h4>
            <label className="field field-wide">
              <input value={pos.note} onChange={(event) => pos.setNote(event.target.value)} placeholder="ملاحظات اختيارية" disabled={pos.createSale.isPending} />
            </label>
          </section>

          <div className="actions compact-actions pos-checkout-dialog-actions">
            <Button type="button" variant="secondary" onClick={handleDialogClose} disabled={pos.createSale.isPending}>رجوع للسلة</Button>
            <Button type="button" variant="success" onClick={handleConfirmSale} disabled={pos.createSale.isPending || !pos.canSubmitSale}>
              {pos.createSale.isPending ? 'جاري الحفظ...' : 'تأكيد البيع (F2)'}
            </Button>
          </div>
        </div>
      </Card>
    </DialogShell>
  );
}
