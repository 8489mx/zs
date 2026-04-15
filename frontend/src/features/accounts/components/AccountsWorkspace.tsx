import { useEffect, useState } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { FilterChipGroup } from '@/shared/components/filter-chip-group';
import { Button } from '@/shared/ui/button';
import { CustomerPaymentForm, SupplierPaymentForm } from '@/features/accounts/components/PaymentForms';
import { LedgerPanel } from '@/features/accounts/components/LedgerPanel';
import { AccountsPartyCard } from '@/features/accounts/components/AccountsPartyCard';
import { AccountsLedgerCard } from '@/features/accounts/components/AccountsLedgerCard';
import { AccountsLedgerActions } from '@/features/accounts/components/AccountsLedgerActions';
import { useAccountsWorkspaceController } from '@/features/accounts/hooks/useAccountsWorkspaceController';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';
import type { Customer, Supplier } from '@/types/domain';

type AccountsFocusMode = 'customers' | 'suppliers';

export function AccountsWorkspace() {
  const controller = useAccountsWorkspaceController();
  const canManageAccounts = useHasAnyPermission('accounts');
  const canManageCustomers = useHasAnyPermission('customers');
  const canManageSuppliers = useHasAnyPermission('suppliers');
  const canPrint = useHasAnyPermission('canPrint');
  const [focusMode, setFocusMode] = useState<AccountsFocusMode>('customers');

  useEffect(() => {
    if (controller.selectedSupplierId && !controller.selectedCustomerId) setFocusMode('suppliers');
    if (controller.selectedCustomerId && !controller.selectedSupplierId) setFocusMode('customers');
  }, [controller.selectedCustomerId, controller.selectedSupplierId]);

  const isCustomerMode = focusMode === 'customers';

  return (
    <div className="page-stack page-shell accounts-workspace accounts-workspace--compact">
      <PageHeader
        title="الحسابات"
        description="ابدأ بالكشف المطلوب ثم سجل التحصيل أو الدفع من نفس الشاشة بدون ازدحام."
        badge={<span className="nav-pill">متابعة مالية</span>}
      />

      <div className="stats-grid compact-grid accounts-stats-grid">
        {controller.overviewStats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>

      <div className="accounts-focus-toolbar">
        <FilterChipGroup
          value={focusMode}
          onChange={setFocusMode}
          className="filter-chip-row toolbar-chip-row accounts-focus-tabs"
          options={[
            { value: 'customers', label: 'العملاء' },
            { value: 'suppliers', label: 'الموردون' },
          ]}
        />

        <div className="actions compact-actions accounts-shortcuts-row">
          {isCustomerMode ? (
            <Button variant="secondary" onClick={controller.selectTopCustomer} disabled={!controller.customerBalanceOptions.length}>أعلى عميل رصيدًا</Button>
          ) : (
            <Button variant="secondary" onClick={controller.selectTopSupplier} disabled={!controller.supplierBalanceOptions.length}>أعلى مورد رصيدًا</Button>
          )}
          <Button
            variant="secondary"
            onClick={() => {
              controller.setSelectedCustomerId('');
              controller.setSelectedSupplierId('');
            }}
          >
            إلغاء الاختيار
          </Button>
        </div>
      </div>

      {isCustomerMode ? (
        <div className="two-column-grid accounts-focus-grid">
          <AccountsLedgerCard
            title="كشف حساب عميل"
            description="اختر العميل وراجع الحركة ثم اطبع أو صدّر الكشف عند الحاجة."
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
        </div>
      ) : (
        <div className="two-column-grid accounts-focus-grid">
          <AccountsLedgerCard
            title="كشف حساب مورد"
            description="اختر المورد وراجع الحركة ثم انسخ أو اطبع الكشف مباشرة."
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
      )}
    </div>
  );
}
