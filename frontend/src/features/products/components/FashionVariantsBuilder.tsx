import { useMemo } from 'react';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { normalizeArabicInput } from '@/lib/arabic-normalization';

import { mergeFashionTokens, splitFashionTokens, type FashionVariantDraft } from '@/features/products/components/fashion-variants.utils';

const COMMON_COLOR_PRESETS = ['اسود', 'ابيض', 'كحلي', 'اوف وايت', 'بيج', 'رمادي', 'زيتي', 'احمر', 'وردي', 'ازرق'];
const COMMON_VARIANT_PRESETS = ['توت', 'خوخ', 'ليمون', 'مانجو', 'لافندر', 'نعناع', 'فانيليا', 'جوز هند'];
const SIZE_PRESETS: Array<{ label: string; values: string[] }> = [
  { label: 'أساسي', values: ['S', 'M', 'L', 'XL', '2XL'] },
  { label: 'موسع', values: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] },
  { label: 'بناتي/حريمي', values: ['36', '38', '40', '42', '44', '46'] },
  { label: 'أطفال', values: ['2', '4', '6', '8', '10', '12', '14'] },
  { label: 'شوز', values: ['37', '38', '39', '40', '41', '42', '43', '44'] },
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
  name,
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
  const colors = useMemo(() => splitFashionTokens(colorsValue), [colorsValue]);
  const sizes = useMemo(() => splitFashionTokens(sizesValue), [sizesValue]);
  const duplicateBarcodeCount = useMemo(() => summarizeDuplicates(rows), [rows]);
  const totalStock = useMemo(() => rows.reduce((sum, row) => sum + Number(row.stock || 0), 0), [rows]);
  const suggestedPrefix = String(barcodePrefix || styleCode || '').trim();
  const isFashion = mode === 'fashion';
  const primaryLabel = isFashion ? 'الألوان' : 'الأصناف الفرعية / الخاصية الأولى';
  const secondaryLabel = isFashion ? 'المقاسات' : 'الخاصية الثانية (اختياري)';
  const primarySingleLabel = isFashion ? 'اللون' : 'الخاصية الأولى';
  const secondarySingleLabel = isFashion ? 'المقاس' : 'الخاصية الثانية';
  const builderTitle = isFashion ? 'إدخال موديل الملابس' : 'إدخال الصنف الرئيسي مع أصناف فرعية';
  const builderHint = isFashion
    ? 'اكتب الألوان والمقاسات أو استخدم الأزرار الجاهزة، وسيتم تجهيز كل لون/مقاس كسطر مستقل مع باركود ومخزون افتتاحي خاص به.'
    : 'اكتب الاختيارات الفرعية للصنف الرئيسي مثل الروائح أو النكهات أو الألوان، ويمكنك إضافة خاصية ثانية اختيارية مثل الحجم أو المقاس. السعر والبيانات العامة ستتطبق على الكل.';
  const primaryPlaceholder = isFashion ? 'اسود، ابيض، كحلي' : 'توت، خوخ، ليمون';
  const secondaryPlaceholder = isFashion ? 'S، M، L، XL' : 'اختياري: صغير، كبير أو 150 مل';
  const primaryPresets = isFashion ? COMMON_COLOR_PRESETS : COMMON_VARIANT_PRESETS;

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
    <div className="page-stack surface-note" style={{ padding: 12 }}>
      <div className="page-stack" style={{ gap: 10 }}>
        <div>
          <strong>{builderTitle}</strong>
          <div className="muted small">{builderHint}</div>
        </div>

        <div className="form-grid">
          <Field label={primaryLabel}>
            <textarea rows={3} value={colorsValue} onChange={(event) => onColorsChange(normalizeArabicInput(event.target.value))} disabled={disabled} placeholder={primaryPlaceholder} />
          </Field>
          <Field label={secondaryLabel}>
            <textarea rows={3} value={sizesValue} onChange={(event) => onSizesChange(normalizeArabicInput(event.target.value))} disabled={disabled} placeholder={secondaryPlaceholder} />
          </Field>
          <Field label="مخزون افتتاحي افتراضي لكل صنف فرعي">
            <input type="number" value={Number(defaultStock || 0)} onChange={(event) => onDefaultStockChange(Number(event.target.value || 0))} disabled={disabled} />
          </Field>
          <Field label="بادئة الباركود المتسلسل">
            <input value={barcodePrefix} onChange={(event) => onBarcodePrefixChange(event.target.value)} disabled={disabled} placeholder={styleCode ? `مثال: ${styleCode}` : 'مثال: GRP2401'} />
          </Field>
        </div>

        <div className="page-stack" style={{ gap: 6 }}>
          <div className="muted small">اقتراحات سريعة</div>
          <div className="actions compact-actions" style={{ flexWrap: 'wrap' }}>
            {primaryPresets.map((value) => (
              <Button key={value} type="button" variant="secondary" disabled={disabled} onClick={() => onColorsChange(mergeFashionTokens(colorsValue, [value]))}>{value}</Button>
            ))}
          </div>
        </div>

        {isFashion ? (
          <div className="page-stack" style={{ gap: 6 }}>
            <div className="muted small">مجموعات مقاسات جاهزة</div>
            <div className="actions compact-actions" style={{ flexWrap: 'wrap' }}>
              {SIZE_PRESETS.map((preset) => (
                <Button key={preset.label} type="button" variant="secondary" disabled={disabled} onClick={() => onSizesChange(mergeFashionTokens(sizesValue, preset.values))}>{preset.label}</Button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="actions compact-actions" style={{ flexWrap: 'wrap' }}>
          <span className="cashier-chip">{rows.length} صنف فرعي</span>
          <span className="cashier-chip">{colors.length || 0} {isFashion ? 'لون' : 'قيمة أولى'}</span>
          {sizes.length ? <span className="cashier-chip">{sizes.length} {isFashion ? 'مقاس' : 'قيمة ثانية'}</span> : null}
          <span className="cashier-chip">إجمالي مخزون افتتاحي {totalStock}</span>
          {name ? <span className="cashier-chip">الأساسي: {name}</span> : null}
        </div>

        <div className="actions compact-actions" style={{ flexWrap: 'wrap' }}>
          <Button type="button" variant="secondary" disabled={disabled || !rows.length} onClick={applyDefaultStockToAll}>تطبيق المخزون الافتراضي على الكل</Button>
          <Button type="button" variant="secondary" disabled={disabled || !rows.length || !suggestedPrefix} onClick={generateSequentialBarcodes}>توليد باركودات متسلسلة</Button>
          <Button type="button" variant="secondary" disabled={disabled || !rows.length} onClick={clearBarcodes}>مسح كل الباركودات</Button>
        </div>

        {!rows.length ? (
          <div className="muted small">أدخل قيمة واحدة على الأقل في الخاصية الأولى، ويمكنك ترك الخاصية الثانية فارغة لو الصنف الفرعي أحادي البعد.</div>
        ) : (
          <div className="page-stack" style={{ gap: 8 }}>
            {rows.map((row, index) => (
              <div
                key={`${row.color || 'primary'}-${row.size || 'secondary'}-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1.4fr) minmax(120px, 160px)',
                  gap: 10,
                  alignItems: 'end',
                  padding: 10,
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  background: 'var(--surface)',
                }}
              >
                <Field label={primarySingleLabel}>
                  <input value={row.color} readOnly disabled />
                </Field>
                <Field label={secondarySingleLabel}>
                  <input value={row.size} readOnly disabled />
                </Field>
                <Field label="الباركود">
                  <input value={row.barcode} onChange={(event) => updateRow(index, { barcode: event.target.value })} disabled={disabled} placeholder="اختياري" />
                </Field>
                <Field label="المخزون الافتتاحي">
                  <input type="number" value={Number(row.stock || 0)} onChange={(event) => updateRow(index, { stock: Number(event.target.value || 0) })} disabled={disabled} min={0} />
                </Field>
              </div>
            ))}
          </div>
        )}

        {duplicateBarcodeCount ? <div className="muted small" style={{ color: '#b91c1c' }}>يوجد {duplicateBarcodeCount} باركود مكرر داخل نفس المجموعة. لازم كل صنف فرعي يكون له باركود مختلف لو هتستخدم باركودات.</div> : null}
      </div>
    </div>
  );
}
