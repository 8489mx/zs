import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/components/page-header';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { PurchaseComposer } from '@/features/purchases/components/PurchaseComposer';
import { PurchaseDetailCard } from '@/features/purchases/components/PurchaseDetailCard';
import { PurchaseEditDialog } from '@/features/purchases/components/PurchaseEditDialog';
import { QuickSupplierCard } from '@/features/purchases/components/QuickSupplierCard';
import { PurchasesKpiSection, TopSuppliersCard } from '@/features/purchases/components/purchases-workspace/PurchasesOverviewSection';
import { PurchasesRegisterCard } from '@/features/purchases/components/purchases-workspace/PurchasesRegisterCard';
import { usePurchasesWorkspaceController } from '@/features/purchases/components/purchases-workspace/usePurchasesWorkspaceController';
import { printPurchaseDocument } from '@/features/purchases/lib/purchases-workspace.helpers';

export function PurchasesWorkspace() {
  const controller = usePurchasesWorkspaceController();
  const selectedPurchase = controller.selectedPurchase;
  const canEditSelectedPurchase = Boolean(controller.canEditInvoices && selectedPurchase && selectedPurchase.status !== 'cancelled');

  return (
    <div className="page-stack page-shell purchases-workspace">
      <PageHeader
        title="المشتريات"
        description="ابدأ بإنشاء فاتورة الشراء مباشرة، ثم راجع السجل والتفاصيل من نفس الصفحة."
        badge={<span className="nav-pill">{controller.totalItems} فاتورة</span>}
        actions={<div className="actions compact-actions"><Button variant="secondary" onClick={controller.resetPurchasesView}>إعادة الضبط</Button><Button variant="secondary" onClick={() => void controller.copyPurchasesSummary()} disabled={!controller.totalItems}>نسخ الملخص</Button><Button variant="secondary" onClick={() => void controller.exportPurchasesCsv()} disabled={!controller.totalItems}>تصدير CSV</Button><Button variant="secondary" onClick={() => void controller.printPurchasesRegister()} disabled={!controller.totalItems || !controller.canPrint}>طباعة السجل</Button></div>}
      />

      <PurchasesKpiSection totalItems={controller.totalItems} summary={controller.summary || null} />

      <div className="two-column-grid workspace-grid-balanced purchases-primary-grid">
        <PurchaseComposer
          products={controller.purchaseCatalog.productsQuery.data || []}
          suppliers={controller.purchaseCatalog.suppliersQuery.data || []}
          branches={controller.purchaseCatalog.branchesQuery.data || []}
          locations={controller.purchaseCatalog.locationsQuery.data || []}
          settings={controller.purchaseCatalog.settingsQuery.data}
          isCatalogLoading={controller.purchaseCatalog.isLoading}
          isCatalogError={controller.purchaseCatalog.isError}
          catalogError={controller.purchaseCatalog.error}
        />

        <div className="page-stack purchases-side-stack">
          <QuickSupplierCard canManageSuppliers={controller.canManageSuppliers} />
          <TopSuppliersCard
            topSuppliers={controller.topSuppliers}
            exportTopSuppliersCsv={controller.exportTopSuppliersCsv}
            printTopSuppliers={controller.printTopSuppliers}
          />
        </div>
      </div>

      <PurchasesRegisterCard {...controller} selectedPurchase={selectedPurchase} summary={controller.summary || null} />

      <PurchaseDetailCard
        purchase={selectedPurchase || undefined}
        onPrint={controller.canPrint && selectedPurchase ? () => printPurchaseDocument(selectedPurchase) : undefined}
        onEdit={canEditSelectedPurchase && selectedPurchase ? () => controller.setPurchaseToEdit(selectedPurchase) : undefined}
        onCancel={canEditSelectedPurchase && selectedPurchase ? () => controller.setPurchaseToCancel(selectedPurchase) : undefined}
      />

      <PurchaseEditDialog
        open={Boolean(controller.purchaseToEdit)}
        purchase={controller.purchaseToEdit || undefined}
        isBusy={controller.updateMutation.isPending}
        errorMessage={controller.updateMutation.isError ? (controller.updateMutation.error instanceof Error ? controller.updateMutation.error.message : 'تعذر حفظ التعديل') : ''}
        onCancel={() => { controller.setPurchaseToEdit(null); controller.updateMutation.reset(); }}
        onSave={async (payload) => {
          if (!controller.purchaseToEdit) return;
          await controller.updateMutation.mutateAsync({ purchase: controller.purchaseToEdit, payload });
          controller.setSelectedPurchaseId(controller.purchaseToEdit.id);
          controller.setPurchaseToEdit(null);
        }}
      />

      <ActionConfirmDialog open={Boolean(controller.purchaseToCancel)} title="تأكيد إلغاء فاتورة الشراء" description={controller.cancelDescription} confirmLabel="نعم، إلغاء الفاتورة" confirmationKeyword="إلغاء" confirmationLabel="اكتب كلمة إلغاء للتأكيد" confirmationHint="استخدم هذا الإجراء فقط بعد التحقق من عدم وجود حركة لاحقة تعتمد على الفاتورة." managerPinRequired managerPinHint="هذه العملية تحتاج اعتماد المدير المسجل في الإعدادات." reasonRequired reasonLabel="سبب إلغاء فاتورة الشراء" reasonHint="اكتب سببًا واضحًا حتى يبقى محفوظًا في السجل ويرجع له المدير لاحقًا." reasonPlaceholder="مثال: تم إدخال الفاتورة مرتين أو إلغاء الاستلام" isBusy={controller.cancelMutation.isPending} onCancel={() => controller.setPurchaseToCancel(null)} onConfirm={async ({ managerPin, reason }) => {
        if (!controller.purchaseToCancel) return;
        await controller.cancelMutation.mutateAsync({ purchaseId: controller.purchaseToCancel.id, reason, managerPin });
        controller.setSelectedPurchaseId(controller.purchaseToCancel.id);
        controller.setPurchaseToCancel(null);
      }} />
    </div>
  );
}
