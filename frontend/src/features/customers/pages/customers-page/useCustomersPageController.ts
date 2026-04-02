import { useEffect, useMemo, useState } from 'react';
import type { Customer } from '@/types/domain';
import { formatCurrency } from '@/lib/format';
import { useCustomersPageQuery } from '@/features/customers/hooks/useCustomersPageQuery';
import { useDeleteCustomerMutation } from '@/features/customers/hooks/useCustomerActions';
import { useCustomersPageActions } from '@/features/customers/hooks/useCustomersPageActions';
import { useHasAnyPermission } from '@/hooks/usePermission';

export function useCustomersPageController() {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterMode, setFilterMode] = useState<'all' | 'vip' | 'debt' | 'cash'>('all');

  const customersQuery = useCustomersPageQuery({ page, pageSize, q: search, filter: filterMode });
  const deleteMutation = useDeleteCustomerMutation(() => {
    setSelectedCustomer(null);
    setCustomerToDelete(null);
  });
  const canDelete = useHasAnyPermission('canDelete');
  const canPrint = useHasAnyPermission('canPrint');
  const rows = useMemo(() => customersQuery.data?.customers || [], [customersQuery.data?.customers]);
  const summary = customersQuery.data?.summary;

  const actions = useCustomersPageActions({
    search,
    filterMode,
    summary,
    onBulkDeleteSuccess: () => {
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      if (selectedCustomer && selectedIds.includes(String(selectedCustomer.id))) setSelectedCustomer(null);
    },
  });

  useEffect(() => {
    if (selectedCustomer && !rows.some((customer) => String(customer.id) === String(selectedCustomer.id))) {
      setSelectedCustomer(null);
    }
  }, [rows, selectedCustomer]);

  const selectedCustomers = useMemo(() => rows.filter((customer) => selectedIds.includes(String(customer.id))), [rows, selectedIds]);
  const totalBalance = Number(summary?.totalBalance || 0);
  const totalCredit = Number(summary?.totalCredit || 0);
  const vipCount = Number(summary?.vipCount || 0);
  const customersNextStep = selectedCustomer
    ? (canDelete ? 'العميل محدد الآن. يمكنك تعديل البيانات أو حذف السجل من اللوحة الجانبية.' : 'العميل محدد الآن. راجع البيانات أو حدّثها من اللوحة الجانبية.')
    : rows.length ? 'اختر عميلًا من السجل حتى تظهر لك لوحة التعديل مباشرة.' : 'ابدأ بإضافة عميل جديد أو خفف الفلاتر الحالية.';
  const customerGuidanceCards = useMemo(() => ([
    { key: 'scope', label: 'ما الذي تراه الآن؟', value: filterMode === 'all' ? 'كل العملاء' : filterMode === 'vip' ? 'عملاء VIP' : filterMode === 'debt' ? 'عملاء عليهم رصيد' : 'عملاء نقديون' },
    { key: 'next', label: 'الخطوة الأنسب الآن', value: customersNextStep },
    { key: 'focus', label: 'التركيز الحالي', value: selectedCustomer ? selectedCustomer.name : (search.trim() || 'سجل العملاء بالكامل') },
    { key: 'balance', label: 'المؤشر المالي الأوضح', value: selectedCustomer ? formatCurrency(selectedCustomer.balance || 0) : formatCurrency(totalBalance) },
  ]), [customersNextStep, filterMode, search, selectedCustomer, totalBalance]);

  function resetCustomersView() {
    setSearch('');
    setFilterMode('all');
    setSelectedCustomer(null);
    setSelectedIds([]);
    setPage(1);
  }

  return {
    search, setSearch, selectedCustomer, setSelectedCustomer, customerToDelete, setCustomerToDelete,
    selectedIds, setSelectedIds, bulkDeleteOpen, setBulkDeleteOpen, page, setPage, pageSize, setPageSize,
    filterMode, setFilterMode, customersQuery, deleteMutation, canDelete, canPrint, rows, summary,
    selectedCustomers, totalBalance, totalCredit, vipCount, customerGuidanceCards, resetCustomersView,
    ...actions,
  };
}
