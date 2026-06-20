import { useEffect, useMemo, useRef, useState } from 'react';
import { usePurchaseComposerCatalog } from '@/features/purchases/hooks/usePurchaseComposerCatalog';
import imageCompression from 'browser-image-compression';
import { useCreatePurchaseMutation } from '@/features/purchases/hooks/useCreatePurchaseMutation';
import { purchasesApi } from '@/features/purchases/api/purchases.api';
import { useNavigate, Link } from 'react-router-dom';

import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { useAuthStore } from '@/stores/auth-store';
import { AppAccountMenu } from '@/shared/layout/app-account-menu';
import { useAppToolbar } from '@/stores/toolbar-store';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';
import { useTranslation } from '../utils/i18n-purchase-prototype';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';

type PrototypeLine = {
  id: number;
  productId: string | null;
  itemName: string;
  qty: number;
  unitPrice: number;
  warehouse: string;
  isService?: boolean;
};



const formatMoney = (value: number, lang?: string) => `${value.toFixed(2)} ${lang === 'en' ? 'EGP' : 'ج.م'}`;

type SupplierOption = {
  id: string;
  name: string;
  code: string;
  phone: string;
  taxNumber: string;
  contactName?: string;
  shippingAddress?: string;
  company?: string;
  balance?: number;
};

type ContactOption = {
  id: string;
  name: string;
  phone: string;
  supplierName?: string;
};

type AddressOption = {
  id: string;
  label: string;
  city: string;
  supplierName?: string;
};

type ProductOption = {
  id: string;
  name: string;
  englishName?: string;
  code: string;
  sku?: string;
  barcode?: string;
  price: number;
  warehouse: string;
  type: 'stock' | 'service';
};

type WarehouseOption = {
  id: string;
  name: string;
  code: string;
};

type CostCenterOption = {
  id: string;
  name: string;
  code: string;
};

type ProjectOption = {
  id: string;
  name: string;
  code: string;
};

type QuickCreateState =
  | { kind: 'supplier'; query: string }
  | { kind: 'product'; query: string; lineId: number | null; barcode?: string }
  | { kind: 'contact'; query: string }
  | { kind: 'address'; query: string }
  | { kind: 'warehouse'; query: string; lineId: number | null }
  | { kind: 'costCenter'; query: string }
  | { kind: 'project'; query: string }
  | null;













const normalizeSearchText = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[٠-٩۰-۹]/g, (digit) => {
      const digits = '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹';
      const latin = '01234567890123456789';
      const index = digits.indexOf(digit);
      return index >= 0 ? latin[index] : digit;
    })
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const includesNormalized = (source: string, query: string) => normalizeSearchText(source).includes(normalizeSearchText(query));

const normalizeNumericText = (value: string) =>
  value
    .replace(/[٠-٩۰-۹]/g, (digit) => {
      const digits = '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹';
      const latin = '01234567890123456789';
      const index = digits.indexOf(digit);
      return index >= 0 ? latin[index] : digit;
    })
    .replace(/[٫،,]/g, '.')
    .replace(/٬/g, '')
    .trim();

const parseLocalizedNumber = (value: string) => {
  const normalized = normalizeNumericText(value).replace(/,/g, '');
  if (!normalized) {
    return NaN;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
};

type DocumentStatus = 'draft' | 'confirmed';

type PurchasePrototypeDraft = {
  supplier: string;
  date: string;
  requiredDate: string;
  currency: string;
  company: string;
  contact: string;
  shippingAddress: string;
  taxRate: number;
  discount: number;
  discountMode: 'percent' | 'value';
  customTaxRate: string;
  costCenter: string;
  project: string;
  termsTemplate: string;
  notes: string;
  lines: PrototypeLine[];
  suppliers: SupplierOption[];
  contactsList: ContactOption[];
  addressesList: AddressOption[];
  products: ProductOption[];
  warehouses: WarehouseOption[];
  costCenters: CostCenterOption[];
  projects: ProjectOption[];
  status: DocumentStatus;
};

type ValidationRowErrors = Partial<Record<'product' | 'qty' | 'price' | 'warehouse', string>>;

type ValidationErrors = {
  supplier?: string;
  date?: string;
  requiredDate?: string;
  currency?: string;
  rows: Record<number, ValidationRowErrors>;
};

type InlineMessageTone = 'success' | 'error' | 'info';

const PURCHASE_DRAFT_STORAGE_KEY = 'purchase-new-prototype-draft';

type QuickCreateResult =
  | { kind: 'supplier'; name: string; contactName?: string; phone?: string; taxNumber?: string; notes?: string }
  | { kind: 'product'; name: string; productType: 'stock' | 'service'; price?: number; unit?: string; warehouse?: string; barcode?: string }
  | { kind: 'contact'; name: string; phone?: string }
  | { kind: 'address'; label: string; city?: string; supplier?: string }
  | { kind: 'warehouse'; name: string; code?: string }
  | { kind: 'costCenter'; name: string; code?: string }
  | { kind: 'project'; name: string; code?: string };

function QuickCreateDialog({
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
                <Field label={t("supplier" as any) || "اسم المسئول"}><input className="purchase-prototype-create-input" value={contactName} onChange={(event) => setContactName(event.target.value)} /></Field>
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
          {(state.kind === 'warehouse' || state.kind === 'costCenter' || state.kind === 'project') ? (
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

function BarcodeScanDialog({
  open,
  query,
  products,
  onClose,
  onScan,
  onOpenQuickCreate,
}: {
  open: boolean;
  query: string;
  products: ProductOption[];
  onClose: () => void;
  onScan: (barcode: string) => void;
  onOpenQuickCreate: (barcode: string) => void;
}) {
  const { t } = useTranslation();
  const [barcode, setBarcode] = useState(query);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setBarcode(query);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        onScan(barcode);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [barcode, onClose, onScan, open]);

  if (!open) return null;

  const matched = products.find((product) => product.barcode === barcode.trim());

  return (
    <div className="purchase-prototype-create-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="purchase-prototype-create-card" role="dialog" aria-modal="true" aria-labelledby="purchase-prototype-barcode-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="purchase-prototype-create-header">
          <div>
            <h4 id="purchase-prototype-barcode-title">{t('scan_barcode_title')}</h4>
            <p>{t('scan_barcode_desc')}</p>
          </div>
          <button type="button" className="purchase-prototype-create-close" aria-label={t("close")} onClick={onClose}>×</button>
        </div>
        <div className="purchase-prototype-create-grid">
          <Field label={t("barcode")}>
            <input className="purchase-prototype-create-input" ref={inputRef} value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="622100001" />
          </Field>
          <div className="muted small">{t('test_barcode_notice')}</div>
          {matched ? <div className="success-box">{t('found_item')} <strong>{matched.name}</strong></div> : barcode.trim() ? <div className="error-box">{t('item_not_found')}</div> : null}
        </div>
        <div className="purchase-prototype-create-actions">
          <Button variant="secondary" type="button" onClick={onClose}>{t('cancel')}</Button>
          {matched ? (
            <Button type="button" onClick={() => onScan(barcode)}>{t('add_to_item')}</Button>
          ) : (
            <Button type="button" onClick={() => onOpenQuickCreate(barcode)}>{t('create_new_item_with_barcode')}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

const searchSupplier = (supplier: SupplierOption, query: string) => {
  if (!normalizeSearchText(query)) {
    return true;
  }

  return [supplier.name, supplier.code, supplier.phone, supplier.taxNumber, supplier.company ?? '', supplier.contactName ?? '', supplier.shippingAddress ?? ''].some((value) => includesNormalized(value, query));
};

const searchContact = (contact: ContactOption, query: string) => {
  if (!normalizeSearchText(query)) {
    return true;
  }

  return [contact.name, contact.phone, contact.supplierName ?? ''].some((value) => includesNormalized(value, query));
};

// @ts-expect-error unused function
const searchAddress = (address: AddressOption, query: string) => {
  if (!normalizeSearchText(query)) {
    return true;
  }

  return [address.label, address.city, address.supplierName ?? ''].some((value) => includesNormalized(value, query));
};

const searchProduct = (product: ProductOption, query: string) => {
  if (!normalizeSearchText(query)) {
    return true;
  }

  return [product.name, product.englishName ?? '', product.code, product.sku ?? '', product.barcode ?? ''].some((value) => includesNormalized(value, query));
};

const searchWarehouse = (warehouse: any, query: string) => {
  if (!normalizeSearchText(query)) {
    return true;
  }

  return [warehouse.name, warehouse.code].some((value) => includesNormalized(value, query));
};

const searchCostCenter = (costCenter: CostCenterOption, query: string) => {
  if (!normalizeSearchText(query)) {
    return true;
  }

  return [costCenter.name, costCenter.code].some((value) => includesNormalized(value, query));
};

const searchProject = (project: ProjectOption, query: string) => {
  if (!normalizeSearchText(query)) {
    return true;
  }

  return [project.name, project.code].some((value) => includesNormalized(value, query));
};
export function NewPurchaseOrderPage() {
  const { t, language } = useTranslation();
  // @ts-expect-error unused variable
  const { theme, updateSessionMeta } = useAuthStore();
  const isDarkMode = theme === 'dark';
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const [activeQuickAction, setActiveQuickAction] = useState<'tax' | 'discount' | null>(null);
  const [discountMode, setDiscountMode] = useState<'percent' | 'value'>('value');
  const [customTaxRate, setCustomTaxRate] = useState('14');
  const [pendingFocusLineId, setPendingFocusLineId] = useState<number | null>(null);
  const [lines, setLines] = useState<PrototypeLine[]>([{ id: Date.now(), productId: null, itemName: '', qty: 1, unitPrice: 0, warehouse: '' }]);
  const [supplier, setSupplier] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [requiredDate, setRequiredDate] = useState(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [currency, setCurrency] = useState('');
  const [company, setCompany] = useState('');
  const [contact, setContact] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [taxRate, setTaxRate] = useState(14);
  const [discount, setDiscount] = useState(0);
  const [costCenter, setCostCenter] = useState('');
  const [project, setProject] = useState('');
  const [termsTemplate, setTermsTemplate] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFocusQtyLineId, setPendingFocusQtyLineId] = useState<number | null>(null);

  const [quickCreateState, setQuickCreateState] = useState<QuickCreateState>(null);
  const [barcodeScanOpen, setBarcodeScanOpen] = useState(false);
  const [barcodeScanQuery, setBarcodeScanQuery] = useState('');
  const navigate = useNavigate();
  const catalog = usePurchaseComposerCatalog();
  const createMutation = useCreatePurchaseMutation(() => {
    navigate('/purchases');
  });

  const rawSettings = catalog.settingsQuery.data;
  const rawSuppliers = catalog.suppliersQuery.data || [];
  const rawProducts = catalog.productsQuery.data || [];
  const rawLocations = catalog.locationsQuery.data || [];
  const rawBranches = catalog.branchesQuery.data || [];

  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);

  useEffect(() => {
    if (rawSuppliers.length) {
      setSuppliers(rawSuppliers.map((s: any) => ({
        id: s.id.toString(),
        name: s.name,
        code: s.code || '',
        phone: s.phone || '',
        taxNumber: s.taxNumber || '',
        contactName: s.primaryContactName || '',
        balance: s.balance || 0
      })));
    }
  }, [rawSuppliers]);

  useEffect(() => {
    if (rawProducts.length) {
      setProducts(rawProducts.map((p: any) => ({
        id: p.id.toString(),
        name: p.name,
        englishName: p.englishName || p.name,
        code: p.styleCode || '',
        barcode: p.barcode || '',
        price: p.costPrice || 0,
        warehouse: '',
        type: p.itemKind === 'service' ? 'service' : 'stock'
      })));
    }
  }, [rawProducts]);

  useEffect(() => {
    if (rawLocations.length) {
      setWarehouses(rawLocations.map((l: any) => ({
        id: l.id.toString(),
        name: l.name,
        code: l.code || ''
      })));
    }
  }, [rawLocations]);

  const deliveryDestinations = useMemo(() => {
    const destinations: WarehouseOption[] = [];
    if (rawBranches.length) {
      destinations.push(...rawBranches.map((b: any) => ({
        id: `branch_${b.id}`,
        name: `[فرع] ${b.name}`,
        code: b.code || ''
      })));
    }
    if (rawLocations.length) {
      destinations.push(...rawLocations.map((l: any) => ({
        id: `wh_${l.id}`,
        name: `[مخزن] ${l.name}`,
        code: l.code || ''
      })));
    }
    return destinations;
  }, [rawBranches, rawLocations]);

  // Load default currency from system settings
  useEffect(() => {
    if (rawSettings?.currency && !currency) {
      setCurrency(rawSettings.currency);
    }
  }, [rawSettings?.currency, currency]);

  const [costCenters, setCostCenters] = useState<CostCenterOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [contactsList, setContactsList] = useState<ContactOption[]>([]);
  const [addressesList, setAddressesList] = useState<AddressOption[]>([]);

  useEffect(() => {
    if (catalog.costCentersQuery.data && costCenters.length === 0) {
      setCostCenters(catalog.costCentersQuery.data.map((cc: any) => ({ id: String(cc.id), name: cc.name, code: cc.code })));
    }
  }, [catalog.costCentersQuery.data, costCenters.length]);

  useEffect(() => {
    if (catalog.projectsQuery.data && projects.length === 0) {
      setProjects(catalog.projectsQuery.data.map((p: any) => ({ id: String(p.id), name: p.name, code: p.code })));
    }
  }, [catalog.projectsQuery.data, projects.length]);

  useEffect(() => {
    if (!supplier) {
      setContactsList([]);
      setAddressesList([]);
      return;
    }
    const load = async () => {
      try {
        const { accountsApi } = await import('@/features/accounts/api/accounts.api');
        const contacts = await accountsApi.partnerContacts('supplier', supplier);
        setContactsList(contacts.map((c: any) => ({ id: String(c.id), name: c.name, phone: c.phone || '' })));
      } catch (err) {
        console.error('Failed to load supplier contacts', err);
      }
    };
    load();
  }, [supplier]);

  const supplierInputRef = useRef<HTMLInputElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const requiredDateInputRef = useRef<HTMLInputElement | null>(null);
  const currencyInputRef = useRef<HTMLInputElement | null>(null);
  const contactInputRef = useRef<HTMLInputElement | null>(null);
  const shippingInputRef = useRef<HTMLInputElement | null>(null);
  const costCenterInputRef = useRef<HTMLInputElement | null>(null);
  const projectInputRef = useRef<HTMLInputElement | null>(null);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const hasLoadedDraftRef = useRef(false);
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus>('draft');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({ rows: {} });
  const [inlineMessage, setInlineMessage] = useState<{ tone: InlineMessageTone; text: string } | null>(null);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const purchaseDropdownClassName = isDarkMode
    ? 'purchase-new-prototype-dropdown purchase-new-prototype-dropdown-dark'
    : 'purchase-new-prototype-dropdown';

  const setLineError = (lineId: number, key: keyof ValidationRowErrors, message: string | undefined) => {
    setValidationErrors((current) => {
      const nextRows = { ...current.rows };
      const row = { ...(nextRows[lineId] ?? {}) };
      if (message) {
        row[key] = message;
      } else {
        delete row[key];
      }

      if (Object.keys(row).length) {
        nextRows[lineId] = row;
      } else {
        delete nextRows[lineId];
      }

      return { ...current, rows: nextRows };
    });
  };

  const clearLineErrors = (lineId: number) => {
    setValidationErrors((current) => {
      if (!current.rows[lineId]) {
        return current;
      }

      const nextRows = { ...current.rows };
      delete nextRows[lineId];
      return { ...current, rows: nextRows };
    });
  };

  const clearDocumentFieldError = (field: keyof Omit<ValidationErrors, 'rows'>) => {
    setValidationErrors((current) => {
      if (!current[field]) {
        return current;
      }

      return { ...current, [field]: undefined };
    });
  };

  const markDocumentDirty = () => {
    if (documentStatus === 'confirmed') {
      setDocumentStatus('draft');
    }
    setInlineMessage(null);
  };

  const buildDraftPayload = (status: DocumentStatus): PurchasePrototypeDraft => ({
    supplier,
    date,
    requiredDate,
    currency,
    company,
    contact,
    shippingAddress,
    taxRate,
    discount,
    discountMode,
    customTaxRate,
    costCenter,
    project,
    termsTemplate,
    notes,
    lines,
    suppliers,
    contactsList,
    addressesList,
    products,
    warehouses,
    costCenters,
    projects,
    status
  });

  const saveDraftToStorage = (status: DocumentStatus) => {
    const payload = buildDraftPayload(status);
    window.localStorage.setItem(PURCHASE_DRAFT_STORAGE_KEY, JSON.stringify(payload));
    lastSavedSnapshotRef.current = JSON.stringify(payload);
    setDocumentStatus(status);
  };

  const restoreDraftFromStorage = (payload: PurchasePrototypeDraft) => {
    setSupplier(payload.supplier);
    setDate(payload.date);
    setRequiredDate(payload.requiredDate);
    setCurrency(payload.currency);
    setCompany(payload.company);
    setContact(payload.contact);
    setShippingAddress(payload.shippingAddress);
    setTaxRate(payload.taxRate);
    setDiscount(payload.discount);
    setDiscountMode(payload.discountMode);
    setCustomTaxRate(payload.customTaxRate);
    setCostCenter(payload.costCenter);
    setProject(payload.project);
    setTermsTemplate(payload.termsTemplate);
    setNotes(payload.notes);
    setLines(payload.lines);
    setSuppliers(payload.suppliers);
    setContactsList(payload.contactsList);
    setAddressesList(payload.addressesList);
    setProducts(payload.products);
    setWarehouses(payload.warehouses);
    setCostCenters(payload.costCenters);
    setProjects(payload.projects);
    setDocumentStatus(payload.status);
    lastSavedSnapshotRef.current = JSON.stringify(payload);
  };

  const computeHasMeaningfulData = () =>
    Boolean(
      supplier.trim() ||
        date.trim() ||
        requiredDate.trim() ||
        currency.trim() ||
        company.trim() ||
        contact.trim() ||
        shippingAddress.trim() ||
        costCenter.trim() ||
        project.trim() ||
        termsTemplate.trim() ||
        notes.trim() ||
        lines.some((line) => Boolean(line.productId || line.itemName.trim() || line.qty !== 1 || line.unitPrice !== 0 || line.warehouse.trim()))
    );

  const subtotal = useMemo(() => lines.reduce((acc, line) => acc + line.qty * line.unitPrice, 0), [lines]);
  const discountAmount = discountMode === 'percent' ? (subtotal * discount) / 100 : discount;
  const taxableBase = Math.max(subtotal - discountAmount, 0);
  const tax = useMemo(() => (taxableBase * taxRate) / 100, [taxableBase, taxRate]);
  const total = taxableBase + tax;

  const selectedSupplierStats = useMemo(() => {
    if (!supplier) return { ordersCount: 0, balance: 0 };
    
    const matchedSupplier = suppliers.find(s => s.name === supplier);
    const balance = matchedSupplier?.balance || 0;
    
    const rawPurchases = (catalog.purchasesQuery?.data as any)?.rows || catalog.purchasesQuery?.data || [];
    const ordersCount = Array.isArray(rawPurchases) 
      ? rawPurchases.filter((p: any) => p.supplier?.name === supplier || p.supplierName === supplier).length
      : 0;

    return { ordersCount, balance };
  }, [supplier, suppliers, catalog.purchasesQuery?.data]);

  const addLine = () => {
    const newLineId = Date.now();
    markDocumentDirty();
    setLines((current) => [...current, { id: newLineId, productId: null, itemName: '', qty: 1, unitPrice: 0, warehouse: '' }]);
    setPendingFocusLineId(newLineId);
  };

  const addProductLine = () => {
    markDocumentDirty();
    openQuickCreate('product', '');
  };

  const handleBarcodeScanAction = () => {
    setBarcodeScanQuery('');
    setBarcodeScanOpen(true);
  };

  const addServiceLine = () => {
    markDocumentDirty();
    setLines((current) => [
      ...current,
      {
        id: Date.now() + 2,
        productId: null,
        itemName: 'Additional Service',
        qty: 1,
        unitPrice: 0,
        warehouse: 'Does not affect stock',
        isService: true
      }
    ]);
  };

  const removeLine = (id: number) => {
    markDocumentDirty();
    setLines((current) => current.filter((line) => line.id !== id));
    clearLineErrors(id);
  };

  const updateLine = (id: number, key: keyof PrototypeLine, value: string | number) => {
    markDocumentDirty();
    setLines((current) => current.map((line) => (line.id === id ? { ...line, [key]: value } : line)));
  };
  const createEntityId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;

  const handleSupplierSelect = (option: SupplierOption) => {
    markDocumentDirty();
    clearDocumentFieldError('supplier');
    setSupplier(option.name);
    if (option.company) {
      setCompany(option.company);
    }
    if (option.contactName) {
      setContact(option.contactName);
    }
    if (option.shippingAddress) {
      setShippingAddress(option.shippingAddress);
    }
    window.requestAnimationFrame(() => contactInputRef.current?.focus());
  };

  const handleContactSelect = (option: ContactOption) => {
    markDocumentDirty();
    setContact(option.name);
    if (option.supplierName) {
      setSupplier(option.supplierName);
    }
  };

  const handleAddressSelect = (option: AddressOption) => {
    markDocumentDirty();
    setShippingAddress(option.label);
    if (option.supplierName) {
      setSupplier(option.supplierName);
    }
  };

  const handleWarehouseSelect = (lineId: number, option: WarehouseOption) => {
    markDocumentDirty();
    setLineError(lineId, 'warehouse', undefined);
    updateLine(lineId, 'warehouse', option.name);
  };

  const handleCostCenterSelect = (option: CostCenterOption) => {
    markDocumentDirty();
    setCostCenter(option.name);
  };

  const handleProjectSelect = (option: ProjectOption) => {
    markDocumentDirty();
    setProject(option.name);
  };

  const handleProductSelect = (lineId: number, option: ProductOption) => {
    markDocumentDirty();
    setLineError(lineId, 'product', undefined);
    setLines((current) =>
      current.map((line) => {
        if (line.id !== lineId) {
          return line;
        }

        return {
          ...line,
          productId: option.id,
          itemName: option.name,
          qty: line.qty > 0 ? line.qty : 1,
          unitPrice: option.price,
          warehouse: option.type === 'service' ? 'Does not affect stock' : option.warehouse,
          isService: option.type === 'service'
        };
      })
    );
    setPendingFocusQtyLineId(lineId);
  };

  const addProductAsLine = (option: ProductOption) => {
    const newLineId = Date.now();
    markDocumentDirty();
    setLines((current) => [
      ...current,
      {
        id: newLineId,
        productId: option.id,
        itemName: option.name,
        qty: 1,
        unitPrice: option.price,
        warehouse: option.type === 'service' ? 'Does not affect stock' : option.warehouse,
        isService: option.type === 'service'
      }
    ]);
    setPendingFocusQtyLineId(newLineId);
  };

  const incrementProductByBarcode = (barcode: string) => {
    const normalized = String(barcode || '').trim();
    if (!normalized) {
      return;
    }

    const matched = products.find((product) => product.barcode === normalized);
    if (!matched) {
      setBarcodeScanQuery(normalized);
      setBarcodeScanOpen(true);
      return;
    }

    markDocumentDirty();
    setLines((current) => {
      const existing = current.find((line) => line.productId === matched.id);
      if (existing) {
        return current.map((line) => (line.id === existing.id ? { ...line, qty: line.qty + 1 } : line));
      }
      return [
        ...current,
        {
          id: Date.now(),
          productId: matched.id,
          itemName: matched.name,
          qty: 1,
          unitPrice: matched.price,
          warehouse: matched.type === 'service' ? 'Does not affect stock' : matched.warehouse,
          isService: matched.type === 'service'
        }
      ];
    });
  };

  const handleQuickCreateSubmit = (result: QuickCreateResult) => {
    markDocumentDirty();
    if (result.kind === 'supplier') {
      const createdSupplier: SupplierOption = {
        id: createEntityId('sup'),
        name: result.name,
        code: `SUP-${suppliers.length + 1}`,
        phone: result.phone ?? '',
        taxNumber: result.taxNumber ?? '',
        contactName: result.contactName ?? '',
        shippingAddress: '',
        company: company
      };
      setSuppliers((items) => [...items, createdSupplier]);
      handleSupplierSelect(createdSupplier);
      if (result.contactName) {
        setContact(result.contactName);
      }
    }

    if (result.kind === 'contact') {
      const createdContact: ContactOption = {
        id: createEntityId('con'),
        name: result.name,
        phone: result.phone ?? ''
      };
      setContactsList((items) => [...items, createdContact]);
      handleContactSelect(createdContact);
    }

    if (result.kind === 'address') {
      const createdAddress: AddressOption = {
        id: createEntityId('addr'),
        label: result.label,
        city: result.city ?? ''
      };
      setAddressesList((items) => [...items, createdAddress]);
      handleAddressSelect(createdAddress);
    }

    if (result.kind === 'warehouse') {
      const createdWarehouse: WarehouseOption = {
        id: createEntityId('wh'),
        name: result.name,
        code: result.code ?? `WH-${warehouses.length + 1}`
      };
      setWarehouses((items) => [...items, createdWarehouse]);
    }

    if (result.kind === 'costCenter') {
      const createdCostCenter: CostCenterOption = {
        id: createEntityId('cc'),
        name: result.name,
        code: result.code ?? `CC-${costCenters.length + 1}`
      };
      setCostCenters((items) => [...items, createdCostCenter]);
      handleCostCenterSelect(createdCostCenter);
    }

    if (result.kind === 'project') {
      const createdProject: ProjectOption = {
        id: createEntityId('prj'),
        name: result.name,
        code: result.code ?? `PRJ-${projects.length + 1}`
      };
      setProjects((items) => [...items, createdProject]);
      handleProjectSelect(createdProject);
    }

    if (result.kind === 'product') {
      const createdProduct: ProductOption = {
        id: createEntityId('prd'),
        name: result.name,
        englishName: result.name,
        code: `PRD-${products.length + 1}`,
        barcode: result.barcode?.trim() || '',
        price: Number(result.price ?? 0),
        warehouse: result.productType === 'service' ? 'Does not affect stock' : result.warehouse || 'Main Warehouse',
        type: result.productType
      };
      setProducts((items) => [...items, createdProduct]);
      if (result.productType === 'service' && result.warehouse) {
        setWarehouses((items) => items);
      }
      if (quickCreateState?.kind === 'product' && quickCreateState.lineId !== null) {
        handleProductSelect(quickCreateState.lineId, createdProduct);
      } else {
        addProductAsLine(createdProduct);
      }
    }

    closeQuickCreate();
  };

  const openQuickCreate = (kind: Exclude<QuickCreateState, null>['kind'], query: string, lineId: number | null = null) => {
    setQuickCreateState({ kind, query, lineId } as QuickCreateState);
  };

  const openProductQuickCreateFromBarcode = (barcode: string) => {
    setBarcodeScanOpen(false);
    setQuickCreateState({ kind: 'product', query: '', lineId: null, barcode } as QuickCreateState);
  };

  const handleBarcodeScanSubmit = (barcode: string) => {
    const normalized = String(barcode || '').trim();
    if (!normalized) {
      return;
    }
    const matched = products.find((product) => product.barcode === normalized);
    if (!matched) {
      setBarcodeScanQuery(normalized);
      return;
    }
    incrementProductByBarcode(normalized);
    setBarcodeScanOpen(false);
  };

  const closeQuickCreate = () => {
    setQuickCreateState(null);
  };

  const applyTaxPreset = (rate: number) => {
    markDocumentDirty();
    setTaxRate(rate);
    setActiveQuickAction(null);
  };

  const applyCustomTaxRate = () => {
    markDocumentDirty();
    const normalized = parseLocalizedNumber(customTaxRate);
    setTaxRate(Number.isFinite(normalized) ? normalized : 0);
    setActiveQuickAction(null);
  };

  const applyDiscount = () => {
    markDocumentDirty();
    setActiveQuickAction(null);
  };

  const focusFieldBySelector = (selector: string) => {
    window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(selector);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (target as HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement | null)?.focus?.();
    });
  };

  type ConfirmFocusTarget =
    | { kind: 'field'; field: 'supplier' | 'date' | 'requiredDate' | 'currency' }
    | { kind: 'line'; lineId: number; field: 'product' | 'qty' | 'price' | 'warehouse' };

  const focusFirstInvalidField = (target: ConfirmFocusTarget | null) => {
    if (!target) {
      return;
    }

    if (target.kind === 'field') {
      if (target.field === 'supplier') {
        supplierInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        supplierInputRef.current?.focus();
        return;
      }

      if (target.field === 'date') {
        dateInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        dateInputRef.current?.focus();
        return;
      }

      if (target.field === 'requiredDate') {
        requiredDateInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        requiredDateInputRef.current?.focus();
        return;
      }

      if (target.field === 'currency') {
        currencyInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        currencyInputRef.current?.focus();
      }
      return;
    }

    const selectorMap: Record<typeof target.field, string> = {
      product: `#product-input-${target.lineId}`,
      qty: `#quantity-input-${target.lineId}`,
      price: `.document-line-items-table tr[data-line-id="${target.lineId}"] .purchase-prototype-table-cell-price input`,
      warehouse: `#warehouse-input-${target.lineId}`
    };

    focusFieldBySelector(selectorMap[target.field]);
  };

  const validateBeforeConfirm = () => {
    const nextErrors: ValidationErrors = { rows: {} };
    let firstInvalidTarget: ConfirmFocusTarget | null = null;
    const addFirstTarget = (target: ConfirmFocusTarget) => {
      if (!firstInvalidTarget) {
        firstInvalidTarget = target;
      }
    };

    if (!supplier.trim()) {
      nextErrors.supplier = t('select_supplier_error');
      addFirstTarget({ kind: 'field', field: 'supplier' });
    }

    if (!date.trim()) {
      nextErrors.date = t('select_date_error');
      addFirstTarget({ kind: 'field', field: 'date' });
    }

    if (!requiredDate.trim()) {
      nextErrors.requiredDate = t('select_required_date_error');
      addFirstTarget({ kind: 'field', field: 'requiredDate' });
    }

    if (!currency.trim()) {
      nextErrors.currency = t('select_currency_error');
      addFirstTarget({ kind: 'field', field: 'currency' });
    }

    const validRows = lines.filter((line) => {
      const isBlankRow = !line.productId && !line.itemName.trim() && line.qty === 1 && line.unitPrice === 0 && !line.warehouse.trim();
      return !isBlankRow;
    });

    if (!validRows.length) {
      if (!firstInvalidTarget) {
        firstInvalidTarget = { kind: 'line', lineId: lines[0]?.id ?? Date.now(), field: 'product' };
      }
      if (lines[0]) {
        nextErrors.rows[lines[0].id] = { product: t('add_one_item_error') };
      }
      return { valid: false, errors: nextErrors, firstInvalidTarget };
    }

    lines.forEach((line) => {
      const isBlankRow = !line.productId && !line.itemName.trim() && line.qty === 1 && line.unitPrice === 0 && !line.warehouse.trim();
      if (isBlankRow) {
        return;
      }

      const rowErrors: ValidationRowErrors = {};

      if (!line.productId) {
        rowErrors.product = t('select_item_error');
        addFirstTarget({ kind: 'line', lineId: line.id, field: 'product' });
      }

      const qtyValue = Number.isFinite(line.qty) ? line.qty : parseLocalizedNumber(String(line.qty));
      if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
        rowErrors.qty = t('qty_greater_than_zero_error');
        addFirstTarget({ kind: 'line', lineId: line.id, field: 'qty' });
      }

      const priceValue = Number.isFinite(line.unitPrice) ? line.unitPrice : parseLocalizedNumber(String(line.unitPrice));
      if (!Number.isFinite(priceValue) || priceValue < 0) {
        rowErrors.price = t('price_not_negative_error');
        addFirstTarget({ kind: 'line', lineId: line.id, field: 'price' });
      }

      const product = line.productId ? products.find((item) => item.id === line.productId) : undefined;
      const requiresWarehouse = product ? product.type === 'stock' : !line.isService;
      if (requiresWarehouse && !line.warehouse.trim()) {
        rowErrors.warehouse = t('select_warehouse_error');
        addFirstTarget({ kind: 'line', lineId: line.id, field: 'warehouse' });
      }

      if (Object.keys(rowErrors).length) {
        nextErrors.rows[line.id] = rowErrors;
      }
    });

    const hasAnyValidLine = lines.some((line) => {
      const isBlankRow = !line.productId && !line.itemName.trim() && line.qty === 1 && line.unitPrice === 0 && !line.warehouse.trim();
      if (isBlankRow || !line.productId) {
        return false;
      }

      const qtyValue = Number.isFinite(line.qty) ? line.qty : parseLocalizedNumber(String(line.qty));
      const priceValue = Number.isFinite(line.unitPrice) ? line.unitPrice : parseLocalizedNumber(String(line.unitPrice));
      const product = products.find((item) => item.id === line.productId);
      const requiresWarehouse = product ? product.type === 'stock' : !line.isService;
      return Number.isFinite(qtyValue) && qtyValue > 0 && Number.isFinite(priceValue) && priceValue >= 0 && (!requiresWarehouse || Boolean(line.warehouse.trim()));
    });

    if (!hasAnyValidLine) {
      const fallbackTarget: ConfirmFocusTarget = firstInvalidTarget ?? { kind: 'line', lineId: lines[0]?.id ?? Date.now(), field: 'product' };
      return { valid: false, errors: nextErrors, firstInvalidTarget: fallbackTarget };
    }

    return {
      valid: !nextErrors.supplier && !nextErrors.date && !nextErrors.requiredDate && !nextErrors.currency && Object.keys(nextErrors.rows).length === 0,
      errors: nextErrors,
      firstInvalidTarget
    };
  };

  const handleResetDraft = () => {
    window.localStorage.removeItem(PURCHASE_DRAFT_STORAGE_KEY);
    hasLoadedDraftRef.current = false;
    setSupplier('');
    setDate(new Date().toISOString().split('T')[0]);
    setRequiredDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setCurrency('EGP');
    setCompany('');
    setContact('');
    setShippingAddress('');
    setTaxRate(14);
    setDiscount(0);
    setCostCenter('');
    setProject('');
    setTermsTemplate('');
    setNotes('');
    setLines([]);
    setAttachments([]);
    setDocumentStatus('draft');
    setInlineMessage({ tone: 'success', text: 'تم إفراغ الصفحة ومسح المسودة القديمة' });
  };

  const handleSaveDraft = () => {
    if (!computeHasMeaningfulData()) {
      setInlineMessage({ tone: 'error', text: t('no_data_to_save') });
      return;
    }

    saveDraftToStorage('draft');
    setValidationErrors({ rows: {} });
    setInlineMessage({ tone: 'success', text: t('draft_saved') });
  };

  const handleConfirmInvoice = async () => {
    const validation = validateBeforeConfirm();
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      setDocumentStatus('draft');
      setInlineMessage({ tone: 'error', text: t('please_complete_data') });
      focusFirstInvalidField(validation.firstInvalidTarget ?? null);
      return;
    }

    const selectedSupplierObj = suppliers.find(s => s.name === supplier);
    const supplierId = selectedSupplierObj?.id || '';
    if (!supplierId) {
      setInlineMessage({ tone: 'error', text: t('please_complete_data') });
      return;
    }

    const values = {
      supplierId,
      paymentType: 'credit' as const,
      discount: discount || 0,
      branchId: rawBranches[0]?.id?.toString() || '',
      locationId: rawLocations[0]?.id?.toString() || '',
      note: notes,
      requiredDate,
      currency,
      companyName: company,
      contactId: contact,
      shippingAddressId: shippingAddress,
      costCenterId: costCenter,
      projectId: project,
      termsTemplate,
    };

    const items = lines.filter(line => line.productId).map(line => ({
      productId: line.productId as string,
      name: line.itemName,
      qty: line.qty,
      cost: line.unitPrice,
      total: line.qty * line.unitPrice,
      unitName: 'Piece',
      unitMultiplier: 1
    }));

    try {
      await createMutation.mutateAsync({
        values,
        items,
        taxRate: taxRate,
        pricesIncludeTax: false,
        attachments
      });
    } catch (e) {
      setInlineMessage({ tone: 'error', text: 'Error saving invoice' });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const newAttachments: any[] = [];
      for (let i = 0; i < files.length; i++) {
        let file = files[i];
        if (file.type.startsWith('image/')) {
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          };
          try {
            file = await imageCompression(file, options);
          } catch (e) {
            console.error('Image compression failed', e);
          }
        }
        
        const uploaded = await purchasesApi.uploadAttachment(file);
        newAttachments.push(uploaded);
      }
      setAttachments(prev => [...prev, ...newAttachments]);
    } catch (e) {
      setInlineMessage({ tone: 'error', text: 'Error uploading attachment' });
    } finally {
      setIsUploading(false);
      event.target.value = ''; // clear input
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (hasLoadedDraftRef.current || typeof window === 'undefined') {
      return;
    }

    hasLoadedDraftRef.current = true;
    const raw = window.localStorage.getItem(PURCHASE_DRAFT_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<PurchasePrototypeDraft>;
      if (!parsed || typeof parsed !== 'object') {
        return;
      }

      restoreDraftFromStorage({
        supplier: parsed.supplier ?? supplier,
        date: parsed.date ?? date,
        requiredDate: parsed.requiredDate ?? requiredDate,
        currency: parsed.currency ?? currency,
        company: parsed.company ?? company,
        contact: parsed.contact ?? contact,
        shippingAddress: parsed.shippingAddress ?? shippingAddress,
        taxRate: typeof parsed.taxRate === 'number' ? parsed.taxRate : taxRate,
        discount: typeof parsed.discount === 'number' ? parsed.discount : discount,
        discountMode: parsed.discountMode === 'percent' ? 'percent' : 'value',
        customTaxRate: parsed.customTaxRate ?? customTaxRate,
        costCenter: parsed.costCenter ?? costCenter,
        project: parsed.project ?? project,
        termsTemplate: parsed.termsTemplate ?? termsTemplate,
        notes: parsed.notes ?? notes,
        lines: Array.isArray(parsed.lines) ? parsed.lines : lines,
        suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : suppliers,
        contactsList: Array.isArray(parsed.contactsList) ? parsed.contactsList : contactsList,
        addressesList: Array.isArray(parsed.addressesList) ? parsed.addressesList : addressesList,
        products: Array.isArray(parsed.products) ? parsed.products : products,
        warehouses: Array.isArray(parsed.warehouses) ? parsed.warehouses : warehouses,
        costCenters: Array.isArray(parsed.costCenters) ? parsed.costCenters : costCenters,
        projects: Array.isArray(parsed.projects) ? parsed.projects : projects,
        status: parsed.status === 'confirmed' ? 'confirmed' : 'draft'
      });
    } catch {
      window.localStorage.removeItem(PURCHASE_DRAFT_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!inlineMessage) {
      return;
    }

    const timer = window.setTimeout(() => setInlineMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [inlineMessage]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const scrollContainer = document.querySelector<HTMLElement>('.content-wrap');

    if (!scrollContainer) {
      return;
    }

    const updateScrolledState = () => {
      setIsHeaderScrolled(scrollContainer.scrollTop > 8);
    };

    updateScrolledState();
    scrollContainer.addEventListener('scroll', updateScrolledState, { passive: true });

    return () => {
      scrollContainer.removeEventListener('scroll', updateScrolledState);
    };
  }, []);

  useEffect(() => {
    if (pendingFocusLineId === null) {
      return;
    }

    const timer = window.setTimeout(() => {
      const input = document.getElementById(`product-input-${pendingFocusLineId}`) as HTMLInputElement | null;
      input?.focus();
      input?.select();
      setPendingFocusLineId(null);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pendingFocusLineId, lines]);

  useEffect(() => {
    if (pendingFocusQtyLineId === null) {
      return;
    }

    const timer = window.setTimeout(() => {
      const input = document.getElementById(`quantity-input-${pendingFocusQtyLineId}`) as HTMLInputElement | null;
      input?.focus();
      input?.select();
      setPendingFocusQtyLineId(null);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pendingFocusQtyLineId, lines]);
  const filteredSearchProducts = useMemo(() => {
    if (!globalSearchQuery) return [];
    return products.filter((p) => includesNormalized(p.name, globalSearchQuery) || includesNormalized(p.code || '', globalSearchQuery)).slice(0, 3);
  }, [globalSearchQuery, products]);

  const filteredSearchSuppliers = useMemo(() => {
    if (!globalSearchQuery) return [];
    return suppliers.filter((s) => includesNormalized(s.name, globalSearchQuery) || includesNormalized(s.code || '', globalSearchQuery)).slice(0, 3);
  }, [globalSearchQuery, suppliers]);

  useAppToolbar([
    { label: t('purchases'), to: '/purchases' },
    { label: t('purchase_orders'), to: '/purchases' },
    { label: t('new_purchase_order') }
  ]);

  return (
    <div className={`page-shell document-prototype-shell purchase-new-prototype${isDarkMode ? ' purchase-prototype-dark' : ''}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className={`purchase-prototype-sticky-stack${isHeaderScrolled ? ' is-scrolled' : ''}`}>
        <div className="purchase-prototype-document-surface">
        <div className="document-prototype-topbar">
            <div className="document-prototype-topbar-right">
              <button type="button" className="document-prototype-back-link" aria-label={t('back_to_purchases')}>←</button>
              <h1>{t('new_purchase_order')}</h1>
              
              <span className={`document-prototype-status-badge is-${documentStatus}`}>
                {documentStatus === 'confirmed' ? t('status_confirmed') : t('status_draft')}
              </span>
          </div>
          
          <div className="document-smart-buttons-box">
             <button className="document-smart-button">
               <span className="document-smart-button-value">{selectedSupplierStats.ordersCount}</span>
               <span className="document-smart-button-label">{t('previous_orders')}</span>
             </button>
             <button className="document-smart-button">
               <span className="document-smart-button-value">{formatMoney(selectedSupplierStats.balance, language)}</span>
               <span className="document-smart-button-label">{t('credit_balance')}</span>
             </button>
          </div>
          <div className="document-prototype-topbar-actions">
            <Button 
              variant="secondary" 
              type="button" 
              className="purchase-prototype-toolbar-action purchase-prototype-toolbar-action-secondary" 
              onClick={handleResetDraft} 
              style={{ color: 'var(--danger-color)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              <span aria-hidden="true" className="purchase-prototype-save-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </span>
              <span>إلغاء المسودة</span>
            </Button>
            <Button 
              variant="secondary" 
              type="button" 
              className={`purchase-prototype-toolbar-action purchase-prototype-toolbar-action-secondary ${inlineMessage?.text === t('draft_saved') ? 'is-success-state' : ''}`} 
              onClick={handleSaveDraft} 
              disabled={documentStatus === 'confirmed'}
              style={inlineMessage?.text === t('draft_saved') ? { backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#15803d', borderColor: 'rgba(34, 197, 94, 0.3)' } : {}}
            >
              {inlineMessage?.text === t('draft_saved') ? (
                <>
                  <span aria-hidden="true" className="purchase-prototype-save-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <span>{t('draft_saved')}</span>
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="purchase-prototype-save-icon">
                    <svg viewBox="0 0 24 24" role="img" focusable="false" aria-hidden="true">
                      <path d="M5 3.75h10.4L19 7.35V20.25H5V3.75Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                      <path d="M7.2 3.75v5.1h6.8v-5.1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                      <path d="M8 20.25v-5.4h8v5.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span>{t('save_as_draft')}</span>
                </>
              )}
            </Button>
            <Button 
              type="button" 
              className={`purchase-prototype-toolbar-action purchase-prototype-toolbar-action-primary ${inlineMessage?.text === t('invoice_confirmed') ? 'is-success-state' : ''}`} 
              onClick={handleConfirmInvoice} 
              disabled={documentStatus === 'confirmed'}
              style={inlineMessage?.text === t('invoice_confirmed') ? { backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#15803d', borderColor: 'rgba(34, 197, 94, 0.3)' } : {}}
            >
              {inlineMessage?.text === t('invoice_confirmed') ? (
                <>
                  <span aria-hidden="true" className="purchase-prototype-save-icon" style={{ marginLeft: '4px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <span>{t('invoice_confirmed')}</span>
                </>
              ) : (
                <span>{t('confirm_invoice')}</span>
              )}
            </Button>
            {inlineMessage && inlineMessage.tone === 'error' ? (
              <div className={`purchase-prototype-inline-message is-${inlineMessage.tone}`} role="alert" aria-live="polite">
                {inlineMessage.text}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      </div>

      <main className="document-prototype-column">
        <section className="document-prototype-section">
          <h3 className="document-prototype-section-title">{t('basic_info')}</h3>
          <div className="document-prototype-grid compact-grid-3">
            <SearchableCombobox
              label={t('supplier')}
              placeholder={t("search_supplier")}
              value={supplier}
              onChange={(value) => {
                markDocumentDirty();
                clearDocumentFieldError('supplier');
                setSupplier(value);
              }}
              options={suppliers}
              search={searchSupplier}
              getLabel={(option) => option.name}
              getMeta={(option) => [option.code, option.phone, option.taxNumber].filter(Boolean).join(' · ')}
              onSelect={handleSupplierSelect}
              onCreate={(query) => openQuickCreate('supplier', query)}
              createLabel={(query) => `+ إنشاء مورد جديد "${query}"`}
              inputRef={supplierInputRef}
              inputClassName="purchase-prototype-field-input purchase-prototype-supplier-input"
              dropdownClassName={purchaseDropdownClassName}
              error={validationErrors.supplier}
            />
            <Field label={t("date")} error={validationErrors.date}><input ref={dateInputRef} className="purchase-prototype-field-input purchase-prototype-date-input" type="date" value={date} onChange={(event) => {
              markDocumentDirty();
              clearDocumentFieldError('date');
              setDate(event.target.value);
            }} /></Field>
            <Field label={t('order_deadline')} error={validationErrors.requiredDate}><input ref={requiredDateInputRef} className="purchase-prototype-field-input purchase-prototype-date-input" type="date" value={requiredDate} onChange={(event) => {
              markDocumentDirty();
              clearDocumentFieldError('requiredDate');
              setRequiredDate(event.target.value);
            }} /></Field>
            <Field label={t('currency')} error={validationErrors.currency}>
              <select
                ref={currencyInputRef as any}
                className="purchase-prototype-field-input purchase-prototype-meta-input"
                value={currency}
                onChange={(event) => {
                  markDocumentDirty();
                  clearDocumentFieldError('currency');
                  setCurrency(event.target.value);
                }}
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </Field>
            <Field label={t("company_label")}><input className="purchase-prototype-field-input purchase-prototype-meta-input" value={company} onChange={(event) => {
              markDocumentDirty();
              setCompany(event.target.value);
            }} /></Field>
            <SearchableCombobox
              label={t('contact_person')}
              placeholder={t("search_contact")}
              value={contact}
              onChange={(value) => {
                markDocumentDirty();
                setContact(value);
              }}
              options={contactsList}
              search={searchContact}
              getLabel={(option) => option.name}
              getMeta={(option) => [option.phone, option.supplierName].filter(Boolean).join(' · ')}
              onSelect={handleContactSelect}
              onCreate={(query) => openQuickCreate('contact', query)}
              createLabel={(query) => `+ إنشاء جهة اتصال جديدة "${query}"`}
              inputRef={contactInputRef}
              inputClassName="purchase-prototype-field-input purchase-prototype-contact-input"
              dropdownClassName={purchaseDropdownClassName}
            />
          </div>
          <div className="document-prototype-grid compact-grid-1">
            <SearchableCombobox
              label={t("shipping_address") || "وجهة الاستلام (المخزن أو الفرع)"}
              placeholder="اختر المخزن أو الفرع..."
              value={shippingAddress}
              onChange={(value) => {
                markDocumentDirty();
                setShippingAddress(value);
              }}
              options={deliveryDestinations}
              search={searchWarehouse}
              getLabel={(option) => option.name}
              getMeta={(option) => option.code}
              onSelect={(option) => {
                markDocumentDirty();
                setShippingAddress(option.name);
              }}
              createLabel={(query) => `Create Warehouse "${query}"`}
              onCreate={(query: string) => setQuickCreateState({ kind: 'warehouse', query, lineId: null })}
              inputRef={shippingInputRef}
              inputClassName="purchase-prototype-field-input purchase-prototype-address-input"
              dropdownClassName={purchaseDropdownClassName}
            />
          </div>
        </section>

        <section className="document-prototype-section">
          <h3 className="document-prototype-section-title">{t('attach_docs')}</h3>
          <label className="document-prototype-upload" style={{ display: 'flex', cursor: 'pointer' }}>
            <input type="file" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
            <span aria-hidden="true" className="document-prototype-upload-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.5 12.8 20.7a5 5 0 0 1-7.1-7.1L14.2 5.1a3.5 3.5 0 0 1 4.9 4.9L9.9 19.2" />
              </svg>
            </span>
            <span>{isUploading ? 'جاري الرفع...' : t('drag_drop_docs')}</span>
          </label>
          
          {attachments.length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {attachments.map((att, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', border: '1px solid var(--border-light)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px' }}>{att.fileName}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{(att.fileSize / 1024).toFixed(1)} KB</span>
                  </div>
                  <button type="button" onClick={() => handleRemoveAttachment(index)} style={{ color: 'var(--danger-color)', background: 'none', border: 'none', cursor: 'pointer' }}>حذف</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="document-prototype-section">
          <div className="document-prototype-section-header">
            <h3 className="document-prototype-section-title">{t('items_section')}</h3>
            <div className="purchase-prototype-quick-actions" aria-label={t("quick_item_actions")}>
              <button type="button" className="purchase-prototype-quick-action" title={t("add_service_line")} onClick={addServiceLine}>
                <span aria-hidden="true">+</span>
                <span>{t("service_type")}</span>
              </button>
              <button
                type="button"
                className="purchase-prototype-quick-action"
                title={t("apply_tax")}
                onClick={() => setActiveQuickAction((current) => (current === 'tax' ? null : 'tax'))}
              >
                <span aria-hidden="true">%</span>
                <span>{t('tax_rate')}</span>
              </button>
              <button
                type="button"
                className="purchase-prototype-quick-action"
                title="إضافة خصم على الفاتورة"
                onClick={() => setActiveQuickAction((current) => (current === 'discount' ? null : 'discount'))}
              >
                <span aria-hidden="true">🏷</span>
                <span>{t("discount_label")}</span>
              </button>
            </div>
          </div>
          {activeQuickAction === 'tax' ? (
            <div className="purchase-prototype-popover" role="dialog" aria-label={t("tax_rate")}>
              <div className="purchase-prototype-popover-row">
                <button type="button" className="purchase-prototype-popover-option" onClick={() => applyTaxPreset(0)}>
                  بدون ضريبة
                </button>
                <button type="button" className="purchase-prototype-popover-option" onClick={() => applyTaxPreset(14)}>
                  14%
                </button>
                <input
                  className="purchase-prototype-popover-input purchase-prototype-tax-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={customTaxRate}
                  onChange={(event) => {
                    markDocumentDirty();
                    setCustomTaxRate(event.target.value);
                  }}
                  aria-label={t("custom_value")}
                />
                <button type="button" className="purchase-prototype-popover-apply" onClick={applyCustomTaxRate}>
                  تطبيق
                </button>
              </div>
            </div>
          ) : null}
          {activeQuickAction === 'discount' ? (
            <div className="purchase-prototype-popover" role="dialog" aria-label={t("discount_label")}>
              <div className="purchase-prototype-popover-row">
                <button
                  type="button"
                  className="purchase-prototype-popover-option"
                  onClick={() => {
                    markDocumentDirty();
                    setDiscountMode('percent');
                  }}
                >
                  نسبة
                </button>
                <button
                  type="button"
                  className="purchase-prototype-popover-option"
                  onClick={() => {
                    markDocumentDirty();
                    setDiscountMode('value');
                  }}
                >
                  قيمة
                </button>
                <input
                  className="purchase-prototype-popover-input purchase-prototype-discount-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(event) => {
                    markDocumentDirty();
                    const parsed = parseLocalizedNumber(event.target.value);
                    setDiscount(Number.isFinite(parsed) ? parsed : 0);
                  }}
                  aria-label={t("discount_value_label")}
                />
                <button type="button" className="purchase-prototype-popover-apply" onClick={applyDiscount}>
                  تطبيق
                </button>
              </div>
            </div>
          ) : null}
          <div className="document-line-items-table-wrap">
            <table className="document-line-items-table">
              <thead>
                <tr>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-product">{t("item_label")}</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-qty">{t('quantity')}</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-price">{t('price_title')}</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-warehouse">{t('warehouse_title')}</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-amount">{t('total_amount')}</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-actions"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const rowErrors = validationErrors.rows[line.id] ?? {};
                  const amount = line.qty * line.unitPrice;
                  return (
                    <tr
                      key={line.id}
                      data-line-id={line.id}
                      className={[
                        line.warehouse === 'Does not affect stock' ? 'document-line-service' : '',
                        pendingFocusLineId === line.id ? 'document-line-highlight' : ''
                      ].filter(Boolean).join(' ')}
                    >
                      <td className="purchase-prototype-table-cell purchase-prototype-table-cell-product">
                        <SearchableCombobox
                          inline
                          inputId={`product-input-${line.id}`}
                          className="purchase-prototype-inline-combobox"
                          inputClassName="purchase-prototype-field-input purchase-prototype-combobox-input purchase-prototype-combobox-input-inline"
                          placeholder={t("search_item")}
                          value={line.itemName}
                          onChange={(value) => {
                            markDocumentDirty();
                            setLineError(line.id, 'product', undefined);
                            updateLine(line.id, 'itemName', value);
                          }}
                          options={products}
                          search={searchProduct}
                          getLabel={(option) => option.name}
                          getMeta={(option) => {
                            const priceLabel = option.price > 0 ? `${Number.isInteger(option.price) ? option.price.toFixed(0) : option.price.toFixed(2)} EGP` : undefined;
                            const meta = [option.code, option.barcode, priceLabel]
                              .filter(Boolean)
                              .join(' · ');
                            return meta || undefined;
                          }}
                          onSelect={(option) => handleProductSelect(line.id, option)}
                          onCreate={(query) => openQuickCreate('product', query, line.id)}
                          createLabel={(query) => `+ إنشاء صنف جديد "${query}"`}
                          minSearchLength={2}
                          searchOnSingleDigit
                          showIdleHelper={false}
                          showDropdownOnEmpty={false}
                          error={rowErrors.product}
                          dropdownClassName={purchaseDropdownClassName}
                        />
                      </td>
                      <td className="purchase-prototype-table-cell purchase-prototype-table-cell-qty"><input className="purchase-prototype-table-input" id={`quantity-input-${line.id}`} type="number" min="0" step="1" value={line.qty} aria-invalid={Boolean(rowErrors.qty)} onChange={(event) => {
                        markDocumentDirty();
                        setLineError(line.id, 'qty', undefined);
                        const parsed = parseLocalizedNumber(event.target.value);
                        updateLine(line.id, 'qty', Number.isFinite(parsed) ? parsed : 0);
                      }} /></td>
                      <td className="purchase-prototype-table-cell purchase-prototype-table-cell-price"><input className="purchase-prototype-table-input" type="number" min="0" step="0.01" value={line.unitPrice} aria-invalid={Boolean(rowErrors.price)} onChange={(event) => {
                        markDocumentDirty();
                        setLineError(line.id, 'price', undefined);
                        const parsed = parseLocalizedNumber(event.target.value);
                        updateLine(line.id, 'unitPrice', Number.isFinite(parsed) ? parsed : 0);
                      }} /></td>
                      <td className="purchase-prototype-table-cell purchase-prototype-table-cell-warehouse">
                        {line.isService ? (
                          <input className="purchase-prototype-table-input purchase-prototype-table-input-readonly" value="لا يؤثر على المخزون" disabled readOnly />
                        ) : (
                          <SearchableCombobox
                            inline
                            className="purchase-prototype-inline-combobox"
                            inputId={`warehouse-input-${line.id}`}
                            inputClassName="purchase-prototype-field-input purchase-prototype-combobox-input purchase-prototype-combobox-input-inline"
                            placeholder={t("search_warehouse")}
                            value={line.warehouse}
                            onChange={(value) => {
                              markDocumentDirty();
                              setLineError(line.id, 'warehouse', undefined);
                              updateLine(line.id, 'warehouse', value);
                            }}
                            options={warehouses}
                            search={searchWarehouse}
                            getLabel={(option) => option.name}
                            getMeta={(option) => option.code}
                            onSelect={(option) => handleWarehouseSelect(line.id, option)}
                            onCreate={(query) => openQuickCreate('warehouse', query, line.id)}
                            createLabel={(query) => `+ إنشاء مستودع جديد "${query}"`}
                            error={rowErrors.warehouse}
                            dropdownClassName={purchaseDropdownClassName}
                          />
                        )}
                      </td>
                      <td className="line-total">{formatMoney(amount, language)}</td>
                      <td className="purchase-prototype-table-cell purchase-prototype-table-cell-actions">
                        <button type="button" className="document-row-delete purchase-prototype-row-delete" onClick={() => removeLine(line.id)} disabled={lines.length === 1}>×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="document-line-items-actions">
            <Button type="button" variant="dashedAction" onClick={addLine}><span aria-hidden="true">+</span><span>{t('add_item')}</span></Button>
            <Button type="button" variant="dashedAction" onClick={handleBarcodeScanAction}>
              <span aria-hidden="true" className="purchase-prototype-scan-icon">
                <svg viewBox="0 0 16 16" role="img" focusable="false" aria-hidden="true">
                  <path d="M3 4.2V3.1A.6.6 0 0 1 3.6 2.5h1.1M11.3 2.5h1.1a.6.6 0 0 1 .6.6v1.1M13 11.8v1.1a.6.6 0 0 1-.6.6h-1.1M4.7 13.5H3.6a.6.6 0 0 1-.6-.6v-1.1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5.1 5.2v5.6M7 5.2v5.6M9 5.2v5.6M10.9 5.2v5.6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </span>
              <span>{t('scan_barcode')}</span>
            </Button>
            <Button type="button" variant="dashedAction" onClick={addProductLine}><span aria-hidden="true">+</span><span>{t('new_product')}</span></Button>
          </div>
        </section>

        <section className="document-prototype-section">
          <h3 className="document-prototype-section-title">{t('accounting_section')}</h3>
          <div className="document-prototype-grid compact-grid-2">
            <SearchableCombobox
              label={t('cost_center')}
              placeholder={t("search_cost_center")}
              value={costCenter}
              onChange={(value) => {
                markDocumentDirty();
                setCostCenter(value);
              }}
              options={costCenters}
              search={searchCostCenter}
              getLabel={(option) => option.name}
              getMeta={(option) => option.code}
              onSelect={handleCostCenterSelect}
              onCreate={(query) => openQuickCreate('costCenter', query)}
              createLabel={(query) => `+ إنشاء مركز تكلفة جديد "${query}"`}
              inputRef={costCenterInputRef}
              inputClassName="purchase-prototype-field-input purchase-prototype-cost-center-input"
              dropdownClassName={purchaseDropdownClassName}
            />
            <SearchableCombobox
              label={t('project')}
              placeholder={t("search_project")}
              value={project}
              onChange={(value) => {
                markDocumentDirty();
                setProject(value);
              }}
              options={projects}
              search={searchProject}
              getLabel={(option) => option.name}
              getMeta={(option) => option.code}
              onSelect={handleProjectSelect}
              onCreate={(query) => openQuickCreate('project', query)}
              createLabel={(query) => `+ إنشاء مشروع جديد "${query}"`}
              inputRef={projectInputRef}
              inputClassName="purchase-prototype-field-input purchase-prototype-project-input"
              dropdownClassName={purchaseDropdownClassName}
            />
          </div>
        </section>

        <section className="document-prototype-section">
          <h3 className="document-prototype-section-title">{t('terms_conditions')}</h3>
        <SearchableCombobox
          label={t('terms_template')}
          placeholder={t("search_terms_template")}
          value={termsTemplate}
          onChange={(value) => {
            markDocumentDirty();
            setTermsTemplate(value);
          }}
          options={[
            { id: 'term-1', name: 'Standard PO Template' },
            { id: 'term-2', name: 'شروط توريد مختصرة' }
          ]}
          search={(option, query) => (normalizeSearchText(query) ? includesNormalized(option.name, query) : true)}
          getLabel={(option) => option.name}
          onSelect={(option) => setTermsTemplate(option.name)}
          onCreate={(query) => openQuickCreate('project', query)}
          createLabel={(query) => `+ إنشاء نموذج شروط جديد "${query}"`}
          inputClassName="purchase-prototype-field-input purchase-prototype-terms-input"
          dropdownClassName={purchaseDropdownClassName}
        />
        </section>

        <section className="document-prototype-bottom-grid">
          <div className="document-prototype-section">
            <h3 className="document-prototype-section-title">{t('notes_section')}</h3>
            <textarea className="purchase-prototype-notes-textarea" rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={t("additional_notes")} />
          </div>
          <div className="document-prototype-section document-totals-card">
            <h3 className="document-prototype-section-title">{t('totals_section')}</h3>
            <div className="document-totals-panel">
              <div><span>{t('subtotal')}</span><strong>{formatMoney(subtotal, language)}</strong></div>
              <div><span>{t('tax')}</span><strong>{formatMoney(tax, language)}</strong></div>
              <div className="document-total-grand"><span>{t('total')}</span><strong>{formatMoney(total, language)}</strong></div>
            </div>
          </div>
        </section>

      </main>
      <BarcodeScanDialog
        open={barcodeScanOpen}
        query={barcodeScanQuery}
        products={products}
        onClose={() => setBarcodeScanOpen(false)}
        onScan={handleBarcodeScanSubmit}
        onOpenQuickCreate={openProductQuickCreateFromBarcode}
      />
      <QuickCreateDialog state={quickCreateState} onCancel={closeQuickCreate} onSubmit={handleQuickCreateSubmit} />
    </div>
  );
}
