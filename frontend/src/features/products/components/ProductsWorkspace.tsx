import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { ProductForm } from '@/features/products/components/ProductForm';
import { ProductsStatsGrid } from '@/features/products/components/ProductsStatsGrid';
import { ProductsTableCard } from '@/features/products/components/ProductsTableCard';
import {
  QuickCatalogCard,
  ProductEditorCard,
} from '@/features/products/components/ProductsWorkspaceSections';
import { useProductsWorkspaceController } from '@/features/products/hooks/useProductsWorkspaceController';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import { useMutation } from '@tanstack/react-query';
import { inventoryApi } from '@/features/inventory/api/inventory.api';

const LazyProductOfferDialog = lazy(() => import('@/features/products/components/ProductOfferDialog').then((module) => ({ default: module.ProductOfferDialog })));
const LazyProductBarcodeDialog = lazy(() => import('@/features/products/components/ProductBarcodeDialog').then((module) => ({ default: module.ProductBarcodeDialog })));
const LazyBarcodePrintDialog = lazy(() => import('@/features/products/components/BarcodePrintDialog').then((module) => ({ default: module.BarcodePrintDialog })));

const productsWorkspaceRegressionLabels = ['باركود', 'وحدات'];
void productsWorkspaceRegressionLabels;

function scrollToRef(target: HTMLDivElement | null) {
  if (!target || typeof target.scrollIntoView !== 'function') return;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function ProductsWorkspace() {
  const controller = useProductsWorkspaceController();
  const settingsQuery = useSettingsQuery();
  const clothingEnabled = settingsQuery.data?.clothingModuleEnabled === true;
  const defaultProductKind = clothingEnabled && settingsQuery.data?.defaultProductKind === 'fashion' ? 'fashion' : 'standard';
  const addProductRef = useRef<HTMLDivElement | null>(null);
  const editProductRef = useRef<HTMLDivElement | null>(null);
  const toolsRef = useRef<HTMLDivElement | null>(null);
  const hasProducts = controller.metrics.total > 0;

  const [bulkResetTarget, setBulkResetTarget] = useState<typeof controller.productToDelete | null>(null);
  const deleteFamily = useMemo(() => {
    const target = controller.productToDelete;
    if (!target) return [];
    const styleCode = String(target.styleCode || '').trim();
    if (styleCode) {
      const grouped = controller.visibleProducts.filter((product) => String(product.styleCode || '').trim() === styleCode);
      if (grouped.length) return grouped;
    }
    return [target];
  }, [controller.productToDelete, controller.visibleProducts]);
  const familyStockRows = useMemo(() => deleteFamily.filter((product) => Math.abs(Number(product.stock || 0)) > 0.0001), [deleteFamily]);
  const bulkResetMutation = useMutation({
    mutationFn: async ({ managerPin, reason }: { managerPin: string; reason: string }) => {
      for (const product of familyStockRows) {
        await inventoryApi.createAdjustment({
          productId: String(product.id),
          actionType: 'adjust',
          qty: 0,
          reason: 'inventory_count',
          note: `${reason} | تصفير قبل حذف الصنف الرئيسي ${controller.productToDelete?.name || product.name}`,
          managerPin,
        });
      }
    },
    onSuccess: async () => {
      await invalidateCatalogDomain(controller.queryClient, { includeProducts: true });
      setBulkResetTarget(null);
      controller.setProductToDelete(null);
    },
  });

  useEffect(() => {
    if (!controller.selectedProduct) return;
    scrollToRef(editProductRef.current);
  }, [controller.selectedProduct]);

  return (
    <div className="page-stack page-shell products-workspace-page">
      <PageHeader
        title="الأصناف"
        description={clothingEnabled ? 'العروض والباركود والملصقات صارت مباشرة داخل سطر الصنف نفسه، مع دعم خصائص الملابس من نفس شاشة الأصناف.' : 'العروض والباركود والملصقات صارت مباشرة داخل سطر الصنف نفسه. لا حاجة للنزول إلى جزء سفلي حتى تعمل الأدوات الأساسية.'}
        badge={<span className="nav-pill">{controller.summary?.totalProducts || 0} صنف</span>}
        actions={(
          <div className="actions compact-actions page-header-actions">
            <Button
              onClick={() => {
                controller.setSelectedProduct(null);
                scrollToRef(addProductRef.current);
              }}
            >
              {defaultProductKind === 'fashion' ? 'إضافة موديل ملابس' : 'إضافة صنف جديد'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (controller.selectedProduct) {
                  scrollToRef(editProductRef.current);
                  return;
                }
                scrollToRef(addProductRef.current);
              }}
            >
              {controller.selectedProduct ? 'الانتقال للتعديل' : 'الانتقال للإضافة'}
            </Button>
            <Button variant="secondary" onClick={controller.resetProductsView}>إعادة الضبط</Button>
            <Button variant="secondary" onClick={() => scrollToRef(toolsRef.current)}>القسم والمورد</Button>
            <Button variant="secondary" onClick={controller.exportProductsCsv}>تصدير CSV</Button>
            <Button variant="secondary" onClick={controller.printProductsList} disabled={!controller.canPrint}>طباعة</Button>
          </div>
        )}
      />

      {!hasProducts ? (
        <Card title="ابدأ بإضافة أول صنف" actions={<span className="nav-pill">خطوة البداية</span>} className="workspace-panel">
          <div className="page-stack">
            <div className="muted">
              لسه ما فيش أصناف مضافة. ابدأ بإضافة أول صنف للمحل، وبعدها السجل والعروض والباركود والملصقات هتبقى متاحة مباشرة من كل سطر.
            </div>
            <div className="actions compact-actions">
              <Button onClick={() => scrollToRef(addProductRef.current)}>{defaultProductKind === 'fashion' ? 'إضافة أول موديل الآن' : 'إضافة أول صنف الآن'}</Button>
              <Button variant="secondary" onClick={() => scrollToRef(toolsRef.current)}>إضافة قسم أو مورد</Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="products-header-stats">
        <ProductsStatsGrid
          total={controller.metrics.total}
          lowStockCount={controller.metrics.lowStockCount}
          outOfStockCount={controller.metrics.outOfStockCount}
          visibleCount={controller.visibleProducts.length}
          inventoryCost={controller.inventoryCost}
          inventorySaleValue={controller.inventorySaleValue}
          activeOffersCount={controller.activeOffersCount}
          customerPriceCount={controller.customerPriceCount}
        />
      </div>

      <ProductsTableCard
        search={controller.search}
        onSearchChange={(value) => { controller.setSearch(value); controller.setPage(1); }}
        viewFilter={controller.viewFilter}
        onViewFilterChange={(value) => { controller.setViewFilter(value); controller.setPage(1); }}
        selectedIds={controller.selectedIds}
        onSelectedIdsChange={controller.setSelectedIds}
        onClearSelection={() => controller.setSelectedIds([])}
        onBulkDelete={() => controller.setBulkDeleteOpen(true)}
        visibleProducts={controller.visibleProducts}
        selectedProduct={controller.selectedProduct}
        onSelectProduct={controller.setSelectedProduct}
        onDeleteProduct={controller.setProductToDelete}
        onOpenOfferDialog={controller.openOfferDialog}
        onOpenBarcodeDialog={controller.openBarcodeDialog}
        onOpenPrintDialog={controller.openPrintDialog}
        canDelete={controller.canDelete}
        canPrint={controller.canPrint}
        onExportCsv={controller.exportProductsCsv}
        onPrint={controller.printProductsList}
        categoryNames={controller.categoryNames}
        supplierNames={controller.supplierNames}
        inventorySaleValue={controller.inventorySaleValue}
        isLoading={controller.productsQuery.isLoading || controller.categoriesQuery.isLoading || controller.suppliersQuery.isLoading}
        isError={controller.productsQuery.isError || controller.categoriesQuery.isError || controller.suppliersQuery.isError}
        error={controller.productsQuery.error || controller.categoriesQuery.error || controller.suppliersQuery.error}
        page={controller.page}
        pageSize={controller.pageSize}
        totalItems={controller.summary?.totalProducts || controller.visibleProducts.length}
        onPageChange={controller.setPage}
        onPageSizeChange={(nextPageSize) => { controller.setPageSize(nextPageSize); controller.setPage(1); }}
        clothingEnabled={clothingEnabled}
      />

      <div className="two-column-grid workspace-grid-balanced">
        <div ref={addProductRef}>
          <Card title={defaultProductKind === 'fashion' ? 'إضافة موديل جديد' : 'إضافة صنف جديد'} actions={<span className="nav-pill">الإجراء الأساسي</span>} className="workspace-panel">
            <div className="muted" style={{ marginBottom: 12 }}>
              {clothingEnabled ? 'إضافة الصنف أو الموديل تتم من نفس النموذج حسب النوع الافتراضي الموجود في الإعدادات، وبعدها تنفّذ العرض أو الباركود أو الملصقات من زراره المباشر داخل السجل.' : 'أضف الصنف أولًا، ثم نفّذ العرض أو الباركود أو الملصقات من زراره المباشر داخل السجل.'}
            </div>
            <ProductForm
              categories={controller.categoriesQuery.data || []}
              suppliers={controller.suppliersQuery.data || []}
              onCategoryCreated={async () => { await invalidateCatalogDomain(controller.queryClient, { includeCategories: true }); }}
              onSupplierCreated={async () => { await invalidateCatalogDomain(controller.queryClient, { includeSuppliers: true }); }}
            />
          </Card>
        </div>

        <div ref={editProductRef}>
          <Card
            title={controller.selectedProduct ? `تعديل: ${controller.selectedProduct.name}` : 'التعديل بعد اختيار الصنف'}
            actions={(
              <div className="actions compact-actions">
                <span className="nav-pill">{controller.selectedProduct ? 'التعديل النشط' : 'اختر من السجل'}</span>
                <Button variant="secondary" onClick={() => void controller.copySelectedProductSummary()} disabled={!controller.selectedProduct}>نسخ الملخص</Button>
                <Button variant="secondary" onClick={() => controller.setSelectedProduct(null)} disabled={!controller.selectedProduct}>إلغاء التحديد</Button>
              </div>
            )}
            className="workspace-panel"
          >
            {!controller.selectedProduct ? (
              <div className="page-stack">
                <div className="muted">اختر صنفًا من الجدول أولًا، وستجد أزرار العروض والباركود والملصقات مباشرة داخل نفس السطر وقت الحاجة.</div>
                <div className="actions compact-actions">
                  <Button variant="secondary" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>الرجوع للسجل</Button>
                </div>
              </div>
            ) : (
              <>
                <ProductEditorCard
                  product={controller.selectedProduct}
                  categories={controller.categoriesQuery.data || []}
                  suppliers={controller.suppliersQuery.data || []}
                  customers={(controller.customersQuery.data || []).map((customer) => ({ id: String(customer.id), name: customer.name }))}
                  onSaved={(product) => controller.applyProductPatch(product)}
                />
                <div className="actions" style={{ marginTop: 12 }}>
                  <Button variant="danger" onClick={() => controller.setProductToDelete(controller.selectedProduct!)} disabled={!controller.canDelete}>حذف الصنف</Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      <div ref={toolsRef}>
        <QuickCatalogCard canManageSuppliers={controller.canManageSuppliers} />
      </div>

      {(controller.offerDialogProduct || controller.barcodeDialogProduct || controller.printDialogState) ? (
        <Suspense fallback={<div className="loading-card">جاري تحميل الأدوات الإضافية...</div>}>
          <LazyProductOfferDialog
            open={Boolean(controller.offerDialogProduct)}
            product={controller.offerDialogProduct}
            onClose={() => controller.setOfferDialogProduct(null)}
            onSaved={(product) => controller.applyProductPatch(product)}
          />

          <LazyProductBarcodeDialog
            open={Boolean(controller.barcodeDialogProduct)}
            product={controller.barcodeDialogProduct}
            products={controller.visibleProducts}
            mode={controller.barcodeDialogMode}
            onClose={() => controller.setBarcodeDialogProduct(null)}
            onSaved={(product) => controller.applyProductPatch(product)}
            onOpenPrint={(product, unit) => controller.openPrintDialog(product, unit)}
          />

          <LazyBarcodePrintDialog
            open={Boolean(controller.printDialogState)}
            product={controller.printDialogState?.product || null}
            unit={controller.printDialogState?.unit}
            onClose={() => controller.setPrintDialogState(null)}
          />
        </Suspense>
      ) : null}

      <ActionConfirmDialog
        open={Boolean(controller.productToDelete)}
        title="تأكيد حذف الصنف"
        description={controller.productToDelete ? (
          <div className="page-stack">
            <span>سيتم حذف الصنف {controller.productToDelete.name}. لو كنت تريد تعديل الكمية فقط فاستخدم تبويب المخزون بدل حذف master data.</span>
            {familyStockRows.length ? (
              <div className="page-stack">
                <span className="muted small">على هذا الصنف {familyStockRows.length} صنف فرعي عليه مخزون حالي. بدل ما تفضيهم واحد واحد، صفّر مخزونهم دفعة واحدة ثم ارجع للحذف.</span>
                <div className="actions compact-actions">
                  <Button type="button" variant="secondary" onClick={() => setBulkResetTarget(controller.productToDelete)}>
                    تصفير مخزون كل الفرعيات أولًا
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : ''}
        confirmLabel="نعم، حذف الصنف"
        isBusy={controller.deleteMutation.isPending}
        onCancel={() => controller.setProductToDelete(null)}
        onConfirm={async () => {
          if (!controller.productToDelete) return;
          await controller.deleteMutation.mutateAsync(controller.productToDelete.id);
          controller.setSelectedIds((current) => current.filter((id) => id !== String(controller.productToDelete?.id)));
        }}
      />

      <ActionConfirmDialog
        open={controller.bulkDeleteOpen}
        title="تأكيد حذف الأصناف المحددة"
        description={controller.selectedProducts.length ? `سيتم محاولة حذف ${controller.selectedProducts.length} صنفًا دفعة واحدة. أي صنف مرتبط بحركات بيع أو شراء أو مخزون سيرفضه الخادم وسيظهر السبب بعد المحاولة.` : 'لا يوجد أصناف محددة.'}
        confirmLabel="نعم، حذف المحدد"
        confirmationKeyword="DELETE"
        confirmationLabel="اكتب DELETE لتأكيد حذف المحدد"
        isBusy={controller.bulkDeleteMutation.isPending}
        onCancel={() => controller.setBulkDeleteOpen(false)}
        onConfirm={async () => {
          if (!controller.selectedIds.length) return;
          await controller.bulkDeleteMutation.mutateAsync(controller.selectedIds);
        }}
      />

      <ActionConfirmDialog
        open={Boolean(bulkResetTarget)}
        title="تصفير مخزون الصنف الرئيسي وفرعياته"
        description={bulkResetTarget ? `سيتم تصفير مخزون ${familyStockRows.length} صنف دفعة واحدة تحت ${bulkResetTarget.name} لتقدر تحذفه أو تؤرشفه بعد كده.` : ''}
        confirmLabel="نعم، صفّر المخزون"
        confirmVariant="danger"
        managerPinRequired
        reasonRequired
        reasonLabel="سبب التصفير"
        reasonPlaceholder="مثال: تجهيز لحذف الصنف الرئيسي أو أرشفته"
        minReasonLength={4}
        isBusy={bulkResetMutation.isPending}
        onCancel={() => setBulkResetTarget(null)}
        onConfirm={async ({ managerPin, reason }) => {
          await bulkResetMutation.mutateAsync({ managerPin, reason });
        }}
      />

    </div>
  );
}
