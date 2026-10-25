import { useTranslation } from 'react-i18next';
import { buildCountLocationStockMap, filterCountableProductsAtLocation } from '@/features/inventory/lib/count-location-scoping';
import { classifyStockCountBarcodeScan } from '@/features/inventory/lib/count-barcode-identity';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { InventoryProductPicker } from '@/features/inventory/components/InventoryProductPicker';
import { useClientPagination } from '@/shared/hooks/use-client-pagination';
import { exportStockCountSheetExcel, printStockCountSheet, type StockCountSheetRow } from '@/features/inventory/lib/inventory-documents';
import { useCategoriesQuery, useSuppliersQuery } from '@/shared/hooks/use-catalog-queries';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import {
  BarcodeIcon,
  PrinterIcon,
  FileSpreadsheetIcon,
  DownloadIcon,
  CheckCircleIcon,
  SearchIcon,
  PlusIcon,
  RefreshCwIcon,
  SlidersIcon,
  RotateCcwIcon,
} from '@/shared/components/icons/AppIcons';
import { toast, systemConfirm } from '@/shared/components/system-alert';
import type { Branch, Location, Product, StockCountItem, StockTransferItem } from '@/types/domain';
import { SINGLE_STORE_MODE } from '@/config/product-scope';

interface StockTransferComposerCardProps {
  products: Product[];
  warehouses?: Location[];
  locations?: Location[];
  form: { fromLocationId: string; toLocationId: string; note: string; recipientName: string; productId: string; qty: string; serials: string; batchAllocations: string };
  items: StockTransferItem[];
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  error?: unknown;
  onFormChange: (patch: Partial<{ fromLocationId: string; toLocationId: string; note: string; recipientName: string; productId: string; qty: string; serials: string; batchAllocations: string }>) => void;
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
  const { t } = useTranslation();
  const warehouseList = warehouses || locations || [];
  const warehouseOptions = useMemo(
    () => [
      { value: '', label: 'اختر المخزن' },
      ...warehouseList.map((location) => ({ value: String(location.id), label: location.name })),
    ],
    [warehouseList],
  );

  return (
    <FormSection title={t('inventory.sections.inventory_composer_cards.s0', "إذن صرف / نقل مخزون")} description={t('inventory.sections.inventory_composer_cards.s1', "تجميع الأصناف أولًا ثم اعتماد إذن الصرف مع إبقاء المراجعة السريعة للعناصر قبل الإرسال.")} actions={<span className="nav-pill">{t('inventory.sections.inventory_composer_cards.s2', "أذونات الصرف")}</span>}>
      <div className="form-grid">
        <Field label={t('inventory.sections.inventory_composer_cards.s3', "من مخزن")}>
          <CustomSelect
            value={form.fromLocationId}
            onChange={(val) => onFormChange({ fromLocationId: val })}
            options={warehouseOptions}
            placeholder={t('inventory.sections.inventory_composer_cards.s4', "اختر المصدر")}
          />
        </Field>
        <Field label={t('inventory.sections.inventory_composer_cards.s5', "إلى مخزن / فرع")}>
          <CustomSelect
            value={form.toLocationId}
            onChange={(val) => onFormChange({ toLocationId: val })}
            options={warehouseOptions}
            placeholder={t('inventory.sections.inventory_composer_cards.s6', "اختر الوجهة")}
          />
        </Field>
        <Field label={t('inventory.sections.inventory_composer_cards.s7', "مستلم البضاعة / السائق")}>
          <input type="text" placeholder={t('inventory.sections.inventory_composer_cards.s8', "اسم المستلم (اختياري)")} value={form.recipientName || ''} onChange={(e) => onFormChange({ recipientName: e.target.value })} />
        </Field>
        <Field label={t('inventory.sections.inventory_composer_cards.s9', "الصنف")}>
          <InventoryProductPicker
            products={products}
            value={form.productId}
            onChange={(productId) => onFormChange({ productId })}
            showStock
            showPrice={false}
          />
        </Field>
        <Field label={t('inventory.sections.inventory_composer_cards.s10', "الكمية")}>
          <input type="number" min="0.001" step="0.001" value={form.qty} onChange={(e) => onFormChange({ qty: e.target.value })} />
        </Field>
        <Field label="سيريالات القطع المنقولة (رقم لكل سطر)">
          <textarea rows={2} value={form.serials || ''} placeholder="IMEI / Serial" onChange={(e) => onFormChange({ serials: e.target.value })} />
        </Field>
        <Field label="توزيع التشغيلات (رقم التشغيلة في النظام:الكمية لكل سطر)">
          <textarea rows={2} value={form.batchAllocations || ''} placeholder="123:2\n124:3" onChange={(e) => onFormChange({ batchAllocations: e.target.value })} />
        </Field>
        <Field label={t('inventory.sections.inventory_composer_cards.s11', "ملاحظات")}>
          <textarea rows={3} value={form.note} onChange={(e) => onFormChange({ note: e.target.value })} />
        </Field>
        <div className="field">
          <span>{t('inventory.sections.inventory_composer_cards.s12', "العناصر")}</span>
          <div className="actions compact-actions">
            <Button type="button" variant="secondary" onClick={onAddItem}>{t('inventory.sections.inventory_composer_cards.s13', "إضافة إلى إذن الصرف")}</Button>
            <SubmitButton type="button" onClick={onSubmit} isPending={isPending} disabled={!items.length} idleText={t('inventory.sections.inventory_composer_cards.s14', "حفظ إذن الصرف")} pendingText={t('inventory.sections.inventory_composer_cards.s15', "جارٍ الحفظ...")} />
          </div>
        </div>
      </div>
      <MutationFeedback isError={isError} isSuccess={isSuccess} error={error} errorFallback={t('inventory.sections.inventory_composer_cards.s16', "تعذر إنشاء إذن الصرف")} successText={t('inventory.sections.inventory_composer_cards.s17', "تم إنشاء إذن الصرف بنجاح.")} />
      <div className="list-stack" style={{ marginTop: 12 }}>
        {items.length ? items.map((item, index) => (
          <div className="list-row stacked-row" key={item.id}>
            <div>
              <strong>{item.productName}</strong>
              <div className="muted small">{t('inventory.sections.inventory_composer_cards.s18', "الكمية:")} {item.qty}{item.serials?.length ? ` — ${item.serials.length} سيريال` : ''}{item.batchAllocations?.length ? ` — ${item.batchAllocations.length} تشغيلة` : ''}</div>
            </div>
            <Button type="button" variant="danger" onClick={() => onRemoveItem(index)}>{t('inventory.sections.inventory_composer_cards.s19', "حذف")}</Button>
          </div>
        )) : <EmptyState title={t('inventory.sections.inventory_composer_cards.s20', "لا توجد عناصر مضافة لإذن الصرف")} hint={t('inventory.sections.inventory_composer_cards.s21', "أضف صنفًا واحدًا على الأقل ثم احفظ.")} />}
      </div>
    </FormSection>
  );
}

interface StockCountComposerCardProps {
  products: Product[];
  branches: Branch[];
  warehouses?: Location[];
  locations?: Location[];
  locationStocks?: Array<{ productId: number | string; locationId: number | string; qty: number }>;
  isLoadingCatalog?: boolean;
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
  locationStocks,
  isLoadingCatalog,
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
  const { t } = useTranslation();
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

  const branchOptions = useMemo(
    () => [
      { value: '', label: 'بدون فرع' },
      ...branches.map((branch) => ({ value: String(branch.id), label: branch.name })),
    ],
    [branches],
  );

  const stockCountWarehouseOptions = useMemo(
    () => [
      { value: '', label: 'اختر المخزن' },
      ...warehouseList.map((location) => ({ value: String(location.id), label: location.name })),
    ],
    [warehouseList],
  );

  const categorySelectOptions = useMemo(
    () => [
      { value: '', label: 'اختر القسم' },
      ...categoryOptions.map((category) => ({ value: String(category.id), label: `${category.label} (${category.count})` })),
    ],
    [categoryOptions],
  );

  const supplierSelectOptions = useMemo(
    () => [
      { value: '', label: 'اختر المورد' },
      ...supplierOptions.map((supplier) => ({ value: String(supplier.id), label: `${supplier.label} (${supplier.count} صنف)` })),
    ],
    [supplierOptions],
  );

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
  const countedItemsList = useMemo(() => items.filter((item) => item.isCounted !== false && item.countedQty !== '' && item.countedQty != null), [items]);
  const totalCounted = countedItemsList.reduce((sum, item) => sum + Number(item.countedQty || 0), 0);
  const totalVariance = Number(countedItemsList.reduce((sum, item) => sum + Number(item.varianceQty || 0), 0).toFixed(3));
  const varianceItems = countedItemsList.filter((item) => Number(item.varianceQty || 0) !== 0).length;
  const countedCount = countedItemsList.length;
  const uncountedCount = items.length - countedCount;
  const selectedCountType = countTypeOptions.find((entry) => entry.key === countType) || countTypeOptions[0];
  const canShowExpectedCount = canReviewStock && showExpectedInElectronicCount;

  const financialSummary = useMemo(() => {
    let deficitCost = 0;
    let surplusCost = 0;
    countedItemsList.forEach((item) => {
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
  }, [countedItemsList, products]);

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

  const scopedStocks = useMemo(() => buildCountLocationStockMap(form.locationId, locationStocks),
    [form.locationId, locationStocks]);
  const indexedProducts = useMemo(() => new Map(products.map((product) => [String(product.id), product])), [products]);
  const getProductLocationStock = (productId: string | number) =>
    scopedStocks === null ? null : scopedStocks.get(String(productId)) ?? 0;

  const scopeProducts = useMemo(() => {
    // Empty or unavailable warehouse stock never means the entire company.
    const baseProducts = form.locationId ? filterCountableProductsAtLocation(products, scopedStocks) : products;
    if (countType === 'full') return baseProducts;
    if (countType === 'category') {
      const categoryId = selectedCategoryId || selectedProduct?.categoryId || '';
      if (!categoryId) return [];
      return baseProducts.filter((product) => String(product.categoryId || '') === String(categoryId));
    }
    if (countType === 'supplier') {
      const supplierId = selectedSupplierId || selectedProduct?.supplierId || '';
      if (!supplierId) return [];
      return baseProducts.filter((product) => String(product.supplierId || '') === String(supplierId));
    }
    if (selectedProduct) return [selectedProduct];
    return [];
  }, [countType, products, selectedCategoryId, selectedSupplierId, selectedProduct, form.locationId, scopedStocks]);

  const sheetRows: StockCountSheetRow[] = useMemo(() => {
    const resolveExpected = (pId: string | number, fallback: number) => {
      const locQty = getProductLocationStock(pId);
      return locQty !== null ? locQty : fallback;
    };

    if (countType === 'full' || countType === 'category' || countType === 'supplier') {
      return scopeProducts.map((product) => ({
        code: product.styleCode || product.id,
        barcode: product.barcode || product.units?.find((unit) => unit.barcode)?.barcode || '',
        name: product.name,
        category: getCategoryName(product.categoryId),
        expectedQty: resolveExpected(product.id, product.stock ?? 0),
        countedQty: '',
        note: '',
      }));
    }
    if (items.length) {
      return items.map((item) => {
        const product = indexedProducts.get(String(item.productId));
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
      expectedQty: resolveExpected(product.id, product.stock ?? 0),
      countedQty: '',
      note: '',
    }));
  }, [countType, items, indexedProducts, scopeProducts, categories, form.locationId, scopedStocks]);

  function handlePopulateScopeItems() {
    if (!scopeProducts.length) return;
    onItemsChange(() => scopeProducts.map((p) => {
      const locQty = getProductLocationStock(p.id);
      const expectedQty = locQty !== null ? locQty : Number(p.stock || 0);
      return {
        id: `${p.id}-${Date.now()}`,
        productId: p.id,
        productName: p.name,
        expectedQty,
        countedQty: '',
        varianceQty: 0,
        isCounted: false,
        reason: '',
        note: '',
      };
    }));
  }

  async function handleResetAllToExpected() {
    if (!items.length) return;
    if (countedCount > 0) {
      const confirmed = await systemConfirm({
        title: 'ملء برصيد النظام',
        message: 'سيتم تعيين كافة الكميات المعدودة لتطابق رصيد النظام المسجل بالدفاتر (تصفير الفروقات). هل تريد المتابعة؟',
        badge: 'مطابقة الدفاتر',
        confirmText: 'ملء برصيد النظام',
        cancelText: 'إلغاء',
        confirmVariant: 'info',
      });
      if (!confirmed) return;
    }
    onItemsChange((current) => current.map((item) => {
      const expectedQty = Number(item.expectedQty || 0);
      return {
        ...item,
        countedQty: expectedQty,
        varianceQty: 0,
        isCounted: true,
      };
    }));
    toast.success('تمت مطابقة كافة الأصناف مع رصيد النظام بنجاح.');
  }

  async function handleZeroUncounted() {
    if (!items.length) return;
    if (!uncountedCount) {
      toast.info('جميع الأصناف في الجلسة تم عدها وإدخال كمياتها بالفعل.');
      return;
    }
    const confirmed = await systemConfirm({
      title: 'تصفير ما لم يُعد (ملء المتبقي بصفر)',
      message: `سيتم تعيين الكمية المعدودة (0) لعدد ${uncountedCount} صنف متبقٍ لم يتم عده بعد، مع الإبقاء التام على ما قمت بعده (${countedCount} صنف). هل تريد المتابعة؟`,
      badge: 'تصفير المتبقي',
      confirmText: `تصفير المتبقي (${uncountedCount})`,
      cancelText: 'إلغاء',
      confirmVariant: 'primary',
    });
    if (!confirmed) return;

    onItemsChange((current) => current.map((item) => {
      const isUncounted = item.isCounted === false || item.countedQty === '' || item.countedQty == null;
      if (!isUncounted) return item;
      const expectedQty = Number(item.expectedQty || 0);
      return {
        ...item,
        countedQty: 0,
        varianceQty: Number((0 - expectedQty).toFixed(3)),
        isCounted: true,
      };
    }));
    toast.success(`تم تصفير ${uncountedCount} صنف متبقٍ برصيد (0) بنجاح.`);
  }

  async function handleZeroAllCounts() {
    if (!items.length) return;
    const isOverwriting = countedCount > 0;
    const confirmed = await systemConfirm({
      title: 'تصفير كافة أصناف الجلسة (جرد صفري شامل)',
      message: isOverwriting
        ? `تنبيه: قمت بعد ${countedCount} صنف سابقاً. سيتم وضع رصيد (0) لكافة الأصناف (${items.length} صنف) واستبدال ما أدخلته. متابعة التصفير الشامل؟`
        : `سيتم تعيين الكمية المعدودة (0) لكافة الأصناف (${items.length} صنف) في جلسة الجرد واعتبار رصيد المخزن صفرياً بالكامل. هل تريد المتابعة؟`,
      badge: 'جرد صفري شامل',
      confirmText: 'تصفير الكل (0)',
      cancelText: 'إلغاء',
      confirmVariant: 'danger',
    });
    if (!confirmed) return;

    onItemsChange((current) => current.map((item) => {
      const expectedQty = Number(item.expectedQty || 0);
      return {
        ...item,
        countedQty: 0,
        varianceQty: Number((0 - expectedQty).toFixed(3)),
        isCounted: true,
      };
    }));
    toast.success(`تم تعيين رصيد (0) لكافة الأصناف (${items.length} صنف) بنجاح.`);
  }

  async function handleClearAllCounts() {
    if (!items.length) return;
    if (countedCount > 0) {
      const confirmed = await systemConfirm({
        title: 'إفراغ كافة الخانات (العد الأعمى)',
        message: 'سيتم تفريغ كافة خانات العد للعودة لحالة العد الأعمى (الأصناف الفارغة لا تُدرج في الجلسة). هل تريد المتابعة؟',
        badge: 'مسح المدخلات',
        confirmText: 'إفراغ الخانات',
        cancelText: 'إلغاء',
        confirmVariant: 'danger',
      });
      if (!confirmed) return;
    }
    onItemsChange((current) => current.map((item) => ({
      ...item,
      countedQty: '',
      varianceQty: 0,
      isCounted: false,
    })));
    toast.info('تم إفراغ خانات الجرد والعودة للعد الأعمى.');
  }

  function handlePrintSheet() {
    printStockCountSheet(sheetRows, {
      title: `شيت عد - ${selectedLocation ? selectedLocation.name : selectedCountType.label}`,
      locationName: selectedLocation?.name,
      includeExpectedQty: showExpectedInElectronicCount,
    });
  }

  function handleExportExcel() {
    exportStockCountSheetExcel(sheetRows, {
      includeExpectedQty: showExpectedInElectronicCount,
      locationName: selectedLocation?.name,
    });
  }

  function handleStartCount() {
    if (isLoadingCatalog || locationStocks === undefined) {
      setStartCountMessage('أرصدة المخزن لم تُحمّل بنجاح. تحقق من الاتصال ولا تبدأ جرداً برصيد عام.');
      return;
    }
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
    if (countType === 'full' || countType === 'category' || countType === 'supplier') {
      handlePopulateScopeItems();
    }
  }

  useEffect(() => {
    if (
      isCountStarted &&
      (countType === 'full' || countType === 'category' || countType === 'supplier') &&
      items.length === 0 &&
      scopeProducts.length > 0
    ) {
      handlePopulateScopeItems();
    }
  }, [isCountStarted, countType, items.length, scopeProducts.length]);

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
  const [tableFilterTab, setTableFilterTab] = useState<'all' | 'counted' | 'variance' | 'uncounted'>('all');

  const filteredItems = useMemo(() => {
    let result = items;
    const query = tableSearchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((item) => {
        const prod = indexedProducts.get(String(item.productId));
        const name = String(item.productName || '').toLowerCase();
        const barcode = String(prod?.barcode || '').toLowerCase();
        const styleCode = String(prod?.styleCode || '').toLowerCase();
        return name.includes(query) || barcode.includes(query) || styleCode.includes(query);
      });
    }

    if (tableFilterTab === 'counted') {
      result = result.filter((item) => item.isCounted !== false && item.countedQty !== '' && item.countedQty != null);
    } else if (tableFilterTab === 'variance') {
      result = result.filter((item) => item.isCounted !== false && item.countedQty !== '' && item.countedQty != null && Number(item.varianceQty || 0) !== 0);
    } else if (tableFilterTab === 'uncounted') {
      result = result.filter((item) => item.isCounted === false || item.countedQty === '' || item.countedQty == null);
    }

    return result;
  }, [items, indexedProducts, tableSearchQuery, tableFilterTab]);

  const pagination = useClientPagination(filteredItems, {
    initialPageSize: 50,
    pageSizeOptions: [25, 50, 100, 200],
  });

  function updateCountItemById(id: string, patch: Partial<StockCountItem>) {
    onItemsChange((current) => current.map((item) => {
      if (item.id !== id) return item;
      const rawCount = patch.countedQty !== undefined ? patch.countedQty : item.countedQty;
      const isEmpty = rawCount === '' || rawCount === null || rawCount === undefined;
      const isCounted = patch.isCounted !== undefined ? patch.isCounted : !isEmpty;
      const countedQty = isEmpty ? '' : Number(rawCount);
      const expectedQty = Number(item.expectedQty || 0);
      const varianceQty = isEmpty ? 0 : Number((Number(countedQty) - expectedQty).toFixed(3));
      return {
        ...item,
        ...patch,
        countedQty,
        isCounted,
        varianceQty,
      };
    }));
  }

  function removeCountItemById(id: string) {
    onItemsChange((current) => current.filter((item) => item.id !== id));
  }

  function handleBarcodeScan(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;
    if (!form.locationId || scopedStocks === null) {
      setStartCountMessage('أرصدة المخزن غير متاحة. لن نعد قطعة في مخزن غير مؤكد');
      return;
    }
    const scan = classifyStockCountBarcodeScan(trimmed, products);
    if (scan.status !== 'matched') {
      setStartCountMessage(scan.status === 'ambiguous'
        ? 'هذا الكود مشترك بين عدة مقاسات أو أصناف؛ امسح باركود المقاس المحدد'
        : scan.status === 'style_code'
          ? 'كود الموديل ليس باركود مقاس. اختر المقاس المحدد قبل الجرد'
          : `لم يتم العثور على صنف بباركود محفوظ: ${trimmed}`);
      return;
    }
    const matchedProduct = scan.product;
    const countedBaseQty = scan.baseQty;
    setStartCountMessage('');
    const existingItem = items.find((item) => String(item.productId) === String(matchedProduct.id));
    if (existingItem) {
      const currentQty = existingItem.countedQty === '' || existingItem.countedQty == null ? 0 : Number(existingItem.countedQty);
      const nextQty = Number((currentQty + countedBaseQty).toFixed(3));
      updateCountItemById(existingItem.id, { countedQty: nextQty, isCounted: true });
      setLastScannedItem({ name: existingItem.productName, qty: nextQty });
    } else {
      const expectedQty = scopedStocks.get(String(matchedProduct.id)) ?? 0;
      const newItem: StockCountItem = {
        id: `${matchedProduct.id}-${Date.now()}`,
        productId: matchedProduct.id,
        productName: matchedProduct.name,
        expectedQty,
        countedQty: countedBaseQty,
        varianceQty: Number((countedBaseQty - expectedQty).toFixed(3)),
        reason: '',
        note: '',
      };
      onItemsChange((current) => [newItem, ...current]);
      setLastScannedItem({ name: matchedProduct.name, qty: countedBaseQty });
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
      title={t('inventory.sections.inventory_composer_cards.s22', "جلسة جرد مخزون")}
      description={isCountStarted ? t('inventory.sections.inventory_composer_cards.s23', "راجع الأصناف، أدخل الكميات الفعلية، ثم أنشئ جلسة الجرد بعد المراجعة.") : t('inventory.sections.inventory_composer_cards.s24', "ابدأ بخطوات قليلة: اختر طريقة الجرد، النطاق، وطريقة العد.")}
      actions={<span className="nav-pill">{isCountStarted ? t('inventory.sections.inventory_composer_cards.s25', "مرحلة العد والمراجعة") : t('inventory.sections.inventory_composer_cards.s26', "إنشاء الجلسة")}</span>}
    >
      {!isCountStarted ? (
        <div className="stock-count-setup-stack">
          <div className="stock-count-step-card">
            <div className="stock-count-step-heading">
              <span>1</span>
              <div>
                <strong>{t('inventory.sections.inventory_composer_cards.s27', "طريقة الجرد")}</strong>
                <small>{t('inventory.sections.inventory_composer_cards.s28', "اختر نمط الجرد المناسب للعملية الحالية")}</small>
              </div>
            </div>
            <div className="stock-count-method-grid">
              {countTypeOptions.map((entry) => {
                const countBadge = entry.key === 'full' && form.locationId && scopeProducts.length > 0
                  ? ` (${scopeProducts.length} صنف)`
                  : '';
                return (
                  <button
                    key={entry.key}
                    type="button"
                    className={`stock-count-method-card ${countType === entry.key ? 'stock-count-method-card--active' : ''}`}
                    onClick={() => setCountType(entry.key)}
                  >
                    <strong>{entry.label}{countBadge}</strong>
                    <span>{entry.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="stock-count-step-card">
            <div className="stock-count-step-heading">
              <span>2</span>
              <div>
                <strong>{t('inventory.sections.inventory_composer_cards.s29', "نطاق الجرد والإعدادات")}</strong>
                <small>{t('inventory.sections.inventory_composer_cards.s30', "حدد المخزن والملاحظة وخيارات العد")}</small>
              </div>
            </div>
            <div className="stock-count-inline-form">
              {!SINGLE_STORE_MODE ? (
                <Field label={t('inventory.sections.inventory_composer_cards.s31', "الفرع")}>
                  <CustomSelect
                    value={form.branchId}
                    onChange={(val) => onFormChange({ branchId: val })}
                    options={branchOptions}
                    placeholder={t('inventory.sections.inventory_composer_cards.s32', "بدون فرع")}
                  />
                </Field>
              ) : null}
              <Field label={t('inventory.sections.inventory_composer_cards.s33', "المخزن *")}>
                <CustomSelect
                  value={form.locationId}
                  onChange={(val) => onFormChange({ locationId: val })}
                  options={stockCountWarehouseOptions}
                  placeholder={t('inventory.sections.inventory_composer_cards.s34', "اختر المخزن")}
                />
              </Field>
              {countType === 'category' ? (
                <Field label={t('inventory.sections.inventory_composer_cards.s35', "القسم / التصنيف")}>
                  <CustomSelect
                    value={selectedCategoryId}
                    onChange={(val) => {
                      setSelectedCategoryId(val);
                      onItemsChange(() => []);
                    }}
                    options={categorySelectOptions}
                    placeholder={t('inventory.sections.inventory_composer_cards.s36', "اختر القسم")}
                  />
                </Field>
              ) : null}
              {countType === 'supplier' ? (
                <Field label={t('inventory.sections.inventory_composer_cards.s37', "المورد / الشركة")}>
                  <CustomSelect
                    value={selectedSupplierId}
                    onChange={(val) => {
                      setSelectedSupplierId(val);
                      onItemsChange(() => []);
                    }}
                    options={supplierSelectOptions}
                    placeholder={t('inventory.sections.inventory_composer_cards.s38', "اختر المورد")}
                  />
                </Field>
              ) : null}
              <Field label={t('inventory.sections.inventory_composer_cards.s39', "ملاحظة الجلسة")}>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => onFormChange({ note: e.target.value })}
                  placeholder={t('inventory.sections.inventory_composer_cards.s40', "مثال: جرد أسبوعي / جرد قبل طلبية المورد")}
                />
              </Field>
            </div>

            <div className="stock-count-bottom-bar">
              <label className="stock-count-expected-toggle">
                <input type="checkbox" checked={showExpectedInElectronicCount} onChange={(event) => setShowExpectedInElectronicCount(event.target.checked)} disabled={!canReviewStock} />
                <span>{t('inventory.sections.inventory_composer_cards.s41', "إظهار كمية النظام أثناء الإدخال الإلكتروني")}</span>
              </label>
              <div className="stock-count-start-actions">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleStartCount}
                  disabled={isLoadingCatalog}
                >
                  {isLoadingCatalog ? 'جارٍ تحميل بيانات المخزن...' : t('inventory.sections.inventory_composer_cards.s42', "ابدأ جلسة الجرد")}
                </Button>
              </div>
            </div>
            {!canReviewStock ? <div className="surface-note" style={{ marginTop: 8 }}>{t('inventory.sections.inventory_composer_cards.s43', "وضع العد المخفي مفعل لهذا المستخدم لضمان عد فعلي بدون التأثر برصيد النظام.")}</div> : null}
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
                <strong>{selectedLocation?.name ? `المخزن: ${selectedLocation.name}` : t('inventory.sections.inventory_composer_cards.s44', "المخزن")}</strong>
                {selectedCategoryId ? <span className="meta-tag">{t('inventory.sections.inventory_composer_cards.s45', "القسم:")} {categoryOptions.find((c) => c.id === selectedCategoryId)?.label || selectedCategoryId}</span> : null}
                {selectedSupplierId ? <span className="meta-tag">{t('inventory.sections.inventory_composer_cards.s46', "المورد:")} {supplierOptions.find((s) => s.id === selectedSupplierId)?.label || selectedSupplierId}</span> : null}
              </div>

              <div className="stock-count-stat-pills">
                <span className="stat-pill">{t('inventory.sections.inventory_composer_cards.s47', "الأصناف:")} <strong>{items.length}</strong></span>
                <span className="stat-pill" style={{ color: countedCount > 0 ? '#15803d' : undefined, background: countedCount > 0 ? '#f0fdf4' : undefined, border: countedCount > 0 ? '1px solid #bbf7d0' : undefined }}>
                  تم عدها: <strong>{countedCount}</strong> من {items.length}
                </span>
                <span className="stat-pill">{t('inventory.sections.inventory_composer_cards.s48', "إجمالي المعدود:")} <strong>{totalCounted}</strong></span>
                <span className="stat-pill">{t('inventory.sections.inventory_composer_cards.s49', "الفروقات:")} <strong>{totalVariance}</strong></span>
                {canShowExpectedCount && financialSummary.deficitCost > 0 ? (
                  <span className="stat-pill stat-pill--deficit">{t('inventory.sections.inventory_composer_cards.s50', "قيمة العجز:")} <strong>{financialSummary.deficitCost.toLocaleString('ar-EG')} {getGlobalCurrencySymbol()}</strong></span>
                ) : null}
              </div>
            </div>

            <div className="actions compact-actions">
              <Button type="button" variant="secondary" onClick={handleBackToSetup} disabled={isPending}>{t('inventory.sections.inventory_composer_cards.s51', "تعديل الإعدادات")}</Button>
              <SubmitButton
                type="button"
                onClick={() => onSubmit({ noteOverride: buildSessionNoteWithType(form.note) })}
                disabled={isPending || !countedCount || !form.locationId}
                idleText={`إنشاء وحفظ الجلسة (${countedCount} صنف)`}
                pendingText={t('inventory.sections.inventory_composer_cards.s53', "جارٍ الإنشاء...")}
              />
            </div>
          </div>

          {/* Unified Scanner & Action Toolbar */}
          <div className="stock-count-active-toolbar">
            <div className="stock-count-scanner-group">
              <span className="scanner-tag">
                <BarcodeIcon size={16} />
                <span>{t('inventory.sections.inventory_composer_cards.s54', "مسح سريع")}</span>
              </span>
              <input
                ref={barcodeInputRef}
                type="text"
                className="stock-count-scanner-field"
                placeholder={t('inventory.sections.inventory_composer_cards.s55', "امسح الباركود للعد السريع (+1 تلقائياً)...")}
                value={barcodeScanInput}
                onChange={(e) => setBarcodeScanInput(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
              />
              <Button type="button" variant="secondary" onClick={() => handleBarcodeScan(barcodeScanInput)}>{t('inventory.sections.inventory_composer_cards.s56', "عد")}</Button>
            </div>

            <div className="stock-count-tools-group">
              {canReviewStock ? (
                <label className="stock-count-sheet-expected-toggle" title={t('inventory.sections.inventory_composer_cards.s57', "إظهار كميات النظام في شيت الطباعة والإكسيل")}>
                  <input
                    type="checkbox"
                    checked={showExpectedInElectronicCount}
                    onChange={(e) => setShowExpectedInElectronicCount(e.target.checked)}
                  />
                  <span>{t('inventory.sections.inventory_composer_cards.s58', "رصيد النظام")}</span>
                </label>
              ) : null}
              {(countType === 'category' || countType === 'supplier' || countType === 'full') && !items.length ? (
                <Button type="button" variant="primary" onClick={handlePopulateScopeItems}>
                  <DownloadIcon size={15} />
                  <span>{t('inventory.sections.inventory_composer_cards.s59', "إدخال إلكتروني (")}{scopeProducts.length} {t('inventory.sections.inventory_composer_cards.s60', "صنف)")}</span>
                </Button>
              ) : null}
              {items.length > 0 ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleZeroUncounted}
                    disabled={uncountedCount === 0}
                    title={uncountedCount > 0 ? `وضع رصيد (0) لعدد ${uncountedCount} صنف متبقٍ لم يتم عده، مع الحفاظ على ما قمت بعده` : 'تم عد كافة الأصناف بالفعل'}
                    style={{
                      borderColor: uncountedCount > 0 ? '#93c5fd' : undefined,
                      backgroundColor: uncountedCount > 0 ? '#eff6ff' : undefined,
                      color: uncountedCount > 0 ? '#1d4ed8' : undefined,
                      fontWeight: 700,
                    }}
                  >
                    <RotateCcwIcon size={14} />
                    <span>{uncountedCount > 0 ? `تصفير المتبقي (${uncountedCount})` : 'تصفير المتبقي (0)'}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleZeroAllCounts}
                    title="وضع رصيد صفري (0) لكافة أصناف الجلسة لإثبات أن المخزن فارغ ثم تعديل ما يتواجد فعلياً"
                  >
                    <span>تصفير الكل (0)</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleResetAllToExpected}
                    title="إعادة تعيين كافة الكميات المعدودة لتطابق رصيد النظام (تصفير الفروقات)"
                  >
                    <RefreshCwIcon size={14} />
                    <span>ملء برصيد النظام</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleClearAllCounts}
                    title="إفراغ كافة خانات العد للبدء في الجرد الأعمى (الأصناف الفارغة لا يتم إدراجها في الجلسة)"
                  >
                    <SlidersIcon size={14} />
                    <span>إفراغ الخانات (أعمى)</span>
                  </Button>
                </>
              ) : null}
              <Button type="button" variant="secondary" onClick={handlePrintSheet} disabled={!sheetRows.length}>
                <PrinterIcon size={15} />
                <span>{t('inventory.sections.inventory_composer_cards.s61', "طباعة الشيت")}</span>
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
              <span>{t('inventory.sections.inventory_composer_cards.s62', "تم مسح وعد:")} <strong>{lastScannedItem.name}</strong> {t('inventory.sections.inventory_composer_cards.s63', "(الكمية المعدودة:")} {lastScannedItem.qty})</span>
            </div>
          ) : null}

          {/* Quick Manual Add Row */}
          <div className="stock-count-quick-entry-row">
            <span className="entry-row-title">{t('inventory.sections.inventory_composer_cards.s64', "إدراج صنف في الجرد:")}</span>
            <div className="entry-row-picker">
              <InventoryProductPicker products={scopeProducts.length > 0 ? scopeProducts : products} value={form.productId} onChange={(productId) => onFormChange({ productId })} showStock showPrice={false} hideHint={true} />
            </div>
            <input
              type="number"
              min="0"
              step="0.001"
              className="entry-row-qty"
              value={form.countedQty}
              onChange={(e) => onFormChange({ countedQty: e.target.value })}
              placeholder={t('inventory.sections.inventory_composer_cards.s65', "الكمية")}
            />
            <input
              type="text"
              className="entry-row-reason"
              value={form.reason}
              onChange={(e) => onFormChange({ reason: e.target.value })}
              placeholder={t('inventory.sections.inventory_composer_cards.s66', "سبب الفرق (مثال: عجز / كسر)")}
            />
            <Button type="button" variant="secondary" onClick={onAddItem}>
              <PlusIcon size={15} />
              <span>{t('inventory.sections.inventory_composer_cards.s67', "إدراج في الجرد")}</span>
            </Button>
          </div>

          {startCountMessage ? <div className="warning-box">{startCountMessage}</div> : null}
          <MutationFeedback isError={isError} isSuccess={isSuccess} error={error} errorFallback={t('inventory.sections.inventory_composer_cards.s68', "تعذر إنشاء جلسة الجرد")} successText={t('inventory.sections.inventory_composer_cards.s69', "تم إنشاء جلسة الجرد بنجاح.")} />

          {/* Table Search & Filter Bar */}
          {items.length > 3 ? (
            <div className="stock-count-table-filter-bar">
              <div className="stock-count-table-search-box">
                <span className="search-icon"><SearchIcon size={14} color="#94a3b8" /></span>
                <input
                  type="text"
                  className="table-search-input"
                  placeholder={t('inventory.sections.inventory_composer_cards.s70', "ابحث في جدول الجلسة باسم الصنف أو الباركود...")}
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
                  className={`filter-pill-btn ${tableFilterTab === 'counted' ? 'filter-pill-btn--active' : ''}`}
                  onClick={() => setTableFilterTab('counted')}
                >
                  تم عدها ({countedCount})
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
                  className={`filter-pill-btn ${tableFilterTab === 'uncounted' ? 'filter-pill-btn--active' : ''}`}
                  onClick={() => setTableFilterTab('uncounted')}
                >
                  لم تُعد ({uncountedCount})
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: 'auto', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>لكل صفحة:</span>
                  {[25, 50, 100].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => pagination.setPageSize(size)}
                      style={{
                        padding: '2px 7px',
                        fontSize: '11px',
                        fontWeight: '700',
                        borderRadius: '4px',
                        border: pagination.pageSize === size ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                        background: pagination.pageSize === size ? '#eff6ff' : '#ffffff',
                        color: pagination.pageSize === size ? '#1d4ed8' : '#64748b',
                        cursor: 'pointer',
                        transition: 'all 120ms ease',
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>

                {pagination.totalPages > 1 ? (
                  <div className="stock-count-quick-pager" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                      {t('pagination.page_of', 'صفحة {{page}} من {{totalPages}}', { page: pagination.page, totalPages: pagination.totalPages })}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Button variant="secondary" type="button" onClick={() => pagination.goToPage(pagination.page - 1)} disabled={!pagination.hasPreviousPage} style={{ padding: '3px 8px', fontSize: '11px', height: '28px', minHeight: '28px' }}>
                        {t('pagination.prev', 'السابق')}
                      </Button>
                      <Button variant="secondary" type="button" onClick={() => pagination.goToPage(pagination.page + 1)} disabled={!pagination.hasNextPage} style={{ padding: '3px 8px', fontSize: '11px', height: '28px', minHeight: '28px' }}>
                        {t('pagination.next', 'التالي')}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* High Density Items Table */}
          <div className="table-wrap stock-count-items-table-wrap">
            {filteredItems.length ? (
              <>
              <table className="stock-count-items-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                    <th>{t('inventory.sections.inventory_composer_cards.s74', "الصنف")}</th>
                    {canShowExpectedCount ? <th style={{ textAlign: 'center' }}>{t('inventory.sections.inventory_composer_cards.s75', "كمية النظام")}</th> : null}
                    <th style={{ width: '130px', textAlign: 'center' }}>{t('inventory.sections.inventory_composer_cards.s76', "الكمية المعدودة")}</th>
                    {canShowExpectedCount ? <th style={{ textAlign: 'center' }}>{t('inventory.sections.inventory_composer_cards.s77', "الفرق")}</th> : null}
                    <th>{t('inventory.sections.inventory_composer_cards.s78', "سبب الفرق")}</th>
                    <th style={{ width: '70px', textAlign: 'center' }}>{t('inventory.sections.inventory_composer_cards.s79', "إجراء")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.rows.map((item, index) => {
                    const prod = products.find((p) => String(p.id) === String(item.productId));
                    const isSerialized = Boolean(prod?.trackSerials || (item.countedSerials && item.countedSerials.length > 0));
                    const hasBatchTracking = Boolean(item.batchCountsText);
                    return (
                      <tr key={item.id}>
                        <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>{pagination.rangeStart + index}</td>
                        <td>
                          <strong>{item.productName}</strong>
                          {(isSerialized || hasBatchTracking) ? (
                            <div style={{ marginTop: 4, display: 'grid', gap: 3 }}>
                              {isSerialized ? (
                                <textarea
                                  rows={2}
                                  style={{ fontSize: 11, minWidth: 130 }}
                                  placeholder="السيريالات الموجودة فعلاً (رقم في كل سطر)"
                                  value={(item.countedSerials || []).join('\n')}
                                  onChange={event => updateCountItemById(item.id, {
                                    countedSerials: event.target.value.split(/[\n,،]+/).map(s => s.trim()).filter(Boolean),
                                  })}
                                />
                              ) : null}
                              {hasBatchTracking ? (
                                <textarea
                                  rows={2}
                                  style={{ fontSize: 11, minWidth: 130 }}
                                  placeholder="رصيد التشغيلات: رقم:كمية؛ الجديدة NEW:الرقم:YYYY-MM-DD:كمية"
                                  value={item.batchCountsText || ''}
                                  onChange={event => updateCountItemById(item.id, { batchCountsText: event.target.value })}
                                />
                              ) : null}
                            </div>
                          ) : null}
                        </td>
                      {canShowExpectedCount ? <td style={{ textAlign: 'center' }} className="muted">{item.expectedQty || 0}</td> : null}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          placeholder="—"
                          style={{
                            textAlign: 'center',
                            fontWeight: 'bold',
                            backgroundColor: (item.countedQty === '' || item.countedQty == null) ? '#fafafa' : '#ffffff',
                            color: (item.countedQty === '' || item.countedQty == null) ? '#94a3b8' : '#0f172a',
                          }}
                          value={item.countedQty === '' || item.countedQty == null ? '' : String(item.countedQty)}
                          onChange={(event) => {
                            const val = event.target.value;
                            if (val === '') {
                              updateCountItemById(item.id, { countedQty: '', isCounted: false });
                            } else {
                              updateCountItemById(item.id, { countedQty: Number(val), isCounted: true });
                            }
                          }}
                        />
                      </td>
                      {canShowExpectedCount ? (
                        <td style={{ textAlign: 'center' }}>
                          {item.isCounted === false || item.countedQty === '' || item.countedQty == null ? (
                            <span className="muted" style={{ fontSize: '12px' }}>—</span>
                          ) : Number(item.varianceQty || 0) === 0 ? (
                            <span className="stock-count-variance stock-count-variance--zero">{t('inventory.sections.inventory_composer_cards.s80', "مطابق (0)")}</span>
                          ) : Number(item.varianceQty || 0) < 0 ? (
                            <span className="stock-count-variance stock-count-variance--deficit">{t('inventory.sections.inventory_composer_cards.s81', "عجز")} {item.varianceQty}</span>
                          ) : (
                            <span className="stock-count-variance stock-count-variance--surplus">{t('inventory.sections.inventory_composer_cards.s82', "زيادة +")}{item.varianceQty}</span>
                          )}
                        </td>
                      ) : null}
                      <td>
                        <input value={item.reason || ''} onChange={(event) => updateCountItemById(item.id, { reason: event.target.value })} placeholder={t('inventory.sections.inventory_composer_cards.s83', "سبب الفرق")} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Button type="button" variant="secondary" onClick={() => removeCountItemById(item.id)}>{t('inventory.sections.inventory_composer_cards.s84', "إزالة")}</Button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
                            {/* Slim Bottom Footer Bar */}
              <div
                className="stock-count-table-footer-bar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '8px 14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  marginTop: '10px',
                  flexWrap: 'wrap',
                }}
              >
                {/* Right side: Range info and Page Size selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>
                    {t('pagination.range', 'عرض {{rangeStart}}-{{rangeEnd}} من أصل {{totalItems}} {{itemLabel}}', {
                      rangeStart: pagination.rangeStart,
                      rangeEnd: pagination.rangeEnd,
                      totalItems: pagination.totalItems,
                      itemLabel: t('inventory.sections.inventory_composer_cards.s60', 'صنف'),
                    })}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>{t('pagination.per_page', 'لكل صفحة:')}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[25, 50, 100].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => pagination.setPageSize(size)}
                          style={{
                            padding: '3px 9px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            borderRadius: '5px',
                            border: pagination.pageSize === size ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                            background: pagination.pageSize === size ? '#eff6ff' : '#ffffff',
                            color: pagination.pageSize === size ? '#1d4ed8' : '#475569',
                            cursor: 'pointer',
                            transition: 'all 120ms ease',
                          }}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Left side: Navigation buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                    {t('pagination.page_of', 'صفحة {{page}} من {{totalPages}}', {
                      page: pagination.page,
                      totalPages: pagination.totalPages,
                    })}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => pagination.goToPage(pagination.page - 1)}
                      disabled={!pagination.hasPreviousPage}
                      style={{ padding: '3px 10px', fontSize: '12px', height: '28px', minHeight: '28px' }}
                    >
                      {t('pagination.prev', 'السابق')}
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => pagination.goToPage(pagination.page + 1)}
                      disabled={!pagination.hasNextPage}
                      style={{ padding: '3px 10px', fontSize: '12px', height: '28px', minHeight: '28px' }}
                    >
                      {t('pagination.next', 'التالي')}
                    </Button>
                  </div>
                </div>
              </div>
              </>
            ) : items.length ? (
              <EmptyState
                title={t('inventory.sections.inventory_composer_cards.s85', "لا توجد نتائج مطابقة للبحث")}
                hint={t('inventory.sections.inventory_composer_cards.s86', "جرب البحث بكلمة أخرى أو اضغط على تصنيف (الكل).")}
              />
            ) : (
              <EmptyState
                title={t('inventory.sections.inventory_composer_cards.s87', "لا توجد عناصر في جلسة الجرد حتى الآن")}
                hint={countType === 'category' || countType === 'supplier' || countType === 'full' ? t('inventory.sections.inventory_composer_cards.s88', "اضغط على زر (إدخال إلكتروني) بالأعلى لتنزيل الأصناف، أو استخدم مسح الباركود.") : t('inventory.sections.inventory_composer_cards.s89', "استخدم ماسح الباركود أو الإضافة اليدوية بالأعلى لبدء تسجيل الأصناف.")}
              />
            )}
          </div>
        </div>
      )}
    </FormSection>
  );
}
