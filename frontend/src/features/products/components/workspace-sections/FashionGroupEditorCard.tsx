import { Fragment, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { DraftStateNotice } from '@/shared/components/draft-state-notice';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import { queryKeys } from '@/app/query-keys';
import { productsApi } from '@/features/products/api/products.api';
import { getNextSequentialStyleCode, getStyleCodeSequenceStart } from '@/features/products/lib/style-code.utils';
import { normalizeArabicInput, normalizeArabicSearchKey } from '@/lib/arabic-normalization';
import { formatCurrency } from '@/lib/format';
import { Trash2Icon } from '@/shared/components/icons/AppIcons';
import type { Category, Product, Supplier, Location } from '@/types/domain';
import {
  buildPayload,
  deriveBaseName,
  duplicateSummary,
  rowsFingerprint,
  sortVariants,
  toCommonDraft,
  toVariantRows,
  variantLabel,
  type CommonDraft,
  type VariantDraft
} from '@/features/products/components/workspace-sections/FashionGroupEditorCard.helpers';
import { splitFashionTokens, mergeFashionTokens } from '@/features/products/components/fashion-variants.utils';

export type VariantTemplateType = 'fashion' | 'scents' | 'sizes' | 'custom';

function ScentDropletIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}

function FashionShirtIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
    </svg>
  );
}

function PackageBoxIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function SlidersConfigIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="21" y2="21" />
      <line x1="4" x2="20" y1="14" y2="14" />
      <line x1="4" x2="20" y1="7" y2="7" />
      <circle cx="9" cy="7" r="2" />
      <circle cx="15" cy="14" r="2" />
      <circle cx="8" cy="21" r="2" />
    </svg>
  );
}

const FASHION_COLOR_PRESETS = ['اسود', 'ابيض', 'كحلي', 'رمادي', 'بيج', 'احمر', 'ازرق', 'زيتي', 'وردي', 'اوف وايت', 'بني', 'عنابي'];
const SCENT_FLAVOR_PRESETS = ['لافندر', 'عود', 'مسك', 'ياسمين', 'ورد', 'توت', 'خوخ', 'ليمون', 'نعناع', 'فانيليا', 'شوكولاتة', 'جوز هند', 'صندل', 'عنبر'];
const SIZE_CAPACITY_PRESETS = ['250 مل', '500 مل', '1 لتر', '2 لتر', '5 لتر', '250 جم', '500 جم', '1 كجم', 'صغير', 'وسط', 'كبير'];

const PACKAGING_PRESETS = ['علبة', 'كيس', 'زجاج', 'بلاستيك', 'بخاخ', 'ضاغط', 'جركن'];
const SCENT_SIZE_PRESETS = ['صغير', 'وسط', 'كبير', '50 مل', '100 مل', '150 مل', '250 مل', '500 مل'];

const FASHION_SIZE_PRESETS: Array<{ label: string; values: string[] }> = [
  { label: 'أساسي (S..2XL)', values: ['S', 'M', 'L', 'XL', '2XL'] },
  { label: 'موسع (XS..3XL)', values: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] },
  { label: 'حريمي (36..46)', values: ['36', '38', '40', '42', '44', '46'] },
  { label: 'أطفال (2..14)', values: ['2', '4', '6', '8', '10', '12', '14'] },
  { label: 'شوز (37..45)', values: ['37', '38', '39', '40', '41', '42', '43', '44', '45'] },
];

interface FashionGroupEditorCardProps {
  product: Product;
  categories: Category[];
  suppliers: Supplier[];
  locations: Location[];
  onSaved?: (product: Product) => void;
}

export function FashionGroupEditorCard({ product, categories, suppliers, locations, onSaved }: FashionGroupEditorCardProps) {
  const allProductsQuery = useQuery({ queryKey: queryKeys.products, queryFn: productsApi.list, staleTime: 30_000 });
  const queryClient = useQueryClient();
  const styleCode = String(product.styleCode || '').trim();

  const groupQuery = useQuery({
    queryKey: queryKeys.productsPage(`variant-group:${styleCode || product.id}`),
    queryFn: async () => {
      const payload = styleCode ? await productsApi.listAll({ q: styleCode }) : { products: [product] };
      const rows = (payload.products || []).filter((entry) => (styleCode ? String(entry.styleCode || '').trim() === styleCode : String(entry.id) === String(product.id)));
      return rows.length ? rows : [product];
    },
    staleTime: 30_000,
  });

  const groupProducts = useMemo(() => {
    const rows = groupQuery.data || [];
    const byId = new Map(rows.map((entry) => [String(entry.id), entry]));
    if (!byId.has(String(product.id))) byId.set(String(product.id), product);
    return Array.from(byId.values()).sort((a, b) => variantLabel({ color: a.color || '', size: a.size || '' }).localeCompare(variantLabel({ color: b.color || '', size: b.size || '' }), 'ar'));
  }, [groupQuery.data, product]);

  const seedProduct = useMemo(() => (groupProducts[0] || product), [groupProducts, product]);
  const [commonDraft, setCommonDraft] = useState<CommonDraft>(() => ({ ...toCommonDraft(seedProduct), name: deriveBaseName(seedProduct) }));
  const [variantRows, setVariantRows] = useState<VariantDraft[]>(() => toVariantRows(groupProducts));

  // Quick builder tokens state
  const [activeTemplate, setActiveTemplate] = useState<VariantTemplateType>(seedProduct.itemKind === 'fashion' ? 'fashion' : 'scents');
  const [customPrimaryLabel, setCustomPrimaryLabel] = useState('الخاصية الأولى');
  const [customSecondaryLabel, setCustomSecondaryLabel] = useState('الخاصية الثانية');
  const [colorsValue, setColorsValue] = useState('');
  const [sizesValue, setSizesValue] = useState('');
  const [barcodePrefix, setBarcodePrefix] = useState('');

  useEffect(() => {
    setCommonDraft({ ...toCommonDraft(seedProduct), name: deriveBaseName(seedProduct) });
    const initialRows = toVariantRows(groupProducts);
    setVariantRows(initialRows);
    
    // Extract unique colors & sizes from existing products
    const existingColors = Array.from(new Set(initialRows.map(r => r.color).filter(Boolean)));
    const existingSizes = Array.from(new Set(initialRows.map(r => r.size).filter(Boolean)));
    setColorsValue(existingColors.join('، '));
    setSizesValue(existingSizes.join('، '));
    setBarcodePrefix(seedProduct.styleCode || '');
  }, [product.id, seedProduct, groupProducts]);

  const baselineCommon = useMemo(() => JSON.stringify({ ...toCommonDraft(seedProduct), name: deriveBaseName(seedProduct) }), [seedProduct]);
  const baselineRows = useMemo(() => rowsFingerprint(toVariantRows(groupProducts)), [groupProducts]);
  const hasDraftChanges = JSON.stringify(commonDraft) !== baselineCommon || rowsFingerprint(variantRows) !== baselineRows;
  const duplicates = useMemo(() => duplicateSummary(variantRows), [variantRows]);
  const incompleteRows = useMemo(() => variantRows.filter((row) => !variantLabel(row)).length, [variantRows]);
  const canNavigateAway = useUnsavedChangesGuard(hasDraftChanges);

  const templateConfig = useMemo(() => {
    switch (activeTemplate) {
      case 'fashion':
        return {
          title: 'موديل ملابس وأحذية',
          hint: 'أضف الألوان والمقاسات من المجموعات الجاهزة لتوليد وتوسيع فروع الموديل تلقائياً.',
          primaryLabel: 'الألوان',
          secondaryLabel: 'المقاسات (اختياري)',
          primarySingleLabel: 'اللون',
          secondarySingleLabel: 'المقاس',
          primaryPlaceholder: 'اسود، ابيض، كحلي...',
          secondaryPlaceholder: 'S، M، L، XL...',
          primaryPresets: FASHION_COLOR_PRESETS,
        };
      case 'scents':
        return {
          title: 'روائح ونكهات وعطور',
          hint: 'أدخل الروائح أو النكهات والأحجام لتجهيز الأصناف الفرعية.',
          primaryLabel: 'الروائح والنكهات',
          secondaryLabel: 'الأحجام / السعات (اختياري)',
          primarySingleLabel: 'الرائحة/النكهة',
          secondarySingleLabel: 'الحجم',
          primaryPlaceholder: 'لافندر، عود، ليمون، توت...',
          secondaryPlaceholder: '100 مل، 250 مل، كبير...',
          primaryPresets: SCENT_FLAVOR_PRESETS,
        };
      case 'sizes':
        return {
          title: 'أحجام وسعات وعبوات',
          hint: 'أدخل الأحجام والتغليف كخاصية ثانية (علبة، كيس، بخاخ).',
          primaryLabel: 'الأحجام / السعات',
          secondaryLabel: 'النوع / التغليف (اختياري)',
          primarySingleLabel: 'الحجم/السعة',
          secondarySingleLabel: 'النوع',
          primaryPlaceholder: '250 مل، 500 مل، 1 لتر...',
          secondaryPlaceholder: 'علبة، كيس، بخاخ، زجاج...',
          primaryPresets: SIZE_CAPACITY_PRESETS,
        };
      case 'custom':
      default:
        return {
          title: 'تخصيص حر للمتغيرات',
          hint: 'حدد المسميات واكتب قيم كل خاصية لتجهيز الأصناف الفرعية.',
          primaryLabel: customPrimaryLabel || 'الخاصية الأولى',
          secondaryLabel: `${customSecondaryLabel || 'الخاصية الثانية'} (اختياري)`,
          primarySingleLabel: customPrimaryLabel || 'الخاصية الأولى',
          secondarySingleLabel: customSecondaryLabel || 'الخاصية الثانية',
          primaryPlaceholder: 'اكتب القيم مفصولة بفواصل...',
          secondaryPlaceholder: 'اختياري: اكتب القيم مفصولة بفواصل...',
          primaryPresets: [],
        };
    }
  }, [activeTemplate, customPrimaryLabel, customSecondaryLabel]);

  const primaryLabel = templateConfig.primarySingleLabel;
  const secondaryLabel = templateConfig.secondarySingleLabel;
  const totalStock = useMemo(() => variantRows.reduce((sum, row) => sum + Number(row.stock || 0), 0), [variantRows]);

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmedName = commonDraft.name.trim();
      const trimmedStyleCode = commonDraft.styleCode.trim();
      const cleanRows = sortVariants(variantRows.map((row) => ({
        id: row.id,
        color: row.color.trim(),
        size: row.size.trim(),
        sku: row.sku ? row.sku.trim() : undefined,
        barcode: row.barcode.trim(),
        useCustomPricing: Boolean(row.useCustomPricing),
        pricingEditorOpen: false,
        costPrice: Number(row.costPrice || 0),
        retailPrice: Number(row.retailPrice || 0),
        wholesalePrice: Number(row.wholesalePrice || 0),
        stock: Number(row.stock || 0),
      })).filter((row) => Boolean(variantLabel(row))));

      if (!trimmedName) throw new Error('اسم الصنف الأساسي مطلوب');
      if (!trimmedStyleCode) throw new Error('كود المجموعة / الموديل مطلوب');
      if (!cleanRows.length) throw new Error('أضف صنفًا فرعيًا واحدًا على الأقل');
      if (duplicates.duplicateCombos) throw new Error('يوجد صنف فرعي مكرر داخل نفس المجموعة');
      if (duplicates.duplicateBarcodes) throw new Error('يوجد باركود مكرر داخل نفس المجموعة');

      const sourceById = new Map(groupProducts.map((entry) => [String(entry.id), entry]));
      const keptIds = new Set<string>();
      for (const row of cleanRows) {
        const source = row.id ? sourceById.get(String(row.id)) : undefined;
        const payload = buildPayload({ ...commonDraft, name: trimmedName, styleCode: trimmedStyleCode }, row, source);
        if (row.id && source) {
          keptIds.add(String(row.id));
          await productsApi.update(String(row.id), payload);
        } else {
          await productsApi.create(payload);
        }
      }
      const removedExisting = groupProducts.filter((entry) => !keptIds.has(String(entry.id)) && !cleanRows.some((row) => String(row.id || '') === String(entry.id)));
      for (const entry of removedExisting) {
        await productsApi.remove(String(entry.id));
      }
      return cleanRows;
    },
    onSuccess: async () => {
      await invalidateCatalogDomain(queryClient, { includeProducts: true });
      await queryClient.invalidateQueries({ queryKey: queryKeys.productsPage(`variant-group:${styleCode || product.id}`) });
      const refreshed = await queryClient.fetchQuery({ queryKey: queryKeys.products, queryFn: productsApi.list });
      const selected = refreshed.find((entry) => String(entry.id) === String(product.id)) || refreshed.find((entry) => String(entry.styleCode || '').trim() === commonDraft.styleCode.trim()) || null;
      if (selected) onSaved?.(selected);
    },
  });

  function handleGenerateStyleCode() {
    const sourceProducts = allProductsQuery.data || [];
    const nextCode = getNextSequentialStyleCode(sourceProducts, getStyleCodeSequenceStart());
    setCommonDraft((current) => ({ ...current, styleCode: nextCode }));
    setBarcodePrefix(nextCode);
  }

  function updateRow(index: number, patch: Partial<VariantDraft>) {
    setVariantRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function addVariantRow() {
    setVariantRows((current) => [...current, {
      color: '',
      size: '',
      sku: '',
      barcode: '',
      useCustomPricing: false,
      pricingEditorOpen: false,
      costPrice: Number(commonDraft.costPrice || 0),
      retailPrice: Number(commonDraft.retailPrice || 0),
      wholesalePrice: Number(commonDraft.wholesalePrice || 0),
      stock: 0,
    }]);
  }

  function generateFromTokens() {
    const colors = splitFashionTokens(colorsValue);
    const sizes = splitFashionTokens(sizesValue);
    if (!colors.length && !sizes.length) return;

    const existingMap = new Map(variantRows.map((row) => [`${normalizeArabicSearchKey(row.color)}::${normalizeArabicSearchKey(row.size)}`, row]));
    const nextRows: VariantDraft[] = [];

    const normColors = colors.length ? colors : [''];
    const normSizes = sizes.length ? sizes : [''];

    for (const c of normColors) {
      for (const s of normSizes) {
        if (!c.trim() && !s.trim()) continue;
        const key = `${normalizeArabicSearchKey(c)}::${normalizeArabicSearchKey(s)}`;
        const existing = existingMap.get(key);
        if (existing) {
          nextRows.push({ ...existing, color: c, size: s });
        } else {
          nextRows.push({
            color: c,
            size: s,
            sku: '',
            barcode: '',
            useCustomPricing: false,
            pricingEditorOpen: false,
            costPrice: Number(commonDraft.costPrice || 0),
            retailPrice: Number(commonDraft.retailPrice || 0),
            wholesalePrice: Number(commonDraft.wholesalePrice || 0),
            stock: 0,
          });
        }
      }
    }

    setVariantRows(nextRows);
  }

  function generateSequentialBarcodes() {
    const prefix = (barcodePrefix || commonDraft.styleCode).trim();
    if (!prefix) return;
    setVariantRows((current) => current.map((row, index) => ({
      ...row,
      barcode: `${prefix}-${String(index + 1).padStart(3, '0')}`,
    })));
  }

  function generateSequentialSkus() {
    const prefix = (barcodePrefix || commonDraft.styleCode || 'VAR').trim();
    setVariantRows((current) => current.map((row) => {
      const colorPart = (row.color || '').trim().replace(/\s+/g, '-');
      const sizePart = (row.size || '').trim().replace(/\s+/g, '-');
      const generated = [prefix, colorPart, sizePart].filter(Boolean).join('-');
      return { ...row, sku: generated };
    }));
  }

  function clearAllBarcodes() {
    setVariantRows((current) => current.map((row) => ({ ...row, barcode: '' })));
  }

  function toggleVariantPricing(index: number) {
    setVariantRows((current) => current.map((row, rowIndex) => {
      if (rowIndex !== index) {
        return { ...row, pricingEditorOpen: false };
      }
      if (!row.useCustomPricing) {
        return {
          ...row,
          useCustomPricing: true,
          pricingEditorOpen: true,
          costPrice: Number(row.costPrice || commonDraft.costPrice || 0),
          retailPrice: Number(row.retailPrice || commonDraft.retailPrice || 0),
          wholesalePrice: Number(row.wholesalePrice || commonDraft.wholesalePrice || 0),
        };
      }
      return {
        ...row,
        pricingEditorOpen: !row.pricingEditorOpen,
      };
    }));
  }

  function disableVariantPricing(index: number) {
    setVariantRows((current) => current.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      return {
        ...row,
        useCustomPricing: false,
        pricingEditorOpen: false,
        costPrice: Number(commonDraft.costPrice || 0),
        retailPrice: Number(commonDraft.retailPrice || 0),
        wholesalePrice: Number(commonDraft.wholesalePrice || 0),
      };
    }));
  }

  function removeDraftRow(index: number) {
    setVariantRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  function resetDraft() {
    if (!canNavigateAway()) return;
    setCommonDraft({ ...toCommonDraft(seedProduct), name: deriveBaseName(seedProduct) });
    const initialRows = toVariantRows(groupProducts);
    setVariantRows(initialRows);
    const existingColors = Array.from(new Set(initialRows.map(r => r.color).filter(Boolean)));
    const existingSizes = Array.from(new Set(initialRows.map(r => r.size).filter(Boolean)));
    setColorsValue(existingColors.join('، '));
    setSizesValue(existingSizes.join('، '));
    setBarcodePrefix(seedProduct.styleCode || '');
  }

  return (
    <div className="page-stack" style={{ gap: '0.9rem' }} dir="rtl">
      {/* 1. Master Product Card */}
      <div className="product-compact-card">
        <div className="product-compact-card-header">
          <h3 className="product-compact-card-title">بيانات الصنف والأسعار الأساسية للمجموعة</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="cashier-chip" style={{ fontWeight: 700, background: '#dbeafe', color: '#1e40af' }}>
              {variantRows.length} صنف فرعي
            </span>
            {commonDraft.styleCode ? (
              <span className="cashier-chip" style={{ fontWeight: 600, background: '#f1f5f9', color: '#334155' }}>
                كود الموديل: {commonDraft.styleCode}
              </span>
            ) : null}
          </div>
        </div>

        <div className="page-stack" style={{ gap: '0.75rem' }}>
          {/* Row 1: 6 Columns: Name, StyleCode, Cost, Retail, Wholesale, MinStock */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.9fr)', gap: '0.65rem', alignItems: 'start' }}>
            <Field label="اسم الصنف الأساسي">
              <input
                className="purchase-prototype-field-input"
                style={{ fontWeight: 700, color: '#0f172a' }}
                value={commonDraft.name}
                onChange={(event) => setCommonDraft((current) => ({ ...current, name: normalizeArabicInput(event.target.value) }))}
                disabled={mutation.isPending}
                placeholder="مثال: قميص أكسفورد"
              />
            </Field>

            <Field label="كود الموديل / المجموعة">
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  className="purchase-prototype-field-input"
                  style={{ fontWeight: 700 }}
                  value={commonDraft.styleCode}
                  onChange={(event) => {
                    const val = event.target.value;
                    setCommonDraft((current) => ({ ...current, styleCode: val }));
                    setBarcodePrefix(val);
                  }}
                  disabled={mutation.isPending}
                  placeholder="106"
                />
                <Button type="button" variant="secondary" onClick={handleGenerateStyleCode} disabled={mutation.isPending} style={{ whiteSpace: 'nowrap', fontSize: '0.75rem', padding: '0 8px' }}>
                  توليد
                </Button>
              </div>
            </Field>

            <Field label="سعر الشراء">
              <input
                className="purchase-prototype-field-input"
                type="number"
                step="0.01"
                value={commonDraft.costPrice}
                onChange={(event) => setCommonDraft((current) => ({ ...current, costPrice: Number(event.target.value || 0) }))}
                disabled={mutation.isPending}
              />
            </Field>

            <Field label="سعر البيع (قطاعي)">
              <input
                className="purchase-prototype-field-input"
                type="number"
                step="0.01"
                value={commonDraft.retailPrice}
                onChange={(event) => setCommonDraft((current) => ({ ...current, retailPrice: Number(event.target.value || 0) }))}
                disabled={mutation.isPending}
                style={{ fontWeight: 800, color: '#15803d' }}
              />
            </Field>

            <Field label="سعر الجملة">
              <input
                className="purchase-prototype-field-input"
                type="number"
                step="0.01"
                value={commonDraft.wholesalePrice}
                onChange={(event) => setCommonDraft((current) => ({ ...current, wholesalePrice: Number(event.target.value || 0) }))}
                disabled={mutation.isPending}
                style={{ fontWeight: 700, color: '#b45309' }}
              />
            </Field>

            <Field label="الحد الأدنى">
              <input
                className="purchase-prototype-field-input"
                type="number"
                value={commonDraft.minStock}
                onChange={(event) => setCommonDraft((current) => ({ ...current, minStock: Number(event.target.value || 0) }))}
                disabled={mutation.isPending}
              />
            </Field>
          </div>

          {/* Row 2: 4 Columns: Category, Supplier, Location, Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1.1fr) minmax(0, 1.1fr) minmax(0, 2fr)', gap: '0.65rem', alignItems: 'start' }}>
            <Field label="القسم">
              <select
                className="purchase-prototype-field-input"
                value={commonDraft.categoryId}
                onChange={(event) => setCommonDraft((current) => ({ ...current, categoryId: event.target.value }))}
                disabled={mutation.isPending}
              >
                <option value="">بدون قسم</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </Field>

            <Field label="المورد">
              <select
                className="purchase-prototype-field-input"
                value={commonDraft.supplierId}
                onChange={(event) => setCommonDraft((current) => ({ ...current, supplierId: event.target.value }))}
                disabled={mutation.isPending}
              >
                <option value="">بدون مورد</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
            </Field>

            <Field label="المخزن الافتراضي">
              <select
                className="purchase-prototype-field-input"
                value={commonDraft.defaultLocationId || ''}
                onChange={(event) => setCommonDraft((current) => ({ ...current, defaultLocationId: event.target.value }))}
                disabled={mutation.isPending}
              >
                <option value="">بدون مخزن افتراضي</option>
                {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
              </select>
            </Field>

            <Field label="ملاحظات حول الموديل">
              <input
                className="purchase-prototype-field-input"
                value={commonDraft.notes}
                onChange={(event) => setCommonDraft((current) => ({ ...current, notes: normalizeArabicInput(event.target.value) }))}
                disabled={mutation.isPending}
                placeholder="ملاحظات اختيارية..."
              />
            </Field>
          </div>
        </div>
      </div>

      {/* 2. Quick Variant Presets & Generator Card */}
      <div className="product-compact-card" style={{ background: '#ffffff', borderColor: '#cbd5e1' }}>
        <div className="page-stack" style={{ gap: 12 }}>
          {/* Header with Template Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                مُنشئ ومولد المتغيرات السريع
              </h4>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>{templateConfig.hint}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => setActiveTemplate('scents')}
                disabled={mutation.isPending}
                style={{
                  background: activeTemplate === 'scents' ? '#ffffff' : 'transparent',
                  color: activeTemplate === 'scents' ? '#1e1b4b' : '#475569',
                  fontWeight: activeTemplate === 'scents' ? 800 : 600,
                  border: activeTemplate === 'scents' ? '1px solid #cbd5e1' : '1px solid transparent',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: activeTemplate === 'scents' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                <ScentDropletIcon size={14} />
                <span>روائح ونكهات</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTemplate('fashion')}
                disabled={mutation.isPending}
                style={{
                  background: activeTemplate === 'fashion' ? '#ffffff' : 'transparent',
                  color: activeTemplate === 'fashion' ? '#1e1b4b' : '#475569',
                  fontWeight: activeTemplate === 'fashion' ? 800 : 600,
                  border: activeTemplate === 'fashion' ? '1px solid #cbd5e1' : '1px solid transparent',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: activeTemplate === 'fashion' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                <FashionShirtIcon size={14} />
                <span>ملابس وأحذية</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTemplate('sizes')}
                disabled={mutation.isPending}
                style={{
                  background: activeTemplate === 'sizes' ? '#ffffff' : 'transparent',
                  color: activeTemplate === 'sizes' ? '#1e1b4b' : '#475569',
                  fontWeight: activeTemplate === 'sizes' ? 800 : 600,
                  border: activeTemplate === 'sizes' ? '1px solid #cbd5e1' : '1px solid transparent',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: activeTemplate === 'sizes' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                <PackageBoxIcon size={14} />
                <span>أحجام وعبوات</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTemplate('custom')}
                disabled={mutation.isPending}
                style={{
                  background: activeTemplate === 'custom' ? '#ffffff' : 'transparent',
                  color: activeTemplate === 'custom' ? '#1e1b4b' : '#475569',
                  fontWeight: activeTemplate === 'custom' ? 800 : 600,
                  border: activeTemplate === 'custom' ? '1px solid #cbd5e1' : '1px solid transparent',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: activeTemplate === 'custom' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                <SlidersConfigIcon size={14} />
                <span>مخصص</span>
              </button>
            </div>
          </div>

          {/* Custom Labels Inputs */}
          {activeTemplate === 'custom' && (
            <div className="product-form-grid-2" style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <Field label="تسمية الخاصية الأولى (مثال: النوع، اللون، الخامة)">
                <input
                  className="purchase-prototype-field-input"
                  value={customPrimaryLabel}
                  onChange={(e) => setCustomPrimaryLabel(normalizeArabicInput(e.target.value))}
                  disabled={mutation.isPending}
                  placeholder="الخاصية الأولى"
                />
              </Field>
              <Field label="تسمية الخاصية الثانية (مثال: المقاس، السعة، التغليف)">
                <input
                  className="purchase-prototype-field-input"
                  value={customSecondaryLabel}
                  onChange={(e) => setCustomSecondaryLabel(normalizeArabicInput(e.target.value))}
                  disabled={mutation.isPending}
                  placeholder="الخاصية الثانية"
                />
              </Field>
            </div>
          )}

          {/* Generator Inputs: Primary & Secondary Tokens */}
          <div className="product-form-grid-2">
            <Field label={templateConfig.primaryLabel}>
              <textarea
                className="purchase-prototype-field-input"
                rows={2}
                value={colorsValue}
                onChange={(event) => setColorsValue(normalizeArabicInput(event.target.value))}
                disabled={mutation.isPending}
                placeholder={templateConfig.primaryPlaceholder}
                style={{ fontSize: '0.84rem', resize: 'vertical' }}
              />
            </Field>

            <Field label={templateConfig.secondaryLabel}>
              <textarea
                className="purchase-prototype-field-input"
                rows={2}
                value={sizesValue}
                onChange={(event) => setSizesValue(normalizeArabicInput(event.target.value))}
                disabled={mutation.isPending}
                placeholder={templateConfig.secondaryPlaceholder}
                style={{ fontSize: '0.84rem', resize: 'vertical' }}
              />
            </Field>
          </div>

          {/* Preset Buttons for Quick Clicks */}
          {Boolean(templateConfig.primaryPresets.length) && (
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>
                اختيارات سريعة لـ {templateConfig.primaryLabel}:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {templateConfig.primaryPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setColorsValue(mergeFashionTokens(colorsValue, [preset]))}
                    disabled={mutation.isPending}
                    style={{
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#334155',
                      padding: '2px 8px',
                      borderRadius: '5px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTemplate === 'fashion' && (
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>
                مجموعات مقاسات جاهزة للملابس:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {FASHION_SIZE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setSizesValue(mergeFashionTokens(sizesValue, preset.values))}
                    disabled={mutation.isPending}
                    style={{
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#334155',
                      padding: '2px 8px',
                      borderRadius: '5px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTemplate === 'scents' && (
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>
                أحجام وسعات شائعة للعطور:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {SCENT_SIZE_PRESETS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSizesValue(mergeFashionTokens(sizesValue, [val]))}
                    disabled={mutation.isPending}
                    style={{
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#334155',
                      padding: '2px 8px',
                      borderRadius: '5px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + {val}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTemplate === 'sizes' && (
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>
                أنواع التغليف والعبوات:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {PACKAGING_PRESETS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSizesValue(mergeFashionTokens(sizesValue, [val]))}
                    disabled={mutation.isPending}
                    style={{
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#334155',
                      padding: '2px 8px',
                      borderRadius: '5px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + {val}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sync Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: '4px' }}>
            <Button
              type="button"
              variant="primary"
              onClick={generateFromTokens}
              disabled={mutation.isPending || (!colorsValue.trim() && !sizesValue.trim())}
              style={{ fontSize: '0.8rem', padding: '5px 16px', fontWeight: 700 }}
            >
              ⚡ توليد وتحديث شبكة الفروع بناءً على القيم أعلاه
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Child Variants Matrix Card */}
      <div className="product-compact-card">
        <div className="product-compact-card-header">
          <h3 className="product-compact-card-title">جدول الأصناف الفرعية والباركودات</h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <Button
              type="button"
              variant="primary"
              onClick={addVariantRow}
              disabled={mutation.isPending}
              style={{ fontSize: '0.78rem', padding: '4px 12px' }}
            >
              + إضافة صنف فرعي يدوي
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={generateSequentialBarcodes}
              disabled={mutation.isPending || !variantRows.length || !commonDraft.styleCode.trim()}
              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
            >
              توليد باركودات متسلسلة
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={generateSequentialSkus}
              disabled={mutation.isPending || !variantRows.length}
              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
            >
              توليد أكواد SKU
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={clearAllBarcodes}
              disabled={mutation.isPending || !variantRows.length}
              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
            >
              مسح كل الباركودات
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={resetDraft}
              disabled={mutation.isPending || !hasDraftChanges}
              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
            >
              إعادة القيم الأصلية
            </Button>
          </div>
        </div>

        {/* Stats Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <span className="cashier-chip" style={{ fontWeight: 800, color: '#1e40af', background: '#dbeafe' }}>
            {variantRows.length} صنف فرعي
          </span>
          <span className="cashier-chip" style={{ color: '#166534', background: '#dcfce7' }}>
            إجمالي المخزون الحالي: {totalStock}
          </span>
        </div>

        {/* Variants Table */}
        <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: '850px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontWeight: 700, textAlign: 'right' }}>
                <th style={{ padding: '8px 8px', width: '32px', textAlign: 'center' }}>#</th>
                <th style={{ padding: '8px 8px', minWidth: '110px' }}>{primaryLabel}</th>
                <th style={{ padding: '8px 8px', minWidth: '100px' }}>{secondaryLabel}</th>
                <th style={{ padding: '8px 8px', minWidth: '110px' }}>رمز SKU</th>
                <th style={{ padding: '8px 8px', minWidth: '120px' }}>الباركود</th>
                <th style={{ padding: '8px 8px', minWidth: '95px' }}>سعر البيع (ج.م)</th>
                <th style={{ padding: '8px 8px', minWidth: '95px' }}>سعر الشراء (ج.م)</th>
                <th style={{ padding: '8px 8px', width: '70px', textAlign: 'center' }}>الرصيد</th>
                <th style={{ padding: '8px 8px', minWidth: '140px' }}>الاسم النهائي للصنف</th>
                <th style={{ padding: '8px 8px', width: '110px', textAlign: 'center' }}>التسعير المخصص</th>
                <th style={{ padding: '8px 6px', width: '40px', textAlign: 'center' }}>حذف</th>
              </tr>
            </thead>
            <tbody>
              {variantRows.map((row, index) => {
                const finalLabel = variantLabel(row);
                const fullName = commonDraft.name ? `${commonDraft.name}${finalLabel ? ` - ${finalLabel}` : ''}` : '-';

                return (
                  <Fragment key={`${row.id || 'draft'}-${index}`}>
                    <tr style={{ borderBottom: '1px solid #f1f5f9', background: index % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      <td style={{ padding: '6px 6px', textAlign: 'center', color: '#94a3b8', fontWeight: 700, fontSize: '0.74rem' }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: '6px 6px' }}>
                        <input
                          className="purchase-prototype-field-input"
                          style={{ padding: '4px 6px', fontSize: '0.8rem' }}
                          value={row.color}
                          onChange={(event) => updateRow(index, { color: normalizeArabicInput(event.target.value) })}
                          disabled={mutation.isPending}
                          placeholder={primaryLabel}
                        />
                      </td>
                      <td style={{ padding: '6px 6px' }}>
                        <input
                          className="purchase-prototype-field-input"
                          style={{ padding: '4px 6px', fontSize: '0.8rem' }}
                          value={row.size}
                          onChange={(event) => updateRow(index, { size: normalizeArabicInput(event.target.value) })}
                          disabled={mutation.isPending}
                          placeholder={secondaryLabel}
                        />
                      </td>
                      <td style={{ padding: '6px 6px' }}>
                        <input
                          className="purchase-prototype-field-input"
                          style={{ padding: '4px 6px', fontSize: '0.78rem', direction: 'ltr' }}
                          value={row.sku || ''}
                          onChange={(event) => updateRow(index, { sku: event.target.value })}
                          disabled={mutation.isPending}
                          placeholder="اختياري SKU"
                        />
                      </td>
                      <td style={{ padding: '6px 6px' }}>
                        <input
                          className="purchase-prototype-field-input"
                          style={{ padding: '4px 6px', fontSize: '0.78rem', direction: 'ltr' }}
                          value={row.barcode}
                          onChange={(event) => updateRow(index, { barcode: event.target.value })}
                          disabled={mutation.isPending}
                          placeholder="الباركود"
                        />
                      </td>
                      <td style={{ padding: '6px 6px' }}>
                        <input
                          className="purchase-prototype-field-input"
                          type="number"
                          step="0.01"
                          style={{ padding: '4px 6px', fontSize: '0.8rem', fontWeight: 700, color: '#15803d' }}
                          value={row.useCustomPricing ? row.retailPrice : commonDraft.retailPrice}
                          onChange={(event) => {
                            const val = Number(event.target.value || 0);
                            updateRow(index, { retailPrice: val, useCustomPricing: true });
                          }}
                          disabled={mutation.isPending}
                        />
                      </td>
                      <td style={{ padding: '6px 6px' }}>
                        <input
                          className="purchase-prototype-field-input"
                          type="number"
                          step="0.01"
                          style={{ padding: '4px 6px', fontSize: '0.8rem', color: '#475569' }}
                          value={row.useCustomPricing ? row.costPrice : commonDraft.costPrice}
                          onChange={(event) => {
                            const val = Number(event.target.value || 0);
                            updateRow(index, { costPrice: val, useCustomPricing: true });
                          }}
                          disabled={mutation.isPending}
                        />
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 800, color: (row.stock || 0) > 0 ? '#15803d' : '#94a3b8', fontSize: '0.8rem' }}>
                          {row.stock || 0}
                        </span>
                      </td>
                      <td style={{ padding: '6px 6px' }}>
                        <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.78rem', display: 'block', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fullName}>
                          {fullName}
                        </span>
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => toggleVariantPricing(index)}
                          disabled={mutation.isPending}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '3px 6px',
                            borderRadius: '5px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            background: row.useCustomPricing ? '#eff6ff' : '#f1f5f9',
                            color: row.useCustomPricing ? '#1d4ed8' : '#475569',
                            border: row.useCustomPricing ? '1px solid #bfdbfe' : '1px solid #cbd5e1',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {row.useCustomPricing ? `مخصص (${formatCurrency(row.retailPrice)})` : `موحد (${formatCurrency(commonDraft.retailPrice)})`}
                        </button>
                      </td>
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removeDraftRow(index)}
                          disabled={mutation.isPending || variantRows.length === 1}
                          title={variantRows.length === 1 ? 'يجب أن يتبقى صنف فرعي واحد على الأقل' : 'حذف هذا الصنف الفرعي'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '26px',
                            height: '26px',
                            borderRadius: '5px',
                            background: '#fef2f2',
                            border: '1px solid #fee2e2',
                            color: '#dc2626',
                            cursor: variantRows.length === 1 ? 'not-allowed' : 'pointer',
                            opacity: variantRows.length === 1 ? 0.35 : 1,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Trash2Icon size={13} />
                        </button>
                      </td>
                    </tr>

                    {/* Inline Custom Pricing Card Drawer */}
                    {row.useCustomPricing && row.pricingEditorOpen && (
                      <tr style={{ background: '#f0f9ff' }}>
                        <td colSpan={11} style={{ padding: '10px 16px', borderBottom: '1px solid #bae6fd' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0369a1' }}>
                              تخصيص أسعار الفرعي: {fullName}
                            </div>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => disableVariantPricing(index)}
                              disabled={mutation.isPending}
                              style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                            >
                              الرجوع للسعر الموحد
                            </Button>
                          </div>

                          <div className="product-form-grid-3">
                            <Field label="سعر الشراء للفرعي">
                              <input
                                className="purchase-prototype-field-input"
                                type="number"
                                step="0.01"
                                value={row.costPrice}
                                onChange={(event) => updateRow(index, { costPrice: Number(event.target.value || 0) })}
                                disabled={mutation.isPending}
                              />
                            </Field>
                            <Field label="سعر البيع للفرعي">
                              <input
                                className="purchase-prototype-field-input"
                                type="number"
                                step="0.01"
                                value={row.retailPrice}
                                onChange={(event) => updateRow(index, { retailPrice: Number(event.target.value || 0) })}
                                disabled={mutation.isPending}
                                style={{ fontWeight: 800, color: '#15803d' }}
                              />
                            </Field>
                            <Field label="سعر الجملة للفرعي">
                              <input
                                className="purchase-prototype-field-input"
                                type="number"
                                step="0.01"
                                value={row.wholesalePrice}
                                onChange={(event) => updateRow(index, { wholesalePrice: Number(event.target.value || 0) })}
                                disabled={mutation.isPending}
                                style={{ fontWeight: 700, color: '#b45309' }}
                              />
                            </Field>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notices & Alerts */}
      <DraftStateNotice
        visible={hasDraftChanges && !mutation.isPending}
        title="توجد تعديلات غير محفوظة على هذا الموديل"
        hint="عند الضغط على حفظ، سيتم تحديث وتطبيق البيانات على جميع الأصناف الفرعية التابعة له في المخازن ونقطة البيع."
      />

      {incompleteRows ? (
        <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309', fontSize: '0.8rem', fontWeight: 600 }}>
          يوجد {incompleteRows} سطر فرعي غير مكتمل. يرجى ملء الخاصية لتجنب تجاهل السطر.
        </div>
      ) : null}

      {duplicates.duplicateCombos ? (
        <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', fontSize: '0.8rem', fontWeight: 700 }}>
          يوجد صنف فرعي مكرر بنفس الخاصية داخل نفس المجموعة.
        </div>
      ) : null}

      {duplicates.duplicateBarcodes ? (
        <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', fontSize: '0.8rem', fontWeight: 700 }}>
          يوجد باركود مكرر مسند لأكثر من صنف فرعي داخل المجموعة.
        </div>
      ) : null}

      <MutationFeedback
        isError={mutation.isError}
        isSuccess={mutation.isSuccess}
        error={mutation.error}
        errorFallback="تعذر حفظ تعديلات المجموعة"
        successText="تم حفظ وتحديث الصنف الرئيسي وجميع الأصناف الفرعية بنجاح!"
      />

      {/* Sticky Bottom Footer Action Bar */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '10px 16px',
        boxShadow: '0 -2px 12px rgba(15, 23, 42, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        zIndex: 10,
      }}>
        <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
          إجمالي الأصناف الفرعية: <strong style={{ color: '#0f172a' }}>{variantRows.length} صنف</strong> | إجمالي المخزون: <strong style={{ color: '#15803d' }}>{totalStock}</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={resetDraft}
            disabled={mutation.isPending || !hasDraftChanges}
            style={{ fontSize: '0.82rem', padding: '6px 14px' }}
          >
            إلغاء التعديلات
          </Button>

          <SubmitButton
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || duplicates.duplicateCombos > 0 || duplicates.duplicateBarcodes > 0 || !variantRows.length}
            idleText="حفظ كل التعديلات مرة واحدة"
            pendingText="جارٍ الحفظ..."
            style={{ fontSize: '0.84rem', padding: '6px 20px', fontWeight: 800 }}
          />
        </div>
      </div>
    </div>
  );
}
