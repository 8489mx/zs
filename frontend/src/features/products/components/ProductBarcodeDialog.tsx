import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import { productsApi } from '@/features/products/api/products.api';
import { buildUpdatePayload, normalizeCustomerPrices, toProductFormValues } from '@/features/products/components/workspace-sections/product-workspace.utils';
import { normalizeProductUnits } from '@/features/products/components/ProductUnitsEditor';
import { buildCode128Svg, collectExistingBarcodes, createGeneratedBarcode, productUnitsWithFallback } from '@/lib/barcode';
import type { Product, ProductUnit } from '@/types/domain';

interface ProductBarcodeDialogProps {
  open: boolean;
  product: Product | null;
  products: Product[];
  mode?: 'scan' | 'generate';
  onClose: () => void;
  onSaved?: (product: Product) => void;
  onOpenPrint?: (product: Product, unit?: ProductUnit | null) => void;
}

export function ProductBarcodeDialog({ open, product, products, mode = 'scan', onClose, onSaved, onOpenPrint }: ProductBarcodeDialogProps) {
  const queryClient = useQueryClient();
  const [activeMode, setActiveMode] = useState<'scan' | 'generate'>(mode === 'generate' ? 'generate' : 'scan');
  const [unitId, setUnitId] = useState('');
  const [scanValue, setScanValue] = useState('');
  const [generatedValue, setGeneratedValue] = useState('');
  const [helperMessage, setHelperMessage] = useState('');

  const units = useMemo(() => productUnitsWithFallback(product), [product]);
  const selectedUnit = useMemo(
    () => units.find((unit) => String(unit.id || '') === String(unitId)) || units.find((unit) => unit.isBaseUnit) || units[0],
    [units, unitId],
  );
  const currentBarcode = selectedUnit?.barcode || product?.barcode || '';
  const previewSvg = buildCode128Svg(activeMode === 'generate' ? generatedValue : scanValue || currentBarcode);

  const unitOptions = useMemo(
    () => units.map((unit) => ({
      value: String(unit.id || unit.name),
      label: `${unit.name}${unit.barcode ? ` (${unit.barcode})` : ' (بدون باركود)'}`,
    })),
    [units],
  );

  useEffect(() => {
    if (!open) return;
    const nextMode = mode === 'generate' ? 'generate' : 'scan';
    setActiveMode(nextMode);
    setUnitId('');
    setScanValue('');
    setHelperMessage('');
    if (nextMode === 'generate') {
      setGeneratedValue(createGeneratedBarcode(collectExistingBarcodes(products), 'ZS'));
    } else {
      setGeneratedValue('');
    }
  }, [open, product?.id, mode, products]);

  const mutation = useMutation({
    mutationFn: async (barcodeValue: string) => {
      if (!product) throw new Error('الصنف غير متاح');
      const normalizedUnits = normalizeProductUnits(product.units, product.barcode || '').map((unit) => {
        if (selectedUnit && String(unit.id || '') === String(selectedUnit.id || '')) {
          return { ...unit, barcode: barcodeValue };
        }
        return unit;
      });
      const nextProductBarcode = selectedUnit?.isBaseUnit ? barcodeValue : product.barcode || '';
      return productsApi.update(
        product.id,
        buildUpdatePayload(
          { ...toProductFormValues(product), barcode: nextProductBarcode },
          product,
          normalizedUnits,
          normalizeCustomerPrices(product),
          product.offers,
        ),
      );
    },
    onSuccess: async () => {
      await invalidateCatalogDomain(queryClient, { includeProducts: true });
    },
  });

  if (!product) return null;
  const currentProduct = product;

  async function saveBarcode(barcodeValue: string) {
    const normalized = String(barcodeValue || '').trim();
    if (!normalized) return;
    await mutation.mutateAsync(normalized);
    const nextUnits = normalizeProductUnits(currentProduct.units, currentProduct.barcode || '').map((unit) => {
      if (selectedUnit && String(unit.id || '') === String(selectedUnit.id || '')) {
        return { ...unit, barcode: normalized };
      }
      return unit;
    });
    const nextProduct: Product = { ...currentProduct, barcode: selectedUnit?.isBaseUnit ? normalized : currentProduct.barcode, units: nextUnits };
    onSaved?.(nextProduct);
    setHelperMessage(`تم حفظ الباركود على ${selectedUnit?.name || 'الوحدة الأساسية'} بنجاح.`);
  }

  const effectiveBarcode = activeMode === 'generate' ? generatedValue : scanValue;

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="إدارة باركود الصنف (Product Barcode Management)"
      subtitle={`${currentProduct.name} · وحدة: ${selectedUnit?.name || 'قطعة'} · الباركود الحالي: ${currentBarcode || 'غير مسجل'}`}
      maxWidth="880px"
      footerActions={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div>
            {currentBarcode && onOpenPrint ? (
              <Button type="button" variant="secondary" onClick={() => onOpenPrint(currentProduct, selectedUnit)} style={{ fontSize: '0.8rem' }}>
                <AppIcons.Printer size={14} style={{ marginInlineEnd: '6px' }} />
                طباعة الملصقات
              </Button>
            ) : null}
          </div>
          <StandardDialogFooter
            cancelText="إغلاق"
            onCancel={onClose}
            submitText={activeMode === 'generate' ? 'حفظ الباركود المولد' : 'حفظ قراءة الباركود'}
            onSubmit={() => void saveBarcode(effectiveBarcode)}
            isSubmitting={mutation.isPending}
            submitDisabled={mutation.isPending || !effectiveBarcode.trim()}
          />
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', alignItems: 'start' }} dir="rtl">
        {/* 1. بيانات الصنف والباركود */}
        <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
              <AppIcons.Barcode size={15} />
              <span>1. إعداد وقراءة الباركود (Barcode Setup)</span>
            </div>
            <div style={{ display: 'inline-flex', gap: '4px', background: '#e2e8f0', padding: '2px', borderRadius: '6px' }}>
              <button
                type="button"
                onClick={() => setActiveMode('scan')}
                style={{
                  padding: '3px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  background: activeMode === 'scan' ? '#170e5e' : 'transparent',
                  color: activeMode === 'scan' ? '#ffffff' : '#475569',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                مسح / إدخال يدوي
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMode('generate');
                  setGeneratedValue(createGeneratedBarcode(collectExistingBarcodes(products), 'ZS'));
                }}
                style={{
                  padding: '3px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  background: activeMode === 'generate' ? '#170e5e' : 'transparent',
                  color: activeMode === 'generate' ? '#ffffff' : '#475569',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                توليد باركود تلقائي
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="اسم الصنف">
              <input value={currentProduct.name} readOnly disabled style={{ background: '#f1f5f9' }} />
            </Field>

            <Field label="الوحدة المستهدفة">
              <CustomSelect
                value={unitId || String(selectedUnit?.id || '')}
                options={unitOptions}
                onChange={(val) => setUnitId(val)}
              />
            </Field>

            <Field label="الباركود الحالي المسجل">
              <input value={currentBarcode || 'لا يوجد باركود'} readOnly disabled style={{ background: '#f1f5f9', color: currentBarcode ? '#170e5e' : '#94a3b8', fontWeight: 600 }} />
            </Field>

            {activeMode === 'scan' ? (
              <Field label="قراءة السكانر أو الإدخال اليدوي *">
                <input
                  data-autofocus
                  value={scanValue}
                  onChange={(event) => setScanValue(event.target.value)}
                  placeholder="وجّه السكانر أو اكتب الباركود..."
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void saveBarcode(scanValue);
                    }
                  }}
                />
              </Field>
            ) : (
              <Field label="الباركود المولد تلقائياً *">
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input data-autofocus value={generatedValue} onChange={(event) => setGeneratedValue(event.target.value)} />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setGeneratedValue(createGeneratedBarcode(collectExistingBarcodes(products), 'ZS'))}
                    style={{ padding: '0 10px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                  >
                    تجديد
                  </Button>
                </div>
              </Field>
            )}
          </div>

          <MutationFeedback isError={mutation.isError} error={mutation.error} errorFallback="تعذر حفظ الباركود" />
          {helperMessage ? (
            <div style={{ marginTop: '10px', padding: '8px 12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', color: '#065f46', fontSize: '0.8rem', fontWeight: 600 }}>
              {helperMessage}
            </div>
          ) : null}
        </div>

        {/* 2. المعاينة المباشرة للباركود */}
        <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Eye size={15} />
            <span>2. معاينة الباركود الحية (Code-128 Preview)</span>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', textAlign: 'center', minHeight: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {previewSvg ? (
              <div className="barcode-preview-panel" dangerouslySetInnerHTML={{ __html: previewSvg }} />
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>اكتب أو ولّد باركوداً صالحاً لتظهر المعاينة هنا.</div>
            )}
          </div>

          <p style={{ margin: '10px 0 0 0', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5 }}>
            {activeMode === 'scan'
              ? 'عند استخدام جهاز السكانر، ضع المؤشر في خانة القراءة وسيتم التقاط الكود مباشرة، والضغط على Enter يقوم بالحفظ التلقائي.'
              : 'الباركود المولد يطابق نظام التشفير القياسي Code-128 وجاهز للطباعة على كافة أنواع الملصقات الحرارية وورق A4.'}
          </p>
        </div>
      </div>
    </StandardDialog>
  );
}
