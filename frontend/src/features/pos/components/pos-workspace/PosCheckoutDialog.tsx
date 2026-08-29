import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { deliveryRepsApi } from '@/shared/api/delivery-reps.api';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import type { PosWorkspaceState } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';
import {
  PosCheckoutCustomerSection,
  PosCheckoutOrderTypeSection,
  PosCheckoutPaymentSection,
  PosCheckoutDeliverySection,
  type PaymentPreset,
} from '@/features/pos/components/pos-workspace/PosCheckoutDialogSections';
import { useAuthStore, isAdminUser } from '@/stores/auth-store';
import { summarizeCartQuantities } from '@/features/pos/lib/pos.domain';

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
  const [isManualCustomerOpen, setIsManualCustomerOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
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

  let deliveryRepsQuery: any = { data: [] };
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    deliveryRepsQuery = useQuery({ queryKey: ['delivery-reps'], queryFn: deliveryRepsApi.list, staleTime: 5 * 60 * 1000 });
  } catch {}

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
    if (pos.orderType === 'delivery' && (!pos.deliveryRepId || Number(pos.deliveryRepId) <= 0)) {
      pos.setSubmitMessage('⚠️ يرجى اختيار مندوب التوصيل لإتمام فاتورة الدليفري وتسجيل التحصيل عليه.');
      return;
    }
    const managerPin = approvedManagerPinRef.current || undefined;
    onConfirmSale(managerPin);
  }, [onConfirmSale, pos]);

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
    if (!query) return [];
    return customers.filter((customer) => (
      customer.name.toLowerCase().includes(query) || String(customer.phone || '').toLowerCase().includes(query)
    )).slice(0, 40);
  }, [customerQuery, customers]);
  const cartQtySummaries = useMemo(() => {
    return summarizeCartQuantities(pos.cart);
  }, [pos.cart]);
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
    <DialogShell
      open={open}
      onClose={handleDialogClose}
      width="min(980px, calc(100vw - 32px))"
      zIndex={86}
      ariaLabel="مراجعة وإتمام البيع"
      shellClassName="pos-checkout-dialog-shell"
    >
      <Card
        title="مراجعة وإتمام البيع"
        className="dialog-card pos-checkout-dialog-card"
        style={{
          height: 'min(820px, calc(100vh - 24px))',
          minHeight: 'min(820px, calc(100vh - 24px))',
          maxHeight: 'calc(100vh - 24px)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }}
      >
        <div className="pos-checkout-dialog">
          <section className="pos-checkout-dialog-section pos-checkout-summary-section" style={{ padding: 0, border: 'none', background: 'transparent', marginBottom: '2px' }}>
            <div style={{
              display: 'flex',
              gap: '12px',
              background: '#f8fafc',
              padding: '4px 12px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              minHeight: '30px',
              lineHeight: 1
            }}>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>العناصر:</span>
                <strong style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{itemsCount}</strong>
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>الكميات:</span>
                <strong style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{cartQtySummaries.length ? cartQtySummaries.join(' + ') : '0'}</strong>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 700 }}>المطلوب:</span>
                <strong className="is-primary" style={{ fontSize: '15px', fontWeight: 900, color: '#170c5c' }}>{formatCurrency(pos.totals.total)}</strong>
              </div>
            </div>
          </section>

          <PosCheckoutOrderTypeSection
            pos={pos}
            onDeliverySelected={() => setCustomerPickerOpen(true)}
          />

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
            needsCustomer={pos.orderType === 'delivery' || pos.paymentType === 'credit'}
            isManualOpen={isManualCustomerOpen}
            onManualOpen={() => setIsManualCustomerOpen(true)}
          />

          <PosCheckoutDeliverySection
            pos={pos}
            deliveryReps={deliveryRepsQuery.data || []}
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

          <section className="pos-checkout-dialog-section" style={{ padding: 0, marginTop: '2px' }}>
            {!isNotesOpen && !pos.note ? (
              <Button type="button" variant="secondary" onClick={() => setIsNotesOpen(true)} style={{ width: '100%', minHeight: '32px', fontSize: '12px' }}>+ إضافة ملاحظة للفاتورة</Button>
            ) : (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                <input autoFocus={isNotesOpen && !pos.note} value={pos.note} onChange={(event) => pos.setNote(event.target.value)} placeholder="ملاحظات اختيارية على الفاتورة..." disabled={pos.createSale.isPending} style={{ flex: 1, padding: '4px 8px', fontSize: '12px', height: '32px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                <Button type="button" variant="secondary" onClick={() => { setIsNotesOpen(false); pos.setNote(''); }} style={{ flexShrink: 0, height: '32px', padding: '0 8px', fontSize: '11px', borderRadius: '4px' }}>مسح</Button>
              </div>
            )}
          </section>

          {pos.orderType === 'delivery' && (!pos.deliveryRepId || Number(pos.deliveryRepId) <= 0) && (
            <div className="error-box" style={{ margin: '12px 0 0', background: '#fef2f2', border: '1.5px solid #f87171', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span>
              <span>يجب اختيار مندوب التوصيل لإتمام فاتورة الدليفري وتسجيل عهدة التحصيل عليه.</span>
            </div>
          )}

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
