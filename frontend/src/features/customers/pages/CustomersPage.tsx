import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
  const __t = t;
  const profile = useCustomerProfile();
  const controller = useCustomersPageController();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMarketingOpen, setIsMarketingOpen] = useState(false);
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<Customer | null>(null);

  const isEn = i18n.language?.startsWith('en');
  const stats = [
    { key: 'customers', label: profile.id === 'maritime' ? (isEn ? 'Total Shippers & Importers' : 'عدد الشاحنين والمستوردين') : profile.id === 'contracting' ? (isEn ? 'Total Assigning Authorities & Owners' : 'عدد جهات الإسناد والملاك') : t('sidebar.customers', 'عدد العملاء'), value: controller.summary?.totalCustomers || 0 },
    { key: 'balance', label: t('customers.total_balances', 'إجمالي الأرصدة'), value: formatCurrency(controller.totalBalance) },
    { key: 'credit', label: t('customers.total_credit_limits', 'إجمالي حدود الائتمان'), value: formatCurrency(controller.totalCredit) },
    { key: 'vip', label: profile.id === 'maritime' ? (isEn ? 'Strategic Shippers' : 'شاحنون استراتيجيون') : profile.id === 'contracting' ? (isEn ? 'VIP Developers' : 'مطورون VIP') : t('customers.vip_customers', 'عملاء VIP'), value: controller.vipCount },
  ] as const;

  return (
    <div className="page-stack page-shell customers-page">
      <main className="document-prototype-column" style={{ paddingBottom: '32px' }}>
        <PageHeader
          title={profile.pageTitle}
          description={profile.pageDescription}
          badge={<span className="nav-pill">{controller.summary?.totalCustomers || 0} {profile.badgeUnit}</span>}
          actions={
            <div className="actions compact-actions">
              <Button variant="primary" onClick={() => setIsCreateOpen(true)}>{profile.addBtnText}</Button>
              <Link to="/crm">
                <Button variant="secondary" style={{ fontWeight: 600 }}>{t('customers.crm_pipeline', 'مسار الصفقات (CRM)')}</Button>
              </Link>
              {profile.showMarketingCampaign && (
                <Button variant="secondary" onClick={() => setIsMarketingOpen(true)} style={{ color: '#166534', borderColor: '#bbf7d0', background: '#f0fdf4', fontWeight: 800 }}>{t('customers.whatsapp_campaign', 'حملة واتساب')}</Button>
              )}
              <Button variant="secondary" onClick={controller.resetCustomersView}>{t('common.reset', 'إعادة ضبط')}</Button>
              <Button variant="secondary" onClick={controller.exportCustomersCsv} disabled={!controller.summary?.totalCustomers}>{t('common.export', 'تصدير')}</Button>
              <Button variant="secondary" onClick={() => void controller.copyCustomersSummary()} disabled={!controller.summary?.totalCustomers}>{t('common.copy', 'نسخ')}</Button>
              <Button variant="secondary" onClick={controller.printCustomersRegister} disabled={!controller.rows.length || !controller.canPrint}>{t('common.print', 'طباعة')}</Button>
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
          <CustomerForm onSuccess={() => setIsCreateOpen(false)} />
        </StandardDialog>

        {/* Modal for Editing Customer */}
        <StandardDialog
          open={Boolean(controller.selectedCustomer)}
          onClose={() => controller.setSelectedCustomer(null)}
          title={controller.selectedCustomer ? `${isEn ? 'Edit:' : 'تعديل:'} ${controller.selectedCustomer.name}` : ''}
          subtitle={profile.modalEditSubtitle}
          width="min(900px, 96vw)"
          minHeight="auto"
        >
          <CustomerEditorCard
            customer={controller.selectedCustomer || undefined}
            onSaved={() => controller.setSelectedCustomer(null)}
            onDeleteCustomer={
              controller.canDelete && controller.selectedCustomer
                ? () => controller.setCustomerToDelete(controller.selectedCustomer)
                : undefined
            }
            deleteLabel={profile.id === 'maritime' ? __t('customers.customers_page.s0', "حذف الشاحن") : profile.id === 'contracting' ? __t('customers.customers_page.s1', "حذف جهة الإسناد") : __t('customers.customers_page.s2', "حذف هذا العميل")}
          />
        </StandardDialog>

        <ActionConfirmDialog
          open={Boolean(controller.customerToDelete)}
          title={__t('customers.customers_page.s3', "تأكيد حذف العميل")}
          description={controller.customerToDelete ? `سيتم حذف العميل ${controller.customerToDelete.name}. إذا كان مرتبطًا بحركات بيع أو تحصيل فسيرفض الخادم الحذف مع إظهار السبب.` : ''}
          confirmLabel={__t('customers.customers_page.s4', "نعم، حذف العميل")}
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
          title={__t('customers.customers_page.s5', "تأكيد حذف العملاء المحددين")}
          description={controller.selectedCustomers.length ? `سيتم محاولة حذف ${controller.selectedCustomers.length} عميلًا دفعة واحدة. أي عميل مرتبط بحركات قائمة سيرفضه الخادم وسيظهر السبب بعد المحاولة.` : __t('customers.customers_page.s6', "لا يوجد عملاء محددون.")}
          confirmLabel={__t('customers.customers_page.s7', "نعم، حذف المحدد")}
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
