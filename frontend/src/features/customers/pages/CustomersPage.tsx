import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/components/page-header';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { StatsGrid } from '@/shared/components/stats-grid';
import { formatCurrency } from '@/lib/format';
import { CustomerForm } from '@/features/customers/components/CustomerForm';
import { CustomerEditorCard } from '@/features/customers/components/CustomerEditorCard';
import { CustomersRegisterCard } from '@/features/customers/pages/customers-page/CustomersRegisterCard';
import { useCustomersPageController } from '@/features/customers/pages/customers-page/useCustomersPageController';
import { WhatsAppMarketingModal } from '@/features/customers/components/WhatsAppMarketingModal';
import { CustomerLoyaltyModal } from '@/features/customers/components/CustomerLoyaltyModal';
import { useCustomerProfile } from '@/features/customers/constants/customer-profiles';
import type { Customer } from '@/types/domain';

export function CustomersPage() {
  const profile = useCustomerProfile();
  const controller = useCustomersPageController();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMarketingOpen, setIsMarketingOpen] = useState(false);
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<Customer | null>(null);

  const stats = [
    { key: 'customers', label: profile.id === 'maritime' ? 'عدد الشاحنين والمستوردين' : profile.id === 'contracting' ? 'عدد جهات الإسناد والملاك' : 'عدد العملاء', value: controller.summary?.totalCustomers || 0 },
    { key: 'balance', label: 'إجمالي الأرصدة', value: formatCurrency(controller.totalBalance) },
    { key: 'credit', label: 'إجمالي حدود الائتمان', value: formatCurrency(controller.totalCredit) },
    { key: 'vip', label: profile.id === 'maritime' ? 'شاحنون استراتيجيون' : profile.id === 'contracting' ? 'مطورون VIP' : 'عملاء VIP', value: controller.vipCount },
  ] as const;

  return (
    <div className="page-stack page-shell customers-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '32px' }}>
        <PageHeader
          title={profile.pageTitle}
          description={profile.pageDescription}
          badge={<span className="nav-pill">{controller.summary?.totalCustomers || 0} {profile.badgeUnit}</span>}
          actions={
            <div className="actions compact-actions">
              <Button variant="primary" onClick={() => setIsCreateOpen(true)}>{profile.addBtnText}</Button>
              {profile.showMarketingCampaign && (
                <Button variant="secondary" onClick={() => setIsMarketingOpen(true)} style={{ color: '#166534', borderColor: '#bbf7d0', background: '#f0fdf4', fontWeight: 800 }}>حملة واتساب</Button>
              )}
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
        <StandardDialog
          open={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title={profile.modalAddTitle}
          subtitle={profile.modalAddSubtitle}
          width="min(680px, 95vw)"
          minHeight="auto"
        >
          <div dir="rtl">
            <CustomerForm onSuccess={() => setIsCreateOpen(false)} />
          </div>
        </StandardDialog>

        {/* Modal for Editing Customer */}
        <StandardDialog
          open={Boolean(controller.selectedCustomer)}
          onClose={() => controller.setSelectedCustomer(null)}
          title={controller.selectedCustomer ? `تعديل: ${controller.selectedCustomer.name}` : ''}
          subtitle={profile.modalEditSubtitle}
          width="min(680px, 95vw)"
          minHeight="auto"
        >
          <div dir="rtl">
            {controller.selectedCustomer && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                <Button
                  variant="danger"
                  onClick={() => controller.setCustomerToDelete(controller.selectedCustomer)}
                  disabled={!controller.canDelete}
                  style={{
                    fontSize: '0.8rem',
                    padding: '4px 12px',
                    fontWeight: 700,
                  }}
                >
                  {profile.id === 'maritime' ? 'حذف الشاحن' : profile.id === 'contracting' ? 'حذف جهة الإسناد' : 'حذف العميل'}
                </Button>
              </div>
            )}
            <CustomerEditorCard
              customer={controller.selectedCustomer || undefined}
              onSaved={() => controller.setSelectedCustomer(null)}
            />
          </div>
        </StandardDialog>

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
