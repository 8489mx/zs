import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/shared/PageHeader';
import { SpotlightCardStrip } from '@/components/shared/SpotlightCardStrip';
import { ActionConfirmDialog } from '@/components/shared/ActionConfirmDialog';
import { formatCurrency } from '@/lib/format';
import { SupplierForm } from '@/features/suppliers/components/SupplierForm';
import { SupplierEditorCard } from '@/features/suppliers/components/SupplierEditorCard';
import { SuppliersRegisterCard } from '@/features/suppliers/pages/suppliers-page/SuppliersRegisterCard';
import { useSuppliersPageController } from '@/features/suppliers/pages/suppliers-page/useSuppliersPageController';

export function SuppliersPage() {
  const controller = useSuppliersPageController();

  return (
    <div className="page-stack page-shell">
      <PageHeader title="الموردون" description="ابدأ بسجل الموردين والبحث ثم انتقل للتعديل أو الإضافة حسب المورد الذي تعمل عليه." badge={<span className="nav-pill">{controller.summary?.totalSuppliers || 0} مورد</span>} actions={<div className="actions compact-actions"><Button variant="secondary" onClick={controller.resetSuppliersView}>إعادة الضبط</Button><Button variant="secondary" onClick={controller.exportSuppliersCsv} disabled={!controller.summary?.totalSuppliers}>تصدير CSV</Button><Button variant="secondary" onClick={() => void controller.copySuppliersSummary()} disabled={!controller.summary?.totalSuppliers}>نسخ الملخص</Button><Button variant="secondary" onClick={controller.printSuppliersRegister} disabled={!controller.summary?.totalSuppliers || !controller.canPrint}>طباعة السجل</Button></div>} />
      <div className="stats-grid compact-grid"><div className="stat-card"><span>عدد الموردين</span><strong>{controller.summary?.totalSuppliers || 0}</strong></div><div className="stat-card"><span>إجمالي الأرصدة</span><strong>{formatCurrency(controller.totalBalance)}</strong></div><div className="stat-card"><span>عليهم ملاحظات</span><strong>{controller.withNotes}</strong></div><div className="stat-card"><span>مطابقون للبحث</span><strong>{controller.summary?.totalSuppliers || 0}</strong></div></div>

      <SpotlightCardStrip cards={controller.supplierGuidanceCards} ariaLabel="إرشاد سريع لشاشة الموردين" />

      <SuppliersRegisterCard {...controller} />

      <div className="two-column-grid panel-grid">
        <Card title={controller.selectedSupplier ? `تعديل: ${controller.selectedSupplier.name}` : 'تعديل مورد'} description="اختر موردًا من السجل لتعديل بياناته أو حذفه من نفس المكان." actions={<span className="nav-pill">تعديل وحذف</span>}><SupplierEditorCard supplier={controller.selectedSupplier || undefined} onSaved={() => controller.setSelectedSupplier(null)} />{controller.selectedSupplier ? <div className="actions section-actions"><Button variant="danger" onClick={() => controller.setSupplierToDelete(controller.selectedSupplier)} disabled={!controller.canDelete}>حذف المورد</Button></div> : null}</Card>
        <Card title="إضافة مورد" description="أضف موردًا جديدًا ثم اختره من السجل لمراجعة بياناته أو بدء التعامل معه فورًا." actions={<span className="nav-pill">إضافة</span>}><SupplierForm /></Card>
      </div>

      <ActionConfirmDialog open={Boolean(controller.supplierToDelete)} title="تأكيد حذف المورد" description={controller.supplierToDelete ? `سيتم حذف المورد ${controller.supplierToDelete.name}. إذا كان المورد مستخدمًا داخل أصناف فعالة فسيمنع الخادم الحذف، وسيظهر السبب مباشرة.` : ''} confirmLabel="نعم، حذف المورد" isBusy={controller.deleteMutation.isPending} onCancel={() => controller.setSupplierToDelete(null)} onConfirm={async () => { if (!controller.supplierToDelete) return; await controller.deleteMutation.mutateAsync(controller.supplierToDelete.id); controller.setSelectedIds((current: string[]) => current.filter((id) => id !== String(controller.supplierToDelete?.id))); }} />

      <ActionConfirmDialog open={controller.bulkDeleteOpen} title="تأكيد حذف الموردين المحددين" description={controller.selectedSuppliers.length ? `سيتم محاولة حذف ${controller.selectedSuppliers.length} موردًا دفعة واحدة. أي مورد مستخدم داخل أصناف أو حركات قائمة سيرفضه الخادم وسيظهر السبب بعد المحاولة.` : 'لا يوجد موردون محددون.'} confirmLabel="نعم، حذف المحدد" confirmationKeyword="DELETE" confirmationLabel="اكتب DELETE لتأكيد حذف المحدد" isBusy={controller.bulkDeleteMutation.isPending} onCancel={() => controller.setBulkDeleteOpen(false)} onConfirm={async () => { if (!controller.selectedIds.length) return; await controller.bulkDeleteMutation.mutateAsync(controller.selectedIds); }} />
    </div>
  );
}
