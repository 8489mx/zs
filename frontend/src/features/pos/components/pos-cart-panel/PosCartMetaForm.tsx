import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { posApi } from '@/features/pos/api/pos.api';
import { writeCheckoutIntent } from '@/features/pos/lib/pos-checkout-integrity';
import { Button } from '@/shared/ui/button';
import { SearchableCombobox, type ComboboxOption } from '@/shared/ui/searchable-combobox';
import { SearchIcon, UserIcon, UsersIcon, XIcon } from '@/shared/components/icons/AppIcons';
import { formatCurrency, formatDate } from '@/lib/format';
import type { PosCartPanelProps } from './posCartPanel.types';

interface PosCustomerOption extends ComboboxOption {
  name: string;
  phone?: string;
  isCash?: boolean;
}

type CustomerPickerMode = 'closed' | 'search' | 'create';
const RECENT_POS_CUSTOMERS_KEY = 'zs.pos.recentCustomerIds';

function readRecentCustomerIds() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_POS_CUSTOMERS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map((value) => String(value)).filter(Boolean).slice(0, 5) : [];
  } catch {
    return [];
  }
}

function storeRecentCustomerIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(RECENT_POS_CUSTOMERS_KEY, JSON.stringify(ids.slice(0, 5)));
}

export function PosCartMetaForm(props: Pick<PosCartPanelProps,
  'customers' | 'customerId' | 'onCustomerChange' |
  'quickCustomerName' | 'quickCustomerPhone' | 'quickCustomerAddress' | 'isQuickCustomerPending' |
  'onQuickCustomerSubmit' | 'onQuickCustomerNameChange' | 'onQuickCustomerPhoneChange' | 'onQuickCustomerAddressChange'
>) {
  const { t } = useTranslation();
  const [pickerMode, setPickerMode] = useState<CustomerPickerMode>('closed');
  const [query, setQuery] = useState('');
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [recentCustomerIds, setRecentCustomerIds] = useState(readRecentCustomerIds);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const queryClient = useQueryClient();
  const selectedCustomerId = String(props.customerId || '');
  const missingInList = Boolean(selectedCustomerId && !props.customers.some((c) => String(c.id) === selectedCustomerId));
  
  const specificCustomerQuery = useQuery({
    queryKey: ['posSpecificCustomer', selectedCustomerId],
    queryFn: () => posApi.customers({ search: selectedCustomerId, limit: 1 }),
    enabled: missingInList,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (specificCustomerQuery.data?.length) {
      const customerObj = specificCustomerQuery.data.find(c => String(c.id) === selectedCustomerId);
      if (customerObj) {
        queryClient.setQueryData(queryKeys.posCustomers, (old: any) => {
          if (!old) return [customerObj];
          if (old.find((c: any) => String(c.id) === selectedCustomerId)) return old;
          return [...old, customerObj];
        });
      }
    }
  }, [specificCustomerQuery.data, selectedCustomerId, queryClient]);

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return props.customers.find((customer) => String(customer.id) === selectedCustomerId) 
      || (specificCustomerQuery.data?.find((c) => String(c.id) === selectedCustomerId))
      || null;
  }, [selectedCustomerId, props.customers, specificCustomerQuery.data]);

  const customerSummaryQuery = useQuery({
    queryKey: queryKeys.posCustomerSummary(selectedCustomerId),
    queryFn: () => posApi.customerPosSummary(selectedCustomerId),
    enabled: Boolean(selectedCustomerId),
    staleTime: 30_000,
  });
  const customerSummary = customerSummaryQuery.data;
  const customerBalance = Number(customerSummary?.balance ?? selectedCustomer?.balance ?? 0);
  const creditLimit = Number(customerSummary?.creditLimit ?? selectedCustomer?.creditLimit ?? 0);
  const storeCreditBalance = Number(customerSummary?.storeCreditBalance ?? selectedCustomer?.storeCreditBalance ?? 0);
  const remainingCredit = customerSummary?.remainingCredit ?? (creditLimit > 0 ? creditLimit - customerBalance : null);
  const creditUsagePercent = creditLimit > 0 ? (customerBalance / creditLimit) * 100 : 0;
  const customerRiskHint = creditLimit > 0 && customerBalance > creditLimit
    ? 'متجاوز حد الائتمان'
    : creditLimit > 0 && creditUsagePercent >= 80
      ? 'قريب من حد الائتمان'
      : selectedCustomer?.type === 'vip'
        ? 'عميل مهم'
        : '';

  const searchCustomersQuery = useQuery({
    queryKey: ['posCustomersSearch', query],
    queryFn: () => posApi.customers({ search: query, limit: 10 }),
    enabled: Boolean(query.trim()),
    staleTime: 30_000,
  });

  const filteredCustomers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    
    // Use search results from API if we have a query
    if (normalized) {
      if (searchCustomersQuery.data && searchCustomersQuery.data.length > 0) {
        return searchCustomersQuery.data.slice(0, 15);
      }
      
      // Fallback to local filter while loading
      return props.customers.filter((customer) => {
        const name = String(customer.name || '').toLowerCase();
        const phone = String(customer.phone || '').toLowerCase();
        const id = String(customer.id || '').toLowerCase();
        const type = String(customer.type || '').toLowerCase();
        return name.includes(normalized) || phone.includes(normalized) || id.includes(normalized) || type.includes(normalized);
      }).slice(0, 15);
    }

    const recent = recentCustomerIds
      .map((id) => props.customers.find((customer) => String(customer.id) === id))
      .filter((customer): customer is NonNullable<typeof customer> => Boolean(customer));
    const recentSet = new Set(recent.map((customer) => String(customer.id)));
    return [...recent, ...props.customers.filter((customer) => !recentSet.has(String(customer.id)))].slice(0, 15);
  }, [props.customers, query, recentCustomerIds, searchCustomersQuery.data]);

  const comboboxOptions = useMemo<PosCustomerOption[]>(() => {
    const list: PosCustomerOption[] = [
      { id: '', name: 'عميل نقدي', phone: 'بدون ربط الفاتورة بحساب عميل', isCash: true },
    ];

    for (const customer of filteredCustomers) {
      if (String(customer.id) !== '') {
        list.push({
          id: String(customer.id),
          name: customer.name,
          phone: customer.phone || 'بدون رقم تليفون',
        });
      }
    }

    return list;
  }, [filteredCustomers]);

  useEffect(() => {
    writeCheckoutIntent({ customerId: String(props.customerId || '').trim() });
  }, [props.customerId]);

  useEffect(() => {
    if (pickerMode !== 'search') return;
    const frame = window.requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [pickerMode]);



  function openSearchInline() {
    setPickerMode('search');
  }

  function toggleCreateInline() {
    setPickerMode((current) => {
      const next = current === 'create' ? 'closed' : 'create';
      setQuery('');
      return next;
    });
  }

  function closeInlinePicker() {
    setPickerMode('closed');
    setQuery('');
  }

  function selectCustomer(id: string) {
    const normalizedId = String(id || '').trim();
    writeCheckoutIntent({ customerId: normalizedId });
    
    // Cache the selected customer so it's available globally in the POS workspace
    if (normalizedId) {
      const customerObj = filteredCustomers.find((c) => String(c.id) === normalizedId);
      if (customerObj) {
        queryClient.setQueryData(queryKeys.posCustomers, (old: any) => {
          if (!old) return [customerObj];
          if (old.find((c: any) => String(c.id) === normalizedId)) return old;
          return [...old, customerObj];
        });
      }
    }
    
    if (!normalizedId) {
      props.onQuickCustomerNameChange?.('');
      props.onQuickCustomerPhoneChange?.('');
      props.onQuickCustomerAddressChange?.('');
    }
    
    flushSync(() => {
      props.onCustomerChange(normalizedId);
    });
    if (normalizedId) {
      const nextRecentIds = [normalizedId, ...recentCustomerIds.filter((recentId) => recentId !== normalizedId)].slice(0, 5);
      setRecentCustomerIds(nextRecentIds);
      storeRecentCustomerIds(nextRecentIds);
    }
    setShowCustomerDetails(false);
    closeInlinePicker();
  }

  function removeCustomer() {
    writeCheckoutIntent({ customerId: '' });
    props.onQuickCustomerNameChange?.('');
    props.onQuickCustomerPhoneChange?.('');
    props.onQuickCustomerAddressChange?.('');
    setShowCustomerDetails(false);
    flushSync(() => {
      props.onCustomerChange('');
    });
    closeInlinePicker();
  }

  return (
    <>
      <div ref={pickerRef} className={`pos-customer-meta-panel ${pickerMode !== 'closed' ? 'is-expanded' : ''}`.trim()}>
        <div className="pos-customer-inline-bar">
          <div className={`pos-customer-inline-shell ${pickerMode === 'search' ? 'is-open' : ''}`.trim()}>
            {pickerMode === 'search' ? (
              <div className="pos-customer-combobox-wrapper">
                <SearchableCombobox<PosCustomerOption>
                  inline
                  forceOpen
                  inputRef={searchInputRef}
                  inputClassName="purchase-prototype-field-input pos-customer-combobox-field"
                  placeholder={t('pos.pos_cart_panel.pos_cart_meta_form.s0', "ابحث بالاسم أو الهاتف")}
                  ariaLabel={t('pos.pos_cart_panel.pos_cart_meta_form.s1', "ابحث بالاسم أو الهاتف")}
                  value={query}
                  onChange={setQuery}
                  options={comboboxOptions}
                  getLabel={(c) => c.name}
                  getMeta={(c) => c.phone}
                  onSelect={(c) => selectCustomer(c.id)}
                  onCreate={(name) => {
                    props.onQuickCustomerNameChange(name);
                    setPickerMode('create');
                  }}
                  createLabel={(name) => `+ إضافة عميل جديد باسم "${name}"`}
                  emptyLabel={t('pos.pos_cart_panel.pos_cart_meta_form.s2', "لا توجد نتائج مطابقة الآن")}
                  showDropdownOnEmpty={true}
                  onOpenChange={(isOpen) => {
                    if (!isOpen) {
                      setPickerMode('closed');
                      setQuery('');
                    }
                  }}
                />
              </div>
            ) : (
              <button type="button" className="pos-customer-trigger" onClick={openSearchInline} title={t('pos.pos_cart_panel.pos_cart_meta_form.s3', "اضغط للبحث واختيار عميل")}>
                <div className="pos-customer-trigger-avatar">
                  <UserIcon size={15} color="#170e5e" />
                </div>
                <div className="pos-customer-trigger-info">
                  <strong>{selectedCustomer?.name || props.quickCustomerName || t('pos.pos_cart_panel.pos_cart_meta_form.s4', "عميل نقدي")}</strong>
                  <small>{selectedCustomer?.phone || props.quickCustomerPhone || t('pos.pos_cart_panel.pos_cart_meta_form.s5', "ابحث بالاسم أو الهاتف")}</small>
                </div>
                <div className="pos-customer-trigger-search-hint">
                  <SearchIcon size={14} color="#94a3b8" />
                </div>
              </button>
            )}
          </div>

          <Button type="button" variant="secondary" className="pos-customer-create-toggle" onClick={toggleCreateInline}>
            {pickerMode === 'create' ? t('pos.pos_cart_panel.pos_cart_meta_form.s6', "إلغاء") : t('pos.pos_cart_panel.pos_cart_meta_form.s7', "إضافة عميل")}
          </Button>
        </div>

        {pickerMode === 'create' ? (
          <div className="pos-customer-create-card">
            <div className="pos-customer-create-header">
              <div className="pos-customer-create-title">
                <UsersIcon size={16} color="#170e5e" />
                <span>{t('pos.pos_cart_panel.pos_cart_meta_form.s8', "إضافة عميل جديد وتعيينه بالسلة")}</span>
              </div>
              <button
                type="button"
                className="pos-customer-create-close"
                onClick={() => setPickerMode('closed')}
                title={t('pos.pos_cart_panel.pos_cart_meta_form.s9', "إلغاء وإغلاق")}
              >
                <XIcon size={16} />
              </button>
            </div>

            <form
              className="pos-customer-create-form"
              onSubmit={async (event) => {
                await props.onQuickCustomerSubmit(event);
                setPickerMode('closed');
              }}
            >
              <div className="pos-customer-create-grid">
                <div className="pos-customer-create-field">
                  <label>
                    {t('pos.pos_cart_panel.pos_cart_meta_form.s10', "اسم العميل")} <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder={t('pos.pos_cart_panel.pos_cart_meta_form.s11', "الاسم الثلاثي أو الثنائي")}
                    value={props.quickCustomerName}
                    onChange={(event) => props.onQuickCustomerNameChange(event.target.value)}
                    disabled={props.isQuickCustomerPending}
                  />
                </div>
                <div className="pos-customer-create-field">
                  <label>{t('pos.pos_cart_panel.pos_cart_meta_form.s12', "رقم الهاتف (اختياري)")}</label>
                  <input
                    type="tel"
                    dir="ltr"
                    placeholder="01012345678"
                    value={props.quickCustomerPhone}
                    onChange={(event) => props.onQuickCustomerPhoneChange(event.target.value)}
                    disabled={props.isQuickCustomerPending}
                  />
                </div>
              </div>

              <div className="pos-customer-create-field">
                <label>{t('pos.pos_cart_panel.pos_cart_meta_form.s13', "العنوان (اختياري - لطلبات الدليفري والتوصيل)")}</label>
                <input
                  type="text"
                  placeholder={t('pos.pos_cart_panel.pos_cart_meta_form.s14', "المنطقة، الشارع، تفاصيل التوصيل...")}
                  value={props.quickCustomerAddress}
                  onChange={(event) => props.onQuickCustomerAddressChange(event.target.value)}
                  disabled={props.isQuickCustomerPending}
                />
              </div>

              <div className="pos-customer-create-actions-bar">
                <Button
                  type="button"
                  variant="secondary"
                  className="pos-customer-cancel-btn"
                  onClick={() => setPickerMode('closed')}
                  disabled={props.isQuickCustomerPending}
                >
                  {t('pos.pos_cart_panel.pos_cart_meta_form.s15', "إلغاء")}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={props.isQuickCustomerPending || !props.quickCustomerName.trim()}
                  className="pos-customer-save-btn"
                >
                  {props.isQuickCustomerPending ? t('pos.pos_cart_panel.pos_cart_meta_form.s16', "جارٍ الإضافة...") : t('pos.pos_cart_panel.pos_cart_meta_form.s17', "حفظ العميل")}
                </Button>
              </div>
            </form>
          </div>
        ) : null}

        {selectedCustomer ? (
          <div className="pos-selected-customer-card" aria-label={t('pos.pos_cart_panel.pos_cart_meta_form.s18', "ملخص العميل المختار")}>
            <div className="pos-selected-customer-bar">
              <div className="pos-selected-customer-indicators">
                <span className={`pos-cust-pill ${customerBalance > 0 ? 'is-debt' : 'is-settled'}`}>
                  <b>{t('pos.pos_cart_panel.pos_cart_meta_form.s19', "رصيد العميل")}</b>
                  <span>{formatCurrency(customerBalance)}</span>
                </span>

                {creditLimit > 0 ? (
                  <span className="pos-cust-pill">
                    <b>{t('pos.pos_cart_panel.pos_cart_meta_form.s20', "حد الائتمان")}</b>
                    <span>{formatCurrency(creditLimit)}</span>
                  </span>
                ) : null}

                {remainingCredit !== null && creditLimit > 0 ? (
                  <span className="pos-cust-pill">
                    <b>{t('pos.pos_cart_panel.pos_cart_meta_form.s21', "المتاح")}</b>
                    <span>{formatCurrency(remainingCredit)}</span>
                  </span>
                ) : null}

                {customerRiskHint ? (
                  <span className="pos-customer-risk-hint">{customerRiskHint}</span>
                ) : null}

                {customerSummary?.loyaltyPoints ? (
                  <span className="pos-cust-pill is-loyalty">
                    <b>{t('pos.pos_cart_panel.pos_cart_meta_form.s22', "نقاط الولاء")}</b>
                    <span>{customerSummary.loyaltyPoints.toLocaleString()}</span>
                  </span>
                ) : null}
              </div>

              <div className="pos-selected-customer-actions">
                <button
                  type="button"
                  className="pos-customer-details-toggle"
                  onClick={() => setShowCustomerDetails((prev) => !prev)}
                >
                  {showCustomerDetails ? t('pos.pos_cart_panel.pos_cart_meta_form.s23', "إخفاء التفاصيل ▴") : t('pos.pos_cart_panel.pos_cart_meta_form.s24', "كشف الحساب ▾")}
                </button>
                <Button
                  type="button"
                  variant="secondary"
                  className="pos-selected-customer-remove"
                  onClick={removeCustomer}
                  title={t('pos.pos_cart_panel.pos_cart_meta_form.s25', "إلغاء تعيين العميل والعودة لعميل نقدي")}
                >
                  {t('pos.pos_cart_panel.pos_cart_meta_form.s26', "إزالة العميل")}
                </Button>
              </div>
            </div>

            <div className={`pos-selected-customer-extended ${showCustomerDetails ? 'is-expanded' : 'is-collapsed'}`}>
              <div className="pos-selected-customer-metrics">
                {storeCreditBalance ? <span><b>{t('pos.pos_cart_panel.pos_cart_meta_form.s27', "رصيد المتجر")}</b>{formatCurrency(storeCreditBalance)}</span> : null}
                {customerSummary?.loyaltyPoints ? (
                  <span style={{ color: '#b45309', fontWeight: 'bold' }}>
                    <b>{t('pos.pos_cart_panel.pos_cart_meta_form.s28', "نقاط الولاء")}</b>{customerSummary.loyaltyPoints.toLocaleString()} {t('pos.pos_cart_panel.pos_cart_meta_form.s29', "نقطة")}
                  </span>
                ) : null}
                {customerSummary ? (
                  <>
                    <span><b>{t('pos.pos_cart_panel.pos_cart_meta_form.s30', "آخر شراء")}</b>{customerSummary.lastSaleAt ? formatDate(customerSummary.lastSaleAt) : t('pos.pos_cart_panel.pos_cart_meta_form.s31', "لا يوجد")}</span>
                    <span><b>{t('pos.pos_cart_panel.pos_cart_meta_form.s32', "إجمالي المشتريات")}</b>{formatCurrency(customerSummary.totalSalesAmount)}</span>
                    <span><b>{t('pos.pos_cart_panel.pos_cart_meta_form.s33', "عدد الفواتير")}</b>{customerSummary.invoiceCount}</span>
                  </>
                ) : null}
              </div>
            </div>

            {customerSummaryQuery.isLoading ? <div className="pos-customer-summary-note">{t('pos.pos_cart_panel.pos_cart_meta_form.s34', "جاري تحميل ملخص العميل...")}</div> : null}
            {customerSummaryQuery.isError ? <div className="pos-customer-summary-note is-error">{t('pos.pos_cart_panel.pos_cart_meta_form.s35', "تعذر تحميل ملخص العميل، ويمكن إتمام البيع بشكل طبيعي.")}</div> : null}
          </div>
        ) : null}
      </div>


    </>
  );
}
