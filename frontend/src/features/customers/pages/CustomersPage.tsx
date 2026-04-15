// legacy marker: customersApi.listAll
import { useRef } from 'react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/components/page-header';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { StatsGrid } from '@/shared/components/stats-grid';
import { formatCurrency } from '@/lib/format';
import { CustomerForm } from '@/features/customers/components/CustomerForm';
import { CustomerEditorCard } from '@/features/customers/components/CustomerEditorCard';
import { CustomersRegisterCard } from '@/features/customers/pages/customers-page/CustomersRegisterCard';
import { useCustomersPageController } from '@/features/customers/pages/customers-page/useCustomersPageController';
import { useScrollIntoViewOnChange } from '@/shared/hooks/use-scroll-into-view-on-change';

export function CustomersPage() {
  const controller = useCustomersPageController();
  const editCustomerSectionRef = useRef<HTMLDivElement | null>(null);

  useScrollIntoViewOnChange(controller.selectedCustomer?.id || '', editCustomerSectionRef, { enabled: Boolean(controller.selectedCustomer) });
  const stats = [
    { key: 'customers', label: 'عدد العملاء', value: controller.summary?.totalCustomers || 0 },
    { key: 'balance', label: 'إجمالي الأرصدة', value: formatCurrency(controller.totalBalance) },
    { key: 'credit', label: 'إجمالي حدود الائتمان', value: formatCurrency(controller.totalCredit) },
    { key: 'vip', label: 'عملاء VIP', value: controller.vipCount },
  ] as const;

  return (
    <div className="page-stack page-shell customers-page">
      <PageHeader title="العملاء" description="ابدأ بالسجل والبحث ثم راجع العميل المحدد أو أضف عميلًا جديدًا من نفس الشاشة." badge={<span className="nav-pill">{controller.summary?.totalCustomers || 0} عميل</span>} actions={<div className="actions compact-actions"><Button variant="secondary" onClick={controller.resetCustomersView}>إعادة الضبط</Button><Button variant="secondary" onClick={controller.exportCustomersCsv} disabled={!controller.summary?.totalCustomers}>تصدير CSV</Button><Button variant="secondary" onClick={() => void controller.copyCustomersSummary()} disabled={!controller.summary?.totalCustomers}>نسخ الملخص</Button><Button variant="secondary" onClick={controller.printCustomersRegister} disabled={!controller.rows.length || !controller.canPrint}>طباعة السجل</Button></div>} />
      <StatsGrid items={stats} />


      <CustomersRegisterCard {...controller} />

      <div className="two-column-grid panel-grid customers-editor-grid">
        <Card title="إضافة عميل" description="إدخال عميل جديد بنفس قواعد التحقق الموحدة." actions={<span className="nav-pill">إضافة</span>}><CustomerForm /></Card>
        <div ref={editCustomerSectionRef}><Card title={controller.selectedCustomer ? `تعديل: ${controller.selectedCustomer.name}` : 'تعديل عميل'} description="اختر عميلًا من السجل لتعديل بياناته أو حذفه." actions={<span className="nav-pill">تعديل وحذف</span>}><CustomerEditorCard customer={controller.selectedCustomer || undefined} onSaved={() => controller.setSelectedCustomer(null)} />{controller.selectedCustomer ? <div className="actions section-actions"><Button variant="danger" onClick={() => controller.setCustomerToDelete(controller.selectedCustomer)} disabled={!controller.canDelete}>حذف العميل</Button></div> : null}</Card></div>
      </div>

      <ActionConfirmDialog open={Boolean(controller.customerToDelete)} title="تأكيد حذف العميل" description={controller.customerToDelete ? `سيتم حذف العميل ${controller.customerToDelete.name}. إذا كان مرتبطًا بحركات بيع أو تحصيل فسيرفض الخادم الحذف مع إظهار السبب.` : ''} confirmLabel="نعم، حذف العميل" isBusy={controller.deleteMutation.isPending} onCancel={() => controller.setCustomerToDelete(null)} onConfirm={async () => { if (!controller.customerToDelete) return; await controller.deleteMutation.mutateAsync(controller.customerToDelete.id); controller.setSelectedIds((current: string[]) => current.filter((id) => id !== String(controller.customerToDelete?.id))); }} />

      <ActionConfirmDialog open={controller.bulkDeleteOpen} title="تأكيد حذف العملاء المحددين" description={controller.selectedCustomers.length ? `سيتم محاولة حذف ${controller.selectedCustomers.length} عميلًا دفعة واحدة. أي عميل مرتبط بحركات قائمة سيرفضه الخادم وسيظهر السبب بعد المحاولة.` : 'لا يوجد عملاء محددون.'} confirmLabel="نعم، حذف المحدد" confirmationKeyword="DELETE" confirmationLabel="اكتب DELETE لتأكيد حذف المحدد" isBusy={controller.bulkDeleteMutation.isPending} onCancel={() => controller.setBulkDeleteOpen(false)} onConfirm={async () => { if (!controller.selectedIds.length) return; await controller.bulkDeleteMutation.mutateAsync(controller.selectedIds); }} />
    </div>
  );
}
