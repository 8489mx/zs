import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import { normalizeProductUnits } from '@/features/products/components/ProductUnitsEditor';
import { productsApi } from '@/features/products/api/products.api';
import { buildCode128Svg, collectExistingBarcodes, createGeneratedBarcode, getMissingBarcodeRows, printBarcodeSheet, productUnitsWithFallback } from '@/lib/barcode';
import { downloadCsvFile } from '@/lib/browser';
import type { Product } from '@/types/domain';
import { buildUpdatePayload, normalizeCustomerPrices, refetchAndSelectProduct, toProductFormValues } from './product-workspace.utils';

export function BarcodeToolsCard({ products, product, onUpdated }: { products: Product[]; product?: Product; onUpdated?: (product: Product) => void }) {
  const queryClient = useQueryClient();
  const [unitId, setUnitId] = useState('');
  const [copies, setCopies] = useState(12);
  const [toolMessage, setToolMessage] = useState('');
  const units = useMemo(() => productUnitsWithFallback(product), [product]);
  const selectedUnit = units.find((unit) => String(unit.id || '') === String(unitId)) || units.find((unit) => unit.isBaseUnit) || units[0];
  const missingRows = useMemo(() => getMissingBarcodeRows(products), [products]);
  const barcodePreview = buildCode128Svg(selectedUnit?.barcode || product?.barcode || '');

  useEffect(() => {
    setUnitId('');
    setToolMessage('');
  }, [product?.id]);

  const saveBarcodeMutation = useMutation({
    mutationFn: async (nextBarcode: string) => {
      if (!product) throw new Error('اختر صنفًا أولًا');
      const unitsPayload = normalizeProductUnits(product.units, product.barcode || '').map((unit) => {
        if (selectedUnit && String(unit.id || '') === String(selectedUnit.id || '')) {
          return { ...unit, barcode: nextBarcode };
        }
        return unit;
      });
      const nextValues = buildUpdatePayload(
        {
          ...toProductFormValues(product),
          barcode: selectedUnit?.isBaseUnit || !product.barcode ? nextBarcode : product.barcode || ''
        },
        product,
        unitsPayload,
        normalizeCustomerPrices(product),
        product.offers
      );
      return productsApi.update(product.id, nextValues);
    },
    onSuccess: async () => {
      if (!product) return;
      const refreshed = await refetchAndSelectProduct(queryClient, product.id);
      if (refreshed) onUpdated?.(refreshed);
      await invalidateCatalogDomain(queryClient, { includeProducts: true });
    }
  });

  function generateBarcodeForSelection() {
    if (!product) return;
    const nextBarcode = createGeneratedBarcode(collectExistingBarcodes(products), 'ZS');
    saveBarcodeMutation.mutate(nextBarcode, {
      onSuccess: () => setToolMessage(`تم توليد باركود جديد: ${nextBarcode}`),
      onError: (error: unknown) => setToolMessage(error instanceof Error ? error.message : 'تعذر توليد الباركود')
    });
  }

  function exportMissingBarcodes() {
    if (!missingRows.length) return;
    downloadCsvFile(
      'missing-barcodes.csv',
      ['productId', 'productName', 'productBarcode', 'missingUnits'],
      missingRows.map((row) => [row.productId, row.productName, row.productBarcode || '', row.missingUnits.join(' | ')])
    );
  }

  return (
    <Card title="أدوات الباركود" actions={<span className="nav-pill">الباركود</span>}>
      <div className="page-stack page-shell products-workspace">
        <div className="mini-stats-grid">
          <div className="stat-card"><span>أصناف بدون باركود</span><strong>{missingRows.filter((row) => !row.productBarcode).length}</strong></div>
          <div className="stat-card"><span>وحدات بدون باركود</span><strong>{missingRows.reduce((sum, row) => sum + row.missingUnits.length, 0)}</strong></div>
          <div className="stat-card"><span>النسخ للطباعة</span><strong>{copies}</strong></div>
        </div>
        {!product ? <div className="muted">اختر صنفًا من الجدول لعرض أدوات توليد الباركود والطباعة.</div> : (
          <>
            <div className="form-grid">
              <Field label="الصنف المحدد"><input value={product.name} disabled readOnly /></Field>
              <Field label="الوحدة المحددة">
                <select value={unitId} onChange={(event) => setUnitId(event.target.value)}>
                  <option value="">الوحدة الأساسية</option>
                  {units.map((unit) => <option key={unit.id || unit.name} value={unit.id}>{unit.name} {unit.barcode ? `(${unit.barcode})` : '(بدون باركود)'}</option>)}
                </select>
              </Field>
              <Field label="عدد الملصقات"><input type="number" min="1" max="60" value={copies} onChange={(event) => setCopies(Number(event.target.value || 1))} /></Field>
              <Field label="الباركود الحالي"><input value={selectedUnit?.barcode || product.barcode || ''} readOnly disabled /></Field>
            </div>
            {barcodePreview ? <div className="barcode-preview-panel" dangerouslySetInnerHTML={{ __html: barcodePreview }} /> : <div className="muted small">لا يوجد باركود صالح للمعاينة الحالية.</div>}
            <div className="actions compact-actions">
              <Button type="button" onClick={generateBarcodeForSelection} disabled={saveBarcodeMutation.isPending}>توليد باركود</Button>
              <Button type="button" variant="secondary" onClick={() => {
                try {
                  printBarcodeSheet({ product, unit: selectedUnit, copies });
                } catch (error) {
                  setToolMessage(error instanceof Error ? error.message : 'تعذر طباعة الملصقات');
                }
              }}>طباعة ملصقات</Button>
            </div>
            {toolMessage ? <div className="success-box">{toolMessage}</div> : null}
          </>
        )}
        <div className="section-title" style={{ marginBottom: 0 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>الأصناف أو الوحدات الناقصة</h3>
          <Button type="button" variant="secondary" onClick={exportMissingBarcodes} disabled={!missingRows.length}>تصدير الناقص</Button>
        </div>
        <div className="list-stack">
          {missingRows.length ? missingRows.slice(0, 8).map((row) => (
            <div key={row.productId} className="list-row stacked-row">
              <div>
                <strong>{row.productName}</strong>
                <div className="muted small">باركود الصنف: {row.productBarcode || 'غير موجود'}</div>
                <div className="muted small">الوحدات الناقصة: {row.missingUnits.join('، ') || '—'}</div>
              </div>
            </div>
          )) : <div className="muted">كل الأصناف والوحدات الأساسية لديها باركود.</div>}
        </div>
      </div>
    </Card>
  );
}
