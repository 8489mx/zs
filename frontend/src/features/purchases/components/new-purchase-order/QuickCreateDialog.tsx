import { useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { useTranslation } from '../../utils/i18n-purchase-prototype';
import type { QuickCreateState, QuickCreateResult } from './newPurchaseOrder.types';

export function QuickCreateDialog({
  state,
  onCancel,
  onSubmit
}: {
  state: QuickCreateState;
  onCancel: () => void;
  onSubmit: (result: QuickCreateResult) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [productType, setProductType] = useState<'stock' | 'service'>('stock');
  const [price, setPrice] = useState('0');
  const [unit, setUnit] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [city, setCity] = useState('');
  const [supplier, setSupplier] = useState('');
  const [code, setCode] = useState('');
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const initialSnapshotRef = useRef<string>('');

  const snapshot = JSON.stringify({
    name,
    contactName,
    phone,
    taxNumber,
    notes,
    productType,
    price,
    unit,
    warehouse,
    city,
    supplier,
    code
  });
  const isDirty = snapshot !== initialSnapshotRef.current;

  useEffect(() => {
    if (!state) {
      return;
    }

    const query = state.query;
    setName(query);
    setContactName('');
    setPhone('');
    setTaxNumber('');
    setNotes('');
    setProductType('stock');
    setPrice('0');
    setUnit('');
    setWarehouse('');
    setCity('');
    setSupplier('');
    setCode('');
    setShowUnsavedConfirm(false);
    if (state.kind === 'product' && state.barcode) {
      setPrice('0');
    }
  }, [state]);

  useEffect(() => {
    if (!state) {
      return;
    }

    initialSnapshotRef.current = JSON.stringify({
      name: state.query,
      contactName: '',
      phone: '',
      taxNumber: '',
      notes: '',
      productType: 'stock',
      price: '0',
      unit: '',
      warehouse: '',
      city: '',
      supplier: '',
      code: ''
    });
  }, [state]);

  useEffect(() => {
    if (!state) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (isDirty) {
          setShowUnsavedConfirm(true);
          return;
        }
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, onCancel, state]);

  if (!state) {
    return null;
  }

  const titleMap: Record<NonNullable<QuickCreateState>['kind'], string> = {
    supplier: t('new_supplier'),
    product: t('create_new_product'),
    contact: t('new_contact'),
    address: t('new_address'),
    warehouse: t('new_warehouse'),
    category: 'قسم جديد',
    costCenter: t('new_cost_center'),
    project: t('new_project')
  };

  const submit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    if (state.kind === 'supplier') {
      onSubmit({ kind: 'supplier', name: trimmedName, contactName: contactName.trim(), phone: phone.trim(), taxNumber: taxNumber.trim(), notes: notes.trim() });
      return;
    }

    if (state.kind === 'product') {
      onSubmit({
        kind: 'product',
        name: trimmedName,
        productType,
        price: Number(price || 0),
        unit: unit.trim(),
        warehouse: warehouse.trim(),
        barcode: String(state.barcode || '').trim()
      });
      return;
    }

    if (state.kind === 'contact') {
      onSubmit({ kind: 'contact', name: trimmedName, phone: phone.trim() });
      return;
    }

    if (state.kind === 'address') {
      onSubmit({ kind: 'address', label: trimmedName, city: city.trim(), supplier: supplier.trim() });
      return;
    }

    if (state.kind === 'warehouse') {
      onSubmit({ kind: 'warehouse', name: trimmedName, code: code.trim() });
      return;
    }

    if (state.kind === 'category') {
      onSubmit({ kind: 'category', name: trimmedName, code: code.trim() });
      return;
    }

    if (state.kind === 'costCenter') {
      onSubmit({ kind: 'costCenter', name: trimmedName, code: code.trim() });
      return;
    }

    if (state.kind === 'project') {
      onSubmit({ kind: 'project', name: trimmedName, code: code.trim() });
    }
  };

  const requestClose = () => {
    if (isDirty) {
      setShowUnsavedConfirm(true);
      return;
    }

    onCancel();
  };

  return (
    <div className="purchase-prototype-create-backdrop" role="presentation" onMouseDown={requestClose}>
      <div className="purchase-prototype-create-card" role="dialog" aria-modal="true" aria-labelledby="purchase-prototype-create-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="purchase-prototype-create-header">
          <div>
            <h4 id="purchase-prototype-create-title">{titleMap[state.kind]}</h4>
            <p>{t('local_use_only')}</p>
          </div>
          <button type="button" className="purchase-prototype-create-close" aria-label={t("close")} onClick={requestClose}>
            ×
          </button>
        </div>

        <div className="purchase-prototype-create-grid">
          <Field label={state.kind === 'product' ? t('product_name') : state.kind === 'address' ? t('shipping_address') : t('name')}>
            <input className="purchase-prototype-create-input" value={name} onChange={(event) => setName(event.target.value)} placeholder={state.query} />
          </Field>

          {state.kind === 'supplier' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label={t("contact_person" as any) || "اسم المسئول"}><input className="purchase-prototype-create-input" value={contactName} onChange={(event) => setContactName(event.target.value)} /></Field>
                <Field label={t("phone_number")}><input className="purchase-prototype-create-input" value={phone} onChange={(event) => setPhone(event.target.value)} /></Field>
              </div>
              <Field label={t("tax_number")}><input className="purchase-prototype-create-input" value={taxNumber} onChange={(event) => setTaxNumber(event.target.value)} /></Field>
              <Field label={t('notes_section')}><textarea className="purchase-prototype-create-textarea" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
            </>
          ) : null}

          {state.kind === 'product' ? (
            <>
              <Field label={t("product_type")}>
                <select className="purchase-prototype-create-select" value={productType} onChange={(event) => setProductType(event.target.value as 'stock' | 'service')}>
                  <option value="stock">{t("stock_type")}</option>
                  <option value="service">{t("service_type")}</option>
                </select>
              </Field>
              <Field label={t("barcode")}>
                <input className="purchase-prototype-create-input" value={state.barcode ?? ''} readOnly disabled placeholder={t("optional")} />
              </Field>
              <Field label={t('price_title')}><input className="purchase-prototype-create-input" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} /></Field>
              <Field label={t("unit")}><input className="purchase-prototype-create-input" value={unit} onChange={(event) => setUnit(event.target.value)} /></Field>
              <Field label={t("default_warehouse")}><input className="purchase-prototype-create-input" value={warehouse} onChange={(event) => setWarehouse(event.target.value)} disabled={productType === 'service'} /></Field>
            </>
          ) : null}

          {state.kind === 'contact' ? <Field label={t("phone_number")}><input className="purchase-prototype-create-input" value={phone} onChange={(event) => setPhone(event.target.value)} /></Field> : null}
          {state.kind === 'address' ? (
            <>
              <Field label={t("city")}><input className="purchase-prototype-create-input" value={city} onChange={(event) => setCity(event.target.value)} /></Field>
              <Field label={t("supplier_company")}><input className="purchase-prototype-create-input" value={supplier} onChange={(event) => setSupplier(event.target.value)} /></Field>
            </>
          ) : null}
          {(state.kind === 'warehouse' || state.kind === 'category' || state.kind === 'costCenter' || state.kind === 'project') ? (
            <Field label={t("code")}><input className="purchase-prototype-create-input" value={code} onChange={(event) => setCode(event.target.value)} /></Field>
          ) : null}
        </div>

        <div className="purchase-prototype-create-actions">
          <Button variant="secondary" type="button" onClick={requestClose}>{t('cancel')}</Button>
          <Button type="button" onClick={submit}>{t('create_and_select')}</Button>
        </div>
      </div>
      {showUnsavedConfirm ? (
        <div className="purchase-prototype-create-confirm" role="dialog" aria-modal="true" aria-labelledby="purchase-prototype-confirm-title" onMouseDown={(event) => event.stopPropagation()}>
          <h4 id="purchase-prototype-confirm-title">{t('unsaved_changes_title')}</h4>
          <div className="purchase-prototype-create-confirm-actions">
            <Button variant="secondary" type="button" onClick={() => setShowUnsavedConfirm(false)}>{t('cancel')}</Button>
            <Button type="button" onClick={() => { setShowUnsavedConfirm(false); onCancel(); }}>{t('ok')}</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
