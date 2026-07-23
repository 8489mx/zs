
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Category, Product, ProductUnit, Supplier } from '@/types/domain';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { FormSection } from '@/shared/components/form-section';
import { useSettingsQuery, useCategoriesQuery, useSuppliersQuery, useProductsQuery, useLocationsQuery } from '@/shared/hooks/use-catalog-queries';
import { useCreateProductMutation } from '@/features/products/hooks/useCreateProductMutation';
import { productsApi } from '@/features/products/api/products.api';
import { productFormSchema, type ProductFormInput, type ProductFormOutput } from '@/features/products/schemas/product.schema';
import { ProductUnitsEditor, normalizeProductUnits } from '@/features/products/components/ProductUnitsEditor';
import { ComboComponentsEditor } from '@/features/products/components/ComboComponentsEditor';
import { buildFashionVariantDrafts, splitFashionTokens, type FashionVariantDraft } from '@/features/products/components/fashion-variants.utils';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import { extractCreatedEntityId } from '@/lib/api/extract-created-entity-id';
import { useAppToolbar } from '@/stores/toolbar-store';

const normalizeLookupText = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase();

const findCreatedCategoryId = (categories: Category[], name: string) => {
  const normalizedName = normalizeLookupText(name);
  if (!normalizedName) return '';
  const matched = [...categories].reverse().find((category) => normalizeLookupText(category.name) === normalizedName);
  return matched?.id ? String(matched.id) : '';
};

const findCreatedSupplierId = (suppliers: Supplier[], name: string, phone: string) => {
  const normalizedName = normalizeLookupText(name);
  const normalizedPhone = normalizeLookupText(phone);
  if (!normalizedName) return '';
  const matched = [...suppliers].reverse().find((supplier) => {
    if (normalizeLookupText(supplier.name) !== normalizedName) return false;
    return normalizedPhone ? normalizeLookupText(supplier.phone) === normalizedPhone : true;
  });
  return matched?.id ? String(matched.id) : '';
};

function getDefaultValues(itemKind: 'standard' | 'fashion' = 'standard', defaultMinStock = 5): ProductFormInput {
  return {
    name: '',
    barcode: '',
    itemKind,
    styleCode: '',
    color: '',
    size: '',
    fashionColors: '',
    fashionSizes: '',
    variantStock: 0,
    costPrice: 0,
    retailPrice: 0,
    wholesalePrice: 0,
    stock: 0,
    minStock: defaultMinStock,
    categoryId: '',
    supplierId: '',
    notes: '',
    isCombo: false,
    comboComponents: []
  };
}

function serializeVariantRows(rows: FashionVariantDraft[]) {
  return JSON.stringify(rows.map((row) => ({ color: row.color, size: row.size, barcode: row.barcode, stock: Number(row.stock || 0) })));
}

const LazyFashionVariantsBuilder = lazy(() => import('@/features/products/components/FashionVariantsBuilder').then((module) => ({ default: module.FashionVariantsBuilder })));

async function generateNextStyleCode() {
  const result = await productsApi.allocateStyleCode();
  return result.styleCode;
}

// ===== Combobox Component =====
interface ComboboxSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; label: string }>;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  onCreateNew?: (name: string) => void;
  createLabel?: string;
  isPending?: boolean;
}

function ComboboxSelect({ value, onChange, options, placeholder = 'ابحث...', emptyLabel = 'بدون', disabled, onCreateNew, createLabel, isPending }: ComboboxSelectProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const selectedOption = options.find((o) => o.id === value);
  const displayText = selectedOption ? selectedOption.label : emptyLabel;

  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedOption ? selectedOption.label : '');
    }
  }, [isOpen, selectedOption]);

  const filteredOptions = useMemo(() => {
    const q = normalizeLookupText(query);
    if (!q || (selectedOption && normalizeLookupText(selectedOption.label) === q)) return options;
    return options.filter((o) => normalizeLookupText(o.label).includes(q));
  }, [options, query, selectedOption]);

  const hasExactMatch = useMemo(() => {
    const q = normalizeLookupText(query);
    return !q || options.some((o) => normalizeLookupText(o.label) === q);
  }, [options, query]);

  function handleSelect(optionId: string) {
    onChange(optionId);
    setIsOpen(false);
  }

  function handleBlur() {
    window.setTimeout(() => setIsOpen(false), 150);
  }

  const showCreateOption = Boolean(onCreateNew && query.trim() && !hasExactMatch && !isPending);
  const totalOptions = filteredOptions.length + (showCreateOption ? 1 : 0) + 1;

  useEffect(() => {
    if (highlightedIndex >= totalOptions) {
      setHighlightedIndex(Math.max(totalOptions - 1, 0));
    }
  }, [totalOptions, highlightedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, totalOptions - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex === 0) {
        handleSelect('');
        return;
      }
      const optionIndex = highlightedIndex - 1;
      if (optionIndex >= 0 && optionIndex < filteredOptions.length) {
        handleSelect(filteredOptions[optionIndex].id);
        return;
      }
      if (showCreateOption && highlightedIndex === filteredOptions.length + 1) {
        onCreateNew?.(query.trim());
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        border: '1px solid var(--border, #dbe2ea)',
        borderRadius: 8,
        background: disabled ? '#f8fafc' : 'var(--surface, #fff)',
        overflow: 'hidden',
      }}>
        <input
          className="purchase-prototype-field-input"
          style={{ border: 'none', flex: 1, background: 'transparent', outline: 'none', boxShadow: 'none' }}
          value={isOpen ? query : displayText}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(1);
          }}
          onFocus={(e) => {
            if (!disabled) {
              setIsOpen(true);
              e.target.select();
            }
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
        />
        <span style={{ padding: '0 8px', color: '#9ca3af', fontSize: 12, pointerEvents: 'none', userSelect: 'none' }}>▾</span>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 1000,
          background: '#fff',
          border: '1px solid var(--border, #dbe2ea)',
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          marginTop: 4,
          maxHeight: 240,
          overflowY: 'auto',
          padding: 4,
        }}>
          <button
            type="button"
            style={{ width: '100%', textAlign: 'right', background: highlightedIndex === 0 ? '#eff6ff' : 'transparent', border: 'none', padding: '8px 10px', borderRadius: 6, cursor: 'pointer', color: '#6b7280' }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleSelect('')}
            onMouseEnter={() => setHighlightedIndex(0)}
          >
            {emptyLabel}
          </button>
          {filteredOptions.map((opt, i) => (
            <button
              key={opt.id}
              type="button"
              style={{ width: '100%', textAlign: 'right', background: highlightedIndex === i + 1 ? '#eff6ff' : 'transparent', border: 'none', padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontWeight: value === opt.id ? 600 : 400 }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(opt.id)}
              onMouseEnter={() => setHighlightedIndex(i + 1)}
            >
              {opt.label}
            </button>
          ))}
          {filteredOptions.length === 0 && !showCreateOption && (
            <div style={{ padding: '8px 10px', color: '#9ca3af', textAlign: 'center', fontSize: 13 }}>لا توجد نتائج</div>
          )}
          {showCreateOption && (
            <button
              type="button"
              style={{ width: '100%', textAlign: 'right', background: highlightedIndex === filteredOptions.length + 1 ? '#eff6ff' : 'transparent', border: 'none', padding: '8px 10px', borderRadius: 6, cursor: 'pointer', color: 'var(--primary, #2563eb)', fontWeight: 700 }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onCreateNew?.(query.trim()); setIsOpen(false); }}
              onMouseEnter={() => setHighlightedIndex(filteredOptions.length + 1)}
            >
              + {createLabel || 'إضافة'}: "{query.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ===== Product Name with Duplicate Warning =====
interface ProductNameFieldProps {
  value: string;
  onChange: (v: string) => void;
  allProducts: Product[];
  disabled?: boolean;
  label: string;
  placeholder?: string;
  error?: string;
}

function ProductNameField({ value, onChange, allProducts, disabled, label, placeholder, error }: ProductNameFieldProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const similarProducts = useMemo(() => {
    const q = normalizeLookupText(value);
    if (!q || q.length < 2) return [];
    return allProducts.filter((p) => normalizeLookupText(p.name).includes(q)).slice(0, 6);
  }, [value, allProducts]);

  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          className="purchase-prototype-field-input"
          value={value}
          onChange={(e) => { onChange(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
          disabled={disabled}
          placeholder={placeholder}
          style={{ width: '100%' }}
        />
        {showSuggestions && similarProducts.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: '#fff',
            border: '1px solid #fbbf24',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            marginTop: 4,
            maxHeight: 200,
            overflowY: 'auto',
            padding: 4,
          }}>
            <div style={{ padding: '6px 10px', fontSize: 12, color: '#92400e', background: '#fffbeb', borderRadius: 6, marginBottom: 4 }}>
              ⚠ أصناف مشابهة موجودة مسبقاً:
            </div>
            {similarProducts.map((p) => (
              <div key={p.id} style={{ padding: '6px 10px', fontSize: 13, color: '#374151', borderRadius: 6 }}>
                <strong>{p.name}</strong>
                {p.barcode ? <span style={{ color: '#9ca3af', marginRight: 8, fontSize: 11 }}>{p.barcode}</span> : null}
              </div>
            ))}
          </div>
        )}
      </div>
      {error && <small className="field-error">{error}</small>}
    </div>
  );
}

export function NewProductPage() {
  const navigate = useNavigate();
  const settingsQuery = useSettingsQuery();
  const categoriesQuery = useCategoriesQuery();
  const suppliersQuery = useSuppliersQuery();
  const productsQuery = useProductsQuery();
  const locationsQuery = useLocationsQuery();

  const defaultMinStock = Number(settingsQuery.data?.lowStockThreshold ?? 5);
  const allProducts = productsQuery.data || [];

  const rawCategories = categoriesQuery.data || [];
  const rawSuppliers = suppliersQuery.data || [];
  const rawLocations = locationsQuery.data || [];

  // Sort alphabetically
  const categories = useMemo(
    () => [...rawCategories].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar')),
    [rawCategories]
  );
  const suppliers = useMemo(
    () => [...rawSuppliers].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar')),
    [rawSuppliers]
  );

  const categoryOptions = useMemo(() => categories.map((c) => ({ id: String(c.id), label: c.name })), [categories]);
  const supplierOptions = useMemo(() => suppliers.map((s) => ({ id: String(s.id), label: s.name })), [suppliers]);
  const locationOptions = useMemo(() => rawLocations.map((l: any) => ({ id: String(l.id), label: l.name })), [rawLocations]);

  const clothingModuleEnabled = settingsQuery.data?.clothingModuleEnabled === true;
  const manufacturingModuleEnabled = settingsQuery.data?.manufacturingModuleEnabled === true;
  const comboModuleEnabled = settingsQuery.data?.comboModuleEnabled === true || manufacturingModuleEnabled;
  const defaultItemKind: 'standard' | 'fashion' = clothingModuleEnabled && settingsQuery.data?.defaultProductKind === 'fashion' ? 'fashion' : 'standard';
  const defaultGroupedMode = defaultItemKind === 'fashion';

  const [units, setUnits] = useState<ProductUnit[]>(normalizeProductUnits(undefined, ''));
  const [fashionVariantRows, setFashionVariantRows] = useState<FashionVariantDraft[]>([]);
  const [variantBarcodePrefix, setVariantBarcodePrefix] = useState('');
  const [groupedEntryEnabled, setGroupedEntryEnabled] = useState(defaultGroupedMode);
  const [isGeneratingStyleCode, setIsGeneratingStyleCode] = useState(false);
  const [isMarginActive, setIsMarginActive] = useState(() => localStorage.getItem('auto_margin_active') === 'true');
  const [retailMargin, setRetailMargin] = useState(() => localStorage.getItem('auto_margin_retail') || '');
  const [wholesaleMargin, setWholesaleMargin] = useState(() => localStorage.getItem('auto_margin_wholesale') || '');

  useEffect(() => {
    localStorage.setItem('auto_margin_active', String(isMarginActive));
    localStorage.setItem('auto_margin_retail', retailMargin);
    localStorage.setItem('auto_margin_wholesale', wholesaleMargin);
  }, [isMarginActive, retailMargin, wholesaleMargin]);

  const form = useForm<ProductFormInput, undefined, ProductFormOutput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: getDefaultValues(defaultItemKind, defaultMinStock)
  });

  // Update minStock when settings load (only if user hasn't touched it)
  useEffect(() => {
    if (settingsQuery.data?.lowStockThreshold !== undefined && !form.formState.isDirty) {
      form.setValue('minStock', Number(settingsQuery.data.lowStockThreshold));
    }
  }, [settingsQuery.data?.lowStockThreshold, form]);

  const queryClient = useQueryClient();
  const mutation = useCreateProductMutation(() => {
    navigate('/products');
  });

  useWatch({ control: form.control });
  const watchedBarcode = form.watch('barcode');
  const watchedItemKind = clothingModuleEnabled && form.watch('itemKind') === 'fashion' ? 'fashion' : 'standard';
  const watchedName = form.watch('name');
  const watchedStyleCode = form.watch('styleCode');
  const watchedFashionColors = form.watch('fashionColors');
  const watchedFashionSizes = form.watch('fashionSizes');
  const watchedVariantStock = Number(form.watch('variantStock') || 0);
  const watchedCategoryId = useWatch({ control: form.control, name: 'categoryId' });
  const watchedSupplierId = useWatch({ control: form.control, name: 'supplierId' });
  const watchedWarehouseId = useWatch({ control: form.control, name: 'warehouseId' });
  const watchedIsCombo = useWatch({ control: form.control, name: 'isCombo' });
  const watchedCostPrice = form.watch('costPrice');
  const usesVariantBuilder = watchedItemKind === 'fashion' || groupedEntryEnabled;

  useEffect(() => {
    if (watchedItemKind === 'fashion' && !groupedEntryEnabled) setGroupedEntryEnabled(true);
  }, [watchedItemKind, groupedEntryEnabled]);

  useEffect(() => {
    if (isMarginActive && watchedCostPrice !== undefined) {
      const cost = Number(watchedCostPrice) || 0;
      if (retailMargin) {
        const rMargin = Number(retailMargin);
        const newRetail = cost + (cost * rMargin / 100);
        form.setValue('retailPrice', Number(newRetail.toFixed(2)), { shouldValidate: true, shouldDirty: true });
      }
      if (wholesaleMargin) {
        const wMargin = Number(wholesaleMargin);
        const newWholesale = cost + (cost * wMargin / 100);
        form.setValue('wholesalePrice', Number(newWholesale.toFixed(2)), { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [watchedCostPrice, isMarginActive, retailMargin, wholesaleMargin, form]);

  const colorTokens = useMemo(() => splitFashionTokens(watchedFashionColors), [watchedFashionColors]);
  const sizeTokens = useMemo(() => splitFashionTokens(watchedFashionSizes), [watchedFashionSizes]);
  const syncedDefaultFashionRows = useMemo(
    () => buildFashionVariantDrafts(colorTokens, sizeTokens, [], watchedVariantStock),
    [colorTokens, sizeTokens, watchedVariantStock],
  );

  const hasUnitsDraftChanges = useMemo(
    () => usesVariantBuilder ? false : JSON.stringify(units) !== JSON.stringify(normalizeProductUnits(undefined, (watchedBarcode || '').trim())),
    [units, watchedBarcode, usesVariantBuilder],
  );
  const hasFashionDraftChanges = useMemo(
    () => usesVariantBuilder && (serializeVariantRows(fashionVariantRows) !== serializeVariantRows(syncedDefaultFashionRows) || Boolean(variantBarcodePrefix.trim())),
    [fashionVariantRows, syncedDefaultFashionRows, variantBarcodePrefix, usesVariantBuilder],
  );
  const duplicateFashionBarcodes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of fashionVariantRows) {
      const barcode = String(row.barcode || '').trim().toLowerCase();
      if (!barcode) continue;
      counts.set(barcode, Number(counts.get(barcode) || 0) + 1);
    }
    return Array.from(counts.values()).filter((count) => count > 1).length;
  }, [fashionVariantRows]);

  void (form.formState.isDirty || hasUnitsDraftChanges || hasFashionDraftChanges || groupedEntryEnabled !== defaultGroupedMode);

  useEffect(() => {
    if (!usesVariantBuilder) {
      if (fashionVariantRows.length) setFashionVariantRows([]);
      if (variantBarcodePrefix) setVariantBarcodePrefix('');
      if (form.getValues('fashionColors')) form.setValue('fashionColors', '', { shouldDirty: false, shouldValidate: false });
      if (form.getValues('fashionSizes')) form.setValue('fashionSizes', '', { shouldDirty: false, shouldValidate: false });
      if (Number(form.getValues('variantStock') || 0) !== 0) form.setValue('variantStock', 0, { shouldDirty: false, shouldValidate: false });
      return;
    }
    setFashionVariantRows((current) => buildFashionVariantDrafts(colorTokens, sizeTokens, current, watchedVariantStock));
  }, [usesVariantBuilder, colorTokens, sizeTokens, watchedVariantStock, form, fashionVariantRows.length, variantBarcodePrefix]);

  const categoryMutation = useMutation<{ id?: string | number; category?: { id?: string | number }; data?: { id?: string | number } }, Error, string>({
    mutationFn: async (name: string) => {
      if (!name) throw new Error('اكتب اسم القسم');
      return productsApi.createCategory({ name }) as Promise<any>;
    },
    onSuccess: async (created, name) => {
      let nextId = extractCreatedEntityId(created);
      await invalidateCatalogDomain(queryClient, { includeCategories: true });
      if (!nextId) {
        nextId = findCreatedCategoryId(await productsApi.categories(), name);
      }
      if (nextId) {
        form.setValue('categoryId', nextId, { shouldDirty: true, shouldValidate: true });
      }
    }
  });

  const supplierMutation = useMutation<{ id?: string | number; supplier?: { id?: string | number }; data?: { id?: string | number } }, Error, string>({
    mutationFn: async (name: string) => {
      if (!name) throw new Error('اكتب اسم المورد');
      return productsApi.createSupplier({ name, phone: '', address: '', balance: 0, notes: '' }) as Promise<any>;
    },
    onSuccess: async (created, name) => {
      let nextId = extractCreatedEntityId(created);
      await invalidateCatalogDomain(queryClient, { includeSuppliers: true });
      if (!nextId) {
        nextId = findCreatedSupplierId(await productsApi.suppliers(), name, '');
      }
      if (nextId) {
        form.setValue('supplierId', nextId, { shouldDirty: true, shouldValidate: true });
      }
    }
  });

  function handleUnitsChange(nextUnits: ProductUnit[]) {
    const baseBarcode = (watchedBarcode || '').trim();
    const mapped = nextUnits.map((unit, index) => ({ ...unit, barcode: unit.barcode || (index === 0 ? baseBarcode : unit.barcode) }));
    setUnits(mapped);
  }

  async function handleGenerateStyleCode() {
    if (isGeneratingStyleCode) return;
    setIsGeneratingStyleCode(true);
    try {
      const nextCode = await generateNextStyleCode();
      form.setValue('styleCode', nextCode, { shouldDirty: true, shouldValidate: true });
    } finally {
      setIsGeneratingStyleCode(false);
    }
  }

  const builderMode = watchedItemKind === 'fashion' ? 'fashion' : 'standard';
  const submitText = watchedItemKind === 'fashion'
    ? 'إنشاء الموديل بكل المقاسات والألوان'
    : groupedEntryEnabled
      ? 'إنشاء الصنف الرئيسي بكل الأصناف الفرعية'
      : 'حفظ الصنف';

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate({ ...values, itemKind: watchedItemKind, units, fashionVariantRows, groupedEntryEnabled: usesVariantBuilder });
  });

  const isFormDisabled = mutation.isPending || settingsQuery.isLoading || categoriesQuery.isLoading || suppliersQuery.isLoading || locationsQuery.isLoading;

  useAppToolbar([
    { label: 'الرئيسية', to: '/' },
    { label: 'الأصناف', to: '/products' },
    { label: 'إضافة صنف جديد' }
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const canSubmit = !isFormDisabled && (!usesVariantBuilder || (fashionVariantRows.length > 0 && duplicateFashionBarcodes === 0 && String(watchedStyleCode || '').trim()));
        if (canSubmit) {
          onSubmit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormDisabled, usesVariantBuilder, fashionVariantRows.length, duplicateFashionBarcodes, watchedStyleCode, onSubmit]);

  return (
    <div className="page-shell document-prototype-shell purchase-new-prototype" dir="rtl">
      <div className="purchase-prototype-sticky-stack">
        <div className="purchase-prototype-document-surface">
          <div className="document-prototype-topbar">
            <div className="document-prototype-topbar-right">
              <button type="button" className="document-prototype-back-link" onClick={() => navigate('/products')} aria-label="الرجوع">←</button>
              <h1>إضافة صنف جديد</h1>
            </div>

            <div className="document-prototype-topbar-actions">
              <Button variant="secondary" onClick={() => navigate('/products')} disabled={isFormDisabled}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                onClick={onSubmit}
                disabled={isFormDisabled || (usesVariantBuilder && (!fashionVariantRows.length || duplicateFashionBarcodes > 0 || !String(watchedStyleCode || '').trim()))}
              >
                {isFormDisabled ? 'جارٍ الحفظ...' : submitText}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="document-prototype-column">
        {mutation.isError && (
          <div className="document-prototype-alert error">
            <div style={{ color: '#b91c1c' }}>
              تعذر حفظ الصنف. {(mutation.error as any)?.response?.data?.message || 'برجاء التحقق من البيانات والمحاولة مرة أخرى.'}
            </div>
          </div>
        )}

        {usesVariantBuilder && duplicateFashionBarcodes > 0 && (
          <div className="document-prototype-section" style={{ backgroundColor: '#fee2e2', borderColor: '#ef4444' }}>
            <div style={{ color: '#b91c1c' }}>يوجد باركودات مكررة داخل نفس المجموعة. صححها قبل الحفظ.</div>
          </div>
        )}

        <FormSection title="بيانات الصنف الأساسية">
          <div className="actions compact-actions" style={{ flexWrap: 'wrap', marginBottom: 24 }}>
            {clothingModuleEnabled ? (
              <div className="field" style={{ minWidth: 220 }}>
                <select className="purchase-prototype-field-input" {...form.register('itemKind')} disabled={isFormDisabled}>
                  <option value="standard">صنف عادي</option>
                  <option value="fashion">موديل ملابس</option>
                </select>
              </div>
            ) : null}
            {watchedItemKind === 'standard' ? (
              <>
                <Button type="button" variant={!groupedEntryEnabled ? 'primary' : 'secondary'} onClick={() => setGroupedEntryEnabled(false)} disabled={isFormDisabled}>صنف عادي (بسيط)</Button>
                <Button type="button" variant={groupedEntryEnabled ? 'primary' : 'secondary'} onClick={() => setGroupedEntryEnabled(true)} disabled={isFormDisabled}>صنف بمتغيرات (أنواع/أحجام)</Button>
              </>
            ) : null}
          </div>

          <div className="document-prototype-grid compact-grid-2">
            {manufacturingModuleEnabled ? (
              <Field label="تصنيف الصنف">
                <select className="purchase-prototype-field-input" {...form.register('itemType')} disabled={isFormDisabled}>
                  <option value="product">منتج نهائي للبيع</option>
                  <option value="raw_material">مادة خام / مكون تصنيع</option>
                </select>
              </Field>
            ) : null}

            <ProductNameField
              label={watchedItemKind === 'fashion' ? 'اسم الموديل الأساسي' : groupedEntryEnabled ? 'اسم الصنف الأساسي' : 'اسم الصنف'}
              value={watchedName || ''}
              onChange={(v) => form.setValue('name', v, { shouldDirty: true, shouldValidate: true })}
              allProducts={allProducts}
              disabled={isFormDisabled}
              placeholder={watchedItemKind === 'fashion' ? 'مثال: تيشيرت بنجول' : groupedEntryEnabled ? 'مثال: مزيل عرق X' : undefined}
              error={form.formState.errors.name?.message}
            />

            {usesVariantBuilder ? (
              <Field label={watchedItemKind === 'fashion' ? 'كود الموديل' : 'كود المجموعة / الصنف الرئيسي'}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input className="purchase-prototype-field-input" {...form.register('styleCode')} disabled={isFormDisabled || isGeneratingStyleCode} inputMode="numeric" placeholder="101" style={{ flex: 1 }} />
                  <Button type="button" variant="secondary" onClick={() => void handleGenerateStyleCode()} disabled={isFormDisabled || isGeneratingStyleCode}>{isGeneratingStyleCode ? 'جارٍ التوليد...' : 'توليد كود'}</Button>
                </div>
              </Field>
            ) : (
              <>
                <Field label="الباركود"><input className="purchase-prototype-field-input" {...form.register('barcode')} disabled={isFormDisabled} /></Field>
                {clothingModuleEnabled ? <Field label="كود المجموعة / الموديل"><input className="purchase-prototype-field-input" {...form.register('styleCode')} disabled={isFormDisabled} inputMode="numeric" placeholder="اختياري" /></Field> : null}
                {clothingModuleEnabled ? <Field label="الخاصية الأولى"><input className="purchase-prototype-field-input" {...form.register('color')} disabled={isFormDisabled} placeholder="اختياري" /></Field> : null}
                {clothingModuleEnabled ? <Field label="الخاصية الثانية"><input className="purchase-prototype-field-input" {...form.register('size')} disabled={isFormDisabled} placeholder="اختياري" /></Field> : null}
              </>
            )}
          </div>
        </FormSection>

        <FormSection title="التصنيف والربط">
          <div className="document-prototype-grid compact-grid-3">
            <div className="field">
              <label>القسم</label>
              <ComboboxSelect
                value={watchedCategoryId || ''}
                onChange={(v) => form.setValue('categoryId', v, { shouldDirty: true })}
                options={categoryOptions}
                emptyLabel="بدون قسم"
                placeholder="ابحث في الأقسام..."
                disabled={isFormDisabled || categoryMutation.isPending}
                onCreateNew={(name) => categoryMutation.mutate(name)}
                createLabel="إضافة قسم"
                isPending={categoryMutation.isPending}
              />
              {form.formState.errors.categoryId && <small className="field-error">{form.formState.errors.categoryId.message}</small>}
              {categoryMutation.isError && <small className="field-error">تعذر إضافة القسم</small>}
              {categoryMutation.isPending && <small className="muted small">جارٍ إضافة القسم...</small>}
            </div>

            <div className="field">
              <label>المورد</label>
              <ComboboxSelect
                value={watchedSupplierId || ''}
                onChange={(v) => form.setValue('supplierId', v, { shouldDirty: true })}
                options={supplierOptions}
                emptyLabel="بدون مورد"
                placeholder="ابحث في الموردين..."
                disabled={isFormDisabled || supplierMutation.isPending}
                onCreateNew={(name) => supplierMutation.mutate(name)}
                createLabel="إضافة مورد"
                isPending={supplierMutation.isPending}
              />
              {form.formState.errors.supplierId && <small className="field-error">{form.formState.errors.supplierId.message}</small>}
              {supplierMutation.isError && <small className="field-error">تعذر إضافة المورد</small>}
              {supplierMutation.isPending && <small className="muted small">جارٍ إضافة المورد...</small>}
            </div>

            {!usesVariantBuilder ? (
              <div className="field">
                <label>المخزن الافتراضي المقترح</label>
                <ComboboxSelect
                  value={watchedWarehouseId || ''}
                  onChange={(v) => form.setValue('warehouseId', v, { shouldDirty: true })}
                  options={locationOptions}
                  emptyLabel="اختر المخزن"
                  placeholder="ابحث..."
                  disabled={isFormDisabled}
                />
              </div>
            ) : <div />}
          </div>
        </FormSection>

        {comboModuleEnabled && (
          <FormSection title="العروض المجمعة والوجبات (Combo/BOM)">
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  {...form.register('isCombo')}
                  disabled={isFormDisabled}
                  style={{ width: 18, height: 18 }}
                />
                هذا الصنف عبارة عن عرض مجمع / وجبة
              </label>
              <p className="muted small" style={{ marginTop: 4 }}>
                يتيح لك هذا الخيار إضافة مكونات (أصناف فرعية) سيتم خصمها من المخزون عند بيع هذا الصنف.
              </p>
            </div>
            
            {watchedIsCombo && (
              <Controller
                control={form.control}
                name="comboComponents"
                render={({ field }) => (
                  <ComboComponentsEditor
                    value={field.value || []}
                    onChange={field.onChange}
                    products={allProducts}
                    disabled={isFormDisabled}
                  />
                )}
              />
            )}
          </FormSection>
        )}

        <FormSection 
          title="الأسعار"
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#4b5563', fontWeight: 600 }}>حساب تلقائي للأسعار</span>
              <button
                type="button"
                onClick={() => setIsMarginActive(!isMarginActive)}
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  width: '44px',
                  height: '24px',
                  background: isMarginActive ? '#10b981' : '#e5e7eb',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  padding: 0
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '18px',
                    height: '18px',
                    background: '#fff',
                    borderRadius: '50%',
                    transition: 'transform 0.2s',
                    transform: isMarginActive ? 'translateX(-23px)' : 'translateX(-3px)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                />
              </button>
            </div>
          }
        >
          {isMarginActive && (
            <div className="document-prototype-grid compact-grid-2" style={{ marginBottom: 16, padding: 16, backgroundColor: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <Field label="هامش ربح القطاعي (%)">
                <input className="purchase-prototype-field-input" type="number" step="0.01" value={retailMargin} onChange={(e) => setRetailMargin(e.target.value)} placeholder="مثال: 20" disabled={isFormDisabled} />
              </Field>
              <Field label="هامش ربح الجملة (%)">
                <input className="purchase-prototype-field-input" type="number" step="0.01" value={wholesaleMargin} onChange={(e) => setWholesaleMargin(e.target.value)} placeholder="مثال: 10" disabled={isFormDisabled} />
              </Field>
            </div>
          )}
          <div className="document-prototype-grid compact-grid-3">
            <Field label="سعر الشراء"><input className="purchase-prototype-field-input" type="number" step="0.01" {...form.register('costPrice')} disabled={isFormDisabled} /></Field>
            <Field label="سعر القطاعي"><input className="purchase-prototype-field-input" type="number" step="0.01" {...form.register('retailPrice')} disabled={isFormDisabled} /></Field>
            <Field label="سعر الجملة"><input className="purchase-prototype-field-input" type="number" step="0.01" {...form.register('wholesalePrice')} disabled={isFormDisabled} /></Field>
          </div>
        </FormSection>

        <FormSection title="المخزون">
          <div className="document-prototype-alert info" style={{ marginBottom: 16 }}>
            <strong>تنبيه:</strong> تعديل الكمية بعد إنشاء الصنف يتم من حركات المخزون فقط. الرصيد الافتتاحي يسجل مرة واحدة فقط.
          </div>
          <div className="document-prototype-grid compact-grid-2">
            {!usesVariantBuilder ? <Field label="الرصيد الافتتاحي"><input className="purchase-prototype-field-input" type="number" {...form.register('stock')} disabled={isFormDisabled} /></Field> : null}
            <Field label="الحد الأدنى للمخزون">
              <input className="purchase-prototype-field-input" type="number" {...form.register('minStock')} disabled={isFormDisabled} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="ملاحظات">
          <Field label="ملاحظات"><textarea className="purchase-prototype-field-input" {...form.register('notes')} rows={4} disabled={isFormDisabled} /></Field>
        </FormSection>

        {usesVariantBuilder ? (
          <div style={{ marginTop: 16 }}>
            <Suspense fallback={<div className="loading-card">جاري تجهيز أدوات الأصناف الفرعية...</div>}>
              <LazyFashionVariantsBuilder
                mode={builderMode}
                name={watchedName || ''}
                styleCode={watchedStyleCode || ''}
                colorsValue={watchedFashionColors || ''}
                sizesValue={watchedFashionSizes || ''}
                defaultStock={watchedVariantStock}
                barcodePrefix={variantBarcodePrefix}
                rows={fashionVariantRows}
                disabled={isFormDisabled}
                onColorsChange={(value) => form.setValue('fashionColors', value, { shouldDirty: true, shouldValidate: true })}
                onSizesChange={(value) => form.setValue('fashionSizes', value, { shouldDirty: true, shouldValidate: true })}
                onDefaultStockChange={(value) => form.setValue('variantStock', value, { shouldDirty: true, shouldValidate: true })}
                onBarcodePrefixChange={setVariantBarcodePrefix}
                onRowsChange={setFashionVariantRows}
              />
            </Suspense>
          </div>
        ) : (
          <FormSection title="وحدات الصنف">
            <ProductUnitsEditor units={units} onChange={handleUnitsChange} disabled={isFormDisabled} />
          </FormSection>
        )}
      </main>
    </div>
  );
}
