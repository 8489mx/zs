import { useState, useMemo } from 'react';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { normalizeArabicInput } from '@/lib/arabic-normalization';

import { mergeFashionTokens, splitFashionTokens, type FashionVariantDraft } from '@/features/products/components/fashion-variants.utils';

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

function summarizeDuplicates(rows: FashionVariantDraft[]) {
  const seen = new Map<string, number>();
  let duplicates = 0;
  for (const row of rows) {
    const barcode = String(row.barcode || '').trim().toLowerCase();
    if (!barcode) continue;
    const nextCount = Number(seen.get(barcode) || 0) + 1;
    seen.set(barcode, nextCount);
    if (nextCount === 2) duplicates += 1;
  }
  return duplicates;
}

interface FashionVariantsBuilderProps {
  mode: 'fashion' | 'standard';
  name: string;
  styleCode: string;
  colorsValue: string;
  sizesValue: string;
  defaultStock: number;
  barcodePrefix: string;
  parentCostPrice?: number;
  parentRetailPrice?: number;
  parentWholesalePrice?: number;
  rows: FashionVariantDraft[];
  disabled?: boolean;
  onColorsChange: (value: string) => void;
  onSizesChange: (value: string) => void;
  onDefaultStockChange: (value: number) => void;
  onBarcodePrefixChange: (value: string) => void;
  onRowsChange: (rows: FashionVariantDraft[]) => void;
}

export function FashionVariantsBuilder({
  mode,
  name: _name,
  styleCode,
  colorsValue,
  sizesValue,
  defaultStock,
  barcodePrefix,
  parentCostPrice,
  parentRetailPrice,
  parentWholesalePrice: _parentWholesalePrice,
  rows,
  disabled,
  onColorsChange,
  onSizesChange,
  onDefaultStockChange,
  onBarcodePrefixChange,
  onRowsChange,
}: FashionVariantsBuilderProps) {
  const [activeTemplate, setActiveTemplate] = useState<VariantTemplateType>(mode === 'fashion' ? 'fashion' : 'scents');
  const [customPrimaryLabel, setCustomPrimaryLabel] = useState('الخاصية الأولى');
  const [customSecondaryLabel, setCustomSecondaryLabel] = useState('الخاصية الثانية');

  const colors = useMemo(() => splitFashionTokens(colorsValue), [colorsValue]);
  const sizes = useMemo(() => splitFashionTokens(sizesValue), [sizesValue]);
  const duplicateBarcodeCount = useMemo(() => summarizeDuplicates(rows), [rows]);
  const totalStock = useMemo(() => rows.reduce((sum, row) => sum + Number(row.stock || 0), 0), [rows]);
  const suggestedPrefix = String(barcodePrefix || styleCode || '').trim();

  // Template config
  const templateConfig = useMemo(() => {
    switch (activeTemplate) {
      case 'fashion':
        return {
          title: 'موديل ملابس وأحذية',
          hint: 'اكتب الألوان والمقاسات أو اختر من المجموعات الجاهزة لتوليد شبكة المقاسات والباركودات تلقائياً.',
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
          hint: 'أدخل الروائح أو النكهات (مثل لافندر، عود، توت) ويمكنك إضافة الأحجام كخاصية ثانية (مثل 100 مل، 250 مل).',
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
          hint: 'أدخل الأحجام أو الأوزان (مثل 1 لتر، 5 لتر) والتغليف أو النوع كخاصية ثانية (علبة، كيس، بخاخ).',
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
          hint: 'حدد المسميات الخاصة بنشاطك واكتب قيم كل خاصية لتجهيز الأصناف الفرعية.',
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

  function addEmptyRow() {
    const id = `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    onRowsChange([
      ...rows,
      {
        id,
        color: '',
        size: '',
        barcode: '',
        stock: Number(defaultStock || 0),
        retailPrice: parentRetailPrice !== undefined && parentRetailPrice > 0 ? parentRetailPrice : undefined,
        costPrice: parentCostPrice !== undefined && parentCostPrice > 0 ? parentCostPrice : undefined,
        wholesalePrice: _parentWholesalePrice !== undefined && _parentWholesalePrice > 0 ? _parentWholesalePrice : undefined,
      },
    ]);
  }

  function updateRow(index: number, patch: Partial<FashionVariantDraft>) {
    onRowsChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function deleteRow(index: number) {
    const next = [...rows];
    next.splice(index, 1);
    onRowsChange(next);
  }

  function applyDefaultStockToAll() {
    onRowsChange(rows.map((row) => ({ ...row, stock: Number(defaultStock || 0) })));
  }

  function generateSequentialBarcodes() {
    const prefix = suggestedPrefix;
    if (!prefix) return;
    onRowsChange(
      rows.map((row, index) => ({
        ...row,
        barcode: `${prefix}-${String(index + 1).padStart(3, '0')}`,
      })),
    );
  }

  function generateSequentialSkus() {
    const prefix = suggestedPrefix || 'VAR';
    onRowsChange(
      rows.map((row) => {
        const colorPart = (row.color || '').trim().replace(/\s+/g, '-');
        const sizePart = (row.size || '').trim().replace(/\s+/g, '-');
        const generated = [prefix, colorPart, sizePart].filter(Boolean).join('-');
        return { ...row, sku: generated };
      }),
    );
  }

  function clearBarcodes() {
    onRowsChange(rows.map((row) => ({ ...row, barcode: '' })));
  }

  return (
    <div className="product-compact-card" style={{ background: '#ffffff', borderColor: '#cbd5e1', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
      <div className="page-stack" style={{ gap: 12 }}>
        {/* Header with Template Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
              مُنشئ المتغيرات والأصناف الفرعية
            </h4>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>{templateConfig.hint}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={() => setActiveTemplate('scents')}
              disabled={disabled}
              style={{
                background: activeTemplate === 'scents' ? '#ffffff' : 'transparent',
                color: activeTemplate === 'scents' ? 'var(--primary, #1e1b4b)' : '#475569',
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
                transition: 'all 0.15s ease'
              }}
            >
              <ScentDropletIcon size={14} />
              <span>روائح ونكهات</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTemplate('fashion')}
              disabled={disabled}
              style={{
                background: activeTemplate === 'fashion' ? '#ffffff' : 'transparent',
                color: activeTemplate === 'fashion' ? 'var(--primary, #1e1b4b)' : '#475569',
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
                transition: 'all 0.15s ease'
              }}
            >
              <FashionShirtIcon size={14} />
              <span>ملابس وأحذية</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTemplate('sizes')}
              disabled={disabled}
              style={{
                background: activeTemplate === 'sizes' ? '#ffffff' : 'transparent',
                color: activeTemplate === 'sizes' ? 'var(--primary, #1e1b4b)' : '#475569',
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
                transition: 'all 0.15s ease'
              }}
            >
              <PackageBoxIcon size={14} />
              <span>أحجام وعبوات</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTemplate('custom')}
              disabled={disabled}
              style={{
                background: activeTemplate === 'custom' ? '#ffffff' : 'transparent',
                color: activeTemplate === 'custom' ? 'var(--primary, #1e1b4b)' : '#475569',
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
                transition: 'all 0.15s ease'
              }}
            >
              <SlidersConfigIcon size={14} />
              <span>مخصص</span>
            </button>
          </div>
        </div>

        {/* Custom Labels Inputs if custom mode is chosen */}
        {activeTemplate === 'custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <Field label="مسمى الخاصية الأولى (مثل: القدرة، اللون، الخامة)">
              <input
                className="purchase-prototype-field-input"
                value={customPrimaryLabel}
                onChange={(e) => setCustomPrimaryLabel(e.target.value)}
                disabled={disabled}
                placeholder="مثال: القدرة"
              />
            </Field>
            <Field label="مسمى الخاصية الثانية (مثل: لون الإضاءة، المقاس)">
              <input
                className="purchase-prototype-field-input"
                value={customSecondaryLabel}
                onChange={(e) => setCustomSecondaryLabel(e.target.value)}
                disabled={disabled}
                placeholder="مثال: لون الإضاءة"
              />
            </Field>
          </div>
        )}

        {/* 2-Column Grid for Primary & Secondary Properties */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', alignItems: 'start' }}>
          {/* Primary Column (e.g. Colors / Scents / Sizes) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <Field label={templateConfig.primaryLabel}>
              <input
                type="text"
                className="purchase-prototype-field-input"
                value={colorsValue}
                onChange={(event) => onColorsChange(normalizeArabicInput(event.target.value))}
                disabled={disabled}
                placeholder={templateConfig.primaryPlaceholder}
                style={{ height: '34px', minHeight: '34px', fontSize: '0.84rem' }}
              />
            </Field>
            {templateConfig.primaryPresets.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', marginTop: '2px' }}>
                {templateConfig.primaryPresets.map((val) => (
                  <button
                    key={val}
                    type="button"
                    disabled={disabled}
                    onClick={() => onColorsChange(mergeFashionTokens(colorsValue, [val]))}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      padding: '1px 6px',
                      fontSize: '0.72rem',
                      color: '#334155',
                      cursor: 'pointer',
                      fontWeight: 600,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                      lineHeight: 1.3,
                      transition: 'all 0.1s ease',
                    }}
                  >
                    + {val}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Secondary Column (e.g. Sizes / Capacities / Packaging) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <Field label={templateConfig.secondaryLabel}>
              <input
                type="text"
                className="purchase-prototype-field-input"
                value={sizesValue}
                onChange={(event) => onSizesChange(normalizeArabicInput(event.target.value))}
                disabled={disabled}
                placeholder={templateConfig.secondaryPlaceholder}
                style={{ height: '34px', minHeight: '34px', fontSize: '0.84rem' }}
              />
            </Field>

            {/* Presets for Secondary */}
            {activeTemplate === 'fashion' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', marginTop: '2px' }}>
                {FASHION_SIZE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSizesChange(mergeFashionTokens(sizesValue, preset.values))}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      padding: '1px 7px',
                      fontSize: '0.72rem',
                      color: 'var(--primary, #1e1b4b)',
                      cursor: 'pointer',
                      fontWeight: 700,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                      lineHeight: 1.3,
                      transition: 'all 0.1s ease',
                    }}
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            )}

            {activeTemplate === 'scents' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', marginTop: '2px' }}>
                {SCENT_SIZE_PRESETS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSizesChange(mergeFashionTokens(sizesValue, [val]))}
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '4px',
                      padding: '1px 6px',
                      fontSize: '0.72rem',
                      color: '#166534',
                      cursor: 'pointer',
                      fontWeight: 700,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                      lineHeight: 1.3,
                      transition: 'all 0.1s ease',
                    }}
                  >
                    + {val}
                  </button>
                ))}
              </div>
            )}

            {activeTemplate === 'sizes' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', marginTop: '2px' }}>
                {PACKAGING_PRESETS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSizesChange(mergeFashionTokens(sizesValue, [val]))}
                    style={{
                      background: '#fefce8',
                      border: '1px solid #fde047',
                      borderRadius: '4px',
                      padding: '1px 6px',
                      fontSize: '0.72rem',
                      color: '#854d0e',
                      cursor: 'pointer',
                      fontWeight: 700,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                      lineHeight: 1.3,
                      transition: 'all 0.1s ease',
                    }}
                  >
                    + {val}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Global Settings for Variants: Default Stock & Barcode Prefix & Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 10px' }}>
          {/* Quick Settings: Stock & Barcode prefix + Summary Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>مخزون افتراضي:</span>
              <input
                type="number"
                value={Number(defaultStock || 0)}
                onChange={(event) => onDefaultStockChange(Number(event.target.value || 0))}
                disabled={disabled}
                style={{
                  width: '60px',
                  height: '28px',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  padding: '2px 6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  background: '#ffffff'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>بادئة الباركود:</span>
              <input
                type="text"
                value={barcodePrefix}
                onChange={(event) => onBarcodePrefixChange(event.target.value)}
                disabled={disabled}
                placeholder={styleCode ? `${styleCode}` : 'GRP2401'}
                style={{
                  width: '95px',
                  height: '28px',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  padding: '2px 6px',
                  fontSize: '0.76rem',
                  background: '#ffffff'
                }}
              />
            </div>

            <div style={{ height: '16px', width: '1px', background: '#cbd5e1', margin: '0 2px' }} />

            {/* Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              <span className="cashier-chip" style={{ fontWeight: 800, color: '#1e40af', background: '#dbeafe', fontSize: '0.72rem', padding: '2px 6px' }}>
                {rows.length} صنف فرعي
              </span>
              <span className="cashier-chip" style={{ fontSize: '0.72rem', padding: '2px 6px' }}>{colors.length || 0} {templateConfig.primarySingleLabel}</span>
              {sizes.length ? <span className="cashier-chip" style={{ fontSize: '0.72rem', padding: '2px 6px' }}>{sizes.length} {templateConfig.secondarySingleLabel}</span> : null}
              {rows.length > 0 && (
                <span className="cashier-chip" style={{ color: '#166534', background: '#dcfce7', fontSize: '0.72rem', padding: '2px 6px', fontWeight: 700 }}>
                  إجمالي المخزون: {totalStock}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <Button
              type="button"
              variant="primary"
              disabled={disabled}
              onClick={addEmptyRow}
              style={{
                fontSize: '0.76rem',
                height: '28px',
                padding: '0 10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 700,
                background: 'var(--primary, #1e1b4b)',
                color: '#ffffff',
              }}
            >
              <span style={{ fontSize: '1rem', lineHeight: 1, fontWeight: 900 }}>+</span>
              <span>إضافة صنف فرعي</span>
            </Button>
            <Button type="button" variant="secondary" disabled={disabled || !rows.length} onClick={applyDefaultStockToAll} style={{ fontSize: '0.74rem', height: '28px', padding: '0 8px' }}>
              تطبيق المخزون
            </Button>
            <Button type="button" variant="secondary" disabled={disabled || !rows.length || !suggestedPrefix} onClick={generateSequentialBarcodes} style={{ fontSize: '0.74rem', height: '28px', padding: '0 8px' }}>
              توليد باركودات
            </Button>
            <Button type="button" variant="secondary" disabled={disabled || !rows.length} onClick={generateSequentialSkus} style={{ fontSize: '0.74rem', height: '28px', padding: '0 8px' }}>
              توليد SKU
            </Button>
            <Button type="button" variant="secondary" disabled={disabled || !rows.length} onClick={clearBarcodes} style={{ fontSize: '0.74rem', height: '28px', padding: '0 8px', color: '#b91c1c' }}>
              مسح الباركودات
            </Button>
          </div>
        </div>

        {/* Matrix Table of Generated Rows */}
        {!rows.length ? (
          <div style={{ textAlign: 'center', padding: '16px', background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ color: '#64748b', fontSize: '0.82rem' }}>
              أدخل قيم <strong>{templateConfig.primaryLabel}</strong> في الأعلى لتوليد الشبكة تلقائياً، أو أضف أصنافاً يدوياً مباشرة:
            </div>
            <button
              type="button"
              onClick={addEmptyRow}
              disabled={disabled}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '5px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--primary, #1e1b4b)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ fontSize: '1.1rem', lineHeight: 1, fontWeight: 900 }}>+</span>
              <span>إضافة صنف فرعي يدوياً (سطر جديد)</span>
            </button>
          </div>
        ) : (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto', background: '#ffffff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.8rem', minWidth: '780px' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr style={{ color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '8px 8px', width: '32px', textAlign: 'center', verticalAlign: 'middle' }}>#</th>
                  <th style={{ padding: '8px 6px', width: '15%', verticalAlign: 'middle' }}>{templateConfig.primarySingleLabel}</th>
                  <th style={{ padding: '8px 6px', width: '13%', verticalAlign: 'middle' }}>{templateConfig.secondarySingleLabel}</th>
                  <th style={{ padding: '8px 6px', width: '15%', verticalAlign: 'middle' }}>رمز SKU</th>
                  <th style={{ padding: '8px 6px', width: '17%', verticalAlign: 'middle' }}>الباركود</th>
                  <th style={{ padding: '8px 6px', width: '13%', verticalAlign: 'middle' }}>سعر البيع (ج.م)</th>
                  <th style={{ padding: '8px 6px', width: '13%', verticalAlign: 'middle' }}>سعر التكلفة (ج.م)</th>
                  <th style={{ padding: '8px 6px', width: '10%', textAlign: 'center', verticalAlign: 'middle' }}>الرصيد</th>
                  <th style={{ padding: '8px 4px', width: '36px', textAlign: 'center', verticalAlign: 'middle' }}>حذف</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.id || `row-${index}`}
                    style={{ borderBottom: '1px solid #f1f5f9', background: index % 2 === 0 ? '#ffffff' : '#fafafa' }}
                  >
                    <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle', color: '#94a3b8', fontSize: '0.74rem' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '4px 6px', verticalAlign: 'middle' }}>
                      <input
                        className="purchase-prototype-field-input"
                        value={row.color || ''}
                        onChange={(event) => updateRow(index, { color: normalizeArabicInput(event.target.value) })}
                        disabled={disabled}
                        placeholder={templateConfig.primarySingleLabel}
                        style={{ height: '30px', fontSize: '0.78rem', fontWeight: 700, padding: '4px 8px', width: '100%' }}
                      />
                    </td>
                    <td style={{ padding: '4px 6px', verticalAlign: 'middle' }}>
                      <input
                        className="purchase-prototype-field-input"
                        value={row.size || ''}
                        onChange={(event) => updateRow(index, { size: normalizeArabicInput(event.target.value) })}
                        disabled={disabled}
                        placeholder={templateConfig.secondarySingleLabel}
                        style={{ height: '30px', fontSize: '0.78rem', fontWeight: 600, padding: '4px 8px', width: '100%' }}
                      />
                    </td>
                    <td style={{ padding: '4px 6px', verticalAlign: 'middle' }}>
                      <input
                        className="purchase-prototype-field-input"
                        value={row.sku || ''}
                        onChange={(event) => updateRow(index, { sku: event.target.value })}
                        disabled={disabled}
                        placeholder="اختياري SKU..."
                        style={{ height: '30px', fontSize: '0.76rem', padding: '4px 8px' }}
                      />
                    </td>
                    <td style={{ padding: '4px 6px', verticalAlign: 'middle' }}>
                      <input
                        className="purchase-prototype-field-input"
                        value={row.barcode}
                        onChange={(event) => updateRow(index, { barcode: event.target.value })}
                        disabled={disabled}
                        placeholder="الباركود الدولي..."
                        style={{ height: '30px', fontSize: '0.76rem', fontFamily: 'monospace', padding: '4px 8px' }}
                      />
                    </td>
                    <td style={{ padding: '4px 6px', verticalAlign: 'middle' }}>
                      <input
                        className="purchase-prototype-field-input"
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.retailPrice !== undefined && row.retailPrice !== null ? row.retailPrice : ''}
                        onChange={(event) => updateRow(index, { retailPrice: event.target.value === '' ? undefined : Number(event.target.value) })}
                        disabled={disabled}
                        placeholder={parentRetailPrice ? `افتراضي: ${parentRetailPrice}` : '0.00'}
                        style={{ height: '30px', fontSize: '0.78rem', fontWeight: 700, color: '#16a34a', padding: '4px 8px' }}
                      />
                    </td>
                    <td style={{ padding: '4px 6px', verticalAlign: 'middle' }}>
                      <input
                        className="purchase-prototype-field-input"
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.costPrice !== undefined && row.costPrice !== null ? row.costPrice : ''}
                        onChange={(event) => updateRow(index, { costPrice: event.target.value === '' ? undefined : Number(event.target.value) })}
                        disabled={disabled}
                        placeholder={parentCostPrice ? `افتراضي: ${parentCostPrice}` : '0.00'}
                        style={{ height: '30px', fontSize: '0.78rem', color: '#475569', padding: '4px 8px' }}
                      />
                    </td>
                    <td style={{ padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <input
                        className="purchase-prototype-field-input"
                        type="number"
                        min={0}
                        value={Number(row.stock || 0)}
                        onChange={(event) => updateRow(index, { stock: Number(event.target.value || 0) })}
                        disabled={disabled}
                        style={{ height: '30px', fontSize: '0.78rem', textAlign: 'center', fontWeight: 700, padding: '4px' }}
                      />
                    </td>
                    <td style={{ padding: '4px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <button
                        type="button"
                        onClick={() => deleteRow(index)}
                        disabled={disabled}
                        title="حذف هذا الصنف الفرعي"
                        style={{
                          border: 'none',
                          background: '#fee2e2',
                          color: '#b91c1c',
                          borderRadius: '6px',
                          width: '26px',
                          height: '26px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.85rem'
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Table Footer with Add Row Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                onClick={addEmptyRow}
                disabled={disabled}
                style={{
                  background: '#ffffff',
                  border: '1px dashed #94a3b8',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: 'var(--primary, #1e1b4b)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}
              >
                <span style={{ fontSize: '1rem', lineHeight: 1, fontWeight: 900 }}>+</span>
                <span>إضافة سطر / صنف فرعي جديد</span>
              </button>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                يمكنك الكتابة في الحقول بالأعلى لتوليد المقاسات، أو الضغط على (+) لإدخال الأصناف يدوياً سطراً بسطر
              </span>
            </div>
          </div>
        )}

        {duplicateBarcodeCount ? (
          <div style={{ padding: '8px 12px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', color: '#b91c1c', fontSize: '0.82rem', fontWeight: 700 }}>
            يوجد {duplicateBarcodeCount} باركود مكرر داخل نفس المجموعة. يجب أن يكون لكل صنف فرعي باركود مختلف لتجنب التضارب.
          </div>
        ) : null}
      </div>
    </div>
  );
}
