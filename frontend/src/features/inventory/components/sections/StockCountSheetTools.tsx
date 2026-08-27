import { useMemo, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import {
  exportStockCountSheetExcel,
  printStockCountSheet,
  type StockCountSheetRow,
} from '@/features/inventory/lib/inventory-documents';
import { useCategoriesQuery } from '@/shared/hooks/use-catalog-queries';
import type { Product, StockCountItem } from '@/types/domain';

type CountScope = 'quick' | 'selected_items' | 'category' | 'supplier' | 'full';

interface StockCountSheetToolsProps {
  products: Product[];
  items: StockCountItem[];
  countType: CountScope;
  selectedProduct?: Product;
  selectedCategoryId?: string;
  selectedSupplierId?: string;
  locationName?: string;
  isCountStarted: boolean;
  onItemsChange: (updater: (current: StockCountItem[]) => StockCountItem[]) => void;
}

function productToCountItem(product: Product): StockCountItem {
  const expectedQty = Number(product.stock || 0);
  return {
    id: `${product.id}-${Date.now()}`,
    productId: product.id,
    productName: product.name,
    expectedQty,
    countedQty: 0,
    varianceQty: Number((0 - expectedQty).toFixed(3)),
    reason: '',
    note: '',
  };
}

export function StockCountSheetTools({
  products,
  items,
  countType,
  selectedProduct,
  selectedCategoryId,
  selectedSupplierId,
  locationName,
  isCountStarted,
  onItemsChange,
}: StockCountSheetToolsProps) {
  const [includeExpectedQty, setIncludeExpectedQty] = useState(false);
  const categoriesQuery = useCategoriesQuery();
  const categories = Array.isArray(categoriesQuery.data) ? categoriesQuery.data : [];

  const getCategoryName = (id?: string) => {
    if (!id) return '';
    const trimmed = String(id).trim();
    const found = categories.find((c) => String(c.id) === trimmed || String(c.name).trim() === trimmed);
    return found?.name || (trimmed ? `قسم ${trimmed}` : '');
  };

  const productToRow = (product: Product): StockCountSheetRow => ({
    code: product.styleCode || product.id,
    barcode: product.barcode || product.units?.find((unit) => unit.barcode)?.barcode || '',
    name: product.name,
    category: getCategoryName(product.categoryId),
    expectedQty: product.stock ?? 0,
    countedQty: '',
    note: '',
  });

  const scopeProducts = useMemo(() => {
    if (countType === 'full') return products;
    if (countType === 'category') {
      const categoryId = selectedCategoryId || selectedProduct?.categoryId || '';
      if (!categoryId) return [];
      return products.filter((product) => String(product.categoryId || '') === String(categoryId));
    }
    if (countType === 'supplier') {
      const supplierId = selectedSupplierId || selectedProduct?.supplierId || '';
      if (!supplierId) return [];
      return products.filter((product) => String(product.supplierId || '') === String(supplierId));
    }
    if (selectedProduct) return [selectedProduct];
    return [];
  }, [countType, products, selectedCategoryId, selectedSupplierId, selectedProduct]);

  const sheetRows = useMemo(() => {
    if (countType === 'full' || countType === 'category' || countType === 'supplier') return scopeProducts.map(productToRow);
    if (items.length) {
      return items.map((item) => {
        const product = products.find((entry) => String(entry.id) === String(item.productId));
        return {
          code: product?.styleCode || String(item.productId),
          barcode: product?.barcode || product?.units?.find((unit) => unit.barcode)?.barcode || '',
          name: item.productName,
          category: getCategoryName(product?.categoryId),
          expectedQty: item.expectedQty,
          countedQty: item.countedQty,
          note: item.note || item.reason || '',
        };
      });
    }
    return scopeProducts.map(productToRow);
  }, [countType, items, products, scopeProducts, categories]);

  const disabled = !isCountStarted || !sheetRows.length;
  const helperText = countType === 'category' && !selectedCategoryId && !selectedProduct
    ? 'اختر القسم المطلوب حتى نجهز شيت أصناف هذا القسم.'
    : countType === 'supplier' && !selectedSupplierId && !selectedProduct
      ? 'اختر المورد المطلوب حتى نجهز شيت أصناف هذا المورد.'
      : disabled
        ? 'ابدأ الجرد واختر النطاق أو الصنف أولًا.'
        : `جاهز ${sheetRows.length} صنف للطباعة أو التصدير أو الإدخال الإلكتروني.`;

  function prepareElectronicCount() {
    if (disabled) return;
    const rows = (countType === 'full' || countType === 'category' || countType === 'supplier') ? scopeProducts : scopeProducts.filter(Boolean);
    if (!rows.length) return;
    onItemsChange(() => rows.map(productToCountItem));
  }

  return (
    <Field label="طريقة العد">
      <div className="surface-note">
        اختر بين شيت ورقي/CSV للعد خارج النظام، أو إدخال إلكتروني يفتح أصناف النطاق داخل الجلسة وتكتب أمام كل صنف الكمية المعدودة.
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
          onClick={() => exportStockCountSheetExcel(sheetRows, { includeExpectedQty })}
        >
          تصدير Excel
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={disabled}
          onClick={prepareElectronicCount}
        >
          إدخال إلكتروني
        </Button>
      </div>
      <div className="muted small" style={{ marginTop: 8 }}>{helperText}</div>
    </Field>
  );
}
