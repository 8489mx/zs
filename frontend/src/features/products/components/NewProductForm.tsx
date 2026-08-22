import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Category, Product, ProductUnit, Supplier } from '@/types/domain';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { useSettingsQuery, useCategoriesQuery, useSuppliersQuery, useProductsQuery, useLocationsQuery } from '@/shared/hooks/use-catalog-queries';
import { useCreateProductMutation } from '@/features/products/hooks/useCreateProductMutation';
import { productsApi } from '@/features/products/api/products.api';
import { productFormSchema, type ProductFormInput, type ProductFormOutput } from '@/features/products/schemas/product.schema';
import { ProductUnitsEditor, normalizeProductUnits } from '@/features/products/components/ProductUnitsEditor';
import { ComboComponentsEditor } from '@/features/products/components/ComboComponentsEditor';
import { type FashionVariantDraft } from '@/features/products/components/fashion-variants.utils';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import { useAppToolbar } from '@/stores/toolbar-store';
import { normalizeArabicSearchKey } from '@/lib/arabic-normalization';

const normalizeLookupText = (value: unknown) => normalizeArabicSearchKey(value);

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

function getDefaultValues(
  itemKind: 'standard' | 'fashion' = 'standard',
  defaultMinStock = 5,
  initialName = '',
  initialBarcode = ''
): ProductFormInput {
  return {
    name: initialName,
    barcode: initialBarcode,
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
    warehouseId: '',
    notes: '',
    trackSerials: false,
    isCombo: false,
    comboComponents: []
  };
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
      } else if (highlightedIndex <= filteredOptions.length) {
        const opt = filteredOptions[highlightedIndex - 1];
        if (opt) handleSelect(opt.id);
      } else if (showCreateOption && highlightedIndex === filteredOptions.length + 1) {
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
        background: '#fff',
        border: '1px solid var(--border, #dbe2ea)',
        borderRadius: 8,
        padding: '0 4px',
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto'
      }}>
        <input
          className="purchase-prototype-field-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(1);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          style={{ border: 'none', background: 'transparent', boxShadow: 'none', flex: 1, padding: '7px 8px' }}
        />
        {value ? (
          <button
            type="button"
            onClick={() => { onChange(''); setQuery(''); }}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', padding: '0 4px', fontSize: 13 }}
            title="إلغاء الاختيار"
          >
            ×
          </button>
        ) : null}
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
              style={{ width: '100%', textAlign: 'right', background: highlightedIndex === filteredOptions.length + 1 ? '#eff6ff' : 'transparent', border: 'none', padding: '8px 10px', borderRadius: 6, cursor: 'pointer', color: 'var(--primary, #170c5c)', fontWeight: 700 }}
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

export interface NewProductFormProps {
  mode?: 'page' | 'modal';
  initialName?: string;
  initialBarcode?: string;
  onCancel?: () => void;
  onSuccess?: (product: Product) => void;
}

export function NewProductForm({
  mode = 'page',
  initialName = '',
  initialBarcode = '',
  onCancel,
  onSuccess,
}: NewProductFormProps) {
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
  const importModuleEnabled = settingsQuery.data?.importModuleEnabled === true;
  const comboModuleEnabled = settingsQuery.data?.comboModuleEnabled === true || manufacturingModuleEnabled;
  const defaultItemKind: 'standard' | 'fashion' = clothingModuleEnabled && settingsQuery.data?.defaultProductKind === 'fashion' ? 'fashion' : 'standard';
  const defaultGroupedMode = defaultItemKind === 'fashion';

  const [units, setUnits] = useState<ProductUnit[]>(normalizeProductUnits(undefined, initialBarcode.trim()));
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
    defaultValues: getDefaultValues(defaultItemKind, defaultMinStock, initialName, initialBarcode)
  });

  // Update form if initial props change
  useEffect(() => {
    if (initialName && !form.formState.isDirty) {
      form.setValue('name', initialName);
    }
    if (initialBarcode && !form.formState.isDirty) {
      form.setValue('barcode', initialBarcode);
      setUnits(normalizeProductUnits(undefined, initialBarcode.trim()));
    }
  }, [initialName, initialBarcode, form]);

  // Update minStock when settings load (only if user hasn't touched it)
  useEffect(() => {
    if (settingsQuery.data?.lowStockThreshold !== undefined && !form.formState.isDirty) {
      form.setValue('minStock', Number(settingsQuery.data.lowStockThreshold));
    }
  }, [settingsQuery.data?.lowStockThreshold, form]);

  const queryClient = useQueryClient();
  const mutation = useCreateProductMutation(async (productId, name) => {
    if (mode === 'modal' && onSuccess && productId) {
      try {
        const fullProduct = await productsApi.get(productId);
        onSuccess(fullProduct);
      } catch {
        onSuccess({
          id: productId,
          name,
          retailPrice: Number(form.getValues('retailPrice') || 0),
          barcode: form.getValues('barcode') || '',
          units,
        } as any);
      }
    } else {
      navigate('/products');
    }
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

  const duplicateFashionBarcodes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of fashionVariantRows) {
      const barcode = String(row.barcode || '').trim().toLowerCase();
      if (!barcode) continue;
      counts.set(barcode, Number(counts.get(barcode) || 0) + 1);
    }
    return Array.from(counts.values()).filter((count) => count > 1).length;
  }, [fashionVariantRows]);

  // Set default warehouse when locations load (only if exactly 1 location exists)
  useEffect(() => {
    if (rawLocations.length === 1 && !watchedWarehouseId) {
      form.setValue('warehouseId', String(rawLocations[0].id));
    }
  }, [rawLocations, watchedWarehouseId, form]);

  // Fast Category Creation Mutation
  const categoryMutation = useMutation({
    mutationFn: (name: string) => productsApi.createCategory({ name }),
    onSuccess: async (_, name) => {
      await invalidateCatalogDomain(queryClient, { includeCategories: true });
      const nextId = findCreatedCategoryId(await productsApi.categories(), name);
      if (nextId) {
        form.setValue('categoryId', nextId, { shouldDirty: true, shouldValidate: true });
      }
    }
  });

  // Fast Supplier Creation Mutation
  const supplierMutation = useMutation({
    mutationFn: (name: string) => productsApi.createSupplier({ name }),
    onSuccess: async (createdSupplier, name) => {
      await invalidateCatalogDomain(queryClient, { includeSuppliers: true });
      let nextId = typeof createdSupplier === 'object' && createdSupplier !== null && 'id' in createdSupplier
        ? String((createdSupplier as any).id)
        : '';
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
      : mode === 'modal'
        ? 'حفظ وإضافة للسلة'
        : 'حفظ الصنف';

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate({ ...values, itemKind: watchedItemKind, units, fashionVariantRows, groupedEntryEnabled: usesVariantBuilder });
  });

  const isFormDisabled = mutation.isPending || settingsQuery.isLoading || categoriesQuery.isLoading || suppliersQuery.isLoading || locationsQuery.isLoading;

  useAppToolbar(
    mode === 'page'
      ? [
          { label: 'الرئيسية', to: '/' },
          { label: 'الأصناف', to: '/products' },
          { label: 'إضافة صنف جديد' }
        ]
      : []
  );

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

  function handleCancelAction() {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/products');
    }
  }

  return (
    <div className={`new-product-form-root ${mode === 'modal' ? 'new-product-form-root--modal' : 'page-shell document-prototype-shell purchase-new-prototype'}`} dir="rtl">
      <div className={mode === 'modal' ? 'modal-sticky-header' : 'purchase-prototype-sticky-stack'}>
        <div className={mode === 'modal' ? 'modal-header-surface' : 'purchase-prototype-document-surface'}>
          <div className="document-prototype-topbar">
            <div className="document-prototype-topbar-right">
              {mode === 'page' ? (
                <button type="button" className="document-prototype-back-link" onClick={handleCancelAction} aria-label="الرجوع">←</button>
              ) : null}
              <h1 style={{ fontSize: mode === 'modal' ? '1.25rem' : '1.5rem', margin: 0 }}>
                {mode === 'modal' ? 'إضافة صنف جديد سريعاً إلى السلة' : 'إضافة صنف جديد'}
              </h1>
            </div>

            <div className="document-prototype-topbar-actions">
              <Button variant="secondary" onClick={handleCancelAction} disabled={isFormDisabled}>
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

      <main className="product-form-container" style={{ padding: mode === 'modal' ? '14px 16px 24px' : undefined }}>
        {mutation.isError && (
          <div className="document-prototype-alert error" style={{ marginBottom: '12px' }}>
            <div style={{ color: '#b91c1c' }}>
              تعذر حفظ الصنف. {(mutation.error as any)?.response?.data?.message || 'برجاء التحقق من البيانات والمحاولة مرة أخرى.'}
            </div>
          </div>
        )}

        {usesVariantBuilder && duplicateFashionBarcodes > 0 && (
          <div className="document-prototype-section" style={{ backgroundColor: '#fee2e2', borderColor: '#ef4444', marginBottom: '12px' }}>
            <div style={{ color: '#b91c1c' }}>يوجد باركودات مكررة داخل نفس المجموعة. صححها قبل الحفظ.</div>
          </div>
        )}

        {/* 1. Core Info & Pricing */}
        <div className="product-compact-card">
          <div className="product-compact-card-header">
            <h3 className="product-compact-card-title">بيانات الصنف والأسعار</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#4b5563', fontWeight: 600 }}>حساب تلقائي للأسعار</span>
              <button
                type="button"
                onClick={() => setIsMarginActive(!isMarginActive)}
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  width: '38px',
                  height: '20px',
                  background: isMarginActive ? '#10b981' : '#e5e7eb',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  padding: 0
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '14px',
                    height: '14px',
                    background: '#fff',
                    borderRadius: '50%',
                    transition: 'transform 0.2s',
                    transform: isMarginActive ? 'translateX(-20px)' : 'translateX(-3px)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                />
              </button>
            </div>
          </div>

          {clothingModuleEnabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.85rem', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>نمط الصنف:</span>
              <div style={{ display: 'inline-flex', gap: '4px', background: '#e2e8f0', padding: '3px', borderRadius: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    form.setValue('itemKind', 'standard', { shouldDirty: true });
                    setGroupedEntryEnabled(false);
                  }}
                  disabled={isFormDisabled}
                  style={{
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 12px',
                    fontSize: '0.8rem',
                    fontWeight: !usesVariantBuilder ? 800 : 600,
                    background: !usesVariantBuilder ? '#ffffff' : 'transparent',
                    color: !usesVariantBuilder ? '#0f172a' : '#64748b',
                    cursor: 'pointer',
                    boxShadow: !usesVariantBuilder ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  📦 صنف عادي (بسيط - باركود واحد)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    form.setValue('itemKind', 'fashion', { shouldDirty: true });
                    setGroupedEntryEnabled(true);
                  }}
                  disabled={isFormDisabled}
                  style={{
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 12px',
                    fontSize: '0.8rem',
                    fontWeight: usesVariantBuilder ? 800 : 600,
                    background: usesVariantBuilder ? '#2563eb' : 'transparent',
                    color: usesVariantBuilder ? '#ffffff' : '#64748b',
                    cursor: 'pointer',
                    boxShadow: usesVariantBuilder ? '0 1px 3px rgba(37,99,235,0.3)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ⚡ صنف بمتغيرات (أحجام / روائح / مقاسات)
                </button>
              </div>
            </div>
          )}

          <div className="product-form-grid-3" style={{ marginBottom: '0.85rem' }}>
            <Field label="نوع الصنف">
              <select className="purchase-prototype-field-input" {...form.register('itemType')} disabled={isFormDisabled}>
                <option value="product">منتج تام للبيع (مخزني)</option>
                <option value="service">خدمة / مصنعية (بدون مخزون)</option>
                {manufacturingModuleEnabled ? (
                  <option value="raw_material">مادة خام / مكون تصنيع</option>
                ) : null}
              </select>
            </Field>

            <ProductNameField
              label={usesVariantBuilder ? 'اسم الصنف الأساسي' : 'اسم الصنف'}
              value={watchedName || ''}
              onChange={(v) => form.setValue('name', v, { shouldDirty: true, shouldValidate: true })}
              allProducts={allProducts}
              disabled={isFormDisabled}
              placeholder={usesVariantBuilder ? 'مثال: مزيل عرق Nivea / تيشيرت Polo / شامبو L’Oréal' : 'اكتب اسم الصنف'}
              error={form.formState.errors.name?.message}
            />

            {usesVariantBuilder ? (
              <Field label="كود الصنف الأساسي / الموديل">
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input className="purchase-prototype-field-input" {...form.register('styleCode')} disabled={isFormDisabled || isGeneratingStyleCode} inputMode="numeric" placeholder="101" style={{ flex: 1 }} />
                  <Button type="button" variant="secondary" onClick={() => void handleGenerateStyleCode()} disabled={isFormDisabled || isGeneratingStyleCode}>{isGeneratingStyleCode ? '...' : 'توليد كود'}</Button>
                </div>
              </Field>
            ) : (
              <>
                <Field label="الباركود">
                  <input className="purchase-prototype-field-input" {...form.register('barcode')} disabled={isFormDisabled} placeholder="اختياري أو امسحه بالماسح" />
                </Field>
                {clothingModuleEnabled ? <Field label="كود المجموعة / الموديل"><input className="purchase-prototype-field-input" {...form.register('styleCode')} disabled={isFormDisabled} inputMode="numeric" placeholder="اختياري" /></Field> : null}
                {clothingModuleEnabled ? <Field label="الخاصية 1 (اللون / الرائحة)"><input className="purchase-prototype-field-input" {...form.register('color')} disabled={isFormDisabled} placeholder="اختياري" /></Field> : null}
                {clothingModuleEnabled ? <Field label="الخاصية 2 (المقاس / الحجم)"><input className="purchase-prototype-field-input" {...form.register('size')} disabled={isFormDisabled} placeholder="اختياري" /></Field> : null}
              </>
            )}
          </div>

          {isMarginActive && (
            <div className="product-form-grid-2" style={{ marginBottom: '0.85rem', padding: '0.75rem 1rem', backgroundColor: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <Field label="هامش ربح القطاعي (%)">
                <input className="purchase-prototype-field-input" type="number" step="0.01" value={retailMargin} onChange={(e) => setRetailMargin(e.target.value)} placeholder="مثال: 20" disabled={isFormDisabled} />
              </Field>
              <Field label="هامش ربح الجملة (%)">
                <input className="purchase-prototype-field-input" type="number" step="0.01" value={wholesaleMargin} onChange={(e) => setWholesaleMargin(e.target.value)} placeholder="مثال: 10" disabled={isFormDisabled} />
              </Field>
            </div>
          )}

          <div style={{ paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9' }}>
            <div className="product-form-grid-3">
              <Field label="سعر الشراء (التكلفة)">
                <input className="purchase-prototype-field-input" type="number" step="0.01" {...form.register('costPrice')} disabled={isFormDisabled} />
              </Field>
              <div className="field product-retail-price-field">
                <label style={{ color: '#1e3a8a', fontWeight: 700 }}>سعر البيع (قطاعي)</label>
                <input className="purchase-prototype-field-input" type="number" step="0.01" {...form.register('retailPrice')} disabled={isFormDisabled} />
              </div>
              <Field label="سعر الجملة">
                <input className="purchase-prototype-field-input" type="number" step="0.01" {...form.register('wholesalePrice')} disabled={isFormDisabled} />
              </Field>
            </div>
          </div>
        </div>

        {/* 2. Categorization & Inventory Location */}
        <div className="product-compact-card">
          <div className="product-compact-card-header">
            <h3 className="product-compact-card-title">التصنيف والتخزين والمخزون</h3>
          </div>
          <div className="product-form-grid-4" style={{ marginBottom: '0.85rem' }}>
            <div className="field">
              <label>القسم</label>
              <ComboboxSelect
                value={watchedCategoryId || ''}
                onChange={(v) => form.setValue('categoryId', v, { shouldDirty: true })}
                options={categoryOptions}
                emptyLabel="بدون قسم"
                placeholder="ابحث..."
                disabled={isFormDisabled || categoryMutation.isPending}
                onCreateNew={(name) => categoryMutation.mutate(name)}
                createLabel="إضافة قسم"
                isPending={categoryMutation.isPending}
              />
              {form.formState.errors.categoryId && <small className="field-error">{form.formState.errors.categoryId.message}</small>}
            </div>

            <div className="field">
              <label>المورد</label>
              <ComboboxSelect
                value={watchedSupplierId || ''}
                onChange={(v) => form.setValue('supplierId', v, { shouldDirty: true })}
                options={supplierOptions}
                emptyLabel="بدون مورد"
                placeholder="ابحث..."
                disabled={isFormDisabled || supplierMutation.isPending}
                onCreateNew={(name) => supplierMutation.mutate(name)}
                createLabel="إضافة مورد"
                isPending={supplierMutation.isPending}
              />
              {form.formState.errors.supplierId && <small className="field-error">{form.formState.errors.supplierId.message}</small>}
            </div>

            {!usesVariantBuilder ? (
              <div className="field">
                <label>المخزن</label>
                <ComboboxSelect
                  value={watchedWarehouseId || ''}
                  onChange={(v) => form.setValue('warehouseId', v, { shouldDirty: true, shouldValidate: true })}
                  options={locationOptions}
                  emptyLabel={locationOptions.length === 1 ? '' : "اختر المخزن..."}
                  placeholder="ابحث..."
                  disabled={isFormDisabled || locationOptions.length === 1}
                />
                {form.formState.errors.warehouseId && <small className="field-error">{form.formState.errors.warehouseId.message}</small>}
              </div>
            ) : <div />}

            <Field label="مكان الرف (Bin)">
              <input className="purchase-prototype-field-input" {...form.register('binLocation')} disabled={isFormDisabled} placeholder="مثال: رف 5" />
            </Field>
          </div>

          <div style={{ paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9' }}>
            <div className="product-form-grid-3">
              {!usesVariantBuilder ? (
                <Field label="الرصيد الافتتاحي (أول المدة)">
                  <input className="purchase-prototype-field-input" type="number" {...form.register('stock')} disabled={isFormDisabled} />
                </Field>
              ) : null}
              <Field label="الحد الأدنى للتنبيه (نواقص)">
                <input className="purchase-prototype-field-input" type="number" {...form.register('minStock')} disabled={isFormDisabled} />
              </Field>
              <Field label="ملاحظات">
                <input className="purchase-prototype-field-input" {...form.register('notes')} disabled={isFormDisabled} placeholder="ملاحظات حول الصنف (اختياري)..." />
              </Field>
            </div>
          </div>

          {settingsQuery.data?.enableMobileStoreFeatures === true && (
            <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#166534' }}>
                <input type="checkbox" {...form.register('trackSerials')} disabled={isFormDisabled} style={{ width: 18, height: 18 }} />
                <span>📱 تتبع أرقام IMEI / السيريال المنفرد لهذا الصنف (للهواتف والأجهزة الإلكترونية)</span>
              </label>
            </div>
          )}
        </div>

        {/* 3. Units or Fashion Variants */}
        {usesVariantBuilder ? (
          <div style={{ marginTop: '0.5rem' }}>
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
          <div className="product-compact-card">
            <div className="product-compact-card-header">
              <h3 className="product-compact-card-title">وحدات الصنف (Units)</h3>
            </div>
            <ProductUnitsEditor units={units} onChange={handleUnitsChange} disabled={isFormDisabled} />
          </div>
        )}

        {/* 4. Combo / BOM */}
        {comboModuleEnabled && (
          <div className="product-compact-card">
            <div className="product-compact-card-header">
              <h3 className="product-compact-card-title">العروض المجمعة والوجبات (Combo)</h3>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                <input type="checkbox" {...form.register('isCombo')} disabled={isFormDisabled} style={{ width: 18, height: 18 }} />
                هذا الصنف عبارة عن عرض مجمع / وجبة
              </label>
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
          </div>
        )}

        {/* 5. Auto Parts */}
        {importModuleEnabled && (
          <div className="product-compact-card">
            <div className="product-compact-card-header">
              <h3 className="product-compact-card-title">بيانات قطعة الغيار (Auto Parts)</h3>
            </div>
            <div className="product-form-grid-2">
              <Field label="رقم القطعة (OEM)"><input className="purchase-prototype-field-input" {...form.register('metadata.oemNumber')} disabled={isFormDisabled} placeholder="1J0907530" /></Field>
              <Field label="الماركة"><input className="purchase-prototype-field-input" {...form.register('metadata.carBrand')} disabled={isFormDisabled} placeholder="Toyota" /></Field>
              <Field label="الموديل"><input className="purchase-prototype-field-input" {...form.register('metadata.carModel')} disabled={isFormDisabled} placeholder="Corolla" /></Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <Field label="من سنة"><input className="purchase-prototype-field-input" type="number" {...form.register('metadata.carYearFrom')} disabled={isFormDisabled} placeholder="2015" /></Field>
                <Field label="إلى سنة"><input className="purchase-prototype-field-input" type="number" {...form.register('metadata.carYearTo')} disabled={isFormDisabled} placeholder="2020" /></Field>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
