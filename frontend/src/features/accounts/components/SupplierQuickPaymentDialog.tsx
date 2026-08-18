import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { EmptyState } from '@/shared/ui/empty-state';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { accountsApi } from '@/features/accounts/api/accounts.api';
import { supplierBalanceScheduleApi } from '@/features/accounts/api/supplier-balance-schedule.api';
import { formatCurrency, formatWhatsAppNumber } from '@/lib/format';
import { openWhatsApp } from '@/lib/whatsapp';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { SupplierBalanceScheduleCard } from '@/features/accounts/components/SupplierBalanceScheduleCard';
import type { Customer, Supplier } from '@/types/domain';

type QuickPartyTab = 'suppliers' | 'customers';

export function SupplierQuickPaymentDialog() {
  const queryClient = useQueryClient();
  const { data: settings } = useSettingsQuery();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<QuickPartyTab>('suppliers');
  
  // Supplier state
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  // Customer state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerPaymentAmount, setCustomerPaymentAmount] = useState('');
  const [customerPaymentNote, setCustomerPaymentNote] = useState('');
  const [customerSuccessReceipt, setCustomerSuccessReceipt] = useState<{
    customer: Customer;
    amountPaid: number;
    remainingBalance: number;
  } | null>(null);

  const suppliersQuery = useQuery({
    queryKey: [...queryKeys.suppliers, 'debt-lookup'],
    queryFn: () => supplierBalanceScheduleApi.listSuppliersWithDebt(),
    enabled: isOpen && activeTab === 'suppliers',
  });

  const customersQuery = useQuery({
    queryKey: [...queryKeys.customers, 'debt-lookup'],
    queryFn: () => accountsApi.listCustomersWithDebt(),
    enabled: isOpen && activeTab === 'customers',
  });

  const suppliers = useMemo(() => suppliersQuery.data || [], [suppliersQuery.data]);
  const customers = useMemo(() => customersQuery.data || [], [customersQuery.data]);

  const selectedSupplier = useMemo(() => suppliers.find((supplier) => String(supplier.id) === selectedSupplierId) || null, [suppliers, selectedSupplierId]);
  const selectedCustomer = useMemo(() => customers.find((customer) => String(customer.id) === selectedCustomerId) || null, [customers, selectedCustomerId]);

  function resetCustomerFields() {
    setCustomerPaymentAmount('');
    setCustomerPaymentNote('');
    setCustomerSuccessReceipt(null);
  }

  function closeDialog() {
    setIsOpen(false);
    setSelectedSupplierId('');
    setSelectedCustomerId('');
    resetCustomerFields();
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isOpen && (event.key === 'Escape' || event.key === 'Esc')) {
        // If an inner modal inside the card or customer receipt is open, let the inner modal handle Escape first
        if (customerSuccessReceipt) {
          event.preventDefault();
          setCustomerSuccessReceipt(null);
          return;
        }
        const hasInnerModal = document.querySelector('.supplier-payment-dialog-overlay .dialog-overlay');
        if (hasInnerModal) {
          return;
        }
        event.preventDefault();
        closeDialog();
        return;
      }

      const key = String(event.key || '').toLowerCase();
      const isSupplierShortcut = event.ctrlKey
        && event.altKey
        && (event.code === 'KeyD' || key === 'd' || event.key === 'د');

      const isCustomerShortcut = event.ctrlKey
        && event.altKey
        && (event.code === 'KeyC' || key === 'c' || event.key === 'ؤ');

      if (isSupplierShortcut) {
        event.preventDefault();
        if (!isOpen) {
          setActiveTab('suppliers');
          setIsOpen(true);
        } else if (activeTab !== 'suppliers') {
          setActiveTab('suppliers');
        } else {
          closeDialog();
        }
      } else if (isCustomerShortcut) {
        event.preventDefault();
        if (!isOpen) {
          setActiveTab('customers');
          setIsOpen(true);
        } else if (activeTab !== 'customers') {
          setActiveTab('customers');
        } else {
          closeDialog();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, customerSuccessReceipt]);

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'suppliers' && !selectedSupplierId && suppliers.length === 1) {
      setSelectedSupplierId(String(suppliers[0].id));
    }
    if (activeTab === 'customers' && !selectedCustomerId && customers.length === 1) {
      setSelectedCustomerId(String(customers[0].id));
    }
  }, [isOpen, activeTab, selectedSupplierId, selectedCustomerId, suppliers, customers]);

  useEffect(() => {
    resetCustomerFields();
  }, [selectedCustomerId]);

  const customerPaymentMutation = useMutation({
    mutationFn: () => {
      if (!selectedCustomer) throw new Error('اختر العميل أولًا');
      const amount = Number(customerPaymentAmount || 0);
      if (!(amount > 0)) throw new Error('المبلغ المحصل يجب أن يكون أكبر من الصفر');
      return accountsApi.customerPaymentCreate({
        customerId: Number(selectedCustomer.id),
        amount,
        note: customerPaymentNote || `تحصيل سريع من العميل ${selectedCustomer.name}`,
      });
    },
    onSuccess: () => {
      const amountPaid = Number(customerPaymentAmount || 0);
      const currentBalance = Number(selectedCustomer?.balance || 0);
      const newRemaining = Math.max(0, currentBalance - amountPaid);

      if (selectedCustomer) {
        setCustomerSuccessReceipt({
          customer: selectedCustomer,
          amountPaid,
          remainingBalance: newRemaining,
        });
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.customerBalances });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers });
      queryClient.invalidateQueries({ queryKey: queryKeys.treasury });
      queryClient.invalidateQueries({ queryKey: queryKeys.cashierShifts });
      if (selectedCustomerId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.customerLedger(selectedCustomerId) });
      }
      queryClient.invalidateQueries({ queryKey: [...queryKeys.customers, 'debt-lookup'] });

      setCustomerPaymentAmount('');
      setCustomerPaymentNote('');
    },
  });

  if (!isOpen) return null;

  return (
    <div
      className="dialog-overlay supplier-quick-payment-dialog-overlay"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) closeDialog(); }}
    >
      <div
        className="dialog-shell supplier-payment-dialog supplier-quick-payment-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="التحصيل والدفع السريع"
      >
        <div className="dialog-card supplier-payment-dialog-card supplier-quick-payment-card">
          <div className="supplier-payment-dialog-header">
            <div>
              <h3>التحصيل والدفع السريع</h3>
              <p className="muted">
                {activeTab === 'suppliers'
                  ? 'اختصار Ctrl + Alt + D — سداد وجدولة مستحقات الموردين ومتابعة كشف الحساب.'
                  : 'اختصار Ctrl + Alt + C — استقبال وتحصيل دفعات العملاء وإرسال إيصال السداد.'}
              </p>
            </div>
            <button
              type="button"
              className="supplier-payment-dialog-close"
              onClick={closeDialog}
              aria-label="إغلاق النافذة"
            >
              ✕
            </button>
          </div>

          <div className="quick-party-tabs" role="tablist" aria-label="نوع الطرف">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'suppliers'}
              className={`quick-party-tab-btn ${activeTab === 'suppliers' ? 'quick-party-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('suppliers')}
            >
              🏢 الموردون (سداد وجدولة)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'customers'}
              className={`quick-party-tab-btn ${activeTab === 'customers' ? 'quick-party-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('customers')}
            >
              👥 العملاء (استقبال وتحصيل)
            </button>
          </div>

          {activeTab === 'suppliers' ? (
            <div>
              <div className="supplier-quick-payment-grid" style={{ marginBottom: 16 }}>
                <Field label="اختر المورد">
                  <select
                    value={selectedSupplierId}
                    onChange={(event) => setSelectedSupplierId(event.target.value)}
                    disabled={suppliersQuery.isLoading}
                  >
                    <option value="">-- اختر المورد المطلوب --</option>
                    {suppliers.map((supplier: Supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name} — {formatCurrency(Number(supplier.balance || 0))}
                      </option>
                    ))}
                  </select>
                </Field>
                {selectedSupplier ? (
                  <div className="supplier-quick-payment-summary">
                    <span>رصيد المورد الحالي</span>
                    <strong>{formatCurrency(Number(selectedSupplier.balance || 0))}</strong>
                  </div>
                ) : null}
              </div>

              {selectedSupplier ? (
                <div className="supplier-quick-payment-embedded-card">
                  <SupplierBalanceScheduleCard supplier={selectedSupplier} />
                </div>
              ) : (
                <EmptyState
                  title="لم يتم اختيار مورد"
                  hint="اختر أحد الموردين من القائمة بالأعلى لعرض تفاصيل الجدولة، إنشاء جدول دفعات جديد، أو تسديد الدفعات المستحقة."
                />
              )}
            </div>
          ) : (
            <div>
              <div className="supplier-quick-payment-grid" style={{ marginBottom: 16 }}>
                <Field label="اختر العميل المطلوب تحصيل مديونيته">
                  <select
                    value={selectedCustomerId}
                    onChange={(event) => setSelectedCustomerId(event.target.value)}
                    disabled={customersQuery.isLoading || customerPaymentMutation.isPending}
                  >
                    <option value="">-- اختر العميل --</option>
                    {customers.map((customer: Customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} — {formatCurrency(Number(customer.balance || 0))}
                      </option>
                    ))}
                  </select>
                </Field>
                {selectedCustomer ? (
                  <div className="supplier-quick-payment-summary">
                    <span>رصيد العميل المستحق</span>
                    <strong>{formatCurrency(Number(selectedCustomer.balance || 0))}</strong>
                  </div>
                ) : null}
              </div>

              {selectedCustomer ? (
                <div className="customer-quick-collection-card">
                  <div className="supplier-quick-payment-target">
                    <strong>تسجيل استلام مبلغ من العميل: {selectedCustomer.name}</strong>
                    <span>الرصيد المستحق الحالي: {formatCurrency(Number(selectedCustomer.balance || 0))}</span>
                    {selectedCustomer.phone ? <small>رقم الهاتف: {selectedCustomer.phone}</small> : null}
                  </div>

                  <div className="form-grid">
                    <Field label="المبلغ المحصل">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        max={Number(selectedCustomer.balance || 0)}
                        value={customerPaymentAmount}
                        onChange={(event) => setCustomerPaymentAmount(event.target.value)}
                        placeholder={`مثال: ${selectedCustomer.balance || '0.00'}`}
                      />
                      <div className="customer-quick-amount-shortcuts">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setCustomerPaymentAmount(String(selectedCustomer.balance || ''))}
                        >
                          تحصيل كامل الرصيد ({formatCurrency(Number(selectedCustomer.balance || 0))})
                        </Button>
                      </div>
                    </Field>

                    <Field label="ملاحظات التحصيل (اختياري)">
                      <textarea
                        rows={3}
                        value={customerPaymentNote}
                        onChange={(event) => setCustomerPaymentNote(event.target.value)}
                        placeholder="مثال: تحصيل نقدي / تحويل بنكي / رقم إيصال داخلي"
                      />
                    </Field>
                  </div>

                  <div className="actions compact-actions supplier-payment-dialog-actions">
                    <Button
                      type="button"
                      onClick={() => customerPaymentMutation.mutate()}
                      disabled={customerPaymentMutation.isPending || !(Number(customerPaymentAmount) > 0)}
                    >
                      {customerPaymentMutation.isPending ? 'جاري تسجيل التحصيل...' : 'تأكيد تحصيل المبلغ من العميل'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={resetCustomerFields}
                      disabled={customerPaymentMutation.isPending}
                    >
                      إعادة ضبط
                    </Button>
                  </div>

                  <MutationFeedback
                    isError={customerPaymentMutation.isError}
                    isSuccess={false}
                    error={customerPaymentMutation.error}
                    errorFallback="تعذر تسجيل تحصيل العميل"
                    successText=""
                  />
                </div>
              ) : (
                <EmptyState
                  title="لم يتم اختيار عميل"
                  hint="اختر أحد العملاء من القائمة بالأعلى لتسجيل استلام وتحصيل المبالغ المستحقة وإرسال إيصال السداد عبر واتساب."
                />
              )}
            </div>
          )}

          <div className="actions compact-actions supplier-payment-dialog-actions" style={{ justifyContent: 'flex-end', marginTop: 20 }}>
            <Button type="button" variant="secondary" onClick={closeDialog}>إغلاق النافذة</Button>
          </div>
        </div>
      </div>

      {customerSuccessReceipt ? (
        <div
          className="dialog-overlay supplier-payment-dialog-overlay"
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) setCustomerSuccessReceipt(null); }}
        >
          <div className="dialog-shell supplier-payment-dialog" role="dialog" aria-modal="true" aria-label="تم تسجيل التحصيل بنجاح">
            <div className="dialog-card supplier-payment-dialog-card" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h3 style={{ marginBottom: '0.5rem' }}>تم تسجيل التحصيل بنجاح</h3>
              <p className="muted" style={{ marginBottom: '1.5rem' }}>
                تم استلام {formatCurrency(customerSuccessReceipt.amountPaid)} من العميل {customerSuccessReceipt.customer.name} (الرصيد المتبقي: {formatCurrency(customerSuccessReceipt.remainingBalance)}).
              </p>

              <div className="actions compact-actions supplier-payment-dialog-actions" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  type="button"
                  onClick={() => {
                    const rawPhone = customerSuccessReceipt.customer.phone || '';
                    const phone = formatWhatsAppNumber(rawPhone);
                    const remaining = customerSuccessReceipt.remainingBalance;
                    const text = `مرحباً ${customerSuccessReceipt.customer.name}،\nتم تسجيل استلام دفعة نقدية بقيمة ${formatCurrency(customerSuccessReceipt.amountPaid)}.\nإجمالي الرصيد المتبقي عليكم هو ${formatCurrency(remaining)}.\nشكراً لتعاملكم.`;
                    const encodedText = encodeURIComponent(text);
                    let url = `https://wa.me/${phone}?text=${encodedText}`;
                    if (settings?.whatsappLinkMode === 'web') {
                      url = `https://web.whatsapp.com/send/?phone=${phone}&text=${encodedText}`;
                    } else if (settings?.whatsappLinkMode === 'app') {
                      url = `whatsapp://send?phone=${phone}&text=${encodedText}`;
                    }
                    openWhatsApp(url);
                    setCustomerSuccessReceipt(null);
                  }}
                >
                  إرسال إيصال للعميل عبر واتساب 💬
                </Button>
                <Button type="button" variant="secondary" onClick={() => setCustomerSuccessReceipt(null)}>
                  إغلاق
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
