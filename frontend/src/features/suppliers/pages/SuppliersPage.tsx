import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/components/page-header';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { StatsGrid } from '@/shared/components/stats-grid';
import { formatCurrency } from '@/lib/format';
import { SupplierForm } from '@/features/suppliers/components/SupplierForm';
import { SupplierEditorCard } from '@/features/suppliers/components/SupplierEditorCard';
import { SuppliersRegisterCard } from '@/features/suppliers/pages/suppliers-page/SuppliersRegisterCard';
import { useSuppliersPageController } from '@/features/suppliers/pages/suppliers-page/useSuppliersPageController';

export function SuppliersPage() {
  const controller = useSuppliersPageController();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const stats = [
    { key: 'suppliers', label: 'عدد الموردين', value: controller.summary?.totalSuppliers || 0 },
    { key: 'balance', label: 'إجمالي الأرصدة', value: formatCurrency(controller.totalBalance) },
    { key: 'notes', label: 'عليهم ملاحظات', value: controller.withNotes },
    { key: 'matched', label: 'مطابقون للبحث', value: controller.summary?.totalSuppliers || 0 },
  ] as const;

  return (
    <div className="page-stack page-shell suppliers-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '32px' }}>
        <PageHeader
          title="الموردون"
          description="إدارة سجل الموردين، كشوف الحسابات والأرصدة مع إمكانية البحث والإضافة السريعة."
          badge={<span className="nav-pill">{controller.summary?.totalSuppliers || 0} مورد</span>}
          actions={
            <div className="actions compact-actions">
              <Button variant="primary" onClick={() => setIsCreateOpen(true)}>+ مورد جديد</Button>
              <Button variant="secondary" onClick={controller.resetSuppliersView}>إعادة ضبط</Button>
              <Button variant="secondary" onClick={controller.exportSuppliersCsv} disabled={!controller.summary?.totalSuppliers}>تصدير</Button>
              <Button variant="secondary" onClick={() => void controller.copySuppliersSummary()} disabled={!controller.summary?.totalSuppliers}>نسخ</Button>
              <Button variant="secondary" onClick={controller.printSuppliersRegister} disabled={!controller.summary?.totalSuppliers || !controller.canPrint}>طباعة</Button>
            </div>
          }
        />
        <StatsGrid items={stats} />

        <SuppliersRegisterCard {...controller} onOpenCreate={() => setIsCreateOpen(true)} />

        {/* Modal for Creating Supplier */}
        <StandardDialog
          open={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="إضافة مورد جديد"
          subtitle="تسجيل بيانات المورد وتفاصيل الحساب والرصيد الافتتاحي في النظام"
          width="min(680px, 95vw)"
          minHeight="auto"
        >
          <div dir="rtl">
            <SupplierForm onSuccess={() => setIsCreateOpen(false)} />
          </div>
        </StandardDialog>

        {/* Modal for Editing Supplier */}
        <StandardDialog
          open={Boolean(controller.selectedSupplier)}
          onClose={() => controller.setSelectedSupplier(null)}
          title={controller.selectedSupplier ? `تعديل: ${controller.selectedSupplier.name}` : ''}
          subtitle="تحديث بيانات المورد أو ضبط الرصيد الافتتاحي والملاحظات"
          width="min(680px, 95vw)"
          minHeight="auto"
        >
          <div dir="rtl">
            {controller.selectedSupplier && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                <Button
                  variant="danger"
                  onClick={() => controller.setSupplierToDelete(controller.selectedSupplier)}
                  disabled={!controller.canDelete}
                  style={{
                    fontSize: '0.8rem',
                    padding: '4px 12px',
                    fontWeight: 700,
                  }}
                >
                  حذف المورد
                </Button>
              </div>
            )}
            <SupplierEditorCard
              supplier={controller.selectedSupplier || undefined}
              onSaved={() => controller.setSelectedSupplier(null)}
            />
          </div>
        </StandardDialog>

        <ActionConfirmDialog
          open={Boolean(controller.supplierToDelete)}
          title="تأكيد حذف المورد"
          description={controller.supplierToDelete ? `سيتم حذف المورد ${controller.supplierToDelete.name}. إذا كان المورد مستخدمًا داخل أصناف فعالة فسيمنع الخادم الحذف، وسيظهر السبب مباشرة.` : ''}
          confirmLabel="نعم، حذف المورد"
          isBusy={controller.deleteMutation.isPending}
          onCancel={() => controller.setSupplierToDelete(null)}
          onConfirm={async () => {
            if (!controller.supplierToDelete) return;
            await controller.deleteMutation.mutateAsync(controller.supplierToDelete.id);
            controller.setSelectedIds((current: string[]) => current.filter((id) => id !== String(controller.supplierToDelete?.id)));
            if (controller.selectedSupplier?.id === controller.supplierToDelete.id) {
              controller.setSelectedSupplier(null);
            }
          }}
        />

        <ActionConfirmDialog
          open={controller.bulkDeleteOpen}
          title="تأكيد حذف الموردين المحددين"
          description={controller.selectedSuppliers.length ? `سيتم محاولة حذف ${controller.selectedSuppliers.length} موردًا دفعة واحدة. أي مورد مستخدم داخل أصناف أو حركات قائمة سيرفضه الخادم وسيظهر السبب بعد المحاولة.` : 'لا يوجد موردون محددون.'}
          confirmLabel="نعم، حذف المحدد"
          isBusy={controller.bulkDeleteMutation.isPending}
          onCancel={() => controller.setBulkDeleteOpen(false)}
          onConfirm={async () => {
            if (!controller.selectedIds.length) return;
            await controller.bulkDeleteMutation.mutateAsync(controller.selectedIds);
          }}
        />
      </main>
    </div>
  );
}
