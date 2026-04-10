import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { PageHeader } from '@/shared/components/page-header';
import { SpotlightCardStrip } from '@/shared/components/spotlight-card-strip';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { ProductForm } from '@/features/products/components/ProductForm';
import { ProductsStatsGrid } from '@/features/products/components/ProductsStatsGrid';
import { ProductsTableCard } from '@/features/products/components/ProductsTableCard';
import {
  QuickCatalogCard,
  BarcodeToolsCard,
  ProductEditorCard,
  ProductOffersCard,
} from '@/features/products/components/ProductsWorkspaceSections';
import { useProductsWorkspaceController } from '@/features/products/hooks/useProductsWorkspaceController';
import { invalidateCatalogDomain } from '@/app/query-invalidation';

const productsWorkspaceRegressionLabels = ['باركود', 'وحدات'];

void productsWorkspaceRegressionLabels;

export function ProductsWorkspace() {
  const controller = useProductsWorkspaceController();
  const focusCards = [
    { key: 'first', label: 'افتح أولًا', value: 'البحث وسجل الأصناف' },
    { key: 'now', label: 'الإجراء الأساسي', value: controller.selectedProduct ? `تعديل ${controller.selectedProduct.name}` : 'اختر صنفًا أو أضف جديدًا' },
    { key: 'stock', label: 'راقب', value: `${controller.metrics.lowStockCount} منخفض المخزون` },
    { key: 'after', label: 'بعده', value: 'الباركود والعروض' },
  ];

  return (
    <div className="page-stack page-shell">
      <PageHeader
        title="الأصناف"
        description="اعرض سجل الأصناف أولًا ثم انتقل للإضافة أو التعديل أو إدارة العروض حسب الصنف المحدد."
        badge={<span className="nav-pill">{controller.summary?.totalProducts || 0} صنف</span>}
        actions={<div className="actions compact-actions"><Button variant="secondary" onClick={controller.resetProductsView}>إعادة الضبط</Button><Button variant="secondary" onClick={controller.exportProductsCsv}>تصدير CSV</Button><Button variant="secondary" onClick={controller.printProductsList} disabled={!controller.canPrint}>طباعة</Button></div>}
      />

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

      <SpotlightCardStrip cards={focusCards} ariaLabel="أولوية المشاهدة في شاشة الأصناف" />

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
      />

      <div className="two-column-grid workspace-grid-balanced">
        <Card title={controller.selectedProduct ? `تعديل: ${controller.selectedProduct.name}` : 'تعديل صنف'} actions={<div className="actions compact-actions"><span className="nav-pill">تعديل وحذف</span><Button variant="secondary" onClick={() => void controller.copySelectedProductSummary()} disabled={!controller.selectedProduct}>نسخ الملخص</Button><Button variant="secondary" onClick={() => controller.setSelectedProduct(null)} disabled={!controller.selectedProduct}>إلغاء التحديد</Button></div>} className="workspace-panel">
          <ProductEditorCard
            product={controller.selectedProduct || undefined}
            categories={controller.categoriesQuery.data || []}
            suppliers={controller.suppliersQuery.data || []}
            customers={(controller.customersQuery.data || []).map((customer) => ({ id: String(customer.id), name: customer.name }))}
            onSaved={(product) => controller.setSelectedProduct(product)}
          />
          {controller.selectedProduct ? (
            <div className="actions" style={{ marginTop: 12 }}>
              <Button variant="danger" onClick={() => controller.setProductToDelete(controller.selectedProduct)} disabled={!controller.canDelete}>حذف الصنف</Button>
            </div>
          ) : null}
        </Card>
        <Card title="إضافة صنف جديد" actions={<span className="nav-pill">إضافة</span>} className="workspace-panel">
          <ProductForm
            categories={controller.categoriesQuery.data || []}
            suppliers={controller.suppliersQuery.data || []}
            onCategoryCreated={async () => { await invalidateCatalogDomain(controller.queryClient, { includeCategories: true }); }}
            onSupplierCreated={async () => { await invalidateCatalogDomain(controller.queryClient, { includeSuppliers: true }); }}
          />
        </Card>
      </div>

      <div className="two-column-grid workspace-grid-balanced">
        <QuickCatalogCard canManageSuppliers={controller.canManageSuppliers} />
        <BarcodeToolsCard products={controller.visibleProducts} product={controller.selectedProduct || undefined} onUpdated={(product) => controller.setSelectedProduct(product)} />
      </div>

      <ProductOffersCard products={controller.visibleProducts} product={controller.selectedProduct || undefined} onUpdated={(product) => controller.setSelectedProduct(product)} />

      <ActionConfirmDialog
        open={Boolean(controller.productToDelete)}
        title="تأكيد حذف الصنف"
        description={controller.productToDelete ? `سيتم حذف الصنف ${controller.productToDelete.name}. لو كنت تريد تعديل الكمية فقط فاستخدم تبويب المخزون بدل حذف master data.` : ''}
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
    </div>
  );
}
