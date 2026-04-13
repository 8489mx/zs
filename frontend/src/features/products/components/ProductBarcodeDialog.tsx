import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
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

  return (
    <DialogShell open={open} onClose={onClose} width="min(920px, 100%)" zIndex={82} ariaLabel="إدارة باركود الصنف">
      <div className="page-stack">
        <div className="section-title">
          <div className="section-heading-copy">
            <h3>الباركود داخل سطر الصنف</h3>
            <p className="section-description">{currentProduct.name} · افتح النافذة من السجل مباشرة، بدون الحاجة لاختيار الصنف أسفل الصفحة.</p>
          </div>
          <div className="section-title-actions actions compact-actions">
            <span className="nav-pill">{selectedUnit?.name || 'قطعة'}</span>
            <Button type="button" variant="secondary" onClick={onClose}>إغلاق</Button>
          </div>
        </div>

        <div className="two-column-grid" style={{ alignItems: 'start' }}>
          <div className="card" style={{ minHeight: 0 }}>
            <div className="actions compact-actions" style={{ marginBottom: 12 }}>
              <Button type="button" variant={activeMode === 'scan' ? 'primary' : 'secondary'} onClick={() => setActiveMode('scan')}>إضافة باركود</Button>
              <Button type="button" variant={activeMode === 'generate' ? 'primary' : 'secondary'} onClick={() => {
                setActiveMode('generate');
                setGeneratedValue(createGeneratedBarcode(collectExistingBarcodes(products), 'ZS'));
              }}>توليد باركود</Button>
            </div>
            <div className="form-grid">
              <Field label="الصنف المحدد">
                <input value={currentProduct.name} readOnly disabled />
              </Field>
              <Field label="الوحدة">
                <select value={unitId} onChange={(event) => setUnitId(event.target.value)}>
                  {units.map((unit) => <option key={unit.id || unit.name} value={unit.id}>{unit.name}{unit.barcode ? ` (${unit.barcode})` : ' (بدون باركود)'}</option>)}
                </select>
              </Field>
              <Field label="الباركود الحالي">
                <input value={currentBarcode} readOnly disabled />
              </Field>
              {activeMode === 'scan' ? (
                <Field label="قراءة السكانر / إدخال يدوي">
                  <input
                    data-autofocus
                    value={scanValue}
                    onChange={(event) => setScanValue(event.target.value)}
                    placeholder="وجه السكانر هنا أو اكتب الباركود"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void saveBarcode(scanValue);
                      }
                    }}
                  />
                </Field>
              ) : (
                <Field label="الباركود المولد">
                  <input data-autofocus value={generatedValue} onChange={(event) => setGeneratedValue(event.target.value)} />
                </Field>
              )}
            </div>
            <div className="actions compact-actions" style={{ marginTop: 12 }}>
              <Button type="button" onClick={() => void saveBarcode(activeMode === 'generate' ? generatedValue : scanValue)} disabled={mutation.isPending || !(activeMode === 'generate' ? generatedValue : scanValue).trim()}>{activeMode === 'generate' ? 'حفظ الباركود المولد' : 'حفظ القراءة'}</Button>
              <Button type="button" variant="secondary" onClick={() => {
                const nextValue = createGeneratedBarcode(collectExistingBarcodes(products), 'ZS');
                setActiveMode('generate');
                setGeneratedValue(nextValue);
              }} disabled={mutation.isPending}>توليد جديد</Button>
              <Button type="button" variant="secondary" onClick={() => onOpenPrint?.(currentProduct, selectedUnit)} disabled={!currentBarcode}>طباعة الملصقات</Button>
            </div>
            <MutationFeedback isError={mutation.isError} error={mutation.error} errorFallback="تعذر حفظ الباركود" />
            {helperMessage ? <div className="success-box">{helperMessage}</div> : null}
          </div>

          <div className="card" style={{ minHeight: 0 }}>
            <div className="section-title" style={{ marginBottom: 8 }}>
              <div className="section-heading-copy">
                <h3 style={{ fontSize: 16 }}>معاينة الباركود</h3>
                <p className="section-description">يمكنك حفظه أولًا أو الانتقال مباشرة لنافذة الطباعة والملصقات.</p>
              </div>
            </div>
            {previewSvg ? <div className="barcode-preview-panel" dangerouslySetInnerHTML={{ __html: previewSvg }} /> : <div className="muted">اكتب أو ولد باركودًا صالحًا لتظهر المعاينة.</div>}
            <div className="muted small" style={{ marginTop: 12 }}>
              {activeMode === 'scan'
                ? 'لو عندك سكانر، اترك المؤشر داخل الحقل وسيستقبل القراءة مباشرة. الضغط على Enter يحفظ الباركود على الصنف أو الوحدة المختارة.'
                : 'لأصناف بدون باركود، يمكنك توليد كود جديد ومعاينته ثم حفظه مباشرة.'}
            </div>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
