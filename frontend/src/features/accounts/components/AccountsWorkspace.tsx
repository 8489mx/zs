import { PageHeader } from '@/shared/components/page-header';
import { CustomerPaymentForm, SupplierPaymentForm } from '@/features/accounts/components/PaymentForms';
import { LedgerPanel } from '@/features/accounts/components/LedgerPanel';
import { AccountsOverviewPanel } from '@/features/accounts/components/AccountsOverviewPanel';
import { AccountsPartyCard } from '@/features/accounts/components/AccountsPartyCard';
import { AccountsLedgerCard } from '@/features/accounts/components/AccountsLedgerCard';
import { AccountsLedgerActions } from '@/features/accounts/components/AccountsLedgerActions';
import { useAccountsWorkspaceController } from '@/features/accounts/hooks/useAccountsWorkspaceController';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';
import type { Customer, Supplier } from '@/types/domain';

export function AccountsWorkspace() {
  const controller = useAccountsWorkspaceController();
  const canManageAccounts = useHasAnyPermission('accounts');
  const canManageCustomers = useHasAnyPermission('customers');
  const canManageSuppliers = useHasAnyPermission('suppliers');
  const canPrint = useHasAnyPermission('canPrint');

  return (
    <div className="page-stack page-shell accounts-workspace">
      <PageHeader
        title="الحسابات"
        description="ابدأ بمراجعة الأرصدة وكشوف الحساب أولًا، ثم نفذ التحصيل أو السداد عند الحاجة."
        badge={<span className="nav-pill">متابعة مالية</span>}
      />

      <AccountsOverviewPanel
        stats={controller.overviewStats}
        guidanceCards={controller.accountsGuidanceCards}
        onTopCustomer={controller.selectTopCustomer}
        onTopSupplier={controller.selectTopSupplier}
        onClearSelection={() => {
          controller.setSelectedCustomerId('');
          controller.setSelectedSupplierId('');
        }}
        disableTopCustomer={!controller.customerBalanceOptions.length}
        disableTopSupplier={!controller.supplierBalanceOptions.length}
      />

      <div className="two-column-grid">
        <AccountsLedgerCard
          title="كشف حساب عميل"
          description="راجع القيود والرصد الحالي للعميل المحدد ثم اطبع أو صدّر الكشف عند الحاجة."
          actions={(
            <AccountsLedgerActions
              title="كشف حساب عميل"
              filename="customer-ledger.csv"
              partyName={controller.selectedCustomer?.name || ''}
              entries={controller.customerEntries}
              canPrint={canPrint}
              disabled={!controller.selectedCustomerId}
              loadAllEntries={controller.exportCustomerLedger}
            />
          )}
          isLoading={controller.customerBalancesQuery.isLoading || controller.customerLedgerQuery.isLoading}
          isError={controller.customerBalancesQuery.isError || controller.customerLedgerQuery.isError}
          error={controller.customerBalancesQuery.error || controller.customerLedgerQuery.error}
          isEmpty={!controller.customerBalanceOptions.length}
          loadingText="جاري تحميل كشف العميل..."
          emptyTitle="لا توجد بيانات عملاء للحسابات"
          emptyHint="سيظهر كشف العميل هنا بمجرد وجود عملاء أو حركة مالية."
        >
          <LedgerPanel
            title="كشف حساب عميل"
            value={controller.selectedCustomerId}
            onChange={controller.setSelectedCustomerId}
            options={controller.customerBalanceOptions as Customer[]}
            emptyLabel="اختر العميل"
            entries={controller.customerEntries}
            search={controller.customerLedgerSearch}
            onSearchChange={controller.setCustomerLedgerSearch}
            summary={controller.customerLedgerSummary}
            pagination={controller.customerLedgerPagination}
            onPageChange={controller.setCustomerLedgerPage}
            onPageSizeChange={controller.setCustomerLedgerPageSize}
          />
        </AccountsLedgerCard>

        <AccountsLedgerCard
          title="كشف حساب مورد"
          description="راجع القيود والرصد الحالي للمورد المحدد ثم انسخ أو اطبع الكشف مباشرة."
          actions={(
            <AccountsLedgerActions
              title="كشف حساب مورد"
              filename="supplier-ledger.csv"
              partyName={controller.selectedSupplier?.name || ''}
              entries={controller.supplierEntries}
              canPrint={canPrint}
              disabled={!controller.selectedSupplierId}
              loadAllEntries={controller.exportSupplierLedger}
            />
          )}
          isLoading={controller.supplierBalancesQuery.isLoading || controller.supplierLedgerQuery.isLoading}
          isError={controller.supplierBalancesQuery.isError || controller.supplierLedgerQuery.isError}
          error={controller.supplierBalancesQuery.error || controller.supplierLedgerQuery.error}
          isEmpty={!controller.supplierBalanceOptions.length}
          loadingText="جاري تحميل كشف المورد..."
          emptyTitle="لا توجد بيانات موردين للحسابات"
          emptyHint="سيظهر كشف المورد هنا بمجرد وجود موردين أو حركة مالية."
        >
          <LedgerPanel
            title="كشف حساب مورد"
            value={controller.selectedSupplierId}
            onChange={controller.setSelectedSupplierId}
            options={controller.supplierBalanceOptions as Supplier[]}
            emptyLabel="اختر المورد"
            entries={controller.supplierEntries}
            search={controller.supplierLedgerSearch}
            onSearchChange={controller.setSupplierLedgerSearch}
            summary={controller.supplierLedgerSummary}
            pagination={controller.supplierLedgerPagination}
            onPageChange={controller.setSupplierLedgerPage}
            onPageSizeChange={controller.setSupplierLedgerPageSize}
          />
        </AccountsLedgerCard>
      </div>

      <div className="two-column-grid">
        <AccountsPartyCard
          title="تحصيل من عميل"
          description="اختر العميل أولًا ثم سجل التحصيل على العملاء الذين لديهم رصيد مستحق."
          badge="تحصيل"
          isLoading={controller.customersQuery.isLoading}
          isError={controller.customersQuery.isError}
          error={controller.customersQuery.error}
          isEmpty={!controller.collectableCustomers.length}
          loadingText="جاري تحميل العملاء..."
          emptyTitle="لا يوجد عملاء عليهم رصيد حاليًا"
          emptyHint="سيظهر العملاء هنا بمجرد وجود رصيد مستحق للتحصيل."
          quickLabel="إضافة عميل سريع"
          quickName={controller.quickCustomerName}
          onQuickNameChange={controller.setQuickCustomerName}
          quickPhone={controller.quickCustomerPhone}
          onQuickPhoneChange={controller.setQuickCustomerPhone}
          quickPending={controller.quickCustomerMutation.isPending}
          canManageParty={canManageCustomers}
          onQuickSubmit={controller.handleQuickCustomerSubmit}
          quickSubmitLabel="إضافة العميل فورًا"
          permissionHint="هذا الحساب لا يملك صلاحية إنشاء عميل جديد من شاشة الحسابات."
        >
          <CustomerPaymentForm customers={controller.collectableCustomers as Customer[]} activeCustomerId={controller.selectedCustomerId} disabled={!canManageAccounts} />
        </AccountsPartyCard>

        <AccountsPartyCard
          title="دفع لمورد"
          description="اختر المورد أولًا ثم سجل الدفع على الموردين الذين لهم رصيد مستحق."
          badge="دفع"
          isLoading={controller.supplierBalancesQuery.isLoading}
          isError={controller.supplierBalancesQuery.isError}
          error={controller.supplierBalancesQuery.error}
          isEmpty={!controller.payableSuppliers.length}
          loadingText="جاري تحميل الموردين..."
          emptyTitle="لا يوجد موردون عليهم رصيد حاليًا"
          emptyHint="سيظهر الموردون هنا بمجرد وجود رصيد مستحق للسداد."
          quickLabel="إضافة مورد سريع"
          quickName={controller.quickSupplierName}
          onQuickNameChange={controller.setQuickSupplierName}
          quickPhone={controller.quickSupplierPhone}
          onQuickPhoneChange={controller.setQuickSupplierPhone}
          quickPending={controller.quickSupplierMutation.isPending}
          canManageParty={canManageSuppliers}
          onQuickSubmit={controller.handleQuickSupplierSubmit}
          quickSubmitLabel="إضافة المورد فورًا"
          permissionHint="هذا الحساب لا يملك صلاحية إنشاء مورد جديد من شاشة الحسابات."
        >
          <SupplierPaymentForm suppliers={controller.payableSuppliers as Supplier[]} activeSupplierId={controller.selectedSupplierId} disabled={!canManageAccounts} />
        </AccountsPartyCard>
      </div>
    </div>
  );
}
