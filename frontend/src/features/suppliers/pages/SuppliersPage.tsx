import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/components/page-header';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { DialogShell } from '@/shared/components/dialog-shell';
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
              <Button variant="primary" onClick={() => setIsCreateOpen(true)}>+ إضافة مورد جديد</Button>
              <Button variant="secondary" onClick={controller.resetSuppliersView}>إعادة الضبط</Button>
              <Button variant="secondary" onClick={controller.exportSuppliersCsv} disabled={!controller.summary?.totalSuppliers}>تصدير Excel</Button>
              <Button variant="secondary" onClick={() => void controller.copySuppliersSummary()} disabled={!controller.summary?.totalSuppliers}>نسخ الملخص</Button>
              <Button variant="secondary" onClick={controller.printSuppliersRegister} disabled={!controller.summary?.totalSuppliers || !controller.canPrint}>طباعة السجل</Button>
            </div>
          }
        />
        <StatsGrid items={stats} />

        <SuppliersRegisterCard {...controller} onOpenCreate={() => setIsCreateOpen(true)} />

        {/* Modal for Creating Supplier */}
        <DialogShell
          open={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          width="min(680px, 95vw)"
          ariaLabel="إضافة مورد جديد"
          showCloseButton={true}
        >
          <div className="dialog-card">
            <div className="mb-4 border-b pb-3">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">إضافة مورد جديد</h3>
              <p className="text-xs text-muted-foreground mt-1">تسجيل بيانات المورد وتفاصيل الحساب والرصيد الافتتاحي في النظام.</p>
            </div>
            <SupplierForm onSuccess={() => setIsCreateOpen(false)} />
          </div>
        </DialogShell>

        {/* Modal for Editing Supplier */}
        <DialogShell
          open={Boolean(controller.selectedSupplier)}
          onClose={() => controller.setSelectedSupplier(null)}
          width="min(680px, 95vw)"
          ariaLabel="تعديل المورد"
          showCloseButton={true}
        >
          <div className="dialog-card">
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
                  تعديل: {controller.selectedSupplier?.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">تحديث بيانات المورد أو ضبط الرصيد الافتتاحي والملاحظات.</p>
              </div>
              {controller.selectedSupplier && (
                <Button
                  variant="danger"
                  onClick={() => controller.setSupplierToDelete(controller.selectedSupplier)}
                  disabled={!controller.canDelete}
                >
                  حذف المورد
                </Button>
              )}
            </div>
            <SupplierEditorCard
              supplier={controller.selectedSupplier || undefined}
              onSaved={() => controller.setSelectedSupplier(null)}
            />
          </div>
        </DialogShell>

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
