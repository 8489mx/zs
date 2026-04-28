import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { posApi } from '@/features/pos/api/pos.api';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { formatCurrency, formatDate } from '@/lib/format';
import type { PosCartPanelProps } from './posCartPanel.types';

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
  'branches' | 'branchId' | 'onBranchChange' |
  'locations' | 'locationId' | 'onLocationChange' |
  'quickCustomerName' | 'quickCustomerPhone' | 'isQuickCustomerPending' |
  'onQuickCustomerSubmit' | 'onQuickCustomerNameChange' | 'onQuickCustomerPhoneChange'
>) {
  const [pickerMode, setPickerMode] = useState<CustomerPickerMode>('closed');
  const [query, setQuery] = useState('');
  const [recentCustomerIds, setRecentCustomerIds] = useState(readRecentCustomerIds);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const selectedCustomer = useMemo(
    () => props.customers.find((customer) => String(customer.id) === String(props.customerId)) || null,
    [props.customerId, props.customers],
  );
  const selectedCustomerId = selectedCustomer ? String(selectedCustomer.id) : '';
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

  const filteredCustomers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matches = normalized ? props.customers.filter((customer) => {
      const name = String(customer.name || '').toLowerCase();
      const phone = String(customer.phone || '').toLowerCase();
      const id = String(customer.id || '').toLowerCase();
      const type = String(customer.type || '').toLowerCase();
      return name.includes(normalized) || phone.includes(normalized) || id.includes(normalized) || type.includes(normalized);
    }) : props.customers;

    if (normalized) return matches.slice(0, 5);

    const recent = recentCustomerIds
      .map((id) => matches.find((customer) => String(customer.id) === id))
      .filter((customer): customer is typeof matches[number] => Boolean(customer));
    const recentSet = new Set(recent.map((customer) => String(customer.id)));
    return [...recent, ...matches.filter((customer) => !recentSet.has(String(customer.id)))].slice(0, 5);
  }, [props.customers, query, recentCustomerIds]);

  useEffect(() => {
    if (pickerMode !== 'search') return;
    const frame = window.requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [pickerMode]);

  useEffect(() => {
    if (pickerMode === 'closed' || typeof document === 'undefined') return undefined;

    function handlePointerDown(event: PointerEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setPickerMode('closed');
        setQuery('');
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPickerMode('closed');
        setQuery('');
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
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
    props.onCustomerChange(id);
    if (id) {
      const nextRecentIds = [id, ...recentCustomerIds.filter((recentId) => recentId !== id)].slice(0, 5);
      setRecentCustomerIds(nextRecentIds);
      storeRecentCustomerIds(nextRecentIds);
    }
    closeInlinePicker();
  }

  function removeCustomer() {
    props.onCustomerChange('');
    closeInlinePicker();
  }

  return (
    <>
      <div ref={pickerRef} className={`pos-customer-meta-panel ${pickerMode !== 'closed' ? 'is-expanded' : ''}`.trim()}>
        <div className="pos-customer-inline-bar">
          <div className={`pos-customer-inline-shell ${pickerMode === 'search' ? 'is-open' : ''}`.trim()}>
            {pickerMode === 'search' ? (
              <>
                <div className="pos-customer-inline-search-row">
                  <span className="pos-customer-trigger-label">اختيار عميل</span>
                  <input
                    ref={searchInputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="ابحث بالاسم أو الهاتف"
                    aria-label="ابحث بالاسم أو الهاتف"
                  />
                </div>

                <div className="pos-customer-inline-results" role="listbox" aria-label="نتائج العملاء">
                  {!query.trim() ? <div className="pos-customer-results-label">{recentCustomerIds.length ? 'آخر العملاء' : 'اختيارات سريعة'}</div> : null}
                  <button
                    type="button"
                    className={`pos-customer-result ${!props.customerId ? 'is-active' : ''}`.trim()}
                    onClick={() => selectCustomer('')}
                  >
                    <div>
                      <strong>عميل نقدي</strong>
                      <span className="muted small">بدون ربط الفاتورة بحساب عميل</span>
                    </div>
                  </button>

                  {filteredCustomers.length ? filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      className={`pos-customer-result ${String(customer.id) === String(props.customerId) ? 'is-active' : ''}`.trim()}
                      onClick={() => selectCustomer(String(customer.id))}
                    >
                      <div>
                        <strong>{customer.name}</strong>
                        <span className="muted small">{customer.phone || 'بدون رقم تليفون'}</span>
                      </div>
                    </button>
                  )) : (
                    <div className="surface-note pos-customer-inline-empty">لا توجد نتائج مطابقة الآن.</div>
                  )}
                </div>
              </>
            ) : (
              <button type="button" className="pos-customer-trigger" onClick={openSearchInline}>
                <span className="pos-customer-trigger-label">اختيار عميل</span>
                <strong>{selectedCustomer?.name || 'عميل نقدي'}</strong>
                <small>{selectedCustomer?.phone || 'ابحث بالاسم أو الهاتف'}</small>
              </button>
            )}
          </div>

          <Button type="button" variant="secondary" className="pos-customer-create-toggle" onClick={toggleCreateInline}>
            إضافة عميل
          </Button>
        </div>

        {pickerMode === 'create' ? (
          <form className="pos-customer-inline-create" onSubmit={props.onQuickCustomerSubmit}>
            <div className="inline-create-grid pos-inline-create-grid-compact">
              <Field label="اسم العميل">
                <input
                  value={props.quickCustomerName}
                  onChange={(event) => props.onQuickCustomerNameChange(event.target.value)}
                  placeholder="اسم العميل"
                  disabled={props.isQuickCustomerPending}
                  autoFocus
                />
              </Field>
              <Field label="رقم التليفون">
                <input
                  value={props.quickCustomerPhone}
                  onChange={(event) => props.onQuickCustomerPhoneChange(event.target.value)}
                  placeholder="اختياري"
                  disabled={props.isQuickCustomerPending}
                />
              </Field>
            </div>
            <div className="actions compact-actions pos-customer-create-actions">
              <Button type="submit" variant="primary" disabled={props.isQuickCustomerPending || !props.quickCustomerName.trim()}>
                {props.isQuickCustomerPending ? 'جارٍ الإضافة...' : 'حفظ العميل'}
              </Button>
            </div>
          </form>
        ) : null}

        {selectedCustomer ? (
          <div className="pos-selected-customer-card" aria-label="ملخص العميل المختار">
            <div className="pos-selected-customer-main">
              <div>
                <span>العميل الحالي</span>
                <strong>{selectedCustomer.name}</strong>
                <small>{selectedCustomer.phone || 'بدون رقم هاتف'} · {selectedCustomer.type === 'vip' ? 'عميل مهم' : 'عميل نقدي'}</small>
              </div>
              <Button type="button" variant="secondary" className="pos-selected-customer-remove" onClick={removeCustomer}>
                إزالة العميل
              </Button>
            </div>

            {customerRiskHint ? <div className="pos-customer-risk-hint">{customerRiskHint}</div> : null}

            <div className="pos-selected-customer-metrics">
              <span><b>رصيد العميل</b>{formatCurrency(customerBalance)}</span>
              <span><b>حد الائتمان</b>{formatCurrency(creditLimit)}</span>
              {remainingCredit !== null ? <span><b>المتاح</b>{formatCurrency(remainingCredit)}</span> : null}
              {storeCreditBalance ? <span><b>رصيد المتجر</b>{formatCurrency(storeCreditBalance)}</span> : null}
              {customerSummary ? (
                <>
                  <span><b>آخر شراء</b>{customerSummary.lastSaleAt ? formatDate(customerSummary.lastSaleAt) : 'لا يوجد'}</span>
                  <span><b>إجمالي المشتريات</b>{formatCurrency(customerSummary.totalSalesAmount)}</span>
                  <span><b>عدد الفواتير</b>{customerSummary.invoiceCount}</span>
                </>
              ) : null}
            </div>

            {customerSummaryQuery.isLoading ? <div className="pos-customer-summary-note">جاري تحميل ملخص العميل...</div> : null}
            {customerSummaryQuery.isError ? <div className="pos-customer-summary-note is-error">تعذر تحميل ملخص العميل، ويمكن إتمام البيع بشكل طبيعي.</div> : null}
          </div>
        ) : null}
      </div>

      {!SINGLE_STORE_MODE && (props.branches.length > 1 || props.locations.length > 1) ? (
        <div className="three-column-grid compact-fields pos-meta-grid pos-meta-grid-compact pos-meta-grid-aux">
          {props.branches.length > 1 ? (
            <Field label="الفرع">
              <select value={props.branchId} onChange={(event) => props.onBranchChange(event.target.value)}>
                <option value="">اختر الفرع</option>
                {props.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </Field>
          ) : null}
          {props.locations.length > 1 ? (
            <Field label="المخزن">
              <select value={props.locationId} onChange={(event) => props.onLocationChange(event.target.value)}>
                <option value="">اختر المخزن</option>
                {props.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
            </Field>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
