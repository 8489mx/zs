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

  function updateRow(index: number, patch: Partial<FashionVariantDraft>) {
    onRowsChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
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

        {/* Input Fields for Values */}
        <div className="product-form-grid-2">
          <Field label={templateConfig.primaryLabel}>
            <textarea
              className="purchase-prototype-field-input"
              rows={2}
              value={colorsValue}
              onChange={(event) => onColorsChange(normalizeArabicInput(event.target.value))}
              disabled={disabled}
              placeholder={templateConfig.primaryPlaceholder}
              style={{ resize: 'vertical' }}
            />
          </Field>
          <Field label={templateConfig.secondaryLabel}>
            <textarea
              className="purchase-prototype-field-input"
              rows={2}
              value={sizesValue}
              onChange={(event) => onSizesChange(normalizeArabicInput(event.target.value))}
              disabled={disabled}
              placeholder={templateConfig.secondaryPlaceholder}
              style={{ resize: 'vertical' }}
            />
          </Field>
        </div>

        {/* Presets Row */}
        {templateConfig.primaryPresets.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
              اختيارات سريعة للخاصية الأولى (اضغط للإضافة):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {templateConfig.primaryPresets.map((val) => (
                <button
                  key={val}
                  type="button"
                  disabled={disabled}
                  onClick={() => onColorsChange(mergeFashionTokens(colorsValue, [val]))}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.75rem',
                    color: '#334155',
                    cursor: 'pointer',
                    fontWeight: 600,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}
                >
                  + {val}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Secondary Presets based on template */}
        {activeTemplate === 'fashion' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
              مجموعات مقاسات جاهزة للملابس:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {FASHION_SIZE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSizesChange(mergeFashionTokens(sizesValue, preset.values))}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    fontSize: '0.75rem',
                    color: 'var(--primary, #1e1b4b)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}
                >
                  + {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTemplate === 'scents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
              أحجام وسعات شائعة للعطور والمستحضرات:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {SCENT_SIZE_PRESETS.map((val) => (
                <button
                  key={val}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSizesChange(mergeFashionTokens(sizesValue, [val]))}
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.75rem',
                    color: '#166534',
                    cursor: 'pointer',
                    fontWeight: 700,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}
                >
                  + {val}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTemplate === 'sizes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
              أنواع التغليف والعبوات:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {PACKAGING_PRESETS.map((val) => (
                <button
                  key={val}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSizesChange(mergeFashionTokens(sizesValue, [val]))}
                  style={{
                    background: '#fefce8',
                    border: '1px solid #fde047',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.75rem',
                    color: '#854d0e',
                    cursor: 'pointer',
                    fontWeight: 700,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}
                >
                  + {val}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Global Settings for Variants: Default Stock & Barcode Prefix */}
        <div className="product-form-grid-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
          <Field label="مخزون افتتاحي افتراضي لكل فرع">
            <input
              className="purchase-prototype-field-input"
              type="number"
              value={Number(defaultStock || 0)}
              onChange={(event) => onDefaultStockChange(Number(event.target.value || 0))}
              disabled={disabled}
            />
          </Field>
          <Field label="بادئة الباركود المتسلسل">
            <input
              className="purchase-prototype-field-input"
              value={barcodePrefix}
              onChange={(event) => onBarcodePrefixChange(event.target.value)}
              disabled={disabled}
              placeholder={styleCode ? `مثال: ${styleCode}` : 'مثال: GRP2401'}
            />
          </Field>
        </div>

        {/* Action Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span className="cashier-chip" style={{ fontWeight: 800, color: '#1e40af', background: '#dbeafe' }}>
              {rows.length} صنف فرعي
            </span>
            <span className="cashier-chip">{colors.length || 0} {templateConfig.primarySingleLabel}</span>
            {sizes.length ? <span className="cashier-chip">{sizes.length} {templateConfig.secondarySingleLabel}</span> : null}
            <span className="cashier-chip" style={{ color: '#166534', background: '#dcfce7' }}>
              إجمالي المخزون الافتتاحي: {totalStock}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <Button type="button" variant="secondary" disabled={disabled || !rows.length} onClick={applyDefaultStockToAll} style={{ fontSize: '0.78rem' }}>
              تطبيق المخزون الافتراضي على الكل
            </Button>
            <Button type="button" variant="secondary" disabled={disabled || !rows.length || !suggestedPrefix} onClick={generateSequentialBarcodes} style={{ fontSize: '0.78rem' }}>
              توليد باركودات متسلسلة
            </Button>
            <Button type="button" variant="secondary" disabled={disabled || !rows.length} onClick={clearBarcodes} style={{ fontSize: '0.78rem' }}>
              مسح كل الباركودات
            </Button>
          </div>
        </div>

        {/* Matrix Table of Generated Rows */}
        {!rows.length ? (
          <div style={{ textAlign: 'center', padding: '16px', background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b', fontSize: '0.84rem' }}>
            أدخل قيمة واحدة على الأقل في <strong>{templateConfig.primaryLabel}</strong> لتجهيز الأصناف الفرعية تلقائياً.
          </div>
        ) : (
          <div className="page-stack" style={{ gap: 6 }}>
            {rows.map((row, index) => (
              <div
                key={`${row.color || 'primary'}-${row.size || 'secondary'}-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1.4fr) minmax(110px, 140px)',
                  gap: 8,
                  alignItems: 'center',
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  background: '#ffffff',
                }}
              >
                <Field label={templateConfig.primarySingleLabel}>
                  <input className="purchase-prototype-field-input" value={row.color} readOnly disabled style={{ fontWeight: 700, color: '#0f172a', background: '#f8fafc' }} />
                </Field>
                <Field label={templateConfig.secondarySingleLabel}>
                  <input className="purchase-prototype-field-input" value={row.size} readOnly disabled style={{ background: '#f8fafc' }} />
                </Field>
                <Field label="الباركود">
                  <input className="purchase-prototype-field-input" value={row.barcode} onChange={(event) => updateRow(index, { barcode: event.target.value })} disabled={disabled} placeholder="اختياري أو امسح الباركود" />
                </Field>
                <Field label="المخزون الافتتاحي">
                  <input className="purchase-prototype-field-input" type="number" value={Number(row.stock || 0)} onChange={(event) => updateRow(index, { stock: Number(event.target.value || 0) })} disabled={disabled} min={0} />
                </Field>
              </div>
            ))}
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
