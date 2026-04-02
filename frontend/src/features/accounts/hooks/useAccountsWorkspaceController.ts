import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogApi } from '@/lib/api/catalog';
import { accountsApi } from '@/features/accounts/api/accounts.api';
import { formatCurrency } from '@/lib/format';
import { invalidateAccountsDomain, invalidateCatalogDomain } from '@/app/query-invalidation';
import { useAccountsRouteState } from '@/features/accounts/hooks/useAccountsRouteState';

export function useAccountsWorkspaceController() {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [quickCustomerName, setQuickCustomerName] = useState('');
  const [quickCustomerPhone, setQuickCustomerPhone] = useState('');
  const [quickSupplierName, setQuickSupplierName] = useState('');
  const [quickSupplierPhone, setQuickSupplierPhone] = useState('');
  const [customerLedgerPage, setCustomerLedgerPage] = useState(1);
  const [customerLedgerPageSize, setCustomerLedgerPageSize] = useState(10);
  const [customerLedgerSearch, setCustomerLedgerSearch] = useState('');
  const [supplierLedgerPage, setSupplierLedgerPage] = useState(1);
  const [supplierLedgerPageSize, setSupplierLedgerPageSize] = useState(10);
  const [supplierLedgerSearch, setSupplierLedgerSearch] = useState('');

  const routeState = useAccountsRouteState(
    selectedCustomerId,
    selectedSupplierId,
    { page: customerLedgerPage, pageSize: customerLedgerPageSize, search: customerLedgerSearch },
    { page: supplierLedgerPage, pageSize: supplierLedgerPageSize, search: supplierLedgerSearch }
  );

  const {
    customersQuery,
    suppliersQuery,
    customerBalancesQuery,
    customerLedgerQuery,
    supplierLedgerQuery,
    customers,
    suppliers,
    customerBalanceOptions,
    customerEntries,
    supplierEntries,
    customerLedgerSummary,
    supplierLedgerSummary,
    customerLedgerPagination,
    supplierLedgerPagination,
  } = routeState;

  const totalCustomerBalance = useMemo(
    () => customerBalanceOptions.reduce((sum, customer) => sum + Number(customer.balance || 0), 0),
    [customerBalanceOptions]
  );
  const totalSupplierBalance = useMemo(
    () => suppliers.reduce((sum, supplier) => sum + Number(supplier.balance || 0), 0),
    [suppliers]
  );

  const selectedCustomer = useMemo(
    () => customerBalanceOptions.find((customer) => String(customer.id) === selectedCustomerId) || null,
    [customerBalanceOptions, selectedCustomerId]
  );
  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => String(supplier.id) === selectedSupplierId) || null,
    [suppliers, selectedSupplierId]
  );

  const accountsNextStep = useMemo(() => {
    if (selectedCustomer) return `راجع كشف ${selectedCustomer.name} ثم سجّل التحصيل أو صدّر الكشف.`;
    if (selectedSupplier) return `راجع كشف ${selectedSupplier.name} ثم سجّل الدفع أو اطبع الحركة.`;
    return 'اختر عميلًا أو موردًا من القوائم ثم راجع الكشف قبل تسجيل الحركة.';
  }, [selectedCustomer, selectedSupplier]);

  const accountsGuidanceCards = useMemo(
    () => [
      {
        key: 'scope',
        label: 'ما الذي تراه الآن؟',
        value: selectedCustomer && selectedSupplier ? 'عميل ومورد محددان' : selectedCustomer ? 'كشف عميل محدد' : selectedSupplier ? 'كشف مورد محدد' : 'تحصيل + دفع + كشف حساب'
      },
      { key: 'next', label: 'الخطوة الأنسب الآن', value: accountsNextStep },
      { key: 'focus', label: 'التركيز الحالي', value: selectedCustomer?.name || selectedSupplier?.name || 'مراجعة الكشوف المالية' },
      {
        key: 'balance',
        label: 'المؤشر المالي الأوضح',
        value: selectedCustomer
          ? formatCurrency(selectedCustomer.balance || 0)
          : selectedSupplier
            ? formatCurrency(selectedSupplier.balance || 0)
            : formatCurrency(Math.max(totalCustomerBalance, totalSupplierBalance))
      }
    ],
    [accountsNextStep, selectedCustomer, selectedSupplier, totalCustomerBalance, totalSupplierBalance]
  );

  const overviewStats = useMemo(
    () => [
      { label: 'عدد العملاء', value: customers.length },
      { label: 'عدد الموردين', value: suppliers.length },
      { label: 'أرصدة العملاء', value: formatCurrency(totalCustomerBalance) },
      { label: 'أرصدة الموردين', value: formatCurrency(totalSupplierBalance) }
    ],
    [customers.length, suppliers.length, totalCustomerBalance, totalSupplierBalance]
  );

  const queryClient = useQueryClient();

  useEffect(() => {
    setCustomerLedgerPage(1);
  }, [selectedCustomerId, customerLedgerSearch]);

  useEffect(() => {
    setSupplierLedgerPage(1);
  }, [selectedSupplierId, supplierLedgerSearch]);

  const quickCustomerMutation = useMutation({
    mutationFn: (payload: unknown) => catalogApi.createCustomer(payload),
    onSuccess: async () => {
      await Promise.all([
        invalidateCatalogDomain(queryClient, { includeCustomers: true, includeCustomerBalances: true }),
        invalidateAccountsDomain(queryClient)
      ]);
    }
  });

  const quickSupplierMutation = useMutation({
    mutationFn: (payload: unknown) => catalogApi.createSupplier(payload),
    onSuccess: async () => {
      await Promise.all([
        invalidateCatalogDomain(queryClient, { includeSuppliers: true }),
        invalidateAccountsDomain(queryClient)
      ]);
    }
  });

  async function handleQuickCustomerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = quickCustomerName.trim();
    if (!name) return;
    const created = await quickCustomerMutation.mutateAsync({
      name,
      phone: quickCustomerPhone.trim(),
      address: '',
      balance: 0,
      type: 'cash',
      creditLimit: 0
    });
    setQuickCustomerName('');
    setQuickCustomerPhone('');
    setSelectedCustomerId(String((created as { id?: string | number })?.id || ''));
  }

  async function handleQuickSupplierSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = quickSupplierName.trim();
    if (!name) return;
    const created = await quickSupplierMutation.mutateAsync({
      name,
      phone: quickSupplierPhone.trim(),
      address: '',
      balance: 0,
      notes: ''
    });
    setQuickSupplierName('');
    setQuickSupplierPhone('');
    setSelectedSupplierId(String((created as { id?: string | number })?.id || ''));
  }

  async function exportCustomerLedger() {
    if (!selectedCustomerId) return;
    const payload = await accountsApi.listAllCustomerLedger(selectedCustomerId, customerLedgerSearch);
    return payload.entries;
  }

  async function exportSupplierLedger() {
    if (!selectedSupplierId) return;
    const payload = await accountsApi.listAllSupplierLedger(selectedSupplierId, supplierLedgerSearch);
    return payload.entries;
  }

  const selectTopCustomer = () => {
    const topCustomer = [...customerBalanceOptions].sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))[0];
    setSelectedCustomerId(String(topCustomer?.id || ''));
  };

  const selectTopSupplier = () => {
    const topSupplier = [...suppliers].sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))[0];
    setSelectedSupplierId(String(topSupplier?.id || ''));
  };

  return {
    routeState,
    customersQuery,
    suppliersQuery,
    customerBalancesQuery,
    customerLedgerQuery,
    supplierLedgerQuery,
    customers,
    suppliers,
    customerBalanceOptions,
    customerEntries,
    supplierEntries,
    customerLedgerSummary,
    supplierLedgerSummary,
    customerLedgerPagination,
    supplierLedgerPagination,
    overviewStats,
    accountsGuidanceCards,
    selectedCustomerId,
    selectedSupplierId,
    selectedCustomer,
    selectedSupplier,
    customerLedgerSearch,
    supplierLedgerSearch,
    quickCustomerName,
    quickCustomerPhone,
    quickSupplierName,
    quickSupplierPhone,
    quickCustomerMutation,
    quickSupplierMutation,
    setSelectedCustomerId,
    setSelectedSupplierId,
    setCustomerLedgerSearch,
    setSupplierLedgerSearch,
    setCustomerLedgerPage,
    setSupplierLedgerPage,
    setCustomerLedgerPageSize,
    setSupplierLedgerPageSize,
    setQuickCustomerName,
    setQuickCustomerPhone,
    setQuickSupplierName,
    setQuickSupplierPhone,
    handleQuickCustomerSubmit,
    handleQuickSupplierSubmit,
    exportCustomerLedger,
    exportSupplierLedger,
    selectTopCustomer,
    selectTopSupplier,
    customerLedgerSearchValue: customerLedgerSearch,
    supplierLedgerSearchValue: supplierLedgerSearch,
  };
}
