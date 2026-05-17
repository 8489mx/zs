import { useMemo, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import {
  exportStockCountSheetCsv,
  printStockCountSheet,
  type StockCountSheetRow,
} from '@/features/inventory/lib/inventory-documents';
import type { Product, StockCountItem } from '@/types/domain';

type CountScope = 'quick' | 'selected_items' | 'category' | 'full';

interface StockCountSheetToolsProps {
  products: Product[];
  items: StockCountItem[];
  countType: CountScope;
  selectedProduct?: Product;
  locationName?: string;
  isCountStarted: boolean;
}

function productToRow(product: Product): StockCountSheetRow {
  return {
    code: product.styleCode || product.id,
    barcode: product.barcode || product.units?.find((unit) => unit.barcode)?.barcode || '',
    name: product.name,
    category: product.categoryId || '',
    expectedQty: product.stock ?? 0,
    countedQty: '',
    note: '',
  };
}

export function StockCountSheetTools({
  products,
  items,
  countType,
  selectedProduct,
  locationName,
  isCountStarted,
}: StockCountSheetToolsProps) {
  const [includeExpectedQty, setIncludeExpectedQty] = useState(false);

  const sheetRows = useMemo(() => {
    if (countType === 'full') return products.map(productToRow);
    if (countType === 'category') {
      if (!selectedProduct?.categoryId) return [];
      return products.filter((product) => product.categoryId === selectedProduct.categoryId).map(productToRow);
    }
    if (items.length) {
      return items.map((item) => {
        const product = products.find((entry) => String(entry.id) === String(item.productId));
        return {
          code: product?.styleCode || String(item.productId),
          barcode: product?.barcode || product?.units?.find((unit) => unit.barcode)?.barcode || '',
          name: item.productName,
          category: product?.categoryId || '',
          expectedQty: item.expectedQty,
          countedQty: item.countedQty,
          note: item.note || item.reason || '',
        };
      });
    }
    return selectedProduct ? [productToRow(selectedProduct)] : [];
  }, [countType, items, products, selectedProduct]);

  const disabled = !isCountStarted || !sheetRows.length;
  const helperText = countType === 'category' && !selectedProduct
    ? 'اختر صنفًا من القسم المطلوب أولًا حتى نجهز شيت أصناف نفس القسم.'
    : disabled
      ? 'ابدأ الجرد واختر النطاق أو الصنف أولًا.'
      : `جاهز ${sheetRows.length} صنف للطباعة أو التصدير.`;

  return (
    <Field label="شيت العد">
      <div className="surface-note">
        جهّز ورقة عد للجرد قبل إدخال الفروقات: اطبعها أو صدّرها CSV ثم قارنها بالموجود فعليًا في المحل.
      </div>
      <label className="checkbox-row" style={{ marginTop: 10 }}>
        <input
          type="checkbox"
          checked={includeExpectedQty}
          onChange={(event) => setIncludeExpectedQty(event.target.checked)}
        />
        <span>إظهار كمية النظام في شيت العد</span>
      </label>
      <div className="actions compact-actions" style={{ marginTop: 10 }}>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => printStockCountSheet(sheetRows, {
            title: `شيت عد - ${countType === 'full' ? 'جرد كامل' : countType === 'category' ? 'جرد قسم' : 'جرد أصناف'}`,
            locationName,
            includeExpectedQty,
          })}
        >
          طباعة شيت العد
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => exportStockCountSheetCsv(sheetRows, { includeExpectedQty })}
        >
          تصدير CSV
        </Button>
      </div>
      <div className="muted small" style={{ marginTop: 8 }}>{helperText}</div>
    </Field>
  );
}
