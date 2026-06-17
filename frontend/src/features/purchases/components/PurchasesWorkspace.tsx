import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/components/page-header';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { PurchaseDetailCard } from '@/features/purchases/components/PurchaseDetailCard';
import { PurchaseEditDialog } from '@/features/purchases/components/PurchaseEditDialog';
import { QuickSupplierCard } from '@/features/purchases/components/QuickSupplierCard';
import { PurchasesKpiSection, TopSuppliersCard } from '@/features/purchases/components/purchases-workspace/PurchasesOverviewSection';
import { PurchasesRegisterCard } from '@/features/purchases/components/purchases-workspace/PurchasesRegisterCard';
import { PurchaseRepricingDialog } from '@/features/purchases/components/PurchaseRepricingDialog';
import { usePurchasesWorkspaceController } from '@/features/purchases/components/purchases-workspace/usePurchasesWorkspaceController';
import { printPurchaseDocument } from '@/features/purchases/lib/purchases-workspace.helpers';
import { useNavigate } from 'react-router-dom';

export function PurchasesWorkspace() {
  const navigate = useNavigate();
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
        <div className="page-stack">
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-xl)', minHeight: '300px', textAlign: 'center' }}>
            <div style={{ backgroundColor: 'var(--blue-50)', color: 'var(--blue-600)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--spacing-md)' }}>
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                <path d="M14 3v5h5M12 18v-6M9 15h6" />
              </svg>
            </div>
            <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>إصدار فاتورة شراء جديدة</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
              قم بإنشاء فاتورة شراء جديدة مفصلة مع خيارات الدفع والخصم والمزيد من التفاصيل.
            </p>
            <Button variant="primary" onClick={() => navigate('/purchases/new')}>
              إنشاء فاتورة شراء
            </Button>
          </div>
        </div>

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

      <PurchaseRepricingDialog open={Boolean(controller.repricingInsights)} insights={controller.repricingInsights} onClose={() => controller.setRepricingInsights(null)} />

      <ActionConfirmDialog open={Boolean(controller.purchaseToCancel)} title="تأكيد إلغاء فاتورة الشراء" description={controller.cancelDescription} confirmLabel="نعم، إلغاء الفاتورة" confirmationKeyword="إلغاء" confirmationLabel="اكتب كلمة إلغاء للتأكيد" confirmationHint="استخدم هذا الإجراء فقط بعد التحقق من عدم وجود حركة لاحقة تعتمد على الفاتورة." managerPinRequired managerPinHint="هذه العملية تحتاج اعتماد المدير المسجل في الإعدادات." reasonRequired reasonLabel="سبب إلغاء فاتورة الشراء" reasonHint="اكتب سببًا واضحًا حتى يبقى محفوظًا في السجل ويرجع له المدير لاحقًا." reasonPlaceholder="مثال: تم إدخال الفاتورة مرتين أو إلغاء الاستلام" isBusy={controller.cancelMutation.isPending} onCancel={() => controller.setPurchaseToCancel(null)} onConfirm={async ({ managerPin, reason }) => {
        if (!controller.purchaseToCancel) return;
        await controller.cancelMutation.mutateAsync({ purchaseId: controller.purchaseToCancel.id, reason, managerPin });
        controller.setSelectedPurchaseId(controller.purchaseToCancel.id);
        controller.setPurchaseToCancel(null);
      }} />
    </div>
  );
}
