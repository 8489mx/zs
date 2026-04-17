import { useEffect, useMemo, useRef, useState } from 'react';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { PosCartPanelProps } from './posCartPanel.types';

type CustomerPickerMode = 'closed' | 'search' | 'create';

export function PosCartMetaForm(props: Pick<PosCartPanelProps,
  'customers' | 'customerId' | 'onCustomerChange' |
  'branches' | 'branchId' | 'onBranchChange' |
  'locations' | 'locationId' | 'onLocationChange' |
  'quickCustomerName' | 'quickCustomerPhone' | 'isQuickCustomerPending' |
  'onQuickCustomerSubmit' | 'onQuickCustomerNameChange' | 'onQuickCustomerPhoneChange'
>) {
  const [pickerMode, setPickerMode] = useState<CustomerPickerMode>('closed');
  const [query, setQuery] = useState('');
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const selectedCustomer = useMemo(
    () => props.customers.find((customer) => String(customer.id) === String(props.customerId)) || null,
    [props.customerId, props.customers],
  );

  const filteredCustomers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return props.customers.slice(0, 5);
    return props.customers.filter((customer) => {
      const name = String(customer.name || '').toLowerCase();
      const phone = String(customer.phone || '').toLowerCase();
      return name.includes(normalized) || phone.includes(normalized);
    }).slice(0, 5);
  }, [props.customers, query]);

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
    closeInlinePicker();
  }

  return (
    <>
      <div ref={pickerRef}>
        <div className="pos-customer-inline-bar">
          <div className={`pos-customer-inline-shell ${pickerMode === 'search' ? 'is-open' : ''}`.trim()}>
            {pickerMode === 'search' ? (
              <>
                <div className="pos-customer-inline-search-row">
                  <span className="pos-customer-trigger-label">العميل</span>
                  <input
                    ref={searchInputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="ابحث بالاسم أو رقم التليفون"
                    aria-label="ابحث بالاسم أو رقم التليفون"
                  />
                </div>

                <div className="pos-customer-inline-results" role="listbox" aria-label="نتائج العملاء">
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
                <span className="pos-customer-trigger-label">العميل</span>
                <strong>{selectedCustomer?.name || 'عميل نقدي'}</strong>
                <small>{selectedCustomer?.phone || 'ابحث بالاسم أو رقم التليفون'}</small>
              </button>
            )}
          </div>

          <Button type="button" variant="secondary" className="pos-customer-create-toggle" onClick={toggleCreateInline}>
            إضافة عميل جديد
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
