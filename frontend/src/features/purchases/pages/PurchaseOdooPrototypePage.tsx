import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { useAuthStore } from '@/stores/auth-store';
import { AppAccountMenu } from '@/shared/layout/app-account-menu';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';

type PrototypeLine = {
  id: number;
  productId: string | null;
  itemName: string;
  qty: number;
  unitPrice: number;
  warehouse: string;
  isService?: boolean;
};

const initialLines: PrototypeLine[] = [
  { id: 1, productId: 'prd-001', itemName: 'دفاتر محاسبية', qty: 5, unitPrice: 80, warehouse: 'المستودع الرئيسي' },
  { id: 2, productId: 'prd-002', itemName: 'ورق طباعة A4', qty: 10, unitPrice: 55, warehouse: 'مخزن القرطاسية' },
  { id: 3, productId: 'prd-003', itemName: 'أقلام حبر', qty: 12, unitPrice: 15, warehouse: 'المستودع الرئيسي' }
];

const formatMoney = (value: number) => `${value.toFixed(2)} ج.م`;

type SupplierOption = {
  id: string;
  name: string;
  code: string;
  phone: string;
  taxNumber: string;
  contactName?: string;
  shippingAddress?: string;
  company?: string;
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

const initialSuppliers: SupplierOption[] = [
  {
    id: 'sup-001',
    name: 'مؤسسة النور للتوريدات',
    code: 'SUP-001',
    phone: '01000000000',
    taxNumber: '123456789',
    contactName: 'أحمد حسن',
    shippingAddress: 'مخزن القاهرة - مدينة نصر',
    company: 'Z ERP Trading'
  },
  {
    id: 'sup-002',
    name: 'شركة كابيتال',
    code: 'SUP-002',
    phone: '01111111111',
    taxNumber: '987654321',
    contactName: 'محمد علي',
    shippingAddress: 'مخزن الجيزة - المهندسين',
    company: 'Z ERP Trading'
  },
  {
    id: 'sup-003',
    name: 'مورد المدينة',
    code: 'SUP-003',
    phone: '01222222222',
    taxNumber: '555666777',
    contactName: 'سارة أحمد',
    shippingAddress: 'مخزن الإسكندرية - سموحة',
    company: 'Z ERP Trading'
  }
];

const initialContacts: ContactOption[] = [
  { id: 'con-001', name: 'أحمد حسن', phone: '01012345678', supplierName: 'مؤسسة النور للتوريدات' },
  { id: 'con-002', name: 'محمد علي', phone: '01112345678', supplierName: 'شركة كابيتال' },
  { id: 'con-003', name: 'سارة أحمد', phone: '01234567890', supplierName: 'مورد المدينة' }
];

const initialAddresses: AddressOption[] = [
  { id: 'addr-001', label: 'مخزن القاهرة - مدينة نصر', city: 'القاهرة', supplierName: 'مؤسسة النور للتوريدات' },
  { id: 'addr-002', label: 'مخزن الجيزة - المهندسين', city: 'الجيزة', supplierName: 'شركة كابيتال' },
  { id: 'addr-003', label: 'مخزن الإسكندرية - سموحة', city: 'الإسكندرية', supplierName: 'مورد المدينة' }
];

const initialProducts: ProductOption[] = [
  { id: 'prd-001', name: 'دفاتر محاسبية', englishName: 'Accounting Notebooks', code: 'PRD-001', barcode: '622100001', price: 80, warehouse: 'المستودع الرئيسي', type: 'stock' },
  { id: 'prd-002', name: 'ورق طباعة A4', englishName: 'A4 Copy Paper', code: 'PRD-002', barcode: '622100002', price: 55, warehouse: 'مخزن القرطاسية', type: 'stock' },
  { id: 'prd-003', name: 'أقلام حبر', englishName: 'Ink Pens', code: 'PRD-003', barcode: '622100003', price: 15, warehouse: 'المستودع الرئيسي', type: 'stock' },
  { id: 'prd-004', name: 'خدمة إضافية', englishName: 'Additional Service', code: 'SRV-001', barcode: '', price: 0, warehouse: 'لا يؤثر على المخزون', type: 'service' }
];

const initialWarehouses: WarehouseOption[] = [
  { id: 'wh-001', name: 'المستودع الرئيسي', code: 'WH-001' },
  { id: 'wh-002', name: 'مخزن القرطاسية', code: 'WH-002' }
];

const initialCostCenters: CostCenterOption[] = [
  { id: 'cc-001', name: 'مشتريات تشغيلية', code: 'CC-001' },
  { id: 'cc-002', name: 'مصروفات عامة', code: 'CC-002' }
];

const initialProjects: ProjectOption[] = [
  { id: 'prj-001', name: 'تجهيز فرع جديد', code: 'PRJ-001' },
  { id: 'prj-002', name: 'تطوير المخزن', code: 'PRJ-002' }
];

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
  | { kind: 'supplier'; name: string; phone?: string; taxNumber?: string; notes?: string }
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
  const [name, setName] = useState('');
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
    supplier: 'المورد الجديد',
    product: 'إنشاء منتج جديد',
    contact: 'جهة الاتصال الجديدة',
    address: 'العنوان الجديد',
    warehouse: 'المستودع الجديد',
    costCenter: 'مركز التكلفة الجديد',
    project: 'المشروع الجديد'
  };

  const submit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    if (state.kind === 'supplier') {
      onSubmit({ kind: 'supplier', name: trimmedName, phone: phone.trim(), taxNumber: taxNumber.trim(), notes: notes.trim() });
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
            <p>للاستخدام المحلي داخل نموذج التجربة فقط.</p>
          </div>
          <button type="button" className="purchase-prototype-create-close" aria-label="إغلاق" onClick={requestClose}>
            ×
          </button>
        </div>

        <div className="purchase-prototype-create-grid">
          <Field label={state.kind === 'product' ? 'اسم المنتج' : state.kind === 'address' ? 'عنوان الشحن' : 'الاسم'}>
            <input className="purchase-prototype-create-input" value={name} onChange={(event) => setName(event.target.value)} placeholder={state.query} />
          </Field>

          {state.kind === 'supplier' ? (
            <>
              <Field label="رقم الهاتف"><input className="purchase-prototype-create-input" value={phone} onChange={(event) => setPhone(event.target.value)} /></Field>
              <Field label="الرقم الضريبي"><input className="purchase-prototype-create-input" value={taxNumber} onChange={(event) => setTaxNumber(event.target.value)} /></Field>
              <Field label="ملاحظات"><textarea className="purchase-prototype-create-textarea" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
            </>
          ) : null}

          {state.kind === 'product' ? (
            <>
              <Field label="نوع المنتج">
                <select className="purchase-prototype-create-select" value={productType} onChange={(event) => setProductType(event.target.value as 'stock' | 'service')}>
                  <option value="stock">مخزني</option>
                  <option value="service">خدمة</option>
                </select>
              </Field>
              <Field label="الباركود">
                <input className="purchase-prototype-create-input" value={state.barcode ?? ''} readOnly disabled placeholder="اختياري" />
              </Field>
              <Field label="السعر"><input className="purchase-prototype-create-input" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} /></Field>
              <Field label="الوحدة"><input className="purchase-prototype-create-input" value={unit} onChange={(event) => setUnit(event.target.value)} /></Field>
              <Field label="المستودع الافتراضي"><input className="purchase-prototype-create-input" value={warehouse} onChange={(event) => setWarehouse(event.target.value)} disabled={productType === 'service'} /></Field>
            </>
          ) : null}

          {state.kind === 'contact' ? <Field label="رقم الهاتف"><input className="purchase-prototype-create-input" value={phone} onChange={(event) => setPhone(event.target.value)} /></Field> : null}
          {state.kind === 'address' ? (
            <>
              <Field label="المدينة"><input className="purchase-prototype-create-input" value={city} onChange={(event) => setCity(event.target.value)} /></Field>
              <Field label="المورد/الشركة"><input className="purchase-prototype-create-input" value={supplier} onChange={(event) => setSupplier(event.target.value)} /></Field>
            </>
          ) : null}
          {(state.kind === 'warehouse' || state.kind === 'costCenter' || state.kind === 'project') ? (
            <Field label="الكود"><input className="purchase-prototype-create-input" value={code} onChange={(event) => setCode(event.target.value)} /></Field>
          ) : null}
        </div>

        <div className="purchase-prototype-create-actions">
          <Button variant="secondary" type="button" onClick={requestClose}>إلغاء</Button>
          <Button type="button" onClick={submit}>إنشاء واختيار</Button>
        </div>
      </div>
      {showUnsavedConfirm ? (
        <div className="purchase-prototype-create-confirm" role="dialog" aria-modal="true" aria-labelledby="purchase-prototype-confirm-title" onMouseDown={(event) => event.stopPropagation()}>
          <h4 id="purchase-prototype-confirm-title">لديك تغييرات غير محفوظة، هل تريد المغادرة؟</h4>
          <div className="purchase-prototype-create-confirm-actions">
            <Button variant="secondary" type="button" onClick={() => setShowUnsavedConfirm(false)}>إلغاء</Button>
            <Button type="button" onClick={() => { setShowUnsavedConfirm(false); onCancel(); }}>موافق</Button>
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
            <h4 id="purchase-prototype-barcode-title">مسح الباركود</h4>
            <p>استخدم الإدخال اليدوي أو قارئ الباركود إن كان متاحًا.</p>
          </div>
          <button type="button" className="purchase-prototype-create-close" aria-label="إغلاق" onClick={onClose}>×</button>
        </div>
        <div className="purchase-prototype-create-grid">
          <Field label="الباركود">
            <input className="purchase-prototype-create-input" ref={inputRef} value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="622100001" />
          </Field>
          <div className="muted small">كودات التجربة: 622100001 ، 622100002 ، 622100003</div>
          {matched ? <div className="success-box">تم العثور على: <strong>{matched.name}</strong></div> : barcode.trim() ? <div className="error-box">لم يتم العثور على صنف بهذا الباركود</div> : null}
        </div>
        <div className="purchase-prototype-create-actions">
          <Button variant="secondary" type="button" onClick={onClose}>إلغاء</Button>
          {matched ? (
            <Button type="button" onClick={() => onScan(barcode)}>إضافة للصنف</Button>
          ) : (
            <Button type="button" onClick={() => onOpenQuickCreate(barcode)}>+ إنشاء صنف جديد بهذا الباركود</Button>
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

const searchWarehouse = (warehouse: WarehouseOption, query: string) => {
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
export function PurchaseOdooPrototypePage() {
  const { theme, updateSessionMeta } = useAuthStore();
  const isDarkMode = theme === 'dark';
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const [activeQuickAction, setActiveQuickAction] = useState<'tax' | 'discount' | null>(null);
  const [discountMode, setDiscountMode] = useState<'percent' | 'value'>('value');
  const [customTaxRate, setCustomTaxRate] = useState('14');
  const [pendingFocusLineId, setPendingFocusLineId] = useState<number | null>(null);
  const [lines, setLines] = useState<PrototypeLine[]>(initialLines);
  const [supplier, setSupplier] = useState('مؤسسة النور للتوريدات');
  const [date, setDate] = useState('2026-05-19');
  const [requiredDate, setRequiredDate] = useState('2026-05-24');
  const [currency, setCurrency] = useState('EGP');
  const [company, setCompany] = useState('Z ERP Trading');
  const [contact, setContact] = useState('أحمد حسان');
  const [shippingAddress, setShippingAddress] = useState('مخزن القاهرة - مدينة نصر');
  const [taxRate, setTaxRate] = useState(14);
  const [discount, setDiscount] = useState(0);
  const [costCenter, setCostCenter] = useState('مشتريات تشغيلية');
  const [project, setProject] = useState('تجهيز فرع جديد');
  const [termsTemplate, setTermsTemplate] = useState('نموذج مشتريات قياسي');
  const [notes, setNotes] = useState('يرجى مراجعة الكميات مع أمين المخزن قبل التأكيد.');
  const [pendingFocusQtyLineId, setPendingFocusQtyLineId] = useState<number | null>(null);
  const [quickCreateState, setQuickCreateState] = useState<QuickCreateState>(null);
  const [barcodeScanOpen, setBarcodeScanOpen] = useState(false);
  const [barcodeScanQuery, setBarcodeScanQuery] = useState('');
  const [suppliers, setSuppliers] = useState<SupplierOption[]>(initialSuppliers);
  const [contactsList, setContactsList] = useState<ContactOption[]>(initialContacts);
  const [addressesList, setAddressesList] = useState<AddressOption[]>(initialAddresses);
  const [products, setProducts] = useState<ProductOption[]>(initialProducts);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>(initialWarehouses);
  const [costCenters, setCostCenters] = useState<CostCenterOption[]>(initialCostCenters);
  const [projects, setProjects] = useState<ProjectOption[]>(initialProjects);
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
        itemName: 'خدمة إضافية',
        qty: 1,
        unitPrice: 0,
        warehouse: 'لا يؤثر على المخزون',
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
          warehouse: option.type === 'service' ? 'لا يؤثر على المخزون' : option.warehouse,
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
        warehouse: option.type === 'service' ? 'لا يؤثر على المخزون' : option.warehouse,
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
          warehouse: matched.type === 'service' ? 'لا يؤثر على المخزون' : matched.warehouse,
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
        shippingAddress: '',
        company: company
      };
      setSuppliers((items) => [...items, createdSupplier]);
      handleSupplierSelect(createdSupplier);
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
        warehouse: result.productType === 'service' ? 'لا يؤثر على المخزون' : result.warehouse || 'المستودع الرئيسي',
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
      nextErrors.supplier = 'يرجى اختيار المورد';
      addFirstTarget({ kind: 'field', field: 'supplier' });
    }

    if (!date.trim()) {
      nextErrors.date = 'يرجى تحديد التاريخ';
      addFirstTarget({ kind: 'field', field: 'date' });
    }

    if (!requiredDate.trim()) {
      nextErrors.requiredDate = 'يرجى تحديد التاريخ المطلوب';
      addFirstTarget({ kind: 'field', field: 'requiredDate' });
    }

    if (!currency.trim()) {
      nextErrors.currency = 'يرجى اختيار العملة';
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
        nextErrors.rows[lines[0].id] = { product: 'يرجى إضافة صنف واحد على الأقل' };
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
        rowErrors.product = 'يرجى اختيار الصنف';
        addFirstTarget({ kind: 'line', lineId: line.id, field: 'product' });
      }

      const qtyValue = Number.isFinite(line.qty) ? line.qty : parseLocalizedNumber(String(line.qty));
      if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
        rowErrors.qty = 'الكمية يجب أن تكون أكبر من صفر';
        addFirstTarget({ kind: 'line', lineId: line.id, field: 'qty' });
      }

      const priceValue = Number.isFinite(line.unitPrice) ? line.unitPrice : parseLocalizedNumber(String(line.unitPrice));
      if (!Number.isFinite(priceValue) || priceValue < 0) {
        rowErrors.price = 'السعر يجب ألا يكون أقل من صفر';
        addFirstTarget({ kind: 'line', lineId: line.id, field: 'price' });
      }

      const product = line.productId ? products.find((item) => item.id === line.productId) : undefined;
      const requiresWarehouse = product ? product.type === 'stock' : !line.isService;
      if (requiresWarehouse && !line.warehouse.trim()) {
        rowErrors.warehouse = 'يرجى اختيار المستودع';
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

  const handleSaveDraft = () => {
    if (!computeHasMeaningfulData()) {
      setInlineMessage({ tone: 'error', text: 'لا توجد بيانات لحفظها' });
      return;
    }

    saveDraftToStorage('draft');
    setValidationErrors({ rows: {} });
    setInlineMessage({ tone: 'success', text: 'تم حفظ المسودة بنجاح' });
  };

  const handleConfirmInvoice = () => {
    const validation = validateBeforeConfirm();
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      setDocumentStatus('draft');
      setInlineMessage({ tone: 'error', text: 'يرجى استكمال البيانات المطلوبة قبل التأكيد' });
      focusFirstInvalidField(validation.firstInvalidTarget ?? null);
      return;
    }

    const payload = buildDraftPayload('confirmed');
    window.localStorage.setItem(PURCHASE_DRAFT_STORAGE_KEY, JSON.stringify(payload));
    lastSavedSnapshotRef.current = JSON.stringify(payload);
    setDocumentStatus('confirmed');
    setValidationErrors({ rows: {} });
    setInlineMessage({ tone: 'success', text: 'تم تأكيد الفاتورة بنجاح' });
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

  return (
    <div className={`page-shell document-prototype-shell purchase-new-prototype${isDarkMode ? ' purchase-prototype-dark' : ''}`} dir="rtl">
      <div className={`purchase-prototype-sticky-stack${isHeaderScrolled ? ' is-scrolled' : ''}`}>
        <div className="purchase-prototype-workspace-toolbar">
          <div className="purchase-prototype-toolbar-inner">
            <div className="purchase-prototype-breadcrumb">
              <Link to="/purchases">المشتريات</Link>
              <span>›</span>
              <Link to="/purchases">طلبات الشراء</Link>
              <span>›</span>
              <strong>طلب شراء جديد</strong>
            </div>

            <div className="purchase-prototype-toolbar-actions">
              <div className="purchase-prototype-search-container" role="search">
                <div className="purchase-prototype-search">
                  <span aria-hidden="true">⌕</span>
                  <input 
                    type="search" 
                    className="purchase-prototype-toolbar-search-input" 
                    placeholder="بحث..." 
                    aria-label="بحث"
                    value={globalSearchQuery}
                    onChange={(e) => setGlobalSearchQuery(e.target.value)}
                    onFocus={() => setGlobalSearchOpen(true)}
                    onBlur={() => setTimeout(() => setGlobalSearchOpen(false), 200)}
                  />
                </div>
                {globalSearchOpen && globalSearchQuery && (
                  <div className="purchase-prototype-search-dropdown">
                    {filteredSearchSuppliers.length > 0 && (
                      <div className="purchase-prototype-search-group">
                        <div className="purchase-prototype-search-group-title">الموردون</div>
                        {filteredSearchSuppliers.map(s => (
                          <div key={s.id} className="purchase-prototype-search-item" onMouseDown={(e) => { e.preventDefault(); handleSupplierSelect(s); setGlobalSearchOpen(false); }}>
                            <span className="purchase-prototype-search-item-icon">👤</span>
                            {s.name} {s.code && <span style={{ opacity: 0.5, marginRight: '4px' }}>({s.code})</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {filteredSearchProducts.length > 0 && (
                      <div className="purchase-prototype-search-group">
                        <div className="purchase-prototype-search-group-title">المنتجات</div>
                        {filteredSearchProducts.map(p => (
                          <div key={p.id} className="purchase-prototype-search-item">
                            <span className="purchase-prototype-search-item-icon">📦</span>
                            {p.name} {p.code && <span style={{ opacity: 0.5, marginRight: '4px' }}>({p.code})</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="purchase-prototype-search-group">
                      <div className="purchase-prototype-search-group-title">أوامر سريعة</div>
                      <div className="purchase-prototype-search-item">
                        <span className="purchase-prototype-search-item-icon">📄</span>
                        بحث في المستندات: "{globalSearchQuery}"
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                className={`purchase-prototype-icon-button purchase-prototype-toolbar-icon-button${isDarkMode ? ' is-active' : ''}`}
                aria-label="الوضع الداكن"
                aria-pressed={isDarkMode}
                title="الوضع الداكن"
                onClick={() => updateSessionMeta({ theme: isDarkMode ? 'light' : 'dark' })}
              >
                {isDarkMode ? '☀' : '◐'}
              </button>
              <AppAccountMenu />
            </div>
          </div>
        </div>

        <div className="purchase-prototype-document-surface">
        <div className="document-prototype-topbar">
            <div className="document-prototype-topbar-right">
              <button type="button" className="document-prototype-back-link" aria-label="العودة إلى المشتريات">←</button>
              <h1>طلب شراء جديد</h1>
              
              <span className={`document-prototype-status-badge is-${documentStatus}`}>
                {documentStatus === 'confirmed' ? 'مؤكد' : 'مسودة'}
              </span>
          </div>
          
          <div className="document-smart-buttons-box">
             <button className="document-smart-button">
               <span className="document-smart-button-value">3</span>
               <span className="document-smart-button-label">أوامر سابقة</span>
             </button>
             <button className="document-smart-button">
               <span className="document-smart-button-value">0 ج.م</span>
               <span className="document-smart-button-label">رصيد دائن</span>
             </button>
          </div>
          <div className="document-prototype-topbar-actions">
            <Button 
              variant="secondary" 
              type="button" 
              className={`purchase-prototype-toolbar-action purchase-prototype-toolbar-action-secondary ${inlineMessage?.text === 'تم حفظ المسودة بنجاح' ? 'is-success-state' : ''}`} 
              onClick={handleSaveDraft} 
              disabled={documentStatus === 'confirmed'}
              style={inlineMessage?.text === 'تم حفظ المسودة بنجاح' ? { backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#15803d', borderColor: 'rgba(34, 197, 94, 0.3)' } : {}}
            >
              {inlineMessage?.text === 'تم حفظ المسودة بنجاح' ? (
                <>
                  <span aria-hidden="true" className="purchase-prototype-save-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <span>تم حفظ المسودة بنجاح</span>
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
                  <span>حفظ كمسودة</span>
                </>
              )}
            </Button>
            <Button 
              type="button" 
              className={`purchase-prototype-toolbar-action purchase-prototype-toolbar-action-primary ${inlineMessage?.text === 'تم تأكيد الفاتورة بنجاح' ? 'is-success-state' : ''}`} 
              onClick={handleConfirmInvoice} 
              disabled={documentStatus === 'confirmed'}
              style={inlineMessage?.text === 'تم تأكيد الفاتورة بنجاح' ? { backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#15803d', borderColor: 'rgba(34, 197, 94, 0.3)' } : {}}
            >
              {inlineMessage?.text === 'تم تأكيد الفاتورة بنجاح' ? (
                <>
                  <span aria-hidden="true" className="purchase-prototype-save-icon" style={{ marginLeft: '4px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <span>تم تأكيد الفاتورة بنجاح</span>
                </>
              ) : (
                <span>تأكيد الفاتورة</span>
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
          <h3 className="document-prototype-section-title">المعلومات الأساسية</h3>
          <div className="document-prototype-grid compact-grid-3">
            <SearchableCombobox
              label="المورد"
              placeholder="ابحث عن مورد..."
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
            <Field label="التاريخ" error={validationErrors.date}><input ref={dateInputRef} className="purchase-prototype-field-input purchase-prototype-date-input" type="date" value={date} onChange={(event) => {
              markDocumentDirty();
              clearDocumentFieldError('date');
              setDate(event.target.value);
            }} /></Field>
            <Field label="التاريخ المطلوب" error={validationErrors.requiredDate}><input ref={requiredDateInputRef} className="purchase-prototype-field-input purchase-prototype-date-input" type="date" value={requiredDate} onChange={(event) => {
              markDocumentDirty();
              clearDocumentFieldError('requiredDate');
              setRequiredDate(event.target.value);
            }} /></Field>
            <Field label="العملة" error={validationErrors.currency}><input ref={currencyInputRef} className="purchase-prototype-field-input purchase-prototype-meta-input" value={currency} onChange={(event) => {
              markDocumentDirty();
              clearDocumentFieldError('currency');
              setCurrency(event.target.value);
            }} /></Field>
            <Field label="شركة"><input className="purchase-prototype-field-input purchase-prototype-meta-input" value={company} onChange={(event) => {
              markDocumentDirty();
              setCompany(event.target.value);
            }} /></Field>
            <SearchableCombobox
              label="جهة الاتصال"
              placeholder="ابحث عن جهة اتصال..."
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
              label="عنوان الشحن"
              placeholder="اختر أو ابحث عن عنوان..."
              value={shippingAddress}
              onChange={(value) => {
                markDocumentDirty();
                setShippingAddress(value);
              }}
              options={addressesList}
              search={searchAddress}
              getLabel={(option) => option.label}
              getMeta={(option) => [option.city, option.supplierName].filter(Boolean).join(' · ')}
              onSelect={handleAddressSelect}
              onCreate={(query) => openQuickCreate('address', query)}
              createLabel={(query) => `+ إنشاء عنوان جديد "${query}"`}
              inputRef={shippingInputRef}
              inputClassName="purchase-prototype-field-input purchase-prototype-address-input"
              dropdownClassName={purchaseDropdownClassName}
            />
          </div>
        </section>

        <section className="document-prototype-section">
          <h3 className="document-prototype-section-title">إرفاق المستندات</h3>
          <button type="button" className="document-prototype-upload">
            <span aria-hidden="true" className="document-prototype-upload-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.5 12.8 20.7a5 5 0 0 1-7.1-7.1L14.2 5.1a3.5 3.5 0 0 1 4.9 4.9L9.9 19.2" />
              </svg>
            </span>
            <span>اضغط أو اسحب لإرفاق المستندات الداعمة</span>
          </button>
        </section>

        <section className="document-prototype-section">
          <div className="document-prototype-section-header">
            <h3 className="document-prototype-section-title">الأصناف</h3>
            <div className="purchase-prototype-quick-actions" aria-label="إجراءات الأصناف السريعة">
              <button type="button" className="purchase-prototype-quick-action" title="إضافة بند خدمة لا يؤثر على المخزون" onClick={addServiceLine}>
                <span aria-hidden="true">+</span>
                <span>خدمة</span>
              </button>
              <button
                type="button"
                className="purchase-prototype-quick-action"
                title="تطبيق أو تغيير الضريبة"
                onClick={() => setActiveQuickAction((current) => (current === 'tax' ? null : 'tax'))}
              >
                <span aria-hidden="true">%</span>
                <span>معدل ضريبي</span>
              </button>
              <button
                type="button"
                className="purchase-prototype-quick-action"
                title="إضافة خصم على الفاتورة"
                onClick={() => setActiveQuickAction((current) => (current === 'discount' ? null : 'discount'))}
              >
                <span aria-hidden="true">🏷</span>
                <span>الخصم</span>
              </button>
            </div>
          </div>
          {activeQuickAction === 'tax' ? (
            <div className="purchase-prototype-popover" role="dialog" aria-label="معدل ضريبي">
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
                  aria-label="قيمة مخصصة"
                />
                <button type="button" className="purchase-prototype-popover-apply" onClick={applyCustomTaxRate}>
                  تطبيق
                </button>
              </div>
            </div>
          ) : null}
          {activeQuickAction === 'discount' ? (
            <div className="purchase-prototype-popover" role="dialog" aria-label="الخصم">
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
                  aria-label="قيمة الخصم"
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
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-product">الصنف</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-qty">الكمية</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-price">السعر</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-warehouse">المستودع</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-amount">المبلغ</th>
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
                        line.warehouse === 'لا يؤثر على المخزون' ? 'document-line-service' : '',
                        pendingFocusLineId === line.id ? 'document-line-highlight' : ''
                      ].filter(Boolean).join(' ')}
                    >
                      <td className="purchase-prototype-table-cell purchase-prototype-table-cell-product">
                        <SearchableCombobox
                          inline
                          inputId={`product-input-${line.id}`}
                          className="purchase-prototype-inline-combobox"
                          inputClassName="purchase-prototype-field-input purchase-prototype-combobox-input purchase-prototype-combobox-input-inline"
                          placeholder="ابحث عن صنف..."
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
                            const priceLabel = option.price > 0 ? `${Number.isInteger(option.price) ? option.price.toFixed(0) : option.price.toFixed(2)} ج.م` : undefined;
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
                            placeholder="ابحث عن مستودع..."
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
                      <td className="line-total">{formatMoney(amount)}</td>
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
            <Button type="button" variant="dashedAction" onClick={addLine}><span aria-hidden="true">+</span><span>إضافة صنف</span></Button>
            <Button type="button" variant="dashedAction" onClick={handleBarcodeScanAction}>
              <span aria-hidden="true" className="purchase-prototype-scan-icon">
                <svg viewBox="0 0 16 16" role="img" focusable="false" aria-hidden="true">
                  <path d="M3 4.2V3.1A.6.6 0 0 1 3.6 2.5h1.1M11.3 2.5h1.1a.6.6 0 0 1 .6.6v1.1M13 11.8v1.1a.6.6 0 0 1-.6.6h-1.1M4.7 13.5H3.6a.6.6 0 0 1-.6-.6v-1.1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5.1 5.2v5.6M7 5.2v5.6M9 5.2v5.6M10.9 5.2v5.6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </span>
              <span>مسح باركود</span>
            </Button>
            <Button type="button" variant="dashedAction" onClick={addProductLine}><span aria-hidden="true">+</span><span>منتج جديد</span></Button>
          </div>
        </section>

        <section className="document-prototype-section">
          <h3 className="document-prototype-section-title">المحاسبة</h3>
          <div className="document-prototype-grid compact-grid-2">
            <SearchableCombobox
              label="مركز التكلفة"
              placeholder="ابحث عن مركز تكلفة..."
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
              label="المشروع"
              placeholder="ابحث عن مشروع..."
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
          <h3 className="document-prototype-section-title">الشروط والأحكام</h3>
        <SearchableCombobox
          label="نموذج الشروط"
          placeholder="ابحث عن نموذج شروط..."
          value={termsTemplate}
          onChange={(value) => {
            markDocumentDirty();
            setTermsTemplate(value);
          }}
          options={[
            { id: 'term-1', name: 'نموذج مشتريات قياسي' },
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
            <h3 className="document-prototype-section-title">ملاحظات</h3>
            <textarea className="purchase-prototype-notes-textarea" rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="ملاحظات إضافية..." />
          </div>
          <div className="document-prototype-section document-totals-card">
            <h3 className="document-prototype-section-title">الإجماليات</h3>
            <div className="document-totals-panel">
              <div><span>المجموع الفرعي</span><strong>{formatMoney(subtotal)}</strong></div>
              <div><span>الضريبة</span><strong>{formatMoney(tax)}</strong></div>
              <div className="document-total-grand"><span>الإجمالي</span><strong>{formatMoney(total)}</strong></div>
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
