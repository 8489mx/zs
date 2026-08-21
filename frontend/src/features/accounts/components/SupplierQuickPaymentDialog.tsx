import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { accountsApi } from '@/features/accounts/api/accounts.api';
import { formatCurrency, formatDateTimeArabic, formatWhatsAppNumber } from '@/lib/format';
import { openWhatsApp } from '@/lib/whatsapp';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { SupplierBalanceScheduleCard } from '@/features/accounts/components/SupplierBalanceScheduleCard';
import type { Customer, Supplier } from '@/types/domain';

function BuildingOfficeIcon({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}

function UsersIcon({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function MagnifyingGlassIcon({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function PhoneIcon({ size = 13, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function ZapIcon({ size = 14, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function CheckCircleIcon({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function WhatsAppIcon({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

type QuickPartyTab = 'suppliers' | 'customers';

export function SupplierQuickPaymentDialog() {
  const queryClient = useQueryClient();
  const { data: settings } = useSettingsQuery();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<QuickPartyTab>('suppliers');
  
  // Supplier state
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierSearchText, setSupplierSearchText] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [supplierFocusedIndex, setSupplierFocusedIndex] = useState(-1);

  // Customer state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearchText, setCustomerSearchText] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerFocusedIndex, setCustomerFocusedIndex] = useState(-1);
  const [customerPaymentAmount, setCustomerPaymentAmount] = useState('');
  const [customerPaymentNote, setCustomerPaymentNote] = useState('');
  const [customerSuccessReceipt, setCustomerSuccessReceipt] = useState<{
    customer: Customer;
    amountPaid: number;
    remainingBalance: number;
  } | null>(null);

  const suppliersQuery = useQuery({
    queryKey: [...queryKeys.suppliers, 'quick-payment-lookup'],
    queryFn: () => accountsApi.suppliers(),
    enabled: isOpen && activeTab === 'suppliers',
  });

  const customersQuery = useQuery({
    queryKey: [...queryKeys.customers, 'quick-payment-lookup'],
    queryFn: () => accountsApi.customers(),
    enabled: isOpen && activeTab === 'customers',
  });

  const suppliers = useMemo(() => suppliersQuery.data || [], [suppliersQuery.data]);
  const customers = useMemo(() => customersQuery.data || [], [customersQuery.data]);

  const selectedSupplier = useMemo(() => suppliers.find((supplier) => String(supplier.id) === selectedSupplierId) || null, [suppliers, selectedSupplierId]);
  const selectedCustomer = useMemo(() => customers.find((customer) => String(customer.id) === selectedCustomerId) || null, [customers, selectedCustomerId]);

  const filteredSuppliers = useMemo(() => {
    const query = supplierSearchText.trim().toLowerCase();
    if (!query) return suppliers;
    if (selectedSupplier && query === String(selectedSupplier.name || '').trim().toLowerCase()) {
      return suppliers;
    }
    const cleanDigits = query.replace(/\D/g, '');
    return suppliers.filter((s: Supplier) => {
      const matchName = String(s.name || '').toLowerCase().includes(query);
      const matchPhone = cleanDigits && String(s.phone || '').replace(/\D/g, '').includes(cleanDigits);
      return matchName || matchPhone;
    });
  }, [suppliers, supplierSearchText, selectedSupplier]);

  const filteredCustomers = useMemo(() => {
    const query = customerSearchText.trim().toLowerCase();
    if (!query) return customers;
    if (selectedCustomer && query === String(selectedCustomer.name || '').trim().toLowerCase()) {
      return customers;
    }
    const cleanDigits = query.replace(/\D/g, '');
    return customers.filter((c: Customer) => {
      const matchName = String(c.name || '').toLowerCase().includes(query);
      const matchPhone = cleanDigits && String(c.phone || '').replace(/\D/g, '').includes(cleanDigits);
      return matchName || matchPhone;
    });
  }, [customers, customerSearchText, selectedCustomer]);

  const topSuppliers = useMemo(() => {
    return [...suppliers]
      .filter((s: Supplier) => Number(s.balance || 0) > 0)
      .sort((a: Supplier, b: Supplier) => Number(b.balance || 0) - Number(a.balance || 0))
      .slice(0, 5);
  }, [suppliers]);

  const topCustomers = useMemo(() => {
    return [...customers]
      .filter((c: Customer) => Number(c.balance || 0) > 0)
      .sort((a: Customer, b: Customer) => Number(b.balance || 0) - Number(a.balance || 0))
      .slice(0, 5);
  }, [customers]);

  function handleSelectSupplier(s: Supplier) {
    setSelectedSupplierId(String(s.id));
    setSupplierSearchText(s.name || '');
    setIsSupplierDropdownOpen(false);
    setSupplierFocusedIndex(-1);
  }

  function handleClearSupplier() {
    setSelectedSupplierId('');
    setSupplierSearchText('');
    setIsSupplierDropdownOpen(false);
    setSupplierFocusedIndex(-1);
  }

  function handleSelectCustomer(c: Customer) {
    setSelectedCustomerId(String(c.id));
    setCustomerSearchText(c.name || '');
    setIsCustomerDropdownOpen(false);
    setCustomerFocusedIndex(-1);
  }

  function handleClearCustomer() {
    setSelectedCustomerId('');
    setCustomerSearchText('');
    setIsCustomerDropdownOpen(false);
    setCustomerFocusedIndex(-1);
    resetCustomerFields();
  }

  function resetCustomerFields() {
    setCustomerPaymentAmount('');
    setCustomerPaymentNote('');
    setCustomerSuccessReceipt(null);
  }

  function closeDialog() {
    setIsOpen(false);
    handleClearSupplier();
    handleClearCustomer();
  }

  useEffect(() => {
    if (selectedSupplier) {
      setSupplierSearchText(selectedSupplier.name || '');
    }
  }, [selectedSupplier]);

  useEffect(() => {
    if (selectedCustomer) {
      setCustomerSearchText(selectedCustomer.name || '');
    }
  }, [selectedCustomer]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isOpen && (event.key === 'Escape' || event.key === 'Esc')) {
        if (customerSuccessReceipt) {
          event.preventDefault();
          setCustomerSuccessReceipt(null);
          return;
        }
        if (isSupplierDropdownOpen) {
          event.preventDefault();
          setIsSupplierDropdownOpen(false);
          return;
        }
        if (isCustomerDropdownOpen) {
          event.preventDefault();
          setIsCustomerDropdownOpen(false);
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
  }, [isOpen, activeTab, customerSuccessReceipt, isSupplierDropdownOpen, isCustomerDropdownOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'suppliers' && !selectedSupplierId && suppliers.length === 1) {
      handleSelectSupplier(suppliers[0]);
    }
    if (activeTab === 'customers' && !selectedCustomerId && customers.length === 1) {
      handleSelectCustomer(customers[0]);
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
          <div className="quick-payment-dialog-header">
            <div className="quick-payment-header-content">
              <h3>نافذة التحصيل والدفع السريع</h3>
              <p className="muted">
                {activeTab === 'suppliers'
                  ? 'سداد وجدولة مستحقات الموردين ومتابعة كشف الحساب الفوري.'
                  : 'استقبال وتحصيل مديونيات العملاء مع إرسال إيصال السداد.'}
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

          <div className="quick-party-tabs-segment" role="tablist" aria-label="نوع الطرف">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'suppliers'}
              className={`quick-party-tab ${activeTab === 'suppliers' ? 'quick-party-tab--suppliers-active' : ''}`}
              onClick={() => setActiveTab('suppliers')}
            >
              <span className="quick-party-tab-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <BuildingOfficeIcon size={18} />
              </span>
              <span className="quick-party-tab-title">الموردون (سداد وجدولة)</span>
              <span className="quick-party-tab-kbd">Ctrl+Alt+D</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'customers'}
              className={`quick-party-tab ${activeTab === 'customers' ? 'quick-party-tab--customers-active' : ''}`}
              onClick={() => setActiveTab('customers')}
            >
              <span className="quick-party-tab-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <UsersIcon size={18} />
              </span>
              <span className="quick-party-tab-title">العملاء (استقبال وتحصيل)</span>
              <span className="quick-party-tab-kbd">Ctrl+Alt+C</span>
            </button>
          </div>

          {activeTab === 'suppliers' ? (
            <div>
              <div className="quick-selector-card">
                <div className="supplier-quick-payment-grid">
                  <Field label="ابحث عن المورد (بالاسم أو برقم الهاتف)">
                    <div className="quick-searchable-combobox">
                      <div className="quick-searchable-input-wrapper">
                        <span className="quick-searchable-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <MagnifyingGlassIcon size={16} />
                        </span>
                        <input
                          type="text"
                          className="quick-searchable-input"
                          value={supplierSearchText}
                          onChange={(e) => {
                            setSupplierSearchText(e.target.value);
                            setIsSupplierDropdownOpen(true);
                            setSupplierFocusedIndex(-1);
                            if (selectedSupplierId && e.target.value !== selectedSupplier?.name) {
                              setSelectedSupplierId('');
                            }
                          }}
                          onFocus={(e) => {
                            e.target.select();
                            setIsSupplierDropdownOpen(true);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setIsSupplierDropdownOpen(true);
                              setSupplierFocusedIndex((prev) => (prev < filteredSuppliers.length - 1 ? prev + 1 : 0));
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setIsSupplierDropdownOpen(true);
                              setSupplierFocusedIndex((prev) => (prev > 0 ? prev - 1 : filteredSuppliers.length - 1));
                            } else if (e.key === 'Enter') {
                              e.preventDefault();
                              if (isSupplierDropdownOpen && supplierFocusedIndex >= 0 && filteredSuppliers[supplierFocusedIndex]) {
                                handleSelectSupplier(filteredSuppliers[supplierFocusedIndex]);
                              } else if (filteredSuppliers.length === 1) {
                                handleSelectSupplier(filteredSuppliers[0]);
                              }
                            } else if (e.key === 'Escape') {
                              setIsSupplierDropdownOpen(false);
                            }
                          }}
                          placeholder="اكتب اسم المورد أو رقم الهاتف للبحث السريع..."
                        />
                        {supplierSearchText || selectedSupplierId ? (
                          <button
                            type="button"
                            className="quick-searchable-clear"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleClearSupplier();
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleClearSupplier();
                            }}
                            title="إلغاء اختيار المورد ومسح البحث"
                            aria-label="مسح البحث"
                          >
                            ✕
                          </button>
                        ) : null}
                      </div>

                      {isSupplierDropdownOpen ? (
                        <div className="quick-searchable-dropdown">
                          {filteredSuppliers.length > 0 ? (
                            filteredSuppliers.map((supplier: Supplier, index: number) => (
                              <button
                                key={supplier.id}
                                type="button"
                                className={`quick-searchable-item ${index === supplierFocusedIndex ? 'quick-searchable-item--active' : ''} ${String(supplier.id) === selectedSupplierId ? 'quick-searchable-item--selected' : ''}`}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleSelectSupplier(supplier);
                                }}
                                onClick={() => handleSelectSupplier(supplier)}
                              >
                                <div className="quick-searchable-item-info">
                                  <span className="quick-searchable-item-name">{supplier.name}</span>
                                  {supplier.phone ? (
                                    <span className="quick-searchable-item-phone" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <PhoneIcon size={12} /> {supplier.phone}
                                    </span>
                                  ) : null}
                                </div>
                                <span className="quick-searchable-item-balance">
                                  {formatCurrency(Number(supplier.balance || 0))}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="quick-searchable-empty">
                              لا يوجد مورد مطابق لـ "{supplierSearchText}"
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </Field>
                  {selectedSupplier ? (
                    <div className="supplier-quick-payment-summary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <span>رصيد المورد الحالي ({selectedSupplier.name})</span>
                        <strong>{formatCurrency(Number(selectedSupplier.balance || 0))}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearSupplier}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#dc2626',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        ✕ ترك المورد
                      </button>
                    </div>
                  ) : null}
                </div>

                {topSuppliers.length > 0 ? (
                  <div className="quick-debtors-preview">
                    <span className="quick-debtors-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <ZapIcon size={14} style={{ color: '#d97706' }} /> اختيار سريع للموردين الأكثر مديونية:
                    </span>
                    <div className="quick-debtors-chips">
                      {topSuppliers.map((s: Supplier) => {
                        const isSelected = selectedSupplierId === String(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            className={`quick-debtor-chip ${isSelected ? 'quick-debtor-chip--active' : ''}`}
                            onClick={() => handleSelectSupplier(s)}
                          >
                            <strong>{s.name}</strong>
                            <span>{formatCurrency(Number(s.balance || 0))}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              {selectedSupplier ? (
                <div className="supplier-quick-payment-embedded-card">
                  <SupplierBalanceScheduleCard supplier={selectedSupplier} />
                </div>
              ) : (
                <div className="quick-empty-guide">
                  <div className="quick-empty-icon" style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(23, 12, 92, 0.08)', color: 'var(--primary, #170c5c)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <BuildingOfficeIcon size={28} />
                  </div>
                  <div className="quick-empty-title">اختر مورداً لبدء المتابعة</div>
                  <div className="quick-empty-hint">
                    يمكنك كتابة اسم المورد أو رقم هاتفه في مربع البحث بالأعلى، أو الضغط على أحد أزرار الاختيار السريع لعرض تفاصيل الجدولة وتسديد الأقساط.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="quick-selector-card">
                <div className="supplier-quick-payment-grid">
                  <Field label="ابحث عن العميل (بالاسم أو برقم الهاتف)">
                    <div className="quick-searchable-combobox">
                      <div className="quick-searchable-input-wrapper">
                        <span className="quick-searchable-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <MagnifyingGlassIcon size={16} />
                        </span>
                        <input
                          type="text"
                          className="quick-searchable-input"
                          value={customerSearchText}
                          onChange={(e) => {
                            setCustomerSearchText(e.target.value);
                            setIsCustomerDropdownOpen(true);
                            setCustomerFocusedIndex(-1);
                            if (selectedCustomerId && e.target.value !== selectedCustomer?.name) {
                              setSelectedCustomerId('');
                            }
                          }}
                          onFocus={(e) => {
                            e.target.select();
                            setIsCustomerDropdownOpen(true);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setIsCustomerDropdownOpen(true);
                              setCustomerFocusedIndex((prev) => (prev < filteredCustomers.length - 1 ? prev + 1 : 0));
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setIsCustomerDropdownOpen(true);
                              setCustomerFocusedIndex((prev) => (prev > 0 ? prev - 1 : filteredCustomers.length - 1));
                            } else if (e.key === 'Enter') {
                              e.preventDefault();
                              if (isCustomerDropdownOpen && customerFocusedIndex >= 0 && filteredCustomers[customerFocusedIndex]) {
                                handleSelectCustomer(filteredCustomers[customerFocusedIndex]);
                              } else if (filteredCustomers.length === 1) {
                                handleSelectCustomer(filteredCustomers[0]);
                              }
                            } else if (e.key === 'Escape') {
                              setIsCustomerDropdownOpen(false);
                            }
                          }}
                          placeholder="اكتب اسم العميل أو رقم الهاتف للبحث السريع..."
                          disabled={customerPaymentMutation.isPending}
                        />
                        {customerSearchText || selectedCustomerId ? (
                          <button
                            type="button"
                            className="quick-searchable-clear"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleClearCustomer();
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleClearCustomer();
                            }}
                            title="إلغاء اختيار العميل ومسح البحث"
                            aria-label="مسح البحث"
                          >
                            ✕
                          </button>
                        ) : null}
                      </div>

                      {isCustomerDropdownOpen ? (
                        <div className="quick-searchable-dropdown">
                          {filteredCustomers.length > 0 ? (
                            filteredCustomers.map((customer: Customer, index: number) => (
                              <button
                                key={customer.id}
                                type="button"
                                className={`quick-searchable-item ${index === customerFocusedIndex ? 'quick-searchable-item--active' : ''} ${String(customer.id) === selectedCustomerId ? 'quick-searchable-item--selected' : ''}`}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleSelectCustomer(customer);
                                }}
                                onClick={() => handleSelectCustomer(customer)}
                              >
                                <div className="quick-searchable-item-info">
                                  <span className="quick-searchable-item-name">{customer.name}</span>
                                  {customer.phone ? (
                                    <span className="quick-searchable-item-phone" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <PhoneIcon size={12} /> {customer.phone}
                                    </span>
                                  ) : null}
                                </div>
                                <span className="quick-searchable-item-balance quick-searchable-item-balance--customer">
                                  {formatCurrency(Number(customer.balance || 0))}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="quick-searchable-empty">
                              لا يوجد عميل مطابق لـ "{customerSearchText}"
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </Field>
                  {selectedCustomer ? (
                    <div className="supplier-quick-payment-summary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <span>رصيد العميل المستحق ({selectedCustomer.name})</span>
                        <strong>{formatCurrency(Number(selectedCustomer.balance || 0))}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearCustomer}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#dc2626',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        ✕ ترك العميل
                      </button>
                    </div>
                  ) : null}
                </div>

                {topCustomers.length > 0 ? (
                  <div className="quick-debtors-preview">
                    <span className="quick-debtors-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <ZapIcon size={14} style={{ color: '#d97706' }} /> اختيار سريع للعملاء الأكثر مديونية:
                    </span>
                    <div className="quick-debtors-chips">
                      {topCustomers.map((c: Customer) => {
                        const isSelected = selectedCustomerId === String(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            className={`quick-debtor-chip quick-debtor-chip--customer ${isSelected ? 'quick-debtor-chip--customer-active' : ''}`}
                            onClick={() => handleSelectCustomer(c)}
                          >
                            <strong>{c.name}</strong>
                            <span>{formatCurrency(Number(c.balance || 0))}</span>
                          </button>
                        );
                      })}
                    </div>
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
                <div className="quick-empty-guide">
                  <div className="quick-empty-icon" style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(23, 12, 92, 0.08)', color: 'var(--primary, #170c5c)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <UsersIcon size={28} />
                  </div>
                  <div className="quick-empty-title">اختر عميلاً لتسجيل التحصيل</div>
                  <div className="quick-empty-hint">
                    يمكنك اختيار العميل من القائمة بالأعلى أو الضغط على أحد أزرار الاختيار السريع لتسجيل استلام النقدية وإرسال إيصال السداد الفوري عبر واتساب.
                  </div>
                </div>
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
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: '#16a34a' }}>
                <CheckCircleIcon size={52} />
              </div>
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
                    const text = `مرحباً ${customerSuccessReceipt.customer.name}،\nتم تسجيل استلام دفعة نقدية بقيمة: *${formatCurrency(customerSuccessReceipt.amountPaid)} ج.م*\n• التاريخ والوقت: ${formatDateTimeArabic()}\n• إجمالي الرصيد المتبقي عليكم: *${formatCurrency(remaining)} ج.م*\nشكراً لتعاملكم معنا.`;
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
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <WhatsAppIcon size={16} /> إرسال إيصال للعميل عبر واتساب
                  </span>
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
