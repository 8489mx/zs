import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { downloadCsvFile, escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatCurrency } from '@/lib/format';
import { productsApi } from '@/features/products/api/products.api';
import { catalogApi } from '@/lib/api/catalog';
import { queryKeys } from '@/app/query-keys';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';
import type { Product, ProductUnit } from '@/types/domain';
import { useProductsPageQuery } from '@/features/products/hooks/useProductsPageQuery';

export function useProductsWorkspaceController() {
  const [search, setSearch] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'low' | 'out' | 'offers' | 'special'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [offerDialogProduct, setOfferDialogProduct] = useState<Product | null>(null);
  const [barcodeDialogProduct, setBarcodeDialogProduct] = useState<Product | null>(null);
  const [barcodeDialogMode, setBarcodeDialogMode] = useState<'scan' | 'generate'>('scan');
  const [printDialogState, setPrintDialogState] = useState<{ product: Product; unit?: ProductUnit | null } | null>(null);

  const productsQuery = useProductsPageQuery({ page, pageSize, q: search, view: viewFilter });
  const categoriesQuery = useQuery({ queryKey: queryKeys.productsCategories, queryFn: productsApi.categories, staleTime: 60_000 });
  const suppliersQuery = useQuery({ queryKey: queryKeys.productsSuppliers, queryFn: productsApi.suppliers, staleTime: 60_000 });
  const customersQuery = useQuery({ queryKey: queryKeys.productsCustomers, queryFn: catalogApi.listCustomers, staleTime: 60_000 });
  const queryClient = useQueryClient();
  const canDelete = useHasAnyPermission('canDelete');
  const canPrint = useHasAnyPermission('canPrint');
  const canManageSuppliers = useHasAnyPermission('suppliers');

  const deleteMutation = useMutation({
    mutationFn: (productId: string) => productsApi.remove(productId),
    onSuccess: async () => {
      await invalidateCatalogDomain(queryClient, { includeProducts: true });
      setSelectedProduct(null);
      setProductToDelete(null);
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      const failures: string[] = [];
      for (const productId of productIds) {
        try {
          await productsApi.remove(productId);
        } catch (error) {
          failures.push(error instanceof Error ? error.message : `تعذر حذف الصنف ${productId}`);
        }
      }
      if (failures.length) throw new Error(failures.join('\n'));
    },
    onSuccess: async () => {
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      if (selectedProduct && selectedIds.includes(String(selectedProduct.id))) {
        setSelectedProduct(null);
      }
      await invalidateCatalogDomain(queryClient, { includeProducts: true });
    }
  });

  const categoryNames = useMemo(() => Object.fromEntries((categoriesQuery.data || []).map((category) => [category.id, category.name])), [categoriesQuery.data]);
  const supplierNames = useMemo(() => Object.fromEntries((suppliersQuery.data || []).map((supplier) => [supplier.id, supplier.name])), [suppliersQuery.data]);
  const visibleProducts = useMemo(() => productsQuery.data?.products || [], [productsQuery.data?.products]);
  const summary = productsQuery.data?.summary;
  const metrics = {
    total: Number(summary?.totalProducts || 0),
    lowStockCount: Number(summary?.lowStockCount || 0),
    outOfStockCount: Number(summary?.outOfStockCount || 0),
  };
  const inventoryCost = Number(summary?.inventoryCost || 0);
  const inventorySaleValue = Number(summary?.inventorySaleValue || 0);
  const activeOffersCount = Number(summary?.activeOffersCount || 0);
  const customerPriceCount = Number(summary?.customerPriceCount || 0);
  const selectedProducts = visibleProducts.filter((product) => selectedIds.includes(String(product.id)));

  useEffect(() => {
    if (selectedProduct) {
      const refreshed = visibleProducts.find((product) => String(product.id) === String(selectedProduct.id));
      if (refreshed) {
        setSelectedProduct(refreshed);
        return;
      }
      setSelectedProduct(null);
    }
  }, [visibleProducts, selectedProduct]);

  const resetProductsView = () => {
    setSearch('');
    setViewFilter('all');
    setSelectedProduct(null);
    setSelectedIds([]);
    setPage(1);
  };

  const exportProductsCsv = () => {
    downloadCsvFile('products-register.csv', ['name', 'itemKind', 'styleCode', 'color', 'size', 'barcode', 'category', 'supplier', 'costPrice', 'retailPrice', 'wholesalePrice', 'stock', 'minStock', 'units', 'offers', 'customerPrices', 'notes'], visibleProducts.map((product) => [
      product.name,
      product.itemKind || 'standard',
      product.styleCode || '',
      product.color || '',
      product.size || '',
      product.barcode,
      categoryNames[product.categoryId] || '',
      supplierNames[product.supplierId] || '',
      product.costPrice,
      product.retailPrice,
      product.wholesalePrice,
      product.stock,
      product.minStock,
      (product.units || []).map((unit) => `${unit.name} x ${unit.multiplier}${unit.barcode ? ` [${unit.barcode}]` : ''}`).join(' | '),
      (product.offers || []).map((offer) => `${offer.type}:${offer.value}:${offer.minQty || 1}:${offer.from || ''}:${offer.to || ''}`).join(' | '),
      (product.customerPrices || []).map((entry) => `${entry.customerId}:${entry.price}`).join(' | '),
      product.notes || ''
    ]));
  };

  const copySelectedProductSummary = async () => {
    if (!selectedProduct) return;
    const summaryText = [
      `الصنف: ${selectedProduct.name}`,
      `الباركود: ${selectedProduct.barcode || '-'}`,
      `نوع الصنف: ${selectedProduct.itemKind === 'fashion' ? 'ملابس' : 'عادي'}`,
      `كود الموديل: ${selectedProduct.styleCode || '-'}`,
      `اللون: ${selectedProduct.color || '-'}`,
      `المقاس: ${selectedProduct.size || '-'}`,
      `القسم: ${categoryNames[selectedProduct.categoryId] || '-'}`,
      `المورد: ${supplierNames[selectedProduct.supplierId] || '-'}`,
      `شراء: ${Number(selectedProduct.costPrice || 0)}`,
      `قطاعي: ${Number(selectedProduct.retailPrice || 0)}`,
      `جملة: ${Number(selectedProduct.wholesalePrice || 0)}`,
      `المخزون: ${Number(selectedProduct.stock || 0)}`,
      `الحد الأدنى: ${Number(selectedProduct.minStock || 0)}`,
      `الوحدات: ${(selectedProduct.units || []).map((unit) => `${unit.name} x ${Number(unit.multiplier || 1)}${unit.barcode ? ` [${unit.barcode}]` : ''}`).join(' | ') || '-'}`,
      `العروض: ${(selectedProduct.offers || []).length}`,
      `أسعار خاصة: ${(selectedProduct.customerPrices || []).length}`,
      `ملاحظات: ${selectedProduct.notes || '-'}`
    ].join('\n');
    try {
      await navigator.clipboard?.writeText(summaryText);
    } catch {}
  };

  const printProductsList = () => {
    const html = `
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>قائمة الأصناف</title>
          <style>
            body{font-family:Tahoma,Arial,sans-serif;padding:24px;color:#0f172a} h1{margin:0 0 8px} p{color:#475569} table{width:100%;border-collapse:collapse;margin-top:16px} th,td{border:1px solid #cbd5e1;padding:8px;text-align:right;vertical-align:top} th{background:#eff6ff} .muted{color:#64748b;font-size:12px}
          </style>
        </head>
        <body>
          <h1>قائمة الأصناف الحالية</h1>
          <p>عدد الأصناف: ${visibleProducts.length}</p>
          <table>
            <thead><tr><th>الصنف</th><th>القسم</th><th>المورد</th><th>الباركود</th><th>الوحدات</th><th>الأسعار</th><th>المخزون</th><th>ملاحظات</th></tr></thead>
            <tbody>
              ${visibleProducts.map((product) => `
                <tr>
                  <td><strong>${escapeHtml(product.name)}</strong><div class="muted">عروض: ${(product.offers || []).length} | أسعار خاصة: ${(product.customerPrices || []).length}</div></td>
                  <td>${escapeHtml(categoryNames[product.categoryId] || '-')}</td>
                  <td>${escapeHtml(supplierNames[product.supplierId] || '-')}</td>
                  <td>${escapeHtml(product.barcode || '-')}</td>
                  <td>${(product.units || []).map((unit) => `${escapeHtml(unit.name)} × ${Number(unit.multiplier || 1)}${unit.barcode ? ` <span class="muted">(${escapeHtml(unit.barcode)})</span>` : ''}`).join('<br/>')}</td>
                  <td>شراء: ${formatCurrency(product.costPrice)}<br/>قطاعي: ${formatCurrency(product.retailPrice)}<br/>جملة: ${formatCurrency(product.wholesalePrice)}</td>
                  <td>${Number(product.stock || 0)} / حد أدنى ${Number(product.minStock || 0)}</td>
                  <td>${escapeHtml(product.notes || '-')}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </body>
      </html>`;
    printHtmlDocument('قائمة الأصناف', html);
  };

  const openOfferDialog = (product: Product) => {
    setSelectedProduct(product);
    setOfferDialogProduct(product);
  };

  const openBarcodeDialog = (product: Product, mode: 'scan' | 'generate' = 'scan') => {
    setSelectedProduct(product);
    setBarcodeDialogProduct(product);
    setBarcodeDialogMode(mode);
  };

  const openPrintDialog = (product: Product, unit?: ProductUnit | null) => {
    setSelectedProduct(product);
    setPrintDialogState({ product, unit });
  };

  const applyProductPatch = (product: Product) => {
    setSelectedProduct((current) => (current && String(current.id) === String(product.id) ? product : current));
    setOfferDialogProduct((current) => (current && String(current.id) === String(product.id) ? product : current));
    setBarcodeDialogProduct((current) => (current && String(current.id) === String(product.id) ? product : current));
    setPrintDialogState((current) => (current && String(current.product.id) === String(product.id) ? { ...current, product } : current));
  };

  return {
    search,
    viewFilter,
    selectedProduct,
    productToDelete,
    selectedIds,
    bulkDeleteOpen,
    page,
    pageSize,
    productsQuery,
    categoriesQuery,
    suppliersQuery,
    customersQuery,
    canDelete,
    canPrint,
    canManageSuppliers,
    deleteMutation,
    bulkDeleteMutation,
    categoryNames,
    supplierNames,
    visibleProducts,
    summary,
    metrics,
    inventoryCost,
    inventorySaleValue,
    activeOffersCount,
    customerPriceCount,
    selectedProducts,
    offerDialogProduct,
    barcodeDialogProduct,
    barcodeDialogMode,
    printDialogState,
    setSearch,
    setViewFilter,
    setSelectedProduct,
    setProductToDelete,
    setSelectedIds,
    setBulkDeleteOpen,
    setPage,
    setPageSize,
    setOfferDialogProduct,
    setBarcodeDialogProduct,
    setPrintDialogState,
    queryClient,
    exportProductsCsv,
    copySelectedProductSummary,
    resetProductsView,
    printProductsList,
    openOfferDialog,
    openBarcodeDialog,
    openPrintDialog,
    applyProductPatch,
  };
}
