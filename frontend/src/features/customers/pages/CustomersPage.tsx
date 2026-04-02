// legacy marker: customersApi.listAll
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/shared/PageHeader';
import { SpotlightCardStrip } from '@/components/shared/SpotlightCardStrip';
import { ActionConfirmDialog } from '@/components/shared/ActionConfirmDialog';
import { formatCurrency } from '@/lib/format';
import { CustomerForm } from '@/features/customers/components/CustomerForm';
import { CustomerEditorCard } from '@/features/customers/components/CustomerEditorCard';
import { CustomersRegisterCard } from '@/features/customers/pages/customers-page/CustomersRegisterCard';
import { useCustomersPageController } from '@/features/customers/pages/customers-page/useCustomersPageController';

export function CustomersPage() {
  const controller = useCustomersPageController();

  return (
    <div className="page-stack page-shell">
      <PageHeader title="العملاء" description="ابدأ بالسجل والبحث ثم راجع العميل المحدد أو أضف عميلًا جديدًا من نفس الشاشة." badge={<span className="nav-pill">{controller.summary?.totalCustomers || 0} عميل</span>} actions={<div className="actions compact-actions"><Button variant="secondary" onClick={controller.resetCustomersView}>إعادة الضبط</Button><Button variant="secondary" onClick={controller.exportCustomersCsv} disabled={!controller.summary?.totalCustomers}>تصدير CSV</Button><Button variant="secondary" onClick={() => void controller.copyCustomersSummary()} disabled={!controller.summary?.totalCustomers}>نسخ الملخص</Button><Button variant="secondary" onClick={controller.printCustomersRegister} disabled={!controller.rows.length || !controller.canPrint}>طباعة السجل</Button></div>} />
      <div className="stats-grid compact-grid"><div className="stat-card"><span>عدد العملاء</span><strong>{controller.summary?.totalCustomers || 0}</strong></div><div className="stat-card"><span>إجمالي الأرصدة</span><strong>{formatCurrency(controller.totalBalance)}</strong></div><div className="stat-card"><span>إجمالي حدود الائتمان</span><strong>{formatCurrency(controller.totalCredit)}</strong></div><div className="stat-card"><span>عملاء VIP</span><strong>{controller.vipCount}</strong></div></div>

      <SpotlightCardStrip cards={controller.customerGuidanceCards} ariaLabel="إرشاد سريع لشاشة العملاء" />

      <CustomersRegisterCard {...controller} />

      <div className="two-column-grid panel-grid">
        <Card title={controller.selectedCustomer ? `تعديل: ${controller.selectedCustomer.name}` : 'تعديل عميل'} description="اختر عميلًا من السجل لتعديل بياناته أو حذفه." actions={<span className="nav-pill">تعديل وحذف</span>}><CustomerEditorCard customer={controller.selectedCustomer || undefined} onSaved={() => controller.setSelectedCustomer(null)} />{controller.selectedCustomer ? <div className="actions section-actions"><Button variant="danger" onClick={() => controller.setCustomerToDelete(controller.selectedCustomer)} disabled={!controller.canDelete}>حذف العميل</Button></div> : null}</Card>
        <Card title="إضافة عميل" description="إدخال عميل جديد بنفس قواعد التحقق الموحدة." actions={<span className="nav-pill">إضافة</span>}><CustomerForm /></Card>
      </div>

      <ActionConfirmDialog open={Boolean(controller.customerToDelete)} title="تأكيد حذف العميل" description={controller.customerToDelete ? `سيتم حذف العميل ${controller.customerToDelete.name}. إذا كان مرتبطًا بحركات بيع أو تحصيل فسيرفض الخادم الحذف مع إظهار السبب.` : ''} confirmLabel="نعم، حذف العميل" isBusy={controller.deleteMutation.isPending} onCancel={() => controller.setCustomerToDelete(null)} onConfirm={async () => { if (!controller.customerToDelete) return; await controller.deleteMutation.mutateAsync(controller.customerToDelete.id); controller.setSelectedIds((current: string[]) => current.filter((id) => id !== String(controller.customerToDelete?.id))); }} />

      <ActionConfirmDialog open={controller.bulkDeleteOpen} title="تأكيد حذف العملاء المحددين" description={controller.selectedCustomers.length ? `سيتم محاولة حذف ${controller.selectedCustomers.length} عميلًا دفعة واحدة. أي عميل مرتبط بحركات قائمة سيرفضه الخادم وسيظهر السبب بعد المحاولة.` : 'لا يوجد عملاء محددون.'} confirmLabel="نعم، حذف المحدد" confirmationKeyword="DELETE" confirmationLabel="اكتب DELETE لتأكيد حذف المحدد" isBusy={controller.bulkDeleteMutation.isPending} onCancel={() => controller.setBulkDeleteOpen(false)} onConfirm={async () => { if (!controller.selectedIds.length) return; await controller.bulkDeleteMutation.mutateAsync(controller.selectedIds); }} />
    </div>
  );
}
