import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/components/page-header';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { DialogShell } from '@/shared/components/dialog-shell';
import { StatsGrid } from '@/shared/components/stats-grid';
import { formatCurrency } from '@/lib/format';
import { CustomerForm } from '@/features/customers/components/CustomerForm';
import { CustomerEditorCard } from '@/features/customers/components/CustomerEditorCard';
import { CustomersRegisterCard } from '@/features/customers/pages/customers-page/CustomersRegisterCard';
import { useCustomersPageController } from '@/features/customers/pages/customers-page/useCustomersPageController';
import { WhatsAppMarketingModal } from '@/features/customers/components/WhatsAppMarketingModal';
import { CustomerLoyaltyModal } from '@/features/customers/components/CustomerLoyaltyModal';
import type { Customer } from '@/types/domain';

export function CustomersPage() {
  const controller = useCustomersPageController();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMarketingOpen, setIsMarketingOpen] = useState(false);
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<Customer | null>(null);

  const stats = [
    { key: 'customers', label: 'عدد العملاء', value: controller.summary?.totalCustomers || 0 },
    { key: 'balance', label: 'إجمالي الأرصدة', value: formatCurrency(controller.totalBalance) },
    { key: 'credit', label: 'إجمالي حدود الائتمان', value: formatCurrency(controller.totalCredit) },
    { key: 'vip', label: 'عملاء VIP', value: controller.vipCount },
  ] as const;

  return (
    <div className="page-stack page-shell customers-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '32px' }}>
        <PageHeader
          title="العملاء"
          description="إدارة سجل العملاء، الأرصدة والحدود الائتمانية مع إمكانية البحث والإضافة السريعة."
          badge={<span className="nav-pill">{controller.summary?.totalCustomers || 0} عميل</span>}
          actions={
            <div className="actions compact-actions">
              <Button variant="primary" onClick={() => setIsCreateOpen(true)}>+ عميل جديد</Button>
              <Button variant="secondary" onClick={() => setIsMarketingOpen(true)} style={{ color: '#166534', borderColor: '#bbf7d0', background: '#f0fdf4', fontWeight: 800 }}>📢 حملة واتساب</Button>
              <Button variant="secondary" onClick={controller.resetCustomersView}>إعادة ضبط</Button>
              <Button variant="secondary" onClick={controller.exportCustomersCsv} disabled={!controller.summary?.totalCustomers}>تصدير</Button>
              <Button variant="secondary" onClick={() => void controller.copyCustomersSummary()} disabled={!controller.summary?.totalCustomers}>نسخ</Button>
              <Button variant="secondary" onClick={controller.printCustomersRegister} disabled={!controller.rows.length || !controller.canPrint}>طباعة</Button>
            </div>
          }
        />
        <StatsGrid items={stats} />

        <CustomersRegisterCard {...controller} onOpenCreate={() => setIsCreateOpen(true)} onOpenLoyalty={(c) => setLoyaltyCustomer(c)} />

        {/* Modal for Creating Customer */}
        <DialogShell
          open={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          width="min(680px, 95vw)"
          ariaLabel="إضافة عميل جديد"
        >
          <div className="dialog-card">
            <div className="mb-4 border-b pb-3">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">إضافة عميل جديد</h3>
              <p className="text-xs text-muted-foreground mt-1">تسجيل بيانات العميل وتفاصيل الحساب وحد الائتمان في النظام.</p>
            </div>
            <CustomerForm onSuccess={() => setIsCreateOpen(false)} />
          </div>
        </DialogShell>

        {/* Modal for Editing Customer */}
        <DialogShell
          open={Boolean(controller.selectedCustomer)}
          onClose={() => controller.setSelectedCustomer(null)}
          width="min(680px, 95vw)"
          ariaLabel="تعديل العميل"
        >
          <div className="dialog-card" dir="rtl">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid #e2e8f0',
            }}>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  تعديل: {controller.selectedCustomer?.name}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  تحديث بيانات العميل أو ضبط الرصيد وحد الائتمان.
                </p>
              </div>
              {controller.selectedCustomer && (
                <Button
                  variant="danger"
                  onClick={() => controller.setCustomerToDelete(controller.selectedCustomer)}
                  disabled={!controller.canDelete}
                  style={{
                    fontSize: '0.82rem',
                    padding: '6px 14px',
                    flexShrink: 0,
                    fontWeight: 700,
                  }}
                >
                  حذف العميل
                </Button>
              )}
            </div>
            <CustomerEditorCard
              customer={controller.selectedCustomer || undefined}
              onSaved={() => controller.setSelectedCustomer(null)}
            />
          </div>
        </DialogShell>

        <ActionConfirmDialog
          open={Boolean(controller.customerToDelete)}
          title="تأكيد حذف العميل"
          description={controller.customerToDelete ? `سيتم حذف العميل ${controller.customerToDelete.name}. إذا كان مرتبطًا بحركات بيع أو تحصيل فسيرفض الخادم الحذف مع إظهار السبب.` : ''}
          confirmLabel="نعم، حذف العميل"
          isBusy={controller.deleteMutation.isPending}
          onCancel={() => controller.setCustomerToDelete(null)}
          onConfirm={async () => {
            if (!controller.customerToDelete) return;
            await controller.deleteMutation.mutateAsync(controller.customerToDelete.id);
            controller.setSelectedIds((current: string[]) => current.filter((id) => id !== String(controller.customerToDelete?.id)));
            if (controller.selectedCustomer?.id === controller.customerToDelete.id) {
              controller.setSelectedCustomer(null);
            }
          }}
        />

        <ActionConfirmDialog
          open={controller.bulkDeleteOpen}
          title="تأكيد حذف العملاء المحددين"
          description={controller.selectedCustomers.length ? `سيتم محاولة حذف ${controller.selectedCustomers.length} عميلًا دفعة واحدة. أي عميل مرتبط بحركات قائمة سيرفضه الخادم وسيظهر السبب بعد المحاولة.` : 'لا يوجد عملاء محددون.'}
          confirmLabel="نعم، حذف المحدد"
          isBusy={controller.bulkDeleteMutation.isPending}
          onCancel={() => controller.setBulkDeleteOpen(false)}
          onConfirm={async () => {
            if (!controller.selectedIds.length) return;
            await controller.bulkDeleteMutation.mutateAsync(controller.selectedIds);
          }}
        />

        <WhatsAppMarketingModal
          open={isMarketingOpen}
          onClose={() => setIsMarketingOpen(false)}
        />

        <CustomerLoyaltyModal
          customer={loyaltyCustomer}
          onClose={() => setLoyaltyCustomer(null)}
        />
      </main>
    </div>
  );
}
