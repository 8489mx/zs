import { createLazyRoute } from '@/app/router/lazy-route';
import type { FeatureRouteModule } from '@/app/router/types';
import { FeatureGate } from '@/shared/components/feature-gate';

function withAccountingGate<P = any>(Component: React.ComponentType<P>): React.ComponentType<any> {
  return function AccountingGated(props: any) {
    return (
      <FeatureGate feature="accounting" featureName="الحسابات العامة وشجرة الحسابات">
        <Component {...props} />
      </FeatureGate>
    );
  };
}


export const accountingRouteModule: FeatureRouteModule = {
  routes: [
    {
      path: 'accounting/accounts',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingAccountsPage').then((module) => ({ default: withAccountingGate(module.AccountingAccountsPage) }))),
    },
    {
      path: 'accounting/journal-entries',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingJournalEntriesPage').then((module) => ({ default: withAccountingGate(module.AccountingJournalEntriesPage) }))),
    },
    {
      path: 'accounting/cost-centers',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingCostCentersPage').then((module) => ({ default: withAccountingGate(module.AccountingCostCentersPage) }))),
    },
    {
      path: 'accounting/settings',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingSettingsPage').then((module) => ({ default: withAccountingGate(module.AccountingSettingsPage) }))),
    },
    {
      path: 'accounting/financial-summary',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingFinancialSummaryPage').then((module) => ({ default: withAccountingGate(module.AccountingFinancialSummaryPage) }))),
    },
    {
      path: 'accounting/receivables-payables',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingReceivablesPayablesPage').then((module) => ({ default: withAccountingGate(module.AccountingReceivablesPayablesPage) }))),
    },
    {
      path: 'accounting/cash-movement',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingCashMovementPage').then((module) => ({ default: withAccountingGate(module.AccountingCashMovementPage) }))),
    },
    {
      path: 'accounting/inventory-value',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingInventoryValuePage').then((module) => ({ default: withAccountingGate(module.AccountingInventoryValuePage) }))),
    },
    {
      path: 'accounting/fixed-assets',
      element: createLazyRoute(() => import('@/features/accounting/pages/AccountingFixedAssetsPage').then((module) => ({ default: withAccountingGate(module.AccountingFixedAssetsPage) }))),
    },
    {
      path: 'accounting/bank-reconciliation',
      element: createLazyRoute(() => import('@/features/accounting/pages/BankReconciliationPage').then((module) => ({ default: withAccountingGate(module.BankReconciliationPage) }))),
    },
    {
      path: 'accounting/balance-sheet',
      element: createLazyRoute(() => import('@/features/accounting/pages/BalanceSheetPage').then((module) => ({ default: withAccountingGate(module.BalanceSheetPage) }))),
    },
    {
      path: 'accounting/cash-flow',
      element: createLazyRoute(() => import('@/features/accounting/pages/CashFlowStatementPage').then((module) => ({ default: withAccountingGate(module.CashFlowStatementPage) }))),
    },
    {
      path: 'accounting/aged-debts',
      element: createLazyRoute(() => import('@/features/accounting/pages/AgedDebtsPage').then((module) => ({ default: withAccountingGate(module.AgedDebtsPage) }))),
    },
    {
      path: 'accounting/cheques',
      element: createLazyRoute(() => import('@/features/accounting/pages/PdcChequesPage').then((module) => ({ default: withAccountingGate(module.PdcChequesPage) }))),
    },
    {
      path: 'accounting/withholding-tax',
      element: createLazyRoute(() => import('@/features/accounting/pages/WithholdingTaxPage').then((module) => ({ default: withAccountingGate(module.WithholdingTaxPage) }))),
    },
    {
      path: 'accounting/payment-allocation',
      element: createLazyRoute(() => import('@/features/accounting/pages/PaymentAllocationPage').then((module) => ({ default: withAccountingGate(module.PaymentAllocationPage) }))),
    },
  ],
  navigation: [
    { key: 'accounting-accounts', label: 'شجرة الحسابات', to: '/accounting/accounts' },
    { key: 'accounting-cost-centers', label: 'مراكز التكلفة', to: '/accounting/cost-centers' },
    { key: 'accounting-journal-entries', label: 'القيود اليومية', to: '/accounting/journal-entries' },
    { key: 'accounting-payment-allocation', label: 'تسوية وتخصيص المدفوعات', to: '/accounting/payment-allocation' },
    { key: 'accounting-cheques', label: 'حافظة الشيكات (PDC)', to: '/accounting/cheques' },
    { key: 'accounting-withholding-tax', label: 'الخصم والإضافة (نموذج 41)', to: '/accounting/withholding-tax' },
    { key: 'accounting-balance-sheet', label: 'الميزانية العمومية', to: '/accounting/balance-sheet' },
    { key: 'accounting-cash-flow', label: 'قائمة التدفقات النقدية', to: '/accounting/cash-flow' },
    { key: 'accounting-aged-debts', label: 'أعمار الديون', to: '/accounting/aged-debts' },
    { key: 'accounting-bank-reconciliation', label: 'التسويات البنكية', to: '/accounting/bank-reconciliation' },
    { key: 'accounting-fixed-assets', label: 'الأصول الثابتة والإهلاك', to: '/accounting/fixed-assets' },
    { key: 'accounting-settings', label: 'إعدادات الحسابات', to: '/accounting/settings' },
  ],
};

