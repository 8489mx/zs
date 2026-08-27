import { useEffect, useMemo, useRef, useState } from 'react';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { InventoryProductPicker } from '@/features/inventory/components/InventoryProductPicker';
import { exportStockCountSheetExcel, printStockCountSheet, type StockCountSheetRow } from '@/features/inventory/lib/inventory-documents';
import { useCategoriesQuery, useSuppliersQuery } from '@/shared/hooks/use-catalog-queries';
import {
  BarcodeIcon,
  PrinterIcon,
  FileSpreadsheetIcon,
  DownloadIcon,
  CheckCircleIcon,
  SearchIcon,
  PlusIcon,
} from '@/shared/components/icons/AppIcons';
import type { Branch, Location, Product, StockCountItem, StockTransferItem } from '@/types/domain';
import { SINGLE_STORE_MODE } from '@/config/product-scope';

interface StockTransferComposerCardProps {
  products: Product[];
  warehouses?: Location[];
  locations?: Location[];
  form: { fromLocationId: string; toLocationId: string; note: string; recipientName: string; productId: string; qty: string };
  items: StockTransferItem[];
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  error?: unknown;
  onFormChange: (patch: Partial<{ fromLocationId: string; toLocationId: string; note: string; recipientName: string; productId: string; qty: string }>) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onSubmit: () => void;
}

export function StockTransferComposerCard({
  products,
  warehouses,
  locations,
  form,
  items,
  isPending,
  isError,
  isSuccess,
  error,
  onFormChange,
  onAddItem,
  onRemoveItem,
  onSubmit
}: StockTransferComposerCardProps) {
  const warehouseList = warehouses || locations || [];
  return (
    <FormSection title="إذن صرف / نقل مخزون" description="تجميع الأصناف أولًا ثم اعتماد إذن الصرف مع إبقاء المراجعة السريعة للعناصر قبل الإرسال." actions={<span className="nav-pill">أذونات الصرف</span>}>
      <div className="form-grid">
        <Field label="من مخزن">
          <select value={form.fromLocationId} onChange={(e) => onFormChange({ fromLocationId: e.target.value })}>
            <option value="">اختر المصدر</option>
            {warehouseList.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </Field>
        <Field label="إلى مخزن / فرع">
          <select value={form.toLocationId} onChange={(e) => onFormChange({ toLocationId: e.target.value })}>
            <option value="">اختر الوجهة</option>
            {warehouseList.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </Field>
        <Field label="مستلم البضاعة / السائق">
          <input type="text" placeholder="اسم المستلم (اختياري)" value={form.recipientName || ''} onChange={(e) => onFormChange({ recipientName: e.target.value })} />
        </Field>
        <Field label="الصنف">
          <InventoryProductPicker
            products={products}
            value={form.productId}
            onChange={(productId) => onFormChange({ productId })}
            showStock
            showPrice={false}
          />
        </Field>
        <Field label="الكمية">
          <input type="number" min="0.001" step="0.001" value={form.qty} onChange={(e) => onFormChange({ qty: e.target.value })} />
        </Field>
        <Field label="ملاحظات">
          <textarea rows={3} value={form.note} onChange={(e) => onFormChange({ note: e.target.value })} />
        </Field>
        <div className="field">
          <span>العناصر</span>
          <div className="actions compact-actions">
            <Button type="button" variant="secondary" onClick={onAddItem}>إضافة إلى إذن الصرف</Button>
            <SubmitButton type="button" onClick={onSubmit} isPending={isPending} disabled={!items.length} idleText="حفظ إذن الصرف" pendingText="جارٍ الحفظ..." />
          </div>
        </div>
      </div>
      <MutationFeedback isError={isError} isSuccess={isSuccess} error={error} errorFallback="تعذر إنشاء إذن الصرف" successText="تم إنشاء إذن الصرف بنجاح." />
      <div className="list-stack" style={{ marginTop: 12 }}>
        {items.length ? items.map((item, index) => (
          <div className="list-row stacked-row" key={item.id}>
            <div>
              <strong>{item.productName}</strong>
              <div className="muted small">الكمية: {item.qty}</div>
            </div>
            <Button type="button" variant="danger" onClick={() => onRemoveItem(index)}>حذف</Button>
          </div>
        )) : <EmptyState title="لا توجد عناصر مضافة لإذن الصرف" hint="أضف صنفًا واحدًا على الأقل ثم احفظ." />}
      </div>
    </FormSection>
  );
}

interface StockCountComposerCardProps {
  products: Product[];
  branches: Branch[];
  warehouses?: Location[];
  locations?: Location[];
  form: { branchId: string; locationId: string; note: string; managerPin: string; productId: string; countedQty: string; reason: string; itemNote: string };
  items: StockCountItem[];
  canReviewStock: boolean;
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  error?: unknown;
  onFormChange: (patch: Partial<{ branchId: string; locationId: string; note: string; managerPin: string; productId: string; countedQty: string; reason: string; itemNote: string }>) => void;
  onItemsChange: (updater: (current: StockCountItem[]) => StockCountItem[]) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onSubmit: (options?: { noteOverride?: string }) => void;
}

type StockCountType = 'quick' | 'selected_items' | 'category' | 'supplier' | 'full';

export function StockCountComposerCard({
  products,
  branches,
  warehouses,
  locations,
  form,
  items,
  canReviewStock,
  isPending,
  isError,
  isSuccess,
  error,
  onFormChange,
  onItemsChange,
  onAddItem,
  onRemoveItem: _onRemoveItem,
  onSubmit
}: StockCountComposerCardProps) {
  const warehouseList = warehouses || locations || [];
  const selectedLocation = warehouseList.find((location) => String(location.id) === String(form.locationId));
  const categoriesQuery = useCategoriesQuery();
  const categories = Array.isArray(categoriesQuery.data) ? categoriesQuery.data : [];
  const suppliersQuery = useSuppliersQuery();
  const suppliers = Array.isArray(suppliersQuery.data) ? suppliersQuery.data : [];

  const getCategoryName = (id?: string) => {
    if (!id) return '';
    const trimmed = String(id).trim();
    const found = categories.find((c) => String(c.id) === trimmed || String(c.name).trim() === trimmed);
    return found?.name || (trimmed ? `قسم ${trimmed}` : '');
  };

  const categoryOptions = useMemo(() => {
    const unique = new Map<string, { id: string; label: string; count: number }>();
    products.forEach((product) => {
      const id = String(product.categoryId || '').trim();
      if (!id) return;
      const current = unique.get(id);
      unique.set(id, {
        id,
        label: getCategoryName(id),
        count: (current?.count || 0) + 1,
      });
    });
    return Array.from(unique.values()).sort((a, b) => a.label.localeCompare(b.label, 'ar'));
  }, [products, categories]);

  const supplierOptions = useMemo(() => {
    const unique = new Map<string, { id: string; label: string; count: number }>();
    products.forEach((product) => {
      const id = String(product.supplierId || '').trim();
      if (!id) return;
      const supplierObj = suppliers.find((s) => String(s.id) === id);
      const label = supplierObj?.name || `مورد ${id}`;
      const current = unique.get(id);
      unique.set(id, {
        id,
        label,
        count: (current?.count || 0) + 1,
      });
    });
    return Array.from(unique.values()).sort((a, b) => a.label.localeCompare(b.label, 'ar'));
  }, [products, suppliers]);

  const countTypeOptions: Array<{ key: StockCountType; label: string; description: string }> = useMemo(() => ([
    { key: 'quick', label: 'جرد سريع', description: 'عد صنف أو مجموعة بسيطة بسرعة بدون تجهيز قائمة كاملة.' },
    { key: 'selected_items', label: 'أصناف محددة', description: 'اختر الأصناف التي تريد عدها يدويًا قبل إنشاء الجلسة.' },
    { key: 'category', label: 'جرد قسم / تصنيف', description: 'اختر القسم لفتح شيت عد أصناف هذا القسم فقط.' },
    { key: 'supplier', label: 'جرد مورد / شركة', description: 'اختر المورد لفتح شيت عد أصناف هذا المورد قبل طلبية الشراء.' },
    { key: 'full', label: 'جرد شامل للمخزن', description: 'جهّز شيت عد لكل الأصناف ثم أدخل الفروقات بعد العد الفعلي.' },
  ]), []);

  const [countType, setCountType] = useState<StockCountType>('quick');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [isCountStarted, setIsCountStarted] = useState(false);
  const [startCountMessage, setStartCountMessage] = useState('');
  const [showExpectedInElectronicCount, setShowExpectedInElectronicCount] = useState(false);
  const [barcodeScanInput, setBarcodeScanInput] = useState('');
  const [lastScannedItem, setLastScannedItem] = useState<{ name: string; qty: number } | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = products.find((product) => String(product.id) === String(form.productId));
  const totalCounted = items.reduce((sum, item) => sum + Number(item.countedQty || 0), 0);
  const totalVariance = Number(items.reduce((sum, item) => sum + Number(item.varianceQty || 0), 0).toFixed(3));
  const varianceItems = items.filter((item) => Number(item.varianceQty || 0) !== 0).length;
  const selectedCountType = countTypeOptions.find((entry) => entry.key === countType) || countTypeOptions[0];
  const canShowExpectedCount = canReviewStock && showExpectedInElectronicCount;

  const financialSummary = useMemo(() => {
    let deficitCost = 0;
    let surplusCost = 0;
    items.forEach((item) => {
      const prod = products.find((p) => String(p.id) === String(item.productId));
      const cost = Number(prod?.costPrice || 0);
      const variance = Number(item.varianceQty || 0);
      if (variance < 0) deficitCost += Math.abs(variance) * cost;
      if (variance > 0) surplusCost += variance * cost;
    });
    return {
      deficitCost,
      surplusCost,
      netCost: surplusCost - deficitCost,
    };
  }, [items, products]);

  useEffect(() => {
    if (!form.locationId) {
      setIsCountStarted(false);
      setStartCountMessage('');
    }
  }, [form.locationId]);

  useEffect(() => {
    if (countType !== 'category') setSelectedCategoryId('');
    if (countType !== 'supplier') setSelectedSupplierId('');
    onItemsChange(() => []);
    setIsCountStarted(false);
    setStartCountMessage('');
  }, [countType, onItemsChange]);

  useEffect(() => {
    if (isSuccess) {
      setIsCountStarted(false);
      setCountType('quick');
      setSelectedCategoryId('');
      setSelectedSupplierId('');
      setShowExpectedInElectronicCount(false);
      setStartCountMessage('');
      setLastScannedItem(null);
    }
  }, [isSuccess]);

  const scopeProducts = useMemo(() => {
    if (countType === 'full') return products;
    if (countType === 'category') {
      const categoryId = selectedCategoryId || selectedProduct?.categoryId || '';
      if (!categoryId) return [];
      return products.filter((product) => String(product.categoryId || '') === String(categoryId));
    }
    if (countType === 'supplier') {
      const supplierId = selectedSupplierId || selectedProduct?.supplierId || '';
      if (!supplierId) return [];
      return products.filter((product) => String(product.supplierId || '') === String(supplierId));
    }
    if (selectedProduct) return [selectedProduct];
    return [];
  }, [countType, products, selectedCategoryId, selectedSupplierId, selectedProduct]);

  const sheetRows: StockCountSheetRow[] = useMemo(() => {
    if (countType === 'full' || countType === 'category' || countType === 'supplier') {
      return scopeProducts.map((product) => ({
        code: product.styleCode || product.id,
        barcode: product.barcode || product.units?.find((unit) => unit.barcode)?.barcode || '',
        name: product.name,
        category: getCategoryName(product.categoryId),
        expectedQty: product.stock ?? 0,
        countedQty: '',
        note: '',
      }));
    }
    if (items.length) {
      return items.map((item) => {
        const product = products.find((entry) => String(entry.id) === String(item.productId));
        return {
          code: product?.styleCode || String(item.productId),
          barcode: product?.barcode || product?.units?.find((unit) => unit.barcode)?.barcode || '',
          name: item.productName,
          category: getCategoryName(product?.categoryId),
          expectedQty: item.expectedQty,
          countedQty: item.countedQty,
          note: item.note || item.reason || '',
        };
      });
    }
    return scopeProducts.map((product) => ({
      code: product.styleCode || product.id,
      barcode: product.barcode || product.units?.find((unit) => unit.barcode)?.barcode || '',
      name: product.name,
      category: getCategoryName(product.categoryId),
      expectedQty: product.stock ?? 0,
      countedQty: '',
      note: '',
    }));
  }, [countType, items, products, scopeProducts, categories]);

  function handlePopulateScopeItems() {
    if (!scopeProducts.length) return;
    onItemsChange(() => scopeProducts.map((p) => {
      const expectedQty = Number(p.stock || 0);
      return {
        id: `${p.id}-${Date.now()}`,
        productId: p.id,
        productName: p.name,
        expectedQty,
        countedQty: 0,
        varianceQty: Number((0 - expectedQty).toFixed(3)),
        reason: '',
        note: '',
      };
    }));
  }

  function handlePrintSheet() {
    printStockCountSheet(sheetRows, {
      title: `شيت عد - ${selectedCountType.label}`,
      locationName: selectedLocation?.name,
      includeExpectedQty: showExpectedInElectronicCount,
    });
  }

  function handleExportExcel() {
    exportStockCountSheetExcel(sheetRows, {
      includeExpectedQty: showExpectedInElectronicCount,
    });
  }

  function handleStartCount() {
    if (!form.locationId) {
      setStartCountMessage('اختر المخزن أولًا قبل بدء الجرد.');
      return;
    }
    if (countType === 'category' && !selectedCategoryId) {
      setStartCountMessage('اختر القسم المطلوب قبل بدء جرد القسم.');
      return;
    }
    if (countType === 'supplier' && !selectedSupplierId) {
      setStartCountMessage('اختر المورد المطلوب قبل بدء جرد المورد.');
      return;
    }
    setStartCountMessage('');
    setIsCountStarted(true);
  }

  function handleBackToSetup() {
    setIsCountStarted(false);
    setStartCountMessage('');
    setLastScannedItem(null);
  }

  function buildSessionNoteWithType(baseNote: string) {
    const categoryLabel = categoryOptions.find((category) => category.id === selectedCategoryId)?.label;
    const supplierLabel = supplierOptions.find((supplier) => supplier.id === selectedSupplierId)?.label;
    const scopeLabel = categoryLabel ? ` - قسم: ${categoryLabel}` : supplierLabel ? ` - مورد: ${supplierLabel}` : '';
    const line = `نوع الجرد: ${selectedCountType.label}${scopeLabel}`;
    const visibilityLine = `عرض كمية النظام أثناء العد الإلكتروني: ${showExpectedInElectronicCount ? 'نعم' : 'لا'}`;
    const trimmedBase = String(baseNote || '').trim();
    const metadata = `${line}\n${visibilityLine}`;
    if (!trimmedBase) return metadata;
    if (trimmedBase.includes(line)) return trimmedBase;
    return `${trimmedBase}\n${metadata}`;
  }

  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [tableFilterTab, setTableFilterTab] = useState<'all' | 'variance' | 'matched'>('all');

  const filteredItems = useMemo(() => {
    let result = items;
    const query = tableSearchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((item) => {
        const prod = products.find((p) => String(p.id) === String(item.productId));
        const name = String(item.productName || '').toLowerCase();
        const barcode = String(prod?.barcode || '').toLowerCase();
        const styleCode = String(prod?.styleCode || '').toLowerCase();
        return name.includes(query) || barcode.includes(query) || styleCode.includes(query);
      });
    }

    if (tableFilterTab === 'variance') {
      result = result.filter((item) => Number(item.varianceQty || 0) !== 0);
    } else if (tableFilterTab === 'matched') {
      result = result.filter((item) => Number(item.varianceQty || 0) === 0);
    }

    return result;
  }, [items, products, tableSearchQuery, tableFilterTab]);

  function updateCountItemById(id: string, patch: Partial<StockCountItem>) {
    onItemsChange((current) => current.map((item) => {
      if (item.id !== id) return item;
      const countedQty = patch.countedQty == null ? Number(item.countedQty || 0) : Number(patch.countedQty || 0);
      const expectedQty = Number(item.expectedQty || 0);
      return {
        ...item,
        ...patch,
        countedQty,
        varianceQty: Number((countedQty - expectedQty).toFixed(3)),
      };
    }));
  }

  function removeCountItemById(id: string) {
    onItemsChange((current) => current.filter((item) => item.id !== id));
  }

  function handleBarcodeScan(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;
    const matchedProduct = products.find((p) =>
      String(p.barcode || '').trim() === trimmed ||
      String(p.styleCode || '').trim() === trimmed ||
      String(p.id) === trimmed ||
      p.units?.some((u) => String(u.barcode || '').trim() === trimmed)
    );
    if (!matchedProduct) {
      setStartCountMessage(`لم يتم العثور على صنف بالباركود: ${trimmed}`);
      return;
    }
    setStartCountMessage('');
    const existingItem = items.find((item) => String(item.productId) === String(matchedProduct.id));
    if (existingItem) {
      const nextQty = Number(existingItem.countedQty || 0) + 1;
      updateCountItemById(existingItem.id, { countedQty: nextQty });
      setLastScannedItem({ name: existingItem.productName, qty: nextQty });
    } else {
      const expectedQty = Number(matchedProduct.stock || 0);
      const newItem: StockCountItem = {
        id: `${matchedProduct.id}-${Date.now()}`,
        productId: matchedProduct.id,
        productName: matchedProduct.name,
        expectedQty,
        countedQty: 1,
        varianceQty: Number((1 - expectedQty).toFixed(3)),
        reason: '',
        note: '',
      };
      onItemsChange((current) => [newItem, ...current]);
      setLastScannedItem({ name: matchedProduct.name, qty: 1 });
    }
    setBarcodeScanInput('');
  }

  function handleBarcodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBarcodeScan(barcodeScanInput);
    }
  }

  return (
    <FormSection
      title="جلسة جرد مخزون"
      description={isCountStarted ? 'راجع الأصناف، أدخل الكميات الفعلية، ثم أنشئ جلسة الجرد بعد المراجعة.' : 'ابدأ بخطوات قليلة: اختر طريقة الجرد، النطاق، وطريقة العد.'}
      actions={<span className="nav-pill">{isCountStarted ? 'مرحلة العد والمراجعة' : 'إنشاء الجلسة'}</span>}
    >
      {!isCountStarted ? (
        <div className="stock-count-setup-stack">
          <div className="stock-count-step-card">
            <div className="stock-count-step-heading">
              <span>1</span>
              <div>
                <strong>طريقة الجرد</strong>
                <small>اختر نمط الجرد المناسب للعملية الحالية</small>
              </div>
            </div>
            <div className="stock-count-method-grid">
              {countTypeOptions.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  className={`stock-count-method-card ${countType === entry.key ? 'stock-count-method-card--active' : ''}`}
                  onClick={() => setCountType(entry.key)}
                >
                  <strong>{entry.label}</strong>
                  <span>{entry.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="stock-count-step-card">
            <div className="stock-count-step-heading">
              <span>2</span>
              <div>
                <strong>نطاق الجرد والإعدادات</strong>
                <small>حدد المخزن والملاحظة وخيارات العد</small>
              </div>
            </div>
            <div className="stock-count-inline-form">
              {!SINGLE_STORE_MODE ? (
                <Field label="الفرع">
                  <select value={form.branchId} onChange={(e) => onFormChange({ branchId: e.target.value })}>
                    <option value="">بدون فرع</option>
                    {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </select>
                </Field>
              ) : null}
              <Field label="المخزن (إجباري)">
                <select value={form.locationId} onChange={(e) => onFormChange({ locationId: e.target.value })}>
                  <option value="">اختر المخزن</option>
                  {warehouseList.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </select>
              </Field>
              {countType === 'category' ? (
                <Field label="القسم / التصنيف">
                  <select value={selectedCategoryId} onChange={(e) => { setSelectedCategoryId(e.target.value); onItemsChange(() => []); }}>
                    <option value="">اختر القسم</option>
                    {categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.label} ({category.count})</option>)}
                  </select>
                </Field>
              ) : null}
              {countType === 'supplier' ? (
                <Field label="المورد / الشركة">
                  <select value={selectedSupplierId} onChange={(e) => { setSelectedSupplierId(e.target.value); onItemsChange(() => []); }}>
                    <option value="">اختر المورد</option>
                    {supplierOptions.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.label} ({supplier.count} صنف)</option>)}
                  </select>
                </Field>
              ) : null}
              <Field label="ملاحظة الجلسة">
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => onFormChange({ note: e.target.value })}
                  placeholder="مثال: جرد أسبوعي / جرد قبل طلبية المورد"
                />
              </Field>
            </div>

            <div className="stock-count-bottom-bar">
              <label className="stock-count-expected-toggle">
                <input type="checkbox" checked={showExpectedInElectronicCount} onChange={(event) => setShowExpectedInElectronicCount(event.target.checked)} disabled={!canReviewStock} />
                <span>إظهار كمية النظام أثناء الإدخال الإلكتروني</span>
              </label>
              <div className="stock-count-start-actions">
                <Button type="button" variant="primary" onClick={handleStartCount}>ابدأ جلسة الجرد</Button>
              </div>
            </div>
            {!canReviewStock ? <div className="surface-note" style={{ marginTop: 8 }}>وضع العد المخفي مفعل لهذا المستخدم لضمان عد فعلي بدون التأثر برصيد النظام.</div> : null}
          </div>

          {startCountMessage ? <div className="warning-box">{startCountMessage}</div> : null}
        </div>
      ) : (
        <div className="stock-count-review-stack">
          {/* Header Bar with inline stats & save actions */}
          <div className="stock-count-session-bar">
            <div className="stock-count-session-meta">
              <div className="session-title-group">
                <span className="stock-count-badge">{selectedCountType.label}</span>
                <strong>{selectedLocation?.name ? `المخزن: ${selectedLocation.name}` : 'المخزن'}</strong>
                {selectedCategoryId ? <span className="meta-tag">القسم: {categoryOptions.find((c) => c.id === selectedCategoryId)?.label || selectedCategoryId}</span> : null}
                {selectedSupplierId ? <span className="meta-tag">المورد: {supplierOptions.find((s) => s.id === selectedSupplierId)?.label || selectedSupplierId}</span> : null}
              </div>

              <div className="stock-count-stat-pills">
                <span className="stat-pill">الأصناف: <strong>{items.length}</strong></span>
                <span className="stat-pill">المعدود: <strong>{totalCounted}</strong></span>
                <span className="stat-pill">الفروقات: <strong>{totalVariance}</strong></span>
                {canShowExpectedCount && financialSummary.deficitCost > 0 ? (
                  <span className="stat-pill stat-pill--deficit">قيمة العجز: <strong>{financialSummary.deficitCost.toLocaleString('ar-EG')} ج.م</strong></span>
                ) : null}
              </div>
            </div>

            <div className="actions compact-actions">
              <Button type="button" variant="secondary" onClick={handleBackToSetup} disabled={isPending}>تعديل الإعدادات</Button>
              <SubmitButton type="button" onClick={() => onSubmit({ noteOverride: buildSessionNoteWithType(form.note) })} disabled={isPending || !items.length || !form.locationId} idleText="إنشاء وحفظ الجلسة" pendingText="جارٍ الإنشاء..." />
            </div>
          </div>

          {/* Unified Scanner & Action Toolbar */}
          <div className="stock-count-active-toolbar">
            <div className="stock-count-scanner-group">
              <span className="scanner-tag">
                <BarcodeIcon size={16} />
                <span>مسح سريع</span>
              </span>
              <input
                ref={barcodeInputRef}
                type="text"
                className="stock-count-scanner-field"
                placeholder="امسح الباركود للعد السريع (+1 تلقائياً)..."
                value={barcodeScanInput}
                onChange={(e) => setBarcodeScanInput(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
              />
              <Button type="button" variant="secondary" onClick={() => handleBarcodeScan(barcodeScanInput)}>عد</Button>
            </div>

            <div className="stock-count-tools-group">
              {canReviewStock ? (
                <label className="stock-count-sheet-expected-toggle" title="إظهار كميات النظام في شيت الطباعة والإكسيل">
                  <input
                    type="checkbox"
                    checked={showExpectedInElectronicCount}
                    onChange={(e) => setShowExpectedInElectronicCount(e.target.checked)}
                  />
                  <span>رصيد النظام</span>
                </label>
              ) : null}
              {(countType === 'category' || countType === 'supplier' || countType === 'full') && !items.length ? (
                <Button type="button" variant="primary" onClick={handlePopulateScopeItems}>
                  <DownloadIcon size={15} />
                  <span>إدخال إلكتروني ({scopeProducts.length} صنف)</span>
                </Button>
              ) : null}
              <Button type="button" variant="secondary" onClick={handlePrintSheet} disabled={!sheetRows.length}>
                <PrinterIcon size={15} />
                <span>طباعة الشيت</span>
              </Button>
              <Button type="button" variant="secondary" onClick={handleExportExcel} disabled={!sheetRows.length}>
                <FileSpreadsheetIcon size={15} />
                <span>Excel</span>
              </Button>
            </div>
          </div>

          {lastScannedItem ? (
            <div className="stock-count-scan-alert">
              <CheckCircleIcon size={16} color="#059669" />
              <span>تم مسح وعد: <strong>{lastScannedItem.name}</strong> (الكمية المعدودة: {lastScannedItem.qty})</span>
            </div>
          ) : null}

          {/* Quick Manual Add Row */}
          <div className="stock-count-quick-entry-row">
            <span className="entry-row-title">إضافة صنف:</span>
            <div className="entry-row-picker">
              <InventoryProductPicker products={products} value={form.productId} onChange={(productId) => onFormChange({ productId })} showStock showPrice={false} hideHint={true} />
            </div>
            <input
              type="number"
              min="0"
              step="0.001"
              className="entry-row-qty"
              value={form.countedQty}
              onChange={(e) => onFormChange({ countedQty: e.target.value })}
              placeholder="الكمية"
            />
            <input
              type="text"
              className="entry-row-reason"
              value={form.reason}
              onChange={(e) => onFormChange({ reason: e.target.value })}
              placeholder="سبب الفرق (مثال: عجز / كسر)"
            />
            <Button type="button" variant="secondary" onClick={onAddItem}>
              <PlusIcon size={15} />
              <span>إضافة صنف</span>
            </Button>
          </div>

          {startCountMessage ? <div className="warning-box">{startCountMessage}</div> : null}
          <MutationFeedback isError={isError} isSuccess={isSuccess} error={error} errorFallback="تعذر إنشاء جلسة الجرد" successText="تم إنشاء جلسة الجرد بنجاح." />

          {/* Table Search & Filter Bar */}
          {items.length > 3 ? (
            <div className="stock-count-table-filter-bar">
              <div className="stock-count-table-search-box">
                <span className="search-icon"><SearchIcon size={14} color="#94a3b8" /></span>
                <input
                  type="text"
                  className="table-search-input"
                  placeholder="ابحث في جدول الجلسة باسم الصنف أو الباركود..."
                  value={tableSearchQuery}
                  onChange={(e) => setTableSearchQuery(e.target.value)}
                />
                {tableSearchQuery ? (
                  <button type="button" className="clear-search-btn" onClick={() => setTableSearchQuery('')}>×</button>
                ) : null}
              </div>

              <div className="stock-count-filter-pills">
                <button
                  type="button"
                  className={`filter-pill-btn ${tableFilterTab === 'all' ? 'filter-pill-btn--active' : ''}`}
                  onClick={() => setTableFilterTab('all')}
                >
                  الكل ({items.length})
                </button>
                <button
                  type="button"
                  className={`filter-pill-btn ${tableFilterTab === 'variance' ? 'filter-pill-btn--active' : ''}`}
                  onClick={() => setTableFilterTab('variance')}
                >
                  فروقات ({varianceItems})
                </button>
                <button
                  type="button"
                  className={`filter-pill-btn ${tableFilterTab === 'matched' ? 'filter-pill-btn--active' : ''}`}
                  onClick={() => setTableFilterTab('matched')}
                >
                  مطابق ({items.length - varianceItems})
                </button>
              </div>
            </div>
          ) : null}

          {/* High Density Items Table */}
          <div className="table-wrap stock-count-items-table-wrap">
            {filteredItems.length ? (
              <table className="stock-count-items-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                    <th>الصنف</th>
                    {canShowExpectedCount ? <th style={{ textAlign: 'center' }}>كمية النظام</th> : null}
                    <th style={{ width: '130px', textAlign: 'center' }}>الكمية المعدودة</th>
                    {canShowExpectedCount ? <th style={{ textAlign: 'center' }}>الفرق</th> : null}
                    <th>سبب الفرق</th>
                    <th style={{ width: '70px', textAlign: 'center' }}>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>{index + 1}</td>
                      <td><strong>{item.productName}</strong></td>
                      {canShowExpectedCount ? <td style={{ textAlign: 'center' }} className="muted">{item.expectedQty || 0}</td> : null}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          style={{ textAlign: 'center', fontWeight: 'bold' }}
                          value={String(item.countedQty ?? 0)}
                          onChange={(event) => updateCountItemById(item.id, { countedQty: Number(event.target.value || 0) })}
                        />
                      </td>
                      {canShowExpectedCount ? (
                        <td style={{ textAlign: 'center' }}>
                          {Number(item.varianceQty || 0) === 0 ? (
                            <span className="stock-count-variance stock-count-variance--zero">مطابق (0)</span>
                          ) : Number(item.varianceQty || 0) < 0 ? (
                            <span className="stock-count-variance stock-count-variance--deficit">عجز {item.varianceQty}</span>
                          ) : (
                            <span className="stock-count-variance stock-count-variance--surplus">زيادة +{item.varianceQty}</span>
                          )}
                        </td>
                      ) : null}
                      <td>
                        <input value={item.reason || ''} onChange={(event) => updateCountItemById(item.id, { reason: event.target.value })} placeholder="سبب الفرق" />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Button type="button" variant="secondary" onClick={() => removeCountItemById(item.id)}>إزالة</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : items.length ? (
              <EmptyState
                title="لا توجد نتائج مطابقة للبحث"
                hint="جرب البحث بكلمة أخرى أو اضغط على تصنيف (الكل)."
              />
            ) : (
              <EmptyState
                title="لا توجد عناصر في جلسة الجرد حتى الآن"
                hint={countType === 'category' || countType === 'supplier' || countType === 'full' ? 'اضغط على زر (إدخال إلكتروني) بالأعلى لتنزيل الأصناف، أو استخدم مسح الباركود.' : 'استخدم ماسح الباركود أو الإضافة اليدوية بالأعلى لبدء تسجيل الأصناف.'}
              />
            )}
          </div>
        </div>
      )}
    </FormSection>
  );
}
