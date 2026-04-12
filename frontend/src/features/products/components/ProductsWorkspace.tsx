import { useRef } from 'react';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { PageHeader } from '@/shared/components/page-header';
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
  const addProductRef = useRef<HTMLDivElement | null>(null);
  const editProductRef = useRef<HTMLDivElement | null>(null);
  const secondaryToolsRef = useRef<HTMLDivElement | null>(null);
  const hasProducts = controller.metrics.total > 0;

  return (
    <div className="page-stack page-shell products-workspace-page">
      <PageHeader
        title="الأصناف"
        description="ابدأ من السجل والبحث لو عندك أصناف، أو أضف أول صنف لو الصفحة لسه فاضية. الأدوات الثانوية زي الباركود والعروض موجودة أسفل الصفحة حتى ما تزحمش الشغل اليومي."
        badge={<span className="nav-pill">{controller.summary?.totalProducts || 0} صنف</span>}
        actions={(
          <div className="actions compact-actions page-header-actions">
            <Button
              onClick={() => {
                controller.setSelectedProduct(null);
                addProductRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              إضافة صنف جديد
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (controller.selectedProduct) {
                  editProductRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  return;
                }
                addProductRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              {controller.selectedProduct ? 'الانتقال للتعديل' : 'الانتقال للإضافة'}
            </Button>
            <Button variant="secondary" onClick={controller.resetProductsView}>إعادة الضبط</Button>
            <Button variant="secondary" onClick={controller.exportProductsCsv}>تصدير CSV</Button>
            <Button variant="secondary" onClick={controller.printProductsList} disabled={!controller.canPrint}>طباعة</Button>
          </div>
        )}
      />

      {!hasProducts ? (
        <Card
          title="ابدأ بإضافة أول صنف"
          actions={<span className="nav-pill">خطوة البداية</span>}
          className="workspace-panel"
        >
          <div className="page-stack">
            <div className="muted">
              لسه ما فيش أصناف مضافة. ابدأ بإضافة أول صنف للمحل، وبعدها السجل والبحث والباركود والعروض هتبقى أكثر فاعلية.
            </div>
            <div className="actions compact-actions">
              <Button
                onClick={() => addProductRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                إضافة أول صنف الآن
              </Button>
              <Button
                variant="secondary"
                onClick={() => secondaryToolsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                عرض الأدوات الثانوية
              </Button>
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
        <div ref={addProductRef}>
          <Card title="إضافة صنف جديد" actions={<span className="nav-pill">الإجراء الأساسي</span>} className="workspace-panel">
            <div className="muted" style={{ marginBottom: 12 }}>
              استخدم هذه البطاقة لإضافة الصنف الجديد. بعد الحفظ سيظهر فورًا في السجل ويمكنك بعدها تعديل الباركود أو العروض عند الحاجة فقط.
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
                <div className="muted">اختر صنفًا من الجدول أولًا، وبعدها هتفتح هنا بطاقة التعديل والحذف بدل ما الزرار يزاحم واجهة البحث.</div>
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
                  onSaved={(product) => controller.setSelectedProduct(product)}
                />
                <div className="actions" style={{ marginTop: 12 }}>
                  <Button variant="danger" onClick={() => controller.setProductToDelete(controller.selectedProduct!)} disabled={!controller.canDelete}>حذف الصنف</Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      <div ref={secondaryToolsRef} className="page-stack" style={{ gap: 12 }}>
        <details open={!hasProducts} style={{ border: '1px solid rgba(148, 163, 184, 0.18)', borderRadius: 18, background: 'rgba(255,255,255,0.96)', padding: 14, boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, listStyle: 'none' }}>إضافات سريعة للقسم والمورد</summary>
          <div style={{ marginTop: 12 }}>
            <QuickCatalogCard canManageSuppliers={controller.canManageSuppliers} />
          </div>
        </details>

        <details style={{ border: '1px solid rgba(148, 163, 184, 0.18)', borderRadius: 18, background: 'rgba(255,255,255,0.96)', padding: 14, boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, listStyle: 'none' }}>الباركود والعروض والأدوات الثانوية</summary>
          <div className="page-stack" style={{ marginTop: 12 }}>
            <div className="two-column-grid workspace-grid-balanced">
              <BarcodeToolsCard products={controller.visibleProducts} product={controller.selectedProduct || undefined} onUpdated={(product) => controller.setSelectedProduct(product)} />
              <Card title="متى أستخدم الأدوات الثانوية؟" actions={<span className="nav-pill">اختياري</span>} className="workspace-panel">
                <div className="page-stack">
                  <div className="muted">خلي الشغل اليومي دائمًا يبدأ من السجل أو إضافة الصنف. استخدم الباركود أو العروض فقط بعد ما الصنف يبقى محفوظ أو لما يكون عندك احتياج فعلي للتسعير أو الملصقات.</div>
                  <div className="list-stack">
                    <div className="list-row stacked-row"><strong>الباركود</strong><div className="muted small">للتوليد والطباعة بعد حفظ الصنف.</div></div>
                    <div className="list-row stacked-row"><strong>العروض والخصومات</strong><div className="muted small">للأصناف التي عليها خصومات موسمية أو حملة بيع.</div></div>
                    <div className="list-row stacked-row"><strong>الأسعار الخاصة</strong><div className="muted small">للعملاء المميزين أو التسعير الخاص، بعد استقرار بيانات الصنف الأساسية.</div></div>
                  </div>
                </div>
              </Card>
            </div>
            <ProductOffersCard products={controller.visibleProducts} product={controller.selectedProduct || undefined} onUpdated={(product) => controller.setSelectedProduct(product)} />
          </div>
        </details>
      </div>

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
