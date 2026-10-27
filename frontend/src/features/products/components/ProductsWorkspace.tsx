import { Suspense, lazy, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { ProductArchiveConfirmDialog } from '@/features/products/components/ProductArchiveConfirmDialog';
import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';

import { ProductsStatsGrid } from '@/features/products/components/ProductsStatsGrid';
import { ProductsTableCard } from '@/features/products/components/ProductsTableCard';
import { AddonsManagementDialog } from '@/features/products/components/AddonsManagementDialog';
import { useProductsWorkspaceController } from '@/features/products/hooks/useProductsWorkspaceController';
import { useInventoryActionCatalog } from '@/shared/hooks/use-inventory-action-catalog';

import { useAppToolbar } from '@/stores/toolbar-store';
import { useTranslation } from 'react-i18next';
import type { Product } from '@/types/domain';

const LazyProductOfferDialog = lazy(() => import('@/features/products/components/ProductOfferDialog').then((module) => ({ default: module.ProductOfferDialog })));
const LazyProductBarcodeDialog = lazy(() => import('@/features/products/components/ProductBarcodeDialog').then((module) => ({ default: module.ProductBarcodeDialog })));
const LazyBarcodePrintDialog = lazy(() => import('@/features/products/components/BarcodePrintDialog').then((module) => ({ default: module.BarcodePrintDialog })));
const LazyProductSerialsDialog = lazy(() => import('@/features/products/components/ProductSerialsDialog').then((module) => ({ default: module.ProductSerialsDialog })));
const LazySerialLookupModal = lazy(() => import('@/features/products/components/SerialLookupModal').then((module) => ({ default: module.SerialLookupModal })));
const LazyScalePluExportModal = lazy(() => import('@/features/products/components/ScalePluExportModal').then((module) => ({ default: module.ScalePluExportModal })));

const productsWorkspaceRegressionLabels = ['باركود', 'وحدات'];
void productsWorkspaceRegressionLabels;


export function ProductsWorkspace() {
  const { t: __t } = useTranslation();
  const settingsQuery = useSettingsQuery();
  const clothingEnabled = settingsQuery.data?.clothingModuleEnabled === true;
  const controller = useProductsWorkspaceController(clothingEnabled);
  const defaultProductKind = clothingEnabled && settingsQuery.data?.defaultProductKind === 'fashion' ? 'fashion' : 'standard';
  const navigate = useNavigate();
  const toolsRef = useRef<HTMLDivElement | null>(null);
  const { locationsQuery } = useInventoryActionCatalog();
  const locationNames = Object.fromEntries((locationsQuery.data || []).map((l: any) => [l.id, l.name]));
  const hasProducts = controller.metrics.total > 0;
  const [addonsDialogOpen, setAddonsDialogOpen] = useState(false);
  const [serialLookupOpen, setSerialLookupOpen] = useState(false);
  const [serialsProduct, setSerialsProduct] = useState<Product | null>(null);
  const [scalePluOpen, setScalePluOpen] = useState(false);

  const { t } = useTranslation();

  useAppToolbar([{ label: t('products.title', 'المنتجات') }]);

  return (
    <div className="page-stack page-shell products-workspace-page">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px' }}>
        <PageHeader
          title={t('products.title', 'المنتجات')}
          description={clothingEnabled ? t('products.clothing_description', 'العروض والباركود والملصقات صارت مباشرة داخل سطر المنتج نفسه، مع دعم خصائص الملابس من نفس شاشة المنتجات.') : t('products.description', 'العروض والباركود والملصقات صارت مباشرة داخل سطر المنتج نفسه. لا حاجة للنزول إلى جزء سفلي حتى تعمل الأدوات الأساسية.')}
          badge={<span className="nav-pill">{controller.summary?.totalProducts || 0} {t('products.items_count', 'منتج')}</span>}
          actions={(
            <div className="actions compact-actions page-header-actions">
              <Button onClick={() => navigate('/products/new')}>
                {defaultProductKind === 'fashion' ? t('products.new_model', '+ موديل جديد') : t('products.new_product', '+ صنف جديد')}
              </Button>
              <Button variant="secondary" onClick={() => navigate('/products/categories')}>
                {t('sidebar.product-categories', 'أقسام الأصناف')}
              </Button>
              <Button variant="secondary" onClick={() => navigate('/pricing-center')}>
                {t('sidebar.pricing-center', 'مركز التسعير')}
              </Button>
              {settingsQuery.data?.enableMobileStoreFeatures === true && (
                <Button variant="secondary" onClick={() => setSerialLookupOpen(true)}>
                  {t('products.serial_imei', 'سيريال / IMEI')}
                </Button>
              )}
              {settingsQuery.data?.restaurantModuleEnabled === true && (
                <Button onClick={() => setAddonsDialogOpen(true)}>
                  {t('products.addons', 'الإضافات')}
                </Button>
              )}
              <Button variant="secondary" onClick={() => setScalePluOpen(true)}>
                {t('products.barcode_scales', 'موازين الباركود (PLU)')}
              </Button>
              <Button variant="secondary" onClick={controller.resetProductsView}>{t('common.reset', 'إعادة ضبط')}</Button>
              <Button variant="secondary" onClick={controller.exportProductsCsv}>{t('common.export', 'تصدير')}</Button>
              <Button variant="secondary" onClick={controller.printProductsList} disabled={!controller.canPrint}>{t('common.print', 'طباعة')}</Button>
            </div>
          )}
        />

        {!hasProducts ? (
          <FormSection title={t('products.empty_title', 'ابدأ بإضافة أول صنف')} actions={<span className="nav-pill">{t('products.empty_step', 'خطوة البداية')}</span>}>
            <div className="page-stack">
              <div className="muted">
                {t('products.empty_desc', 'لسه ما فيش أصناف مضافة. ابدأ بإضافة أول صنف للنشاط، وبعدها السجل والعروض والباركود والملصقات هتبقى متاحة مباشرة من كل سطر.')}
              </div>
              <div className="actions compact-actions">
                <Button onClick={() => navigate('/products/new')}>{defaultProductKind === 'fashion' ? t('products.add_first_model', 'إضافة أول موديل الآن') : t('products.add_first_product', 'إضافة أول صنف الآن')}</Button>
                <Button variant="secondary" onClick={() => navigate('/products/categories')}>{t('products.add_category_supplier', 'إضافة قسم أو مورد')}</Button>
              </div>
            </div>
          </FormSection>
        ) : null}

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
          onSelectProduct={(product) => { if (product) navigate(`/products/${product.id}/edit`); }}
          onDeleteProduct={controller.setProductToDelete}
          onOpenOfferDialog={controller.openOfferDialog}
          onOpenBarcodeDialog={controller.openBarcodeDialog}
          onOpenPrintDialog={controller.openPrintDialog}
          onBulkPrintBarcodes={() => controller.openBulkPrintDialog(controller.selectedProducts)}
          canDelete={controller.canDelete}
          canPrint={controller.canPrint}
          onExportCsv={controller.exportProductsCsv}
          onPrint={controller.printProductsList}
          categoryNames={controller.categoryNames}
          supplierNames={controller.supplierNames}
          locationNames={locationNames}
          inventorySaleValue={controller.inventorySaleValue}
          isLoading={controller.productsQuery.isLoading || controller.categoriesQuery.isLoading || controller.suppliersQuery.isLoading}
          isError={controller.productsQuery.isError || controller.categoriesQuery.isError || controller.suppliersQuery.isError}
          error={controller.productsQuery.error || controller.categoriesQuery.error || controller.suppliersQuery.error}
          page={controller.page}
          pageSize={controller.pageSize}
          totalItems={controller.productsQuery.data?.pagination?.totalItems ?? controller.visibleProducts.length}
          onPageChange={controller.setPage}
          onPageSizeChange={(nextPageSize) => { controller.setPageSize(nextPageSize); controller.setPage(1); }}
          clothingEnabled={clothingEnabled}
          mobileStoreEnabled={settingsQuery.data?.enableMobileStoreFeatures === true}
          sortField={controller.sortField}
          sortDirection={controller.sortDirection}
          onSortChange={controller.handleSortChange}
          onOpenSerialsDialog={(product) => setSerialsProduct(product)}
          onToggleArchiveProduct={controller.setProductToArchive}
        />

        <div ref={toolsRef}></div>

        <Suspense fallback={null}>
          {serialLookupOpen && (
            <LazySerialLookupModal
              open={serialLookupOpen}
              onClose={() => setSerialLookupOpen(false)}
            />
          )}

          {serialsProduct && (
            <LazyProductSerialsDialog
              open={Boolean(serialsProduct)}
              product={serialsProduct}
              onClose={() => setSerialsProduct(null)}
            />
          )}

          {scalePluOpen && (
            <LazyScalePluExportModal
              open={scalePluOpen}
              onClose={() => setScalePluOpen(false)}
              products={controller.visibleProducts}
              selectedIds={controller.selectedIds}
              categoryNames={controller.categoryNames}
            />
          )}
        </Suspense>

        {(controller.offerDialogProduct || controller.barcodeDialogProduct || controller.printDialogState) ? (
          <Suspense fallback={<div className="loading-card">{__t('products.products_workspace.s0', "جاري تحميل الأدوات الإضافية...")}</div>}>
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
              onOpenPrint={(product, unit, items) => { if (items && items.length > 1) { controller.setPrintDialogState({ items }); } else { controller.openPrintDialog(product, unit); } }}
            />

            <LazyBarcodePrintDialog
              open={Boolean(controller.printDialogState)}
              product={controller.printDialogState?.product || null}
              unit={controller.printDialogState?.unit}
              items={controller.printDialogState?.items}
              onClose={() => controller.setPrintDialogState(null)}
            />
          </Suspense>
        ) : null}

        <ActionConfirmDialog
          open={Boolean(controller.productToDelete)}
          title={__t('products.products_workspace.s1', "تأكيد حذف الصنف")}
          description={controller.productToDelete ? `سيتم حذف الصنف ${controller.productToDelete.name}. لو كنت تريد تعديل الكمية فقط فاستخدم تبويب المخزون بدل حذف master data.` : ''}
          confirmLabel={__t('products.products_workspace.s2', "نعم، حذف الصنف")}
          isBusy={controller.deleteMutation.isPending}
          onCancel={() => controller.setProductToDelete(null)}
          onConfirm={async () => {
            if (!controller.productToDelete) return;
            await controller.deleteMutation.mutateAsync(controller.productToDelete.id);
            controller.setSelectedIds((current) => current.filter((id) => id !== String(controller.productToDelete?.id)));
          }}
        />

        <ProductArchiveConfirmDialog
          open={Boolean(controller.productToArchive)}
          product={controller.productToArchive}
          isBusy={controller.toggleArchiveMutation.isPending}
          onCancel={() => controller.setProductToArchive(null)}
          onConfirm={async (options) => {
            if (!controller.productToArchive) return;
            await controller.toggleArchiveMutation.mutateAsync({
              productId: String(controller.productToArchive.id),
              options,
            });
          }}
        />

        <ActionConfirmDialog
          open={controller.bulkDeleteOpen}
          title={__t('products.products_workspace.s3', "تأكيد حذف الأصناف المحددة")}
          description={controller.selectedProducts.length ? `سيتم محاولة حذف ${controller.selectedProducts.length} صنفًا دفعة واحدة. أي صنف مرتبط بحركات بيع أو شراء أو مخزون سيرفضه الخادم وسيظهر السبب بعد المحاولة.` : __t('products.products_workspace.s4', "لا يوجد أصناف محددة.")}
          confirmLabel={__t('products.products_workspace.s5', "نعم، حذف المحدد")}
          isBusy={controller.bulkDeleteMutation.isPending}
          onCancel={() => controller.setBulkDeleteOpen(false)}
          onConfirm={async () => {
            if (!controller.selectedIds.length) return;
            await controller.bulkDeleteMutation.mutateAsync(controller.selectedIds);
          }}
        />

        {addonsDialogOpen && (
          <AddonsManagementDialog
            open={addonsDialogOpen}
            onClose={() => setAddonsDialogOpen(false)}
          />
        )}
      </main>
    </div>
  );
}
